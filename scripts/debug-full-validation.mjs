// Full validation: dump ALL fields for tomorrow's episode + daily_quote
//
// Usage: node --env-file=.env.local scripts/debug-full-validation.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variáveis de ambiente Supabase não encontradas.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const EP_ID = '69256e0a-b50c-4c09-b52e-0b8bee49cd56'

async function main() {
  console.log('════════════════════════════════════════════════════════')
  console.log('FULL DUMP — EPISODE + DAILY QUOTE FOR TOMORROW')
  console.log('════════════════════════════════════════════════════════')
  console.log('')

  // ── 1. Full episode dump ──
  console.log('1️⃣  EPISODE — ALL FIELDS')
  console.log('')
  const { data: ep, error: epErr } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', EP_ID)
    .single()

  if (epErr) {
    console.log('ERROR on episode:', epErr.message)
    process.exit(1)
  }
  if (!ep) {
    console.log('EPISODE NOT FOUND')
    process.exit(1)
  }

  const keys = Object.keys(ep).sort()
  for (const key of keys) {
    const val = ep[key]
    if (val === null) {
      console.log(`  ${key}: NULL`)
    } else if (typeof val === 'object') {
      console.log(`  ${key}: ${JSON.stringify(val).slice(0, 120)}`)
    } else if (typeof val === 'string' && val.startsWith('http')) {
      console.log(`  ${key}: ${val.slice(0, 100)}...`)
    } else {
      console.log(`  ${key}: ${val}`)
    }
  }

  console.log('')
  console.log('════════════════════════════════════════════════════════')
  console.log('')

  // ── 2. Full daily_quote dump ──
  console.log('2️⃣  DAILY QUOTE — ALL FIELDS')
  console.log('')
  const { data: quotes, error: qErr } = await supabase
    .from('daily_quotes')
    .select('*')
    .eq('episode_id', EP_ID)

  if (qErr) {
    console.log('ERROR on daily_quotes:', qErr.message)
    process.exit(1)
  }
  if (!quotes || quotes.length === 0) {
    console.log('NO DAILY QUOTES FOUND')
    process.exit(0)
  }

  console.log(`${quotes.length} daily_quote(s) encontrada(s):`)
  console.log('')

  for (const q of quotes) {
    const qKeys = Object.keys(q).sort()
    for (const key of qKeys) {
      const val = q[key]
      if (val === null) {
        console.log(`  ${key}: NULL`)
      } else if (typeof val === 'object') {
        console.log(`  ${key}: ${JSON.stringify(val).slice(0, 200)}`)
      } else if (typeof val === 'string' && val.length > 150) {
        console.log(`  ${key} (len=${val.length}): ${val.slice(0, 140)}...`)
      } else {
        console.log(`  ${key}: ${val}`)
      }
    }
    console.log('')
  }

  // ── 3. Critical checks ──
  console.log('════════════════════════════════════════════════════════')
  console.log('3️⃣  CRITICAL CHECKS')
  console.log('')

  const q = quotes[0]

  console.log(`card_image_url: ${q.card_image_url ? '✅ PRESENT' : '🔴 NULL — will render CSS fallback, not composed card'}`)
  if (q.card_image_url) console.log(`  URL: ${q.card_image_url}`)

  console.log(`background_image_url: ${q.background_image_url ? '✅ PRESENT' : '🔴 NULL — will use gradient fallback'}`)
  if (q.background_image_url) console.log(`  URL: ${q.background_image_url}`)

  console.log(`share_image_url: ${q.share_image_url ? '✅ PRESENT' : '🔴 NULL — WhatsApp fallback will be used'}`)

  console.log(`quote_text: ${q.quote_text ? `✅ (${q.quote_text.length} chars)` : '🔴 MISSING'}`)

  console.log(`status: ${q.status} – ${q.status === 'draft' ? '✅ will be picked up by cron (searches IN scheduled,draft)' : '🔴 unexpected'}`)

  console.log(`date: ${q.date || 'NULL'}`)
  console.log(`scheduled_publish_at: ${q.scheduled_publish_at || 'NULL'}`)
  console.log(`published_at: ${q.published_at || 'NULL'}`)

  console.log(`card_generation_status: ${q.card_generation_status || 'NULL'}`)
  console.log(`generated_card_options: ${q.generated_card_options ? '✅ PRESENT' : '❌ NULL'}`)
  console.log(`source_image_provider: ${q.source_image_provider || 'NULL'}`)
  console.log(`source_image_url: ${q.source_image_url || 'NULL'}`)

  // Check first quote_text 100 chars
  if (q.quote_text) {
    console.log('')
    console.log(`QUOTE TEXT: "${q.quote_text}"`)
  }
}

main()