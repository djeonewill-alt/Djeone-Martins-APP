/**
 * Backfill share_image_url em daily_quotes existentes.
 *
 * Contexto: Antes do fix em AGENDA-012, o campo share_image_url nunca era populado no
 * momento do salvamento. Registros antigos podem ter share_image_url = NULL enquanto
 * card_image_url (imagem composta upada) ou background_image_url (fonte FLUX/Pexels)
 * estão preenchidos.
 *
 * Regra de prioridade (mesma do frontend e da rota generate-share-image):
 * 1. card_image_url   → imagem composta com texto, upada pelo usuário
 * 2. background_image_url → imagem base (FLUX/Pexels)
 * 3. source_image_url     → URL da fonte original
 *
 * Uso:
 *   node scripts/backfill-share-image-url.mjs
 *
 * Pré-requisito:
 *   NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local
 */

// Carrega as variáveis de ambiente do .env.local manualmente (sem depender de dotenv)
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local')
  let content = ''
  try {
    content = readFileSync(envPath, 'utf-8')
  } catch {
    console.error('[ERROR] Não foi possível ler .env.local em', envPath)
    process.exit(1)
  }

  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    // Remove aspas se houver
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }

  return env
}

const env = loadEnv()

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY']

if (!supabaseUrl) {
  console.error('[ERROR] NEXT_PUBLIC_SUPABASE_URL não encontrado no .env.local')
  process.exit(1)
}

if (!serviceRoleKey) {
  console.error('[ERROR] SUPABASE_SERVICE_ROLE_KEY não encontrado no .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ---------------------------------------------------------------------------
// Query: todos os daily_quotes onde share_image_url é NULL mas existe imagem
// ---------------------------------------------------------------------------
async function main() {
  console.log('[INFO] Buscando daily_quotes com share_image_url nulo...')

  const { data, error } = await supabase
    .from('daily_quotes')
    .select('id, quote_text, share_image_url, card_image_url, background_image_url, source_image_url')
    .is('share_image_url', null)

  if (error) {
    console.error('[ERROR] Erro ao consultar daily_quotes:', error.message)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log('[OK] Nenhum registro com share_image_url nulo encontrado. Nada a fazer.')
    process.exit(0)
  }

  console.log(`[INFO] Encontrados ${data.length} registro(s) com share_image_url nulo.`)

  let updated = 0
  let skipped = 0

  for (const row of data) {
    // Prioridade: card_image_url > background_image_url > source_image_url
    const bestUrl =
      row.card_image_url ||
      row.background_image_url ||
      row.source_image_url ||
      null

    if (!bestUrl) {
      console.log(`  [SKIP] id=${row.id} — nenhuma imagem disponível em card/background/source`)
      skipped++
      continue
    }

    const { error: updateError } = await supabase
      .from('daily_quotes')
      .update({
        share_image_url: bestUrl,
        share_image_status: 'ready',
      })
      .eq('id', row.id)

    if (updateError) {
      console.error(`  [ERROR] id=${row.id} — erro ao atualizar: ${updateError.message}`)
      continue
    }

    console.log(`  [OK] id=${row.id} → share_image_url = ${bestUrl.slice(0, 80)}...`)
    console.log(`       quote: "${(row.quote_text || '').slice(0, 60)}..."`)
    updated++
  }

  console.log('')
  console.log('[DONE] Resumo:')
  console.log(`  Total encontrados: ${data.length}`)
  console.log(`  Atualizados:       ${updated}`)
  console.log(`  Pulados (sem img): ${skipped}`)
}

main().catch((err) => {
  console.error('[FATAL]', err)
  process.exit(1)
})