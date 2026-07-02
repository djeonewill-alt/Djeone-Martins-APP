// Send a manual push notification to all subscribed users
//
// USAGE:
//   node --env-file=.env.local scripts/send-manual-notification.mjs
//
// This script replicates the same logic used by /api/cron/publish-scheduled

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

// ── Supabase client ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variáveis de ambiente Supabase não encontradas.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Web Push (same logic as cron route.ts) ──────────────────────────────────
import webpush from 'web-push'

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || process.env.VAPID_EMAIL || 'mailto:djeonewill@gmail.com'

  if (!publicKey || !privateKey) {
    console.error('❌ VAPID keys not configured.')
    return false
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}

async function sendPushNotifications(payload) {
  const configOk = configureWebPush()
  if (!configOk) {
    console.log('❌ Push skipped: VAPID keys not configured.')
    return { sent: 0, failed: 0, inactive: 0 }
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('is_active', true)

  if (error) {
    console.error('❌ Error fetching subscriptions:', error.message)
    return { sent: 0, failed: 0, inactive: 0 }
  }

  const subscriptions = data || []

  if (subscriptions.length === 0) {
    console.log('❌ No active push subscriptions found.')
    return { sent: 0, failed: 0, inactive: 0 }
  }

  console.log(`   Sending to ${subscriptions.length} subscriber(s)...`)
  console.log('')

  let sent = 0
  let failed = 0
  let inactive = 0

  const payloadJson = JSON.stringify(payload)

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payloadJson,
      )
      sent++
      console.log(`   ✅ Sent to: ${sub.id.slice(0, 8)}...`)
    } catch (err) {
      failed++
      const statusCode = err.statusCode || err.status || 0
      const reason = err.body || err.message || 'Unknown'

      console.error(`   ❌ Failed (${statusCode}): ${sub.id.slice(0, 8)}... — ${reason.slice(0, 100)}`)

      // Mark expired/unsubscribed as inactive (same logic as cron)
      if (statusCode === 404 || statusCode === 410) {
        inactive++
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', sub.id)
        console.log(`      → Marked as inactive.`)
      }
    }
  }

  return { sent, failed, inactive }
}

// ── Interactive prompt ───────────────────────────────────────────────────────
function askQuestion(rl, question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())))
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('════════════════════════════════════════════════════════')
  console.log('SEND MANUAL PUSH NOTIFICATION')
  console.log('════════════════════════════════════════════════════════')
  console.log('')

  // Count active subscriptions first
  const { data: subs, error: countError } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('is_active', true)

  if (countError) {
    console.error('❌ Error:', countError.message)
    process.exit(1)
  }

  const count = subs?.length || 0

  if (count === 0) {
    console.log('No active subscribers. Nothing to send.')
    process.exit(0)
  }

  console.log(`📱 Found ${count} active push subscription(s).`)
  console.log('')
  console.log('📋 Notification content:')
  console.log('   Title: "Ajustes concluídos ✅"')
  console.log('   Body:  "Identificamos e corrigimos um problema técnico desta')
  console.log('           manhã. O devocional de hoje, \'Bom Ânimo na Tribulação\',')
  console.log('           já está disponível normalmente."')
  console.log('   URL:   /ep/b803cfe6-2622-4c2a-aa2d-93eba8270bc8')
  console.log('')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const confirm = await askQuestion(rl, `Isso vai enviar notificação para ${count} usuário(s) inscrito(s). Confirma? (s/n): `)
  rl.close()

  if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'sim') {
    console.log('Cancelado.')
    process.exit(0)
  }

  console.log('')
  console.log('📤 Enviando...')
  console.log('')

  const result = await sendPushNotifications({
    title: 'Ajustes concluídos ✅',
    body: "Identificamos e corrigimos um problema técnico desta manhã. O devocional de hoje, 'Bom Ânimo na Tribulação', já está disponível normalmente.",
    url: '/ep/b803cfe6-2622-4c2a-aa2d-93eba8270bc8',
  })

  console.log('')
  console.log('════════════════════════════════════════════════════════')
  console.log('RESULT')
  console.log('════════════════════════════════════════════════════════')
  console.log(`   ✅ Sent:     ${result.sent}`)
  console.log(`   ❌ Failed:   ${result.failed}`)
  if (result.inactive > 0) {
    console.log(`   🔕 Inactive: ${result.inactive} (marked as inactive)`)
  }
  console.log('')
  console.log('Done.')
}

main()