// Debug script: replicate DailyQuoteCard queries to diagnose why the card is empty
//
// Usage: node --env-file=.env.local scripts/debug-daily-quote-query.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variáveis de ambiente Supabase não encontradas.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const KNOWN_EPISODE_ID = 'b803cfe6-2622-4c2a-aa2d-93eba8270bc8'

async function main() {
  console.log('════════════════════════════════════════════════════════')
  console.log('DEBUG — DAILY QUOTE CARD QUERIES')
  console.log('════════════════════════════════════════════════════════')
  console.log('')

  // ── Step 1 — Replicate DailyQuoteCard step 1 ──
  console.log('1️⃣  STEP 1 — Buscar episódio com show_on_today=true')
  console.log('   Query:')
  console.log('   - episodes com show_on_today=true')
  console.log('   - (status=published OR status IS NULL)')
  console.log('   - (editorial_status IS NULL OR editorial_status=published)')
  console.log('   - order by published_at DESC, created_at DESC, limit 1')
  console.log('')

  const { data: todayEpisode, error: episodeError } = await supabase
    .from('episodes')
    .select('id, title, status, editorial_status, show_on_today, published_at')
    .or('status.eq.published,status.is.null')
    .or('editorial_status.is.null,editorial_status.eq.published')
    .eq('show_on_today', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (episodeError) {
    console.log(`   ❌ ERRO: ${episodeError.message}`)
    console.log(`   Detalhes: ${JSON.stringify(episodeError, null, 2)}`)
  } else if (!todayEpisode) {
    console.log('   ❌ NENHUM episódio encontrado com show_on_today=true')
    console.log('   → DailyQuoteCard vai retornar null (não renderiza nada)')
    console.log('')
  } else {
    console.log('   ✅ Episódio encontrado:')
    console.log(`      ID: ${todayEpisode.id}`)
    console.log(`      Título: "${todayEpisode.title}"`)
    console.log(`      status: ${todayEpisode.status}`)
    console.log(`      editorial_status: ${todayEpisode.editorial_status}`)
    console.log(`      show_on_today: ${todayEpisode.show_on_today}`)
    console.log(`      published_at: ${todayEpisode.published_at || 'N/A'}`)
    console.log('')

    // ── Step 2 — Replicate DailyQuoteCard step 2 ──
    console.log('2️⃣  STEP 2 — Buscar daily_quote vinculada a esse episódio')
    console.log(`   Query: daily_quotes com episode_id=${todayEpisode.id} e status='published'`)
    console.log('   order by published_at DESC, created_at DESC, limit 1')
    console.log('')

    const { data: linkedQuote, error: quoteError } = await supabase
      .from('daily_quotes')
      .select('id, episode_id, quote_text, status, published_at, created_at')
      .eq('episode_id', todayEpisode.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (quoteError) {
      console.log(`   ❌ ERRO: ${quoteError.message}`)
      console.log(`   Detalhes: ${JSON.stringify(quoteError, null, 2)}`)
    } else if (!linkedQuote) {
      console.log('   ❌ NENHUMA daily_quote publicada vinculada a este episódio')
      console.log('   → DailyQuoteCard vai retornar null')
      console.log('')
      console.log('   Verificando se existe daily_quote com outro status...')
      const { data: anyQuote, error: anyError } = await supabase
        .from('daily_quotes')
        .select('id, episode_id, quote_text, status, published_at')
        .eq('episode_id', todayEpisode.id)
        .order('created_at', { ascending: false })

      if (anyError) {
        console.log(`   ❌ Erro ao buscar: ${anyError.message}`)
      } else if (!anyQuote || anyQuote.length === 0) {
        console.log('   ❌ NENHUMA daily_quote existe para este episódio (qualquer status)')
      } else {
        console.log(`   ${anyQuote.length} daily_quote(s) encontrada(s) com outros status:`)
        anyQuote.forEach(q => {
          console.log(`      - status: ${q.status} | "${(q.quote_text || '').slice(0, 60)}..."`)
        })
      }
    } else {
      console.log('   ✅ Daily quote encontrada:')
      console.log(`      ID: ${linkedQuote.id}`)
      console.log(`      episode_id: ${linkedQuote.episode_id}`)
      console.log(`      status: ${linkedQuote.status}`)
      console.log(`      published_at: ${linkedQuote.published_at || 'N/A'}`)
      console.log(`      Texto: "${(linkedQuote.quote_text || '').slice(0, 80)}..."`)
    }
  }

  console.log('')
  console.log('════════════════════════════════════════════════════════')
  console.log('')

  // ── Step 3 — List ALL published daily_quotes ──
  console.log('3️⃣  TODAS as daily_quotes com status=published')
  console.log('')

  const { data: allPublished, error: allError } = await supabase
    .from('daily_quotes')
    .select('id, episode_id, quote_text, status, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20)

  if (allError) {
    console.log(`   ❌ ERRO: ${allError.message}`)
  } else if (!allPublished || allPublished.length === 0) {
    console.log('   ⚠️  NENHUMA daily_quote com status=published encontrada no banco todo')
  } else {
    console.log(`   ${allPublished.length} daily_quote(s) publicada(s):`)
    allPublished.forEach(q => {
      console.log(`   - id: ${q.id}`)
      console.log(`     episode_id: ${q.episode_id || 'NULL (órfã!)'}`)
      console.log(`     published_at: ${q.published_at || 'N/A'}`)
      console.log(`     texto: "${(q.quote_text || '').slice(0, 50)}..."`)
    })
  }

  console.log('')
  console.log('════════════════════════════════════════════════════════')
  console.log('')

  // ── Step 4 — Check known episode specifically ──
  console.log('4️⃣  VERIFICAÇÃO DO EPISÓDIO CONHECIDO')
  console.log(`   ID: ${KNOWN_EPISODE_ID}`)
  console.log('')

  const { data: knownEp, error: knownEpError } = await supabase
    .from('episodes')
    .select('id, title, status, editorial_status, show_on_today, published_at')
    .eq('id', KNOWN_EPISODE_ID)
    .maybeSingle()

  if (knownEpError) {
    console.log(`   ❌ ERRO ao buscar episódio: ${knownEpError.message}`)
  } else if (!knownEp) {
    console.log('   ❌ Episódio NÃO encontrado no banco')
  } else {
    console.log('   ✅ Episódio encontrado:')
    console.log(`      Título: "${knownEp.title}"`)
    console.log(`      status: ${knownEp.status}`)
    console.log(`      editorial_status: ${knownEp.editorial_status}`)
    console.log(`      show_on_today: ${knownEp.show_on_today}`)
    console.log(`      published_at: ${knownEp.published_at || 'N/A'}`)
    console.log('')

    // Check daily_quotes linked to this episode
    const { data: knownQuotes, error: knownQuotesError } = await supabase
      .from('daily_quotes')
      .select('id, episode_id, quote_text, status, published_at')
      .eq('episode_id', KNOWN_EPISODE_ID)
      .order('created_at', { ascending: false })

    if (knownQuotesError) {
      console.log(`   ❌ ERRO ao buscar daily_quotes: ${knownQuotesError.message}`)
    } else if (!knownQuotes || knownQuotes.length === 0) {
      console.log('   ❌ NENHUMA daily_quote vinculada a este episódio')
    } else {
      console.log(`   ${knownQuotes.length} daily_quote(s) vinculada(s):`)
      knownQuotes.forEach(q => {
        console.log(`      - id: ${q.id}`)
        console.log(`        status: ${q.status}`)
        console.log(`        published_at: ${q.published_at || 'N/A'}`)
        console.log(`        texto: "${(q.quote_text || '').slice(0, 60)}..."`)
      })
    }
  }
}

main()