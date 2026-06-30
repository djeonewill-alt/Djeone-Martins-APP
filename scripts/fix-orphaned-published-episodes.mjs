// Correção de episódios em estado inconsistente (status='published' mas editorial_status='calendar_scheduled')
//
// Causa: O cron publish-scheduled original não atualizava editorial_status, deixando episódios
// tecnicamente "publicados" mas invisíveis nas queries públicas (TabHoje, /ep/[id]).
//
// Além de corrigir editorial_status='published', este script garante que apenas o episódio
// MAIS RECENTE do lote fique com show_on_today=true, evitando duplicidade na aba Hoje.
//
// USO:
//   1. DRY RUN (default) — apenas lista os episódios afetados, sem alterar:
//      node --env-file=.env.local scripts/fix-orphaned-published-episodes.mjs
//
//   2. APLICAR CORREÇÃO — atualiza editorial_status e show_on_today:
//      DRY_RUN=false node --env-file=.env.local scripts/fix-orphaned-published-episodes.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const DRY_RUN = process.env.DRY_RUN !== 'false'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variáveis de ambiente Supabase não encontradas.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

console.log('════════════════════════════════════════════════════════')
console.log('CORREÇÃO DE EPISÓDIOS ÓRFÃOS (status=published, editorial_status=calendar_scheduled)')
console.log('════════════════════════════════════════════════════════')
console.log(`Modo: ${DRY_RUN ? '🔍 DRY RUN (apenas listagem)' : '⚠️  APLICAÇÃO REAL (vai alterar o banco!)'}`)
console.log('')

async function main() {
  // Busca episódios no estado inconsistente causado pelo bug
  const { data: orphaned, error } = await supabase
    .from('episodes')
    .select('id, title, status, editorial_status, calendar_scheduled_at, published_at, show_on_today')
    .eq('status', 'published')
    .eq('editorial_status', 'calendar_scheduled')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('calendar_scheduled_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('❌ Erro ao buscar episódios:', error.message)
    process.exit(1)
  }

  if (!orphaned || orphaned.length === 0) {
    console.log('✅ Nenhum episódio em estado inconsistente encontrado.')
    console.log('   Não há nada para corrigir.')
    process.exit(0)
  }

  // Identificar o episódio mais recente (por published_at, fallback calendar_scheduled_at)
  // A query já está ordenada, então o primeiro é o mais recente
  const mostRecent = orphaned[0]
  const others = orphaned.slice(1)

  console.log(`🔍 Encontrados ${orphaned.length} episódio(s) em estado inconsistente:`)
  console.log('')

  for (const ep of orphaned) {
    const isMostRecent = ep.id === mostRecent.id
    const actionLabel = isMostRecent
      ? '→ manterá show_on_today=true (mais recente)'
      : '→ será corrigido para show_on_today=false'

    console.log(`   ID: ${ep.id}`)
    console.log(`   Título: "${ep.title}"`)
    console.log(`   status: ${ep.status}`)
    console.log(`   editorial_status: ${ep.editorial_status}`)
    console.log(`   published_at: ${ep.published_at || 'N/A'}`)
    console.log(`   calendar_scheduled_at: ${ep.calendar_scheduled_at || 'N/A'}`)
    console.log(`   show_on_today atual: ${ep.show_on_today}`)
    console.log(`   ${actionLabel}`)
    console.log('   ---')
  }

  if (DRY_RUN) {
    console.log('')
    console.log('🔍 DRY RUN — Nenhuma alteração foi feita no banco.')
    console.log('   Para aplicar a correção, execute:')
    console.log('   DRY_RUN=false node --env-file=.env.local scripts/fix-orphaned-published-episodes.mjs')
    process.exit(0)
  }

  // Aplicar correção
  console.log('')
  console.log('⚠️  Aplicando correção...')

  const allIds = orphaned.map((ep) => ep.id)

  // 1. Corrigir editorial_status='published' em TODOS
  let editorialFixed = 0
  const { error: updateEditorialError } = await supabase
    .from('episodes')
    .update({ editorial_status: 'published' })
    .in('id', allIds)

  if (updateEditorialError) {
    console.error('❌ Erro ao corrigir editorial_status:', updateEditorialError.message)
    process.exit(1)
  }
  editorialFixed = allIds.length
  console.log(`   ✅ editorial_status='published' aplicado em ${editorialFixed} episódio(s)`)

  // 2. Garantir show_on_today=true apenas no mais recente
  let showOnTodayFixed = 0
  if (mostRecent.show_on_today !== true) {
    const { error: setTrueError } = await supabase
      .from('episodes')
      .update({ show_on_today: true })
      .eq('id', mostRecent.id)

    if (setTrueError) {
      console.error('❌ Erro ao definir show_on_today=true no mais recente:', setTrueError.message)
      process.exit(1)
    }
    console.log(`   ✅ show_on_today=true mantido no episódio mais recente: "${mostRecent.title}"`)
  } else {
    console.log(`   ✅ show_on_today já estava true no episódio mais recente: "${mostRecent.title}"`)
  }

  // 3. Corrigir show_on_today=false nos demais
  if (others.length > 0) {
    const othersIds = others.map((ep) => ep.id)
    const { error: setFalseError } = await supabase
      .from('episodes')
      .update({ show_on_today: false })
      .in('id', othersIds)

    if (setFalseError) {
      console.error('❌ Erro ao definir show_on_today=false nos demais:', setFalseError.message)
      process.exit(1)
    }
    showOnTodayFixed = othersIds.length
    console.log(`   ✅ show_on_today=false aplicado em ${showOnTodayFixed} episódio(s)`)
  }

  console.log('')
  console.log('════════════════════════════════════════════════════════')
  console.log('RESUMO DA CORREÇÃO')
  console.log('════════════════════════════════════════════════════════')
  console.log(`   Episódios com editorial_status corrigido: ${editorialFixed}`)
  console.log(`   Episódios com show_on_today alterado para false: ${showOnTodayFixed}`)
  console.log(`   Episódio mantido com show_on_today=true: "${mostRecent.title}" (${mostRecent.id})`)
  console.log('')
  console.log('Os episódios agora devem estar visíveis na TabHoje e em /ep/[id].')
}

main()