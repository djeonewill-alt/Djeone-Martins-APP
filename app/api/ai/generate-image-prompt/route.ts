/**
 * AI-PROVIDER-004 — Rota migrada para usar a camada abstrata de IA.
 *
 * Provedor primário: DeepSeek Flash
 * Fallback automático: OpenAI (via AIClient)
 *
 * Comportamento idêntico ao anterior. Nenhum prompt ou lógica de resposta foi alterado.
 */

import { NextRequest, NextResponse } from 'next/server'

import { getAIProvider } from '@/lib/ai/provider'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

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
  hasExplicitMarineScene: boolean
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

Visual mapping examples:
1. Acts 27 / shipwreck / centurion / dry land:
Correct scene: Mediterranean shoreline after a shipwreck, broken Roman ship, survivors swimming, pieces of wood, a centurion protecting prisoners, Paul preserved, golden light breaking through storm clouds, dry land in the distance.
Do not use: Bethany house, open door, generic stone village, wheat field, temple.

2. Mary / nard / alabaster / Bethany:
Correct scene: humble interior in Bethany, alabaster jar, perfume oil, warm light, sacrificial worship, reverent atmosphere.
Do not use: shipwreck, sea, soldiers, temple.

3. Donkey / triumphal entry into Jerusalem:
Correct scene: ancient road, young donkey, branches, Jerusalem in background, humility of the King.
Do not use: war horse as the main focus, ocean, closed house.

4. Grain of wheat / dying to bear fruit:
Correct scene: grain falling into the earth, soil, sprout, golden light, wheat field.
Do not use: Bethany house, boat, soldiers.

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

    const ai = getAIProvider({
      textProvider: 'deepseek-flash',
      fallbackProvider: 'openai',
    })

    const promptData = await ai.generateJson({
      system:
        'You are a cinematic biblical art director. Create premium, photorealistic image prompts for Christian devotional content.\n\n' +
        'REQUIREMENTS:\n' +
        '- Cinematic framing: rule of thirds, depth, foreground/background.\n' +
        '- Reverent lighting: golden hour, warm directional light, soft shafts of light.\n' +
        '- Subtle symbolism: light vs shadow, open doorways, humble objects, dust motes, olive trees, stone paths.\n' +
        '- Biblical realism: first-century Judea, linen/wool/stone/wood textures, authentic settings.\n' +
        '- Tone: reverent, quiet awe, not theatrical or exaggerated.\n' +
        '- No text inside the generated image.\n' +
        '- Every image must be grounded in a specific biblical scene or theme.\n\n' +
        'GOOD example:\n' +
        '"Humble interior in Bethany at dusk. Warm oil lamp on a stone table. An alabaster jar rests in the foreground. Soft golden light enters through an open doorway. Mary kneels at Jesus\' feet. Atmosphere of sacrificial worship, reverent stillness, 4K photorealistic, cinematic depth of field."\n\n' +
        'BAD example:\n' +
        '"A beautiful spiritual landscape with light shining down. A person praying in a field. Peaceful and serene."\n\n' +
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
        hasExplicitMarineScene: explicitMarineScene,
      }),
      schema: IMAGE_PROMPT_SCHEMA,
      validate: (raw) => {
        const validated = normalizePromptResponse(raw)
        return enforceOfficialTitle(validated, title)
      },
      temperature: 0.5,
      maxTokens: 4096,
    })

    return NextResponse.json({
      success: true,
      model: ai.activeTextModel,
      format,
      includeTextOverlay,
      ...promptData,
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