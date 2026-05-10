import { supabase } from '@/lib/supabase'
import { getOrCreateGamificationDeviceId } from './device'
import { GAMIFICATION_EVENT_POINTS, type GamificationEventType } from './events'
import { getJourneyLevel } from './levels'

type RegisterEventOptions = {
  eventType: GamificationEventType
  referenceId?: string
  metadata?: Record<string, unknown>
}

export async function ensureGamificationProfile(deviceId?: string) {
  const currentDeviceId = deviceId || getOrCreateGamificationDeviceId()

  if (!currentDeviceId) return null

  const { data: existing } = await supabase
    .from('user_gamification_profiles')
    .select('*')
    .eq('device_id', currentDeviceId)
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await supabase
    .from('user_gamification_profiles')
    .insert({
      device_id: currentDeviceId,
      points_total: 0,
      current_level: 1,
      current_level_title: 'Novo Caminhante',
    })
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao criar perfil de gamificação:', error)
    return null
  }

  return data
}

export async function registerGamificationEvent({
  eventType,
  referenceId,
  metadata = {},
}: RegisterEventOptions) {
  const deviceId = getOrCreateGamificationDeviceId()

  if (!deviceId) return null

  const points = GAMIFICATION_EVENT_POINTS[eventType] || 0

  const profile = await ensureGamificationProfile(deviceId)

  const currentPoints = Number(profile?.points_total || 0)
  const nextPoints = currentPoints + points
  const journeyLevel = getJourneyLevel(nextPoints)

  const { error: eventError } = await supabase
    .from('user_activity_events')
    .insert({
      device_id: deviceId,
      event_type: eventType,
      points,
      reference_id: referenceId || null,
      metadata,
    })

  if (eventError) {
    console.error('Erro ao registrar evento de gamificação:', eventError)
  }

  const { data, error } = await supabase
    .from('user_gamification_profiles')
    .upsert(
      {
        device_id: deviceId,
        points_total: nextPoints,
        current_level: journeyLevel.current.level,
        current_level_title: journeyLevel.current.title,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'device_id' }
    )
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao atualizar perfil de gamificação:', error)
    return null
  }

  return {
    profile: data,
    event: {
      eventType,
      points,
      referenceId,
    },
  }
}
