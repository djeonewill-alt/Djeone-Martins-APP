/**
 * DeepSeek Provider — Implementação concreta para DeepSeek Flash e Pro
 *
 * AI-PROVIDER-002: Wrapper abstrato para suporte a múltiplos provedores de IA.
 * AI-PROVIDER-008: Logs estruturados, validação de erro HTTP, fallback granular.
 * AI-PROVIDER-009: Modelos atualizados para deepseek-v4-flash e deepseek-v4-pro.
 *
 * Características:
 * - DeepSeek não suporta response_format: json_object → parsing manual via regex
 * - Suporta FLASH (rápido/barato) para texto simples e PRO (potente) para JSON estruturado
 * - Usa DEEPSEEK_API_KEY, DEEPSEEK_MODEL e DEEPSEEK_BASE_URL do environment
 *
 * Modelos (AI-PROVIDER-009):
 * - flash  → deepseek-v4-flash  (padrão, mais barato e rápido)
 * - pro    → deepseek-v4-pro    (mais potente, para JSON complexo)
 *
 * A variável DEEPSEEK_MODEL pode ser:
 * - "flash" (equivalente a "deepseek-v4-flash", padrão)
 * - "pro" ou "deepseek-v4-pro"
 * - Qualquer outro nome de modelo personalizado
 */

import type {
  AIProvider,
  TextProvider,
  TextGenerationOptions,
  TextGenerationResult,
  JsonGenerationOptions,
} from './types'

/**
 * Extrai JSON de uma resposta de texto usando regex.
 * Tentativa 1: JSON.parse diretamente.
 * Tentativa 2: Extrair primeiro objeto/array JSON com regex.
 * Tentativa 3: Stripar markdown ```json ... ``` e tentar novamente.
 */
function extractJsonFromText(text: string): unknown {
  const cleaned = text.trim()

  // Tentativa 1: parse direto
  try {
    return JSON.parse(cleaned)
  } catch {
    // fallback
  }

  // Tentativa 2: extrair com regex
  const match = cleaned.match(/\{[\s\S]*\}/) || cleaned.match(/\[[\s\S]*\]/)

  if (match) {
    try {
      return JSON.parse(match[0])
    } catch {
      // fallback
    }
  }

  // Tentativa 3: remover markdown code block
  const stripped = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(stripped)
  } catch {
    // fallback
  }

  throw new Error(
    'DeepSeek não retornou JSON válido após todas as tentativas de extração. ' +
    'Dica: certifique-se de que o prompt solicita explicitamente JSON puro.'
  )
}

/**
 * Retorna o nome do modelo baseado na config
 *
 * AI-PROVIDER-009: Modelos atualizados:
 * - flash padrão → deepseek-v4-flash
 * - pro padrão   → deepseek-v4-pro
 *
 * Compatibilidade retroativa:
 * - "deepseek-chat"     → aceito como alias de flash
 * - "deepseek-reasoner" → aceito como alias de pro
 * - Qualquer string personalizada → usada diretamente
 */
function resolveModel(): { model: string; provider: TextProvider } {
  const raw = (process.env.DEEPSEEK_MODEL || 'flash').toLowerCase().trim()

  // Mapa de aliases
  const flashAliases = new Set(['flash', 'deepseek-chat', 'deepseek-v4-flash'])
  const proAliases = new Set(['pro', 'deepseek-reasoner', 'deepseek-v4-pro'])

  const isFlash = flashAliases.has(raw)
  const isPro = proAliases.has(raw)

  if (isFlash) {
    return {
      model: 'deepseek-v4-flash',
      provider: 'deepseek-flash',
    }
  }

  if (isPro) {
    return {
      model: 'deepseek-v4-pro',
      provider: 'deepseek-pro',
    }
  }

  // Nome personalizado — usa diretamente, deduz provider pelo nome
  const inferredProvider: TextProvider = raw.includes('pro')
    ? 'deepseek-pro'
    : 'deepseek-flash'

  return {
    model: raw,
    provider: inferredProvider,
  }
}

/**
 * Resolve o modelo considerando um variant opcional.
 * Se variant for fornecido, sobrepõe o env DEEPSEEK_MODEL.
 * Se não, lê do process.env.DEEPSEEK_MODEL (comportamento padrão).
 */
function resolveModelWithVariant(variant?: 'flash' | 'pro'): { model: string; provider: TextProvider } {
  if (variant === 'flash') {
    return {
      model: 'deepseek-v4-flash',
      provider: 'deepseek-flash',
    }
  }

  if (variant === 'pro') {
    return {
      model: 'deepseek-v4-pro',
      provider: 'deepseek-pro',
    }
  }

  // Sem variant: lê do environment (comportamento legado)
  return resolveModel()
}

/**
 * Obtém a URL base da API DeepSeek
 */
function getBaseUrl(): string {
  return (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '')
}

/**
 * Obtém a chave da API
 */
function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY

  if (!key) {
    throw new Error(
      'DEEPSEEK_API_KEY ausente. Configure no .env.local para usar o provedor DeepSeek.'
    )
  }

  return key
}

/**
 * Função compartilhada para chamar a API DeepSeek (usada tanto por generateText quanto generateJson)
 */
