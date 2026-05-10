export type TranscriptionSegment = {
  start: number
  end: number
  text: string
}

export type PlayerEpisode = {
  id: string
  title: string
  bible_reference: string
  audio_url: string
  audio_url_compatible?: string | null
  audio_compatible_type?: string | null
  duration_seconds: number
  icon_emoji?: string
  series_title?: string
  transcription_text?: string | null
  transcription_segments?: TranscriptionSegment[] | null
}
