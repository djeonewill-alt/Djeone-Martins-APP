'use client'

export type AnalyticsEventName =
  | 'app_opened'
  | 'episode_viewed'
  | 'audio_started'
  | 'audio_paused'
  | 'audio_progress_25'
  | 'audio_progress_50'
  | 'audio_progress_75'
  | 'audio_completed'
  | 'share_clicked'
  | 'quote_share_clicked'
  | 'notification_enabled'
  | 'public_episode_opened'
  | 'public_episode_audio_started'
  | 'public_episode_audio_progress_25'
  | 'public_episode_audio_progress_50'
  | 'public_episode_audio_progress_75'
  | 'public_episode_audio_completed'
  | 'public_episode_share_clicked'
  | 'public_episode_open_app_clicked'

type AnalyticsPayload = {
  entityType?: string
  entityId?: string
  source?: string
  path?: string
  referrer?: string
  metadata?: Record<string, unknown>
}

const DEVICE_ID_KEY = 'djeone-analytics-device-id-v1'
const SESSION_ID_KEY = 'djeone-analytics-session-id-v1'

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function warnAnalyticsError(error: unknown) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[analytics] evento nao registrado:', error)
  }
}

export function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return null

  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY)

    if (existing) return existing

    const nextId = createId()
    window.localStorage.setItem(DEVICE_ID_KEY, nextId)

    return nextId
  } catch (error) {
    warnAnalyticsError(error)
    return null
  }
}

export function getOrCreateSessionId() {
  if (typeof window === 'undefined') return null

  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY)

    if (existing) return existing

    const nextId = createId()
    window.sessionStorage.setItem(SESSION_ID_KEY, nextId)

    return nextId
  } catch (error) {
    warnAnalyticsError(error)
    return null
  }
}

export function trackAppEvent(
  eventName: AnalyticsEventName,
  payload: AnalyticsPayload = {}
) {
  if (typeof window === 'undefined') return

  try {
    const body = {
      event_name: eventName,
      device_id: getOrCreateDeviceId(),
      session_id: getOrCreateSessionId(),
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      source: payload.source,
      path: payload.path || window.location.pathname,
      referrer: payload.referrer || document.referrer || null,
      metadata: payload.metadata || {},
    }

    fetch('/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(warnAnalyticsError)
  } catch (error) {
    warnAnalyticsError(error)
  }
}
