export type JourneyLevel = {
  level: number
  title: string
  minPoints: number
}

export const JOURNEY_LEVELS: JourneyLevel[] = [
  { level: 1, title: 'Novo Caminhante', minPoints: 0 },
  { level: 2, title: 'Discípulo em Formação', minPoints: 200 },
  { level: 3, title: 'Servo Constante', minPoints: 500 },
  { level: 4, title: 'Cooperador da Palavra', minPoints: 1000 },
  { level: 5, title: 'Intercessor Perseverante', minPoints: 2000 },
  { level: 6, title: 'Guardião da Constância', minPoints: 4000 },
  { level: 7, title: 'Servidor Fiel', minPoints: 7000 },
]

export function getJourneyLevel(points: number) {
  const current =
    [...JOURNEY_LEVELS]
      .reverse()
      .find((level) => points >= level.minPoints) || JOURNEY_LEVELS[0]

  const next = JOURNEY_LEVELS.find(
    (level) => level.minPoints > current.minPoints
  )

  const progress = next
    ? Math.round(
        ((points - current.minPoints) /
          (next.minPoints - current.minPoints)) *
          100
      )
    : 100

  return {
    current,
    next,
    progress: Math.min(Math.max(progress, 0), 100),
    pointsToNext: next ? Math.max(next.minPoints - points, 0) : 0,
  }
}
