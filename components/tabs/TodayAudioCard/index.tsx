'use client'

import AudioCardActions from './AudioCardActions'
import AudioCardHeader from './AudioCardHeader'
import AudioCardMeta from './AudioCardMeta'
import AudioCardThumbnail from './AudioCardThumbnail'
import type { TodayAudioCardProps } from './types'
import { formatDuration } from './utils'

export default function TodayAudioCard({
  episode,
  isFavorite,
  isSubscribed,
  notifLoading,
  sharingEpisode,
  onPlay,
  onFavorite,
  onShare,
  onToggleNotifications,
  onOpenSeries,
}: TodayAudioCardProps) {
  const coverImage =
    episode.cover_image_url ||
    episode.series?.cover_image_url ||
    ''

  const durationLabel = formatDuration(episode.duration_seconds || 0)

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-slate-900/80 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.32)] backdrop-blur-sm">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]" />

      <div className="relative space-y-3">
        <AudioCardHeader
          episode={episode}
          onOpenSeries={onOpenSeries}
        />

        <AudioCardMeta
          bibleReference={episode.bible_reference}
          episodeNumber={episode.episode_number}
          durationLabel={durationLabel}
        />

        <AudioCardThumbnail
          title={episode.title}
          coverImage={coverImage}
          onPlay={onPlay}
          actions={
            <AudioCardActions
              isFavorite={isFavorite}
              isSubscribed={isSubscribed}
              notifLoading={notifLoading}
              sharingEpisode={sharingEpisode}
              onFavorite={onFavorite}
              onShare={onShare}
              onToggleNotifications={onToggleNotifications}
            />
          }
        />
      </div>
    </section>
  )
}
