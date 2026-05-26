import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type EventName =
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

type LatestEvent = {
  id: string
  event_name: string
  entity_type: string | null
  entity_id: string | null
  source: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

const eventNames: EventName[] = [
  'app_opened',
  'episode_viewed',
  'audio_started',
  'audio_paused',
  'audio_progress_25',
  'audio_progress_50',
  'audio_progress_75',
  'audio_completed',
  'share_clicked',
  'quote_share_clicked',
  'notification_enabled',
]

const openIssueStatuses = ['new', 'reviewing', 'fixing', 'retest_requested', 'still_problem']

function getAdminSecret() {
  return process.env.ADMIN_API_SECRET || ''
}

function isAuthorized(request: NextRequest) {
  const adminSecret = getAdminSecret()
  const headerPassword = request.headers.get('x-admin-password') || ''
  const authHeader = request.headers.get('authorization') || ''
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : ''

  return Boolean(adminSecret) && (headerPassword === adminSecret || bearerToken === adminSecret)
}

function getAdminAuthError(request: NextRequest) {
  if (!getAdminSecret()) {
    return NextResponse.json(
      { error: 'Configuracao administrativa ausente.' },
      { status: 500 }
    )
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })
  }

  return null
}

async function safeCount(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  tableName: string,
  filter?: (query: any) => any
) {
  let query = supabase
    .from(tableName)
    .select('id', { count: 'exact', head: true })

  if (filter) query = filter(query)

  const { count, error } = await query

  if (error) throw error

  return count || 0
}

async function loadEventCounts(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  sinceIso: string
) {
  const pairs = await Promise.all(
    eventNames.map(async (eventName) => {
      const count = await safeCount(supabase, 'app_events', (query) =>
        query.eq('event_name', eventName).gte('created_at', sinceIso)
      )

      return [eventName, count] as const
    })
  )

  return pairs.reduce((acc, [eventName, count]) => {
    acc[eventName] = count
    return acc
  }, {} as Record<EventName, number>)
}

async function loadActiveCount(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  sinceIso: string
) {
  const { data, error } = await supabase
    .from('app_events')
    .select('device_id, user_id, session_id')
    .gte('created_at', sinceIso)
    .limit(10000)

  if (error) throw error

  const activeKeys = new Set<string>()

  ;(data || []).forEach((event) => {
    const userId = typeof event.user_id === 'string' ? event.user_id : ''
    const deviceId = typeof event.device_id === 'string' ? event.device_id : ''
    const sessionId = typeof event.session_id === 'string' ? event.session_id : ''
    const key = userId || deviceId || sessionId

    if (key) activeKeys.add(key)
  })

  return activeKeys.size
}

async function loadLatestEvents(
  supabase: ReturnType<typeof createSupabaseAdminClient>
) {
  const { data, error } = await supabase
    .from('app_events')
    .select('id, event_name, entity_type, entity_id, source, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) throw error

  return (data || []) as LatestEvent[]
}

export async function GET(request: NextRequest) {
  const authError = getAdminAuthError(request)
  if (authError) return authError

  try {
    const supabase = createSupabaseAdminClient()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [
      totalUsers,
      newUsers,
      totalEvents,
      activeUsers,
      eventCounts,
      betaPendingIssues,
      latestEvents,
    ] = await Promise.all([
      safeCount(supabase, 'profiles'),
      safeCount(supabase, 'profiles', (query) => query.gte('created_at', since)),
      safeCount(supabase, 'app_events', (query) => query.gte('created_at', since)),
      loadActiveCount(supabase, since),
      loadEventCounts(supabase, since),
      safeCount(supabase, 'beta_issue_reports', (query) => query.in('status', openIssueStatuses)),
      loadLatestEvents(supabase),
    ])

    return NextResponse.json({
      period: {
        label: 'ultimas 24h',
        since,
        until: new Date().toISOString(),
      },
      metrics: {
        totalUsers,
        newUsers,
        totalEvents,
        activeUsers,
        betaPendingIssues,
        eventCounts,
      },
      funnel: {
        episode_viewed: eventCounts.episode_viewed || 0,
        audio_started: eventCounts.audio_started || 0,
        audio_progress_25: eventCounts.audio_progress_25 || 0,
        audio_progress_50: eventCounts.audio_progress_50 || 0,
        audio_progress_75: eventCounts.audio_progress_75 || 0,
        audio_completed: eventCounts.audio_completed || 0,
      },
      latestEvents,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar analytics.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
