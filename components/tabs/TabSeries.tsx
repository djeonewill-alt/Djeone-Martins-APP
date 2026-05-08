'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Series } from '@/lib/supabase'

type Episode = {
  id: string
  series_id: string | null
  title: string
  description: string | null
  bible_reference: string | null
  audio_url: string
  duration_seconds: number | null
  episode_number: number | null
  published_at: string | null
  created_at: string | null
  cover_image_url: string | null
  status: string | null
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return ''

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function formatDate(date?: string | null) {
  if (!date) return ''

  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function SeriesBadge({
  children,
  tone = 'blue',
}: {
  children: React.ReactNode
  tone?: 'blue' | 'gold' | 'green'
}) {
  const className =
    tone === 'gold'
      ? 'border-yellow-300/20 bg-yellow-500/15 text-yellow-100'
      : tone === 'green'
        ? 'border-emerald-300/20 bg-emerald-500/15 text-emerald-100'
        : 'border-blue-300/20 bg-blue-500/15 text-blue-100'

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${className}`}>
      {children}
    </span>
  )
}

function SeriesCover({
  serie,
  className = '',
  iconSize = 'text-6xl',
}: {
  serie: Series
  className?: string
  iconSize?: string
}) {
  const imageUrl = serie.cover_image_url || ''

  return (
    <div className={`relative overflow-hidden bg-slate-900 ${className}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={serie.title}
          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-active:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-yellow-950/40" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/36 to-black/8" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.22),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.12),transparent_38%)]" />

      {!imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${iconSize} drop-shadow-[0_12px_30px_rgba(0,0,0,0.55)]`}>
            {serie.icon_emoji || '📖'}
          </span>
        </div>
      )}
    </div>
  )
}

function FeaturedHero({
  serie,
  onOpen,
}: {
  serie: Series
  onOpen: (serie: Series) => void
}) {
  return (
    <section className="group relative mb-7 overflow-hidden rounded-[36px] border border-white/10 bg-slate-900 shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
      <SeriesCover
        serie={serie}
        className="h-[360px] rounded-[36px]"
        iconSize="text-8xl"
      />

      <div className="absolute inset-x-0 bottom-0 p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {serie.is_current && <SeriesBadge tone="green">Atual</SeriesBadge>}
          {!serie.is_free && <SeriesBadge tone="gold">Premium</SeriesBadge>}
          <SeriesBadge>{serie.total_episodes || 0} episódios</SeriesBadge>
        </div>

        <h2 className="max-w-[94%] text-5xl font-black leading-[0.9] tracking-[-0.085em] text-white drop-shadow-[0_6px_22px_rgba(0,0,0,0.88)]">
          {serie.title}
        </h2>

        {serie.description && (
          <p className="mt-4 max-w-[92%] text-sm leading-relaxed text-slate-300 line-clamp-3">
            {serie.description}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => onOpen(serie)}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-[0_14px_38px_rgba(255,255,255,0.18)] active:scale-[0.98]"
          >
            Abrir série
          </button>

          <button
            type="button"
            onClick={() => onOpen(serie)}
            className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur-md active:scale-[0.98]"
          >
            Ver episódios
          </button>
        </div>
      </div>
    </section>
  )
}

function WideSeriesCard({
  serie,
  onOpen,
}: {
  serie: Series
  onOpen: (serie: Series) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(serie)}
      className="group w-[76vw] max-w-[330px] shrink-0 text-left sm:w-[300px]"
    >
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
        <SeriesCover
          serie={serie}
          className="h-[185px] rounded-[28px]"
          iconSize="text-6xl"
        />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {serie.is_current && <SeriesBadge tone="green">Atual</SeriesBadge>}
          {!serie.is_free && <SeriesBadge tone="gold">Premium</SeriesBadge>}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="line-clamp-2 text-2xl font-black leading-[0.95] tracking-[-0.06em] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.86)]">
            {serie.title}
          </h3>

          <p className="mt-2 text-xs font-bold text-slate-300">
            {serie.total_episodes || 0} episódios
          </p>
        </div>
      </div>
    </button>
  )
}

function CompactSeriesCard({
  serie,
  onOpen,
}: {
  serie: Series
  onOpen: (serie: Series) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(serie)}
      className="group w-[155px] shrink-0 text-left sm:w-[180px]"
    >
      <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-900 shadow-[0_14px_38px_rgba(0,0,0,0.28)]">
        <SeriesCover
          serie={serie}
          className="h-[112px] rounded-[24px]"
          iconSize="text-4xl"
        />
      </div>

      <h3 className="mt-3 line-clamp-2 text-sm font-black leading-tight tracking-[-0.035em] text-white">
        {serie.title}
      </h3>

      <p className="mt-1 text-[11px] font-bold text-slate-500">
        {serie.total_episodes || 0} episódios
      </p>
    </button>
  )
}

function SeriesShelf({
  title,
  subtitle,
  items,
  variant = 'wide',
  onOpen,
}: {
  title: string
  subtitle?: string
  items: Series[]
  variant?: 'wide' | 'compact'
  onOpen: (serie: Series) => void
}) {
  if (items.length === 0) return null

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          {subtitle && (
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
              {subtitle}
            </p>
          )}

          <h2 className="mt-1 text-2xl font-black tracking-[-0.06em] text-white">
            {title}
          </h2>
        </div>

        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black text-slate-400">
          {items.length}
        </span>
      </div>

      <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((serie) =>
          variant === 'wide' ? (
            <WideSeriesCard key={serie.id} serie={serie} onOpen={onOpen} />
          ) : (
            <CompactSeriesCard key={serie.id} serie={serie} onOpen={onOpen} />
          )
        )}
      </div>
    </section>
  )
}

function EpisodeCard({
  episode,
  fallbackCover,
}: {
  episode: Episode
  fallbackCover?: string | null
}) {
  const imageUrl = episode.cover_image_url || fallbackCover || ''

  return (
    <article className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/80 shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
      <div className="relative h-[170px] bg-slate-950">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={episode.title}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-yellow-950/30" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/34 to-black/5" />

        <div className="absolute bottom-4 left-4 right-4">
          <div className="mb-2 flex flex-wrap gap-2">
            {episode.episode_number && (
              <SeriesBadge>Ep. {episode.episode_number}</SeriesBadge>
            )}

            {episode.bible_reference && (
              <SeriesBadge tone="green">{episode.bible_reference}</SeriesBadge>
            )}
          </div>

          <h3 className="line-clamp-2 text-2xl font-black leading-[0.95] tracking-[-0.06em] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.86)]">
            {episode.title}
          </h3>
        </div>
      </div>

      <div className="p-4">
        {episode.description && (
          <p className="line-clamp-3 text-sm font-semibold leading-6 text-slate-300">
            {episode.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
          {episode.published_at && <span>{formatDate(episode.published_at)}</span>}
          {episode.duration_seconds && <span>• {formatDuration(episode.duration_seconds)}</span>}
        </div>

        <audio
          controls
          preload="none"
          src={episode.audio_url}
          className="mt-4 w-full"
        >
          Seu navegador não suporta áudio.
        </audio>
      </div>
    </article>
  )
}

function SeriesDetail({
  serie,
  episodes,
  loading,
  onBack,
}: {
  serie: Series
  episodes: Episode[]
  loading: boolean
  onBack: () => void
}) {
  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-4 text-white">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-black text-slate-100 active:scale-[0.98]"
        >
          ← Voltar para séries
        </button>

        <section className="group relative mb-6 overflow-hidden rounded-[36px] border border-white/10 bg-slate-900 shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
          <SeriesCover
            serie={serie}
            className="h-[330px] rounded-[36px]"
            iconSize="text-8xl"
          />

          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="mb-3 flex flex-wrap gap-2">
              {serie.is_current && <SeriesBadge tone="green">Atual</SeriesBadge>}
              {!serie.is_free && <SeriesBadge tone="gold">Premium</SeriesBadge>}
              <SeriesBadge>{episodes.length || serie.total_episodes || 0} episódios</SeriesBadge>
            </div>

            <h1 className="max-w-[94%] text-5xl font-black leading-[0.9] tracking-[-0.085em] text-white drop-shadow-[0_6px_22px_rgba(0,0,0,0.88)]">
              {serie.title}
            </h1>

            {serie.description && (
              <p className="mt-4 max-w-[92%] text-sm leading-relaxed text-slate-300 line-clamp-4">
                {serie.description}
              </p>
            )}
          </div>
        </section>

        <div className="mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Episódios
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.065em]">
            Ouça esta série
          </h2>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 text-sm font-bold text-slate-400">
            Carregando episódios...
          </div>
        ) : episodes.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 text-sm leading-6 text-slate-400">
            Esta série ainda não possui episódios publicados.
          </div>
        ) : (
          <div className="space-y-4">
            {episodes.map((episode) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                fallbackCover={serie.cover_image_url}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SeriesSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-4 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 h-20 animate-pulse rounded-[28px] bg-white/10" />
        <div className="mb-7 h-[360px] animate-pulse rounded-[36px] bg-white/10" />
        <div className="mb-8 flex gap-4 overflow-hidden">
          <div className="h-[185px] w-[300px] shrink-0 animate-pulse rounded-[28px] bg-white/10" />
          <div className="h-[185px] w-[300px] shrink-0 animate-pulse rounded-[28px] bg-white/10" />
        </div>
      </div>
    </div>
  )
}

export default function TabSeries() {
  const [series, setSeries] = useState<Series[]>([])
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)

  useEffect(() => {
    loadSeries()
  }, [])

  async function loadSeries() {
    try {
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error

      setSeries(data || [])
    } catch (error) {
      console.error('Erro ao carregar séries:', error)
    } finally {
      setLoading(false)
    }
  }

  async function openSeries(serie: Series) {
    setSelectedSeries(serie)
    setEpisodes([])
    setLoadingEpisodes(true)

    try {
      const { data, error } = await supabase
        .from('episodes')
        .select(
          'id, series_id, title, description, bible_reference, audio_url, duration_seconds, episode_number, published_at, created_at, cover_image_url, status'
        )
        .eq('series_id', serie.id)
        .eq('status', 'published')
        .order('episode_number', { ascending: true, nullsFirst: false })
        .order('published_at', { ascending: false })

      if (error) throw error

      setEpisodes((data || []) as Episode[])
    } catch (error) {
      console.error('Erro ao carregar episódios da série:', error)
    } finally {
      setLoadingEpisodes(false)
    }
  }

  function closeSeries() {
    setSelectedSeries(null)
    setEpisodes([])
  }

  const featuredSeries = useMemo(() => {
    return series.find((serie) => serie.is_current) || series[0] || null
  }, [series])

  const currentSeries = series.filter((serie) => serie.is_current)
  const freeSeries = series.filter((serie) => serie.is_free)
  const premiumSeries = series.filter((serie) => !serie.is_free)

  if (loading) {
    return <SeriesSkeleton />
  }

  if (selectedSeries) {
    return (
      <SeriesDetail
        serie={selectedSeries}
        episodes={episodes}
        loading={loadingEpisodes}
        onBack={closeSeries}
      />
    )
  }

  if (series.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-4 text-white">
        <div className="mx-auto max-w-2xl">
          <section className="rounded-[34px] border border-white/10 bg-slate-900/80 p-8 text-center shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
            <p className="text-6xl">📚</p>

            <h2 className="mt-5 text-2xl font-black tracking-[-0.05em]">
              Nenhuma série ainda
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Em breve teremos séries de devocionais para você.
            </p>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-4 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Séries
          </p>

          <h1 className="mt-2 text-4xl font-black leading-[0.95] tracking-[-0.075em]">
            Catálogo devocional
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Jornadas bíblicas, séries antigas e conteúdos para crescer na fé.
          </p>
        </div>

        {featuredSeries && (
          <FeaturedHero serie={featuredSeries} onOpen={openSeries} />
        )}

        <SeriesShelf
          title="Principais escolhas para você"
          subtitle="Em destaque"
          items={currentSeries.length > 0 ? currentSeries : featuredSeries ? [featuredSeries] : []}
          variant="wide"
          onOpen={openSeries}
        />

        <SeriesShelf
          title="Séries gratuitas"
          subtitle="Disponíveis"
          items={freeSeries}
          variant="wide"
          onOpen={openSeries}
        />

        <SeriesShelf
          title="Catálogo completo"
          subtitle="Todas as séries"
          items={series}
          variant="compact"
          onOpen={openSeries}
        />

        <SeriesShelf
          title="Premium"
          subtitle="Em breve"
          items={premiumSeries}
          variant="compact"
          onOpen={openSeries}
        />
      </div>
    </div>
  )
}
