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
  tone?: 'slate' | 'blue' | 'green' | 'amber' | 'rose'
}) {
  const classNameByTone = {
    slate: 'border-white/10 bg-slate-950 text-slate-300',
    blue: 'border-blue-300/20 bg-blue-500/10 text-blue-100',
    green: 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100',
    amber: 'border-amber-300/20 bg-amber-500/10 text-amber-100',
    rose: 'border-rose-300/20 bg-rose-500/10 text-rose-100',
  }

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${classNameByTone[tone]}`}>
      {label}
    </span>
  )
}

function FutureButton({ children }: { children: string }) {
  return (
    <button
      type="button"
      disabled
      className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-black text-slate-500 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}

export default function AdminContentStudioPage() {
  const params = useParams<{ episodeId: string }>()
  const router = useRouter()
  const episodeId = params.episodeId

  const [episode, setEpisode] = useState<EpisodeStudioRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

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
          ].join(', ')
        )
        .eq('id', episodeId)
        .single()

      if (error) throw error

      setEpisode((data as unknown) as EpisodeStudioRow)
    } catch (error) {
      console.error('Erro ao carregar estudio de conteudo:', error)
      setErrorMessage('Nao foi possivel carregar este episodio.')
    } finally {
      setLoading(false)
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
            <section className="rounded-[34px] border border-blue-300/15 bg-blue-500/10 p-5 shadow-2xl shadow-black/20">
              <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-200">
                Proximos conteudos
              </p>

              <p className="mt-3 text-sm leading-6 text-blue-50/80">
                Em breve: estes conteudos serao gerados a partir da transcricao.
              </p>

              <div className="mt-5 grid gap-3">
                <FutureButton>Gerar resumo</FutureButton>
                <FutureButton>Gerar texto para WhatsApp</FutureButton>
                <FutureButton>Gerar legenda Instagram</FutureButton>
                <FutureButton>Gerar roteiro de short</FutureButton>
                <FutureButton>Gerar sugestoes de cortes</FutureButton>
              </div>
            </section>

            <section className="rounded-[34px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
              <p className="text-[11px] font-black uppercase tracking-[0.20em] text-blue-300">
                Shorts/Reels/TikToks
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
                  Sem segmentos sincronizados. Quando existirem, esta area ajudara a sugerir cortes.
                </p>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}
