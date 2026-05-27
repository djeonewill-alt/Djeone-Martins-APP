'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

type TranscriptionSegment = {
  start: number
  end: number
  text: string
}

type DailyQuoteSuggestion = {
  quote_text?: string
  reason?: string
  score?: number
}

type ShortIdea = {
  title: string
  hook: string
  angle: string
  suggested_opening_line?: string
  why_it_can_work?: string
}

type CutSuggestion = {
  title: string
  start: number
  end: number
  reason: string
  hook: string
  source_excerpt?: string
  suggested_caption_lines?: string[]
  strength_score?: number
  strength_reason?: string
}

type ShortScriptTimelineItem = {
  start: number
  end: number
  purpose: string
  narration_focus: string
  on_screen_text: string
  motion_direction: string
  sound_design: string
}

type ShortScriptImagePrompt = {
  moment: string
  prompt: string
  use_for_seconds: string
}

type ShortScript = {
  title: string
  platform_goal: 'shorts_reels_tiktok'
  duration_seconds: number
  main_hook: string
  cliffhanger: string
  spiritual_point: string
  cta: string
  timeline: ShortScriptTimelineItem[]
  animated_caption_lines: string[]
  image_prompts: ShortScriptImagePrompt[]
  editing_notes: string[]
  quality_check: {
    has_strong_hook: boolean
    has_clear_tension: boolean
    has_spiritual_application: boolean
    has_soft_cta: boolean
    avoids_generic_language: boolean
  }
}

type StrongPhrase = {
  text: string
  use_case?: string
  source_excerpt?: string
  why_it_works?: string
  score?: number
}

type ContentAssets = {
  devotional_summary: string
  strong_phrases: Array<string | StrongPhrase>
  whatsapp_text: string
  instagram_caption: string
  hashtags: string[]
  short_ideas: ShortIdea[]
  cut_suggestions: CutSuggestion[]
  cut_suggestions_note?: string
  short_script?: ShortScript
}

type GenerationMode =
  | 'all'
  | 'summary'
  | 'phrases'
  | 'whatsapp'
  | 'instagram'
  | 'short_ideas'
  | 'cuts'
  | 'short_script'

const EMPTY_CONTENT_ASSETS: ContentAssets = {
  devotional_summary: '',
  strong_phrases: [],
  whatsapp_text: '',
  instagram_caption: '',
  hashtags: [],
  short_ideas: [],
  cut_suggestions: [],
}

