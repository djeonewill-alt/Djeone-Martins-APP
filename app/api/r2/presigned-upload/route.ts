import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextRequest, NextResponse } from 'next/server'
import { R2_BUCKET_NAME, R2_PUBLIC_URL, r2Client } from '@/lib/r2/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_AUDIO_SIZE_BYTES = 250 * 1024 * 1024
const SIGNED_URL_EXPIRES_SECONDS = 60 * 5

const validAudioTypes = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
]

const compatibleAudioTypes = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
]

const compatibleAudioExtensions = ['mp3', 'm4a', 'mp4', 'aac']
const allowedFolders = ['audio', 'recordings']

type PresignedUploadRequest = {
  fileName?: unknown
  contentType?: unknown
  sizeBytes?: unknown
  folder?: unknown
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

async function isAdminSession() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const adminEmail = (process.env.ADMIN_EMAIL || 'djeonewill@gmail.com').toLowerCase()

    return Boolean(user?.email && user.email.toLowerCase() === adminEmail)
  } catch {
    return false
  }
}

async function getUploadAuthError(request: NextRequest) {
  const adminSecret = process.env.ADMIN_API_SECRET || ''

  if (!adminSecret) {
    return NextResponse.json(
      { error: 'Configuracao administrativa ausente.' },
      { status: 500 }
    )
  }

  const headerPassword = request.headers.get('x-admin-password') || ''

  if (headerPassword === adminSecret || (await isAdminSession())) {
    return null
  }

  return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })
}

function getExtensionFromContentType(contentType: string) {
  switch (contentType) {
    case 'audio/mpeg':
    case 'audio/mp3':
      return 'mp3'
    case 'audio/mp4':
    case 'audio/m4a':
    case 'audio/x-m4a':
      return 'm4a'
    case 'audio/aac':
      return 'aac'
    case 'audio/ogg':
      return 'ogg'
    case 'audio/wav':
      return 'wav'
    case 'audio/webm':
      return 'webm'
    default:
      return 'bin'
  }
}

function getSafeExtension(fileName: string, contentType: string) {
  const rawExtension = fileName.split('.').pop() || ''
  const safeExtension = rawExtension.toLowerCase().replace(/[^a-z0-9]/g, '')

  return safeExtension || getExtensionFromContentType(contentType)
}

function getSafeSlug(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '')
  const slug = withoutExtension
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return slug || 'audio'
}

function isCompatibleAudio(contentType: string, extension: string) {
  return (
    compatibleAudioTypes.includes(contentType.toLowerCase()) ||
    compatibleAudioExtensions.includes(extension.toLowerCase())
  )
}

function validateRequestBody(body: PresignedUploadRequest) {
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : ''
  const contentType =
    typeof body.contentType === 'string'
      ? body.contentType.split(';')[0].trim().toLowerCase()
      : ''
  const sizeBytes = Number(body.sizeBytes)
  const requestedFolder = typeof body.folder === 'string' ? body.folder.trim() : 'audio'
  const folder = requestedFolder || 'audio'

  if (!fileName) {
    return { error: 'Nome do arquivo ausente.' }
  }

  if (!validAudioTypes.includes(contentType)) {
    return {
      error: `Tipo de audio invalido: ${contentType || 'sem tipo'}.`,
    }
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { error: 'Tamanho do arquivo invalido.' }
  }

  if (sizeBytes > MAX_AUDIO_SIZE_BYTES) {
    return {
      error: 'Arquivo de audio muito grande. Envie um arquivo de ate 250 MB.',
    }
  }

  if (!allowedFolders.includes(folder)) {
    return { error: 'Pasta de upload invalida.' }
  }

  return {
    fileName,
    contentType,
    sizeBytes,
    folder,
  }
}

export async function POST(request: NextRequest) {
  const authError = await getUploadAuthError(request)

  if (authError) {
    return authError
  }

  try {
    const body = (await request.json()) as PresignedUploadRequest
    const validation = validateRequestBody(body)

    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const publicBaseUrl = R2_PUBLIC_URL.replace(/\/+$/, '')

    if (!publicBaseUrl) {
      return NextResponse.json(
        { error: 'R2_PUBLIC_URL nao configurado.' },
        { status: 500 }
      )
    }

    const extension = getSafeExtension(validation.fileName, validation.contentType)
    const slug = getSafeSlug(validation.fileName)
    const key = `${validation.folder}/${Date.now()}-${slug}.${extension}`

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: validation.contentType,
    })

    const signedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: SIGNED_URL_EXPIRES_SECONDS,
    })
    const publicUrl = `${publicBaseUrl}/${key}`
    const isAudioCompatible = isCompatibleAudio(validation.contentType, extension)

    return NextResponse.json({
      signedUrl,
      publicUrl,
      key,
      contentType: validation.contentType,
      extension,
      sizeBytes: validation.sizeBytes,
      isAudioCompatible,
      compatibleAudioUrl: isAudioCompatible ? publicUrl : null,
      compatibleAudioType: isAudioCompatible ? validation.contentType : null,
    })
  } catch (error) {
    console.error('[presigned-upload] erro real:', error)

    return NextResponse.json(
      {
        error: getErrorMessage(error),
        hint: 'Falha ao gerar URL assinada para upload direto no R2.',
      },
      { status: 500 }
    )
  }
}
