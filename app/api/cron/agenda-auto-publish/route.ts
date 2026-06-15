import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const MAX_PUBLISH_PER_RUN = 10

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

    // 2. Check AGENDA_AUTO_PUBLISH_ENABLED
    const isEnabled = process.env.AGENDA_AUTO_PUBLISH_ENABLED === 'true'
    const mode = isEnabled ? 'publish' : 'dry_run'
    console.log(`[agenda-auto-publish] Enabled=${isEnabled}, mode=${mode}`)

    // 3. Fetch eligible episodes
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

    if (!isEnabled) {
      // Dry-run: count eligible but don't update
      console.log(`[agenda-auto-publish] Dry-run: ${eligibleCount} episodes eligible`)
      return NextResponse.json({
        ok: true,
        enabled: false,
        mode: 'dry_run',
        eligible_count: eligibleCount,
        published_count: 0,
        has_more: hasMore,
        checked_at: startTime,
      })
    }

    // 4. Publish eligible episodes
    if (toPublish.length === 0) {
      console.log('[agenda-auto-publish] No eligible episodes to publish')
      return NextResponse.json({
        ok: true,
        enabled: true,
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

    console.log(`[agenda-auto-publish] Published ${published.length} episodes`)

    return NextResponse.json({
      ok: true,
      enabled: true,
      mode: 'publish',
      eligible_count: eligibleCount,
      published_count: published.length,
      published: published.map((p) => ({ id: p.id, title: p.title })),
      skipped,
      has_more: hasMore,
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