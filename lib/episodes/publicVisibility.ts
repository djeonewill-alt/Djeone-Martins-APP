export const PUBLIC_EPISODE_EDITORIAL_FILTER =
  'editorial_status.is.null,editorial_status.eq.published'

type EpisodeEditorialVisibility = {
  editorial_status?: string | null
}

export function isPublicEpisodeVisible(
  episode: EpisodeEditorialVisibility
) {
  return (
    episode.editorial_status == null ||
    episode.editorial_status === 'published'
  )
}
