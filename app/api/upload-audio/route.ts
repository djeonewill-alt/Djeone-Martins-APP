import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2/client'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Validar tipo de arquivo
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/m4a', 'audio/ogg', 'audio/wav']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Tipo de arquivo inválido. Use MP3, M4A, OGG ou WAV' 
      }, { status: 400 })
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop()
    const fileName = `audio-${timestamp}-${randomString}.${extension}`

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload para R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    })

    await r2Client.send(command)

    // URL do arquivo
    const fileUrl = `${process.env.R2_PUBLIC_URL}/${R2_BUCKET_NAME}/${fileName}`

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName,
      size: file.size,
    })
  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json({ 
      error: 'Erro ao fazer upload do arquivo' 
    }, { status: 500 })
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}
