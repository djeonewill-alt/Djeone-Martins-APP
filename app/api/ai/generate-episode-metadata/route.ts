import { NextRequest, NextResponse } from 'next/server'

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

{
  "title": "Título do episódio",
  "description": "Descrição curta do episódio.",
  "theme_keywords": ["tema1", "tema2", "tema3"]
}
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

async function generateWithOpenAI(params: {
  transcriptionText: string
  bibleReference?: string
  currentTitle?: string
}) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY ausente no .env.local.')
  }

  const model =
    process.env.OPENAI_EPISODE_METADATA_MODEL ||
    process.env.OPENAI_DAILY_QUOTE_MODEL ||
    'gpt-4.1'

  const prompt = buildPrompt(params)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      response_format: {
        type: 'json_object',
      },
      messages: [
        {
          role: 'system',
          content:
            'Você é um editor cristão brasileiro. Responda somente em JSON válido.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Erro OpenAI metadata:', data)

    throw new Error(
      data?.error?.message ||
        'Erro ao gerar título e descrição com OpenAI.'
    )
  }

  const content = data?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('A OpenAI não retornou conteúdo.')
  }

  const parsed = extractJsonFromText(content)

  return {
    metadata: validateMetadata(parsed),
    provider: 'openai',
    model,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const transcriptionText = cleanText(String(body.transcriptionText || ''))
    const bibleReference = cleanText(String(body.bibleReference || ''))
    const currentTitle = cleanText(String(body.currentTitle || ''))

    if (!transcriptionText) {
      return NextResponse.json(
        { error: 'Envie a transcrição para gerar título e descrição.' },
        { status: 400 }
      )
    }

    if (transcriptionText.length < 100) {
      return NextResponse.json(
        { error: 'A transcrição está muito curta para gerar título e descrição.' },
        { status: 400 }
      )
    }

    const result = await generateWithOpenAI({
      transcriptionText,
      bibleReference,
      currentTitle,
    })

    return NextResponse.json({
      success: true,
      provider: result.provider,
      model: result.model,
      title: result.metadata.title,
      description: result.metadata.description,
      theme_keywords: result.metadata.theme_keywords,
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