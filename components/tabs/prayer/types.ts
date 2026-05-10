import type { PrayerRequest } from '@/lib/supabase'

export type PrayerSubTab = 'mural' | 'meus' | 'mapa'

export type PrayerCategory =
  | 'familia'
  | 'saude'
  | 'direcao'
  | 'trabalho'
  | 'vida_espiritual'
  | 'gratidao'
  | 'outro'

export type PrayerGuideStep = {
  title: string
  description: string
}

export type PrayerGuide = {
  title: string
  subtitle: string
  bibleReference: string
  bibleText: string
  estimatedMinutes: number
  steps: PrayerGuideStep[]
}

export type PrayerLearningItem = {
  id: string
  title: string
  subtitle: string
  icon: string
  minutes: number
}

export type PrayerRequestWithLocal = PrayerRequest & {
  locallyPrayed?: boolean
}

export type PrayerEncouragement = {
  id: string
  prayer_request_id: string
  device_id: string
  message: string
  emoji: string
  created_at: string
}

export type PrayerEncouragementOption = {
  emoji: string
  message: string
}
