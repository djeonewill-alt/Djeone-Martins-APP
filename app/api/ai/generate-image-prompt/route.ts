import { NextRequest, NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type ImagePromptFormat = 'episode_cover' | 'daily_quote_card' | 'series_cover'

type ImagePromptResponse = {
  title: string
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

function extractJsonFromText(text: string) {
  const cleaned = text.trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)

    if (!match) {
      throw new Error('A IA nao retornou JSON valido.')
    }

    return JSON.parse(match[0])
  }
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => cleanText(String(item || ''), 80)).filter(Boolean).slice(0, 12)
    : []
}

function normalizePromptResponse(input: unknown): ImagePromptResponse {
  const value = input as Partial<ImagePromptResponse>
  const visualTheme = (value.visual_theme || {}) as NonNullable<ImagePromptResponse['visual_theme']>
  const textOverlay = (value.text_overlay || {}) as NonNullable<ImagePromptResponse['text_overlay']>

  const response: ImagePromptResponse = {
    title: cleanText(String(value.title || 'Capa premium do episodio'), 120),
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

Editorial rules:
1. Create a concrete visual concept from the episode, not a generic "beautiful spiritual landscape".
2. Prioritize concrete elements: object, gesture, place, biblical character, contrast, atmosphere, theological symbol.
3. Avoid sea, ocean, boat, water, waves, rain, storm, or tempest unless the episode explicitly talks about them.
4. For biblical narratives, prefer ancient house, stone road, biblical village, dawn light, simple table, open door, symbolic object, Judean landscape, reverent atmosphere.
5. If the content mentions Mary, nard, perfume, or alabaster, prioritize alabaster jar, perfume oil, house in Bethany, warm light, subtle visible fragrance, sacrificial worship.
6. If it mentions Bethany or Lazarus, prioritize simple house, stone village, open door, grief and hope, path out of the tomb, life breaking darkness.
7. If it mentions a donkey or entry into Jerusalem, prioritize ancient road, young donkey, branches, city in background, humility of the King, contrast with a war horse.
8. If it mentions grain of wheat, prioritize grain falling into soil, open earth, sprout emerging, golden light, death and fruitfulness.
9. Prefer a background without text for app production. Text can be applied later by the app.

Return valid JSON only, exactly with this shape:
{
  "title": "suggested visual title",
  "visual_theme": {
    "scene": "...",
    "central_focus": "...",
    "atmosphere": "...",
    "background": "...",
    "lighting": "...",
    "color_palette": "...",
    "theological_meaning": "..."
  },
  "background_prompt": "Create an epic cinematic 16:9 horizontal podcast episode cover in premium streaming style, 1920x1080 resolution.\\n\\nScene:\\n...\\n\\nCentral focus:\\n...\\n\\nAtmosphere:\\n...\\n\\nBackground:\\n...\\n\\nLighting:\\n...\\n\\nColor palette:\\n...\\n\\nComposition:\\n...\\n\\nText-safe area:\\nLeave clean negative space in the center/top/bottom for text overlay. No text, no letters, no typography inside the generated image.\\n\\nStyle:\\nPremium streaming artwork, cinematic biblical realism, photorealistic with painterly quality of light, elegant, devotional, 4K quality.\\n\\nTheological meaning:\\n...",
  "full_prompt_with_text": "Create an epic cinematic 16:9 horizontal podcast episode cover in premium Netflix style, 1920x1080 resolution.\\n\\nScene:\\n...\\n\\nCentral focus:\\n...\\n\\nAtmosphere:\\n...\\n\\nBackground:\\n...\\n\\nLighting:\\n...\\n\\nColor palette:\\n...\\n\\nText overlay integrated into image - ALL CENTERED:\\nTop area:\\n'...'\\n\\nCenter:\\n'...'\\n\\nSubtitle:\\n'...'\\n\\nBottom:\\n'...'\\n\\nStyle:\\n...\\n\\nThe image should capture the essence of:\\n...",
  "text_overlay": {
    "top": "${params.bibleReference || ''}",
    "main_title": "short title for cover",
    "subtitle": "Meditacao Devocional",
    "bottom_quote": "short selected quote or biblical phrase"
  },
  "negative_prompt": "no illegible text, no fake letters, no distorted hands or faces, no kitsch religious symbols, no exaggerated fantasy, no theatrical excess, no sea/ocean/boat/water/waves/storm unless explicitly present in episode...",
  "keywords": ["visual", "keywords"]
}
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

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY ausente.' },
        { status: 500 }
      )
    }

    const model =
      process.env.OPENAI_CONTENT_ASSETS_MODEL ||
      process.env.OPENAI_MODEL ||
      'gpt-4o-mini'

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You create premium cinematic image prompts for Christian devotional content. Return valid JSON only. Do not generate images.',
          },
          {
            role: 'user',
            content: buildPrompt({
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
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error?.message || 'Erro ao gerar prompt premium.')
    }

    const content = data?.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('A IA nao retornou conteudo.')
    }

    const parsed = extractJsonFromText(content)
    const promptData = normalizePromptResponse(parsed)

    return NextResponse.json({
      success: true,
      model,
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
