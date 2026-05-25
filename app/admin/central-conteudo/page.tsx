'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'

const NO_SERIES_ID = '__no_series__'

type SeriesContentRow = {
  id: string
  title: string
  description: string | null
  cover_image_url: string | null
  book_name: string | null
  bible_book: string | null
  icon_emoji: string | null
  is_free: boolean | null
  is_current: boolean | null
  total_episodes: number | null
  order_index: number | null
  created_at: string | null
}

type EpisodeContentRow = {
  id: string
  series_id: string | null
  title: string
  description: string | null
  bible_reference: string | null
  audio_url: string | null
  audio_url_compatible: string | null
  duration_seconds: number | null
  status: string | null
  scheduled_publish_at: string | null
  published_at: string | null
  created_at: string | null
  transcription_text: string | null
  transcription_segments: unknown[] | null
  transcription_status: string | null
  transcription_error: string | null
  transcription_generated_at: string | null
  daily_quote_suggestions: unknown[] | null
  daily_quote_status: string | null
  daily_quote_generated_at: string | null
}

type SeriesMetric = {
  total: number
  withTranscription: number
  ready: number
  withSuggestions: number
  incompatibleAudio: number
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem data'

  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return 'Sem duração'

  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60

  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function getEpisodeDate(episode: EpisodeContentRow) {
  if (episode.published_at) {
    return `Publicado em ${formatDate(episode.published_at)}`
  }

  if (episode.scheduled_publish_at) {
    return `Agendado para ${formatDate(episode.scheduled_publish_at)}`
  }

  return `Criado em ${formatDate(episode.created_at)}`
}

function getReadiness(episode: EpisodeContentRow) {
  if (!episode.transcription_text?.trim()) {
    return 'Sem transcrição'
  }

  if (!episode.audio_url_compatible) {
    return 'Áudio incompatível'
  }

  return 'Pronto para gerar conteúdo'
}

function getSeriesMetrics(episodes: EpisodeContentRow[]): SeriesMetric {
  return {
    total: episodes.length,
    withTranscription: episodes.filter((episode) => episode.transcription_text?.trim()).length,
    ready: episodes.filter(
      (episode) => episode.transcription_text?.trim() && episode.audio_url_compatible
    ).length,
    withSuggestions: episodes.filter(
      (episode) => (episode.daily_quote_suggestions || []).length > 0
    ).length,
    incompatibleAudio: episodes.filter((episode) => !episode.audio_url_compatible).length,
  }
}

function StatusPill({
  children,
  tone = 'slate',
}: {
  children: ReactNode
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
      {children}
    </span>
  )
}

function MetricTile({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: number
  tone?: 'slate' | 'blue' | 'green' | 'amber' | 'rose'
}) {
  const classNameByTone = {
    slate: 'border-white/10 bg-slate-900/80 text-slate-300',
    blue: 'border-blue-300/15 bg-blue-500/10 text-blue-100',
    green: 'border-emerald-300/15 bg-emerald-500/10 text-emerald-100',
    amber: 'border-amber-300/15 bg-amber-500/10 text-amber-100',
    rose: 'border-rose-300/15 bg-rose-500/10 text-rose-100',
  }

  return (
    <div className={`rounded-[26px] border p-5 ${classNameByTone[tone]}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em] opacity-80">{label}</p>
      <strong className="mt-2 block text-3xl font-black">{value}</strong>
    </div>
  )
}

export default function AdminContentCenterPage() {
  const [series, setSeries] = useState<SeriesContentRow[]>([])
  const [episodes, setEpisodes] = useState<EpisodeContentRow[]>([])
  const [seriesSearch, setSeriesSearch] = useState('')
  const [view, setView] = useState<'series' | 'episodes'>('series')
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const [selectedSeriesTitle, setSelectedSeriesTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    loadContentCenter()
  }, [])

  async function loadContentCenter() {
    try {
      setLoading(true)
      setErrorMessage('')

      const [seriesResult, episodesResult] = await Promise.all([
        supabase
          .from('series')
          .select(
            [
              'id',
              'title',
              'description',
              'cover_image_url',
              'book_name',
              'bible_book',
              'icon_emoji',
              'is_free',
              'is_current',
              'total_episodes',
              'order_index',
              'created_at',
            ].join(', ')
          )
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase
          .from('episodes')
          .select(
            [
              'id',
              'series_id',
              'title',
              'description',
              'bible_reference',
              'audio_url',
              'audio_url_compatible',
              'duration_seconds',
              'status',
              'scheduled_publish_at',
              'published_at',
              'created_at',
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
          .order('published_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(200),
      ])

      if (seriesResult.error) throw seriesResult.error
      if (episodesResult.error) throw episodesResult.error

      setSeries(((seriesResult.data || []) as unknown) as SeriesContentRow[])
      setEpisodes(((episodesResult.data || []) as unknown) as EpisodeContentRow[])
    } catch (error) {
      console.error('Erro ao carregar Central de Conteúdo:', error)
      setErrorMessage('Não foi possível carregar a Central de Conteúdo agora.')
    } finally {
      setLoading(false)
    }
  }

  function openSeries(serie: SeriesContentRow | null) {
    setSelectedSeriesId(serie?.id || NO_SERIES_ID)
    setSelectedSeriesTitle(serie?.title || 'Sem série')
    setView('episodes')
  }

  function backToSeries() {
    setView('series')
    setSelectedSeriesId(null)
    setSelectedSeriesTitle('')
  }

  const summary = useMemo(() => getSeriesMetrics(episodes), [episodes])

  const episodesBySeriesId = useMemo(() => {
    const grouped = new Map<string, EpisodeContentRow[]>()

    for (const episode of episodes) {
      const key = episode.series_id || NO_SERIES_ID
      grouped.set(key, [...(grouped.get(key) || []), episode])
    }

    return grouped
  }, [episodes])

  const filteredSeries = useMemo(() => {
    const term = seriesSearch.trim().toLowerCase()

    if (!term) return series

    return series.filter((serie) => {
      const title = serie.title.toLowerCase()
      const description = serie.description?.toLowerCase() || ''
      const book = serie.book_name?.toLowerCase() || ''
      const bibleBook = serie.bible_book?.toLowerCase() || ''

      return (
        title.includes(term) ||
        description.includes(term) ||
        book.includes(term) ||
        bibleBook.includes(term)
      )
    })
  }, [series, seriesSearch])

  const noSeriesEpisodes = episodesBySeriesId.get(NO_SERIES_ID) || []
  const selectedEpisodes = selectedSeriesId
    ? episodesBySeriesId.get(selectedSeriesId) || []
    : []

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm font-black text-blue-200 active:scale-[0.98]"
            >
              Voltar ao Admin
            </Link>

            <p className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
              Central de Conteúdo
            </p>

            <h1 className="mt-2 text-3xl font-black leading-none tracking-[-0.06em] sm:text-5xl">
              {view === 'series' ? 'Séries para transformar em conteúdo' : selectedSeriesTitle}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
              {view === 'series'
                ? 'Escolha uma série para revisar episódios, transcrições, frases existentes e preparar futuros assets para redes sociais.'
                : 'Revise os episódios desta série e abra o estúdio para preparar conteúdos derivados.'}
            </p>
          </div>

          <button
            type="button"
            onClick={loadContentCenter}
            disabled={loading}
            className="rounded-2xl border border-blue-300/30 bg-blue-500/15 px-5 py-3 text-sm font-black text-blue-100 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-5">
          <MetricTile label="Episódios" value={summary.total} />
          <MetricTile label="Transcritos" value={summary.withTranscription} tone="green" />
          <MetricTile label="Prontos" value={summary.ready} tone="blue" />
          <MetricTile label="Com frases" value={summary.withSuggestions} tone="amber" />
          <MetricTile label="Áudio incompatível" value={summary.incompatibleAudio} tone="rose" />
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="rounded-[30px] border border-white/10 bg-slate-900/70 p-8 text-sm font-bold text-slate-400">
            Carregando Central de Conteúdo...
          </div>
        ) : view === 'series' ? (
          <>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="search"
                value={seriesSearch}
                onChange={(event) => setSeriesSearch(event.target.value)}
                placeholder="Buscar série..."
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-blue-300/60 sm:max-w-md"
              />

              <p className="text-xs font-bold text-slate-500">
                {filteredSeries.length + (noSeriesEpisodes.length > 0 ? 1 : 0)} grupos encontrados
              </p>
            </div>

            {filteredSeries.length === 0 && noSeriesEpisodes.length === 0 ? (
              <div className="rounded-[30px] border border-white/10 bg-slate-900/70 p-8 text-center">
                <h2 className="text-2xl font-black tracking-[-0.05em]">Nenhuma série encontrada</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Tente buscar por outro nome, descrição ou livro bíblico.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredSeries.map((serie) => {
                  const serieEpisodes = episodesBySeriesId.get(serie.id) || []
                  const metrics = getSeriesMetrics(serieEpisodes)
                  const book = serie.bible_book || serie.book_name || 'Sem livro'

                  return (
                    <SeriesCard
                      key={serie.id}
                      title={serie.title}
                      description={serie.description || book}
                      imageUrl={serie.cover_image_url}
                      icon={serie.icon_emoji}
                      isCurrent={serie.is_current}
                      isFree={serie.is_free}
                      createdAt={serie.created_at}
                      metrics={metrics}
                      onOpen={() => openSeries(serie)}
                    />
                  )
                })}

                {noSeriesEpisodes.length > 0 && (
                  <SeriesCard
                    title="Sem série"
                    description="Episódios que ainda não estão vinculados a uma série."
                    imageUrl={null}
                    icon="CC"
                    isCurrent={false}
                    isFree={true}
                    createdAt={null}
                    metrics={getSeriesMetrics(noSeriesEpisodes)}
                    onOpen={() => openSeries(null)}
                  />
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={backToSeries}
                className="rounded-2xl border border-white/10 bg-slate-900 px-5 py-3 text-sm font-black text-slate-100 active:scale-[0.98]"
              >
                Voltar para séries
              </button>

              <p className="text-sm font-bold text-slate-400">
                {selectedEpisodes.length} episódios em {selectedSeriesTitle}
              </p>
            </div>

            {selectedEpisodes.length === 0 ? (
              <div className="rounded-[30px] border border-white/10 bg-slate-900/70 p-8 text-center">
                <h2 className="text-2xl font-black tracking-[-0.05em]">Nenhum episódio nesta série</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Quando houver episódios vinculados, eles aparecerão aqui.
                </p>
              </div>
            ) : (
              <EpisodeList episodes={selectedEpisodes} />
            )}
          </>
        )}
      </section>
    </main>
  )
}

function SeriesCard({
  title,
  description,
  imageUrl,
  icon,
  isCurrent,
  isFree,
  createdAt,
  metrics,
  onOpen,
}: {
  title: string
  description: string | null
  imageUrl: string | null
  icon: string | null
  isCurrent: boolean | null
  isFree: boolean | null
  createdAt: string | null
  metrics: SeriesMetric
  onOpen: () => void
}) {
  return (
    <article className="rounded-[30px] border border-slate-700 bg-slate-900 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
      <div className="grid gap-5 lg:grid-cols-[180px_1fr_180px] lg:items-center">
        <div className="relative h-[118px] overflow-hidden rounded-[24px] border border-white/10 bg-slate-950">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-950 via-slate-950 to-amber-950/30 text-3xl font-black text-blue-100">
              {icon || 'CC'}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {isCurrent && <StatusPill tone="green">Destaque atual</StatusPill>}
            <StatusPill tone={isFree === false ? 'amber' : 'blue'}>
              {isFree === false ? 'Premium' : 'Gratuita'}
            </StatusPill>
            <StatusPill>{metrics.total} episódios</StatusPill>
            <StatusPill tone="green">{metrics.withTranscription} transcritos</StatusPill>
            <StatusPill tone="amber">{metrics.withSuggestions} com frases</StatusPill>
            <StatusPill tone="blue">{metrics.ready} prontos</StatusPill>
            {metrics.incompatibleAudio > 0 && (
              <StatusPill tone="rose">{metrics.incompatibleAudio} áudio incompatível</StatusPill>
            )}
          </div>

          <h2 className="mt-4 text-2xl font-black leading-tight tracking-[-0.05em] text-white">
            {title}
          </h2>

          {description && (
            <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-slate-400">
              {description}
            </p>
          )}

          <p className="mt-3 text-xs font-bold text-slate-600">
            Criada em {formatDate(createdAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-300/30 bg-blue-500/18 px-4 py-3 text-center text-xs font-black text-blue-100 shadow-lg shadow-blue-950/20 transition hover:border-blue-300/60 hover:bg-blue-500/28 active:scale-[0.98]"
        >
          Abrir série
        </button>
      </div>
    </article>
  )
}

function EpisodeList({ episodes }: { episodes: EpisodeContentRow[] }) {
  return (
    <div className="grid gap-3">
      {episodes.map((episode) => {
        const hasTranscription = Boolean(episode.transcription_text?.trim())
        const segmentCount = (episode.transcription_segments || []).length
        const suggestionCount = (episode.daily_quote_suggestions || []).length
        const readiness = getReadiness(episode)

        return (
          <article
            key={episode.id}
            className="rounded-[30px] border border-slate-700 bg-slate-900 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_180px] lg:items-center">
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={episode.status === 'published' ? 'green' : 'slate'}>
                    {episode.status || 'rascunho'}
                  </StatusPill>

                  <StatusPill tone={episode.audio_url_compatible ? 'green' : 'amber'}>
                    {episode.audio_url_compatible ? 'Áudio compatível' : 'Áudio incompatível'}
                  </StatusPill>

                  <StatusPill tone={hasTranscription ? 'green' : 'rose'}>
                    {hasTranscription ? 'Transcrição pronta' : 'Sem transcrição'}
                  </StatusPill>

                  {segmentCount > 0 && <StatusPill tone="blue">Com segmentos</StatusPill>}

                  {suggestionCount > 0 && <StatusPill tone="amber">Com frases fortes</StatusPill>}
                </div>

                <h2 className="mt-3 text-xl font-black leading-tight tracking-[-0.04em]">
                  {episode.title}
                </h2>

                {episode.bible_reference && (
                  <p className="mt-1 text-sm font-bold text-blue-200">
                    {episode.bible_reference}
                  </p>
                )}

                {episode.description && (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                    {episode.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                  <span>{getEpisodeDate(episode)}</span>
                  <span>{formatDuration(episode.duration_seconds)}</span>
                  <span>{readiness}</span>
                </div>
              </div>

              <Link
                href={`/admin/central-conteudo/${episode.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-300/30 bg-blue-500/18 px-4 py-3 text-center text-xs font-black text-blue-100 shadow-lg shadow-blue-950/20 transition hover:border-blue-300/60 hover:bg-blue-500/28 active:scale-[0.98]"
              >
                Abrir estúdio
              </Link>
            </div>
          </article>
        )
      })}
    </div>
  )
}
