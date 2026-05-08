'use client'

import { useEffect, useMemo, useState } from 'react'
import EpisodeAudioPlayer from '@/components/audio/EpisodeAudioPlayer'
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
  is_preview: boolean | null
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
  tone?: 'blue' | 'gold' | 'green' | 'dark'
}) {
  const className =
    tone === 'gold'
      ? 'border-amber-300/25 bg-amber-500/20 text-amber-100'
      : tone === 'green'
        ? 'border-emerald-300/20 bg-emerald-500/15 text-emerald-100'
        : tone === 'dark'
          ? 'border-white/10 bg-black/45 text-white'
          : 'border-blue-300/20 bg-blue-500/15 text-blue-100'

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] backdrop-blur-md ${className}`}
    >
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

      <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-black/5 to-black/5" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.14),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.08),transparent_38%)]" />

      {!imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${iconSize} drop-shadow-[0_12px_30px_rgba(0,0,0,0.55)]`}>
            {serie.icon_emoji || '🎧'}
          </span>
        </div>
      )}
    </div>
  )
}

function PremiumLockedModal({
  serie,
  episode,
  onClose,
}: {
  serie: Series
  episode?: Episode | null
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 px-4 pb-4 pt-20 backdrop-blur-sm sm:items-center sm:pb-0">
      <div className="w-full max-w-md overflow-hidden rounded-[34px] border border-amber-300/25 bg-slate-950 shadow-[0_28px_90px_rgba(0,0,0,0.75)]">
        <div className="relative h-[220px] bg-slate-900">
          <SeriesCover
            serie={serie}
            className="h-full rounded-none"
            iconSize="text-7xl"
          />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/50 text-lg font-black text-white backdrop-blur-md active:scale-[0.96]"
            aria-label="Fechar aviso premium"
          >
            ×
          </button>

          <div className="absolute bottom-4 left-4 right-4">
            <SeriesBadge tone="gold">Premium</SeriesBadge>

            <h2 className="mt-3 text-3xl font-black leading-[0.95] tracking-[-0.065em] text-white drop-shadow-[0_5px_18px_rgba(0,0,0,0.9)]">
              {serie.title}
            </h2>
          </div>
        </div>

        <div className="p-5">
          <p className="text-base font-black text-white">
            {episode ? 'Este episódio é premium.' : 'Este podcast é premium.'}
          </p>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
            Sua conta atual está no plano gratuito. Você pode conhecer este
            podcast pela sinopse e pelo episódio degustativo liberado.
          </p>

          <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4">
            <p className="text-sm font-black text-amber-100">
              Nenhuma cobrança será feita agora.
            </p>

            <p className="mt-2 text-xs font-semibold leading-5 text-amber-50/90">
              Quando a assinatura estiver disponível, os episódios premium
              poderão ser liberados para assinantes.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 active:scale-[0.98]"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}

function PodcastBadges({
  serie,
  isPremiumUser,
  episodeCount,
}: {
  serie: Series
  isPremiumUser: boolean
  episodeCount?: number | null
}) {
  const isPremium = serie.is_free === false
  const showPremiumSeal = isPremium && !isPremiumUser
  const count = episodeCount ?? serie.total_episodes ?? 0

  return (
    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
      {showPremiumSeal && <SeriesBadge tone="gold">Premium</SeriesBadge>}
      <SeriesBadge tone="dark">{count} episódios</SeriesBadge>
    </div>
  )
}

function FeaturedHero({
  serie,
  isPremiumUser,
  onOpen,
}: {
  serie: Series
  isPremiumUser: boolean
  onOpen: (serie: Series) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(serie)}
      aria-label={`Abrir podcast ${serie.title}`}
      className="group relative mb-7 block w-full overflow-hidden rounded-[36px] border border-white/10 bg-slate-900 text-left shadow-[0_28px_90px_rgba(0,0,0,0.48)] active:scale-[0.99]"
    >
      <SeriesCover
        serie={serie}
        className="h-[360px] rounded-[36px]"
        iconSize="text-8xl"
      />

      <PodcastBadges serie={serie} isPremiumUser={isPremiumUser} />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
    </button>
  )
}

function WidePodcastCard({
  serie,
  isPremiumUser,
  onOpen,
}: {
  serie: Series
  isPremiumUser: boolean
  onOpen: (serie: Series) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(serie)}
      aria-label={`Abrir podcast ${serie.title}`}
      className="group w-[76vw] max-w-[330px] shrink-0 text-left sm:w-[300px]"
    >
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
        <SeriesCover
          serie={serie}
          className="h-[185px] rounded-[28px]"
          iconSize="text-6xl"
        />

        <PodcastBadges serie={serie} isPremiumUser={isPremiumUser} />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />
      </div>
    </button>
  )
}

