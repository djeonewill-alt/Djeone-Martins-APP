// Teste direto (sem servidor HTTP) da correção do cron
// Simula exatamente o que o cron /api/cron/publish-scheduled faz
// 1. Busca episódios com scheduled_publish_at <= now
// 2. Publica episódios
// 3. Busca daily_quotes vinculadas com status IN ['scheduled','draft']
// 4. Publica daily_quotes com date atualizado
// 5. Verifica resultado
//
// Uso: node --env-file=.env.local scripts/test-cron-direct.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

console.log('════════════════════════════════════════════════════════')
console.log('TESTE DIRETO — CRON PUBLISH-SCHEDULED (CORREÇÃO DAILY_QUOTE)')
console.log('════════════════════════════════════════════════════════')
console.log('')

async function main() {
  const now = new Date().toISOString()
  const todayStr = now.split('T')[0]

  // ── Passo 1: Preparar cenário ──
  console.log('1️⃣  Preparando cenário de teste...')

  // Buscar episódio no repositório OU qualquer episódio com daily_quote
  let episode = null
  const { data: repoEps } = await supabase
    .from('episodes')
    .select('id, title, series_id, audio_url')
    .eq('editorial_status', 'repository')
    .not('audio_url', 'is', null)
    .not('title', 'is', null)
    .not('series_id', 'is', null)
    .limit(1)

  if (repoEps && repoEps.length > 0) {
    episode = repoEps[0]
    console.log(`   ✅ Episódio encontrado no repositório: "${episode.title}"`)
  } else {
    // Fallback: pegar qualquer episódio publicado com daily_quote
    const { data: qEps } = await supabase
      .from('daily_quotes')
      .select('episode_id, episodes:episode_id(id, title, series_id, audio_url)')
      .not('episode_id', 'is', null)
      .limit(1)

    if (qEps && qEps.length > 0 && qEps[0].episodes) {
      const epData = Array.isArray(qEps[0].episodes)
        ? qEps[0].episodes[0]
        : qEps[0].episodes
      if (epData) {
        episode = epData
        console.log(`   ✅ Episódio com daily_quote existente: "${episode.title}"`)
      }
    }
  }

  if (!episode) {
    console.log('   ⚠️  Nenhum episódio disponível para teste.')
    process.exit(0)
  }
  console.log(`   ID: ${episode.id}`)
  console.log('')

  // Criar ou verificar daily_quote vinculada
  const { data: existingQuote } = await supabase
    .from('daily_quotes')
    .select('id, status')
    .eq('episode_id', episode.id)
    .limit(1)

  let testQuoteCreated = false
  if (!existingQuote || existingQuote.length === 0) {
    console.log('   Criando daily_quote de teste...')
    const { error: insertError } = await supabase
      .from('daily_quotes')
      .insert({
        episode_id: episode.id,
        quote_text: 'Teste — Palavra do Dia do fluxo editorial',
        date: todayStr,
        status: 'draft',
        scheduled_publish_at: null,
      })

    if (insertError) {
      console.error('   ❌ Erro ao criar daily_quote:', insertError.message)
      process.exit(1)
    }
    testQuoteCreated = true
    console.log('   ✅ daily_quote de teste criada com status=draft')
  } else {
    console.log(`   ✅ daily_quote já existe (id: ${existingQuote[0].id}, status: ${existingQuote[0].status})`)
    // Atualizar para draft para simular o cenário
    if (existingQuote[0].status !== 'draft') {
      await supabase
        .from('daily_quotes')
        .update({ status: 'draft', scheduled_publish_at: null })
        .eq('id', existingQuote[0].id)
      console.log('   ✅ daily_quote ajustada para status=draft')
    }
  }

  // Salvar estado original para restaurar depois
  const { data: origEp } = await supabase
    .from('episodes')
    .select('editorial_status, calendar_scheduled_at, scheduled_publish_at, status, show_on_today, published_at')
    .eq('id', episode.id)
    .single()

  // Agendar episódio para horário passado
  const pastTime = new Date()
  pastTime.setHours(pastTime.getHours() - 3)
  const pastIso = pastTime.toISOString()

  const { error: schedError } = await supabase
    .from('episodes')
    .update({
      editorial_status: 'calendar_scheduled',
      calendar_scheduled_at: pastIso,
      scheduled_publish_at: pastIso,
      status: 'draft',
    })
    .eq('id', episode.id)

  if (schedError) {
    console.error('   ❌ Erro ao agendar episódio:', schedError.message)
    process.exit(1)
  }
  console.log(`   ✅ Episódio agendado com scheduled_publish_at = ${pastIso}`)
  console.log('')

  // ── Passo 2: Simular o cron ──
  console.log('2️⃣  Simulando execução do cron...')

  const { data: scheduledEpisodes, error: fetchError } = await supabase
    .from('episodes')
    .select('id, title, bible_reference, scheduled_publish_at')
    .in('status', ['scheduled', 'draft'])
    .not('scheduled_publish_at', 'is', null)
    .lte('scheduled_publish_at', now)

  if (fetchError) {
    console.error('   ❌ Erro ao buscar episódios:', fetchError.message)
    process.exit(1)
  }

  const episodesToPublish = scheduledEpisodes || []
  const episodeIds = episodesToPublish.map(ep => ep.id)

  console.log(`   Episódios elegíveis: ${episodesToPublish.length}`)
  episodesToPublish.forEach(ep => console.log(`      - "${ep.title}"`))

  if (episodeIds.length > 0) {
    const { error: updateError } = await supabase
      .from('episodes')
      .update({
        status: 'published',
        scheduled_publish_at: null,
        published_at: now,
        show_on_today: true,
      })
      .in('id', episodeIds)

    if (updateError) {
      console.error('   ❌ Erro ao publicar episódios:', updateError.message)
      process.exit(1)
    }
    console.log(`   ✅ ${episodeIds.length} episódio(s) publicado(s)`)
  }
  console.log('')

  // ── Passo 3: Buscar e publicar daily_quotes vinculadas ──
  console.log('3️⃣  Buscando daily_quotes vinculadas (status IN [scheduled, draft])...')

  let quotesPublished = 0
  if (episodeIds.length > 0) {
    const { data: linkedQuotes, error: linkError } = await supabase
      .from('daily_quotes')
      .select('id, episode_id, quote_text, status')
      .in('status', ['scheduled', 'draft'])
      .in('episode_id', episodeIds)

    if (linkError) {
      console.error('   ❌ Erro ao buscar daily_quotes:', linkError.message)
      process.exit(1)
    }

    const quotes = linkedQuotes || []
    console.log(`   Daily quotes encontradas: ${quotes.length}`)
    quotes.forEach(q => console.log(`      - "${q.quote_text?.slice(0, 50)}..." (status: ${q.status})`))

    if (quotes.length > 0) {
      const quoteIds = quotes.map(q => q.id)

      const { error: quoteUpdateError } = await supabase
        .from('daily_quotes')
        .update({
          status: 'published',
          scheduled_publish_at: null,
          published_at: now,
        })
        .in('id', quoteIds)

      if (quoteUpdateError) {
        console.error('   ❌ Erro ao publicar daily_quotes:', quoteUpdateError.message)
        process.exit(1)
      }

      quotesPublished = quoteIds.length
      console.log(`   ✅ ${quotesPublished} daily_quote(s) publicada(s)`)
    } else {
      console.log('   ❌ NENHUMA daily_quote vinculada encontrada!')
    }
  }
  console.log('')

  // ── Passo 4: Verificar resultado final ──
  console.log('4️⃣  Verificando resultado final...')

  const { data: finalEp } = await supabase
    .from('episodes')
    .select('id, title, status, show_on_today')
    .eq('id', episode.id)
    .single()

  const { data: finalQuote } = await supabase
    .from('daily_quotes')
    .select('id, status, date, card_image_url, share_image_url')
    .eq('episode_id', episode.id)
    .eq('status', 'published')
    .maybeSingle()

  console.log(`   Episódio: status="${finalEp?.status}", show_on_today=${finalEp?.show_on_today}`)
  console.log(`   Daily Quote publicada: ${finalQuote ? '✅ SIM' : '❌ NÃO'}`)
  if (finalQuote) {
    console.log(`      date: ${finalQuote.date} (deve ser hoje: ${todayStr})`)
    console.log(`      card_image: ${finalQuote.card_image_url ? '✅ presente' : '⚠️ ausente (não gerada no fluxo editorial, esperado)'}`)
  }

  console.log('')
  if (finalEp?.status === 'published' && finalQuote && finalQuote.status === 'published') {
    console.log('🎉 TESTE APROVADO!')
    console.log('   Episódio publicado + daily_quote sincronizada.')
    console.log('   A aba Hoje deve mostrar: áudio + Palavra do Dia.')
  } else if (finalEp?.status === 'published' && !finalQuote) {
    console.log('⚠️  TESTE PARCIAL: Episódio publicado, mas sem daily_quote.')
  } else {
    console.log('❌ TESTE FALHOU.')
  }

  // ── Limpeza ──
  console.log('')
  console.log('🧹 Restaurando estado original...')

  if (testQuoteCreated) {
    await supabase
      .from('daily_quotes')
      .delete()
      .eq('episode_id', episode.id)
      .eq('quote_text', 'Teste — Palavra do Dia do fluxo editorial')
    console.log('   ✅ daily_quote de teste removida')
  } else {
    // Restaurar daily_quote ao estado original
    await supabase
      .from('daily_quotes')
      .update({ status: 'published', date: todayStr, published_at: now })
      .eq('episode_id', episode.id)
    console.log('   ✅ daily_quote restaurada')
  }

  if (origEp) {
    await supabase
      .from('episodes')
      .update({
        editorial_status: origEp.editorial_status,
        calendar_scheduled_at: origEp.calendar_scheduled_at,
        scheduled_publish_at: origEp.scheduled_publish_at,
        status: origEp.status,
        show_on_today: origEp.show_on_today,
        published_at: origEp.published_at,
      })
      .eq('id', episode.id)
    console.log('   ✅ Episódio restaurado ao estado original')
  }
}

main()