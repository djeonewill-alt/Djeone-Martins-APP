// Retroactively create or enhance a daily_quote for an existing episode
//
// USAGE:
//   node --env-file=.env.local scripts/create-daily-quote-for-episode.mjs <episode_id>
//
// No need for a running dev server — calls DeepSeek and FAL.ai APIs directly.
//
// MODES:
//   - If no daily_quote exists: generate text via DeepSeek, interactive pick, INSERT
//   - If daily_quote exists without background image: optionally generate FLUX image + upload to R2
//
// EXAMPLE:
//   node --env-file=.env.local scripts/create-daily-quote-for-episode.mjs b803cfe6-2622-4c2a-aa2d-93eba8270bc8

import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import * as readline from 'readline'

// ── Supabase client ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variáveis de ambiente Supabase não encontradas.')
  process.exit(1)
}

const episodeId = process.argv[2]
if (!episodeId) {
  console.error('❌ Forneça o episode_id como argumento.')
  console.error('   Ex: node --env-file=.env.local scripts/create-daily-quote-for-episode.mjs <episode_id>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── R2 client ────────────────────────────────────────────────────────────────
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'djeone-audios'
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '')

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

// ── FAL.ai ───────────────────────────────────────────────────────────────────
const FAL_KEY = process.env.FAL_KEY
const FAL_BASE_URL = 'https://fal.run'

// ── DeepSeek API helpers (same logic as lib/ai/deepseek.ts) ──────────────────
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '')

function getDeepSeekModel() {
  const raw = (process.env.DEEPSEEK_MODEL || 'flash').toLowerCase().trim()
  const flashAliases = new Set(['flash', 'deepseek-chat', 'deepseek-v4-flash'])
  if (flashAliases.has(raw)) return 'deepseek-v4-flash'
  return raw
}

async function callDeepSeek(messages, temperature, maxTokens) {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: getDeepSeekModel(), messages, temperature, max_tokens: maxTokens }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(`DeepSeek error ${response.status}: ${data?.error?.message || 'Unknown'}`)
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('DeepSeek não retornou conteúdo.')
  return content
}

