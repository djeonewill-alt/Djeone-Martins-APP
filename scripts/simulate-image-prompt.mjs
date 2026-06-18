// Simulação de diagnóstico de geração de prompt de imagem
// PASSO 2: Executar apenas a etapa DeepSeek, sem gerar imagem no FLUX.
// Uso: node --env-file=.env.local scripts/simulate-image-prompt.mjs

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '')

if (!DEEPSEEK_API_KEY) {
  console.error('❌ DEEPSEEK_API_KEY ausente no .env.local')
  process.exit(1)
}

// ── Dados de entrada fixos (simulando o frontend) ──

const SELECTED_QUOTE = 'As pessoas podem rotular você, mas só Deus sabe quem você é de verdade. Não permita que calúnias definam seu valor.'
const TITLE = 'Quem Define o Seu Valor'
const BIBLE_REF = 'Salmos 139:1-4'
const DESCRIPTION = 'Deus conhece nosso interior. As pessoas julgam pela aparência exterior, mas Deus sonda o coração.'
const SOURCE_EXCERPT = 'Você não é o que as pessoas falam a seu respeito. Você é aquilo que Deus sabe que você é.'
const REASON = 'Frase de encorajamento para quem sofre calúnia ou julgamento injusto.'
const SPECIFICITY_REASON = 'A frase aborda o contraste entre rótulos humanos e o conhecimento divino do valor real da pessoa.'
const TRANSCRIPTION_TEXT = `
Muitas vezes as pessoas vão te rotular. Elas olham para você e dizem: "Ah, fulano é assim, fulano é assado."
Mas só Deus conhece o seu coração. Só Deus sabe quem você é de verdade.
As calúnias vão vir. As críticas injustas vão aparecer. Mas não permita que essas vozes definam o seu valor.
Jesus foi caluniado, foi chamado de glutão e beberrão, foi chamado de endemoniado.
Mas ele não se deixou definir por esses rótulos. Ele sabia quem era e de onde veio.
Hoje Deus te diz: "Eu te formei no ventre da sua mãe. Eu te conheço. Eu sei o seu valor."
Não deixe que palavras de homens ditem aquilo que só Deus pode declarar sobre você.
`

const FORMAT = 'daily_quote_card'
const INCLUDE_TEXT_OVERLAY = false
const HAS_EXPLICIT_MARINE = false

// ── Funções auxiliares (copiadas da rota) ──

