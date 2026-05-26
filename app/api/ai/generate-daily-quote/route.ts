import { NextRequest, NextResponse } from 'next/server'

type DailyQuoteSuggestion = {
  quote_text: string
  reason: string
  score: number
  source_excerpt?: string
  use_case?: string
  specificity_reason?: string
}

type GenerateResult = {
  suggestions: DailyQuoteSuggestion[]
  provider: 'cloudflare' | 'openai'
}

function cleanText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()
}

function normalizeSuggestion(text: string) {
  let value = cleanText(text)

  value = value
    .replace(/^["'“”]+/, '')
    .replace(/["'“”]+$/, '')
    .trim()

  if (value.length > 0) {
    value = value.charAt(0).toUpperCase() + value.slice(1)
  }

  if (value && !/[.!?…]$/.test(value)) {
    value += '.'
  }

  return value
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

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length
}

function hasExcessiveRepetition(text: string) {
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2)

  if (words.length < 6) {
    return false
  }

  const counts = new Map<string, number>()

  words.forEach((word) => {
    counts.set(word, (counts.get(word) || 0) + 1)
  })

  const repeatedTooMuch = Array.from(counts.values()).some((count) => count >= 3)

  const uniqueRatio = counts.size / words.length

  return repeatedTooMuch || uniqueRatio < 0.58
}

function looksLikeQuestion(text: string) {
  return (
    text.includes('?') ||
    /^(qual|como|por que|porque|quando|onde|quem)\b/i.test(text)
  )
}

function looksLikeHistoricalSummary(text: string) {
  const patterns = [
    /\bcapítulo\b/i,
    /\bversículo\b/i,
    /\btexto\b/i,
    /\bpassagem\b/i,
    /\btranscrição\b/i,
    /\báudio\b/i,
    /\bmensagem\b/i,
    /\bepisódio\b/i,
    /\bestudo\b/i,
    /\bmeditamos\b/i,
    /\bviajou\b/i,
    /\bviagem de\b/i,
    /\bsaiu de\b/i,
    /\bchegou em\b/i,
    /\bfoi para\b/i,
    /\bno versículo\b/i,
    /\bnesse texto\b/i,
    /\bneste texto\b/i,
  ]

  return patterns.some((pattern) => pattern.test(text))
}

function hasWeakGenericLanguage(text: string) {
  const genericPatterns = [
    /\bpessoas boas\b/i,
    /\bcoisas boas\b/i,
    /\balgo bom\b/i,
    /\bmuito importante\b/i,
    /\btem que\b/i,
    /\bvocê pode ver\b/i,
    /\bde alguma forma\b/i,
    /\bnão se esqueça\b/i,
    /\bvai dar tudo certo\b/i,
    /\bDeus transforma\b.*\b(dor|esperança|vida)\b/i,
    /\bJesus transforma\b.*\b(dor|esperança|vida)\b/i,
    /\b(encontre|receba) esperança\b/i,
    /\bno meio da dor\b/i,
    /\bprocesso de transformação\b/i,
    /\bpropósito para sua vida\b/i,
  ]

  return genericPatterns.some((pattern) => pattern.test(text))
}

function hasOverusedDevotionalVocabulary(text: string) {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const overusedWords = [
    'dor',
    'esperanca',
    'aflicao',
    'vida',
    'transformacao',
    'processo',
    'proposito',
  ]

  const hits = overusedWords.filter((word) => {
    return new RegExp(`\\b${word}\\b`, 'i').test(normalized)
  })

  return hits.length >= 3
}

function looksBrokenOrUnclear(text: string) {
  const brokenPatterns = [
    /\boposto do\b/i,
    /\bdão para\b/i,
    /\bnátus\b/i,
    /\bnatus\b/i,
    /\bhúongar\b/i,
    /\bsincret/i,
    /\bda tua\b.*\bliterais\b/i,
    /\bque você pode ver\b.*\bque você pode ver\b/i,
  ]

  return brokenPatterns.some((pattern) => pattern.test(text))
}

function buildPrompt(params: {
  transcriptionText: string
  title?: string
  bibleReference?: string
}) {
  const title = cleanText(params.title || '')
  const bibleReference = cleanText(params.bibleReference || '')

  return `
Você é um editor devocional cristão brasileiro com maturidade pastoral, sensibilidade bíblica, precisão teológica e linguagem forte para cards espirituais.

Sua tarefa é ler a transcrição de um áudio devocional e criar frases fortes para "Palavra do Dia".

A frase deve parecer uma sentença devocional poderosa, curta e memorável, como algo que uma pessoa salvaria, compartilharia ou levaria para oração.

PROCESSO EDITORIAL:
Antes de criar as frases, gere pelo menos 12 candidatas internamente e identifique mentalmente:
1. o tema espiritual central;
2. a tensão humana presente no áudio;
3. a imagem bíblica principal;
4. o princípio espiritual aplicável;
5. a direção pastoral para quem vai ler;
6. um trecho real da transcrição que sustenta cada frase;
7. a frase mais memorável possível para transformar isso em Palavra do Dia.

A FRASE DEVE UNIR:
- verdade bíblica;
- aplicação pessoal;
- força pastoral;
- imagem espiritual;
- clareza emocional;
- profundidade simples;
- linguagem memorável.

NÃO GERE:
- resumo histórico;
- frase técnica;
- frase acadêmica;
- frase de estudo bíblico;
- pergunta;
- frase quebrada da transcrição;
- frase com erro de português;
- frase genérica demais;
- frase longa demais;
- frase que pareça legenda comum;
- frase que apenas descreva o texto bíblico;
- frase que mencione "áudio", "mensagem", "transcrição" ou "episódio";
- frase com data, dia da semana ou introdução do pregador;
- frase com repetição excessiva;
- frase confusa;
- frase que pareça que foi copiada sem lapidação.
- frase que poderia servir para qualquer devocional;
- frase baseada apenas em palavras abstratas como dor, esperança, aflição, vida, transformação, processo ou propósito, salvo quando essas palavras forem centrais no trecho real;
- cinco frases com a mesma estrutura verbal;
- frase sem conexão rastreável com a transcrição.

REGRA DE ESPECIFICIDADE:
Cada frase deve nascer de um ponto real da transcrição.
Use personagens, lugares, ações, contrastes, imagens bíblicas ou aplicações pastorais presentes no conteúdo.
Prefira frases específicas, como "Jerusalém tinha o templo, mas Jesus repousava em Betânia", em vez de frases genéricas como "Jesus transforma dor em esperança".
Se não houver apoio claro na transcrição, descarte a candidata.

REGRA TEOLÓGICA:
Quando houver personagens, lugares, objetos ou símbolos bíblicos, use-os com sabedoria pastoral.
Não confunda Deus com um personagem humano.
Não transforme símbolo em doutrina.
Não force alegorias.
Use personagens e imagens como exemplos, sinais, figuras ou aplicações espirituais, mantendo precisão bíblica.

REGRA DE PROFUNDIDADE:
Não entregue uma frase apenas "bonita".
A frase precisa carregar peso espiritual real.
Ela deve despertar fé, discernimento, arrependimento, consolo, coragem ou direção.

REGRA DE LINGUAGEM:
Prefira frases com imagens fortes e simples.
Prefira linguagem pastoral, clara e profunda.
Evite frases comuns demais.
Evite frases que qualquer IA poderia escrever sem entender o áudio.
Varie a construção das frases: algumas podem servir para card, outras para short, WhatsApp ou Instagram, mas todas devem funcionar como Palavra do Dia.

CRITÉRIOS DE NOTA:
10 = frase muito forte, memorável, bíblica, pastoral, emocional e pronta para card.
9 = frase forte, clara, espiritual e muito compartilhável.
8 = frase boa, publicável e devocional.
Abaixo de 8 = não retorne.

REGRAS DE TAMANHO:
- Cada frase deve ter entre 8 e 24 palavras.
- Pode ter até 28 palavras se for muito forte.
- Não escreva parágrafos.
- Não coloque referência bíblica dentro da frase.
- Não use emojis.
- Não use hashtags.

IMPORTANTE:
Gere 12 candidatas internamente, mas retorne somente as 5 melhores.
Não retorne frases medianas apenas para completar número.
Se uma frase não tiver força espiritual real, descarte.

TÍTULO DO EPISÓDIO:
${title || 'Não informado'}

REFERÊNCIA BÍBLICA:
${bibleReference || 'Não informada'}

TRANSCRIÇÃO:
${params.transcriptionText}

Responda SOMENTE em JSON válido, exatamente neste formato:

{
  "suggestions": [
    {
      "quote_text": "frase forte aqui",
      "reason": "explique em uma frase curta por que essa frase tem força devocional",
      "score": 9,
      "source_excerpt": "trecho curto da transcrição que sustenta a frase",
      "use_case": "card",
      "specificity_reason": "por que a frase é específica deste episódio"
    }
  ]
}

Retorne exatamente 5 sugestões.
`.trim()
}

function validateSuggestions(input: unknown): DailyQuoteSuggestion[] {
  const parsed = input as { suggestions?: unknown }

  if (!parsed || !Array.isArray(parsed.suggestions)) {
    throw new Error('A IA não retornou uma lista de sugestões.')
  }

  const suggestions = parsed.suggestions
    .map((item) => {
      const value = item as {
        quote_text?: unknown
        reason?: unknown
        score?: unknown
        source_excerpt?: unknown
        use_case?: unknown
        specificity_reason?: unknown
      }

      const quoteText = normalizeSuggestion(String(value.quote_text || ''))
      const reason = cleanText(
        String(value.reason || 'Frase com força devocional.')
      )
      const sourceExcerpt = cleanText(String(value.source_excerpt || '')).slice(0, 220)
      const useCase = cleanText(String(value.use_case || '')).slice(0, 40)
      const specificityReason = cleanText(String(value.specificity_reason || '')).slice(0, 220)
      const rawScore = Number(value.score)
      const score = Number.isFinite(rawScore) ? rawScore : 8
      const wordCount = countWords(quoteText)

      return {
        quote_text: quoteText,
        reason,
        score: Math.max(1, Math.min(10, Math.round(score))),
        source_excerpt: sourceExcerpt || undefined,
        use_case: useCase || undefined,
        specificity_reason: specificityReason || undefined,
        wordCount,
      }
    })
    .filter((item) => {
      return (
        item.score >= 8 &&
        item.quote_text.length >= 30 &&
        item.quote_text.length <= 190 &&
        item.wordCount >= 7 &&
        item.wordCount <= 28 &&
        !looksLikeQuestion(item.quote_text) &&
        !looksLikeHistoricalSummary(item.quote_text) &&
        !hasWeakGenericLanguage(item.quote_text) &&
        !hasOverusedDevotionalVocabulary(item.quote_text) &&
        !looksBrokenOrUnclear(item.quote_text) &&
        !hasExcessiveRepetition(item.quote_text)
      )
    })
    .sort((a, b) => b.score - a.score)
    .map(({ wordCount, ...item }) => item)

  if (suggestions.length < 3) {
    throw new Error(
      'A IA não gerou frases fortes o suficiente. Tente novamente ou melhore a transcrição.'
    )
  }

  return suggestions.slice(0, 5)
}

async function generateWithCloudflare(params: {
  transcriptionText: string
  title?: string
  bibleReference?: string
}): Promise<GenerateResult> {
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.R2_ACCOUNT_ID

  const apiToken = process.env.CLOUDFLARE_API_TOKEN

  if (!accountId || !apiToken) {
    throw new Error(
      'Credenciais Cloudflare AI ausentes. Configure CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN no .env.local.'
    )
  }

  const model =
    process.env.CLOUDFLARE_TEXT_MODEL ||
    '@cf/meta/llama-3.1-8b-instruct'

  const prompt = buildPrompt(params)

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content:
              'Você é um editor devocional cristão brasileiro. Responda somente em JSON válido.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.85,
        max_tokens: 1200,
      }),
    }
  )

  const data = await response.json()

  if (!response.ok || data?.success === false) {
    console.error('Erro Cloudflare Workers AI:', data)
    throw new Error(
      data?.errors?.[0]?.message ||
        data?.error ||
        'Erro ao gerar frases com Cloudflare AI.'
    )
  }

  const content =
    data?.result?.response ||
    data?.result?.text ||
    data?.response ||
    ''

  if (!content) {
    console.error('Resposta Cloudflare inesperada:', data)
    throw new Error('A Cloudflare AI não retornou conteúdo.')
  }

  const parsed = extractJsonFromText(content)
  const suggestions = validateSuggestions(parsed)

  return {
    suggestions,
    provider: 'cloudflare',
  }
}