async function callDeepSeek(params: {
  model: string
  messages: Array<{ role: string; content: string }>
  temperature: number
  maxTokens: number
}): Promise<{
  content: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
}> {
  const apiKey = getApiKey()
  const baseUrl = getBaseUrl()

  const startTime = Date.now()
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    }),
  })

  const durationMs = Date.now() - startTime
  const data = await response.json()

  if (!response.ok) {
    const status = response.status
    const errorMessage = data?.error?.message || `Erro HTTP ${status}`

    // Log estruturado do erro
    console.error(
      `[AI-PROVIDER] DeepSeek erro | status=${status} | model=${params.model} | ` +
      `duration=${durationMs}ms | error=${errorMessage}`
    )

    // Erros específicos com mensagens claras
    if (status === 401) {
      throw new Error('DeepSeek: chave de API inválida (401). Verifique DEEPSEEK_API_KEY.')
    }
    if (status === 429) {
      throw new Error('DeepSeek: limite de taxa excedido (429). Aguarde e tente novamente.')
    }
    if (status === 400) {
      throw new Error(
        `DeepSeek: requisição inválida (400). ${errorMessage}`
      )
    }
    if (status >= 500) {
      throw new Error(
        `DeepSeek: erro interno do servidor (${status}). Tente novamente mais tarde.`
      )
    }

    throw new Error(`DeepSeek: ${errorMessage}`)
  }

  const content = data?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('DeepSeek não retornou conteúdo na resposta.')
  }

  const usage = data?.usage

  return {
    content,
    usage: {
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
    },
  }
}

/**
 * Provedor concreto DeepSeek
 *
 * Uso:
 *   const provider = new DeepSeekProvider()
 *   const result = await provider.generateText({ system: '...', prompt: '...' })
 *   const json = await provider.generateJson({ system: '...', prompt: '...', schema: '...', validate: fn })
 */
export class DeepSeekProvider implements AIProvider {
  readonly name: TextProvider
  readonly model: string

  /**
   * Cria um provedor DeepSeek.
   * @param variant - Opcional. 'flash' para deepseek-v4-flash, 'pro' para deepseek-v4-pro.
   *                  Se não informado, usa process.env.DEEPSEEK_MODEL (comportamento legado).
   */
  constructor(variant?: 'flash' | 'pro') {
    const resolved = resolveModelWithVariant(variant)
    this.model = resolved.model
    this.name = resolved.provider
  }

  /**
   * Gera texto simples a partir de um prompt.
   * Não tenta parsear JSON — retorna o texto bruto.
   */
  async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
    const temperature = options.temperature ?? 0.5
    const maxTokens = options.maxTokens ?? 2048
    const startTime = Date.now()

    const result = await callDeepSeek({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: options.system,
        },
        {
          role: 'user',
          content: options.prompt,
        },
      ],
      temperature,
      maxTokens,
    })

    return {
      text: result.content.trim(),
      provider: this.name,
      model: this.model,
      durationMs: Date.now() - startTime,
      usedFallback: false,
      usage: result.usage,
    }
  }

  /**
   * Gera JSON estruturado a partir de um prompt.
   *
   * Como DeepSeek não suporta response_format: json_object:
   * 1. Adiciona instrução de JSON no system prompt
   * 2. Extrai JSON manualmente com regex
   * 3. Valida com a função validate fornecida
   * 4. Retry automático se falhar (até maxRetries vezes)
   */
  async generateJson<T>(options: JsonGenerationOptions<T>): Promise<T> {
    const temperature = options.temperature ?? 0.3
    const maxTokens = options.maxTokens ?? 4096
    const maxRetries = options.maxRetries ?? 2
    const startTime = Date.now()

    // Concatena instrução de JSON ao system prompt
    const enhancedSystem = [
      options.system,
      '',
      'INSTRUÇÃO DE FORMATO:',
      'Você DEVE responder APENAS com JSON válido.',
      'Não inclua markdown, explicações ou texto adicional.',
      'Apenas o JSON puro.',
      '',
      'ESQUEMA ESPERADO:',
      options.schema,
    ].join('\n')

    const messages = [
      {
        role: 'system' as const,
        content: enhancedSystem,
      },
      {
        role: 'user' as const,
        content: [
          options.prompt,
          '',
          'Responda APENAS com JSON válido. Sem markdown. Sem texto extra.',
        ].join('\n'),
      },
    ]

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const result = await callDeepSeek({
          model: this.model,
          messages,
          temperature: temperature + attempt * 0.05, // aumenta temperatura levemente em retry
          maxTokens,
        })

        // Extrai JSON do texto bruto
        const parsed = extractJsonFromText(result.content)

        // Valida com a função fornecida
        return options.validate(parsed)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const isLastAttempt = attempt >= maxRetries

        console.warn(
          `[AI-PROVIDER] DeepSeek generateJson tentativa ${attempt + 1}/${maxRetries + 1} falhou` +
          ` | model=${this.model} | erro=${lastError.message}` +
          `${isLastAttempt ? ' | ÚLTIMA TENTATIVA' : ' | tentando novamente...'}`
        )

        if (!isLastAttempt) {
          // Mensagem adicional para o próximo retry
          messages.push({
            role: 'user',
            content: `Sua resposta anterior não foi um JSON válido. Erro: ${lastError.message}. Responda APENAS com JSON válido, sem markdown, sem texto extra.`,
          })
        }
      }
    }

    throw lastError || new Error('DeepSeek generateJson falhou após todas as tentativas.')
  }
}