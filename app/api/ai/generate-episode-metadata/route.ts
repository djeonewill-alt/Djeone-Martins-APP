/**
 * AI-PROVIDER-005 — Rota migrada para usar a camada abstrata de IA.
 *
 * Provedor primário: DeepSeek Flash
 * Fallback automático: OpenAI (via AIClient)
 *
 * Comportamento idêntico ao anterior. Nenhum prompt ou lógica de resposta foi alterado.
 */

import { NextRequest, NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai/provider'

type EpisodeMetadata = {
  title: string
  description: string
  theme_keywords: string[]
}

function cleanText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()
}

function normalizeTitle(title: string) {
  let value = cleanText(title)

  value = value
    .replace(/^["'“”]+/, '')
    .replace(/["'“”]+$/, '')
    .replace(/[.!?…]+$/, '')
    .trim()

  if (value.length > 0) {
    value = value.charAt(0).toUpperCase() + value.slice(1)
  }

  return value
}

function normalizeDescription(description: string) {
  let value = cleanText(description)

  if (value.length > 0) {
    value = value.charAt(0).toUpperCase() + value.slice(1)
  }

  if (value && !/[.!?…]$/.test(value)) {
    value += '.'
  }

  return value
}

const SYSTEM_PROMPT =
  'Você é um editor cristão brasileiro. Responda somente em JSON válido.'

const METADATA_SCHEMA = `{
  "title": "Título do episódio",
  "description": "Descrição curta do episódio.",
  "theme_keywords": ["tema1", "tema2", "tema3"]
}`

function buildPrompt(params: {
  transcriptionText: string
  bibleReference?: string
  currentTitle?: string
}) {
  const bibleReference = cleanText(params.bibleReference || '')
  const currentTitle = cleanText(params.currentTitle || '')

  return `
Você é um editor cristão brasileiro responsável por organizar episódios devocionais de áudio.

Sua tarefa é ler a transcrição e gerar:
1. um título forte e claro para o episódio;
2. uma descrição curta;
3. palavras-chave temáticas.

O título deve ser:
- curto;
- espiritual;
- memorável;
- pastoral;
- fiel ao tema do áudio;
- bom para aparecer no app;
- sem exagero sensacionalista.

Evite títulos genéricos como:
"Reflexão do dia"
"Mensagem de hoje"
"Estudo bíblico"
"Palavra de Deus"
"Devocional cristão"

O título deve ter entre 3 e 9 palavras, se possível.

A descrição deve:
- ter uma ou duas frases curtas;
- explicar o tema espiritual do episódio;
- ajudar a pessoa entender por que deve ouvir;
- não parecer propaganda;
- não ser longa.

Não invente informações que não estejam na transcrição.
Não mencione "áudio", "transcrição", "neste episódio" em excesso.
Não use emojis.
Não use hashtags.

REFERÊNCIA BÍBLICA:
${bibleReference || 'Não informada'}

TÍTULO ATUAL, SE HOUVER:
${currentTitle || 'Não informado'}

TRANSCRIÇÃO:
${params.transcriptionText}

Responda SOMENTE em JSON válido, neste formato:

${METADATA_SCHEMA}
`.trim()
}

function validateMetadata(input: unknown): EpisodeMetadata {
  const parsed = input as {
    title?: unknown
    description?: unknown
    theme_keywords?: unknown
  }

  const title = normalizeTitle(String(parsed.title || ''))
  const description = normalizeDescription(String(parsed.description || ''))

  const themeKeywords = Array.isArray(parsed.theme_keywords)
    ? parsed.theme_keywords
        .map((item) => cleanText(String(item || '')))
        .filter(Boolean)
        .slice(0, 6)
    : []

  if (!title || title.length < 5) {
    throw new Error('A IA não gerou um título válido.')
  }

  if (!description || description.length < 20) {
    throw new Error('A IA não gerou uma descrição válida.')
  }

  return {
    title,
    description,
    theme_keywords: themeKeywords,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    let transcriptionText = cleanText(String(body.transcriptionText || ''))
    let bibleReference = cleanText(String(body.bibleReference || ''))
    let currentTitle = cleanText(String(body.currentTitle || ''))
    const episodeId = cleanText(String(body.episodeId || ''))

    // Fallback: se transcriptionText, bibleReference ou currentTitle não vieram no body,
    // busca do banco de dados (Supabase) pelo episodeId
    if (episodeId && (!transcriptionText || !bibleReference || !currentTitle)) {
      try {
        const supabase = await createSupabaseServerClient()
        const { data: episode } = await supabase
          .from('episodes')
          .select('transcription_text, bible_reference, title')
          .eq('id', episodeId)
          .single()

        if (episode) {
          if (!transcriptionText) {
            transcriptionText = cleanText(String(episode.transcription_text || ''))
          }
          if (!bibleReference) {
            bibleReference = cleanText(String(episode.bible_reference || ''))
          }
          if (!currentTitle) {
            currentTitle = cleanText(String(episode.title || ''))
          }
        }
      } catch (dbError) {
        console.warn('[generate-episode-metadata] Fallback Supabase falhou:', dbError)
        // Continua com os dados do body — se transcriptionText estiver ausente, retorna 400 abaixo
      }
    }

    if (!transcriptionText) {
      return NextResponse.json(
        { error: 'Envie a transcrição ou o episodeId para gerar título e descrição.' },
        { status: 400 }
      )
    }

    if (transcriptionText.length < 100) {
      return NextResponse.json(
        { error: 'A transcrição está muito curta para gerar título e descrição.' },
        { status: 400 }
      )
    }

    const ai = getAIProvider({
      textProvider: 'deepseek-flash',
      fallbackProvider: 'openai',
    })

    const metadata = await ai.generateJson({
      system: SYSTEM_PROMPT,
      prompt: buildPrompt({
        transcriptionText,
        bibleReference,
        currentTitle,
      }),
      schema: METADATA_SCHEMA,
      validate: validateMetadata,
      temperature: 0.45,
      maxTokens: 1024,
    })

    return NextResponse.json({
      success: true,
      provider: ai.activeTextProvider,
      model: ai.activeTextModel,
      title: metadata.title,
      description: metadata.description,
      theme_keywords: metadata.theme_keywords,
    })
  } catch (error) {
    console.error('Erro ao gerar título e descrição:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao gerar título e descrição.',
      },
      { status: 500 }
    )
  }
}