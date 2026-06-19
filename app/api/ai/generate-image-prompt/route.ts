/**
 * AI-PROVIDER-004 — Rota migrada para usar a camada abstrata de IA.
 * AI-MEDIA-002 — Integração com Fal.ai FLUX Schnell para geração de imagens.
 *
 * Provedor primário de texto: DeepSeek Flash
 * Fallback automático: OpenAI (via AIClient)
 * Geração de imagem: Fal.ai FLUX Schnell → compressão WebP → upload R2
 *
 * Comportamento: gera prompt estruturado com DeepSeek e, quando solicitado,
 * chama o FLUX Schnell para gerar a imagem final com texto embutido.
 */

import { NextRequest, NextResponse } from 'next/server'

import { generateAndUploadFluxImage } from '@/lib/ai/fal'
import { getAIProvider } from '@/lib/ai/provider'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 120

type ImagePromptFormat = 'episode_cover' | 'daily_quote_card' | 'series_cover'

type ImagePromptResponse = {
  title: string
  official_episode_title: string
  suggested_cover_title: string
  scene_diagnosis: {
    dominant_scene_type: string
    biblical_setting: string
    main_characters: string[]
    visual_anchors: string[]
    allowed_visual_elements: string[]
    forbidden_visual_elements: string[]
    why_this_scene_matches: string
  }
  visual_theme: {
    scene: string
    central_focus: string
    atmosphere: string
    background: string
    lighting: string
    color_palette: string
    theological_meaning: string
  }
  background_prompt: string
  full_prompt_with_text: string
  text_overlay: {
    top: string
    main_title: string
    suggested_short_title: string
    subtitle: string
    bottom_quote: string
  }
  negative_prompt: string
  keywords: string[]
  recommended_version?: 'background_prompt'
  warning?: string
}

function cleanText(text: string, maxLength = 12000) {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function normalizeFormat(value: unknown): ImagePromptFormat {
  const format = cleanText(String(value || 'episode_cover')) as ImagePromptFormat

  return ['episode_cover', 'daily_quote_card', 'series_cover'].includes(format)
    ? format
    : 'episode_cover'
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => cleanText(String(item || ''), 80)).filter(Boolean).slice(0, 12)
    : []
}

function hasExplicitMarineScene(text: string) {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const marinePatterns = [
    /\batos\s*27\b/,
    /\bpaulo\b.*\b(viagem|navio|naufragio|mar)\b/,
    /\bcenturiao\b/,
    /\bsoldados?\b.*\bprisioneiros?\b/,
    /\bmar\b/,
    /\bbarco\b/,
    /\bnavio\b/,
    /\bnaufragio\b/,
    /\baguas?\b/,
    /\bondas?\b/,
    /\btempestade\b/,
    /\bnadar\b/,
    /\bnadando\b/,
    /\bterra firme\b/,
  ]

  return marinePatterns.some((pattern) => pattern.test(normalized))
}

