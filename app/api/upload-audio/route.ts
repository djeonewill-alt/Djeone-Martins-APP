import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string || 'audio'

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Validação de tipo
    const validAudioTypes = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm']
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    
    if (type === 'audio' && !validAudioTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido. Use MP3, M4A, OGG, WAV ou WEBM' },
        { status: 400 }
      )
    }

    if (type === 'cover' && !validImageTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de imagem inválido. Use JPG, PNG ou WEBP' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Nome único do arquivo
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const fileName = `${type}-${timestamp}.${extension}`

    // Upload para Cloudflare R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    })

    await s3Client.send(command)

    // URL pública
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`

    return NextResponse.json({ 
      url: publicUrl,
      fileName: fileName,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer upload do arquivo' },
      { status: 500 }
    )
  }
}