function CompactPodcastCard({
  serie,
  isPremiumUser,
  onOpen,
}: {
  serie: Series
  isPremiumUser: boolean
  onOpen: (serie: Series) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(serie)}
      aria-label={`Abrir podcast ${serie.title}`}
      className="group w-[155px] shrink-0 text-left sm:w-[180px]"
    >
      <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-900 shadow-[0_14px_38px_rgba(0,0,0,0.28)]">
        <SeriesCover
          serie={serie}
          className="h-[112px] rounded-[24px]"
          iconSize="text-4xl"
        />

        <PodcastBadges serie={serie} isPremiumUser={isPremiumUser} />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/35 to-transparent" />
      </div>
    </button>
  )
}

function PodcastShelf({
  title,
  subtitle,
  items,
  variant = 'wide',
  isPremiumUser,
  onOpen,
}: {
  title: string
  subtitle?: string
  items: Series[]
  variant?: 'wide' | 'compact'
  isPremiumUser: boolean
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
            <WidePodcastCard
              key={serie.id}
              serie={serie}
              isPremiumUser={isPremiumUser}
              onOpen={onOpen}
            />
          ) : (
            <CompactPodcastCard
              key={serie.id}
              serie={serie}
              isPremiumUser={isPremiumUser}
              onOpen={onOpen}
            />
          )
        )}
      </div>
    </section>
  )
}

