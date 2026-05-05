import type { Episode } from '@/lib/supabase'

export type EpisodeWithSeries = Episode & {
  series?: {
    title?: string | null
    icon_emoji?: string | null
    cover_image_url?: string | null
  } | null
}

export type TodayAudioCardProps = {
  episode: EpisodeWithSeries
  isFavorite: boolean
  isPlaying: boolean
  isSubscribed: boolean
  notifLoading: boolean
  sharingEpisode: boolean
  onPlay: () => void
  onFavorite: () => void
  onShare: () => void
  onToggleNotifications: () => void
  onOpenSeries?: () => void
}
