// Teste end-to-end da correção do Cron de Publicação Automática
// 1. Encontra um episódio no repositório
// 2. Agenda para hoje em horário passado com scheduled_publish_at preenchido
// 3. Dispara o cron publish-scheduled
// 4. Verifica se o episódio foi publicado
//
// Uso: node --env-file=.env.local scripts/test-cron-fix.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const CRON_SECRET = process.env.CRON_SECRET
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variáveis de ambiente Supabase não encontradas.')
  process.exit(1)
}

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET não encontrado no .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

console.log('════════════════════════════════════════════════════════')
console.log('TESTE END-TO-END — CRON DE PUBLICAÇÃO AUTOMÁTICA')
console.log('════════════════════════════════════════════════════════')
console.log(`Base URL: ${BASE_URL}`)
console.log('')

async function main() {
  // ── Passo 1: Encontrar um episódio no repositório ──
  console.log('1️⃣  Buscando episódio no repositório...')

  const { data: repoEpisodes, error: repoError } = await supabase
    .from('episodes')
    .select('id, title, series_id, audio_url, editorial_status, status, scheduled_publish_at, calendar_scheduled_at')
    .eq('editorial_status', 'repository')
    .not('audio_url', 'is', null)
    .not('title', 'is', null)
    .not('series_id', 'is', null)
    .limit(1)

  if (repoError) {
    console.error('❌ Erro ao buscar episódios:', repoError.message)
    process.exit(1)
  }

  if (!repoEpisodes || repoEpisodes.length === 0) {
    console.log('⚠️  Nenhum episódio no repositório com todos os campos preenchidos.')
    console.log('   Para testar, crie um episódio via "Salvar no repositório" no Novo Episódio.')
    console.log('')
    console.log('   Requisitos: audio_url, title, series_id preenchidos.')
    process.exit(0)
  }

  const episode = repoEpisodes[0]
  console.log(`   ✅ Episódio encontrado: "${episode.title}" (id: ${episode.id})`)
  console.log(`      Série: ${episode.series_id}`)
  console.log(`      Status atual: ${episode.status}, Editorial: ${episode.editorial_status}`)
  console.log('')

  // ── Passo 2: Agendar para hoje em horário passado ──
  // Usa 10:00 da manhã (já passou, pois agora é horário de Brasília ~13h)
  const today = new Date()
  const pastTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0)
  const isoOffset = `${pastTime.getFullYear()}-${String(pastTime.getMonth() + 1).padStart(2, '0')}-${String(pastTime.getDate()).padStart(2, '0')}T10:00:00-03:00`

  console.log('2️⃣  Agendando episódio para hoje às 10:00 (horário já passou)...')
  console.log(`   Data: ${isoOffset}`)

  const { error: updateError } = await supabase
    .from('episodes')
    .update({
      editorial_status: 'calendar_scheduled',
      calendar_scheduled_at: isoOffset,
      scheduled_publish_at: isoOffset,
      status: 'draft',
    })
    .eq('id', episode.id)

  if (updateError) {
    console.error('❌ Erro ao agendar episódio:', updateError.message)
    process.exit(1)
  }

  console.log('   ✅ Episódio agendado com scheduled_publish_at preenchido.')
  console.log('')

  // ── Passo 3: Disparar o cron ──
  console.log('3️⃣  Disparando o cron /api/cron/publish-scheduled...')

  try {
    const response = await fetch(`${BASE_URL}/api/cron/publish-scheduled`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    })

    const data = await response.json()
    console.log(`   Status HTTP: ${response.status}`)
    console.log(`   Resposta: ${JSON.stringify(data, null, 2)}`)
    console.log('')

    if (!data.success) {
      console.error('❌ Cron retornou erro.')
      process.exit(1)
    }

    console.log(`   ✅ Cron executado: ${data.published?.episodes_count || 0} episódios publicados`)
    if (data.published?.episodes_count === 0) {
      console.log('   ⚠️  Nenhum episódio publicado. Verifique se o servidor local está rodando.')
    }

  } catch (error) {
    console.error('❌ Erro ao chamar o cron:', error.message)
    process.exit(1)
  }

  // ── Passo 4: Verificar resultado ──
  console.log('4️⃣  Verificando se o episódio foi publicado...')

  const { data: updatedEp, error: fetchError } = await supabase
    .from('episodes')
    .select('id, title, status, editorial_status, published_at')
    .eq('id', episode.id)
    .single()

  if (fetchError) {
    console.error('❌ Erro ao verificar episódio:', fetchError.message)
    process.exit(1)
  }

  console.log(`   Status: ${updatedEp.status}`)
  console.log(`   Editorial: ${updatedEp.editorial_status}`)
  console.log(`   Published at: ${updatedEp.published_at || 'NÃO PUBLICADO'}`)

  if (updatedEp.status === 'published') {
    console.log('')
    console.log('🎉 TESTE APROVADO! O episódio foi publicado com sucesso pelo cron.')
    console.log('   A correção do scheduled_publish_at está funcionando.')
  } else {
    console.log('')
    console.log('❌ TESTE FALHOU! O episódio NÃO foi publicado.')
    console.log('   Possíveis causas:')
    console.log('   1. O servidor local não está rodando em http://localhost:3000')
    console.log('   2. O CRON_SECRET está incorreto')
    console.log('   3. A lógica do cron não encontrou o episódio')
  }

  // ── Limpeza: devolver ao repositório se foi publicado ──
  console.log('')
  console.log('🧹 Limpando: devolvendo episódio ao repositório...')
  await supabase
    .from('episodes')
    .update({
      editorial_status: 'repository',
      calendar_scheduled_at: null,
      scheduled_publish_at: null,
      status: 'draft',
    })
    .eq('id', episode.id)
  console.log('   ✅ Episódio devolvido ao estado original.')
}

main()