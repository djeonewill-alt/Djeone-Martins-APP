import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import ffmpegPath from 'ffmpeg-static'
import { randomUUID } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { NextRequest, NextResponse } from 'next/server'
import { R2_BUCKET_NAME, R2_PUBLIC_URL, r2Client } from '@/lib/r2/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_COMPATIBLE_AUDIO_BYTES = 4.5 * 1024 * 1024
const MP3_BITRATE_CANDIDATES = [
  { label: '64k', value: '64k' },
  { label: '48k', value: '48k' },
  { label: '40k', value: '40k' },
  { label: '32k', value: '32k' },
  { label: '24k', value: '24k' },
] as const
const OUTPUT_CONTENT_TYPE = 'audio/mpeg'
const OUTPUT_CACHE_CONTROL = 'public, max-age=31536000, immutable'

type ConversionAttempt = {
  bitrate: string
  status: 'converted' | 'too_large' | 'ffmpeg_failed' | 'skipped'
  sizeBytes?: number
  sizeMb?: number
  withinLimit: boolean
  error?: string
}

type ConvertToMp3Request = {
  sourceUrl?: unknown
  sourceKey?: unknown
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

async function requireAdminUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { ok: false as const, status: 401, message: 'Nao autenticado.' }
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'djeonewill@gmail.com').toLowerCase()
  const userEmail = (user.email || '').toLowerCase()

  if (userEmail !== adminEmail) {
    return { ok: false as const, status: 403, message: 'Acesso restrito ao administrador.' }
  }

  return { ok: true as const }
}

function getPublicBaseUrl() {
  const publicBaseUrl = R2_PUBLIC_URL.replace(/\/+$/, '')

  if (!publicBaseUrl) {
    throw new Error('R2_PUBLIC_URL nao configurado.')
  }

  return publicBaseUrl
}

function normalizeSourceKey(sourceKey: string) {
  const key = decodeURIComponent(sourceKey.replace(/^\/+/, ''))

  if (!key || key.includes('..') || key.includes('\\')) {
    throw new Error('Key de origem invalida.')
  }

  return key
}

function getSourceKeyFromUrl(sourceUrl: string, publicBaseUrl: string) {
  const parsedSourceUrl = new URL(sourceUrl)
  const parsedPublicUrl = new URL(publicBaseUrl)

  if (parsedSourceUrl.origin !== parsedPublicUrl.origin) {
    throw new Error('URL de origem nao pertence ao R2 configurado.')
  }

  const basePath = parsedPublicUrl.pathname.replace(/\/+$/, '')
  const sourcePath = parsedSourceUrl.pathname

  if (basePath && !sourcePath.startsWith(`${basePath}/`)) {
    throw new Error('URL de origem nao pertence ao caminho publico do R2.')
  }

  const keyPath = basePath ? sourcePath.slice(basePath.length + 1) : sourcePath.replace(/^\/+/, '')

  return normalizeSourceKey(keyPath)
}

function getSourceExtension(keyOrUrl: string) {
  const extension = path.extname(new URL(keyOrUrl, 'https://r2.local').pathname).toLowerCase()

  return extension || '.bin'
}

function bytesToMb(sizeBytes: number) {
  return Number((sizeBytes / 1024 / 1024).toFixed(2))
}

function isMp3Source(extension: string, contentType: string) {
  const normalizedContentType = contentType.toLowerCase().split(';')[0].trim()

  return extension === '.mp3' || normalizedContentType === OUTPUT_CONTENT_TYPE
}

function getShortDiagnostic(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 1200)
}

function getCompatibleKey(sourceKey: string) {
  const parsed = path.posix.parse(sourceKey.replace(/\\/g, '/'))
  const baseName = parsed.name.replace(/[^a-zA-Z0-9._-]/g, '-')

  if (!baseName) {
    throw new Error('Nao foi possivel gerar nome do MP3 compativel.')
  }

  return `recordings-compatible/${baseName}.mp3`
}

async function writeR2ObjectToFile(sourceKey: string, filePath: string) {
  const object = await r2Client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: sourceKey,
    })
  )

  if (!object.Body) {
    throw new Error('Arquivo de origem vazio no R2.')
  }

  const body = object.Body as {
    transformToByteArray?: () => Promise<Uint8Array>
  }

  if (!body.transformToByteArray) {
    throw new Error('Nao foi possivel ler o arquivo de origem do R2.')
  }

  const bytes = await body.transformToByteArray()
  await writeFile(filePath, Buffer.from(bytes))

  return {
    sizeBytes: bytes.byteLength,
    contentType: object.ContentType || '',
  }
}

