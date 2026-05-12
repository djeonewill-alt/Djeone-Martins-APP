import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type BetaTesterPayload = {
  email?: unknown
  name?: unknown
  notes?: unknown
  founder_number?: unknown
  is_active?: unknown
  id?: unknown
}

type BetaTesterRecord = {
  id: string
  email: string
  name: string | null
  is_active: boolean
  invited_at: string | null
  first_access_at: string | null
  created_at: string | null
  updated_at: string | null
  notes: string | null
  founder_number: number | null
}

type BetaTesterProfileRecord = {
  tester_id: string
  accepted_beta_terms: boolean | null
  accepted_beta_terms_at: string | null
  device_label: string | null
  operating_system: string | null
  browser: string | null
  access_mode: string | null
  user_agent: string | null
  language: string | null
  screen_width: number | null
  screen_height: number | null
  viewport_width: number | null
  viewport_height: number | null
  notification_permission: string | null
  push_supported: boolean | null
  is_pwa_standalone: boolean | null
  app_version: string | null
  last_seen_at: string | null
}

type BetaMissionResultRecord = {
  tester_id: string
  mission_key: string
  app_area: string
  section: string | null
  status: string
  report: string | null
  technical_snapshot: unknown
  started_at: string | null
  completed_at: string | null
  updated_at: string | null
}

type BetaFinalFeedbackRecord = {
  tester_id: string
  overall_experience: string | null
  favorite_area: string | null
  most_confusing_area: string | null
  biggest_problem: string | null
  pastoral_feedback: string | null
  would_recommend: boolean | null
  submitted_at: string | null
}

const testerSelect =
  'id, email, name, is_active, invited_at, first_access_at, created_at, updated_at, notes, founder_number'

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

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function getOptionalText(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function getFounderNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null

  const numberValue = Number(value)

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    throw new Error('Numero de fundador invalido.')
  }

  return numberValue
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function summarizeResults(results: BetaMissionResultRecord[]) {
  const completedStatuses = ['success', 'problem', 'confusing']
  const resultDates = results
    .map((result) => result.updated_at || result.completed_at || result.started_at)
    .filter(Boolean)
    .sort()

  return {
    total_results: results.length,
    completed_count: results.filter((result) => completedStatuses.includes(result.status)).length,
    problem_count: results.filter((result) => result.status === 'problem').length,
    confusing_count: results.filter((result) => result.status === 'confusing').length,
    postponed_count: results.filter((result) => result.status === 'postponed').length,
    started_count: results.filter((result) => result.status === 'started').length,
    last_result_at: resultDates.length > 0 ? resultDates[resultDates.length - 1] : null,
  }
}

async function enrichTesters(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  testers: BetaTesterRecord[]
) {
  const testerIds = testers.map((tester) => tester.id)

  if (testerIds.length === 0) return []

  const [
    { data: profiles, error: profilesError },
    { data: results, error: resultsError },
    { data: feedbacks, error: feedbacksError },
  ] =
    await Promise.all([
      supabase
        .from('beta_tester_profiles')
        .select(
          'tester_id, accepted_beta_terms, accepted_beta_terms_at, device_label, operating_system, browser, access_mode, user_agent, language, screen_width, screen_height, viewport_width, viewport_height, notification_permission, push_supported, is_pwa_standalone, app_version, last_seen_at'
        )
        .in('tester_id', testerIds),
      supabase
        .from('beta_mission_results')
        .select(
          'tester_id, mission_key, app_area, section, status, report, technical_snapshot, started_at, completed_at, updated_at'
        )
        .in('tester_id', testerIds)
        .order('updated_at', { ascending: false }),
      supabase
        .from('beta_final_feedback')
        .select(
          'tester_id, overall_experience, favorite_area, most_confusing_area, biggest_problem, pastoral_feedback, would_recommend, submitted_at'
        )
        .in('tester_id', testerIds)
        .order('submitted_at', { ascending: false }),
    ])

  if (profilesError) throw profilesError
  if (resultsError) throw resultsError
  if (feedbacksError) throw feedbacksError

  const profilesByTester = new Map<string, BetaTesterProfileRecord>()
  ;((profiles || []) as BetaTesterProfileRecord[]).forEach((profile) => {
    profilesByTester.set(profile.tester_id, profile)
  })

  const resultsByTester = new Map<string, BetaMissionResultRecord[]>()
  ;((results || []) as BetaMissionResultRecord[]).forEach((result) => {
    const current = resultsByTester.get(result.tester_id) || []
    current.push(result)
    resultsByTester.set(result.tester_id, current)
  })

  const feedbackByTester = new Map<string, BetaFinalFeedbackRecord>()
  ;((feedbacks || []) as BetaFinalFeedbackRecord[]).forEach((feedback) => {
    if (!feedbackByTester.has(feedback.tester_id)) {
      feedbackByTester.set(feedback.tester_id, feedback)
    }
  })

  return testers.map((tester) => {
    const testerResults = resultsByTester.get(tester.id) || []

    return {
      ...tester,
      profile: profilesByTester.get(tester.id) || null,
      results: testerResults,
      summary: summarizeResults(testerResults),
      feedback: feedbackByTester.get(tester.id) || null,
    }
  })
}

export async function GET(request: NextRequest) {
  const authError = getAdminAuthError(request)
  if (authError) return authError

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('beta_testers')
      .select(testerSelect)
      .order('created_at', { ascending: false })

    if (error) throw error

    const testers = await enrichTesters(supabase, (data || []) as BetaTesterRecord[])

    return NextResponse.json({ testers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar testadores beta.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = getAdminAuthError(request)
  if (authError) return authError

  try {
    const payload = (await request.json()) as BetaTesterPayload
    const email = normalizeEmail(payload.email)

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Informe um e-mail valido.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: existing, error: existingError } = await supabase
      .from('beta_testers')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingError) throw existingError

    if (existing?.id) {
      return NextResponse.json(
        { error: 'Este e-mail ja esta cadastrado no Beta Fechado.' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('beta_testers')
      .insert({
        email,
        name: getOptionalText(payload.name),
        notes: getOptionalText(payload.notes),
        founder_number: getFounderNumber(payload.founder_number),
        is_active: true,
      })
      .select(testerSelect)
      .single()

    if (error) throw error

    const [tester] = await enrichTesters(supabase, [data as BetaTesterRecord])

    return NextResponse.json({ tester }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao cadastrar testador beta.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = getAdminAuthError(request)
  if (authError) return authError

  try {
    const payload = (await request.json()) as BetaTesterPayload
    const id = typeof payload.id === 'string' ? payload.id : ''

    if (!id) {
      return NextResponse.json({ error: 'ID do testador nao informado.' }, { status: 400 })
    }

    if (typeof payload.is_active !== 'boolean') {
      return NextResponse.json({ error: 'Status ativo/inativo invalido.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('beta_testers')
      .update({
        is_active: payload.is_active,
      })
      .eq('id', id)
      .select(testerSelect)
      .single()

    if (error) throw error

    const [tester] = await enrichTesters(supabase, [data as BetaTesterRecord])

    return NextResponse.json({ tester })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar testador beta.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