// ── Text utilities (same logic as route.ts) ─────────────────────────────────
function cleanText(text) {
  return text.replace(/\s+/g, ' ').replace(/[""]/g, '"').replace(/['']/g, "'").trim()
}
function normalizeSuggestion(text) {
  let value = cleanText(text)
  value = value.replace(/^["'""]+/, '').replace(/["'""]+$/, '').trim()
  if (value.length > 0) value = value.charAt(0).toUpperCase() + value.slice(1)
  if (value && !/[.!?…]$/.test(value)) value += '.'
  return value
}
function extractJsonFromText(text) {
  const cleaned = text.trim()
  try { return JSON.parse(cleaned) } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch {} }
  throw new Error('A IA não retornou JSON válido.')
}
function countWords(text) { return text.split(/\s+/).filter(Boolean).length }
function normalizeForMatch(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function hasExcessiveRepetition(text) {
  const words = normalizeForMatch(text).split(/\s+/).filter(w => w.length > 2)
  if (words.length < 6) return false
  const counts = new Map()
  words.forEach(w => counts.set(w, (counts.get(w) || 0) + 1))
  return Array.from(counts.values()).some(c => c >= 3) || counts.size / words.length < 0.58
}
function looksLikeQuestion(text) { return text.includes('?') || /^(qual|como|por que|porque|quando|onde|quem)\b/i.test(text) }
function looksLikeHistoricalSummary(text) {
  return /\b(capítulo|versículo|texto|passagem|transcrição|áudio|mensagem|episódio|estudo|meditamos|viajou|viagem de|saiu de|chegou em|foi para|no versículo|nesse texto|neste texto)\b/i.test(text)
}
function looksBrokenOrUnclear(text) {
  return /\b(oposto do|dão para|nátus|natus|húongar|sincret)\b/i.test(text) ||
    /\bda tua\b.*\bliterais\b/i.test(text) ||
    /\bque você pode ver\b.*\bque você pode ver\b/i.test(text)
}
function hasAdministrativeLanguage(text) {
  return /\b(bom dia|boa tarde|boa noite|aviso|administrativo|transcri[cç][aã]o|[aá]udio|mensagem|epis[oó]dio|estudo|compartilhar|cadastrar|inscrev)\b/i.test(text)
}
function hasEnoughSourceOverlap(quoteText, sourceExcerpt, reason) {
  const sourceWords = new Set(normalizeForMatch(`${sourceExcerpt} ${reason}`).split(/\s+/).filter(w => w.length >= 5))
  if (sourceWords.size < 3) return false
  return normalizeForMatch(quoteText).split(/\s+/).filter(w => w.length >= 5).filter(w => sourceWords.has(w)).length >= 1
}
function hasConcreteEpisodeSignal(text) {
  return /\b(jesus|cristo|deus|senhor|espirito|templo|jerusalem|betania|lazaro|marta|maria|paulo|pedro|davi|moises|abraa?o|israel|cruz|tumulo|casa|mesa|deserto|vale|porta|contraste|enquanto)\b/i.test(normalizeForMatch(text)) ||
    /\bantes\b.*\bdepois\b/i.test(text) || /\bnao\b.*\bmas\b/i.test(text)
}

// ── Prompt builder (same logic as route.ts) ──────────────────────────────────
function buildQuotePrompt({ transcriptionText, title, bibleReference }) {
  const t = cleanText(title || '')
  const r = cleanText(bibleReference || '')
  return `
Você é um assistente especializado em criar frases de efeito para um aplicativo cristão chamado "Palavra do Dia". Sua única tarefa agora é ler a transcrição de uma pregação e gerar frases impactantes baseadas nela.

REGRA 1 — FIDELIDADE TOTAL À TRANSCRIÇÃO
Você só pode usar ideias, conceitos e palavras que estejam presentes na transcrição. Não invente nada.

REGRA 2 — TAMANHO IDEAL
A frase precisa ter entre 15 e 35 palavras.

REGRA 3 — TOM FORTE E ENCORAJADOR
A frase precisa encorajar quem está passando por dificuldades.

REGRA 4 — ESTILO DA FRASE
Escreva como uma declaração poderosa ou uma reflexão profunda.

REGRA 5 — IDIOMA
Escreva sempre em português brasileiro.

REGRA 6 — FORMATO DE SAÍDA
Gere exatamente 5 opções de frases. Retorne SOMENTE um JSON válido.

{
  "suggestions": [
    {
      "quote_text": "frase forte aqui",
      "reason": "justificativa curta",
      "score": 9,
      "source_excerpt": "trecho real da transcrição",
      "use_case": "card",
      "specificity_reason": "por que é específica deste episódio"
    }
  ]
}

TÍTULO DO EPISÓDIO:
${t || 'Não informado'}

REFERÊNCIA BÍBLICA:
${r || 'Não informada'}

TRANSCRIÇÃO:
${transcriptionText}
`.trim()
}

function validateSuggestions(input) {
  const parsed = input
  if (!parsed || !Array.isArray(parsed.suggestions)) throw new Error('A IA não retornou uma lista de sugestões.')

  const normalized = parsed.suggestions.map(item => {
    const quoteText = normalizeSuggestion(String(item.quote_text || ''))
    const reason = cleanText(String(item.reason || 'Frase com força devocional.'))
    const sourceExcerpt = cleanText(String(item.source_excerpt || '')).slice(0, 220)
    const specificityReason = cleanText(String(item.specificity_reason || '')).slice(0, 220)
    const rawScore = Number(item.score)
    let score = Number.isFinite(rawScore) ? rawScore : 8
    const hasSrc = sourceExcerpt.length >= 20
    const hasOverlap = hasSrc ? hasEnoughSourceOverlap(quoteText, sourceExcerpt, reason) : false
    const hasSignal = hasConcreteEpisodeSignal(`${quoteText} ${sourceExcerpt} ${reason} ${specificityReason}`)
    if (!hasSrc) score -= 2
    if (!hasOverlap) score -= 1
    if (!hasSignal) score -= 1
    const wc = countWords(quoteText)
    return { quote_text: quoteText, reason: hasSrc ? reason : `${reason} Baixa confianca`, score: Math.max(1, Math.min(10, Math.round(score))), source_excerpt: sourceExcerpt || undefined, use_case: item.use_case || 'card', specificity_reason: specificityReason || undefined, wc, hasSrc, hasOverlap, hasSignal }
  }).filter(item =>
    item.score >= 8 && item.quote_text.length >= 30 && item.quote_text.length <= 220 &&
    item.wc >= 10 && item.wc <= 38 && !looksLikeQuestion(item.quote_text) &&
    !looksLikeHistoricalSummary(item.quote_text) && !looksBrokenOrUnclear(item.quote_text) &&
    !hasExcessiveRepetition(item.quote_text) && !hasAdministrativeLanguage(item.source_excerpt || '') &&
    (item.hasSrc || item.hasSignal)
  )

  const grounded = normalized.filter(i => i.hasSrc)
  const pool = grounded.length >= 3 ? grounded : normalized
  const seen = new Set()
  const suggestions = pool.sort((a, b) => b.score - a.score).filter(item => {
    const key = normalizeForMatch(item.quote_text).split(/\s+/).filter(w => w.length >= 5).slice(0, 7).join(' ')
    if (!key || seen.has(key)) return false; seen.add(key); return true
  }).map(({ wc, hasSrc, hasOverlap, hasSignal, ...item }) => item)

  if (suggestions.length < 3) throw new Error('A IA não gerou frases fortes o suficiente.')
  return suggestions.slice(0, 5)
}

async function generateQuoteSuggestions({ transcriptionText, title, bibleReference }) {
  const prompt = buildQuotePrompt({ transcriptionText, title, bibleReference })
  const schema = `{"suggestions":[{"quote_text":"...","reason":"...","score":9,"source_excerpt":"...","use_case":"card","specificity_reason":"..."}]}`
  const system = 'Você é um assistente especializado em criar frases para "Palavra do Dia". Responda APENAS com JSON válido.\n\nESQUEMA:\n' + schema
  const content = await callDeepSeek([
    { role: 'system', content: system },
    { role: 'user', content: prompt + '\n\nResponda APENAS com JSON válido.' },
  ], 0.6, 4096)
  return validateSuggestions(extractJsonFromText(content))
}

// ── Image generation helpers (ImageOrchestrator logic) ───────────────────────
const ORCHESTRATOR_SYSTEM = [
  'SYSTEM PROMPT — GERADOR DE PROMPTS PARA FLUX (PALAVRA DO DIA)',
  '',
  'PERSONA: Você é um especialista em design emocional e metafórico.',
  '',
  'REGRA: A frase escolhida (selectedQuote) é o ÚNICO elemento que importa.',
  '',
  'LIGHTING DIVERSITY: Varie drasticamente o estilo de iluminação.',
  'Mantenha o centro da imagem escuro e limpo para legibilidade de texto branco.',
  '',
  'Estilo: "Shot on 35mm film, anamorphic lens, cinematic color grading, photorealistic, 8k"',
  'Proibido: texto, letras, palavras, tipografia na imagem.',
  '',
  'Escreva o prompt em INGLÊS. Retorne APENAS JSON.',
].join('\n')

const ORCHESTRATOR_SCHEMA = '{"flux_visual_prompt":"English abstract emotional scene description for FLUX"}'

async function generateFluxVisualPrompt(quoteText) {
  const userPrompt = [
    `PALAVRA DO DIA: "${quoteText}"`,
    '',
    'IMPORTANTE: Use APENAS a frase acima como inspiração.',
    'Return JSON: { "flux_visual_prompt": "English abstract emotional scene description" }',
  ].join('\n')

  const content = await callDeepSeek([
    { role: 'system', content: ORCHESTRATOR_SYSTEM + '\n\nESQUEMA:\n' + ORCHESTRATOR_SCHEMA },
    { role: 'user', content: userPrompt },
  ], 0.6, 2048)

  const parsed = extractJsonFromText(content)
  const prompt = (parsed.flux_visual_prompt || '').trim()
  if (!prompt || prompt.length < 50) throw new Error('ImageOrchestrator: prompt visual muito curto.')
  return prompt
}

function buildFluxFinalPrompt(sceneDescription) {
  return [
    sceneDescription,
    'Shot on 35mm film, anamorphic lens, shallow depth of field, cinematic color grading, photorealistic, 8k, no text, no letters, no words, no typography, no overlay, clean background.',
  ].join(' ')
}

async function generateFluxImage(sceneDescription) {
  const finalPrompt = buildFluxFinalPrompt(sceneDescription)
  console.log(`   Prompt FLUX: ${finalPrompt.slice(0, 120)}...`)

  const response = await fetch(`${FAL_BASE_URL}/fal-ai/flux-2-pro`, {
    method: 'POST',
    headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: finalPrompt, image_size: 'landscape_16_9', num_images: 1, enable_safety_checker: false }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(`FAL.ai error ${response.status}: ${data?.detail || 'Unknown'}`)

  const images = data?.images || (data?.image ? [data.image] : [])
  if (!images.length || !images[0]?.url) throw new Error('FAL.ai não retornou imagem.')

  console.log(`   Imagem gerada: ${images[0].url.slice(0, 80)}...`)
  return { url: images[0].url, width: images[0].width || 1920, height: images[0].height || 1080 }
}

async function uploadToR2(imageUrl, prefix = 'backgrounds/daily-quote') {
  console.log('   Baixando imagem do FAL.ai...')
  const dl = await fetch(imageUrl, { signal: AbortSignal.timeout(60000) })
  if (!dl.ok) throw new Error(`Download FAL falhou: HTTP ${dl.status}`)
  const buffer = Buffer.from(await dl.arrayBuffer())

  console.log(`   Comprimindo para WebP (${(buffer.byteLength / 1024).toFixed(0)}KB)...`)
  const qualities = [62, 50, 40, 32, 24]
  let finalBuffer = null
  for (const q of qualities) {
    const b = await sharp(buffer).webp({ quality: q, effort: 4 }).toBuffer()
    if (b.byteLength <= 70 * 1024 || q === qualities[qualities.length - 1]) { finalBuffer = b; break }
  }
  if (!finalBuffer) throw new Error('Compressão WebP falhou.')

  const key = `${prefix}/flux-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME, Key: key, Body: finalBuffer,
    ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable',
  }))

  const r2Url = `${R2_PUBLIC_URL}/${key}`
  console.log(`   Upload R2: ${r2Url}`)
  return r2Url
}

// ── Interactive helpers ──────────────────────────────────────────────────────
function askQuestion(rl, question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())))
}

async function askYesNo(rl, question) {
  while (true) {
    const answer = await askQuestion(rl, question + ' (s/n): ')
    if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim') return true
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'não' || answer.toLowerCase() === 'nao') return false
    console.log('   ⚠️ Responda "s" ou "n".')
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('════════════════════════════════════════════════════════')
  console.log('CRIAR / ENRIQUECER PALAVRA DO DIA')
  console.log('════════════════════════════════════════════════════════')
  console.log(`Episode ID: ${episodeId}`)
  console.log('')

  // Fetch episode
  const { data: episode, error: epError } = await supabase
    .from('episodes').select('id, title, bible_reference, transcription_text, status, editorial_status').eq('id', episodeId).single()
  if (epError || !episode) { console.error(`❌ Episódio não encontrado.`); process.exit(1) }

  console.log('📋 Episódio encontrado:')
  console.log(`   Título: "${episode.title}"`)
  console.log(`   Referência: ${episode.bible_reference || 'N/A'}`)
  console.log(`   Transcrição: ${episode.transcription_text ? `${episode.transcription_text.length} caracteres` : 'NÃO tem'}`)
  console.log('')

  // Check for existing daily_quotes
  const { data: existingQuotes } = await supabase
    .from('daily_quotes').select('*').eq('episode_id', episodeId)

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  if (existingQuotes && existingQuotes.length > 0) {
    const q = existingQuotes[0]
    console.log('🔍 Já existe daily_quote vinculada:')
    console.log(`   Texto: "${(q.quote_text || '').slice(0, 80)}..."`)
    console.log(`   Status: ${q.status}`)
    console.log(`   card_image_url: ${q.card_image_url ? '✅' : '❌ NÃO TEM'}`)
    console.log(`   background_image_url: ${q.background_image_url ? '✅' : '❌ NÃO TEM'}`)
    console.log('')

    if (!q.background_image_url && !q.card_image_url) {
      const wantImage = await askYesNo(rl, 'Esta quote não tem imagem de fundo. Deseja gerar uma imagem FLUX agora?')
      if (!wantImage) { console.log('Ok, nada foi alterado.'); rl.close(); process.exit(0) }

      // Generate visual prompt + FLUX image + upload
      console.log('🎨 Gerando prompt visual via DeepSeek...')
      let sceneDesc
      try { sceneDesc = await generateFluxVisualPrompt(q.quote_text) }
      catch (err) { console.error(`❌ Erro no prompt visual: ${err.message}`); rl.close(); process.exit(1) }
      console.log(`   Cena: ${sceneDesc.slice(0, 100)}...`)

      console.log('🖼️  Gerando imagem via FAL.ai FLUX...')
      let fluxImage
      try { fluxImage = await generateFluxImage(sceneDesc) }
      catch (err) { console.error(`❌ Erro FAL.ai: ${err.message}`); rl.close(); process.exit(1) }

      console.log('☁️  Upload para R2...')
      let backgroundUrl
      try { backgroundUrl = await uploadToR2(fluxImage.url) }
      catch (err) { console.error(`❌ Erro upload R2: ${err.message}`); rl.close(); process.exit(1) }

      // UPDATE the daily_quote
      const { error: updError } = await supabase.from('daily_quotes').update({
        background_image_url: backgroundUrl,
        source_image_url: backgroundUrl,
        source_image_provider: 'flux',
        card_generation_status: 'not_started',
      }).eq('id', q.id)

      if (updError) { console.error(`❌ Erro ao atualizar: ${updError.message}`); rl.close(); process.exit(1) }

      console.log('')
      console.log('════════════════════════════════════════════════════════')
      console.log('✅ IMAGEM DE FUNDO ADICIONADA!')
      console.log('════════════════════════════════════════════════════════')
      console.log(`   background_image_url: ${backgroundUrl}`)
      console.log('')
      console.log('ℹ️  O card composto (card_image_url) não foi gerado.')
      console.log('   O DailyQuoteCard usará o fallback CSS com esta imagem de fundo.')
    } else {
      console.log('Esta quote já tem imagem. Nada foi alterado.')
    }
    rl.close()
    process.exit(0)
  }

  // ── No existing quote — create one ──

  if (!episode.transcription_text || episode.transcription_text.trim().length < 100) {
    console.error('❌ Este episódio não tem transcrição suficiente.')
    rl.close()
    process.exit(1)
  }

  // Generate suggestions
  console.log('🤖 Gerando sugestões de texto via DeepSeek...')
  console.log('')
  let suggestions
  try { suggestions = await generateQuoteSuggestions({ transcriptionText: episode.transcription_text, title: episode.title, bibleReference: episode.bible_reference || '' }) }
  catch (err) { console.error(`❌ ${err.message}`); rl.close(); process.exit(1) }
  if (!suggestions || suggestions.length === 0) { console.error('❌ Nenhuma sugestão gerada.'); rl.close(); process.exit(1) }

  console.log(`✅ ${suggestions.length} sugestões:`)
  console.log('')
  suggestions.forEach((s, i) => {
    console.log(`   [${i + 1}] ${s.quote_text}`)
    if (s.reason) console.log(`       Justificativa: ${s.reason}`)
    if (s.score) console.log(`       Força: ${s.score}/10`)
    console.log('')
  })

  let choice
  while (true) {
    const answer = await askQuestion(rl, `Escolha (1-${suggestions.length}): `)
    const num = parseInt(answer, 10)
    if (Number.isFinite(num) && num >= 1 && num <= suggestions.length) { choice = num - 1; break }
    console.log(`   ⚠️ Digite 1-${suggestions.length}.`)
  }
  rl.close()

  const selected = suggestions[choice]
  console.log('')
  console.log(`✅ Escolhida: "${selected.quote_text}"`)

  const now = new Date().toISOString()
  const today = now.split('T')[0]
  const payload = {
    episode_id: episodeId,
    quote_text: selected.quote_text,
    status: 'published',
    published_at: now, date: today,
    scheduled_publish_at: null,
    source_type: 'ai_suggested',
    ai_suggestions: suggestions,
    selected_suggestion_index: choice,
    share_count: 0, like_count: 0,
    card_generation_status: 'not_started',
    card_image_url: null, background_image_url: null, share_image_url: null,
  }

  const { error: insertError } = await supabase.from('daily_quotes').insert([payload])
  if (insertError) { console.error(`❌ Erro INSERT: ${insertError.message}`); process.exit(1) }

  console.log('')
  console.log('════════════════════════════════════════════════════════')
  console.log('✅ PALAVRA DO DIA CRIADA!')
  console.log('════════════════════════════════════════════════════════')
  console.log(`   quote_text: "${selected.quote_text}"`)
  console.log(`   status: published  |  date: ${today}`)
  console.log('')
  console.log('ℹ️  Para gerar a imagem de fundo, execute o script novamente.')
}

main()