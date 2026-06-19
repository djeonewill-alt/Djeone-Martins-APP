/**
 * Diagnóstico: Mostra os valores reais de todos os campos de imagem
 * para cada daily_quote, para identificar se card_image_url contém
 * imagem composta com texto ou apenas imagem limpa.
 *
 * Uso: node scripts/diagnose-share-image.mjs
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local')
  const content = readFileSync(envPath, 'utf-8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

const env = loadEnv()
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'], {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const { data, error } = await supabase
    .from('daily_quotes')
    .select(`
      id,
      episode_id,
      quote_text,
      share_image_url,
      card_image_url,
      background_image_url,
      source_image_url,
      selected_template,
      card_generation_status,
      episode:episodes (
        id,
        title,
        cover_image_url
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('[ERROR]', error.message)
    process.exit(1)
  }

  console.log('=== DIAGNÓSTICO: IMAGENS DAS DAILY_QUOTES ===\n')

  for (const row of data) {
    const episodeTitle = row.episode?.title || '(sem episódio)'
    console.log(`─`.repeat(80))
    console.log(`ID:          ${row.id}`)
    console.log(`Episódio:    ${episodeTitle}`)
    console.log(`Quote:       "${(row.quote_text || '').slice(0, 80)}"`)
    console.log(`Template:    ${row.selected_template || 'nenhum'}`)
    console.log(`Card status: ${row.card_generation_status || 'N/A'}`)
    console.log()
    console.log(`share_image_url:      ${row.share_image_url || '(NULL)'}`)
    console.log(`card_image_url:       ${row.card_image_url || '(NULL)'}`)
    console.log(`background_image_url: ${row.background_image_url || '(NULL)'}`)
    console.log(`source_image_url:     ${row.source_image_url || '(NULL)'}`)
    console.log()

    // Análise: as URLs são iguais?
    const urls = [row.share_image_url, row.card_image_url, row.background_image_url]
      .filter(Boolean)
    const uniqueUrls = [...new Set(urls)]
    
    if (uniqueUrls.length === 1 && urls.length > 1) {
      console.log('⚠️  ATENÇÃO: share, card e background apontam para a MESMA URL!')
      console.log('   Isso significa que a imagem é a versão LIMPA, sem texto composto.')
    } else if (row.share_image_url === row.card_image_url && row.card_image_url) {
      console.log('⚠️  share_image_url = card_image_url (possivelmente imagem limpa)')
    } else if (row.share_image_url === row.background_image_url && row.background_image_url) {
      console.log('⚠️  share_image_url = background_image_url (imagem limpa do FLUX/Pexels)')
    }

    // Verifica se card_image_url é uma URL do R2 com padrão "cover-*.png"
    if (row.card_image_url && row.card_image_url.includes('/cover-')) {
      console.log('📦 card_image_url é um upload R2 (cover-*.png) — pode ser imagem limpa re-upada')
    }
    if (row.background_image_url && row.background_image_url.includes('pub-')) {
      console.log('🖼️  background_image_url é uma URL R2 direta (provavelmente FLUX limpo)')
    }

    console.log()
  }

  console.log('─'.repeat(80))
  console.log('\n=== CONCLUSÃO ===')
  console.log('Se share_image_url = card_image_url = background_image_url OU')
  console.log('se share_image_url = background_image_url, então a imagem exibida')
  console.log('é a IMAGEM LIMPA do FLUX/Pexels, sem o overlay de texto.')
  console.log()
  console.log('A correção necessária é:')
  console.log('1. Usar generateCardDataUrl() para compor texto na imagem via Canvas')
  console.log('2. Fazer upload da imagem composta')
  console.log('3. Salvar essa URL em share_image_url')
}

main().catch((err) => {
  console.error('[FATAL]', err)
  process.exit(1)
})