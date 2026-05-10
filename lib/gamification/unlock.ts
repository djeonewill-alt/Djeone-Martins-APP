import { supabase } from '@/lib/supabase'
import { getOrCreateGamificationDeviceId } from './device'
import { ACHIEVEMENT_DEFINITIONS, type AchievementTier } from './achievements'

export type GamificationStats = {
  listener: number
  intercessor: number
  encourager: number
  evangelist: number
  student: number
  witness: number
  sower: number
  perseverance: number
}

export type UnlockedAchievement = {
  achievement_key: string
  tier: AchievementTier
  unlocked_at: string
}

export function buildGamificationStats({
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
}): GamificationStats {
  return {
    listener: chaptersRead,
    intercessor: prayedCount,
    encourager: encouragementCount,
    evangelist: shareCount,
    student: chaptersRead,
    witness: 0,
    sower: 0,
    perseverance: chaptersRead + prayedCount + myPrayerCount,
  }
}

export async function loadUnlockedAchievements(deviceId?: string) {
  const currentDeviceId = deviceId || getOrCreateGamificationDeviceId()

  if (!currentDeviceId) return []

  const { data, error } = await supabase
    .from('user_achievements')
    .select('achievement_key, tier, unlocked_at')
    .eq('device_id', currentDeviceId)

  if (error) {
    console.error('Erro ao carregar conquistas:', error)
    return []
  }

  return (data || []) as UnlockedAchievement[]
}

export async function checkAndUnlockAchievements(stats: GamificationStats) {
  const deviceId = getOrCreateGamificationDeviceId()

  if (!deviceId) return []

  const rowsToInsert = ACHIEVEMENT_DEFINITIONS.flatMap((definition) => {
    const current = stats[definition.key as keyof GamificationStats] || 0

    return definition.tiers
      .filter((tier) => current >= tier.target)
      .map((tier) => ({
        device_id: deviceId,
        achievement_key: definition.key,
        tier: tier.tier,
        metadata: {
          title: definition.title,
          label: tier.label,
          target: tier.target,
          current,
          source: 'auto_check',
        },
      }))
  })

  if (rowsToInsert.length === 0) {
    return loadUnlockedAchievements(deviceId)
  }

  const { error } = await supabase
    .from('user_achievements')
    .upsert(rowsToInsert, {
      onConflict: 'device_id,achievement_key,tier',
      ignoreDuplicates: true,
    })

  if (error) {
    console.error('Erro ao desbloquear conquistas:', error)
  }

  return loadUnlockedAchievements(deviceId)
}