function EpisodeThumbCard({
  episode,
  fallbackCover,
  locked,
  preview,
  onOpen,
}: {
  episode: Episode
  fallbackCover?: string | null
  locked: boolean
  preview: boolean
  onOpen: (episode: Episode) => void
}) {
  const imageUrl = episode.cover_image_url || fallbackCover || ''

  return (
    <button
      type="button"
      onClick={() => onOpen(episode)}
      className="group w-full text-left active:scale-[0.99]"
    >
      <div className="relative aspect-video overflow-hidden rounded-[26px] border border-white/10 bg-slate-900 shadow-[0_14px_42px_rgba(0,0,0,0.32)]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={episode.title}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-active:scale-[1.03] ${
              locked ? 'opacity-60' : ''
            }`}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-amber-950/30" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/28 to-black/5" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {locked ? (
            <SeriesBadge tone="gold">🔒 Premium</SeriesBadge>
          ) : preview ? (
            <SeriesBadge tone="green">Degustativo</SeriesBadge>
          ) : null}

          {episode.episode_number && (
            <SeriesBadge>Ep. {episode.episode_number}</SeriesBadge>
          )}

          {episode.bible_reference && (
            <SeriesBadge tone="green">{episode.bible_reference}</SeriesBadge>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="line-clamp-2 text-2xl font-black leading-[0.95] tracking-[-0.06em] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.86)]">
            {episode.title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-300">
            {episode.published_at && <span>{formatDate(episode.published_at)}</span>}
            {episode.duration_seconds && <span>• {formatDuration(episode.duration_seconds)}</span>}
          </div>
        </div>
      </div>

      {episode.description && (
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-400">
          {episode.description}
        </p>
      )}
    </button>
  )
}

function EpisodeDetail({
  episode,
  fallbackCover,
  onBack,
}: {
  episode: Episode
  fallbackCover?: string | null
  onBack: () => void
}) {
  const imageUrl = episode.cover_image_url || fallbackCover || ''

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-4 text-white">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-black text-slate-100 active:scale-[0.98]"
        >
          ← Voltar aos episódios
        </button>

        <div className="overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 shadow-[0_24px_75px_rgba(0,0,0,0.42)]">
          <div className="relative aspect-video bg-slate-900">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={episode.title}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-amber-950/30" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/5" />
          </div>

          <div className="p-5">
            <div className="mb-3 flex flex-wrap gap-2">
              {episode.episode_number && (
                <SeriesBadge>Ep. {episode.episode_number}</SeriesBadge>
              )}

              {episode.bible_reference && (
                <SeriesBadge tone="green">{episode.bible_reference}</SeriesBadge>
              )}
            </div>

            <h1 className="text-3xl font-black leading-tight tracking-[-0.065em] text-white">
              {episode.title}
            </h1>

            {episode.description && (
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
                {episode.description}
              </p>
            )}
            <EpisodeAudioPlayer
              episodeId={episode.id}
              src={episode.audio_url}
              title={episode.title}
              subtitle={episode.bible_reference || undefined}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function PodcastDetail({
  serie,
  episodes,
  selectedEpisode,
  lockedEpisode,
  loading,
  isPremiumUser,
  onBack,
  onOpenEpisode,
  onBackToEpisodes,
  onCloseLockedEpisode,
}: {
  serie: Series
  episodes: Episode[]
  selectedEpisode: Episode | null
  lockedEpisode: Episode | null
  loading: boolean
  isPremiumUser: boolean
  onBack: () => void
  onOpenEpisode: (episode: Episode) => void
  onBackToEpisodes: () => void
  onCloseLockedEpisode: () => void
}) {
  const isPremiumPodcast = serie.is_free === false
  const isFreeUserViewingPremium = isPremiumPodcast && !isPremiumUser
  const previewEpisode =
    episodes.find((episode) => episode.is_preview) || episodes[0] || null
  const previewEpisodeId = previewEpisode?.id || null

  if (selectedEpisode) {
    return (
      <EpisodeDetail
        episode={selectedEpisode}
        fallbackCover={serie.cover_image_url}
        onBack={onBackToEpisodes}
      />
    )
  }

  return (
    <>
      {lockedEpisode && (
        <PremiumLockedModal
          serie={serie}
          episode={lockedEpisode}
          onClose={onCloseLockedEpisode}
        />
      )}

      <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-4 text-white">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={onBack}
            className="mb-5 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-black text-slate-100 active:scale-[0.98]"
          >
            ← Voltar para podcasts
          </button>

          <section className="group relative mb-6 overflow-hidden rounded-[36px] border border-white/10 bg-slate-900 shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
            <SeriesCover
              serie={serie}
              className="h-[330px] rounded-[36px]"
              iconSize="text-8xl"
            />

            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              {isFreeUserViewingPremium && <SeriesBadge tone="gold">Premium</SeriesBadge>}
              <SeriesBadge tone="dark">
                {episodes.length || serie.total_episodes || 0} episódios
              </SeriesBadge>
            </div>
          </section>

          <div className="mb-6 rounded-[30px] border border-white/10 bg-slate-900/70 p-5">
            <div className="flex flex-wrap gap-2">
              {serie.is_current && <SeriesBadge tone="green">Atual</SeriesBadge>}
              {isFreeUserViewingPremium && <SeriesBadge tone="gold">Premium</SeriesBadge>}
              {!isPremiumPodcast && <SeriesBadge>Gratuito</SeriesBadge>}
            </div>

            <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.075em] text-white">
              {serie.title}
            </h1>

            {serie.description && (
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
                {serie.description}
              </p>
            )}

            {isFreeUserViewingPremium && (
              <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4">
                <p className="text-sm font-black text-amber-100">
                  Podcast premium com episódio degustativo
                </p>

                <p className="mt-2 text-xs font-semibold leading-5 text-amber-50/90">
                  Você pode ouvir o episódio degustativo gratuitamente. Se nenhum degustativo foi definido, o primeiro episódio será liberado como amostra.
                </p>
              </div>
            )}
          </div>

          <div className="mb-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
              Episódios
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-[-0.065em]">
              Escolha um episódio
            </h2>
          </div>

          {loading ? (
            <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 text-sm font-bold text-slate-400">
              Carregando episódios...
            </div>
          ) : episodes.length === 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 text-sm leading-6 text-slate-400">
              Este podcast ainda não possui episódios publicados.
            </div>
          ) : (
            <div className="grid gap-5">
              {episodes.map((episode) => {
                const preview = isFreeUserViewingPremium && episode.id === previewEpisodeId
                const locked =
                  isFreeUserViewingPremium && episode.id !== previewEpisodeId

                return (
                  <EpisodeThumbCard
                    key={episode.id}
                    episode={episode}
                    fallbackCover={serie.cover_image_url}
                    locked={locked}
                    preview={preview}
                    onOpen={onOpenEpisode}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function PodcastsSkeleton() {
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
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [lockedEpisode, setLockedEpisode] = useState<Episode | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)

  // Temporário: enquanto a área de pagamento não está ativa,
  // todos os usuários são tratados como gratuitos.
  const isPremiumUser = false

  useEffect(() => {
    loadSeries()
  }, [])

  async function loadSeries() {
    try {
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error

      setSeries(data || [])
    } catch (error) {
      console.error('Erro ao carregar podcasts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function openSeries(serie: Series) {
    setSelectedSeries(serie)
    setSelectedEpisode(null)
    setLockedEpisode(null)
    setEpisodes([])
    setLoadingEpisodes(true)

    try {
      const { data, error } = await supabase
        .from('episodes')
        .select(
          'id, series_id, title, description, bible_reference, audio_url, duration_seconds, episode_number, published_at, created_at, cover_image_url, status, is_preview'
        )
        .eq('series_id', serie.id)
        .eq('status', 'published')
        .order('episode_number', { ascending: true, nullsFirst: false })
        .order('published_at', { ascending: false })

      if (error) throw error

      setEpisodes((data || []) as Episode[])
    } catch (error) {
      console.error('Erro ao carregar episódios do podcast:', error)
    } finally {
      setLoadingEpisodes(false)
    }
  }

  function handleOpenEpisode(episode: Episode) {
    if (!selectedSeries) return

    const isPremiumPodcast = selectedSeries.is_free === false
    const isFreeUserViewingPremium = isPremiumPodcast && !isPremiumUser
    const previewEpisode =
    episodes.find((episode) => episode.is_preview) || episodes[0] || null
  const previewEpisodeId = previewEpisode?.id || null
    const locked = isFreeUserViewingPremium && episode.id !== previewEpisodeId

    if (locked) {
      setLockedEpisode(episode)
      return
    }

    setSelectedEpisode(episode)
  }

  function closeSeries() {
    setSelectedSeries(null)
    setSelectedEpisode(null)
    setLockedEpisode(null)
    setEpisodes([])
  }

  const featuredPodcast = useMemo(() => {
    return series.find((serie) => serie.is_current) || series[0] || null
  }, [series])

  const remainingPodcasts = featuredPodcast
    ? series.filter((serie) => serie.id !== featuredPodcast.id)
    : series

  if (loading) {
    return <PodcastsSkeleton />
  }

  if (selectedSeries) {
    return (
      <PodcastDetail
        serie={selectedSeries}
        episodes={episodes}
        selectedEpisode={selectedEpisode}
        lockedEpisode={lockedEpisode}
        loading={loadingEpisodes}
        isPremiumUser={isPremiumUser}
        onBack={closeSeries}
        onOpenEpisode={handleOpenEpisode}
        onBackToEpisodes={() => setSelectedEpisode(null)}
        onCloseLockedEpisode={() => setLockedEpisode(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-4 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Podcasts
          </p>

          <h1 className="mt-2 text-4xl font-black leading-[0.95] tracking-[-0.075em]">
            Catálogo de podcasts
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Jornadas bíblicas, devocionais antigos e conteúdos para crescer na fé.
          </p>
        </div>

        {series.length === 0 ? (
          <section className="rounded-[34px] border border-white/10 bg-slate-900/80 p-8 text-center shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
            <p className="text-6xl">🎧</p>

            <h2 className="mt-5 text-2xl font-black tracking-[-0.05em]">
              Nenhum podcast ainda
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Em breve teremos podcasts devocionais para você.
            </p>
          </section>
        ) : (
          <>
            {featuredPodcast && (
              <FeaturedHero
                serie={featuredPodcast}
                isPremiumUser={isPremiumUser}
                onOpen={openSeries}
              />
            )}

            <PodcastShelf
              title="Podcasts para você"
              subtitle="Catálogo"
              items={remainingPodcasts.length > 0 ? remainingPodcasts : series}
              variant="wide"
              isPremiumUser={isPremiumUser}
              onOpen={openSeries}
            />

            <PodcastShelf
              title="Todos os podcasts"
              subtitle="Explore"
              items={series}
              variant="compact"
              isPremiumUser={isPremiumUser}
              onOpen={openSeries}
            />
          </>
        )}
      </div>
    </div>
  )
}


