import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type WebPushLike = {
  setVapidDetails: (
    subject: string,
    publicKey: string,
    privateKey: string
  ) => void
  sendNotification: (
    subscription: {
      endpoint: string
      keys: {
        p256dh: string
        auth: string
      }
    },
    payload: string
  ) => Promise<unknown>
}

const webpush = require('web-push') as WebPushLike

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type ScheduledEpisode = {
  id: string
  title: string
  bible_reference: string | null
  scheduled_publish_at: string | null
}

type ScheduledDailyQuote = {
  id: string
  episode_id: string | null
  quote_text: string
  scheduled_publish_at: string | null
}

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
  const subject =
    process.env.VAPID_SUBJECT ||
    'mailto:djeonewill@gmail.com'

  if (!publicKey || !privateKey) {
    return {
      configured: false,
      reason:
        'VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.',
    }
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  return {
    configured: true,
    reason: 'VAPID keys configured.',
  }
}

async function sendPushNotifications(payload: {
  title: string
  body: string
  url: string
}): Promise<NotificationResult> {
  const config = configureWebPush()

  if (!config.configured) {
    return {
      status: 'skipped',
      reason: config.reason,
      sent: 0,
      failed: 0,
      inactive: 0,
    }
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('is_active', true)

  if (error) {
    throw error
  }

  const subscriptions = (data || []) as PushSubscriptionRecord[]

  if (subscriptions.length === 0) {
    return {
      status: 'no_subscribers',
      reason: 'No active push subscriptions found.',
      sent: 0,
      failed: 0,
      inactive: 0,
    }
  }

  let sent = 0
  let failed = 0
  let inactive = 0

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload)
        )

        sent += 1
      } catch (error: unknown) {
        failed += 1

        const maybeError = error as {
          statusCode?: number
          body?: string
          message?: string
        }

        console.error('Erro ao enviar push:', {
          subscriptionId: subscription.id,
          statusCode: maybeError.statusCode,
          message: maybeError.message,
          body: maybeError.body,
        })

        if (maybeError.statusCode === 404 || maybeError.statusCode === 410) {
          inactive += 1

          await supabase
            .from('push_subscriptions')
            .update({
              is_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscription.id)
        }
      }
    })
  )

  return {
    status: 'completed',
    reason: 'Push notification process completed.',
    sent,
    failed,
    inactive,
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date().toISOString()

    const { data: scheduledEpisodes, error: episodesFetchError } = await supabase
      .from('episodes')
      .select('id, title, bible_reference, scheduled_publish_at')
      .in('status', ['scheduled', 'draft'])
      .not('scheduled_publish_at', 'is', null)
      .lte('scheduled_publish_at', now)

    if (episodesFetchError) throw episodesFetchError

    const episodesToPublish = (scheduledEpisodes || []) as ScheduledEpisode[]
    const episodeIds = episodesToPublish.map((episode) => episode.id)

    if (episodeIds.length > 0) {
      const { error: episodesUpdateError } = await supabase
        .from('episodes')
        .update({
          status: 'published',
          scheduled_publish_at: null,
          published_at: now,
          show_on_today: true,
        })
        .in('id', episodeIds)

      if (episodesUpdateError) throw episodesUpdateError

      console.log(
        `Published ${episodesToPublish.length} episode(s):`,
        episodesToPublish.map((episode) => episode.title)
      )
    }

    const { data: scheduledQuotes, error: quotesFetchError } = await supabase
      .from('daily_quotes')
      .select('id, episode_id, quote_text, scheduled_publish_at')
      .eq('status', 'scheduled')
      .not('scheduled_publish_at', 'is', null)
      .lte('scheduled_publish_at', now)

    if (quotesFetchError) throw quotesFetchError

    const quotesToPublish = (scheduledQuotes || []) as ScheduledDailyQuote[]
    const quoteIds = new Set<string>()

    quotesToPublish.forEach((quote) => {
      quoteIds.add(quote.id)
    })

    if (episodeIds.length > 0) {
      const { data: quotesLinkedToEpisodes, error: linkedQuotesError } =
        await supabase
          .from('daily_quotes')
          .select('id, episode_id, quote_text, scheduled_publish_at')
          .eq('status', 'scheduled')
          .in('episode_id', episodeIds)

      if (linkedQuotesError) throw linkedQuotesError

      ;(quotesLinkedToEpisodes || []).forEach((quote) => {
        quoteIds.add(quote.id)
      })
    }

    const quoteIdsArray = Array.from(quoteIds)

    if (quoteIdsArray.length > 0) {
      const { error: quotesUpdateError } = await supabase
        .from('daily_quotes')
        .update({
          status: 'published',
          scheduled_publish_at: null,
          published_at: now,
        })
        .in('id', quoteIdsArray)

      if (quotesUpdateError) throw quotesUpdateError

      console.log(`Published ${quoteIdsArray.length} daily quote(s)`)
    }

    const hasPublishedAnything =
      episodesToPublish.length > 0 || quoteIdsArray.length > 0

    let notificationResult: NotificationResult = {
      status: 'not_sent',
      reason: 'No scheduled content published.',
      sent: 0,
      failed: 0,
      inactive: 0,
    }

    if (hasPublishedAnything) {
      const firstEpisode = episodesToPublish[0]

      const title = firstEpisode
        ? 'Novo devocional disponível'
        : 'Palavra do Dia disponível'

      const body = firstEpisode
        ? `${firstEpisode.title}${firstEpisode.bible_reference ? ` — ${firstEpisode.bible_reference}` : ''}`
        : 'A Palavra do Dia já está disponível no app.'

      const url = firstEpisode
        ? `/ep/${firstEpisode.id}`
        : '/'

      notificationResult = await sendPushNotifications({
        title,
        body,
        url,
      })
    }

    return NextResponse.json({
      success: true,
      message: hasPublishedAnything
        ? 'Scheduled content published successfully'
        : 'No scheduled content to publish',
      published: {
        episodes_count: episodesToPublish.length,
        daily_quotes_count: quoteIdsArray.length,
      },
      episodes: episodesToPublish,
      daily_quote_ids: quoteIdsArray,
      notifications: notificationResult,
      checked_at: now,
    })
  } catch (error) {
    console.error('Error publishing scheduled content:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
