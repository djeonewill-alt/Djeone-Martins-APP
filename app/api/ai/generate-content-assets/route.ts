import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type TranscriptionSegment = {
  start: number
  end: number
  text: string
}

type ShortIdea = {
  title: string
  hook: string
  angle: string
}

type CutSuggestion = {
  title: string
  start: number
  end: number
  reason: string
  hook: string
}

type ContentAssets = {
  devotional_summary: string
  strong_phrases: string[]
  whatsapp_text: string
  instagram_caption: string
  hashtags: string[]
  short_ideas: ShortIdea[]
  cut_suggestions: CutSuggestion[]
}

const MAX_TRANSCRIPTION_CHARS = 28000
const MAX_SEGMENTS = 80

function cleanText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()
}

function extractJsonFromText(text: string) {
  const cleaned = text.trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)

    if (!match) {
      throw new Error('A IA não retornou JSON válido.')
    }

    return JSON.parse(match[0])
  }
}

function normalizeSegments(input: unknown): TranscriptionSegment[] {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      const value = item as {
        start?: unknown
        end?: unknown
        text?: unknown
      }

      return {
        start: Number(value.start),
        end: Number(value.end),
        text: cleanText(String(value.text || '')),
      }
    })
    .filter((segment) => {
      return (
        Number.isFinite(segment.start) &&
        Number.isFinite(segment.end) &&
        segment.start >= 0 &&
        segment.end > segment.start &&
        segment.text.length > 0
      )
    })
    .slice(0, MAX_SEGMENTS)
}

function normalizeStringArray(input: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => cleanText(String(item || '')))
    .filter(Boolean)
    .map((item) => item.slice(0, maxLength))
    .slice(0, maxItems)
}

function normalizeShortIdeas(input: unknown): ShortIdea[] {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      const value = item as {
        title?: unknown
        hook?: unknown
        angle?: unknown
      }

      return {
        title: cleanText(String(value.title || '')).slice(0, 120),
        hook: cleanText(String(value.hook || '')).slice(0, 220),
        angle: cleanText(String(value.angle || '')).slice(0, 220),
      }
    })
    .filter((item) => item.title && item.hook && item.angle)
    .slice(0, 5)
}

function normalizeCutSuggestions(input: unknown): CutSuggestion[] {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      const value = item as {
        title?: unknown
        start?: unknown
        end?: unknown
        reason?: unknown
        hook?: unknown
      }

      return {
        title: cleanText(String(value.title || '')).slice(0, 120),
        start: Number(value.start),
        end: Number(value.end),
        reason: cleanText(String(value.reason || '')).slice(0, 240),
        hook: cleanText(String(value.hook || '')).slice(0, 220),
      }
    })
    .filter((item) => {
      return (
        item.title &&
        item.reason &&
        item.hook &&
        Number.isFinite(item.start) &&
        Number.isFinite(item.end) &&
        item.start >= 0 &&
        item.end > item.start
      )
    })
    .slice(0, 5)
}

