// Debug: check specific episode details (read-only)
//
// Usage: node --env-file=.env.local scripts/debug-episode-details.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variáveis de ambiente Supabase não encontradas.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const EP_ID = 'b803cfe6-2622-4c2a-aa2d-93eba8270bc8'

async function main() {
  console.log(`Checking episode: ${EP_ID}`)
  console.log('')

  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', EP_ID)
    .single()

  if (error) {
    console.log('ERROR:', error.message)
    process.exit(1)
  }

  if (!data) {
    console.log('NOT FOUND')
    process.exit(0)
  }

  console.log('Fields:')
  console.log(`  title: ${data.title}`)
  console.log(`  status: ${data.status}`)
  console.log(`  editorial_status: ${data.editorial_status}`)
  console.log(`  show_on_today: ${data.show_on_today}`)
  console.log(`  bible_reference: ${data.bible_reference}`)
  console.log(`  series_id: ${data.series_id}`)
  console.log(`  episode_number: ${data.episode_number}`)
  console.log(`  audio_url: ${data.audio_url ? '✅ present' : '❌ missing'}`)
  console.log(`  audio_url_compatible: ${data.audio_url_compatible ? '✅ present' : '❌ missing'}`)
  console.log(`  cover_image_url: ${data.cover_image_url ? '✅ present' : '❌ missing'}`)
  console.log(`  og_image_url: ${data.og_image_url ? '✅ present' : '❌ missing'}`)
  console.log(`  transcription_text: ${data.transcription_text ? `✅ present (${data.transcription_text.length} chars)` : '❌ missing'}`)
  console.log(`  transcription_status: ${data.transcription_status || 'N/A'}`)
  console.log(`  transcription_segments: ${data.transcription_segments ? `✅ present (${data.transcription_segments.length} segments)` : '❌ missing'}`)
  console.log(`  daily_quote_status: ${data.daily_quote_status || 'N/A'}`)
  console.log(`  daily_quote_suggestions: ${data.daily_quote_suggestions ? '✅ present' : '❌ missing'}`)
  console.log(`  calendar_scheduled_at: ${data.calendar_scheduled_at || 'N/A'}`)
  console.log(`  scheduled_publish_at: ${data.scheduled_publish_at || 'N/A'}`)
  console.log(`  published_at: ${data.published_at || 'N/A'}`)
  console.log(`  created_at: ${data.created_at || 'N/A'}`)
  console.log(`  description: ${data.description || 'N/A'}`)
  console.log(`  internal_notes: ${data.internal_notes || 'N/A'}`)
  console.log(`  duration_seconds: ${data.duration_seconds || 'N/A'}`)
}

main()