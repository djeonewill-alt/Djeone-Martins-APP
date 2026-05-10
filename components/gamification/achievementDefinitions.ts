import type { PremiumIconTone } from '@/components/icons/PremiumIconTile'
import type { GamificationSvgIconName } from '@/components/icons/GamificationSvgIcon'

export type AchievementKey =
  | 'listener'
  | 'intercessor'
  | 'encourager'
  | 'evangelist'
  | 'student'
  | 'witness'
  | 'sower'
  | 'perseverance'

export type AchievementDefinition = {
  key: AchievementKey
  title: string
  spiritualName: string
  description: string
  icon: GamificationSvgIconName
  tone: PremiumIconTone
  current: number
  target: number
  unlocked: boolean
  unlockedTier?: string
}

export const JOURNEY_LEVELS = [
  { level: 1, title: 'Novo Caminhante', minPoints: 0 },
  { level: 2, title: 'Discípulo em Formação', minPoints: 200 },
  { level: 3, title: 'Servo Constante', minPoints: 500 },
  { level: 4, title: 'Cooperador da Palavra', minPoints: 1000 },
  { level: 5, title: 'Intercessor Perseverante', minPoints: 2000 },
]

export function getJourneyLevel(points: number) {
  const current = [...JOURNEY_LEVELS]
    .reverse()
    .find((level) => points >= level.minPoints) || JOURNEY_LEVELS[0]

  const next = JOURNEY_LEVELS.find((level) => level.minPoints > current.minPoints)

  const progress = next
    ? Math.round(((points - current.minPoints) / (next.minPoints - current.minPoints)) * 100)
    : 100

  return {
    current,
    next,
    progress: Math.min(Math.max(progress, 0), 100),
    pointsToNext: next ? Math.max(next.minPoints - points, 0) : 0,
  }
}

export function buildAchievementDefinitions({
  chaptersRead,
  prayedCount,
  shareCount,
  encouragementCount,
  myPrayerCount,
}: {
  chaptersRead: number
  prayedCount: number
  shareCount: number
  encouragementCount: number
  myPrayerCount: number
}): AchievementDefinition[] {
  return [
    {
      key: 'listener',
      title: 'Ouvinte Fiel',
      spiritualName: 'Alimente-se diariamente da Palavra',
      description: 'Progresso inicial pela constância em ouvir e acompanhar conteúdos.',
      icon: 'listener',
      tone: 'sky',
      current: chaptersRead,
      target: 7,
      unlocked: chaptersRead >= 7,
    },
    {
      key: 'intercessor',
      title: 'Intercessor',
      spiritualName: 'Carregue pessoas em oração',
      description: 'Ore por pedidos da comunidade e fortaleça pessoas em secreto.',
      icon: 'intercessor',
      tone: 'cyan',
      current: prayedCount,
      target: 10,
      unlocked: prayedCount >= 10,
    },
    {
      key: 'encourager',
      title: 'Encorajador',
      spiritualName: 'Fortaleça quem está cansado',
      description: 'Envie encorajamentos e participe da edificação da comunidade.',
      icon: 'encourager',
      tone: 'rose',
      current: encouragementCount,
      target: 25,
      unlocked: encouragementCount >= 25,
    },
    {
      key: 'evangelist',
      title: 'Evangelizador',
      spiritualName: 'Compartilhe luz com outras pessoas',
      description: 'Compartilhe conteúdos quando o modo de compartilhamento for liberado.',
      icon: 'evangelist',
      tone: 'emerald',
      current: shareCount,
      target: 5,
      unlocked: shareCount >= 5,
    },
    {
      key: 'student',
      title: 'Estudioso',
      spiritualName: 'Cresça no conhecimento da Palavra',
      description: 'Avance na leitura bíblica e nas futuras séries de estudo.',
      icon: 'student',
      tone: 'amber',
      current: chaptersRead,
      target: 21,
      unlocked: chaptersRead >= 21,
    },
    {
      key: 'witness',
      title: 'Testemunha',
      spiritualName: 'Reconheça as respostas de Deus',
      description: 'Registre pedidos respondidos e testemunhos da caminhada.',
      icon: 'witness',
      tone: 'fire',
      current: 0,
      target: 1,
      unlocked: false,
    },
    {
      key: 'sower',
      title: 'Semeador',
      spiritualName: 'Sustente a obra com generosidade',
      description: 'Área futura para acompanhar contribuições de forma privada e pastoral.',
      icon: 'sower',
      tone: 'violet',
      current: 0,
      target: 1,
      unlocked: false,
    },
    {
      key: 'perseverance',
      title: 'Perseverante',
      spiritualName: 'Permaneça firme na jornada',
      description: 'Mantenha uma rotina de leitura, oração e crescimento com Deus.',
      icon: 'perseverance',
      tone: 'amber',
      current: Math.min(chaptersRead + prayedCount, 14),
      target: 7,
      unlocked: chaptersRead + prayedCount >= 14,
    },
  ]
}

export function calculateJourneyPoints({
  chaptersRead,
  prayedCount,
  shareCount,
  encouragementCount,
  myPrayerCount,
}: {
  chaptersRead: number
  prayedCount: number
  shareCount: number
  encouragementCount: number
  myPrayerCount: number
}) {
  return (
    chaptersRead * 10 +
    prayedCount * 5 +
    encouragementCount * 3 +
    myPrayerCount * 5 +
    shareCount * 25
  )
}
