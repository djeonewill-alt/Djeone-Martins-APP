import { NextRequest, NextResponse } from 'next/server'
import { DeepSeekProvider } from '@/lib/ai/deepseek'

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
  provider: 'deepseek'
}

const ALLOWED_USE_CASES = new Set([
  'card',
  'whatsapp',
  'instagram',
  'short',
  'devotional',
])

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

function normalizeForMatch(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasAdministrativeLanguage(text: string) {
  const patterns = [
    /\bbom dia\b/i,
    /\bboa tarde\b/i,
    /\bboa noite\b/i,
    /\baviso\b/i,
    /\badministrativo\b/i,
    /\btranscri[cç][aã]o\b/i,
    /\b[aá]udio\b/i,
    /\bmensagem\b/i,
    /\bepis[oó]dio\b/i,
    /\bestudo\b/i,
    /\bcompartilhar\b/i,
    /\bcadastrar\b/i,
    /\binscrev/i,
  ]

  return patterns.some((pattern) => pattern.test(text))
}

function hasEnoughSourceOverlap(quoteText: string, sourceExcerpt: string, reason: string) {
  const sourceWords = new Set(
    normalizeForMatch(`${sourceExcerpt} ${reason}`)
      .split(/\s+/)
      .filter((word) => word.length >= 5)
  )

  if (sourceWords.size < 3) return false

  const quoteWords = normalizeForMatch(quoteText)
    .split(/\s+/)
    .filter((word) => word.length >= 5)

  const overlapCount = quoteWords.filter((word) => sourceWords.has(word)).length

  return overlapCount >= 1
}

function hasConcreteEpisodeSignal(text: string) {
  const normalized = normalizeForMatch(text)
  const concretePatterns = [
    /\bjesus\b/,
    /\bcristo\b/,
    /\bdeus\b/,
    /\bsenhor\b/,
    /\bespirito\b/,
    /\btemplo\b/,
    /\bjerusalem\b/,
    /\bbetania\b/,
    /\blazaro\b/,
    /\bmarta\b/,
    /\bmaria\b/,
    /\bpaulo\b/,
    /\bpedro\b/,
    /\bdavi\b/,
    /\bmoises\b/,
    /\babraa?o\b/,
    /\bisrael\b/,
    /\bcruz\b/,
    /\btumulo\b/,
    /\bcasa\b/,
    /\bmesa\b/,
    /\bdeserto\b/,
    /\bvale\b/,
    /\bporta\b/,
    /\bcontraste\b/,
    /\benquanto\b/,
    /\bantes\b.*\bdepois\b/,
    /\bnao\b.*\bmas\b/,
  ]

  return concretePatterns.some((pattern) => pattern.test(normalized))
}

function normalizeUseCase(value: string) {
  const normalized = normalizeForMatch(value)

  return ALLOWED_USE_CASES.has(normalized) ? normalized : 'card'
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
Você é um assistente especializado em criar frases de efeito para um aplicativo cristão chamado "Palavra do Dia". Sua única tarefa agora é ler a transcrição de uma pregação e gerar frases impactantes baseadas nela.

REGRA 1 — FIDELIDADE TOTAL À TRANSCRIÇÃO
Você só pode usar ideias, conceitos e palavras que estejam presentes na transcrição. Não invente nada. Não acrescente ideias que o pregador não disse. Não complete pensamentos com coisas que você acha que ele quis dizer. Se uma ideia não está na transcrição, ela não pode aparecer na frase. Leia a transcrição com atenção antes de escrever qualquer coisa.

REGRA 2 — TAMANHO IDEAL
A frase precisa ter entre 15 e 35 palavras. Não pode ser curta demais (menos de 15 palavras) porque ficaria vaga e sem impacto. Não pode ser longa demais (mais de 35 palavras) porque a frase precisa caber em uma imagem no aplicativo, em no máximo 4 linhas de texto. Conte as palavras antes de entregar.

REGRA 3 — TOM FORTE E ENCORAJADOR
A frase precisa encorajar quem está passando por dificuldades, críticas, calúnias ou momentos difíceis. Ela deve soar como uma verdade que fortalece, que levanta, que dá esperança. Não pode ser uma frase fraca, neutra ou apenas descritiva. Ela precisa fazer a pessoa sentir que Deus está ao lado dela.

REGRA 4 — ESTILO DA FRASE
Escreva como uma declaração poderosa ou uma reflexão profunda. Pode começar com "Não é...", "Feche...", "O que Deus fala...", "Quando Deus...", entre outros. Evite começar com "Hoje" ou com o nome de personagens bíblicos, porque a frase precisa falar diretamente com quem lê, na primeira ou segunda pessoa.

REGRA 5 — IDIOMA
Escreva sempre em português brasileiro. Use linguagem simples, direta e acessível para qualquer pessoa, independente do nível de escolaridade.

REGRA 6 — FORMATO DE SAÍDA
Gere exatamente 5 opções de frases. Retorne SOMENTE um JSON válido, exatamente neste formato, sem texto antes ou depois:

{
  "suggestions": [
    {
      "quote_text": "frase forte aqui",
      "reason": "explique brevemente por que esta frase tem força e se encaixa como Palavra do Dia",
      "score": 9,
      "source_excerpt": "trecho curto e real da transcrição que sustenta a frase",
      "use_case": "card",
      "specificity_reason": "por que a frase é específica deste episódio e não serviria para qualquer outro"
    }
  ]
}

Campos obrigatórios em cada sugestão:
- quote_text (a frase)
- source_excerpt (trecho real da transcrição)
- reason (justificativa curta)
- score (nota de 8 a 10)
- use_case: use somente card, whatsapp, instagram, short ou devotional
- specificity_reason (por que é específica)

Não use aspas dentro do quote_text que possam quebrar o JSON. Não use emojis. Não use hashtags. Não escreva nada além do JSON.

TÍTULO DO EPISÓDIO:
${title || 'Não informado'}

REFERÊNCIA BÍBLICA:
${bibleReference || 'Não informada'}

TRANSCRIÇÃO:
${params.transcriptionText}
`.trim()
}

function validateSuggestions(input: unknown): DailyQuoteSuggestion[] {
  const parsed = input as { suggestions?: unknown }

  if (!parsed || !Array.isArray(parsed.suggestions)) {
    throw new Error('A IA não retornou uma lista de sugestões.')
  }

  const normalizedSuggestions = parsed.suggestions
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
      const useCase = normalizeUseCase(String(value.use_case || 'card'))
      const specificityReason = cleanText(String(value.specificity_reason || '')).slice(0, 220)
      const rawScore = Number(value.score)
      let score = Number.isFinite(rawScore) ? rawScore : 8
      const hasSourceExcerpt = sourceExcerpt.length >= 20
      const hasSourceOverlap = hasSourceExcerpt
        ? hasEnoughSourceOverlap(quoteText, sourceExcerpt, reason)
        : false
      const hasConcreteSignal = hasConcreteEpisodeSignal(
        `${quoteText} ${sourceExcerpt} ${reason} ${specificityReason}`
      )

      if (!hasSourceExcerpt) score -= 2
      if (!hasSourceOverlap) score -= 1
      if (!hasConcreteSignal) score -= 1

      const wordCount = countWords(quoteText)

      return {
        quote_text: quoteText,
        reason: hasSourceExcerpt
          ? reason
          : `${reason} Baixa confianca: sem trecho-base suficiente na transcricao.`,
        score: Math.max(1, Math.min(10, Math.round(score))),
        source_excerpt: sourceExcerpt || undefined,
        use_case: useCase || undefined,
        specificity_reason: specificityReason || undefined,
        wordCount,
        hasSourceExcerpt,
        hasSourceOverlap,
        hasConcreteSignal,
      }
    })
    .filter((item) => {
      return (
        item.score >= 8 &&
        item.quote_text.length >= 30 &&
        item.quote_text.length <= 220 &&
        item.wordCount >= 10 &&
        item.wordCount <= 38 &&
        !looksLikeQuestion(item.quote_text) &&
        !looksLikeHistoricalSummary(item.quote_text) &&
        !looksBrokenOrUnclear(item.quote_text) &&
        !hasExcessiveRepetition(item.quote_text) &&
        !hasAdministrativeLanguage(item.source_excerpt || '') &&
        (item.hasSourceExcerpt || item.hasConcreteSignal)
      )
    })

  const groundedSuggestions = normalizedSuggestions.filter((item) => item.hasSourceExcerpt)
  const suggestionsPool = groundedSuggestions.length >= 3
    ? groundedSuggestions
    : normalizedSuggestions

  const seen = new Set<string>()
  const suggestions = suggestionsPool
    .sort((a, b) => b.score - a.score)
    .filter((item) => {
      const key = normalizeForMatch(item.quote_text)
        .split(/\s+/)
        .filter((word) => word.length >= 5)
        .slice(0, 7)
        .join(' ')

      if (!key || seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
    .map(({
      wordCount,
      hasSourceExcerpt,
      hasSourceOverlap,
      hasConcreteSignal,
      ...item
    }) => item)

  if (suggestions.length < 3) {
    throw new Error(
      'A IA não gerou frases fortes o suficiente. Tente novamente ou melhore a transcrição.'
    )
  }

  return suggestions.slice(0, 5)
}

async function generateWithDeepSeek(params: {
  transcriptionText: string
  title?: string
  bibleReference?: string
}): Promise<GenerateResult> {
  const provider = new DeepSeekProvider('flash')
  const prompt = buildPrompt(params)

  const schema = `{
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
}`

  const suggestions = await provider.generateJson({
    system:
      'Você é um assistente especializado em criar frases de efeito para um aplicativo cristão chamado "Palavra do Dia". ' +
      'Você lê transcrições de pregações e gera frases impactantes baseadas nelas. ' +
      'Responda APENAS com JSON válido. Sem markdown. Sem texto extra.',
    prompt,
    schema,
    validate: validateSuggestions,
    temperature: 0.6,
    maxTokens: 4096,
  })

  return {
    suggestions,
    provider: 'deepseek',
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

    const result = await generateWithDeepSeek({
      transcriptionText,
      title,
      bibleReference,
    })

    return NextResponse.json({
      success: true,
      provider: result.provider,
      suggestions: result.suggestions,
    })
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
