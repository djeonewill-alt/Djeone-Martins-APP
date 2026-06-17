/**
 * AI Provider — Classe principal com suporte a múltiplos provedores
 *
 * AI-PROVIDER-002: Wrapper abstrato para DeepSeek (Flash + Pro) como primário,
 * OpenAI como fallback, e futuro suporte a Grok para imagens.
 *
 * AI-PROVIDER-008: Logs estruturados [AI-PROVIDER], fallback controlado,
 * duration tracking.
 *
 * Uso:
 *   import { getAIProvider } from '@/lib/ai/provider'
 *
 *   const ai = getAIProvider()
 *   const result = await ai.generateText({ system: '...', prompt: '...' })
 *   const json = await ai.generateJson({ system: '...', prompt: '...', schema: '...', validate: fn })
 *   const transcription = await ai.transcribeAudio({ audioUrl: '...', language: 'pt' })
 */

import type {
  AIProvider,
  TranscriptionAIProvider,
  TextProvider,
  TextGenerationOptions,
  TextGenerationResult,
  JsonGenerationOptions,
  JsonGenerationResult,
  TranscriptionOptions,
  TranscriptionResult,
  ProviderCallLog,
} from './types'

import { DeepSeekProvider } from './deepseek'
import { OpenAITextProvider, OpenAIWhisperProvider } from './openai'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface AIProviderConfig {
  /**
   * Provedor primário para texto/JSON.
   * Lido de AI_TEXT_PROVIDER. Padrão: 'openai'
   */
  textProvider: TextProvider

  /**
   * Provedor para transcrição de áudio.
   * Lido de AI_TRANSCRIPTION_PROVIDER. Padrão: 'openai'
   */
  transcriptionProvider: 'openai'

  /**
   * Provedor de fallback para quando o primário falhar.
   * Lido de AI_FALLBACK_PROVIDER. Padrão: 'openai'
   */
  fallbackProvider: TextProvider

  /**
   * Se deve logar custo por chamada.
   * Lido de AI_LOG_COSTS. Padrão: false
   */
  logCosts: boolean
}

/**
 * Lê a configuração do environment
 */
function loadConfig(): AIProviderConfig {
  const textProviderRaw = (process.env.AI_TEXT_PROVIDER || 'openai').toLowerCase()
  const fallbackRaw = (process.env.AI_FALLBACK_PROVIDER || 'openai').toLowerCase()

  const validProviders: TextProvider[] = ['deepseek-flash', 'deepseek-pro', 'openai', 'cloudflare']

  const textProvider: TextProvider = validProviders.includes(textProviderRaw as TextProvider)
    ? (textProviderRaw as TextProvider)
    : 'openai'

  const fallbackProvider: TextProvider = validProviders.includes(fallbackRaw as TextProvider)
    ? (fallbackRaw as TextProvider)
    : 'openai'

  return {
    textProvider,
    transcriptionProvider: 'openai',
    fallbackProvider,
    logCosts: process.env.AI_LOG_COSTS === 'true',
  }
}

// ---------------------------------------------------------------------------
// Classe principal
// ---------------------------------------------------------------------------

/**
 * Cliente principal de IA.
 * Gerencia provedores de texto e transcrição com fallback automático.
 */
export class AIClient {
  private config: AIProviderConfig
  private textProvider: AIProvider
  private transcriptionProvider: TranscriptionAIProvider
  private fallbackTextProvider: AIProvider | null = null
  private logs: ProviderCallLog[] = []

  constructor(config?: Partial<AIProviderConfig>) {
    this.config = { ...loadConfig(), ...config }

    // Inicializa provedor de texto primário
    this.textProvider = this.createTextProvider(this.config.textProvider)

    // Inicializa provedor de fallback (se diferente do primário)
    if (
      this.config.fallbackProvider &&
      this.config.fallbackProvider !== this.config.textProvider
    ) {
      this.fallbackTextProvider = this.createTextProvider(this.config.fallbackProvider)
    }

    // Inicializa provedor de transcrição (sempre OpenAI por enquanto)
    this.transcriptionProvider = new OpenAIWhisperProvider()
  }