function normalizePromptResponse(input: unknown): ImagePromptResponse {
  const value = input as Partial<ImagePromptResponse>
  const sceneDiagnosis = (value.scene_diagnosis || {}) as NonNullable<ImagePromptResponse['scene_diagnosis']>
  const visualTheme = (value.visual_theme || {}) as NonNullable<ImagePromptResponse['visual_theme']>
  const textOverlay = (value.text_overlay || {}) as NonNullable<ImagePromptResponse['text_overlay']>

  const response: ImagePromptResponse = {
    title: cleanText(String(value.title || 'Capa premium do episodio'), 120),
    official_episode_title: cleanText(String(value.official_episode_title || ''), 180),
    suggested_cover_title: cleanText(String(value.suggested_cover_title || ''), 120),
    scene_diagnosis: {
      dominant_scene_type: cleanText(String(sceneDiagnosis.dominant_scene_type || ''), 120),
      biblical_setting: cleanText(String(sceneDiagnosis.biblical_setting || ''), 220),
      main_characters: getStringArray(sceneDiagnosis.main_characters),
      visual_anchors: getStringArray(sceneDiagnosis.visual_anchors),
      allowed_visual_elements: getStringArray(sceneDiagnosis.allowed_visual_elements),
      forbidden_visual_elements: getStringArray(sceneDiagnosis.forbidden_visual_elements),
      why_this_scene_matches: cleanText(String(sceneDiagnosis.why_this_scene_matches || ''), 700),
    },
    visual_theme: {
      scene: cleanText(String(visualTheme.scene || ''), 700),
      central_focus: cleanText(String(visualTheme.central_focus || ''), 700),
      atmosphere: cleanText(String(visualTheme.atmosphere || ''), 700),
      background: cleanText(String(visualTheme.background || ''), 700),
      lighting: cleanText(String(visualTheme.lighting || ''), 700),
      color_palette: cleanText(String(visualTheme.color_palette || ''), 700),
      theological_meaning: cleanText(String(visualTheme.theological_meaning || ''), 900),
    },
    background_prompt: cleanText(String(value.background_prompt || ''), 5000),
    full_prompt_with_text: cleanText(String(value.full_prompt_with_text || ''), 5000),
    text_overlay: {
      top: cleanText(String(textOverlay.top || ''), 120),
      main_title: cleanText(String(textOverlay.main_title || ''), 120),
      suggested_short_title: cleanText(String(textOverlay.suggested_short_title || ''), 120),
      subtitle: cleanText(String(textOverlay.subtitle || 'Meditacao Devocional'), 120),
      bottom_quote: cleanText(String(textOverlay.bottom_quote || ''), 220),
    },
    negative_prompt: cleanText(String(value.negative_prompt || ''), 1500),
    keywords: getStringArray(value.keywords),
    recommended_version: 'background_prompt',
    warning:
      'background_prompt e a versao recomendada para producao no app. Textos gerados dentro de imagens por IA podem sair com letras erradas.',
  }

  if (!response.background_prompt || !response.full_prompt_with_text) {
    throw new Error('A IA nao retornou prompts completos.')
  }

  return response
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

function enforceOfficialTitle(
  response: ImagePromptResponse,
  officialTitle: string
) {
  const cleanOfficialTitle = cleanText(officialTitle, 180)

  if (!cleanOfficialTitle) {
    return response
  }

  return {
    ...response,
    official_episode_title: cleanOfficialTitle,
    text_overlay: {
      ...response.text_overlay,
      main_title: cleanOfficialTitle,
    },
  }
}

async function requireAdminUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { ok: false as const, status: 401, message: 'Nao autenticado.' }
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'djeonewill@gmail.com').toLowerCase()
  const userEmail = (user.email || '').toLowerCase()

  if (userEmail !== adminEmail) {
    return { ok: false as const, status: 403, message: 'Acesso restrito ao administrador.' }
  }

  return { ok: true as const }
}

