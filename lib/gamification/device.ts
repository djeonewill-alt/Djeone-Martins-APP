const DEVICE_ID_KEY = 'djeone-device-id-v1'

function createDeviceId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return 'device-' + Date.now() + '-' + Math.random().toString(36).slice(2)
}

export function getOrCreateGamificationDeviceId() {
  if (typeof window === 'undefined') return ''

  const existing = window.localStorage.getItem(DEVICE_ID_KEY)

  if (existing) return existing

  const next = createDeviceId()

  window.localStorage.setItem(DEVICE_ID_KEY, next)

  return next
}
