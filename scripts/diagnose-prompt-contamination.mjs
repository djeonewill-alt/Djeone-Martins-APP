// Diagnóstico de contaminação de contexto na geração de prompt
// Testa 3 cenários: (A) Input completo, (B) Apenas selectedQuote, (C) selectedQuote + referência bíblica

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '')

if (!DEEPSEEK_API_KEY) {
  console.error('DEEPSEEK_API_KEY ausente')
  process.exit(1)
}

function cleanText(text, maxLength = 12000) {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

const IMAGE_PROMPT_SCHEMA = `{
  "title": "...", "official_episode_title": "...", "suggested_cover_title": "...",
  "scene_diagnosis": { "dominant_scene_type": "...", "biblical_setting": "...", "main_characters": ["..."], "visual_anchors": ["..."], "allowed_visual_elements": ["..."], "forbidden_visual_elements": ["..."], "why_this_scene_matches": "..." },
  "visual_theme": { "scene": "...", "central_focus": "...", "atmosphere": "...", "background": "...", "lighting": "...", "color_palette": "...", "theological_meaning": "..." },
  "background_prompt": "...", "full_prompt_with_text": "...",
  "text_overlay": { "top": "...", "main_title": "...", "suggested_short_title": "...", "subtitle": "Meditacao Devocional", "bottom_quote": "..." },
  "negative_prompt": "...", "keywords": ["..."]
}`

function buildUserPrompt(params) {
  // params: { selectedQuote, title?, bibleReference?, description?, sourceExcerpt?, reason?, specificityReason?, transcriptionText? }
  const t = cleanText(params.title || '', 300)
  const br = cleanText(params.bibleReference || '', 160)
  const d = cleanText(params.description || '', 1200)
  const sq = cleanText(params.selectedQuote || '', 500)
  const se = cleanText(params.sourceExcerpt || '', 1200)
  const r = cleanText(params.reason || '', 900)
  const sr = cleanText(params.specificityReason || '', 900)
  const tr = cleanText(params.transcriptionText || '', 7000)
  const fmt = params.format || 'daily_quote_card'
  const ov = params.includeTextOverlay ? 'yes' : 'no'
  const mar = params.hasExplicitMarineScene ? 'yes' : 'no'

  return `
You are a premium cinematic biblical art director for a Christian devotional audio app.

Generate a JSON object with a premium image prompt for a devotional episode. Do not generate an image. Do not call an image model. Only write text prompts.

Base the visual concept on the real episode content:
- Title: ${t || 'Not provided'}
- Bible reference: ${br || 'Not provided'}
- Description: ${d || 'Not provided'}
- Selected quote: ${sq || 'Not provided'}
- Source excerpt: ${se || 'Not provided'}
- Reason: ${r || 'Not provided'}
- Specificity reason: ${sr || 'Not provided'}
- Transcription text: ${tr || 'Not provided'}
- Format: ${fmt}
- Include text overlay version: ${ov}

Transcription excerpt:
${tr || 'Not provided'}

Mandatory scene diagnosis before writing prompts:
Before writing any visual prompt, read the content and identify:
1. the dominant biblical scene;
2. the correct geographic environment;
3. the main characters;
4. concrete objects and actions;
5. the spiritual/devotional tension;
6. allowed visual elements;
7. forbidden visual elements.
Then write the prompt using that specific scene.

Scene fidelity is more important than generic beauty.

Official title rules:
The official episode title is: "${t || ''}".
The official episode title is the primary source for the central cover text.

Editorial rules:
1. Create a concrete visual concept from the episode, not a generic "beautiful spiritual landscape".
2. Prioritize concrete elements: object, gesture, place, biblical character, contrast, atmosphere, theological symbol.
3. Avoid sea, ocean, boat, water, waves, rain, storm, or tempest unless the episode explicitly talks about them.
4. Do not use generic biblical settings such as ancient house, door, stone road, village, desert, field, or sunrise if the transcription points to another explicit setting.

Marine and shipwreck rule:
If the title, description, selected quote, source excerpt, or transcription explicitly mentions sea, boat, ship, shipwreck, water, waves, storm, swimming, dry land, soldiers/prisoners in Acts 27, centurion, or Paul on a sea journey, then allow and prefer sea.
If these marine elements are not explicit, keep ocean, sea, boat, ship, waves, storm, water, and shipwreck in the negative prompt.

Return valid JSON only, exactly with this shape:
${IMAGE_PROMPT_SCHEMA}

The full_prompt_with_text must use text_overlay.main_title as the main title.
Append this note at the end of full_prompt_with_text, outside the image instructions:
"Note: AI-generated text inside images can contain spelling errors. For production, prefer the background_prompt and apply typography in the app."
`.trim()
}

// ── Prompt de sistema simplificado para diagnóstico ──

const SYSTEM_PROMPT =
  'SYSTEM PROMPT — GERADOR DE PROMPTS PARA FLUX 1.1 PRO ULTRA (PALAVRA DO DIA — PODCAST BÍBLICO)\n\n' +
  'PERSONA:\n' +
  'Você é um Diretor de Fotografia de Cinema Épico especializado em arte conceitual para\n' +
  'séries premium de streaming. Sua missão é transformar a frase escolhida do dia,\n' +
  'chamada selectedQuote, em prompts visuais para o modelo FLUX 1.1 Pro Ultra,\n' +
  'gerando capas de podcast de altíssimo nível visual e espiritual.\n\n' +
  'REGRA DE PRIORIDADE ABSOLUTA:\n' +
  'A frase escolhida (selectedQuote) é o elemento mais importante de todo o processo.\n' +
  'A imagem inteira deve ser construída para refletir visualmente a emoção e a mensagem\n' +
  'dessa frase. A transcrição e o contexto bíblico são apenas referências secundárias\n' +
  'de fundo, nunca o foco principal da imagem.\n\n' +
  'ANTES DE ESCREVER QUALQUER SEÇÃO DO PROMPT, FAÇA INTERNAMENTE ESTE DIAGNÓSTICO:\n' +
  '1. Qual é a emoção central da frase? (libertação, paz, encorajamento, fé, força)\n' +
  '2. O que essa frase quer provocar em quem lê? (esperança, coragem, alívio)\n' +
  '3. Qual metáfora visual representa melhor essa emoção?\n' +
  '4. O contexto bíblico da transcrição pode aparecer como fundo SEM desviar o foco?\n\n' +
  'REGRA FINAL: A pessoa que ver a imagem sem ler o texto deve sentir a mesma emoção\n' +
  'que a frase transmite. Se a imagem estiver contando uma história bíblica histórica\n' +
  'no lugar de transmitir a emoção da frase, o prompt falhou.\n\n' +
  'PROIBIÇÃO TÉCNICA:\n' +
  'É terminantemente proibido gerar cenários de praia, deserto ou multidões como foco\n' +
  'principal. Force a criação de imagens abstratas, focadas em iluminação e texturas\n' +
  'emocionais.\n\n' +
  'Gere exatamente as 8 seções, em inglês, 350-500 palavras. JSON válido apenas.'

const SELECTED_QUOTE = 'As pessoas podem rotular você, mas só Deus sabe quem você é de verdade. Não permita que calúnias definam seu valor.'

// Cenário A: TUDO (simulando o que o frontend envia de verdade)
const INPUT_A = {
  title: 'Quem Define o Seu Valor',
  bibleReference: 'Salmos 139:1-4',
  description: 'Deus conhece nosso interior. As pessoas julgam pela aparência exterior, mas Deus sonda o coração.',
  selectedQuote: SELECTED_QUOTE,
  sourceExcerpt: 'Você não é o que as pessoas falam a seu respeito. Você é aquilo que Deus sabe que você é.',
  reason: 'Frase de encorajamento para quem sofre calúnia ou julgamento injusto.',
  specificityReason: 'A frase aborda o contraste entre rótulos humanos e o conhecimento divino do valor real da pessoa.',
  transcriptionText: `
Muitas vezes as pessoas vão te rotular. Elas olham para você e dizem: "Ah, fulano é assim, fulano é assado."
Mas só Deus conhece o seu coração. Só Deus sabe quem você é de verdade.
As calúnias vão vir. As críticas injustas vão aparecer. Mas não permita que essas vozes definam o seu valor.
Jesus foi caluniado, foi chamado de glutão e beberrão, foi chamado de endemoniado.
Mas ele não se deixou definir por esses rótulos. Ele sabia quem era e de onde veio.
Hoje Deus te diz: "Eu te formei no ventre da sua mãe. Eu te conheço. Eu sei o seu valor."
Não deixe que palavras de homens ditem aquilo que só Deus pode declarar sobre você.
`,
  format: 'daily_quote_card',
  includeTextOverlay: false,
  hasExplicitMarineScene: false,
}

// Cenário B: APENAS selectedQuote (teste de isolamento)
const INPUT_B = {
  selectedQuote: SELECTED_QUOTE,
  format: 'daily_quote_card',
  includeTextOverlay: false,
  hasExplicitMarineScene: false,
}

async function runScenario(label, input) {
  console.log(`\n${'='.repeat(70)}`)
  console.log(`CENÁRIO ${label}`)
  console.log(`${'='.repeat(70)}`)

  console.log('\n--- INPUT ENVIADO ---')
  console.log(JSON.stringify(Object.fromEntries(
    Object.entries(input).map(([k, v]) => [k, typeof v === 'string' && v.length > 200 ? v.slice(0, 200) + '...' : v])
  ), null, 2))

  const userPrompt = buildUserPrompt(input)
  console.log('\n--- USER PROMPT SIZE ---')
  console.log(`${userPrompt.split(/\s+/).filter(Boolean).length} palavras, ${userPrompt.length} chars`)

  console.log('\nEnviando para DeepSeek Flash...')
  const startTime = Date.now()

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 4096,
      }),
    })

    const data = await response.json()
    const durationMs = Date.now() - startTime

    if (!response.ok) {
      console.error('Erro:', JSON.stringify(data, null, 2))
      return
    }

    const rawContent = data?.choices?.[0]?.message?.content
    if (!rawContent) {
      console.error('Sem conteúdo.')
      console.error('Resposta:', JSON.stringify(data, null, 2))
      return
    }

    let parsed = null
    try { parsed = JSON.parse(rawContent.trim()) } catch {
      const match = rawContent.trim().match(/\{[\s\S]*\}/)
      if (match) try { parsed = JSON.parse(match[0]) } catch {}
    }

    if (!parsed) {
      console.log('JSON malformado. RAW:')
      console.log(rawContent)
      return
    }

    // Análise
    const bg = (parsed.background_prompt || '').toLowerCase()
    const scene = parsed.scene_diagnosis || {}
    const chars = (parsed.main_characters || []).join(', ') || 'NONE'

    console.log('\n--- RESULTADO ---')
    console.log(`⏱️  ${durationMs}ms | tokens: ${data?.usage?.total_tokens || '?'}`)
    console.log(`Scene type:     ${scene.dominant_scene_type || 'N/A'}`)
    console.log(`Biblical set:   ${scene.biblical_setting || 'N/A'}`)
    console.log(`Characters:     ${chars}`)
    console.log(`Why matches:    ${(scene.why_this_scene_matches || '').slice(0, 150)}`)
    console.log(`BG prompt words: ${bg.split(/\s+/).filter(Boolean).length}`)

    const checks = {
      beach: /\b(beach|shoreline|sand|coast)\b/i.test(bg),
      sea: /\b(ocean|sea|waves|storm|shipwreck|boat|ship)\b/i.test(bg),
      desert: /\b(desert|sand dune|arid)\b/i.test(bg),
      crowd: /\b(crowd|multitude|mob|throng)\b/i.test(bg),
      paul: /\bpaul\b/i.test(bg),
      abstract: /\b(abstract|volumetric|ray|texture|atmospheric|intimate|metaphor)\b/i.test(bg),
    }

    console.log('\n--- ALERTAS ---')
    console.log(`  Praia:    ${checks.beach ? 'VIOLADO' : 'ok'}`)
    console.log(`  Mar:      ${checks.sea ? 'VIOLADO' : 'ok'}`)
    console.log(`  Deserto:  ${checks.desert ? 'VIOLADO' : 'ok'}`)
    console.log(`  Multidão: ${checks.crowd ? 'VIOLADO' : 'ok'}`)
    console.log(`  Paulo:    ${checks.paul ? 'VIOLADO' : 'ok'}`)
    console.log(`  Abstrato: ${checks.abstract ? 'PRESENTE' : 'AUSENTE'}`)

    // Mostra o background_prompt completo (o que vai para o FLUX)
    console.log('\n--- BACKGROUND_PROMPT (vai para o FLUX) ---')
    console.log(parsed.background_prompt)

  } catch (error) {
    console.error('Erro:', error.message)
  }
}

async function main() {
  console.log('══════════════════════════════════════════════════════════════')
  console.log('DIAGNÓSTICO DE CONTAMINAÇÃO DE CONTEXTO')
  console.log('══════════════════════════════════════════════════════════════')
  console.log(`Frase: "${SELECTED_QUOTE}"`)

  // Cenário A: INPUT COMPLETO (como o frontend envia)
  await runScenario('A — INPUT COMPLETO (title + reference + description + transcription + quote)', INPUT_A)

  // Cenário B: APENAS SELECTED QUOTE
  await runScenario('B — APENAS selectedQuote (isolamento total)', INPUT_B)

  console.log('\n══════════════════════════════════════════════════════════════')
  console.log('DIAGNÓSTICO CONCLUÍDO')
  console.log('══════════════════════════════════════════════════════════════')
}

main()