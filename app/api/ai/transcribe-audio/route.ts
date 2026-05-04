import { NextRequest, NextResponse } from 'next/server'

function cleanText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
}

function getFileNameFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    const pathname = parsedUrl.pathname
    const fileName = pathname.split('/').filter(Boolean).pop()

    if (fileName && fileName.includes('.')) {
      return fileName
    }
  } catch {
    // mantém fallback abaixo
  }

  return `audio-${Date.now()}.webm`
}

function getContentTypeFromFileName(fileName: string) {
  const lower = fileName.toLowerCase()

  if (lower.endsWith('.mp3')) return 'audio/mpeg'
  if (lower.endsWith('.m4a')) return 'audio/mp4'
  if (lower.endsWith('.mp4')) return 'audio/mp4'
  if (lower.endsWith('.mpeg')) return 'audio/mpeg'
  if (lower.endsWith('.mpga')) return 'audio/mpeg'
  if (lower.endsWith('.wav')) return 'audio/wav'
  if (lower.endsWith('.webm')) return 'audio/webm'
  if (lower.endsWith('.ogg')) return 'audio/ogg'

  return 'audio/webm'
}

async function downloadAudioFile(audioUrl: string) {
  const response = await fetch(audioUrl)

  if (!response.ok) {
    throw new Error('Não foi possível baixar o áudio para transcrição.')
  }

  const arrayBuffer = await response.arrayBuffer()
  const fileName = getFileNameFromUrl(audioUrl)
  const responseContentType = response.headers.get('content-type')
  const contentType =
    responseContentType && responseContentType.includes('audio')
      ? responseContentType
      : getContentTypeFromFileName(fileName)

  return {
    arrayBuffer,
    fileName,
    contentType,
  }
}

async function transcribeWithOpenAI(audioUrl: string) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY ausente no .env.local.')
  }

  const model =
    process.env.OPENAI_TRANSCRIBE_MODEL ||
    'gpt-4o-mini-transcribe'

  const { arrayBuffer, fileName, contentType } = await downloadAudioFile(audioUrl)

  const audioBlob = new Blob([arrayBuffer], {
    type: contentType,
  })

  const formData = new FormData()

  formData.append('file', audioBlob, fileName)
  formData.append('model', model)
  formData.append('language', 'pt')
  formData.append('response_format', 'json')
  formData.append(
    'prompt',
    'Transcreva em português brasileiro. Preserve termos bíblicos, nomes próprios, referências bíblicas e linguagem devocional cristã.'
  )

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Erro OpenAI transcrição:', data)

    throw new Error(
      data?.error?.message ||
        'Erro ao transcrever áudio com OpenAI.'
    )
  }

  const transcriptionText = cleanText(String(data.text || ''))

  if (!transcriptionText) {
    throw new Error('A OpenAI não retornou texto transcrito.')
  }

  return {
    transcriptionText,
    provider: 'openai',
    model,
    usage: data.usage || null,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const audioUrl = cleanText(String(body.audioUrl || ''))

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Envie a URL do áudio para transcrever.' },
        { status: 400 }
      )
    }

    const result = await transcribeWithOpenAI(audioUrl)

    return NextResponse.json({
      success: true,
      transcriptionText: result.transcriptionText,
      provider: result.provider,
      model: result.model,
      usage: result.usage,
    })
  } catch (error) {
    console.error('Erro ao transcrever áudio:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao transcrever áudio.',
      },
      { status: 500 }
    )
  }
}