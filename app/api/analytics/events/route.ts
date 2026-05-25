import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type AnalyticsEventName =
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

const allowedEvents = new Set<AnalyticsEventName>([
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
])

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const maxBodyBytes = 16 * 1024
const maxMetadataBytes = 4 * 1024
const blockedMetadataKeys = [
  'password',
  'token',
  'secret',
  'authorization',
  'auth',
  'p256dh',
  'endpoint',
  'content',
  'request',
]

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null

  const cleaned = value.trim()

  if (!cleaned) return null

  return cleaned.slice(0, maxLength)
}

function cleanUuid(value: unknown) {
  const cleaned = cleanString(value, 64)

  if (!cleaned || !uuidPattern.test(cleaned)) return null

  return cleaned
}

function shouldDropMetadataKey(key: string) {
  const normalized = key.toLowerCase()

  return blockedMetadataKeys.some((blockedKey) => normalized.includes(blockedKey))
}

function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
  if (depth > 3) return null

  if (value === null) return null

  if (typeof value === 'string') {
    return value.slice(0, 300)
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeMetadataValue(item, depth + 1))
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {}

    Object.entries(value as Record<string, unknown>)
      .slice(0, 30)
      .forEach(([key, item]) => {
        const cleanKey = key.trim().slice(0, 64)

        if (!cleanKey || shouldDropMetadataKey(cleanKey)) return

        output[cleanKey] = sanitizeMetadataValue(item, depth + 1)
      })

    return output
  }

  return null
}

function sanitizeMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const sanitized = sanitizeMetadataValue(value) as Record<string, unknown>
  const byteLength = Buffer.byteLength(JSON.stringify(sanitized), 'utf8')

  if (byteLength > maxMetadataBytes) {
    throw new Error('metadata_too_large')
  }

  return sanitized
}

async function getCurrentAuthUserId() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return user?.id || null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    if (Buffer.byteLength(rawBody, 'utf8') > maxBodyBytes) {
      return NextResponse.json({ ok: false }, { status: 413 })
    }

    let body: Record<string, unknown>

    try {
      body = JSON.parse(rawBody) as Record<string, unknown>
    } catch {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const eventName = cleanString(body.event_name, 80) as AnalyticsEventName | null

    if (!eventName || !allowedEvents.has(eventName)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const metadata = sanitizeMetadata(body.metadata)
    const authUserId = await getCurrentAuthUserId()
    const supabaseAdmin = createSupabaseAdminClient()

    let profileId: string | null = null

    if (authUserId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('auth_user_id', authUserId)
        .maybeSingle()

      profileId = typeof profile?.id === 'string' ? profile.id : null
    }

    const { error } = await supabaseAdmin.from('app_events').insert({
      event_name: eventName,
      auth_user_id: authUserId,
      user_id: profileId,
      device_id: cleanString(body.device_id, 128),
      session_id: cleanUuid(body.session_id),
      entity_type: cleanString(body.entity_type, 64),
      entity_id: cleanUuid(body.entity_id),
      source: cleanString(body.source, 80),
      path: cleanString(body.path, 300),
      referrer: cleanString(body.referrer, 500),
      metadata,
    })

    if (error) {
      console.error('[analytics] erro ao inserir evento:', error.message)
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'metadata_too_large') {
      return NextResponse.json({ ok: false }, { status: 413 })
    }

    console.error('[analytics] erro inesperado:', error)

    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
