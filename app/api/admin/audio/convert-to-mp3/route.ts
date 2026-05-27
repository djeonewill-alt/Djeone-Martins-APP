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

const MP3_BITRATE = '64k'
const OUTPUT_CONTENT_TYPE = 'audio/mpeg'
const OUTPUT_CACHE_CONTROL = 'public, max-age=31536000, immutable'
const SAFE_EXTENSIONS = new Set(['.webm', '.ogg', '.wav', '.mp3', '.m4a'])

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

function validateSafeExtension(keyOrUrl: string) {
  const extension = path.extname(new URL(keyOrUrl, 'https://r2.local').pathname).toLowerCase()

  if (!SAFE_EXTENSIONS.has(extension)) {
    throw new Error('Formato de audio nao suportado para conversao.')
  }

  return extension
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
}

async function writeFetchedUrlToFile(sourceUrl: string, filePath: string) {
  const response = await fetch(sourceUrl)

  if (!response.ok || !response.body) {
    throw new Error('Nao foi possivel baixar o audio de origem.')
  }

  const arrayBuffer = await response.arrayBuffer()
  await writeFile(filePath, Buffer.from(arrayBuffer))
}

function runFfmpeg(inputPath: string, outputPath: string) {
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
      MP3_BITRATE,
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

    ffmpeg.on('error', reject)
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`ffmpeg falhou ao converter o audio. ${stderr.slice(-1200)}`.trim()))
    })
  })
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

    validateSafeExtension(sourceKey)

    if (sourceKey !== sourceUrlKey) {
      throw new Error('A key de origem nao corresponde a URL informada.')
    }

    const extension = validateSafeExtension(sourceUrl)
    const compatibleKey = getCompatibleKey(sourceKey)
    const compatibleUrl = `${publicBaseUrl}/${compatibleKey}`

    inputPath = path.join(tmpdir(), `djeone-audio-${tempId}${extension}`)
    outputPath = path.join(tmpdir(), `djeone-audio-${tempId}.mp3`)

    if (sourceKey) {
      await writeR2ObjectToFile(sourceKey, inputPath)
    } else {
      await writeFetchedUrlToFile(sourceUrl, inputPath)
    }

    await runFfmpeg(inputPath, outputPath)

    const mp3Buffer = await readFile(outputPath)

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: compatibleKey,
        Body: mp3Buffer,
        ContentType: OUTPUT_CONTENT_TYPE,
        CacheControl: OUTPUT_CACHE_CONTROL,
      })
    )

    return NextResponse.json({
      success: true,
      compatibleUrl,
      compatibleKey,
      compatibleType: OUTPUT_CONTENT_TYPE,
      sizeBytes: mp3Buffer.byteLength,
      bitrate: MP3_BITRATE,
    })
  } catch (error) {
    console.error('[convert-to-mp3] erro:', error)

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || 'Nao foi possivel converter o audio para MP3.',
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
