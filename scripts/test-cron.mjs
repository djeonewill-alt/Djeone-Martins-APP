// Teste manual do cron de publicação agendada
// Simula a chamada que a Vercel faz ao endpoint de cron
// Uso: node --env-file=.env.local scripts/test-cron.mjs

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET não encontrado no .env.local')
  console.log('   Verifique se a variável CRON_SECRET está definida.')
  process.exit(1)
}

console.log('══════════════════════════════════════════════════════════════')
console.log('TESTE MANUAL DO CRON — AGENDA AUTO PUBLISH')
console.log('══════════════════════════════════════════════════════════════')
console.log(`Base URL: ${BASE_URL}`)
console.log(`CRON_SECRET: ${CRON_SECRET.slice(0, 6)}...`)
console.log('')

async function main() {
  const startTime = Date.now()

  try {
    const response = await fetch(
      `${BASE_URL}/api/cron/agenda-auto-publish`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      }
    )

    const durationMs = Date.now() - startTime
    const data = await response.json()

    console.log(`Status HTTP: ${response.status}`)
    console.log(`Duração: ${durationMs}ms`)
    console.log('')

    console.log('--- RESPOSTA ---')
    console.log(JSON.stringify(data, null, 2))
    console.log('')

    // Análise
    if (response.status === 401) {
      console.log('❌ ERRO 401 — CRON_SECRET inválido ou incorreto')
      console.log('   Verifique se o CRON_SECRET no .env.local é o mesmo configurado na Vercel')
    } else if (data.ok === false) {
      console.log('❌ Cron falhou:', data.error)
    } else if (data.mode === 'dry_run') {
      console.log('⚠️  DRY RUN — AGENDA_AUTO_PUBLISH_ENABLED não está como "true"')
      console.log(`   Episódios elegíveis encontrados: ${data.eligible_count}`)
      if (data.eligible_count > 0) {
        console.log('   ⚠️  Há episódios elegíveis mas não foram publicados (dry-run)')
        console.log('   Para ativar: defina AGENDA_AUTO_PUBLISH_ENABLED=true no .env.local e na Vercel')
      }
    } else if (data.mode === 'publish') {
      console.log(`✅ Cron executado com sucesso: ${data.published_count} episódios publicados`)
      if (data.published_count === 0 && data.eligible_count === 0) {
        console.log('   Nenhum episódio elegível — isso pode significar:')
        console.log('   1. Nenhum episódio com editorial_status = "calendar_scheduled" E status = "draft"')
        console.log('   2. O horário agendado ainda não chegou')
        console.log('   3. Os episódios não têm audio_url, title ou series_id preenchidos')
      }
    }

    // Diagnóstico adicional
    console.log('')
    console.log('--- DIAGNÓSTICO ---')
    console.log('Verifique:')
    console.log('  1. editorial_status do episódio precisa ser "calendar_scheduled"')
    console.log('  2. status do episódio precisa ser "draft"')
    console.log('  3. calendar_scheduled_at precisa ser <= agora (UTC)')
    console.log('  4. audio_url, title, series_id precisam estar preenchidos')
    console.log('  5. AGENDA_AUTO_PUBLISH_ENABLED=true no environment')

  } catch (error) {
    console.error('❌ Erro ao chamar o cron:', error.message)
  }
}

main()