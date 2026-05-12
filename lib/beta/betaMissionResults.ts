import { supabase } from '@/lib/supabase'
import type { BetaMission, MissionResult, MissionResultStatus } from '@/components/tester/types'
import type { BetaTester } from '@/lib/beta/betaTester'

type MissionResultRow = {
  id: string
  auth_user_id: string
  mission_key: string
  status: MissionResultStatus
  report: string | null
  technical_snapshot: unknown
  started_at: string | null
  completed_at: string | null
  updated_at: string | null
}

function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  return Notification.permission
}

function isStandalonePwa() {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

export function getBetaTechnicalSnapshot() {
  if (typeof window === 'undefined') return null

  return {
    userAgent: navigator.userAgent || null,
    language: navigator.language || null,
    screenWidth: window.screen?.width || null,
    screenHeight: window.screen?.height || null,
    viewportWidth: window.innerWidth || null,
    viewportHeight: window.innerHeight || null,
    notificationPermission: getNotificationPermission(),
    isPwaStandalone: isStandalonePwa(),
    currentUrl: window.location.href,
    timestamp: new Date().toISOString(),
  }
}

export async function loadBetaMissionResults(betaTester: BetaTester) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) return {}

  const { data, error } = await supabase
    .from('beta_mission_results')
    .select('id, auth_user_id, mission_key, status, report, technical_snapshot, started_at, completed_at, updated_at')
    .eq('tester_id', betaTester.id)
    .eq('auth_user_id', user.id)

  if (error) throw error

  return ((data || []) as MissionResultRow[]).reduce<Record<string, MissionResult>>(
    (results, row) => {
      results[row.mission_key] = {
        id: row.id,
        auth_user_id: row.auth_user_id,
        status: row.status,
        report: row.report || undefined,
        technical_snapshot: row.technical_snapshot || undefined,
        started_at: row.started_at,
        completed_at: row.completed_at,
        updated_at: row.updated_at,
      }

      return results
    },
    {}
  )
}

export async function saveBetaMissionResult(params: {
  betaTester: BetaTester
  mission: BetaMission
  status: MissionResultStatus
  report?: string | null
  existingResult?: MissionResult
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('Faça login para salvar o resultado da missão.')

  const now = new Date().toISOString()
  const startedAt =
    params.status === 'started'
      ? params.existingResult?.started_at || now
      : params.existingResult?.started_at || now
  const completedAt =
    params.status === 'success' ||
    params.status === 'problem' ||
    params.status === 'confusing'
      ? now
      : params.existingResult?.completed_at || null
  const technicalSnapshot = getBetaTechnicalSnapshot()

  const { data, error } = await supabase
    .from('beta_mission_results')
    .upsert(
      {
        tester_id: params.betaTester.id,
        auth_user_id: user.id,
        mission_key: params.mission.mission_key,
        app_area: params.mission.app_area,
        section: params.mission.section,
        status: params.status,
        report: params.report?.trim() || null,
        technical_snapshot: technicalSnapshot,
        started_at: startedAt,
        completed_at: completedAt,
      },
      {
        onConflict: 'tester_id,mission_key',
      }
    )
    .select('id, auth_user_id, technical_snapshot, started_at, completed_at, updated_at')
    .single()

  if (error) throw error

  return {
    id: data?.id,
    auth_user_id: data?.auth_user_id || user.id,
    status: params.status,
    report: params.report?.trim() || undefined,
    technical_snapshot: data?.technical_snapshot || technicalSnapshot || undefined,
    started_at: data?.started_at || startedAt,
    completed_at: data?.completed_at || completedAt,
    updated_at: data?.updated_at || now,
  } satisfies MissionResult
}
