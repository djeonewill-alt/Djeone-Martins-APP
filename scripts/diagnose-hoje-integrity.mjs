// Diagnóstico de integridade da página Hoje
// Verifica:
// 1. Se há episódio publicado com show_on_today=true
// 2. Se há daily_quote publicada para hoje
// 3. Se o episódio do repositório tem daily_quote vinculada
//
// Uso: node --env-file=.env.local scripts/diagnose-hoje-integrity.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variáveis de ambiente Supabase não encontradas.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

console.log('════════════════════════════════════════════════════════')
console.log('DIAGNÓSTICO DE INTEGRIDADE — PÁGINA HOJE')
console.log('════════════════════════════════════════════════════════')
console.log('')

async function main() {
  const today = new Date().toISOString().split('T')[0]

  // ── 1. Episódios com show_on_today=true ──
  console.log(`1️⃣  Episódios com show_on_today=true (data hoje: ${today})...`)
  const { data: todayEps, error: todayEpsError } = await supabase
    .from('episodes')
    .select('id, title, status, editorial_status, show_on_today, published_at, series_id')
    .eq('show_on_today', true)
    .order('published_at', { ascending: false })
    .limit(5)

  if (todayEpsError) {
    console.error('   ❌ Erro:', todayEpsError.message)
  } else if (!todayEps || todayEps.length === 0) {
    console.log('   ⚠️  NENHUM episódio com show_on_today=true')
    console.log('   → A aba Hoje mostrará "Nenhum devocional publicado"')
  } else {
    console.log(`   ✅ ${todayEps.length} episódio(s) encontrado(s):`)
    todayEps.forEach(ep => {
      console.log(`      - "${ep.title}" | status: ${ep.status} | editorial: ${ep.editorial_status} | published: ${ep.published_at?.split('T')[0] || 'N/A'}`)
    })
  }
  console.log('')

  // ── 2. Daily Quotes publicadas para hoje ──
  console.log('2️⃣  Daily Quotes publicadas para hoje...')
  const { data: todayQuotes, error: quotesError } = await supabase
    .from('daily_quotes')
    .select('id, episode_id, quote_text, date, status, card_image_url, share_image_url')
    .eq('date', today)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(5)

  if (quotesError) {
    console.error('   ❌ Erro:', quotesError.message)
  } else if (!todayQuotes || todayQuotes.length === 0) {
    console.log('   ❌ NENHUMA Palavra do Dia publicada para hoje')
    console.log('   → DailyQuoteCard não renderizará nada (retorna null)')
  } else {
    console.log(`   ✅ ${todayQuotes.length} Palavra(s) do Dia encontrada(s):`)
    todayQuotes.forEach(q => {
      console.log(`      - "${q.quote_text?.slice(0, 60)}..." | card_image: ${q.card_image_url ? '✅ presente' : '❌ ausente'} | share_image: ${q.share_image_url ? '✅ presente' : '❌ ausente'}`)
    })
  }
  console.log('')

  // ── 3. Cruzamento: episódios do calendário com daily_quotes ──
  console.log('3️⃣  Episódios com calendar_scheduled_at (agendados via Agenda)...')
  const { data: calEps, error: calError } = await supabase
    .from('episodes')
    .select('id, title, editorial_status, status')
    .eq('editorial_status', 'calendar_scheduled')
    .limit(5)

  if (calError) {
    console.error('   ❌ Erro:', calError.message)
  } else if (!calEps || calEps.length === 0) {
    console.log('   Nenhum episódio agendado no momento.')
  } else {
    console.log(`   ${calEps.length} episódio(s) agendado(s). Verificando daily_quotes vinculadas...`)
    for (const ep of calEps) {
      const { data: quotes, error: qErr } = await supabase
        .from('daily_quotes')
        .select('id, status, quote_text')
        .eq('episode_id', ep.id)

      if (qErr) {
        console.log(`      - "${ep.title}": ❌ Erro ao buscar quotes`)
      } else if (!quotes || quotes.length === 0) {
        console.log(`      - "${ep.title}": ❌ NENHUMA daily_quote vinculada`)
      } else {
        const statuses = quotes.map(q => q.status).join(', ')
        console.log(`      - "${ep.title}": ${quotes.length} quote(s) [${statuses}]`)
      }
    }
  }
  console.log('')

  // ── 4. Episódios do repositório com daily_quotes ──
  console.log('4️⃣  Episódios no repositório com daily_quotes...')
  const { data: repoEps, error: repoError } = await supabase
    .from('episodes')
    .select('id, title')
    .eq('editorial_status', 'repository')
    .limit(5)

  if (repoError) {
    console.error('   ❌ Erro:', repoError.message)
  } else if (!repoEps || repoEps.length === 0) {
    console.log('   Nenhum episódio no repositório.')
  } else {
    for (const ep of repoEps) {
      const { data: quotes } = await supabase
        .from('daily_quotes')
        .select('id, status, card_image_url')
        .eq('episode_id', ep.id)

      if (!quotes || quotes.length === 0) {
        console.log(`   ❌ "${ep.title}" — sem daily_quote vinculada`)
      } else {
        const hasImage = quotes.some(q => q.card_image_url)
        console.log(`   ✅ "${ep.title}" — ${quotes.length} quote(s), imagem: ${hasImage ? 'sim' : 'não'}`)
      }
    }
  }
  console.log('')

  // ── Resumo ──
  console.log('════════════════════════════════════════════════════════')
  console.log('RESUMO DO DIAGNÓSTICO')
  console.log('════════════════════════════════════════════════════════')
  console.log('')
  console.log('Como funciona a página Hoje:')
  console.log('  TabHoje.tsx → busca episodes com show_on_today=true + status=published')
  console.log('  DailyQuoteCard.tsx → busca daily_quotes com date=hoje + status=published')
  console.log('')
  console.log('Fluxo Repositório → Agenda → Cron:')
  console.log('  1. Salvar no repositório: NÃO cria daily_quote (por design, AGENDA-004)')
  console.log('  2. Agendar no calendário: define calendar_scheduled_at + scheduled_publish_at')
  console.log('  3. Cron publica: atualiza status=published, show_on_today=true')
  console.log('  4. Cron sincroniza daily_quotes: busca quotes com status=scheduled E episode_id IN (published_ids)')
  console.log('     → Se não houver daily_quote com status=scheduled, nada é publicado')
  console.log('')
  console.log('CONCLUSÃO:')
  console.log('  Episódios do fluxo Repositório NÃO têm daily_quote vinculada.')
  console.log('  Quando o cron publica, o episódio aparece na aba Hoje,')
  console.log('  mas o DailyQuoteCard fica vazio (sem imagem da Palavra do Dia).')
  console.log('')
  console.log('Isso é esperado para o fluxo editorial, pois a Palavra do Dia')
  console.log('só é gerada no fluxo Novo Episódio → Publicar (que chama generate-daily-quote).')
}

main()