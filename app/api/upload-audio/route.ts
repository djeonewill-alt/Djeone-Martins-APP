import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export const runtime = 'nodejs'

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = (formData.get('type') as string | null) || 'audio'

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

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

    const validImageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ]

    if (type === 'audio' && !validAudioTypes.includes(file.type)) {
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

    if (type === 'cover' && !validImageTypes.includes(file.type)) {
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
