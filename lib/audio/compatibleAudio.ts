export type AudioWithCompatibleSource = {
  audio_url?: string | null
  audio_url_compatible?: string | null
  audio_compatible_type?: string | null
}

export function shouldPreferCompatibleAudio() {
  if (typeof window === 'undefined') return false

  const userAgent = window.navigator.userAgent || ''
  const vendor = window.navigator.vendor || ''

  const isIOS = /iPad|iPhone|iPod/i.test(userAgent)

  const isTouchMac =
    /Macintosh/i.test(userAgent) &&
    typeof document !== 'undefined' &&
    'ontouchend' in document

  const isSafari =
    /Safari/i.test(userAgent) &&
    !/Chrome|CriOS|Chromium|Edg|OPR|Firefox|FxiOS/i.test(userAgent)

  const isAppleBrowser = /Apple/i.test(vendor)

  return isIOS || isTouchMac || (isSafari && isAppleBrowser)
}

export function getPreferredAudioUrl(episode: AudioWithCompatibleSource) {
  const originalUrl = episode.audio_url || ''
  const compatibleUrl = episode.audio_url_compatible || ''

  if (shouldPreferCompatibleAudio() && compatibleUrl) {
    return compatibleUrl
  }

  return originalUrl || compatibleUrl
}