type EpisodeStudioRow = {
  id: string
  title: string
  description: string | null
  bible_reference: string | null
  audio_url: string | null
  audio_url_compatible: string | null
  audio_compatible_type: string | null
  duration_seconds: number | null
  status: string | null
  scheduled_publish_at: string | null
  published_at: string | null
  created_at: string | null
  cover_image_url: string | null
  transcription_text: string | null
  transcription_segments: TranscriptionSegment[] | null
  transcription_status: string | null
  transcription_error: string | null
  transcription_generated_at: string | null
  daily_quote_suggestions: DailyQuoteSuggestion[] | null
  daily_quote_status: string | null
  daily_quote_generated_at: string | null
  transcription_words_url: string | null
  transcription_words_key: string | null
  transcription_words_count: number | null
  transcription_words_generated_at: string | null
  transcription_words_status: string | null
  transcription_words_error: string | null
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sem data'

  return new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return 'Sem duracao'

  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60

  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function formatSegmentTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'

  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)

  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function InfoPill({
  label,
  tone = 'slate',
}: {
  label: string
  tone?: 'slate' | 'blue' | 'green' | 'amber' | 'rose' | 'cyan'
}) {
  const classNameByTone = {
    slate: 'border-white/10 bg-slate-950 text-slate-300',
    blue: 'border-blue-300/20 bg-blue-500/10 text-blue-100',
    green: 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100',
    amber: 'border-amber-300/20 bg-amber-500/10 text-amber-100',
    rose: 'border-rose-300/20 bg-rose-500/10 text-rose-100',
    cyan: 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100',
  }

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${classNameByTone[tone]}`}>
      {label}
    </span>
  )
}

function CopyButton({
  value,
  label = 'Copiar',
}: {
  value: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.error('Erro ao copiar conteudo:', error)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-black text-blue-100 active:scale-[0.98]"
    >
      {copied ? 'Copiado' : label}
    </button>
  )
}

function getStrongPhraseText(phrase: string | StrongPhrase) {
  return typeof phrase === 'string' ? phrase : phrase.text
}

function getCutDuration(cut: CutSuggestion) {
  return Math.max(0, Math.round(cut.end - cut.start))
}

function getGenerateLabel(mode: GenerationMode, idleLabel: string) {
  return generatingLabels[mode] || idleLabel
}

const generatingLabels: Record<GenerationMode, string> = {
  all: 'Gerando tudo...',
  summary: 'Gerando resumo...',
  phrases: 'Gerando frases...',
  whatsapp: 'Gerando WhatsApp...',
  instagram: 'Gerando Instagram...',
  short_ideas: 'Gerando ideias...',
  cuts: 'Gerando cortes...',
  short_script: 'Gerando roteiro...',
}

function formatShortScriptForCopy(script: ShortScript) {
  return [
    `Titulo: ${script.title}`,
    `Hook: ${script.main_hook}`,
    `Cliffhanger: ${script.cliffhanger}`,
    `Ponto espiritual: ${script.spiritual_point}`,
    `CTA: ${script.cta}`,
    '',
    'Timeline:',
    ...script.timeline.map((item) => {
      return `${item.start}-${item.end}s | ${item.purpose}\nFoco: ${item.narration_focus}\nTexto: ${item.on_screen_text}\nMotion: ${item.motion_direction}\nSom: ${item.sound_design}`
    }),
    '',
    'Legendas animadas:',
    ...script.animated_caption_lines,
    '',
    'Prompts de imagem:',
    ...script.image_prompts.map((item) => `${item.moment} (${item.use_for_seconds})\n${item.prompt}`),
    '',
    'Notas de edicao:',
    ...script.editing_notes,
  ].join('\n')
}

export default function AdminContentStudioPage() {
  const params = useParams<{ episodeId: string }>()
  const router = useRouter()
  const episodeId = params.episodeId

  const [episode, setEpisode] = useState<EpisodeStudioRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [contentAssets, setContentAssets] = useState<ContentAssets | null>(null)
  const [generatingMode, setGeneratingMode] = useState<GenerationMode | null>(null)
  const [generatingShortScriptKey, setGeneratingShortScriptKey] = useState('')
  const [contentAssetsError, setContentAssetsError] = useState('')
  const [generatingWordTimestamps, setGeneratingWordTimestamps] = useState(false)
  const [wordTimestampsError, setWordTimestampsError] = useState('')

  useEffect(() => {
    loadEpisode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeId])

  async function loadEpisode() {
    try {
      setLoading(true)
      setErrorMessage('')

      const { data, error } = await supabase
        .from('episodes')
        .select(
          [
            'id',
            'title',
            'description',
            'bible_reference',
            'audio_url',
            'audio_url_compatible',
            'audio_compatible_type',
            'duration_seconds',
            'status',
            'scheduled_publish_at',
            'published_at',
            'created_at',
            'cover_image_url',
            'transcription_text',
            'transcription_segments',
            'transcription_status',
            'transcription_error',
            'transcription_generated_at',
            'daily_quote_suggestions',
            'daily_quote_status',
            'daily_quote_generated_at',
            'transcription_words_url',
            'transcription_words_key',
            'transcription_words_count',
            'transcription_words_generated_at',
            'transcription_words_status',
            'transcription_words_error',
          ].join(', ')
        )
        .eq('id', episodeId)
        .single()

      if (error) throw error

      setEpisode((data as unknown) as EpisodeStudioRow)
      setContentAssets(null)
      setContentAssetsError('')
      setWordTimestampsError('')
    } catch (error) {
      console.error('Erro ao carregar estudio de conteudo:', error)
      setErrorMessage('Nao foi possivel carregar este episodio.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateContentAssets(mode: GenerationMode = 'all') {
    if (!episode?.transcription_text?.trim()) {
      setContentAssetsError('Este episodio precisa de transcricao para gerar conteudos.')
      return
    }

    try {
      setGeneratingMode(mode)
      setContentAssetsError('')

      const response = await fetch('/api/ai/generate-content-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId: episode.id,
          title: episode.title,
          bible_reference: episode.bible_reference,
          description: episode.description,
          transcription_text: episode.transcription_text,
          transcription_segments: episode.transcription_segments,
          daily_quote_suggestions: episode.daily_quote_suggestions,
          mode,
        }),
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Nao foi possivel gerar conteudos.')
      }

      setContentAssets((current) => {
        return {
          ...(current || EMPTY_CONTENT_ASSETS),
          ...(payload.assets as Partial<ContentAssets>),
        }
      })
    } catch (error) {
      console.error('Erro ao gerar conteudos:', error)
      setContentAssetsError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel gerar conteudos.'
      )
    } finally {
      setGeneratingMode(null)
    }
  }

  async function handleGenerateShortScript(cut: CutSuggestion, index: number) {
    if (!episode?.transcription_text?.trim()) {
      setContentAssetsError('Este episodio precisa de transcricao para gerar roteiro de Short.')
      return
    }

    const loadingKey = `${cut.start}-${cut.end}-${index}`

    try {
      setGeneratingShortScriptKey(loadingKey)
      setContentAssetsError('')

      const response = await fetch('/api/ai/generate-content-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId: episode.id,
          title: episode.title,
          bible_reference: episode.bible_reference,
          description: episode.description,
          transcription_text: episode.transcription_text,
          transcription_segments: episode.transcription_segments,
          daily_quote_suggestions: episode.daily_quote_suggestions,
          mode: 'short_script',
          selected_cut: cut,
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Nao foi possivel gerar roteiro do Short.')
      }

      setContentAssets((current) => {
        return {
          ...(current || EMPTY_CONTENT_ASSETS),
          ...(payload.assets as Partial<ContentAssets>),
        }
      })
    } catch (error) {
      console.error('Erro ao gerar roteiro do Short:', error)
      setContentAssetsError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel gerar roteiro do Short.'
      )
    } finally {
      setGeneratingShortScriptKey('')
    }
  }

  async function handleGenerateWordTimestamps() {
    if (!episode) return

    try {
      setGeneratingWordTimestamps(true)
      setWordTimestampsError('')
      setEpisode((current) => {
        return current
          ? {
              ...current,
              transcription_words_status: 'processing',
              transcription_words_error: null,
            }
          : current
      })

      const response = await fetch('/api/ai/generate-word-timestamps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId: episode.id,
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Nao foi possivel gerar timestamps avancados.')
      }

      setEpisode((current) => {
        return current
          ? {
              ...current,
              transcription_words_url: payload.wordsUrl,
              transcription_words_key: payload.wordsKey,
              transcription_words_count: payload.wordsCount,
              transcription_words_status: payload.status,
              transcription_words_generated_at: new Date().toISOString(),
              transcription_words_error: null,
            }
          : current
      })
    } catch (error) {
      console.error('Erro ao gerar timestamps avancados:', error)
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel gerar timestamps avancados.'

      setWordTimestampsError(message)
      setEpisode((current) => {
        return current
          ? {
              ...current,
              transcription_words_status: 'error',
              transcription_words_error: message,
            }
          : current
      })
    } finally {
      setGeneratingWordTimestamps(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
        <section className="mx-auto max-w-6xl rounded-[30px] border border-white/10 bg-slate-900/80 p-8 text-sm font-bold text-slate-400">
          Carregando estudio...
        </section>
      </main>
    )
  }

  if (!episode) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
        <section className="mx-auto max-w-4xl rounded-[30px] border border-rose-300/20 bg-rose-500/10 p-8 text-center">
          <h1 className="text-2xl font-black">Episodio nao encontrado</h1>
          <p className="mt-3 text-sm text-rose-100/80">{errorMessage}</p>
          <button
            type="button"
            onClick={() => router.push('/admin/central-conteudo')}
            className="mt-6 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white"
          >
            Voltar para a Central
          </button>
        </section>
      </main>
    )
  }

  const segments = episode.transcription_segments || []
  const suggestions = episode.daily_quote_suggestions || []
  const hasTranscription = Boolean(episode.transcription_text?.trim())
  const wordTimestampStatus =
    episode.transcription_words_status ||
    (episode.transcription_words_url ? 'ready' : 'missing')

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin/central-conteudo"
              className="inline-flex rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm font-black text-blue-200 active:scale-[0.98]"
            >
              Voltar para Central
            </Link>

            <p className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
              Estudio de Conteudo
            </p>

            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-none tracking-[-0.06em] sm:text-5xl">
              {episode.title}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              <InfoPill label={episode.status || 'rascunho'} tone={episode.status === 'published' ? 'green' : 'slate'} />
              <InfoPill label={episode.audio_url_compatible ? 'Audio compativel' : 'Audio incompativel'} tone={episode.audio_url_compatible ? 'green' : 'amber'} />
              <InfoPill label={hasTranscription ? 'Transcricao pronta' : 'Sem transcricao'} tone={hasTranscription ? 'green' : 'rose'} />
              {segments.length > 0 && <InfoPill label={`${segments.length} segmentos`} tone="blue" />}
              <InfoPill
                label={wordTimestampStatus === 'ready' ? 'Words prontos' : 'Sem words'}
                tone={wordTimestampStatus === 'ready' ? 'green' : wordTimestampStatus === 'error' ? 'rose' : 'slate'}
              />
              {suggestions.length > 0 && <InfoPill label={`${suggestions.length} frases fortes`} tone="amber" />}
            </div>
          </div>

          <button
            type="button"
            onClick={loadEpisode}
            className="rounded-2xl border border-blue-300/30 bg-blue-500/15 px-5 py-3 text-sm font-black text-blue-100 active:scale-[0.98]"
          >
            Atualizar
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-5">
            <section className="rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
              <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-300">
                Base do episodio
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Referencia</p>
                  <p className="mt-1 text-sm font-bold text-blue-100">{episode.bible_reference || 'Nao informada'}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Duracao</p>
                  <p className="mt-1 text-sm font-bold text-slate-100">{formatDuration(episode.duration_seconds)}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Publicado</p>
                  <p className="mt-1 text-sm font-bold text-slate-100">{formatDateTime(episode.published_at)}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Agendado</p>
                  <p className="mt-1 text-sm font-bold text-slate-100">{formatDateTime(episode.scheduled_publish_at)}</p>
                </div>
              </div>

              {episode.description && (
                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Descricao</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{episode.description}</p>
                </div>
              )}

              {episode.audio_url && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Audio</p>
                  <audio src={episode.audio_url} controls preload="metadata" className="w-full" />
                </div>
              )}
            </section>

            <section className="rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-300">
                    Transcricao
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Status: {episode.transcription_status || 'nao iniciado'}
                  </p>
                </div>

                {episode.transcription_generated_at && (
                  <span className="text-xs font-bold text-slate-500">
                    Gerada em {formatDateTime(episode.transcription_generated_at)}
                  </span>
                )}
              </div>

              {episode.transcription_error && (
                <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm font-bold text-rose-100">
                  {episode.transcription_error}
                </div>
              )}

              {episode.transcription_text ? (
                <div className="mt-4 max-h-[520px] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-7 text-slate-200">
                  {episode.transcription_text}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/70 p-5 text-sm font-bold text-slate-500">
                  Este episodio ainda nao tem transcricao salva.
                </div>
              )}
            </section>

            <section className="rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
              <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-300">
                Frases fortes existentes
              </p>

              {suggestions.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {suggestions.map((suggestion, index) => (
                    <article
                      key={`${suggestion.quote_text || 'frase'}-${index}`}
                      className="rounded-2xl border border-amber-300/15 bg-amber-500/10 p-4"
                    >
                      <p className="text-sm font-black leading-6 text-amber-50">
                        {suggestion.quote_text || 'Frase sem texto'}
                      </p>

                      {(suggestion.reason || suggestion.score) && (
                        <p className="mt-2 text-xs font-bold leading-5 text-amber-100/70">
                          {suggestion.reason || 'Sugestao gerada por IA'}
                          {suggestion.score ? ` - nota ${suggestion.score}` : ''}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/70 p-5 text-sm font-bold text-slate-500">
                  Nenhuma sugestao de Palavra do Dia foi salva neste episodio.
                </div>
              )}
            </section>
          </div>

          <aside className="grid gap-5 self-start">
            <section className="rounded-[34px] border border-cyan-300/15 bg-cyan-500/10 p-5 shadow-2xl shadow-black/20">
              <p className="text-[11px] font-black uppercase tracking-[0.20em] text-cyan-200">
                Timestamps avancados
              </p>

              <p className="mt-3 text-sm leading-6 text-cyan-50/80">
                Usado futuramente para cortes cirurgicos e legendas animadas.
              </p>

              <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <InfoPill
                    label={generatingWordTimestamps ? 'processing' : wordTimestampStatus}
                    tone={
                      generatingWordTimestamps || wordTimestampStatus === 'processing'
                        ? 'blue'
                        : wordTimestampStatus === 'ready'
                          ? 'green'
                          : wordTimestampStatus === 'error'
                            ? 'rose'
                            : 'slate'
                    }
                  />
                  {episode.transcription_words_count ? (
                    <InfoPill label={`${episode.transcription_words_count} palavras`} tone="cyan" />
                  ) : null}
                </div>

                {episode.transcription_words_generated_at && (
                  <p className="text-xs font-bold text-slate-500">
                    Gerado em {formatDateTime(episode.transcription_words_generated_at)}
                  </p>
                )}

                {episode.transcription_words_key && (
                  <p className="break-all text-xs leading-5 text-cyan-100/70">
                    {episode.transcription_words_key}
                  </p>
                )}

                {(wordTimestampsError || episode.transcription_words_error) && (
                  <p className="rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-xs font-bold leading-5 text-rose-100">
                    {wordTimestampsError || episode.transcription_words_error}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerateWordTimestamps}
                disabled={generatingWordTimestamps}
                className="mt-4 w-full rounded-2xl bg-cyan-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-cyan-950/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {generatingWordTimestamps
                  ? 'Gerando timestamps...'
                  : wordTimestampStatus === 'ready'
                    ? 'Regenerar timestamps avancados'
                    : 'Gerar timestamps avancados'}
              </button>
            </section>

            <section className="rounded-[34px] border border-blue-300/15 bg-blue-500/10 p-5 shadow-2xl shadow-black/20">
              <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-200">
                Conteudos textuais
              </p>

              <p className="mt-3 text-sm leading-6 text-blue-50/80">
                Gere resumo, textos para redes, frases e sugestoes de cortes a partir da transcricao.
              </p>

              {!hasTranscription && (
                <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm font-bold leading-6 text-amber-50">
                  Este episódio precisa de transcrição para gerar conteúdos.
                </div>
              )}

              {contentAssetsError && (
                <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm font-bold leading-6 text-rose-100">
                  {contentAssetsError}
                </div>
              )}

              <button
                type="button"
                onClick={() => handleGenerateContentAssets('all')}
                disabled={!hasTranscription || Boolean(generatingMode)}
                className="mt-5 w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-blue-950/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {generatingMode === 'all' ? generatingLabels.all : 'Gerar tudo'}
              </button>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {([
                  ['summary', 'Gerar resumo'],
                  ['phrases', 'Gerar frases'],
                  ['whatsapp', 'Gerar WhatsApp'],
                  ['instagram', 'Gerar Instagram'],
                  ['short_ideas', 'Gerar ideias'],
                  ['cuts', 'Gerar cortes'],
                ] as Array<[GenerationMode, string]>).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleGenerateContentAssets(mode)}
                    disabled={!hasTranscription || Boolean(generatingMode)}
                    className="rounded-xl border border-blue-200/15 bg-slate-950/60 px-3 py-3 text-xs font-black text-blue-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {generatingMode === mode ? getGenerateLabel(mode, label) : label}
                  </button>
                ))}
              </div>
            </section>

            {contentAssets && (
              <section className="rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
                <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-300">
                  Resultado gerado
                </p>

                <div className="mt-4 grid gap-4">
                  {contentAssets.devotional_summary && (
                  <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-black text-white">Resumo devocional</h2>
                      <CopyButton value={contentAssets.devotional_summary} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {contentAssets.devotional_summary}
                    </p>
                  </article>
                  )}

                  {contentAssets.strong_phrases.length > 0 && (
                  <article className="rounded-2xl border border-amber-300/15 bg-amber-500/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-black text-amber-50">Frases fortes</h2>
                      <CopyButton value={contentAssets.strong_phrases.map(getStrongPhraseText).join('\n')} />
                    </div>
                    <div className="mt-3 grid gap-3">
                      {contentAssets.strong_phrases.map((phrase, index) => (
                        <div key={`${getStrongPhraseText(phrase)}-${index}`} className="rounded-xl border border-amber-200/10 bg-slate-950/30 p-3">
                          <p className="text-sm font-bold leading-6 text-amber-50/90">
                            {getStrongPhraseText(phrase)}
                          </p>
                          {typeof phrase !== 'string' && (
                            <div className="mt-3 grid gap-2 text-xs leading-5 text-amber-100/70">
                              {(phrase.use_case || phrase.score) && (
                                <p className="font-black uppercase tracking-[0.12em] text-amber-100">
                                  {phrase.use_case || 'uso livre'}
                                  {phrase.score ? ` - nota ${phrase.score}` : ''}
                                </p>
                              )}
                              {phrase.source_excerpt && (
                                <p className="border-l-2 border-amber-200/30 pl-3">
                                  {phrase.source_excerpt}
                                </p>
                              )}
                              {phrase.why_it_works && <p>{phrase.why_it_works}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                  )}

                  {contentAssets.whatsapp_text && (
                  <article className="rounded-2xl border border-emerald-300/15 bg-emerald-500/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-black text-emerald-50">Texto para WhatsApp</h2>
                      <CopyButton value={contentAssets.whatsapp_text} />
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-emerald-50/85">
                      {contentAssets.whatsapp_text}
                    </p>
                  </article>
                  )}

                  {contentAssets.instagram_caption && (
                  <article className="rounded-2xl border border-purple-300/15 bg-purple-500/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-black text-purple-50">Legenda Instagram</h2>
                      <CopyButton value={contentAssets.instagram_caption} />
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-purple-50/85">
                      {contentAssets.instagram_caption}
                    </p>
                  </article>
                  )}

                  {contentAssets.hashtags.length > 0 && (
                  <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <h2 className="text-sm font-black text-white">Hashtags</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {contentAssets.hashtags.map((hashtag) => (
                        <span key={hashtag} className="rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-100">
                          {hashtag}
                        </span>
                      ))}
                    </div>
                  </article>
                  )}

                  {contentAssets.short_ideas.length > 0 && (
                  <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <h2 className="text-sm font-black text-white">Ideias de Shorts</h2>
                    <div className="mt-3 grid gap-3">
                      {contentAssets.short_ideas.map((idea, index) => (
                        <div key={`${idea.title}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Titulo</p>
                          <p className="mt-1 text-sm font-black text-blue-100">{idea.title}</p>
                          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Gancho</p>
                          <p className="mt-1 text-xs font-bold leading-5 text-slate-300">{idea.hook}</p>
                          {idea.suggested_opening_line && (
                            <>
                              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Abertura sugerida</p>
                              <p className="mt-1 rounded-lg bg-blue-500/10 p-2 text-xs font-bold leading-5 text-blue-100">
                                {idea.suggested_opening_line}
                              </p>
                            </>
                          )}
                          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Angulo</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{idea.angle}</p>
                          {idea.why_it_can_work && (
                            <>
                              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Por que pode funcionar</p>
                              <p className="mt-1 text-xs leading-5 text-slate-400">{idea.why_it_can_work}</p>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                  )}

                  {contentAssets.short_script && (
                  <article className="rounded-2xl border border-cyan-300/15 bg-cyan-500/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-black text-cyan-50">Roteiro do Short</h2>
                        <p className="mt-1 text-xs font-bold text-cyan-100/70">
                          {contentAssets.short_script.duration_seconds}s para Shorts/Reels/TikTok
                        </p>
                      </div>
                      <CopyButton value={formatShortScriptForCopy(contentAssets.short_script)} label="Copiar roteiro" />
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">Titulo</p>
                        <p className="mt-1 text-sm font-black text-white">{contentAssets.short_script.title}</p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">Hook</p>
                            <CopyButton value={contentAssets.short_script.main_hook} />
                          </div>
                          <p className="mt-2 text-xs font-bold leading-5 text-cyan-50">{contentAssets.short_script.main_hook}</p>
                        </div>
                        <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">Cliffhanger</p>
                          <p className="mt-2 text-xs font-bold leading-5 text-cyan-50">{contentAssets.short_script.cliffhanger}</p>
                        </div>
                        <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">Ponto espiritual</p>
                          <p className="mt-2 text-xs leading-5 text-cyan-50/85">{contentAssets.short_script.spiritual_point}</p>
                        </div>
                        <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">CTA</p>
                          <p className="mt-2 text-xs leading-5 text-cyan-50/85">{contentAssets.short_script.cta}</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                        <h3 className="text-xs font-black text-cyan-50">Timeline</h3>
                        <div className="mt-3 grid gap-2">
                          {contentAssets.short_script.timeline.map((item, index) => (
                            <div key={`${item.start}-${item.end}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                              <p className="text-[11px] font-black text-cyan-200">{item.start}s - {item.end}s | {item.purpose}</p>
                              <p className="mt-2 text-xs leading-5 text-cyan-50/85">{item.narration_focus}</p>
                              <p className="mt-2 rounded-lg bg-cyan-500/10 p-2 text-xs font-black text-cyan-50">{item.on_screen_text}</p>
                              <p className="mt-2 text-xs leading-5 text-slate-400">Motion: {item.motion_direction}</p>
                              <p className="text-xs leading-5 text-slate-400">Som: {item.sound_design}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-black text-cyan-50">Legendas animadas</h3>
                          <CopyButton value={contentAssets.short_script.animated_caption_lines.join('\n')} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {contentAssets.short_script.animated_caption_lines.map((line, index) => (
                            <span key={`${line}-${index}`} className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-2 py-1 text-[11px] font-bold text-cyan-100">
                              {line}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-black text-cyan-50">Prompts de imagem</h3>
                          <CopyButton value={contentAssets.short_script.image_prompts.map((item) => `${item.moment} (${item.use_for_seconds})\n${item.prompt}`).join('\n\n')} />
                        </div>
                        <div className="mt-3 grid gap-2">
                          {contentAssets.short_script.image_prompts.map((item, index) => (
                            <div key={`${item.moment}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                              <p className="text-[11px] font-black text-cyan-200">{item.moment} | {item.use_for_seconds}</p>
                              <p className="mt-2 text-xs leading-5 text-slate-300">{item.prompt}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                          <h3 className="text-xs font-black text-cyan-50">Notas de edicao</h3>
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-cyan-50/80">
                            {contentAssets.short_script.editing_notes.map((note, index) => (
                              <li key={`${note}-${index}`}>{note}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3">
                          <h3 className="text-xs font-black text-cyan-50">Checklist de qualidade</h3>
                          <div className="mt-2 grid gap-1 text-xs font-bold text-cyan-50/80">
                            {Object.entries(contentAssets.short_script.quality_check).map(([key, value]) => (
                              <p key={key}>{value ? 'OK' : 'Revisar'} - {key.replace(/_/g, ' ')}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                  )}

                  {(contentAssets.cut_suggestions.length > 0 || contentAssets.cut_suggestions_note) && (
                  <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <h2 className="text-sm font-black text-white">Sugestões de cortes editoriais</h2>
                    {contentAssets.cut_suggestions.length === 0 && contentAssets.cut_suggestions_note && (
                      <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-xs font-bold leading-5 text-amber-50">
                        {contentAssets.cut_suggestions_note}
                      </p>
                    )}
                    {contentAssets.cut_suggestions.length > 0 ? (
                      <div className="mt-3 grid gap-3">
                        {contentAssets.cut_suggestions.map((cut, index) => (
                          <div key={`${cut.title}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black text-blue-200">
                                {formatSegmentTime(cut.start)} - {formatSegmentTime(cut.end)}
                              </span>
                              <span className="rounded-full border border-white/10 bg-slate-950 px-2 py-1 text-[11px] font-black text-slate-300">
                                {formatDuration(getCutDuration(cut))}
                              </span>
                              {getCutDuration(cut) < 20 && (
                                <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2 py-1 text-[11px] font-black text-amber-100">
                                  Trecho curto / usar como gancho
                                </span>
                              )}
                            </div>
                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Titulo</p>
                            <p className="mt-1 text-sm font-black text-white">{cut.title}</p>
                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Gancho</p>
                            <p className="mt-1 text-xs font-bold leading-5 text-slate-300">{cut.hook}</p>
                            {cut.source_excerpt && (
                              <>
                                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Trecho-base</p>
                                <p className="mt-1 border-l-2 border-blue-300/30 pl-3 text-xs leading-5 text-slate-400">
                                  {cut.source_excerpt}
                                </p>
                              </>
                            )}
                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Motivo</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{cut.reason}</p>
                            {(cut.strength_score || cut.strength_reason) && (
                              <div className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-500/10 p-3">
                                {cut.strength_score && (
                                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
                                    Nota editorial {cut.strength_score}/10
                                  </p>
                                )}
                                {cut.strength_reason && (
                                  <p className="mt-2 text-xs leading-5 text-emerald-50/80">
                                    {cut.strength_reason}
                                  </p>
                                )}
                              </div>
                            )}
                            {cut.suggested_caption_lines && cut.suggested_caption_lines.length > 0 && (
                              <>
                                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Linhas de legenda</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {cut.suggested_caption_lines.map((line, lineIndex) => (
                                    <span key={`${line}-${lineIndex}`} className="rounded-full border border-blue-300/20 bg-blue-500/10 px-2 py-1 text-[11px] font-bold text-blue-100">
                                      {line}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => handleGenerateShortScript(cut, index)}
                              disabled={Boolean(generatingShortScriptKey)}
                              className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {generatingShortScriptKey === `${cut.start}-${cut.end}-${index}`
                                ? 'Gerando roteiro...'
                                : 'Gerar roteiro do Short'}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
                        Nenhum corte com timestamp foi sugerido.
                      </p>
                    )}
                  </article>
                  )}
                </div>
              </section>
            )}

            <section className="rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
              <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-300">
                Transcricao com timestamps
              </p>

              {segments.length > 0 ? (
                <div className="mt-4 grid max-h-[360px] gap-2 overflow-y-auto">
                  {segments.slice(0, 12).map((segment, index) => (
                    <div
                      key={`${segment.start}-${segment.end}-${index}`}
                      className="rounded-2xl border border-white/10 bg-slate-950/70 p-3"
                    >
                      <p className="text-xs font-black text-blue-200">
                        {formatSegmentTime(segment.start)} - {formatSegmentTime(segment.end)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                        {segment.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/70 p-4 text-sm font-bold text-slate-500">
                  Sem segmentos sincronizados. Esta area mostra dados tecnicos da transcricao quando houver timestamps.
                </p>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}