function buildPrompt(params: {
  title: string
  bibleReference: string
  description: string
  selectedQuote: string
  sourceExcerpt: string
  reason: string
  specificityReason: string
  transcriptionText: string
  format: ImagePromptFormat
  includeTextOverlay: boolean
}) {
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

════════════════════════════════════════
AUTOMATIC TEXT OVERLAY FILL — CRITICAL RULE
════════════════════════════════════════

In section [7] TEXT OVERLAY of the prompt, you MUST use the EXACT values provided below.
Do NOT invent, translate, or change these values. Copy them literally.

FIXED VALUES FROM THE INTERFACE (DO NOT CHANGE):
- [REFERÊNCIA BÍBLICA] = "${params.bibleReference || ''}"
- [TÍTULO DO EPISÓDIO] = "${params.title || ''}"

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

   Another example:
   Title: "O Caminho da Fé"
   LINE 1: "O Caminho da Fé"
   LINE 2: (empty)

The background_prompt and full_prompt_with_text MUST embed these text overlay instructions exactly, using the real bible reference and title from above.

════════════════════════════════════════

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
9. COMPOSITION RULE — TEXT EMBEDDED IN THE IMAGE (CRITICAL):
   Every image MUST be generated as a FINAL, PUBLICATION-READY cinematic poster.
   The episode title and bible reference MUST be visibly embedded directly in the art,
   like a professional movie poster. Never generate a blank background expecting CSS overlay.
   Never instruct the image model to leave space for external text.
   - The bible reference must appear at the top center in an elegant serif font, gold color.
   - The episode title must appear at the bottom center in bold white sans-serif font.
   - The text must be clearly legible, correctly spelled, and harmoniously integrated
     with the visual composition.
   - Extract the EXACT title and reference from the context JSON above — never invent or
     translate them. These values are fixed and must be used verbatim.

Transcription-first scene rule (CRITICAL):
You are a biblical series art director. Your task is to read the episode transcription below
and extract the EXACT moment, setting, and main characters that are being described in the audio.
Based STRICTLY on what is being said in the transcription, describe a cinematic scene.

NEVER presume a future event or cliché that is not described in the text.
If the transcription describes the beginning of a journey, draw preparation and departure.
If it describes a moment of prayer, draw prayer.
If it describes creation, draw creation.
If it describes a storm and shipwreck, draw a storm and shipwreck.
If it describes calm waters and boarding a ship, draw calm waters and boarding.
If it describes Moses at the Red Sea, draw Moses at the Red Sea.

Do NOT jump ahead in the biblical narrative. Do NOT use clichés.
Read what the transcription actually says and build the visual prompt from that,
and ONLY from that. The transcription is the ultimate authority over any prior knowledge
of the biblical story.

Negative prompt rules:
- Include in negative_prompt any elements that would contradict what the transcription describes.
- If the transcription describes calm water, put storm and shipwreck in negative_prompt.
- If the transcription describes a storm, put calm sea in negative_prompt.
- Always include in negative_prompt: modern clothing, fantasy armor, theatrical drama, fake text,
  unreadable letters, brand logos, watermarks, cartoon style, anime, illustration.

Return valid JSON only, exactly with this shape:
${IMAGE_PROMPT_SCHEMA}

The full_prompt_with_text must use text_overlay.main_title as the main title.
Append this note at the end of full_prompt_with_text, outside the image instructions:
"Note: AI-generated text inside images can contain spelling errors. For production, prefer the background_prompt and apply typography in the app."
`.trim()
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminUser()

  if (!admin.ok) {
    return NextResponse.json(
      { success: false, error: admin.message },
      { status: admin.status }
    )
  }

  try {
    const body = await request.json()
    const title = cleanText(String(body.title || ''), 300)
    const bibleReference = cleanText(String(body.bibleReference || ''), 160)
    const description = cleanText(String(body.description || ''), 1200)
    const selectedQuote = cleanText(String(body.selectedQuote || ''), 500)
    const sourceExcerpt = cleanText(String(body.sourceExcerpt || ''), 1200)
    const reason = cleanText(String(body.reason || ''), 900)
    const specificityReason = cleanText(String(body.specificityReason || ''), 900)
    const transcriptionText = cleanText(String(body.transcriptionText || ''), 7000)
    const format = normalizeFormat(body.format)
    const includeTextOverlay = typeof body.includeTextOverlay === 'boolean'
      ? body.includeTextOverlay
      : false
    const episodeId = cleanText(String(body.episodeId || ''))
    const seriesId = cleanText(String(body.seriesId || ''))
    const combinedContext = [
      title,
      bibleReference,
      description,
      selectedQuote,
      sourceExcerpt,
      reason,
      specificityReason,
      transcriptionText,
    ].join(' ')
    const explicitMarineScene = hasExplicitMarineScene(combinedContext)

    const hasEnoughContext = [
      title,
      bibleReference,
      description,
      selectedQuote,
      sourceExcerpt,
      transcriptionText,
    ].some((value) => value.length >= 20)

    if (!hasEnoughContext) {
      return NextResponse.json(
        { success: false, error: 'Envie titulo, frase, trecho-base ou transcricao para gerar o prompt.' },
        { status: 400 }
      )
    }

    // -----------------------------------------------------------------------
    // ETAPA 1: Gerar prompt estruturado com DeepSeek
    // -----------------------------------------------------------------------

    console.log('[IMAGE-PROMPT] Etapa 1: Gerando prompt estruturado com DeepSeek...')

    const ai = getAIProvider({
      textProvider: 'deepseek-flash',
      fallbackProvider: 'openai',
    })

    const promptData = await ai.generateJson({
      system:
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
        '"Create a cinematic 16:9 horizontal podcast cover in premium cinematic streaming series style,\n' +
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
        'COMPOSITION AND COPY SPACE RULE:\n' +
        'The image MUST have a central "Safe Zone" for text overlay. You MUST leave the\n' +
        'center of the image uncluttered, using deep shadows, dark tones, or smooth textures\n' +
        '(Negative Space). DO NOT place bright highlights, light beams, or highly detailed\n' +
        'main subjects dead-center. Frame the main subjects (like hands, objects, or\n' +
        'landscapes) towards the bottom, edges, or silhouettes, keeping the central area\n' +
        'dark and clean to ensure white typography is highly readable.\n\n' +
        '[5] LIGHTING (Iluminação Dramática — Variedade Obrigatória)\n' +
        '- LIGHTING DIVERSITY RULE: You MUST vary the lighting style drastically for each\n' +
        '  prompt based on the mood. DO NOT always use "god rays" or beams of light from\n' +
        '  above. Strictly avoid bright volumetric light beams crossing the center of the\n' +
        '  image, as they ruin text legibility. Instead, use a wide variety of cinematic\n' +
        '  lighting setups: soft overcast natural light, dramatic side-lighting (chiaroscuro),\n' +
        '  gentle golden hour, moody low-key shadows, diffuse ambient light, or practical\n' +
        '  environmental lights. The lighting must feel natural, diverse, and never repetitive.\n' +
        '- A luz deve ter significado teológico: luz = presença divina, sombra = provação.\n' +
        '- Defina o contraste emocional que a iluminação cria na cena.\n' +
        '- Regra: A luz principal deve iluminar o elemento de esperança ou redenção.\n\n' +
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
        '❌ Nunca ignore o campo selectedQuote — ele é a âncora principal de toda a imagem\n' +
        '❌ NEVER generate brand logos, trademarks (like Netflix, HBO, Amazon), or watermarks in the image\n\n' +
        'PROIBIÇÃO TÉCNICA:\n' +
        'É terminantemente proibido gerar cenários de praia, deserto ou multidões como foco\n' +
        'principal, mesmo que a transcrição mencione tais contextos bíblicos. Se a tentação\n' +
        'de gerar uma cena histórica for forte, force a criação de uma imagem abstrata,\n' +
        'focada em iluminação e texturas emocionais.\n\n' +
        'Return valid JSON only. Do not generate images.',
      prompt: buildPrompt({
        title,
        bibleReference,
        description,
        selectedQuote,
        sourceExcerpt,
        reason,
        specificityReason,
        transcriptionText,
        format,
        includeTextOverlay,
      }),
      schema: IMAGE_PROMPT_SCHEMA,
      validate: (raw) => {
        const validated = normalizePromptResponse(raw)
        return enforceOfficialTitle(validated, title)
      },
      temperature: 0.6,
      maxTokens: 4096,
    })

    console.log('[IMAGE-PROMPT] Prompt gerado com sucesso | modelo=', ai.activeTextModel)

    // -----------------------------------------------------------------------
    // ETAPA 2: Gerar imagem com FLUX Schnell (apenas para capas de episódio/série)
    // -----------------------------------------------------------------------

    let fluxResult: Awaited<ReturnType<typeof generateAndUploadFluxImage>> | null = null

    if (format === 'episode_cover' || format === 'series_cover') {
      try {
        console.log('[IMAGE-PROMPT] Etapa 2: Gerando imagem com FLUX 2 Pro...')

        // Mapeia o formato para o tamanho de imagem adequado
        const imageSize = format === 'series_cover'
          ? 'square_hd' as const
          : 'landscape_16_9' as const

        const r2Prefix = format === 'episode_cover' ? 'covers/episodes' : 'covers/series'

        // Prompt gerado pelo DeepSeek + sufixo de qualidade
        const sceneDiagnosis = promptData.background_prompt || 'Abstract emotional landscape. Volumetric light. Deep spiritual atmosphere.'

        // Capas (episode_cover / series_cover): IMAGEM LIMPA (sem texto).
        // O título e a referência bíblica serão aplicados via CSS overlay
        // no frontend, garantindo tipografia perfeita e sem erros de IA.
        const negativeSpaceInstructions = [
          'IMPORTANT: This is a CLEAN BACKGROUND image with NO text overlay.',
          'Leave the center area free of detailed elements — use deep shadows,',
          'dark tones, or smooth textures for a clean central "safe zone"',
          'where white typography will be readable when applied later by the app.',
          'Do NOT generate any letters, words, titles, or text in the image.',
          'Generate only the cinematic scene and lighting — no typography.',
        ].join(' ')

        // O background_prompt do DeepSeek já inclui a seção [8] FECHAMENTO DE ESTILO
        // com "Style: High-end streaming series..." — não duplicar.
        const cleanFluxPrompt = [
          sceneDiagnosis,
          negativeSpaceInstructions,
        ].join('\n\n')

        console.log('DEBUG_COVER_PROMPT:', cleanFluxPrompt)

        fluxResult = await generateAndUploadFluxImage(cleanFluxPrompt, {
          imageSize,
          r2Prefix,
        })

        console.log('[IMAGE-PROMPT] FLUX concluído | r2Url=', fluxResult.r2Url)

        // Salva no Supabase conforme o formato
        const supabase = await createSupabaseServerClient()

        if (format === 'episode_cover' && episodeId) {
          const { error: updateError } = await supabase
            .from('episodes')
            .update({ cover_image_url: fluxResult.r2Url })
            .eq('id', episodeId)

          if (updateError) {
            console.error('[IMAGE-PROMPT] Erro ao salvar cover_image_url no episódio:', updateError)
          } else {
            console.log('[IMAGE-PROMPT] cover_image_url salvo no episódio', episodeId)
          }
        }

        if (format === 'series_cover' && seriesId) {
          const { error: updateError } = await supabase
            .from('series')
            .update({ cover_image_url: fluxResult.r2Url })
            .eq('id', seriesId)

          if (updateError) {
            console.error('[IMAGE-PROMPT] Erro ao salvar cover_image_url na série:', updateError)
          } else {
            console.log('[IMAGE-PROMPT] cover_image_url salvo na série', seriesId)
          }
        }
      } catch (fluxError) {
        console.error('[IMAGE-PROMPT] Erro ao gerar imagem com FLUX:', fluxError)
        // Não quebra a rota — retorna o prompt mesmo sem a imagem
      }
    }

    return NextResponse.json({
      success: true,
      model: ai.activeTextModel,
      format,
      includeTextOverlay,
      ...promptData,
      ...(fluxResult
        ? {
            flux_image_url: fluxResult.r2Url,
            flux_image_size_bytes: fluxResult.sizeBytes,
            flux_image_width: fluxResult.width,
            flux_image_height: fluxResult.height,
          }
        : {}),
    })
  } catch (error) {
    console.error('Erro ao gerar prompt premium de imagem:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao gerar prompt premium de imagem.',
      },
      { status: 500 }
    )
  }
}