/**
 * AI Provider — Tipos e interfaces principais
 *
 * AI-PROVIDER-002 e AI-PROVIDER-008: Wrapper abstrato para suporte a múltiplos provedores de IA.
 * DeepSeek (Flash + Pro) como primário, OpenAI como fallback.
 *
 * Melhorias AI-PROVIDER-008:
 * - Adicionado JsonGenerationResult com timing e fallback info
 * - Adicionado ProviderCallLog para logs estruturados
 * - Adicionado getLogs() na interface AIProvider
 */

/**
 * Provedores de texto suportados
 */
export type TextProvider = 'deepseek-flash' | 'deepseek-pro' | 'openai' | 'cloudflare'

/**
 * Provedores de transcrição suportados
 */
export type TranscriptionProvider = 'openai' | 'whisper'

/**
 * Resultado de uma chamada generateText
 */
export interface TextGenerationResult {
  text: string
  provider: TextProvider | TranscriptionProvider
  model: string
  durationMs?: number
  usedFallback?: boolean
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

/**
 * Opções para generateText
 */
export interface TextGenerationOptions {
  system: string
  prompt: string
  temperature?: number
  maxTokens?: number
}

/**
 * Opções para generateJson
 */
export interface JsonGenerationOptions<T> {
  system: string
  prompt: string
  schema: string
  validate: (raw: unknown) => T
  temperature?: number
  maxTokens?: number
  maxRetries?: number
}

/**
 * Resultado de uma chamada generateJson
 */
export interface JsonGenerationResult<T> {
  data: T
  provider: TextProvider
  model: string
  durationMs: number
  usedFallback: boolean
  retriesAttempted: number
}

/**
 * Opções para transcribeAudio
 */
export interface TranscriptionOptions {
  audioUrl: string
  language: string
  model?: string
  wordTimestamps?: boolean
  prompt?: string
}

/**
 * Segmento de transcrição
 */
export interface TranscriptionSegment {
  start: number
  end: number
  text: string
}

/**
 * Timestamp por palavra
 */
export interface WordTimestamp {
  word: string
  start: number
  end: number
}

/**
 * Resultado de transcrição de áudio
 */
export interface TranscriptionResult {
  text: string
  segments: TranscriptionSegment[]
  words?: WordTimestamp[]
  provider: TranscriptionProvider
  model: string
  durationMs?: number
}

/**
 * Log estruturado de uma chamada de provedor
 */
export interface ProviderCallLog {
  timestamp: string
  method: 'generateText' | 'generateJson' | 'transcribeAudio'
  provider: string
  model: string
  success: boolean
  durationMs: number
  usedFallback: boolean
  tokensTotal?: number
  errorMessage?: string
}

/**
 * Interface que todo provedor de texto deve implementar
 */
export interface AIProvider {
  readonly name: TextProvider
  readonly model: string

  generateText(options: TextGenerationOptions): Promise<TextGenerationResult>

  generateJson<T>(options: JsonGenerationOptions<T>): Promise<T>
}

/**
 * Interface que todo provedor de transcrição deve implementar
 */
export interface TranscriptionAIProvider {
  readonly name: TranscriptionProvider
  readonly model: string

  transcribeAudio(options: TranscriptionOptions): Promise<TranscriptionResult>
}