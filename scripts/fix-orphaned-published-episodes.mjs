// Correção de episódios em estado inconsistente (status='published' mas editorial_status='calendar_scheduled')
//
// Causa: O cron publish-scheduled original não atualizava editorial_status, deixando episódios
// tecnicamente "publicados" mas invisíveis nas queries públicas (TabHoje, /ep/[id]).
//
// USO:
//   1. DRY RUN (default) — apenas lista os episódios afetados, sem alterar:
//      node --env-file=.env.local scripts/fix-orphaned-published-episodes.mjs
//
//   2. APLICAR CORREÇÃO — atualiza editorial_status='published':
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
    .select('id, title, status, editorial_status, calendar_scheduled_at, show_on_today')
    .eq('status', 'published')
    .eq('editorial_status', 'calendar_scheduled')

  if (error) {
    console.error('❌ Erro ao buscar episódios:', error.message)
    process.exit(1)
  }

  if (!orphaned || orphaned.length === 0) {
    console.log('✅ Nenhum episódio em estado inconsistente encontrado.')
    console.log('   Não há nada para corrigir.')
    process.exit(0)
  }

  console.log(`🔍 Encontrados ${orphaned.length} episódio(s) em estado inconsistente:`)
  console.log('')

  for (const ep of orphaned) {
    console.log(`   ID: ${ep.id}`)
    console.log(`   Título: "${ep.title}"`)
    console.log(`   status: ${ep.status}`)
    console.log(`   editorial_status: ${ep.editorial_status}`)
    console.log(`   calendar_scheduled_at: ${ep.calendar_scheduled_at || 'N/A'}`)
    console.log(`   show_on_today: ${ep.show_on_today}`)
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

  const ids = orphaned.map((ep) => ep.id)

  const { error: updateError } = await supabase
    .from('episodes')
    .update({ editorial_status: 'published' })
    .in('id', ids)

  if (updateError) {
    console.error('❌ Erro ao corrigir episódios:', updateError.message)
    process.exit(1)
  }

  console.log(`✅ ${ids.length} episódio(s) corrigido(s) com sucesso.`)
  console.log('   editorial_status atualizado para "published" nos registros:')
  ids.forEach((id) => console.log(`   - ${id}`))
  console.log('')
  console.log('Os episódios agora devem estar visíveis na TabHoje e em /ep/[id].')
}

main()