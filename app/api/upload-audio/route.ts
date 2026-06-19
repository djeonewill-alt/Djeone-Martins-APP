import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// NOTA: Vercel Hobby impõe limite de ~4.5 MB no body da requisição.
// config.api.bodyParser é ignorado no App Router (Next.js 16+).
// Para arquivos > 4.5 MB, use upload via presigned URL: /api/r2/presigned-upload
// que já está implementado no frontend (uploadAudioDirectToR2).

const MAX_AUDIO_SIZE_BYTES = 250 * 1024 * 1024
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

const validAudioTypes = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'application/ogg',
  'audio/wav',
  'audio/webm',
]

const validImageTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

const compatibleAudioTypes = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'application/ogg',
]

const compatibleAudioExtensions = ['mp3', 'm4a', 'mp4', 'aac', 'ogg']

function isCompatibleAudio(contentType: string, extension: string) {
  return (
    compatibleAudioTypes.includes(contentType.toLowerCase()) ||
    compatibleAudioExtensions.includes(extension.toLowerCase())
  )
}

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`)
  }

  return value
}

function getS3Client() {
  const accountId = getRequiredEnv('R2_ACCOUNT_ID')
  const accessKeyId = getRequiredEnv('R2_ACCESS_KEY_ID')
  const secretAccessKey = getRequiredEnv('R2_SECRET_ACCESS_KEY')

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
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
      { error: 'Configuração administrativa ausente.' },
      { status: 500 }
    )
  }

  const headerPassword = request.headers.get('x-admin-password') || ''

  if (headerPassword === adminSecret || (await isAdminSession())) {
    return null
  }

  return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
}

function validateFile(file: File, type: string) {
  if (type !== 'audio' && type !== 'cover') {
    return NextResponse.json(
      { error: 'Tipo de upload inválido. Use audio ou cover.' },
      { status: 400 }
    )
  }

  if (type === 'audio') {
    if (!validAudioTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Tipo de arquivo inválido: ${file.type || 'sem tipo'}. Use MP3, M4A, AAC, OGG, WAV ou WEBM.`,
          receivedType: file.type,
          fileName: file.name,
          size: file.size,
        },
        { status: 400 }
      )
    }

    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: 'Arquivo de áudio muito grande. Envie um arquivo de até 250 MB.',
          fileName: file.name,
          size: file.size,
          maxSize: MAX_AUDIO_SIZE_BYTES,
        },
        { status: 400 }
      )
    }
  }

  if (type === 'cover') {
    if (!validImageTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Tipo de imagem inválido: ${file.type || 'sem tipo'}. Use JPG, PNG ou WEBP.`,
          receivedType: file.type,
          fileName: file.name,
          size: file.size,
        },
        { status: 400 }
      )
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: 'Imagem muito grande. Envie uma imagem de até 10 MB.',
          fileName: file.name,
          size: file.size,
          maxSize: MAX_IMAGE_SIZE_BYTES,
        },
        { status: 400 }
      )
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  const authError = await getUploadAuthError(request)

  if (authError) {
    return authError
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = (formData.get('type') as string | null) || 'audio'

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    const fileValidationError = validateFile(file, type)

    if (fileValidationError) {
      return fileValidationError
    }

    const bucketName = getRequiredEnv('R2_BUCKET_NAME')
    const publicBaseUrl = getRequiredEnv('R2_PUBLIC_URL').replace(/\/+$/, '')
    const s3Client = getS3Client()

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const timestamp = Date.now()
    const originalExtension = file.name.split('.').pop() || 'bin'
    const safeExtension = originalExtension.toLowerCase().replace(/[^a-z0-9]/g, '')
    const safeType = type.replace(/[^a-z0-9-]/gi, '').toLowerCase()
    const fileName = `${safeType}-${timestamp}.${safeExtension}`

    console.log('[upload-audio] iniciando upload', {
      fileName,
      originalName: file.name,
      type,
      mimeType: file.type,
      size: file.size,
      bucketName,
      publicBaseUrl,
    })

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    })

    await s3Client.send(command)

    const publicUrl = `${publicBaseUrl}/${fileName}`
    const contentType = file.type || 'application/octet-stream'
    const isAudioCompatible =
      type === 'audio' && isCompatibleAudio(contentType, safeExtension)

    console.log('[upload-audio] upload concluído', {
      fileName,
      publicUrl,
      size: file.size,
      mimeType: file.type,
    })

    return NextResponse.json({
      url: publicUrl,
      fileName,
      size: file.size,
      type: file.type,
      contentType,
      extension: safeExtension,
      isAudioCompatible,
      compatibleAudioUrl: isAudioCompatible ? publicUrl : null,
      compatibleAudioType: isAudioCompatible ? contentType : null,
    })
  } catch (error) {
    const message = getErrorMessage(error)

    console.error('[upload-audio] erro real:', error)

    return NextResponse.json(
      {
        error: message,
        hint: 'Falha na rota /api/upload-audio. Verifique variáveis R2, permissões do bucket ou tipo do arquivo.',
      },
      { status: 500 }
    )
  }
}
