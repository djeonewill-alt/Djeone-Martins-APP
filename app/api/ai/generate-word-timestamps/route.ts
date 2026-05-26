import { PutObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'

import { R2_BUCKET_NAME, R2_PUBLIC_URL, r2Client } from '@/lib/r2/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type EpisodeRow = {
  id: string
  title: string | null
  audio_url: string | null
  audio_url_compatible: string | null
  audio_compatible_type: string | null
  transcription_words_key: string | null
  transcription_words_url: string | null
}

type WordTimestamp = {
  word: string
  start: number
  end: number
}

const WORDS_CONTENT_TYPE = 'application/json; charset=utf-8'
const WORDS_CACHE_CONTROL = 'public, max-age=300'

function cleanText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function getFileNameFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    const fileName = parsedUrl.pathname.split('/').filter(Boolean).pop()

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

function getWordsKey(episodeId: string) {
  return `transcriptions/${episodeId}/words.json`
}

function getWordsUrl(key: string) {
  const publicBaseUrl = R2_PUBLIC_URL.replace(/\/+$/, '')

  if (!publicBaseUrl) {
    throw new Error('R2_PUBLIC_URL nao configurado.')
  }

  return `${publicBaseUrl}/${key}`
}

function normalizeWords(input: unknown): WordTimestamp[] {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      const value = item as {
        word?: unknown
        start?: unknown
        end?: unknown
      }
      const word = cleanText(String(value.word || ''))
      const start = Number(value.start)
      const end = Number(value.end)

      return {
        word,
        start,
        end,
      }
    })
    .filter((item) => {
      return (
        item.word.length > 0 &&
        Number.isFinite(item.start) &&
        Number.isFinite(item.end) &&
        item.start >= 0 &&
        item.end > item.start
      )
    })
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

  return { ok: true as const, supabase }
}

async function updateEpisodeWordsState(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  episodeId: string,
  values: Record<string, unknown>
) {
  const { error } = await supabase
    .from('episodes')
    .update(values)
    .eq('id', episodeId)

  if (error) {
    throw new Error(error.message)
  }
}

async function downloadAudioFile(audioUrl: string) {
  const response = await fetch(audioUrl)

  if (!response.ok) {
    throw new Error('Nao foi possivel baixar o audio para gerar timestamps.')
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

async function transcribeWords(audioUrl: string) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY ausente.')
  }

  const model =
    process.env.OPENAI_TRANSCRIPTION_MODEL ||
    process.env.OPENAI_TRANSCRIBE_TIMESTAMPS_MODEL ||
    'whisper-1'

  if (model !== 'whisper-1') {
    throw new Error('Word timestamps exigem o modelo whisper-1.')
  }

  const { arrayBuffer, fileName, contentType } = await downloadAudioFile(audioUrl)
  const audioBlob = new Blob([arrayBuffer], { type: contentType })
  const formData = new FormData()

  formData.append('file', audioBlob, fileName)
  formData.append('model', model)
  formData.append('language', 'pt')
  formData.append('response_format', 'verbose_json')
  formData.append('timestamp_granularities[]', 'word')
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
    console.error('Erro OpenAI word timestamps:', data)
    throw new Error(data?.error?.message || 'Erro ao gerar word timestamps com OpenAI.')
  }

  const words = normalizeWords(data.words)

  if (words.length === 0) {
    throw new Error('A OpenAI nao retornou palavras com timestamps validos.')
  }

  return {
    model,
    words,
  }
}

async function uploadWordsJson(params: {
  episode: EpisodeRow
  audioUrl: string
  model: string
  words: WordTimestamp[]
}) {
  const generatedAt = new Date().toISOString()
  const key = getWordsKey(params.episode.id)
  const url = getWordsUrl(key)
  const payload = {
    episode_id: params.episode.id,
    episode_title: params.episode.title || '',
    generated_at: generatedAt,
    model: params.model,
    source_audio_url: params.audioUrl,
    words: params.words,
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8')

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
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

export async function POST(request: NextRequest) {
  const admin = await requireAdminUser()

  if (!admin.ok) {
    return NextResponse.json(
      { success: false, error: admin.message },
      { status: admin.status }
    )
  }

  const { supabase } = admin
  let episodeId = ''

  try {
    const body = await request.json()
    episodeId = cleanText(String(body.episodeId || ''))

    if (!episodeId) {
      return NextResponse.json(
        { success: false, error: 'Envie o ID do episodio.' },
        { status: 400 }
      )
    }

    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select(
        [
          'id',
          'title',
          'audio_url',
          'audio_url_compatible',
          'audio_compatible_type',
          'transcription_words_key',
          'transcription_words_url',
        ].join(', ')
      )
      .eq('id', episodeId)
      .single()

    if (episodeError || !episode) {
      throw new Error(episodeError?.message || 'Episodio nao encontrado.')
    }

    const episodeRow = episode as unknown as EpisodeRow
    const audioUrl = episodeRow.audio_url_compatible || episodeRow.audio_url || ''

    if (!audioUrl) {
      throw new Error('Este episodio nao possui audio para gerar timestamps.')
    }

    await updateEpisodeWordsState(supabase, episodeId, {
      transcription_words_status: 'processing',
      transcription_words_error: null,
    })

    const transcription = await transcribeWords(audioUrl)
    const upload = await uploadWordsJson({
      episode: episodeRow,
      audioUrl,
      model: transcription.model,
      words: transcription.words,
    })

    await updateEpisodeWordsState(supabase, episodeId, {
      transcription_words_url: upload.url,
      transcription_words_key: upload.key,
      transcription_words_count: transcription.words.length,
      transcription_words_generated_at: upload.generatedAt,
      transcription_words_status: 'ready',
      transcription_words_error: null,
    })

    return NextResponse.json({
      success: true,
      episodeId,
      wordsCount: transcription.words.length,
      wordsUrl: upload.url,
      wordsKey: upload.key,
      status: 'ready',
    })
  } catch (error) {
    const message = cleanText(getErrorMessage(error)).slice(0, 300)

    console.error('Erro ao gerar word timestamps:', error)

    if (episodeId) {
      try {
        await updateEpisodeWordsState(supabase, episodeId, {
          transcription_words_status: 'error',
          transcription_words_error: message,
        })
      } catch (updateError) {
        console.error('Erro ao marcar word timestamps como erro:', updateError)
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: message || 'Erro ao gerar word timestamps.',
      },
      { status: 500 }
    )
  }
}