async function generateWithOpenAI(params: {
  transcriptionText: string
  title?: string
  bibleReference?: string
}): Promise<GenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY ausente.')
  }

  const model =
    process.env.OPENAI_DAILY_QUOTE_MODEL ||
    process.env.OPENAI_MODEL ||
    'gpt-4o-mini'

  const prompt = buildPrompt(params)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.75,
      messages: [
        {
          role: 'system',
          content:
            'Você é um editor devocional cristão brasileiro. Responda somente em JSON válido.',
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
    console.error('Erro OpenAI:', data)
    throw new Error(
      data?.error?.message ||
        'Erro ao gerar frases com OpenAI.'
    )
  }

  const content = data?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('A OpenAI não retornou conteúdo.')
  }

  const parsed = extractJsonFromText(content)
  const suggestions = validateSuggestions(parsed)

  return {
    suggestions,
    provider: 'openai',
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const transcriptionText = cleanText(String(body.transcriptionText || ''))
    const title = cleanText(String(body.title || ''))
    const bibleReference = cleanText(String(body.bibleReference || ''))

    if (!transcriptionText) {
      return NextResponse.json(
        { error: 'Envie a transcrição do áudio.' },
        { status: 400 }
      )
    }

    if (transcriptionText.length < 100) {
      return NextResponse.json(
        { error: 'A transcrição está muito curta para gerar frases fortes.' },
        { status: 400 }
      )
    }

    try {
      const result = await generateWithCloudflare({
        transcriptionText,
        title,
        bibleReference,
      })

      return NextResponse.json({
        success: true,
        provider: result.provider,
        suggestions: result.suggestions,
      })
    } catch (cloudflareError) {
      console.error('Falha Cloudflare AI:', cloudflareError)

      try {
        const result = await generateWithOpenAI({
          transcriptionText,
          title,
          bibleReference,
        })

        return NextResponse.json({
          success: true,
          provider: result.provider,
          suggestions: result.suggestions,
        })
      } catch (openAiError) {
        console.error('Falha OpenAI:', openAiError)

        return NextResponse.json(
          {
            success: false,
            error:
              'Não foi possível gerar frases fortes automaticamente. A Cloudflare AI falhou e a OpenAI não está configurada.',
            details:
              cloudflareError instanceof Error
                ? cloudflareError.message
                : 'Erro desconhecido na Cloudflare AI.',
          },
          { status: 500 }
        )
      }
    }
  } catch (error) {
    console.error('Erro ao gerar Palavra do Dia:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao gerar Palavra do Dia.',
      },
      { status: 500 }
    )
  }
}