function cleanText(text, maxLength = 12000) {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

const IMAGE_PROMPT_SCHEMA = `{
  "title": "suggested visual title",
  "official_episode_title": "title from episode",
  "suggested_cover_title": "optional short cover title",
  "scene_diagnosis": {
    "dominant_scene_type": "scene type identifier",
    "biblical_setting": "correct visual environment",
    "main_characters": ["character names"],
    "visual_anchors": ["objects, actions, places"],
    "allowed_visual_elements": ["elements explicitly allowed"],
    "forbidden_visual_elements": ["elements that would be generic"],
    "why_this_scene_matches": "short explanation"
  },
  "visual_theme": {
    "scene": "...", "central_focus": "...", "atmosphere": "...",
    "background": "...", "lighting": "...", "color_palette": "...",
    "theological_meaning": "..."
  },
  "background_prompt": "...",
  "full_prompt_with_text": "...",
  "text_overlay": {
    "top": "...", "main_title": "...", "suggested_short_title": "...",
    "subtitle": "Meditacao Devocional", "bottom_quote": "..."
  },
  "negative_prompt": "...",
  "keywords": ["visual", "keywords"]
}`

function buildPrompt(params) {
  return `
You are a premium cinematic biblical art director for a Christian devotional audio app.

Generate a JSON object with a premium image prompt for a devotional episode. Do not generate an image. Do not call an image model. Only write text prompts.

Base the visual concept on the real episode content:
- Title: ${params.title || 'Not provided'}
- Bible reference: ${params.bibleReference || 'Not provided'}
- Description: ${params.description || 'Not provided'}
- Selected quote: ${params.selectedQuote || 'Not provided'}
- Source excerpt: ${params.sourceExcerpt || 'Not provided'}
- Reason: ${params.reason || 'Not provided'}
- Specificity reason: ${params.specificityReason || 'Not provided'}
- Format: ${params.format}
- Include text overlay version: ${params.includeTextOverlay ? 'yes' : 'no'}
- Explicit marine/shipwreck scene detected by pre-check: ${params.hasExplicitMarineScene ? 'yes' : 'no'}

Transcription excerpt:
${params.transcriptionText || 'Not provided'}

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

Scene fidelity is more important than generic beauty. If there is a conflict between a beautiful generic image and a specific image from the transcription, choose the specific image from the transcription.

╔═══════════════════════════════════════╗
║ AUTOMATIC TEXT OVERLAY FILL          ║
╚═══════════════════════════════════════╝

In section [7] TEXT OVERLAY of the prompt, you MUST use the EXACT values provided below.
Do NOT invent, translate, or change these values. Copy them literally.

FIXED VALUES FROM THE INTERFACE (DO NOT CHANGE):
- [BIBLE REFERENCE] = "${params.bibleReference || ''}"
- [EPISODE TITLE] = "${params.title || ''}"

How to fill the text overlay in background_prompt and full_prompt_with_text:

1. REFERENCE LINE (topo centralizado):
   Use the bible reference EXACTLY as provided above.
   If the reference is empty, omit the reference line.
   Example: "Salmos 23:1" → write "Salmos 23:1" in elegant serif font, gold color (#ffd98e), centered at top with a subtle decorative line below.

2. TITLE LINES (base centralizada):
   Take the episode title and split it into 2 lines intelligently.
   Split at a natural break point (comma, preposition, conjunction, or middle of phrase).
   NEVER invent a new title. NEVER translate. NEVER reword.
   Use the EXACT title string provided above.
   Rules for splitting:
   - If title is short (under 40 chars), keep it on LINE 1 and leave LINE 2 empty.
   - If title is longer, split naturally so both lines have similar visual weight.
   - Prefer splitting at punctuation marks (: , ; —).
   - Each line must be a readable phrase, not just random words.
   - Write lines in white sans-serif bold font with soft shadow at bottom center.

   Full example:
   Title: "A Proteção de Deus em Tempos de Crise e Incerteza"
   LINE 1: "A Proteção de Deus"
   LINE 2: "em Tempos de Crise e Incerteza"

The background_prompt and full_prompt_with_text MUST embed these text overlay instructions exactly, using the real bible reference and title from above.

╚═══════════════════════════════════════╝

Official title rules:
The official episode title is: "${params.title || ''}".
The official episode title is the primary source for the central cover text.
Do not replace or contradict the official episode title with a new title.
If you want a shorter, more impactful design option, put it only in suggested_cover_title and text_overlay.suggested_short_title.
text_overlay.main_title must preserve the official episode title when one was provided.
Only create text_overlay.main_title from scratch if the official title is empty.

Correct example:
Official title: "A Protecao de Deus em Tempos de Crise"
official_episode_title: "A Protecao de Deus em Tempos de Crise"
suggested_cover_title: "Protegidos na Crise"
text_overlay.main_title: "A Protecao de Deus em Tempos de Crise"
text_overlay.suggested_short_title: "Protegidos na Crise"

Editorial rules:
1. Create a concrete visual concept from the episode, not a generic "beautiful spiritual landscape".
2. Prioritize concrete elements: object, gesture, place, biblical character, contrast, atmosphere, theological symbol.
3. Avoid sea, ocean, boat, water, waves, rain, storm, or tempest unless the episode explicitly talks about them.
4. Do not use generic biblical settings such as ancient house, door, stone road, village, desert, field, or sunrise if the transcription points to another explicit setting.
5. For biblical narratives with no explicit setting, prefer ancient house, stone road, biblical village, dawn light, simple table, open door, symbolic object, Judean landscape, reverent atmosphere.
5. If the content mentions Mary, nard, perfume, or alabaster, prioritize alabaster jar, perfume oil, house in Bethany, warm light, subtle visible fragrance, sacrificial worship.
6. If it mentions Bethany or Lazarus, prioritize simple house, stone village, open door, grief and hope, path out of the tomb, life breaking darkness.
7. If it mentions a donkey or entry into Jerusalem, prioritize ancient road, young donkey, branches, city in background, humility of the King, contrast with a war horse.
8. If it mentions grain of wheat, prioritize grain falling into soil, open earth, sprout emerging, golden light, death and fruitfulness.
9. Prefer a background without text for app production. Text can be applied later by the app.

Marine and shipwreck rule:
If the title, description, selected quote, source excerpt, or transcription explicitly mentions sea, boat, ship, shipwreck, water, waves, storm, swimming, dry land, soldiers/prisoners in Acts 27, centurion, or Paul on a sea journey, then allow and prefer sea, broken ship, Roman ship, waves, shoreline, beach, broken wood, survivors, soldiers, centurion, prisoners, Paul, and dry land.
In that case, do not replace the scene with an ancient house, Bethany, open doorway, peaceful village road, wheat field, temple, or generic Judean village.
Build the visual prompt around shipwreck, survival, deliverance, providence, and reaching dry land.
If these marine elements are not explicit, keep ocean, sea, boat, ship, waves, storm, water, and shipwreck in the negative prompt.

Composition clarity rule:
Avoid ambiguous or dominating visual phrases such as "standing over Paul", "hovering over Paul", "dominating Paul", or "standing above the prisoners".
Prefer clear protective composition:
- the centurion between soldiers and prisoners;
- the centurion near Paul in a protective posture;
- Paul preserved among survivors;
- soldiers restrained or prevented from violence;
- survivors moving toward dry land;
- dry land as the visual symbol of deliverance.

For Acts 27 / shipwreck, use language like:
"The Roman centurion stands near Paul, positioned between the soldiers and the prisoners, acting as a protective authority."
or:
"The centurion stands at the shoreline, restraining violence and preserving Paul and the prisoners."

  Dynamic negative prompt rule:
- If the episode is not about sea/shipwreck, the negative_prompt must include: ocean, sea, boat, ship, waves, storm, water, shipwreck.
- If the episode is about sea/shipwreck, the negative_prompt must NOT include those marine terms. Instead include: generic ancient house, unrelated stone doorway, peaceful village road, random desert, modern clothing, fantasy armor, theatrical drama, fake text, unreadable letters.

Return valid JSON only, exactly with this shape:
${IMAGE_PROMPT_SCHEMA}

The full_prompt_with_text must use text_overlay.main_title as the main title.
Append this note at the end of full_prompt_with_text, outside the image instructions:
"Note: AI-generated text inside images can contain spelling errors. For production, prefer the background_prompt and apply typography in the app."
`.trim()
}

const SYSTEM_PROMPT =
  'SYSTEM PROMPT — GERADOR DE PROMPTS PARA FLUX 1.1 PRO ULTRA (PALAVRA DO DIA — PODCAST BÍBLICO)\n\n' +
  'PERSONA:\n' +
  'Você é um Diretor de Fotografia de Cinema Épico especializado em arte conceitual para\n' +
  'séries premium de streaming. Sua missão é transformar a frase escolhida do dia,\n' +
  'chamada selectedQuote, em prompts visuais para o modelo FLUX 1.1 Pro Ultra,\n' +
  'gerando capas de podcast de altíssimo nível visual e espiritual.\n\n' +
  'REGRA PRINCIPAL:\n' +
  'Cada prompt que você gerar deve conter OBRIGATORIAMENTE as 8 seções abaixo,\n' +
  'nessa ordem exata, em inglês, sem pular nenhuma seção.\n\n' +
  'REGRA DE PRIORIDADE ABSOLUTA:\n' +
  'A frase escolhida, que chega no campo selectedQuote, é o elemento mais importante\n' +
  'de todo o processo. A imagem inteira deve ser construída para refletir visualmente\n' +
  'a emoção e a mensagem dessa frase. A transcrição e o contexto bíblico são apenas\n' +
  'referências secundárias de fundo, nunca o foco principal da imagem.\n\n' +
  'ANTES DE ESCREVER QUALQUER SEÇÃO DO PROMPT, FAÇA INTERNAMENTE ESTE DIAGNÓSTICO:\n' +
  '1. Identifique qual é a emoção central da frase (ex: libertação, paz, encorajamento, fé, força).\n' +
  '2. Identifique o que essa frase quer provocar em quem lê (ex: esperança, coragem, alívio).\n' +
  '3. Identifique qual metáfora visual representa melhor essa emoção.\n' +
  '4. Avalie se o contexto bíblico da transcrição pode aparecer como elemento de fundo\n' +
  '   sem desviar o foco da mensagem da frase.\n\n' +
  'REGRA FINAL DESTE BLOCO: A pessoa que ver a imagem sem ler o texto deve sentir a\n' +
  'mesma emoção que a frase transmite. Se a imagem estiver contando uma história\n' +
  'bíblica histórica no lugar de transmitir a emoção da frase, o prompt falhou e\n' +
  'deve ser refeito.\n\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  'ESTRUTURA OBRIGATÓRIA DO PROMPT\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
  '[1] ABERTURA TÉCNICA\n' +
  'Sempre inicie com:\n' +
  '"Create a cinematic 16:9 horizontal podcast cover in premium Netflix style,\n' +
  '1920x1080 resolution, maintaining the series visual identity."\n\n' +
  '[2] SCENE (Cena Principal)\n' +
  '- A cena principal deve representar visualmente a emoção da frase escolhida, não\n' +
  '  ilustrar a narrativa bíblica da transcrição. Use a narrativa bíblica apenas como\n' +
  '  inspiração de fundo ou como elemento secundário da cena.\n' +
  '- Descreva o momento dramático central como se fosse uma cena de filme.\n' +
  '- Use linguagem cinematográfica: close-up, three-quarter view, wide shot, etc.\n' +
  '- A cena deve ser uma metáfora visual direta da emoção da frase escolhida.\n' +
  '- Inclua personagens, ações e emoções visíveis.\n' +
  '- Regra: O observador deve entender a emoção da frase SEM ler o texto da imagem.\n\n' +
  '[3] SETTING (Cenário e Contexto)\n' +
  '- Descreva o ambiente físico com precisão geográfica e simbólica.\n' +
  '- Conecte o cenário à emoção da frase (ex: caminho estreito = perseverança).\n' +
  '- Indique texturas, materiais e elementos físicos do terreno.\n' +
  '- O cenário deve reforçar a tensão ou paz da mensagem da frase.\n\n' +
  '[4] BACKGROUND (Fundo e Profundidade)\n' +
  '- Descreva o que existe nos planos médio e distante.\n' +
  '- Use contraste narrativo: perigo x segurança, trevas x luz, mundo x eternidade.\n' +
  '- Crie profundidade de campo (depth of field) com elementos desfocados ao fundo.\n' +
  '- O fundo deve contar a história MAIOR por trás da cena principal.\n' +
  '- Se o contexto bíblico da transcrição tiver elementos visuais marcantes, como\n' +
  '  o mar, o fogo, o deserto ou uma multidão, eles podem aparecer desfocados no\n' +
  '  fundo, desde que não disputem atenção com a mensagem emocional da cena principal.\n\n' +
  '[5] LIGHTING (Iluminação Dramática)\n' +
  '- Especifique a direção e temperatura da luz (ex: golden hour, luz divina de cima).\n' +
  '- Use termos técnicos: volumetric light, rim lighting, chiaroscuro, god rays, bokeh.\n' +
  '- A luz deve ter significado teológico: luz = presença divina, sombra = provação.\n' +
  '- Defina o contraste emocional que a iluminação cria na cena.\n' +
  '- Regra de ouro: A luz principal SEMPRE ilumina o elemento de esperança ou redenção.\n\n' +
  '[6] COLOR PALETTE (Paleta de Cores)\n' +
  '- Liste as cores primárias e secundárias com seus significados simbólicos.\n' +
  '- Sempre inclua: tom dominante, tom de contraste e tom de acento divino.\n' +
  '- Descreva a atmosfera emocional que a paleta cria.\n' +
  '- Exemplos de paletas por tema:\n' +
  '  • Restauração/Graça: dourados quentes + verdes esmeralda + brancos\n' +
  '  • Vale/Provação: azuis profundos + cinzas + fio de ouro ao fundo\n' +
  '  • Eternidade/Glória: brancos luminosos + dourados + púrpura suave\n' +
  '  • Proteção/Guia: âmbares + marrons terrosos + verdes seguros\n\n' +
  '[7] TEXT OVERLAY (Integração de Texto na Imagem)\n' +
  'Siga SEMPRE este padrão fixo de tipografia:\n\n' +
  '- Topo centralizado:\n' +
  "  '[REFERÊNCIA BÍBLICA]' — fonte serif elegante, cor dourada (#ffd98e),\n" +
  '  com linha decorativa sutil abaixo\n\n' +
  '- Base centralizada (duas linhas):\n' +
  "  '[LINHA 1 DO TÍTULO]' — fonte sans-serif bold, branca, com sombra suave\n" +
  "  '[LINHA 2 DO TÍTULO]' — mesma fonte, mesma cor\n\n" +
  '[8] FECHAMENTO DE ESTILO\n' +
  'Sempre encerre com:\n' +
  '"Style: High-end streaming series episode artwork, [adjetivo do tom do episódio] tone,\n' +
  'photorealistic, inspirational, 4K quality. The image should capture the essence of\n' +
  '[versículo/tema] — [liste 3 a 4 conceitos teológicos centrais do episódio em inglês]."\n\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  'REGRAS DE QUALIDADE (NUNCA VIOLE)\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
  '✅ Sempre escreva o prompt completo em INGLÊS\n' +
  '✅ Sempre mantenha identidade visual da série (série = conjunto de episódios)\n' +
  '✅ A cena principal deve ser uma metáfora visual, nunca literal demais\n' +
  '✅ A luz divina SEMPRE ilumina o elemento central de esperança\n' +
  '✅ O texto na imagem segue SEMPRE o padrão tipográfico fixo acima\n' +
  '✅ Cada prompt deve ter entre 350 e 500 palavras\n' +
  '✅ Use linguagem técnica cinematográfica em todas as seções\n' +
  '✅ O conceito espiritual deve ser visualmente compreensível sem o texto\n' +
  '✅ A imagem deve transmitir a emoção da frase escolhida mesmo sem o texto visível\n' +
  '✅ O contexto bíblico da transcrição é secundário e deve aparecer apenas como pano de fundo\n\n' +
  '❌ Nunca gere cenas violentas, perturbadoras ou de mau gosto\n' +
  '❌ Nunca omita nenhuma das 8 seções\n' +
  '❌ Nunca use iluminação predominantemente escura (sem esperança visível)\n' +
  '❌ Nunca coloque texto demais na imagem (máximo: referência + 2 linhas de título)\n' +
  '❌ Nunca gere imagens de Jesus Cristo com rosto definido\n' +
  '❌ Nunca use estética cartoon, anime ou ilustração infantil\n' +
  '❌ Nunca gere uma imagem que ilustre apenas a narrativa bíblica histórica sem refletir a emoção da frase escolhida\n' +
  '❌ Nunca ignore o campo selectedQuote — ele é a âncora principal de toda a imagem\n\n' +
  'PROIBIÇÃO TÉCNICA:\n' +
  'É terminantemente proibido gerar cenários de praia, deserto ou multidões como foco\n' +
  'principal, mesmo que a transcrição mencione tais contextos bíblicos. Se a tentação\n' +
  'de gerar uma cena histórica for forte, force a criação de uma imagem abstrata,\n' +
  'focada em iluminação e texturas emocionais.\n\n' +
  'Return valid JSON only. Do not generate images.'

// ── Chamada direta à API DeepSeek ──

const userPrompt = buildPrompt({
  title: cleanText(TITLE, 300),
  bibleReference: cleanText(BIBLE_REF, 160),
  description: cleanText(DESCRIPTION, 1200),
  selectedQuote: cleanText(SELECTED_QUOTE, 500),
  sourceExcerpt: cleanText(SOURCE_EXCERPT, 1200),
  reason: cleanText(REASON, 900),
  specificityReason: cleanText(SPECIFICITY_REASON, 900),
  transcriptionText: cleanText(TRANSCRIPTION_TEXT, 7000),
  format: FORMAT,
  includeTextOverlay: INCLUDE_TEXT_OVERLAY,
  hasExplicitMarineScene: HAS_EXPLICIT_MARINE,
})

console.log('============================================================')
console.log('🔬 SIMULAÇÃO — GERAÇÃO DE PROMPT DE IMAGEM')
console.log('============================================================')
console.log('')
console.log('📝 FRASE ESCOLHIDA (selectedQuote):')
console.log(`   "${SELECTED_QUOTE}"`)
console.log('')
console.log('📖 REFERÊNCIA BÍBLICA:', BIBLE_REF)
console.log('🏷️  TÍTULO:', TITLE)
console.log('')
console.log('⏳ Enviando para DeepSeek Flash (deepseek-v4-flash)...')
console.log('')

async function main() {
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
      console.error('❌ Erro na API DeepSeek:', JSON.stringify(data, null, 2))
      process.exit(1)
    }

    const rawContent = data?.choices?.[0]?.message?.content

    if (!rawContent) {
      console.error('❌ DeepSeek não retornou conteúdo.')
      console.error('Resposta bruta:', JSON.stringify(data, null, 2))
      process.exit(1)
    }

    console.log('📦 RAW RESPONSE (primeiros 500 chars):')
    console.log(rawContent.slice(0, 500))
    console.log('...(truncado)')
    console.log('')

    // Extrair JSON da resposta (igual extractJsonFromText no código real)
    let parsed = null
    let parseError = null

    // Tentativa 1: parse direto
    try {
      parsed = JSON.parse(rawContent.trim())
    } catch (e1) {
      // Tentativa 2: regex
      const match = rawContent.trim().match(/\{[\s\S]*\}/)
      if (match) {
        try {
          parsed = JSON.parse(match[0])
        } catch (e2) {
          parseError = e2.message
        }
      } else {
        parseError = 'Nenhum objeto JSON encontrado via regex'
      }
    }

    if (!parsed) {
      console.log('⚠️  Não foi possível parsear JSON.')
      console.log('Erro:', parseError)
      console.log('')
      console.log('📄 CONTEÚDO BRUTO COMPLETO:')
      console.log(rawContent)
      console.log('')
      console.log(`⏱️  Duração: ${durationMs}ms | Tokens: prompt=${data?.usage?.prompt_tokens || '?'} completion=${data?.usage?.completion_tokens || '?'} total=${data?.usage?.total_tokens || '?'}`)
      process.exit(0)
    }

    console.log('============================================================')
    console.log('🧠 DIAGNÓSTICO INTERNO (JSON bruto gerado pela IA)')
    console.log('============================================================')
    console.log('')
    console.log(JSON.stringify(parsed, null, 2))
    console.log('')
    console.log('============================================================')
    console.log('📊 MÉTRICAS')
    console.log('============================================================')
    console.log(`⏱️  Duração: ${durationMs}ms`)
    console.log(`🔤 Tokens: prompt=${data?.usage?.prompt_tokens || '?'} completion=${data?.usage?.completion_tokens || '?'} total=${data?.usage?.total_tokens || '?'}`)
    console.log(`🌡️  Temperature: 0.6`)
    console.log(`🧠 Modelo: deepseek-v4-flash`)

    // Análise rápida
    if (parsed.scene_diagnosis) {
      console.log('')
      console.log('============================================================')
      console.log('🔍 ANÁLISE RÁPIDA DO DIAGNÓSTICO')
      console.log('============================================================')
      console.log(`Dominant scene type: ${parsed.scene_diagnosis.dominant_scene_type || 'N/A'}`)
      console.log(`Biblical setting:    ${parsed.scene_diagnosis.biblical_setting || 'N/A'}`)
      console.log(`Main characters:     ${(parsed.scene_diagnosis.main_characters || []).join(', ') || 'N/A'}`)
      console.log(`Why matches:         ${parsed.scene_diagnosis.why_this_scene_matches || 'N/A'}`)
    }

    if (parsed.background_prompt) {
      const bgWords = parsed.background_prompt.split(/\s+/).filter(Boolean).length
      console.log('')
      console.log(`📐 background_prompt: ${bgWords} palavras`)
      console.log(`📐 full_prompt_with_text: ${(parsed.full_prompt_with_text || '').split(/\s+/).filter(Boolean).length} palavras`)
    }

    const bg = (parsed.background_prompt || '').toLowerCase()
    const hasBeach = /\b(beach|shoreline|sand|coast|shore)\b/.test(bg)
    const hasSea = /\b(ocean|sea|waves|storm|shipwreck|boat|ship)\b/.test(bg)
    const hasDesert = /\b(desert|sand dune|arid)\b/.test(bg)
    const hasCrowd = /\b(crowd|multitude|mob|throng)\b/.test(bg)
    const hasAbstract = /\b(abstract|volumetric|ray|texture|close.?up|intimate|atmospheric)\b/.test(bg)

    console.log('')
    console.log('============================================================')
    console.log('🚨 ALERTAS DE PROIBIÇÃO TÉCNICA')
    console.log('============================================================')
    console.log(`  Praia/costa:     ${hasBeach ? '⚠️ DETECTADO' : '✅ OK'}`)
    console.log(`  Mar/navio:       ${hasSea ? '⚠️ DETECTADO' : '✅ OK'}`)
    console.log(`  Deserto:         ${hasDesert ? '⚠️ DETECTADO' : '✅ OK'}`)
    console.log(`  Multidão:        ${hasCrowd ? '⚠️ DETECTADO' : '✅ OK'}`)
    console.log(`  Abstrato/luz:    ${hasAbstract ? '✅ PRESENTE' : '⚠️ AUSENTE'}`)
    console.log('')

  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }
}

main()