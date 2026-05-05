import type { TranscriptionSegment } from './types'

export function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? seconds : 0
  const mins = Math.floor(safeSeconds / 60)
  const secs = Math.floor(safeSeconds % 60)

  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function findActiveSegment(
  segments: TranscriptionSegment[],
  currentTime: number
) {
  return (
    segments.find((segment) => {
      return currentTime >= segment.start && currentTime < segment.end
    }) || null
  )
}
