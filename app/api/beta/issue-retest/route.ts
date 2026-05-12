import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type RetestAnswer = 'success' | 'problem' | 'confusing'

type RetestPayload = {
  issueReportId?: unknown
  answer?: unknown
  message?: unknown
  technicalSnapshot?: unknown
}

const answerEventTypes: Record<RetestAnswer, string> = {
  success: 'retest_success',
  problem: 'retest_problem',
  confusing: 'retest_confusing',
}

function normalizeAnswer(value: unknown) {
  if (value === 'success' || value === 'problem' || value === 'confusing') {
    return value
  }

  return null
}

function getOptionalMessage(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

async function getAuthenticatedUser(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!error && user) return user

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : ''

  if (!token) return null

  const supabaseAdmin = createSupabaseAdminClient()
  const {
    data: { user: tokenUser },
    error: tokenError,
  } = await supabaseAdmin.auth.getUser(token)

  if (tokenError) return null

  return tokenUser
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const payload = (await request.json()) as RetestPayload
    const issueReportId = typeof payload.issueReportId === 'string' ? payload.issueReportId : ''
    const answer = normalizeAnswer(payload.answer)

    if (!issueReportId) {
      return NextResponse.json({ error: 'Relato de reteste não informado.' }, { status: 400 })
    }

    if (!answer) {
      return NextResponse.json({ error: 'Resposta de reteste inválida.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: issueReport, error: issueError } = await supabase
      .from('beta_issue_reports')
      .select('id, tester_id, auth_user_id, mission_key, app_area, section, status')
      .eq('id', issueReportId)
      .single()

    if (issueError) throw issueError

    if (issueReport.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
    }

    if (issueReport.status !== 'retest_requested') {
      return NextResponse.json(
        { error: 'Este relato não está liberado para reteste.' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const nextStatus = answer === 'success' ? 'resolved' : 'still_problem'
    const fallbackMessage =
      answer === 'success'
        ? 'O testador informou que agora funcionou.'
        : answer === 'problem'
          ? 'O testador informou que ainda deu problema.'
          : 'O testador informou que ainda não entendeu.'
    const message = getOptionalMessage(payload.message, fallbackMessage)

    const { error: eventError } = await supabase
      .from('beta_issue_events')
      .insert({
        issue_report_id: issueReport.id,
        tester_id: issueReport.tester_id,
        auth_user_id: issueReport.auth_user_id,
        event_type: answerEventTypes[answer],
        message,
        status_from: 'retest_requested',
        status_to: nextStatus,
        metadata: {
          mission_key: issueReport.mission_key,
          app_area: issueReport.app_area,
          section: issueReport.section,
          previous_status: 'retest_requested',
          retest_answer: answer,
          technical_snapshot: payload.technicalSnapshot || null,
          timestamp: now,
        },
      })

    if (eventError) throw eventError

    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
    }

    if (nextStatus === 'resolved') {
      updatePayload.resolved_at = now
    }

    const { data: updatedReport, error: updateError } = await supabase
      .from('beta_issue_reports')
      .update(updatePayload)
      .eq('id', issueReport.id)
      .select(
        'id, tester_id, auth_user_id, mission_result_id, mission_key, app_area, section, issue_type, status, priority, report, technical_snapshot, admin_notes, retest_requested_at, resolved_at, created_at, updated_at'
      )
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      issueReport: {
        ...updatedReport,
        events: [],
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao enviar reteste beta.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
