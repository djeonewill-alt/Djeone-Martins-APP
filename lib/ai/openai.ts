/**
 * OpenAI Provider — Implementação concreta para fallback OpenAI
 *
 * AI-PROVIDER-002: Wrapper abstrato para suporte a múltiplos provedores de IA.
 *
 * Mantém compatibilidade total com a API OpenAI:
 * - chat/completions com response_format: json_object
 * - audio/transcriptions com Whisper
 * - Usa OPENAI_API_KEY e OPENAI_MODEL do environment
 */

import type {
  AIProvider,
  TranscriptionAIProvider,
  TextProvider,
  TextGenerationOptions,
  TextGenerationResult,
  JsonGenerationOptions,
  TranscriptionOptions,
  TranscriptionResult,
} from './types'

/**
 * Obtém a chave da API OpenAI
 */
function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY

  if (!key) {
    throw new Error(
      'OPENAI_API_KEY ausente. Configure no .env.local para usar o provedor OpenAI.'
    )
  }

  return key
}

/**
 * Obtém o modelo padrão para texto
 */
function getTextModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini'
}

/**
 * Obtém o modelo para transcrição
 */
function getTranscriptionModel(): string {
  return (
    process.env.OPENAI_TRANSCRIPTION_MODEL ||
    process.env.OPENAI_TRANSCRIBE_TIMESTAMPS_MODEL ||
    'whisper-1'
  )
}

/**
 * Extrai JSON de uma resposta de texto usando regex.
 * Compatível com a função já existente no projeto.
 */
function extractJsonFromText(text: string): unknown {
  const cleaned = text.trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)

    if (!match) {
      throw new Error('OpenAI não retornou JSON válido.')
    }

    return JSON.parse(match[0])
  }
}

/**
 * Função compartilhada para chamar chat/completions da OpenAI
 */
async function callChatCompletions(params: {
  model: string
  messages: Array<{ role: string; content: string }>
  temperature: number
  maxTokens: number
  responseFormat?: 'json_object'
}): Promise<{
  content: string
  model: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
}> {
  const apiKey = getApiKey()

  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
  }

  if (params.responseFormat) {
    body.response_format = { type: params.responseFormat }
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Erro OpenAI API:', data)
    throw new Error(data?.error?.message || `Erro HTTP ${response.status} ao chamar OpenAI.`)
  }

  const content = data?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('OpenAI não retornou conteúdo.')
  }

  const usage = data?.usage

  return {
    content,
    model: data?.model || params.model,
    usage: {
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
    },
  }
}

/**
 * Função compartilhada para chamar audio/transcriptions da OpenAI (Whisper)
 */
async function callAudioTranscriptions(params: {
  audioUrl: string
  model: string
  language: string
  responseFormat: string
  timestampGranularities?: string[]
  prompt?: string
}): Promise<{
  data: Record<string, unknown>
  model: string
}> {
  const apiKey = getApiKey()

  // Baixa o arquivo de áudio
  const audioResponse = await fetch(params.audioUrl)

  if (!audioResponse.ok) {
    throw new Error('Não foi possível baixar o áudio para transcrição.')
  }

  const arrayBuffer = await audioResponse.arrayBuffer()
  const contentType =
    audioResponse.headers.get('content-type')?.includes('audio')
      ? audioResponse.headers.get('content-type')!
      : 'audio/webm'

  const audioBlob = new Blob([arrayBuffer], { type: contentType })
  const fileName = `audio-${Date.now()}.webm`

  const formData = new FormData()
  formData.append('file', audioBlob, fileName)
  formData.append('model', params.model)
  formData.append('language', params.language)
  formData.append('response_format', params.responseFormat)

  if (params.timestampGranularities) {
    params.timestampGranularities.forEach((granularity) => {
      formData.append('timestamp_granularities[]', granularity)
    })
  }

  if (params.prompt) {
    formData.append('prompt', params.prompt)
  }

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Erro OpenAI Whisper:', data)
    throw new Error(
      data?.error?.message || `Erro HTTP ${response.status} ao transcrever áudio.`
    )
  }

  return {
    data,
    model: params.model,
  }
}

