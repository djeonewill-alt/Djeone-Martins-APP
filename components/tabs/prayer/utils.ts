import type { PrayerRequest } from '@/lib/supabase'

export function formatPrayerDate(date: string) {
  try {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })
  } catch {
    return ''
  }
}

export function getPrayerContent(prayer: PrayerRequest) {
  return prayer.content || prayer.request || ''
}

export function getLocalArray(key: string) {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function setLocalArray(key: string, value: string[]) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(key, JSON.stringify(value))
}

export function getOrCreateDeviceId() {
  const key = 'djeone-device-id-v1'

  if (typeof window === 'undefined') {
    return 'server'
  }

  const current = window.localStorage.getItem(key)

  if (current) {
    return current
  }

  const nextId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`

  window.localStorage.setItem(key, nextId)

  return nextId
}
