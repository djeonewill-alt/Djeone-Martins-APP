import { PutObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'

type TranscriptionSegment = {
  start: number
  end: number
  text: string
}

type WordTimestamp = {
  word: string
  start: number
  end: number
}

type WordsStatus = 'ready' | 'pending_save' | 'missing'

const WORDS_CONTENT_TYPE = 'application/json; charset=utf-8'
const WORDS_CACHE_CONTROL = 'public, max-age=300'

function cleanText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
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
    // fallback abaixo
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

function normalizeSegments(rawSegments: unknown): TranscriptionSegment[] {
  if (!Array.isArray(rawSegments)) {
    return []
  }

  return rawSegments
    .map((segment) => {
      const item = segment as {
        start?: unknown
        end?: unknown
        text?: unknown
      }

      const start = Number(item.start)
      const end = Number(item.end)
      const text = cleanText(String(item.text || ''))

      return {
        start,
        end,
        text,
      }
    })
    .filter((segment) => {
      return (
        Number.isFinite(segment.start) &&
        Number.isFinite(segment.end) &&
        segment.end > segment.start &&
        segment.text.length > 0
      )
    })
}

function normalizeWords(rawWords: unknown): WordTimestamp[] {
  if (!Array.isArray(rawWords)) {
    return []
  }

  return rawWords
    .map((word) => {
      const item = word as {
        word?: unknown
        start?: unknown
        end?: unknown
      }

      const text = cleanText(String(item.word || ''))
      const start = Number(item.start)
      const end = Number(item.end)

      return {
        word: text,
        start,
        end,
      }
    })
    .filter((word) => {
      return (
        word.word.length > 0 &&
        Number.isFinite(word.start) &&
        Number.isFinite(word.end) &&
        word.start >= 0 &&
        word.end > word.start
      )
    })
}

function getWordsKey(episodeId: string) {
  return `transcriptions/${episodeId}/words.json`
}

function getWordsUrl(key: string, publicBaseUrl: string) {
  const normalizedPublicBaseUrl = publicBaseUrl.replace(/\/+$/, '')

  if (!normalizedPublicBaseUrl) {
    throw new Error('R2_PUBLIC_URL nao configurado.')
  }

  return `${normalizedPublicBaseUrl}/${key}`
}

async function uploadWordsJson(params: {
  episodeId: string
  episodeTitle: string
  audioUrl: string
  model: string
  words: WordTimestamp[]
}) {
  const { R2_BUCKET_NAME, R2_PUBLIC_URL, r2Client } = await import('@/lib/r2/client')
  const generatedAt = new Date().toISOString()
  const key = getWordsKey(params.episodeId)
  const url = getWordsUrl(key, R2_PUBLIC_URL)
  const payload = {
    episode_id: params.episodeId,
    episode_title: params.episodeTitle,
    generated_at: generatedAt,
    model: params.model,
    source_audio_url: params.audioUrl,
    words: params.words,
  }

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(JSON.stringify(payload), 'utf8'),
      ContentType: WORDS_CONTENT_TYPE,
      CacheControl: WORDS_CACHE_CONTROL,
    })
  )

  return {
    key,
    url,
    generatedAt,
  }
}

async function downloadAudioFile(audioUrl: string) {
  const response = await fetch(audioUrl)

  if (!response.ok) {
    throw new Error('Nao foi possivel baixar o audio para transcricao.')
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

async function transcribeWithOpenAI(audioUrl: string, advanced: boolean) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY ausente no .env.local.')
  }

  const model =
    process.env.OPENAI_TRANSCRIBE_TIMESTAMPS_MODEL ||
    'whisper-1'

  const { arrayBuffer, fileName, contentType } = await downloadAudioFile(audioUrl)

  const audioBlob = new Blob([arrayBuffer], {
    type: contentType,
  })

  const formData = new FormData()

  formData.append('file', audioBlob, fileName)
  formData.append('model', model)
  formData.append('language', 'pt')
  formData.append('response_format', 'verbose_json')
  formData.append('timestamp_granularities[]', 'segment')

  if (advanced) {
    formData.append('timestamp_granularities[]', 'word')
  }

  formData.append(
    'prompt',
    'Transcreva em portugues brasileiro. Preserve termos biblicos, nomes proprios, referencias biblicas e linguagem devocional crista.'
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
    console.error('Erro OpenAI transcricao:', data)

    throw new Error(
      data?.error?.message ||
        'Erro ao transcrever audio com OpenAI.'
    )
  }

  const transcriptionText = cleanText(String(data.text || ''))
  const transcriptionSegments = normalizeSegments(data.segments)
  const transcriptionWords = advanced ? normalizeWords(data.words) : []

  if (!transcriptionText) {
    throw new Error('A OpenAI nao retornou texto transcrito.')
  }

  return {
    transcriptionText,
    transcriptionSegments,
    transcriptionWords,
    provider: 'openai',
    model,
    usage: data.usage || null,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const audioUrl = cleanText(String(body.audioUrl || ''))
    const advanced = body.advanced === true
    const episodeId = cleanText(String(body.episodeId || ''))
    const episodeTitle = cleanText(String(body.episodeTitle || ''))

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'URL de audio nao informada para transcricao.' },
        { status: 400 }
      )
    }

    const result = await transcribeWithOpenAI(audioUrl, advanced)
    let transcriptionWordsStatus: WordsStatus = 'missing'
    let transcriptionWordsUrl: string | undefined
    let transcriptionWordsKey: string | undefined

    if (advanced && result.transcriptionWords.length > 0) {
      if (episodeId) {
        const upload = await uploadWordsJson({
          episodeId,
          episodeTitle,
          audioUrl,
          model: result.model,
          words: result.transcriptionWords,
        })

        transcriptionWordsStatus = 'ready'
        transcriptionWordsUrl = upload.url
        transcriptionWordsKey = upload.key
      } else {
        transcriptionWordsStatus = 'pending_save'
      }
    }

    return NextResponse.json({
      success: true,
      transcriptionText: result.transcriptionText,
      transcriptionSegments: result.transcriptionSegments,
      transcription: result.transcriptionText,
      transcription_segments: result.transcriptionSegments,
      transcription_words: advanced ? result.transcriptionWords : undefined,
      transcription_words_count: advanced ? result.transcriptionWords.length : undefined,
      transcription_words_status: advanced ? transcriptionWordsStatus : undefined,
      transcription_words_url: transcriptionWordsUrl,
      transcription_words_key: transcriptionWordsKey,
      provider: result.provider,
      model: result.model,
      usage: result.usage,
    })
  } catch (error) {
    console.error('Erro ao transcrever audio:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao transcrever audio.',
      },
      { status: 500 }
    )
  }
}
