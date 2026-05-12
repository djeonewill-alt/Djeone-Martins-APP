import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type IssueStatus =
  | 'new'
  | 'reviewing'
  | 'fixing'
  | 'retest_requested'
  | 'resolved'
  | 'ignored'
  | 'still_problem'

type IssueReportPayload = {
  id?: unknown
  status?: unknown
  admin_notes?: unknown
}

type IssueReportRecord = {
  id: string
  tester_id: string
  auth_user_id: string
  mission_result_id: string | null
  mission_key: string
  app_area: string
  section: string | null
  issue_type: 'problem' | 'confusing'
  status: IssueStatus
  priority: string
  report: string
  technical_snapshot: unknown
  admin_notes: string | null
  retest_requested_at: string | null
  resolved_at: string | null
  created_at: string | null
  updated_at: string | null
}

type IssueTesterRecord = {
  id: string
  email: string
  name: string | null
  founder_number: number | null
}

type IssueProfileRecord = {
  tester_id: string
  device_label: string | null
  operating_system: string | null
  browser: string | null
  access_mode: string | null
  is_pwa_standalone: boolean | null
}

type IssueEventRecord = {
  id: string
  issue_report_id: string
  event_type: string
  message: string | null
  status_from: string | null
  status_to: string | null
  metadata: unknown
  created_at: string | null
}

const allowedStatuses: IssueStatus[] = [
  'new',
  'reviewing',
  'fixing',
  'retest_requested',
  'resolved',
  'ignored',
  'still_problem',
]

const statusEvents: Record<IssueStatus, string> = {
  new: 'created',
  reviewing: 'admin_reviewing',
  fixing: 'admin_fixing',
  retest_requested: 'retest_requested',
  resolved: 'resolved',
  ignored: 'ignored',
  still_problem: 'admin_note',
}

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
      { error: 'Configuração administrativa ausente.' },
      { status: 500 }
    )
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  return null
}

function getOptionalText(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeIssueStatus(value: unknown) {
  if (typeof value !== 'string') return null
  return allowedStatuses.includes(value as IssueStatus) ? (value as IssueStatus) : null
}

async function getEnrichedIssueReports(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data: reports, error: reportsError } = await supabase
    .from('beta_issue_reports')
    .select(
      'id, tester_id, auth_user_id, mission_result_id, mission_key, app_area, section, issue_type, status, priority, report, technical_snapshot, admin_notes, retest_requested_at, resolved_at, created_at, updated_at'
    )
    .order('updated_at', { ascending: false })

  if (reportsError) throw reportsError

  const issueReports = (reports || []) as IssueReportRecord[]
  const testerIds = Array.from(new Set(issueReports.map((report) => report.tester_id)))
  const reportIds = issueReports.map((report) => report.id)

  const [
    { data: testers, error: testersError },
    { data: profiles, error: profilesError },
    { data: events, error: eventsError },
  ] = await Promise.all([
    testerIds.length
      ? supabase
          .from('beta_testers')
          .select('id, email, name, founder_number')
          .in('id', testerIds)
      : Promise.resolve({ data: [], error: null }),
    testerIds.length
      ? supabase
          .from('beta_tester_profiles')
          .select('tester_id, device_label, operating_system, browser, access_mode, is_pwa_standalone')
          .in('tester_id', testerIds)
      : Promise.resolve({ data: [], error: null }),
    reportIds.length
      ? supabase
          .from('beta_issue_events')
          .select('id, issue_report_id, event_type, message, status_from, status_to, metadata, created_at')
          .in('issue_report_id', reportIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])

  if (testersError) throw testersError
  if (profilesError) throw profilesError
  if (eventsError) throw eventsError

  const testersById = new Map<string, IssueTesterRecord>()
  ;((testers || []) as IssueTesterRecord[]).forEach((tester) => {
    testersById.set(tester.id, tester)
  })

  const profilesByTesterId = new Map<string, IssueProfileRecord>()
  ;((profiles || []) as IssueProfileRecord[]).forEach((profile) => {
    profilesByTesterId.set(profile.tester_id, profile)
  })

  const eventsByReportId = new Map<string, IssueEventRecord[]>()
  ;((events || []) as IssueEventRecord[]).forEach((event) => {
    const current = eventsByReportId.get(event.issue_report_id) || []
    current.push(event)
    eventsByReportId.set(event.issue_report_id, current)
  })

  return issueReports.map((report) => ({
    ...report,
    tester: testersById.get(report.tester_id) || null,
    profile: profilesByTesterId.get(report.tester_id) || null,
    events: eventsByReportId.get(report.id) || [],
  }))
}

export async function GET(request: NextRequest) {
  const authError = getAdminAuthError(request)
  if (authError) return authError

  try {
    const supabase = createSupabaseAdminClient()
    const issueReports = await getEnrichedIssueReports(supabase)

    return NextResponse.json({ issueReports })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao listar relatos beta.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = getAdminAuthError(request)
  if (authError) return authError

  try {
    const payload = (await request.json()) as IssueReportPayload
    const id = typeof payload.id === 'string' ? payload.id : ''
    const nextStatus = normalizeIssueStatus(payload.status)
    const adminNotes = getOptionalText(payload.admin_notes)

    if (!id) {
      return NextResponse.json({ error: 'ID do relato não informado.' }, { status: 400 })
    }

    if (!nextStatus && payload.admin_notes === undefined) {
      return NextResponse.json(
        { error: 'Informe um status ou uma nota administrativa.' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()
    const { data: currentReport, error: currentError } = await supabase
      .from('beta_issue_reports')
      .select('id, tester_id, auth_user_id, status, admin_notes')
      .eq('id', id)
      .single()

    if (currentError) throw currentError

    const now = new Date().toISOString()
    const updatePayload: Record<string, unknown> = {}

    if (nextStatus) {
      updatePayload.status = nextStatus

      if (nextStatus === 'retest_requested') {
        updatePayload.retest_requested_at = now
      }

      if (nextStatus === 'resolved') {
        updatePayload.resolved_at = now
      }
    }

    if (payload.admin_notes !== undefined) {
      updatePayload.admin_notes = adminNotes
    }

    const { error: updateError } = await supabase
      .from('beta_issue_reports')
      .update(updatePayload)
      .eq('id', id)

    if (updateError) throw updateError

    const eventType = nextStatus ? statusEvents[nextStatus] : 'admin_note'
    const { error: eventError } = await supabase
      .from('beta_issue_events')
      .insert({
        issue_report_id: id,
        tester_id: currentReport.tester_id,
        auth_user_id: currentReport.auth_user_id,
        event_type: eventType,
        message: adminNotes,
        status_from: nextStatus ? currentReport.status : null,
        status_to: nextStatus || null,
        metadata: {
          admin_notes_updated: payload.admin_notes !== undefined,
        },
      })

    if (eventError) throw eventError

    const issueReports = await getEnrichedIssueReports(supabase)
    return NextResponse.json({ issueReports })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao atualizar relato beta.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
