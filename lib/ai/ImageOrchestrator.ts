/**
 * ImageOrchestrator — Gerador centralizado de prompts visuais para FLUX
 *
 * Regra de ouro: Input ABSOLUTAMENTE isolado. Aceita APENAS a selectedQuote.
 * NENHUM contexto bíblico externo é injetado. Nenhuma transcrição.
 *
 * Este é o ÚNICO ponto de geração de prompt para imagem no sistema.
 * Não há fallbacks locais espalhados pelos arquivos.
 */

import { getAIProvider } from './provider'
import type { TextProvider } from './types'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface OrchestratorInput {
  /** A frase escolhida — ÚNICO campo aceito. Nada mais. */
  selectedQuote: string
}

export interface OrchestratorResult {
  /** Prompt visual em inglês pronto para o FLUX */
  fluxVisualPrompt: string
  /** Modelo usado para gerar o prompt */
  model: string
  /** Provedor usado */
  provider: TextProvider
}

// ---------------------------------------------------------------------------
// System prompt centralizado — identidade única
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = [
  'SYSTEM PROMPT — GERADOR DE PROMPTS PARA FLUX (PALAVRA DO DIA)',
  '',
  'PERSONA:',
  'Você é um especialista em design emocional e metafórico. Sua tarefa é criar uma',
  'imagem cinematográfica que capture a essência, o tom e a emoção da frase da Palavra',
  'do Dia fornecida. Use elementos visuais literais ou metafóricos que expressem o',
  'significado da frase. A prioridade é a conexão visual entre o conteúdo da frase e',
  'a imagem gerada.',
  '',
  'REGRA DE PRIORIDADE ABSOLUTA:',
  'A frase escolhida (selectedQuote) é o ÚNICO elemento que importa. A imagem inteira',
  'deve ser construída para refletir visualmente a emoção e a mensagem dessa frase.',
  '',
  'DIAGNÓSTICO INTERNO (obrigatório antes de escrever):',
  '1. Qual é a emoção central da frase? (libertação, paz, encorajamento, fé, força)',
  '2. O que essa frase quer provocar em quem lê? (esperança, coragem, alívio)',
  '3. Qual elemento visual — literal ou metafórico — melhor expressa esse significado?',
  '4. Que objetos, cenários, cores e luzes traduzem essa mensagem visualmente?',
  '',
  'COMPOSITION AND COPY SPACE RULE:',
  'The image MUST have a central "Safe Zone" for text overlay. You MUST leave the',
  'center of the image uncluttered, using deep shadows, dark tones, or smooth textures',
  '(Negative Space). DO NOT place bright highlights, light beams, or highly detailed',
  'main subjects dead-center. Frame the main subjects (like hands, objects, or',
  'landscapes) towards the bottom, edges, or silhouettes, keeping the central area',
  'dark and clean to ensure white typography is highly readable.',
  '',
  'LIGHTING DIVERSITY RULE:',
  'You MUST vary the lighting style drastically for each prompt based on the mood.',
  'DO NOT always use "god rays" or beams of light from above. Strictly avoid bright',
  'volumetric light beams crossing the center of the image, as they ruin text legibility.',
  'Instead, use a wide variety of cinematic lighting setups: soft overcast natural light,',
  'dramatic side-lighting (chiaroscuro), gentle golden hour, moody low-key shadows,',
  'diffuse ambient light, or practical environmental lights. The lighting must feel',
  'natural, diverse, and never repetitive.',
  '',
  'DIRETRIZES DE COMPOSIÇÃO:',
  '- Use elementos visuais que expressem diretamente o significado da frase',
  '- A imagem deve transmitir a mensagem da frase MESMO SEM TEXTO VISÍVEL',
  '- Estilo: "Shot on 35mm film, anamorphic lens, cinematic color grading, photorealistic, 8k"',
  '- Proibido: texto, letras, palavras, tipografia, overlays na imagem — esta é uma imagem de fundo limpa',
  '',
  'REGRA FINAL:',
  'Se a pessoa olhar para a imagem sem ler o texto e sentir a mesma emoção da frase,',
  'o prompt foi bem-sucedido.',
  '',
  'Escreva o prompt em INGLÊS. Retorne APENAS um objeto JSON.',
].join('\n')

const SCHEMA = `{
  "flux_visual_prompt": "English abstract emotional scene description for FLUX"
}`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanText(text: string, maxLength = 5000): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

/**
 * Gera um prompt visual abstrato/emocional para FLUX baseado APENAS na frase escolhida.
 *
 * NENHUM contexto bíblico é aceito. Apenas a selectedQuote.
 *
 * @param input - APENAS a frase escolhida
 * @returns O prompt visual em inglês pronto para o FLUX
 */
export async function generateFluxPrompt(
  input: OrchestratorInput
): Promise<OrchestratorResult> {
  const selectedQuote = cleanText(input.selectedQuote, 500)

  if (!selectedQuote || selectedQuote.length < 10) {
    throw new Error('ImageOrchestrator: selectedQuote é obrigatório e deve ter pelo menos 10 caracteres.')
  }

  const ai = getAIProvider({
    textProvider: 'deepseek-flash',
    fallbackProvider: 'openai',
  })

  // User prompt: APENAS a frase. Nada de contexto secundário.
  const userPrompt = [
    'PALAVRA DO DIA (selectedQuote — ÚNICO FOCO DA IMAGEM):',
    `"${selectedQuote}"`,
    '',
    'IMPORTANTE: Você NÃO tem acesso a nenhuma transcrição, contexto bíblico, título ou referência.',
    'Use APENAS a frase acima como inspiração. Gere uma imagem abstrata e emocional.',
    '',
    'Return JSON: { "flux_visual_prompt": "English abstract emotional scene description — foco total na emoção da frase" }',
  ].join('\n')

  const diagnosisData = await ai.generateJson({
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    schema: SCHEMA,
    validate: (raw) => {
      const parsed = raw as { flux_visual_prompt?: string }
      const prompt = (parsed.flux_visual_prompt || '').trim()

      if (!prompt || prompt.length < 50) {
        throw new Error(
          'ImageOrchestrator: DeepSeek não gerou um prompt visual válido. ' +
          'O modelo pode estar gerando conteúdo insuficiente.'
        )
      }

      return { flux_visual_prompt: prompt }
    },
    temperature: 0.6,
    maxTokens: 2048,
  })

  console.log('[ImageOrchestrator] Prompt gerado | modelo=', ai.activeTextModel)
  console.log('[ImageOrchestrator] Prompt (primeiros 200 chars):', diagnosisData.flux_visual_prompt.slice(0, 200))

  return {
    fluxVisualPrompt: diagnosisData.flux_visual_prompt,
    model: ai.activeTextModel,
    provider: ai.activeTextProvider,
  }
}

/**
 * Constrói o prompt final que será enviado ao FLUX,
 * adicionando o sufixo de qualidade técnica.
 */
export function buildFluxFinalPrompt(sceneDescription: string): string {
  return [
    sceneDescription,
    'Shot on 35mm film, anamorphic lens, shallow depth of field, cinematic color grading, photorealistic, 8k, no text, no letters, no words, no typography, no overlay, clean background.',
  ].join(' ')
}