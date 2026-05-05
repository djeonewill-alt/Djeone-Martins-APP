export function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) {
    return 'Áudio'
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes <= 0) {
    return `${remainingSeconds}s`
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')} min`
}
