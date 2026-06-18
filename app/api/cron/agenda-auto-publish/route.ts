import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const MAX_PUBLISH_PER_RUN = 5

type EligibleEpisode = {
  id: string
  title: string | null
  series_id: string | null
  audio_url: string | null
  editorial_status: string | null
  status: string | null
  calendar_scheduled_at: string | null
}

type PublishResult = {
  id: string
  title: string | null
  reason?: string
}

// ── Web Push ──────────────────────────────────────────────
type WebPushLike = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
  ) => Promise<unknown>
}

const webpush = require('web-push') as WebPushLike

type PushSubscriptionRecord = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

type NotificationResult = {
  status: string
  reason: string
  sent: number
  failed: number
  inactive: number
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:djeonewill@gmail.com'

  if (!publicKey || !privateKey) {
    return {
      configured: false,
      reason: 'VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.',
    }
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  return { configured: true, reason: 'VAPID keys configured.' }
}

async function sendPushNotifications(payload: {
  title: string
  body: string
  url: string
}): Promise<NotificationResult> {
  const config = configureWebPush()

  if (!config.configured) {
    console.log('[agenda-auto-publish] Push skipped:', config.reason)
    return { status: 'skipped', reason: config.reason, sent: 0, failed: 0, inactive: 0 }
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('is_active', true)

  if (error) throw error

  const subscriptions = (data || []) as PushSubscriptionRecord[]

  if (subscriptions.length === 0) {
    return { status: 'no_subscribers', reason: 'No active push subscriptions found.', sent: 0, failed: 0, inactive: 0 }
  }

  const payloadJson = JSON.stringify(payload)

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadJson,
        )
        return { id: sub.id, ok: true }
      } catch (err: unknown) {
        const e = err as { statusCode?: number; body?: string; message?: string }
        console.error('[agenda-auto-publish] Push error:', {
          subscriptionId: sub.id,
          statusCode: e.statusCode,
          message: e.message,
          body: e.body,
        })

        if (e.statusCode === 404 || e.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', sub.id)
          return { id: sub.id, ok: false, inactive: true }
        }

        return { id: sub.id, ok: false, inactive: false }
      }
    }),
  )

  let sent = 0
  let failed = 0
  let inactive = 0

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.ok) {
      sent++
    } else if (r.status === 'fulfilled' && !r.value.ok) {
      failed++
      if (r.value.inactive) inactive++
    } else {
      failed++
    }
  }

  return { status: 'completed', reason: 'Push notification process completed.', sent, failed, inactive }
}

// ── Supabase ──────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function GET(request: NextRequest) {
  const startTime = new Date().toISOString()
  console.log(`[agenda-auto-publish] Starting at ${startTime}`)

  try {
    // 1. Validate cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('[agenda-auto-publish] Unauthorized attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Fetch eligible episodes
    // Se o CRON_SECRET foi validado, a publicação é sempre real (sem dry-run).
    // O controle de ativação fica na Vercel (Cron Job pode ser pausado pelo dashboard).
    console.log('[agenda-auto-publish] Cron triggered — fetching eligible episodes...')

    const now = new Date().toISOString()

    const { data: eligible, error: fetchError } = await supabase
      .from('episodes')
      .select('id, title, series_id, audio_url, editorial_status, status, calendar_scheduled_at')
      .eq('editorial_status', 'calendar_scheduled')
      .eq('status', 'draft')
      .not('audio_url', 'is', null)
      .not('title', 'is', null)
      .not('series_id', 'is', null)
      .lte('calendar_scheduled_at', now)
      .order('calendar_scheduled_at', { ascending: true })
      .limit(MAX_PUBLISH_PER_RUN + 1) // fetch one extra to detect has_more

    if (fetchError) throw fetchError

    const eligibleEpisodes = (eligible || []) as EligibleEpisode[]
    const eligibleCount = eligibleEpisodes.length
    const hasMore = eligibleCount > MAX_PUBLISH_PER_RUN
    const toPublish = eligibleEpisodes.slice(0, MAX_PUBLISH_PER_RUN)

    console.log(`[agenda-auto-publish] Eligible: ${eligibleCount}, to publish: ${toPublish.length}, hasMore: ${hasMore}`)

    const skipped: PublishResult[] = []
    const published: PublishResult[] = []

    // 3. Publish eligible episodes
    if (toPublish.length === 0) {
      console.log('[agenda-auto-publish] No eligible episodes to publish')
      return NextResponse.json({
        ok: true,
        mode: 'publish',
        eligible_count: 0,
        published_count: 0,
        skipped: [],
        has_more: false,
        checked_at: startTime,
      })
    }

    const publishIds = toPublish.map((ep) => ep.id)
    const publishNow = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('episodes')
      .update({
        status: 'published',
        editorial_status: 'published',
        published_at: publishNow,
      })
      .in('id', publishIds)
      .eq('editorial_status', 'calendar_scheduled')
      .eq('status', 'draft')

    if (updateError) throw updateError

    toPublish.forEach((ep) => {
      published.push({ id: ep.id, title: ep.title })
    })

    // 4. Notificações Push
    const firstPublished = published[0]
    const notificationResult: NotificationResult = firstPublished
      ? await sendPushNotifications({
          title: 'Novo devocional disponível',
          body: `${firstPublished.title || 'Episódio'} — já disponível no app.`,
          url: `/ep/${firstPublished.id}`,
        })
      : { status: 'no_content', reason: 'No episodes published this run.', sent: 0, failed: 0, inactive: 0 }

    console.log('[agenda-auto-publish] Notification result:', notificationResult)

    // 5. Propagar status 'published' para daily_quotes vinculadas aos episódios publicados
    if (publishIds.length > 0) {
      const { error: quotesError } = await supabase
        .from('daily_quotes')
        .update({
          status: 'published',
          published_at: publishNow,
          date: publishNow.split('T')[0],
        })
        .in('episode_id', publishIds)
        .eq('status', 'draft')

      if (quotesError) {
        console.error('[agenda-auto-publish] Erro ao publicar daily_quotes:', quotesError)
        // Não quebra — os episódios já foram publicados
      } else {
        console.log(`[agenda-auto-publish] Daily quotes sincronizadas para ${publishIds.length} episódio(s)`)
      }
    }

    console.log(`[agenda-auto-publish] Published ${published.length} episodes`)

    return NextResponse.json({
      ok: true,
      mode: 'publish',
      eligible_count: eligibleCount,
      published_count: published.length,
      published: published.map((p) => ({ id: p.id, title: p.title })),
      skipped,
      has_more: hasMore,
      notifications: notificationResult,
      checked_at: startTime,
    })
  } catch (error) {
    console.error('[agenda-auto-publish] Error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        checked_at: startTime,
      },
      { status: 500 }
    )
  }
}