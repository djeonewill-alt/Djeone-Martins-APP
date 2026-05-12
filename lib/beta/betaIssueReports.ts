import { supabase } from '@/lib/supabase'
import type { BetaMission } from '@/components/tester/types'
import type { BetaTester } from '@/lib/beta/betaTester'

type IssueType = 'problem' | 'confusing'

const openIssueStatuses = ['new', 'reviewing', 'fixing', 'retest_requested', 'still_problem']

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