/**
 * Provedor concreto OpenAI para texto/JSON
 *
 * Uso:
 *   const provider = new OpenAITextProvider()
 *   const result = await provider.generateText({ system: '...', prompt: '...' })
 *   const json = await provider.generateJson({ system: '...', prompt: '...', validate: fn })
 */
export class OpenAITextProvider implements AIProvider {
  readonly name: TextProvider = 'openai'
  readonly model: string

  constructor(model?: string) {
    this.model = model || getTextModel()
  }

  /**
   * Gera texto simples
   */
  async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
    const temperature = options.temperature ?? 0.5
    const maxTokens = options.maxTokens ?? 2048

    const result = await callChatCompletions({
      model: this.model,
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.prompt },
      ],
      temperature,
      maxTokens,
    })

    return {
      text: result.content.trim(),
      provider: this.name,
      model: result.model,
      usage: result.usage,
    }
  }

  /**
   * Gera JSON estruturado usando response_format: json_object
   */
  async generateJson<T>(options: JsonGenerationOptions<T>): Promise<T> {
    const temperature = options.temperature ?? 0.3
    const maxTokens = options.maxTokens ?? 4096

    const result = await callChatCompletions({
      model: this.model,
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.prompt },
      ],
      temperature,
      maxTokens,
      responseFormat: 'json_object',
    })

    const parsed = extractJsonFromText(result.content)

    return options.validate(parsed)
  }
}

/**
 * Provedor concreto OpenAI para transcrição de áudio (Whisper)
 *
 * Uso:
 *   const provider = new OpenAIWhisperProvider()
 *   const result = await provider.transcribeAudio({ audioUrl: '...', language: 'pt' })
 */
export class OpenAIWhisperProvider implements TranscriptionAIProvider {
  readonly name = 'openai' as const
  readonly model: string

  constructor(model?: string) {
    this.model = model || getTranscriptionModel()
  }

  /**
   * Transcreve áudio usando OpenAI Whisper
   */
  async transcribeAudio(options: TranscriptionOptions): Promise<TranscriptionResult> {
    const model = options.model || this.model
    const language = options.language || 'pt'
    const timestampGranularities: string[] = ['segment']

    if (options.wordTimestamps) {
      timestampGranularities.push('word')
    }

    const result = await callAudioTranscriptions({
      audioUrl: options.audioUrl,
      model,
      language,
      responseFormat: 'verbose_json',
      timestampGranularities,
      prompt:
        options.prompt ||
        'Transcreva em portugues brasileiro. Preserve termos biblicos, nomes proprios, referencias biblicas e linguagem devocional crista.',
    })

    const data = result.data
    const transcriptionText = String(data?.text || '').replace(/\s+/g, ' ').trim()
    const rawSegments = Array.isArray(data?.segments) ? data.segments : []
    const rawWords = Array.isArray(data?.words) ? data.words : []

    const segments = rawSegments
      .map((seg: Record<string, unknown>) => ({
        start: Number(seg.start),
        end: Number(seg.end),
        text: String(seg.text || '').replace(/\s+/g, ' ').trim(),
      }))
      .filter((seg: { start: number; end: number; text: string }) => {
        return (
          Number.isFinite(seg.start) &&
          Number.isFinite(seg.end) &&
          seg.end > seg.start &&
          seg.text.length > 0
        )
      })

    const words = rawWords
      .map((w: Record<string, unknown>) => ({
        word: String(w.word || '').replace(/\s+/g, ' ').trim(),
        start: Number(w.start),
        end: Number(w.end),
      }))
      .filter((w: { word: string; start: number; end: number }) => {
        return (
          w.word.length > 0 &&
          Number.isFinite(w.start) &&
          Number.isFinite(w.end) &&
          w.start >= 0 &&
          w.end > w.start
        )
      })

    return {
      text: transcriptionText,
      segments,
      words: options.wordTimestamps ? words : undefined,
      provider: this.name,
      model,
    }
  }
}