function validateAssets(input: unknown): ContentAssets {
  const parsed = input as {
    assets?: unknown
    devotional_summary?: unknown
    strong_phrases?: unknown
    whatsapp_text?: unknown
    instagram_caption?: unknown
    hashtags?: unknown
    short_ideas?: unknown
    cut_suggestions?: unknown
  }

  const source = (parsed.assets || parsed) as typeof parsed

  const devotionalSummary = cleanText(String(source.devotional_summary || ''))
  const whatsappText = cleanText(String(source.whatsapp_text || ''))
  const instagramCaption = cleanText(String(source.instagram_caption || ''))
  const strongPhrases = normalizeStringArray(source.strong_phrases, 8, 180)
  const hashtags = normalizeStringArray(source.hashtags, 12, 40)
  const shortIdeas = normalizeShortIdeas(source.short_ideas)
  const cutSuggestions = normalizeCutSuggestions(source.cut_suggestions)

  if (!devotionalSummary) {
    throw new Error('A IA não gerou resumo devocional.')
  }

  if (strongPhrases.length < 3) {
    throw new Error('A IA não gerou frases fortes suficientes.')
  }

  if (!whatsappText) {
    throw new Error('A IA não gerou texto para WhatsApp.')
  }

  if (!instagramCaption) {
    throw new Error('A IA não gerou legenda para Instagram.')
  }

  return {
    devotional_summary: devotionalSummary,
    strong_phrases: strongPhrases,
    whatsapp_text: whatsappText,
    instagram_caption: instagramCaption,
    hashtags,
    short_ideas: shortIdeas,
    cut_suggestions: cutSuggestions,
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
  transcriptionText: string
  transcriptionSegments: TranscriptionSegment[]
  dailyQuoteSuggestions: unknown
}) {
  const segmentsText = params.transcriptionSegments.length
    ? params.transcriptionSegments
        .map((segment) => {
          return `${segment.start.toFixed(1)}-${segment.end.toFixed(1)}s: ${segment.text}`
        })
        .join('\n')
    : 'Sem segmentos com timestamp.'

  const quoteSuggestions = Array.isArray(params.dailyQuoteSuggestions)
    ? params.dailyQuoteSuggestions
        .slice(0, 8)
        .map((item) => JSON.stringify(item))
        .join('\n')
    : 'Sem sugestões anteriores.'

  return `
Você é um editor devocional cristão brasileiro, com linguagem pastoral, bíblica, clara e compartilhável.

Leia a transcrição de um episódio devocional e gere conteúdos textuais derivados, sem publicar em redes e sem inventar dados.

REGRAS:
- preserve fidelidade ao conteúdo do episódio;
- não invente testemunhos, datas, promessas absolutas ou informações externas;
- não prometa cura, prosperidade ou resultados automáticos;
- use português brasileiro natural;
- mantenha tom devocional, pastoral e simples;
- frases fortes devem ser curtas, memoráveis e fiéis ao conteúdo;
- texto de WhatsApp deve estar pronto para envio;
- legenda de Instagram deve ter chamada suave, sem exagero;
- hashtags devem ser relevantes e sem acentos;
- ideias de shorts devem ter gancho forte;
- cortes devem usar timestamps dos segmentos quando houver segmentos válidos.

TÍTULO:
${params.title || 'Não informado'}

REFERÊNCIA BÍBLICA:
${params.bibleReference || 'Não informada'}

DESCRIÇÃO:
${params.description || 'Não informada'}

FRASES FORTES JÁ EXISTENTES:
${quoteSuggestions}

SEGMENTOS COM TIMESTAMP:
${segmentsText}

TRANSCRIÇÃO:
${params.transcriptionText}

Responda SOMENTE em JSON válido, exatamente neste formato:

{
  "assets": {
    "devotional_summary": "resumo devocional de 1 a 2 parágrafos curtos",
    "strong_phrases": ["frase curta 1", "frase curta 2", "frase curta 3"],
    "whatsapp_text": "texto pronto para WhatsApp",
    "instagram_caption": "legenda pronta para Instagram",
    "hashtags": ["#Devocional", "#PalavraDoDia"],
    "short_ideas": [
      {
        "title": "ideia do short",
        "hook": "primeira frase forte do vídeo",
        "angle": "ângulo editorial"
      }
    ],
    "cut_suggestions": [
      {
        "title": "nome do corte",
        "start": 10,
        "end": 45,
        "reason": "por que esse trecho funciona",
        "hook": "gancho de abertura"
      }
    ]
  }
}

Retorne:
- 3 a 8 strong_phrases;
- 3 a 5 short_ideas;
- até 5 cut_suggestions;
- hashtags entre 4 e 10.
`.trim()
}

async function generateWithOpenAI(params: {
  title: string
  bibleReference: string
  description: string
  transcriptionText: string
  transcriptionSegments: TranscriptionSegment[]
  dailyQuoteSuggestions: unknown
}) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY ausente.')
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
      temperature: 0.55,
      response_format: {
        type: 'json_object',
      },
      messages: [
        {
          role: 'system',
          content:
            'Você é um editor devocional cristão brasileiro. Responda somente em JSON válido.',
        },
        {
          role: 'user',
          content: buildPrompt(params),
        },
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Erro OpenAI content assets:', data)
    throw new Error(
      data?.error?.message ||
        'Erro ao gerar conteúdos textuais com OpenAI.'
    )
  }

  const content = data?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('A OpenAI não retornou conteúdo.')
  }

  return {
    model,
    assets: validateAssets(extractJsonFromText(content)),
  }
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
    const episodeId = cleanText(String(body.episodeId || ''))
    const title = cleanText(String(body.title || ''))
    const bibleReference = cleanText(String(body.bible_reference || ''))
    const description = cleanText(String(body.description || ''))
    const transcriptionText = cleanText(String(body.transcription_text || ''))
    const transcriptionSegments = normalizeSegments(body.transcription_segments)

    if (!episodeId) {
      return NextResponse.json(
        { success: false, error: 'Envie o ID do episódio.' },
        { status: 400 }
      )
    }

    if (!transcriptionText || transcriptionText.length < 300) {
      return NextResponse.json(
        {
          success: false,
          error: 'A transcrição está muito curta para gerar conteúdos.',
        },
        { status: 400 }
      )
    }

    const result = await generateWithOpenAI({
      title,
      bibleReference,
      description,
      transcriptionText: transcriptionText.slice(0, MAX_TRANSCRIPTION_CHARS),
      transcriptionSegments,
      dailyQuoteSuggestions: body.daily_quote_suggestions,
    })

    return NextResponse.json({
      success: true,
      provider: 'openai',
      model: result.model,
      assets: result.assets,
    })
  } catch (error) {
    console.error('Erro ao gerar conteúdos textuais:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao gerar conteúdos textuais.',
      },
      { status: 500 }
    )
  }
}
