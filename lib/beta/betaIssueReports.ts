import { supabase } from '@/lib/supabase'
import type { BetaMission } from '@/components/tester/types'
import type { BetaTester } from '@/lib/beta/betaTester'

type IssueType = 'problem' | 'confusing'
export type RetestAnswer = 'success' | 'problem' | 'confusing'

export type BetaIssueEvent = {
  id: string
  issue_report_id: string
  event_type: string
  message: string | null
  status_from: string | null
  status_to: string | null
  metadata: unknown
  created_at: string | null
}

export type BetaIssueReport = {
  id: string
  tester_id: string
  auth_user_id: string
  mission_result_id: string | null
  mission_key: string
  app_area: string
  section: string | null
  issue_type: IssueType
  status: string
  priority: string
  report: string
  technical_snapshot: unknown
  admin_notes: string | null
  retest_requested_at: string | null
  resolved_at: string | null
  created_at: string | null
  updated_at: string | null
  events: BetaIssueEvent[]
}

const openIssueStatuses = ['new', 'reviewing', 'fixing', 'retest_requested', 'still_problem']

export async function loadOwnBetaIssueReports(betaTester: BetaTester) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) return []

  const { data: reports, error: reportsError } = await supabase
    .from('beta_issue_reports')
    .select(
      'id, tester_id, auth_user_id, mission_result_id, mission_key, app_area, section, issue_type, status, priority, report, technical_snapshot, admin_notes, retest_requested_at, resolved_at, created_at, updated_at'
    )
    .eq('tester_id', betaTester.id)
    .eq('auth_user_id', user.id)
    .in('status', ['retest_requested', 'still_problem', 'resolved'])
    .order('updated_at', { ascending: false })

  if (reportsError) throw reportsError

  const issueReports = (reports || []) as Omit<BetaIssueReport, 'events'>[]
  const reportIds = issueReports.map((report) => report.id)

  if (reportIds.length === 0) return []

  const { data: events, error: eventsError } = await supabase
    .from('beta_issue_events')
    .select('id, issue_report_id, event_type, message, status_from, status_to, metadata, created_at')
    .in('issue_report_id', reportIds)
    .order('created_at', { ascending: false })

  if (eventsError) throw eventsError

  const eventsByReportId = new Map<string, BetaIssueEvent[]>()
  ;((events || []) as BetaIssueEvent[]).forEach((event) => {
    const current = eventsByReportId.get(event.issue_report_id) || []
    current.push(event)
    eventsByReportId.set(event.issue_report_id, current)
  })

  return issueReports.map((report) => ({
    ...report,
    events: eventsByReportId.get(report.id) || [],
  }))
}

export async function submitBetaIssueRetest(params: {
  issueReportId: string
  answer: RetestAnswer
  message?: string | null
  technicalSnapshot: unknown
}) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) throw sessionError
  if (!session) throw new Error('Faça login para enviar o reteste.')

  const response = await fetch('/api/beta/issue-retest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      issueReportId: params.issueReportId,
      answer: params.answer,
      message: params.message?.trim() || null,
      technicalSnapshot: params.technicalSnapshot,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível enviar o reteste.')
  }

  return data.issueReport as BetaIssueReport
}

export async function createBetaIssueReportFromMissionResult(params: {
  betaTester: BetaTester
  authUserId: string
  mission: BetaMission
  missionResultId?: string | null
  issueType: IssueType
  report: string
  technicalSnapshot: unknown
}) {
  const report = params.report.trim()

  if (!report) return null

  const { data: existingReport, error: findError } = await supabase
    .from('beta_issue_reports')
    .select('id')
    .eq('tester_id', params.betaTester.id)
    .eq('auth_user_id', params.authUserId)
    .eq('mission_key', params.mission.mission_key)
    .eq('issue_type', params.issueType)
    .in('status', openIssueStatuses)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findError) throw findError

  let issueReportId = existingReport?.id as string | undefined
  let updatedExistingReport = false

  if (issueReportId) {
    const { error: updateError } = await supabase
      .from('beta_issue_reports')
      .update({
        mission_result_id: params.missionResultId || null,
        app_area: params.mission.app_area,
        section: params.mission.section,
        priority: 'normal',
        report,
        technical_snapshot: params.technicalSnapshot,
      })
      .eq('id', issueReportId)
      .eq('auth_user_id', params.authUserId)

    if (updateError) throw updateError
    updatedExistingReport = true
  } else {
    const { data: insertedReport, error: insertError } = await supabase
      .from('beta_issue_reports')
      .insert({
        tester_id: params.betaTester.id,
        auth_user_id: params.authUserId,
        mission_result_id: params.missionResultId || null,
        mission_key: params.mission.mission_key,
        app_area: params.mission.app_area,
        section: params.mission.section,
        issue_type: params.issueType,
        status: 'new',
        priority: 'normal',
        report,
        technical_snapshot: params.technicalSnapshot,
      })
      .select('id')
      .single()

    if (insertError) throw insertError
    issueReportId = insertedReport.id
  }

  const { error: eventError } = await supabase
    .from('beta_issue_events')
    .insert({
      issue_report_id: issueReportId,
      tester_id: params.betaTester.id,
      auth_user_id: params.authUserId,
      event_type: 'created',
      message: report,
      status_to: 'new',
      metadata: {
        mission_key: params.mission.mission_key,
        app_area: params.mission.app_area,
        section: params.mission.section,
        issue_type: params.issueType,
        updated_existing_report: updatedExistingReport,
      },
    })

  if (eventError) throw eventError

  return issueReportId
}
