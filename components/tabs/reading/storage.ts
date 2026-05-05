import type { ReadingState } from './types'

const STORAGE_KEY = 'djeone-reading-state-v1'

export const DEFAULT_READING_STATE: ReadingState = {
  activePlanId: null,
  activePlanStartedAt: null,
  readChapters: {},
}

export function loadReadingState(): ReadingState {
  if (typeof window === 'undefined') {
    return DEFAULT_READING_STATE
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) return DEFAULT_READING_STATE

    const parsed = JSON.parse(raw)

    return {
      activePlanId: parsed.activePlanId || null,
      activePlanStartedAt: parsed.activePlanStartedAt || null,
      readChapters: parsed.readChapters || {},
    }
  } catch {
    return DEFAULT_READING_STATE
  }
}

export function saveReadingState(state: ReadingState) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
