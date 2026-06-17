/**
 * AI-PROVIDER-003 — Rota migrada para usar a camada abstrata de IA.
 *
 * Provedor primário: DeepSeek Flash
 * Fallback automático: OpenAI (via AIClient)
 * Fallback local: correção via regex (mantida da implementação original)
 *
 * Comportamento idêntico ao anterior. Nenhum prompt ou lógica de resposta foi alterado.
 */

import { NextRequest, NextResponse } from 'next/server'

import { getAIProvider } from '@/lib/ai/provider'

type CorrectionResult = {
  correctedText: string
  provider: 'deepseek-flash' | 'deepseek-pro' | 'openai' | 'local'
  changed: boolean
  notes?: string
}

function cleanText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()
}

function localCorrection(text: string) {
  let value = cleanText(text)

  const replacements: [RegExp, string][] = [
    [/\bjesus\b/gi, 'Jesus'],
    [/\bcristo\b/gi, 'Cristo'],
    [/\bdeus\b/gi, 'Deus'],
    [/\bsenhor\b/gi, 'Senhor'],
    [/\bespirito santo\b/gi, 'Espírito Santo'],
    [/\bespirito\b/gi, 'Espírito'],
    [/\bbiblia\b/gi, 'Bíblia'],
    [/\bpalavra de deus\b/gi, 'Palavra de Deus'],
    [/\bnao\b/gi, 'não'],
    [/\bvoce\b/gi, 'você'],
    [/\bagua\b/gi, 'água'],
    [/\bgraca\b/gi, 'graça'],
    [/\bfe\b/gi, 'fé'],
    [/\bcoracao\b/gi, 'coração'],
    [/\boracao\b/gi, 'oração'],
    [/\bprotecao\b/gi, 'proteção'],
    [/\blibertacao\b/gi, 'libertação'],
    [/\bsalvacao\b/gi, 'salvação'],
    [/\bredencao\b/gi, 'redenção'],
    [/\bperdao\b/gi, 'perdão'],
    [/\bpromessa\b/gi, 'promessa'],
    [/\bproposito\b/gi, 'propósito'],
    [/\bpropositos\b/gi, 'propósitos'],
    [/\bso\b/gi, 'só'],
    [/\besta\b/gi, 'está'],
  ]

  replacements.forEach(([regex, replacement]) => {
    value = value.replace(regex, replacement)
  })

  value = value.replace(/\s+([,.!?;:])/g, '$1')
  value = value.replace(/([,.!?;:])([^\s])/g, '$1 $2')

  if (value.length > 0) {
    value = value.charAt(0).toUpperCase() + value.slice(1)
  }

  if (value && !/[.!?…]$/.test(value)) {
    value += '.'
  }

  return value
}

const SYSTEM_PROMPT =
  'Você é um revisor de português brasileiro para frases devocionais cristãs. Corrija apenas gramática, acentuação, pontuação, concordância leve e fluidez. Não mude o sentido espiritual, não aumente a frase, não transforme em sermão, não adicione versículos e não invente conteúdo. Preserve o estilo simples e devocional. Responda somente em JSON válido.'

function buildUserPrompt(text: string) {
  return JSON.stringify({
    instruction:
      'Corrija a frase abaixo para português brasileiro natural, mantendo o mesmo sentido. Retorne JSON com correctedText e notes.',
    text,
    expectedFormat: {
      correctedText: 'frase corrigida',
      notes: 'breve explicação da correção',
    },
  })
}

function validateCorrection(raw: unknown): { correctedText: string; notes: string } {
  const parsed = raw as { correctedText?: string; notes?: string }
  const correctedText = cleanText(String(parsed.correctedText || ''))

  if (!correctedText) {
    throw new Error('A IA retornou uma frase vazia.')
  }

  return {
    correctedText,
    notes: cleanText(String(parsed.notes || '')),
  }
}

async function correctWithAI(text: string): Promise<CorrectionResult> {
  const ai = getAIProvider({
    textProvider: 'deepseek-flash',
    fallbackProvider: 'openai',
  })

  const result = await ai.generateJson({
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(text),
    schema:
      '{\n  "correctedText": "string — frase corrigida",\n  "notes": "string — breve explicação da correção"\n}',
    validate: validateCorrection,
    temperature: 0.1,
    maxTokens: 300,
  })

  return {
    correctedText: result.correctedText,
    provider: ai.activeTextProvider as CorrectionResult['provider'],
    changed: result.correctedText !== text,
    notes: result.notes || undefined,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text = cleanText(String(body.text || ''))

    if (!text) {
      return NextResponse.json(
        { error: 'Envie uma frase para corrigir.' },
        { status: 400 }
      )
    }

    if (text.length < 5) {
      return NextResponse.json(
        { error: 'A frase está muito curta para correção.' },
        { status: 400 }
      )
    }

    if (text.length > 500) {
      return NextResponse.json(
        { error: 'A frase está muito longa. Use até 500 caracteres.' },
        { status: 400 }
      )
    }

    try {
      const result = await correctWithAI(text)

      return NextResponse.json({
        success: true,
        originalText: text,
        correctedText: result.correctedText,
        changed: result.changed,
        provider: result.provider,
        notes: result.notes || null,
      })
    } catch (aiError) {
      console.error(
        'Falha na correção com IA (DeepSeek/OpenAI). Usando correção local:',
        aiError
      )

      const correctedText = localCorrection(text)

      return NextResponse.json({
        success: true,
        originalText: text,
        correctedText,
        changed: correctedText !== text,
        provider: 'local',
        notes: 'A correção com IA falhou. Foi aplicada uma correção local básica.',
      })
    }
  } catch (error) {
    console.error('Erro ao corrigir frase:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao corrigir frase.',
      },
      { status: 500 }
    )
  }
}