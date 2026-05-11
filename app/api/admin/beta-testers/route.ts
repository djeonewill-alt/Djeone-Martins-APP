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

function getAdminSecret() {
  return process.env.ADMIN_API_SECRET || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ''
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

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('beta_testers')
      .select('id, email, name, is_active, invited_at, first_access_at, created_at, updated_at, notes, founder_number')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ testers: data || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar testadores beta.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
      .select('id, email, name, is_active, invited_at, first_access_at, created_at, updated_at, notes, founder_number')
      .single()

    if (error) throw error

    return NextResponse.json({ tester: data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao cadastrar testador beta.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
      .select('id, email, name, is_active, invited_at, first_access_at, created_at, updated_at, notes, founder_number')
      .single()

    if (error) throw error

    return NextResponse.json({ tester: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar testador beta.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
