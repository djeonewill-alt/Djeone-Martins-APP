/**
 * Diagnóstico do arquivo de áudio 1781841676525-recording.webm (404).
 *
 * 1. Verifica se o episódio existe no Supabase com essa URL de áudio
 * 2. Lista arquivos na pasta /recordings/ no R2
 * 3. Compara timestamps para identificar o arquivo correto
 *
 * Uso: node scripts/diagnose-missing-audio.mjs
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

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

// ── Supabase ──
const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY']
if (!supabaseUrl || !serviceRoleKey) {
  console.error('[ERROR] Variáveis Supabase não encontradas no .env.local')
  process.exit(1)
}
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ── R2 ──
const r2AccountId = env['R2_ACCOUNT_ID']
const r2AccessKey = env['R2_ACCESS_KEY_ID']
const r2SecretKey = env['R2_SECRET_ACCESS_KEY']
const r2Bucket = env['R2_BUCKET_NAME'] || 'djeone-audios'
const r2PublicUrl = env['R2_PUBLIC_URL'] || ''

if (!r2AccountId || !r2AccessKey || !r2SecretKey) {
  console.error('[ERROR] Variáveis R2 não encontradas no .env.local')
  process.exit(1)
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKey,
    secretAccessKey: r2SecretKey,
  },
})

console.log('=== DIAGNÓSTICO DE ÁUDIO: 1781841676525-recording.webm ===\n')

// ── Passo 1: Buscar episódios com o timestamp 1781841676525 ──
const timestamp = '1781841676525'
const searchPattern = `%${timestamp}%`

console.log('[1] Buscando episódios no Supabase com timestamp', timestamp, '...')

const { data: episodes, error: epError } = await supabase
  .from('episodes')
  .select('id, title, audio_url, audio_original_url, audio_url_compatible, duration_seconds, created_at')
  .or(`audio_url.ilike.${searchPattern},audio_original_url.ilike.${searchPattern},audio_url_compatible.ilike.${searchPattern}`)
  .order('created_at', { ascending: false })
  .limit(5)

if (epError) {
  console.error('[ERROR] Erro ao consultar episódios:', epError.message)
} else if (!episodes || episodes.length === 0) {
  console.log('[NOT FOUND] Nenhum episódio com timestamp', timestamp, 'no banco.')
  console.log('  Buscando episódios mais recentes...')
  const { data: recent } = await supabase
    .from('episodes')
    .select('id, title, audio_url, audio_original_url, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  if (recent) {
    console.log(`  Encontrados ${recent.length} episódios recentes:`)
    for (const ep of recent) {
      console.log(`    ${ep.id.slice(0, 8)}... | ${ep.title || '(sem título)'} | ${ep.audio_url?.slice(-60) || '(sem áudio)'} | ${new Date(ep.created_at).toLocaleString('pt-BR')}`)
    }
  }
} else {
  console.log(`  Encontrados ${episodes.length} episódio(s):`)
  for (const ep of episodes) {
    console.log(`  ─`.repeat(60))
    console.log(`  ID:          ${ep.id}`)
    console.log(`  Título:      ${ep.title || '(sem título)'}`)
    console.log(`  Criado em:   ${new Date(ep.created_at).toLocaleString('pt-BR')}`)
    console.log(`  Duração:     ${ep.duration_seconds || 'N/A'}s`)
    console.log(`  audio_url:           ${ep.audio_url || '(NULL)'}`)
    console.log(`  audio_original_url:  ${ep.audio_original_url || '(NULL)'}`)
    console.log(`  audio_url_compatible:${ep.audio_url_compatible || '(NULL)'}`)
    console.log(`  audio_original_key:  ${ep.audio_original_key || '(NULL)'}`)
    console.log(`  audio_original_type: ${ep.audio_original_type || '(NULL)'}`)
  }
}

// ── Passo 2: Listar arquivos no R2 ──
console.log('\n[2] Listando arquivos no R2 bucket:', r2Bucket)
console.log('  R2 Public URL:', r2PublicUrl)

try {
  // Lista recordings/ (até 100 para pegar o arquivo alvo)
  const recordingsCmd = new ListObjectsV2Command({
    Bucket: r2Bucket,
    Prefix: 'recordings/',
    MaxKeys: 100,
  })
  const recordingsResult = await r2.send(recordingsCmd)
  const recordingKeys = (recordingsResult.Contents || []).map(o => o.Key).filter(Boolean)
  
  console.log(`\n  Pasta recordings/: ${recordingKeys.length} arquivo(s)${recordingsResult.IsTruncated ? ' (TRUNCADO - há mais)' : ''}`)
  
  // Procura o arquivo alvo
  const targetFound = recordingKeys.find(k => k.includes(timestamp))
  if (targetFound) {
    console.log(`  ✅ Arquivo alvo encontrado: ${targetFound}`)
  } else {
    console.log(`  ❌ Arquivo alvo NÃO encontrado nos ${recordingKeys.length} resultados`)
  }
  
  // Mostra os 5 mais recentes
  console.log('\n  5 gravações mais recentes:')
  const sorted = [...recordingKeys].sort().slice(-5)
  sorted.forEach(key => {
    const obj = recordingsResult.Contents.find(o => o.Key === key)
    const size = obj?.Size ? `${(obj.Size / 1024 / 1024).toFixed(2)} MB` : '?'
    const lastMod = obj?.LastModified ? new Date(obj.LastModified).toLocaleString('pt-BR') : '?'
    console.log(`    ${key.padEnd(50)} ${size.padStart(10)}  ${lastMod}`)
  })

  // Lista também covers/ para verificação
  const coversCmd = new ListObjectsV2Command({
    Bucket: r2Bucket,
    Prefix: 'cover-',
    MaxKeys: 5,
  })
  const coversResult = await r2.send(coversCmd)
  const coverKeys = (coversResult.Contents || []).map(o => o.Key).filter(Boolean)
  console.log(`\n  Últimos 5 covers: ${coverKeys.length}`)
  coverKeys.sort().slice(-5).forEach(key => {
    const obj = coversResult.Contents.find(o => o.Key === key)
    const size = obj?.Size ? `${(obj.Size / 1024 / 1024).toFixed(2)} MB` : '?'
    console.log(`    ${key.padEnd(50)} ${size.padStart(10)}`)
  })

} catch (r2Error) {
  console.error('[ERROR] Erro ao listar R2:', r2Error.message)
}

// ── Passo 3: Verificar se o arquivo pode ser acessado via URL pública ──
console.log('\n[3] Testando URL pública do arquivo alvo...')
const testUrl = `${r2PublicUrl}/recordings/${timestamp}-recording.webm`
console.log(`  URL: ${testUrl}`)
try {
  const response = await fetch(testUrl, { method: 'HEAD' })
  console.log(`  Status: ${response.status} ${response.statusText}`)
  if (response.ok) {
    console.log('  ✅ Arquivo acessível via URL pública')
  } else if (response.status === 404) {
    console.log('  ❌ 404 — arquivo não existe nesta URL')
    console.log('  Possíveis causas:')
    console.log('    1. O arquivo foi deletado do R2')
    console.log('    2. O timestamp está errado no banco')
    console.log('    3. O arquivo está em outra pasta (ver lista acima)')
    console.log('    4. O bucket/pasta não tem acesso público configurado')
  }
} catch (fetchError) {
  console.log(`  Erro ao testar URL: ${fetchError.message}`)
}

console.log('\n=== FIM DO DIAGNÓSTICO ===')