  // -----------------------------------------------------------------------
  // Fábrica de provedores
  // -----------------------------------------------------------------------

  private createTextProvider(provider: TextProvider): AIProvider {
    switch (provider) {
      case 'deepseek-flash':
        return new DeepSeekProvider('flash')

      case 'deepseek-pro':
        return new DeepSeekProvider('pro')

      case 'openai':
        return new OpenAITextProvider()

      case 'cloudflare':
        throw new Error(
          'Cloudflare Workers AI não é suportado como provider genérico no AIClient. ' +
          'Use a rota específica generate-daily-quote ou implemente CloudflareProvider.'
        )

      default:
        return new OpenAITextProvider()
    }
  }

  // -----------------------------------------------------------------------
  // Getters
  // -----------------------------------------------------------------------

  /**
   * Retorna o nome do provedor de texto ativo
   */
  get activeTextProvider(): TextProvider {
    return this.textProvider.name
  }

  /**
   * Retorna o modelo de texto ativo
   */
  get activeTextModel(): string {
    return this.textProvider.model
  }

  /**
   * Retorna o provedor de transcrição ativo
   */
  get activeTranscriptionProvider(): string {
    return this.transcriptionProvider.name
  }

  /**
   * Retorna a configuração atual
   */
  getConfig(): AIProviderConfig {
    return { ...this.config }
  }

  /**
   * Retorna o histórico de logs de chamadas
   */
  getLogs(): ProviderCallLog[] {
    return [...this.logs]
  }

  // -----------------------------------------------------------------------
  // Logging estruturado
  // -----------------------------------------------------------------------

  private addLog(log: Omit<ProviderCallLog, 'timestamp'>): void {
    this.logs.push({
      ...log,
      timestamp: new Date().toISOString(),
    })

    if (this.config.logCosts) {
      const tokensStr = log.tokensTotal !== undefined ? `${log.tokensTotal}t` : '?t'
      console.info(
        `[AI-PROVIDER] ${log.method} | ${log.provider}/${log.model} | ` +
        `${log.durationMs}ms | ${tokensStr} | ` +
        `${log.success ? '✓' : '✗'}${log.usedFallback ? ' (fallback)' : ''}` +
        (log.errorMessage ? ` | ${log.errorMessage}` : '')
      )
    }
  }

  // -----------------------------------------------------------------------
  // Métodos principais
  // -----------------------------------------------------------------------

  /**
   * Gera texto simples a partir de um prompt.
   * Tenta provedor primário. Se falhar, tenta fallback.
   */
  async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
    const startTime = Date.now()

    try {
      const result = await this.textProvider.generateText(options)

      this.addLog({
        method: 'generateText',
        provider: this.textProvider.name,
        model: result.model,
        success: true,
        durationMs: Date.now() - startTime,
        usedFallback: false,
        tokensTotal: result.usage?.totalTokens,
      })

      return result
    } catch (primaryError) {
      const errorMessage = primaryError instanceof Error ? primaryError.message : String(primaryError)

      console.warn(
        `[AI-PROVIDER] Provedor primário ${this.textProvider.name} falhou: ${errorMessage}`
      )

      // Tenta fallback
      if (this.fallbackTextProvider) {
        try {
          console.info(`[AI-PROVIDER] → Tentando fallback ${this.fallbackTextProvider.name}...`)

          const result = await this.fallbackTextProvider.generateText(options)

          this.addLog({
            method: 'generateText',
            provider: this.fallbackTextProvider.name,
            model: result.model,
            success: true,
            durationMs: Date.now() - startTime,
            usedFallback: true,
            tokensTotal: result.usage?.totalTokens,
          })

          return {
            ...result,
            usedFallback: true,
          }
        } catch (fallbackError) {
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)

          console.error(
            `[AI-PROVIDER] Fallback ${this.fallbackTextProvider.name} também falhou: ${fallbackMessage}`
          )

          this.addLog({
            method: 'generateText',
            provider: this.fallbackTextProvider.name,
            model: 'unknown',
            success: false,
            durationMs: Date.now() - startTime,
            usedFallback: true,
            errorMessage: fallbackMessage,
          })
        }
      }

