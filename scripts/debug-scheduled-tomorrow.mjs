// Debug: check episodes scheduled to publish tomorrow and their daily_quotes
//
// Usage: node --env-file=.env.local scripts/debug-scheduled-tomorrow.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variáveis de ambiente Supabase não encontradas.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  // Get tomorrow's date in UTC (midnight)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(3, 0, 0, 0) // 3h UTC = midnight BRT

  const dayAfter = new Date(tomorrow)
  dayAfter.setDate(dayAfter.getDate() + 1)

  const tomorrowStart = tomorrow.toISOString()
  const tomorrowEnd = dayAfter.toISOString()

  console.log('════════════════════════════════════════════════════════')
  console.log('DEBUG — EPISÓDIOS AGENDADOS PARA AMANHÃ')
  console.log('════════════════════════════════════════════════════════')
  console.log(`Data início (UTC): ${tomorrowStart}`)
  console.log(`Data fim    (UTC): ${tomorrowEnd}`)
  console.log('')

  // Find episodes with scheduled_publish_at for tomorrow
  const { data: scheduled, error } = await supabase
    .from('episodes')
    .select('id, title, status, editorial_status, scheduled_publish_at, calendar_scheduled_at')
    .in('status', ['scheduled', 'draft'])
    .not('scheduled_publish_at', 'is', null)
    .gte('scheduled_publish_at', tomorrowStart)
    .lt('scheduled_publish_at', tomorrowEnd)
    .order('scheduled_publish_at', { ascending: true })

  if (error) {
    console.log('ERROR:', error.message)
    process.exit(1)
  }

  if (!scheduled || scheduled.length === 0) {
    console.log('Nenhum episódio agendado para amanhã.')
    
    // Fallback: check ALL episodes with scheduled_publish_at in the future
    console.log('')
    console.log('Verificando TODOS os episódios com scheduled_publish_at futuro...')
    const { data: allFuture } = await supabase
      .from('episodes')
      .select('id, title, status, editorial_status, scheduled_publish_at, calendar_scheduled_at')
      .in('status', ['scheduled', 'draft'])
      .not('scheduled_publish_at', 'is', null)
      .gte('scheduled_publish_at', now.toISOString())
      .order('scheduled_publish_at', { ascending: true })
      .limit(10)

    if (allFuture && allFuture.length > 0) {
      console.log(`${allFuture.length} episódio(s) agendado(s) no futuro:`)
      for (const ep of allFuture) {
        console.log(`  - "${ep.title}" → ${ep.scheduled_publish_at} (status: ${ep.status}, editorial: ${ep.editorial_status})`)
      }
    } else {
      console.log('Nenhum episódio agendado no futuro.')
    }
    process.exit(0)
  }

  console.log(`${scheduled.length} episódio(s) agendado(s) para amanhã:`)
  console.log('')

  for (const ep of scheduled) {
    console.log(`📅 "${ep.title}"`)
    console.log(`   ID: ${ep.id}`)
    console.log(`   status: ${ep.status}`)
    console.log(`   editorial_status: ${ep.editorial_status}`)
    console.log(`   scheduled_publish_at: ${ep.scheduled_publish_at}`)
    console.log(`   calendar_scheduled_at: ${ep.calendar_scheduled_at || 'N/A'}`)

    // Check for linked daily_quotes
    const { data: quotes } = await supabase
      .from('daily_quotes')
      .select('id, quote_text, status, published_at')
      .eq('episode_id', ep.id)

    if (!quotes || quotes.length === 0) {
      console.log(`   🔴 NENHUMA daily_quote vinculada!`)
    } else {
      console.log(`   🟢 ${quotes.length} daily_quote(s) vinculada(s):`)
      quotes.forEach(q => {
        console.log(`      - status: ${q.status} | texto: "${(q.quote_text || '').slice(0, 50)}..."`)
      })
    }
    console.log('')
  }
}

main()