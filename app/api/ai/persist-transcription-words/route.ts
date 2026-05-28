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
        item.end >= item.start
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
    const episodeTitle = cleanText(String(body.episodeTitle || ''))
    const audioUrlFromBody = cleanText(String(body.audioUrl || ''))
    const model = cleanText(String(body.model || '')) || 'unknown'
    const words = normalizeWords(body.words)

    if (!episodeId) {
      return NextResponse.json(
        { success: false, error: 'Envie o ID do episodio.' },
        { status: 400 }
      )
    }

    if (words.length < 3) {
      throw new Error('Envie ao menos 3 palavras validas com timestamps.')
    }

    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, title, audio_url, audio_url_compatible')
      .eq('id', episodeId)
      .single()

    if (episodeError || !episode) {
      throw new Error(episodeError?.message || 'Episodio nao encontrado.')
    }

    const episodeRow = episode as unknown as EpisodeRow
    const generatedAt = new Date().toISOString()
    const key = getWordsKey(episodeId)
    const url = getWordsUrl(key)
    const sourceAudioUrl =
      audioUrlFromBody || episodeRow.audio_url_compatible || episodeRow.audio_url || ''
    const payload = {
      episode_id: episodeId,
      episode_title: episodeTitle || episodeRow.title || '',
      generated_at: generatedAt,
      model,
      source_audio_url: sourceAudioUrl,
      words,
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

    await updateEpisodeWordsState(supabase, episodeId, {
      transcription_words_url: url,
      transcription_words_key: key,
      transcription_words_count: words.length,
      transcription_words_generated_at: generatedAt,
      transcription_words_status: 'ready',
      transcription_words_error: null,
    })

    return NextResponse.json({
      success: true,
      transcription_words_url: url,
      transcription_words_key: key,
      transcription_words_count: words.length,
      transcription_words_status: 'ready',
    })
  } catch (error) {
    const message = cleanText(getErrorMessage(error)).slice(0, 300)

    console.error('Erro ao persistir word timestamps:', error)

    if (episodeId) {
      try {
        await updateEpisodeWordsState(supabase, episodeId, {
          transcription_words_status: 'error',
          transcription_words_error: message,
        })
      } catch (updateError) {
        console.error('Erro ao marcar persistencia de word timestamps como erro:', updateError)
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: message || 'Erro ao persistir word timestamps.',
      },
      { status: 500 }
    )
  }
}