      this.addLog({
        method: 'generateText',
        provider: this.textProvider.name,
        model: 'unknown',
        success: false,
        durationMs: Date.now() - startTime,
        usedFallback: false,
        errorMessage,
      })

      // Se fallback não existe ou falhou, relança o erro original
      throw primaryError
    }
  }

  /**
   * Gera JSON estruturado.
   * Tenta provedor primário com retry automático.
   * Se falhar, tenta fallback.
   */
  async generateJson<T>(options: JsonGenerationOptions<T>): Promise<T> {
    const startTime = Date.now()

    try {
      const result = await this.textProvider.generateJson(options)

      this.addLog({
        method: 'generateJson',
        provider: this.textProvider.name,
        model: this.textProvider.model,
        success: true,
        durationMs: Date.now() - startTime,
        usedFallback: false,
      })

      return result
    } catch (primaryError) {
      const errorMessage = primaryError instanceof Error ? primaryError.message : String(primaryError)

      console.warn(
        `[AI-PROVIDER] Provedor primário ${this.textProvider.name} falhou em generateJson: ` +
        errorMessage
      )

      // Tenta fallback
      if (this.fallbackTextProvider) {
        try {
          console.info(
            `[AI-PROVIDER] → Tentando fallback ${this.fallbackTextProvider.name} para generateJson...`
          )

          const result = await this.fallbackTextProvider.generateJson(options)

          this.addLog({
            method: 'generateJson',
            provider: this.fallbackTextProvider.name,
            model: this.fallbackTextProvider.model,
            success: true,
            durationMs: Date.now() - startTime,
            usedFallback: true,
          })

          return result
        } catch (fallbackError) {
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)

          console.error(
            `[AI-PROVIDER] Fallback ${this.fallbackTextProvider.name} também falhou em generateJson: ` +
            fallbackMessage
          )

          this.addLog({
            method: 'generateJson',
            provider: this.fallbackTextProvider.name,
            model: 'unknown',
            success: false,
            durationMs: Date.now() - startTime,
            usedFallback: true,
            errorMessage: fallbackMessage,
          })
        }
      }

      this.addLog({
        method: 'generateJson',
        provider: this.textProvider.name,
        model: 'unknown',
        success: false,
        durationMs: Date.now() - startTime,
        usedFallback: false,
        errorMessage,
      })

      throw primaryError
    }
  }

  /**
   * Transcreve áudio (sempre OpenAI Whisper por enquanto)
   */
  async transcribeAudio(options: TranscriptionOptions): Promise<TranscriptionResult> {
    const startTime = Date.now()

    try {
      const result = await this.transcriptionProvider.transcribeAudio(options)

      this.addLog({
        method: 'transcribeAudio',
        provider: this.transcriptionProvider.name,
        model: result.model,
        success: true,
        durationMs: Date.now() - startTime,
        usedFallback: false,
      })

      return {
        ...result,
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      console.error(
        `[AI-PROVIDER] Erro na transcrição: ${errorMessage}`
      )

      this.addLog({
        method: 'transcribeAudio',
        provider: this.transcriptionProvider.name,
        model: 'unknown',
        success: false,
        durationMs: Date.now() - startTime,
        usedFallback: false,
        errorMessage,
      })

      throw error
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton e factory
// ---------------------------------------------------------------------------

let defaultInstance: AIClient | null = null

/**
 * Obtém ou cria a instância padrão do AIClient.
 *
 * Uso:
 *   const ai = getAIProvider()
 *   const result = await ai.generateText({ system: '...', prompt: '...' })
 *
 * Para config customizada:
 *   const ai = new AIClient({ textProvider: 'deepseek-flash', fallbackProvider: 'openai' })
 */
export function getAIProvider(config?: Partial<AIProviderConfig>): AIClient {
  if (config) {
    return new AIClient(config)
  }

  if (!defaultInstance) {
    defaultInstance = new AIClient()
  }

  return defaultInstance
}