async function writeFetchedUrlToFile(sourceUrl: string, filePath: string) {
  const response = await fetch(sourceUrl)

  if (!response.ok || !response.body) {
    throw new Error('Nao foi possivel baixar o audio de origem.')
  }

  const arrayBuffer = await response.arrayBuffer()
  await writeFile(filePath, Buffer.from(arrayBuffer))

  return {
    sizeBytes: arrayBuffer.byteLength,
    contentType: response.headers.get('content-type') || '',
  }
}

function runFfmpeg(inputPath: string, outputPath: string, bitrate: string) {
  return new Promise<void>((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('ffmpeg-static nao encontrou o binario do ffmpeg.'))
      return
    }

    const ffmpeg = spawn(ffmpegPath, [
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-acodec',
      'libmp3lame',
      '-b:a',
      bitrate,
      '-ar',
      '24000',
      '-ac',
      '1',
      outputPath,
    ])
    let stderr = ''

    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    ffmpeg.on('error', (error) => {
      reject(new Error(`ffmpeg nao iniciou: ${error.message}`))
    })
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(getShortDiagnostic(`ffmpeg falhou ao converter o audio. ${stderr}`)))
    })
  })
}

async function convertWithBestBitrate(inputPath: string, outputPath: string) {
  const attempts: ConversionAttempt[] = []

  for (const candidate of MP3_BITRATE_CANDIDATES) {
    try {
      await rm(outputPath, { force: true })
      console.log('[convert-to-mp3] tentando bitrate', {
        bitrate: candidate.label,
      })

      await runFfmpeg(inputPath, outputPath, candidate.value)

      let mp3Buffer: Buffer

      try {
        mp3Buffer = await readFile(outputPath)
      } catch {
        throw new Error('ffmpeg terminou sem gerar arquivo MP3.')
      }

      const withinLimit = mp3Buffer.byteLength <= MAX_COMPATIBLE_AUDIO_BYTES
      const sizeMb = bytesToMb(mp3Buffer.byteLength)

      attempts.push({
        bitrate: candidate.label,
        status: withinLimit ? 'converted' : 'too_large',
        sizeBytes: mp3Buffer.byteLength,
        sizeMb,
        withinLimit,
        error: withinLimit ? undefined : 'Arquivo gerado acima do limite de 4,5 MB.',
      })

      console.log('[convert-to-mp3] tentativa concluida', {
        bitrate: candidate.label,
        sizeBytes: mp3Buffer.byteLength,
        sizeMb,
        withinLimit,
        rejectedReason: withinLimit ? null : 'too_large',
      })

      if (withinLimit) {
        return {
          bitrate: candidate.label,
          mp3Buffer,
          attempts,
        }
      }
    } catch (error) {
      const message = getErrorMessage(error)

      attempts.push({
        bitrate: candidate.label,
        status: 'ffmpeg_failed',
        withinLimit: false,
        error: getShortDiagnostic(message),
      })

      console.error('[convert-to-mp3] tentativa falhou', {
        bitrate: candidate.label,
        error: message,
      })
    }
  }

  const smallestAttempt = attempts
    .filter((attempt) => typeof attempt.sizeBytes === 'number')
    .sort((a, b) => (a.sizeBytes || 0) - (b.sizeBytes || 0))[0]
  const smallestSizeMb = smallestAttempt?.sizeBytes
    ? (smallestAttempt.sizeBytes / 1024 / 1024).toFixed(2)
    : null

  throw Object.assign(
    new Error(
      smallestSizeMb
        ? `Nao foi possivel gerar MP3 compativel. Veja as tentativas. Menor tentativa: ${smallestAttempt?.bitrate} com ${smallestSizeMb} MB.`
        : 'Nao foi possivel gerar MP3 compativel. Veja as tentativas.'
    ),
    { attempts }
  )
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminUser()

  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.message }, { status: admin.status })
  }

  const tempId = randomUUID()
  let inputPath = ''
  let outputPath = ''

  try {
    const body = (await request.json()) as ConvertToMp3Request
    const sourceUrl = cleanText(body.sourceUrl)
    const publicBaseUrl = getPublicBaseUrl()

    if (!sourceUrl) {
      return NextResponse.json(
        { success: false, error: 'Envie a URL do audio de origem.' },
        { status: 400 }
      )
    }

    const sourceUrlKey = getSourceKeyFromUrl(sourceUrl, publicBaseUrl)
    const sourceKey = cleanText(body.sourceKey)
      ? normalizeSourceKey(cleanText(body.sourceKey))
      : sourceUrlKey

    if (sourceKey !== sourceUrlKey) {
      throw new Error('A key de origem nao corresponde a URL informada.')
    }

    const extension = getSourceExtension(sourceKey)
    const compatibleKey = getCompatibleKey(sourceKey)
    const compatibleUrl = `${publicBaseUrl}/${compatibleKey}`

    console.log('[convert-to-mp3] inicio', {
      sourceUrl,
      sourceKey,
      extension,
      compatibleKey,
      maxSizeBytes: MAX_COMPATIBLE_AUDIO_BYTES,
    })

    inputPath = path.join(tmpdir(), `djeone-audio-${tempId}${extension}`)
    outputPath = path.join(tmpdir(), `djeone-audio-${tempId}.mp3`)

    const sourceObject = sourceKey
      ? await writeR2ObjectToFile(sourceKey, inputPath)
      : await writeFetchedUrlToFile(sourceUrl, inputPath)

    console.log('[convert-to-mp3] origem baixada', {
      sourceKey,
      extension,
      contentType: sourceObject.contentType,
      sizeBytes: sourceObject.sizeBytes,
      sizeMb: bytesToMb(sourceObject.sizeBytes),
    })

    if (
      isMp3Source(extension, sourceObject.contentType) &&
      sourceObject.sizeBytes <= MAX_COMPATIBLE_AUDIO_BYTES
    ) {
      const attempts: ConversionAttempt[] = [
        {
          bitrate: 'original',
          status: 'skipped',
          sizeBytes: sourceObject.sizeBytes,
          sizeMb: bytesToMb(sourceObject.sizeBytes),
          withinLimit: true,
          error: 'MP3 original ja estava dentro do limite.',
        },
      ]

      console.log('[convert-to-mp3] mp3 original aceito', {
        sourceKey,
        sizeBytes: sourceObject.sizeBytes,
      })

      return NextResponse.json({
        success: true,
        compatibleUrl: sourceUrl,
        compatibleKey: sourceKey,
        compatibleType: OUTPUT_CONTENT_TYPE,
        sizeBytes: sourceObject.sizeBytes,
        sizeMb: bytesToMb(sourceObject.sizeBytes),
        bitrate: 'original',
        maxSizeBytes: MAX_COMPATIBLE_AUDIO_BYTES,
        withinLimit: true,
        attempts,
      })
    }

    const conversion = await convertWithBestBitrate(inputPath, outputPath)
    const mp3Buffer = conversion.mp3Buffer

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: compatibleKey,
        Body: mp3Buffer,
        ContentType: OUTPUT_CONTENT_TYPE,
        CacheControl: OUTPUT_CACHE_CONTROL,
      })
    )

    console.log('[convert-to-mp3] mp3 escolhido', {
      compatibleKey,
      compatibleUrl,
      bitrate: conversion.bitrate,
      sizeBytes: mp3Buffer.byteLength,
      sizeMb: bytesToMb(mp3Buffer.byteLength),
    })

    return NextResponse.json({
      success: true,
      compatibleUrl,
      compatibleKey,
      compatibleType: OUTPUT_CONTENT_TYPE,
      sizeBytes: mp3Buffer.byteLength,
      sizeMb: Number((mp3Buffer.byteLength / 1024 / 1024).toFixed(2)),
      bitrate: conversion.bitrate,
      maxSizeBytes: MAX_COMPATIBLE_AUDIO_BYTES,
      withinLimit: true,
      attempts: conversion.attempts,
    })
  } catch (error) {
    console.error('[convert-to-mp3] erro:', error)
    const attempts = typeof error === 'object' && error !== null && 'attempts' in error
      ? (error as { attempts?: ConversionAttempt[] }).attempts
      : undefined

    return NextResponse.json(
      {
        success: false,
        error: attempts?.length
          ? 'Nao foi possivel gerar MP3 compativel. Veja as tentativas.'
          : getErrorMessage(error) || 'Nao foi possivel converter o audio para MP3.',
        attempts,
      },
      { status: 500 }
    )
  } finally {
    await Promise.all([
      inputPath ? rm(inputPath, { force: true }) : Promise.resolve(),
      outputPath ? rm(outputPath, { force: true }) : Promise.resolve(),
    ])
  }
}
