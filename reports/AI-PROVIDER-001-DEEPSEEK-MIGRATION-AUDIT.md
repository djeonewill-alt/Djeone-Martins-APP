# AI-PROVIDER-001 — Auditoria de Migração para DeepSeek

**Projeto:** App Djeone Martins / Devocional Diário (Next.js PWA + TypeScript/Node.js)  
**Data:** 16/06/2026  
**Autor:** Arquitetura de Software  
**Propósito:** Diagnóstico completo de uso de IA para planejar migração parcial para DeepSeek (Flash + Pro) com fallback OpenAI e futuro Grok para imagens.  
**Regra:** Somente diagnóstico. Nenhum código funcional foi alterado.

---

## Sumário Executivo

O projeto não utiliza SDK OpenAI oficial — todas as chamadas são `fetch()` direto para `https://api.openai.com`. Existem **8 rotas de IA** com **12 pontos de chamada** distribuídos entre:

| Provedor | Chamadas | Finalidade |
|----------|----------|------------|
| **OpenAI (chat/completions)** | 7 | Texto, JSON estruturado, correção |
| **OpenAI (Whisper/transcriptions)** | 2 | Transcrição de áudio, word timestamps |
| **Cloudflare Workers AI** | 1 | Geração de Palavra do Dia (primário) |
| **Local (sem IA)** | 2 | Sincronia de legendas, expansão de cortes |

**Não existe** `AI_PROVIDER`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` ou qualquer abstração de provedor.

### Pontos-chave

- **DeepSeek não substitui Whisper** — transcrição e word timestamps devem permanecer OpenAI.
- **DeepSeek Flash** recomendado para texto simples (mais barato e rápido).
- **DeepSeek Pro** recomendado para JSON estruturado com validação forte.
- **Fallback OpenAI** deve ser mantido para casos de falha ou baixa confiança.
- Já existe padrão de fallback em `generate-daily-quote` (Cloudflare → OpenAI) que pode ser replicado.

---

## 1. Dependências e Imports

### package.json

| Dependência | Versão | Relacionada a IA? | Observação |
|------------|--------|-------------------|------------|
| `openai` | **ausente** | ❌ | SDK oficial não instalado. Tudo via `fetch()` direto. |
| `@aws-sdk/client-s3` | ^3.1041.0 | ✅ | Usado para salvar words.json no R2 |
| `sharp` | ^0.34.5 | ❌ | Processamento de imagens |
| `ffmpeg-static` | ^5.3.0 | ❌ | Conversão de áudio |
| `lamejs` | ^1.2.1 | ❌ | Codificação MP3 |

### Pontos de chamada OpenAI

| Endpoint | Ocorrências | Arquivos |
|----------|------------|----------|
| `api.openai.com/v1/chat/completions` | 7 | `generate-daily-quote`, `generate-episode-metadata`, `correct-daily-quote`, `generate-content-assets`, `generate-image-prompt` |
| `api.openai.com/v1/audio/transcriptions` | 2 | `transcribe-audio`, `generate-word-timestamps` |
| `api.cloudflare.com/client/v4/accounts/*/ai/run/*` | 1 | `generate-daily-quote` |

---

## 2. Tabela Completa de Chamadas de IA

### Legenda

| Coluna | Significado |
|--------|-------------|
| **Admin?** | Se a rota exige autenticação de admin |
| **Tipo** | Texto, JSON, Áudio, Correção |
| **Modelo** | Modelo configurado ou padrão |
| **Provedor** | OpenAI / Cloudflare / Local |
| **Migrável?** | ✅ Fácil / ⚠️ Com ajustes / ❌ Manter |
| **DeepSeek** | Modelo DeepSeek sugerido |

### Tabela

| # | Arquivo | Rota | Admin? | Tipo | Modelo (resolvido) | Provedor | Migrável? | DeepSeek Sugerido | Observações |
|---|---------|------|--------|------|-------------------|----------|-----------|-------------------|-------------|
| 1 | `app/api/ai/transcribe-audio/route.ts` | POST /api/ai/transcribe-audio | Não | Áudio (transcrição + opcional word timestamps) | `whisper-1` | OpenAI Whisper | ❌ Manter | — | DeepSeek não oferece STT |
| 2 | `app/api/ai/generate-word-timestamps/route.ts` | POST /api/ai/generate-word-timestamps | ✅ Sim | Áudio (word timestamps forçado) | `whisper-1` (forçado) | OpenAI Whisper | ❌ Manter | — | Valida `model !== 'whisper-1'` e lança erro |
| 3 | `app/api/ai/persist-transcription-words/route.ts` | POST /api/ai/persist-transcription-words | ✅ Sim | Local (apenas salva no R2) | N/A | Local | N/A | — | Sem chamada de IA |
| 4 | `app/api/ai/generate-episode-metadata/route.ts` | POST /api/ai/generate-episode-metadata | Não | JSON estruturado (title, description, keywords) | `gpt-4.1` | OpenAI | ✅ Fácil | DeepSeek Pro / Flash | Prompt simples, JSON pequeno |
| 5 | `app/api/ai/generate-daily-quote/route.ts` | POST /api/ai/generate-daily-quote | Não | JSON estruturado (5 sugestões) | `@cf/meta/llama-3.1-8b-instruct` (primário) / `gpt-4o-mini` (fallback) | Cloudflare (primário) / OpenAI (fallback) | ⚠️ Com ajustes | DeepSeek Pro (substituir fallback OpenAI) | Já tem fallback. DeepSeek substituiria OpenAI. |
| 6 | `app/api/ai/correct-daily-quote/route.ts` | POST /api/ai/correct-daily-quote | Não | Correção de frase curta | `gpt-4o-mini` | OpenAI (fallback local) | ✅ Fácil | DeepSeek Flash | Prompt curto, tem fallback local via regex |
| 7 | `app/api/ai/generate-image-prompt/route.ts` | POST /api/ai/generate-image-prompt | ✅ Sim | JSON estruturado (prompt textual para imagem) | `gpt-4o-mini` | OpenAI | ✅ Fácil | DeepSeek Flash | Só gera texto, não imagem |
| 8 | `app/api/ai/generate-content-assets/route.ts` (summary) | POST /api/ai/generate-content-assets?mode=summary | ✅ Sim | Texto simples (resumo devocional) | `gpt-4o-mini` | OpenAI | ✅ Fácil | DeepSeek Flash | Texto corrido, sem estrutura |
| 9 | `app/api/ai/generate-content-assets/route.ts` (phrases) | POST /api/ai/generate-content-assets?mode=phrases | ✅ Sim | JSON estruturado (frases fortes com metadados) | `gpt-4o-mini` | OpenAI | ⚠️ Com ajustes | DeepSeek Pro | Schema médio, validar consistência |
| 10 | `app/api/ai/generate-content-assets/route.ts` (whatsapp/instagram) | POST /api/ai/generate-content-assets?mode=whatsapp\|instagram | ✅ Sim | Texto simples | `gpt-4o-mini` | OpenAI | ✅ Fácil | DeepSeek Flash | Texto corrido |
| 11 | `app/api/ai/generate-content-assets/route.ts` (short_ideas) | POST /api/ai/generate-content-assets?mode=short_ideas | ✅ Sim | JSON estruturado | `gpt-4o-mini` | OpenAI | ⚠️ Com ajustes | DeepSeek Pro | Schema médio |
| 12 | `app/api/ai/generate-content-assets/route.ts` (cuts) | POST /api/ai/generate-content-assets?mode=cuts | ✅ Sim | JSON estruturado (cortes com timestamps) | `gpt-4o-mini` | OpenAI | ⚠️ Com ajustes | DeepSeek Pro | Schema complexo, timestamps precisos |
| 13 | `app/api/ai/generate-content-assets/route.ts` (short_script) | POST /api/ai/generate-content-assets?mode=short_script | ✅ Sim | JSON estruturado (roteiro completo) | `gpt-4o-mini` | OpenAI | ⚠️ Com ajustes | DeepSeek Pro | Schema muito complexo, muitas validações |
| 14 | `app/api/ai/generate-content-assets/route.ts` (best_cuts_ai) | POST /api/ai/generate-content-assets?mode=best_cuts_ai | ✅ Sim | JSON estruturado (cortes editoriais com scores) | `gpt-4o-mini` | OpenAI | ⚠️ Com ajustes | DeepSeek Pro | Schema complexo com ~30 campos por corte |
| 15 | `app/api/ai/generate-content-assets/route.ts` (visual_storyboard) | POST /api/ai/generate-content-assets?mode=visual_storyboard | ✅ Sim | JSON estruturado (storyboard) | `gpt-4o-mini` | OpenAI | ⚠️ Com ajustes | DeepSeek Pro | Schema complexo, multi-nível |
| 16 | `app/api/ai/generate-content-assets/route.ts` (caption_ai_review) | POST /api/ai/generate-content-assets?mode=caption_ai_review | ✅ Sim | Refinamento textual | `gpt-4o-mini` | OpenAI | ✅ Fácil | DeepSeek Flash | Prompt curto, refinamento |
| 17 | `app/api/ai/generate-content-assets/route.ts` (caption_sync) | POST /api/ai/generate-content-assets?mode=caption_sync | ✅ Sim | Local (algoritmo próprio) | N/A | Local | N/A | — | Sem IA |
| 18 | `app/api/ai/generate-content-assets/route.ts` (expand_cut) | POST /api/ai/generate-content-assets?mode=expand_cut | ✅ Sim | Local (janela de segmentos) | N/A | Local | N/A | — | Sem IA |

**Total de chamadas com IA:** 14 (contando modos separados do megamodo)  
**Total de chamadas sem IA:** 4 (persist, caption_sync, expand_cut + correct-daily-quote fallback local)

---

## 3. Classificação por Tipo

### A. Texto simples (5 chamadas)
| Sub-rota | Caráter | Prioridade Migração |
|----------|---------|---------------------|
| summary | Resumo devocional em parágrafos | 🥇 1º |
| whatsapp | Texto pastoral para WhatsApp | 🥇 1º |
| instagram | Legenda + hashtags | 🥇 1º |
| episode-metadata | Título + descrição | 🥇 1º |
| correct-daily-quote | Correção gramatical | 🥇 1º |

### B. JSON estruturado (8 chamadas)
| Sub-rota | Complexidade do Schema | Risco de Migração |
|----------|----------------------|-------------------|
| generate-daily-quote (5 sugestões) | Médio (7 campos/item) | ⚠️ Médio |
| content-assets (phrases) | Médio (5 campos/item) | ⚠️ Médio |
| content-assets (short_ideas) | Baixo (3-5 campos) | ✅ Baixo |
| content-assets (cuts) | Alto (timestamps precisos) | 🔴 Alto |
| content-assets (short_script) | Muito alto (~20 campos aninhados) | 🔴 Alto |
| content-assets (best_cuts_ai) | Muito alto (~30 campos + scores) | 🔴 Alto |
| content-assets (visual_storyboard) | Muito alto (múltiplos níveis) | 🔴 Alto |
| generate-image-prompt | Alto (~15 campos dentro de objetos) | ⚠️ Médio |

### C. Transcrição / Áudio (2 chamadas)
| Sub-rota | Dependência | Decisão |
|----------|------------|---------|
| transcribe-audio | OpenAI Whisper | ❌ Manter |
| generate-word-timestamps | OpenAI Whisper (`whisper-1` forçado) | ❌ Manter |

### D. Correção / Refinamento (2 chamadas)
| Sub-rota | Tipo | Prioridade |
|----------|------|------------|
| correct-daily-quote | Correção gramatical curta | 🥇 1º |
| caption_ai_review | Revisão de legendas | 🥇 1º |

---

## 4. Avaliação Detalhada de Migração para DeepSeek

### 4.1. DeepSeek Flash vs DeepSeek Pro

| Aspecto | DeepSeek Flash | DeepSeek Pro |
|---------|----------------|--------------|
| Custo | Muito baixo | Baixo |
| Velocidade | Rápido | Moderado |
| Qualidade JSON | Boa para schemas simples | Excelente para schemas complexos |
| Recomendado para | Texto simples, correções, prompts curtos | JSON estruturado, best_cuts_ai, storyboard |
| Fallback recomendado | OpenAI GPT-4o-mini | OpenAI GPT-4.1 |

### 4.2. Matriz de Migração

| # | Uso | DeepSeek Flash | DeepSeek Pro | OpenAI (manter) | Ajustes Necessários |
|---|-----|---------------|-------------|-----------------|---------------------|
| 1 | `transcribe-audio` | ❌ | ❌ | ✅ Whisper-1 | Nenhum |
| 2 | `generate-word-timestamps` | ❌ | ❌ | ✅ Whisper-1 | Nenhum |
| 3 | `generate-episode-metadata` | ✅ Primário | — | ✅ Fallback | Trocar endpoint, remover `response_format: json_object`, extrair JSON manualmente |
| 4 | `generate-daily-quote` (fallback) | — | ✅ Primário (fallback) | ✅ Fallback (manter) | Trocar endpoint, validar JSON com `validateSuggestions()` |
| 5 | `correct-daily-quote` | ✅ Primário | — | ✅ Fallback | Prompt curto, extrair `correctedText` do JSON |
| 6 | `generate-image-prompt` | ✅ Primário | — | ✅ Fallback | Prompt longo (142 linhas), testar qualidade |
| 7 | `generate-content-assets` (texto) | ✅ Primário | — | ✅ Fallback | Trocar endpoint, sem `response_format` |
| 8 | `generate-content-assets` (JSON) | — | ✅ Primário | ✅ Fallback | Schema validation forte, retry em falha |
| 9 | `generate-content-assets` (best_cuts_ai) | — | ✅ Primário | ✅ Fallback | **Schema mais complexo do projeto** |
| 10 | `generate-content-assets` (visual_storyboard) | — | ✅ Primário | ✅ Fallback | Schema multi-nível |
| 11 | `generate-content-assets` (caption_ai_review) | ✅ Primário | — | ✅ Fallback | Prompt curto |
| 12 | `generate-content-assets` (cuts) | — | ✅ Primário | ✅ Fallback | Timestamps precisos, validar |

### 4.3. Ajustes Técnicos Necessários

#### 4.3.1. `response_format: { type: "json_object" }`

**Problema:** DeepSeek não suporta este parâmetro da API OpenAI.  
**Solução:** O projeto já possui `extractJsonFromText()` que faz regex `/\{[\s\S]*\}/` para extrair JSON de texto. Esta função precisará ser usada em todas as chamadas DeepSeek.

**Arquivos afetados:**
- `generate-episode-metadata/route.ts` (linha 187-189)
- `generate-content-assets/route.ts` (linhas 2997-2999, 3285-3287, 3464-3466)
- `generate-image-prompt/route.ts` (linha 429)

#### 4.3.2. Temperatura

DeepSeek pode exigir temperatura diferente. Atualmente o projeto usa:
- `0.45` para generate-daily-quote e generate-episode-metadata
- `0.5` para generate-image-prompt
- `0.55` para generate-content-assets
- `0.35` para visual_storyboard
- `0.25` para best_cuts_ai
- `0.2` para caption_ai_review
- `0.1` para correct-daily-quote

**Recomendação:** Manter os mesmos valores inicialmente, ajustar se necessário.

#### 4.3.3. System Prompt

DeepSeek pode exigir system prompts mais explícitos para seguir formato JSON.  
**Ação:** Adicionar "Responda APENAS em JSON válido, sem texto adicional." nos system prompts.

---

## 5. Variáveis de Ambiente

### Existentes (relacionadas a IA)

| Nome | Padrão | Onde é Usado | Será Substituído? |
|------|--------|-------------|-------------------|
| `OPENAI_API_KEY` | — | Todas as rotas OpenAI | Será mantido para fallback |
| `OPENAI_MODEL` | `gpt-4o-mini` | Várias (fallback genérico) | Mantido para fallback |
| `OPENAI_DAILY_QUOTE_MODEL` | `gpt-4o-mini` | generate-daily-quote | Mantido |
| `OPENAI_EPISODE_METADATA_MODEL` | `gpt-4.1` | generate-episode-metadata | Mantido |
| `OPENAI_CONTENT_ASSETS_MODEL` | `gpt-4o-mini` | content-assets, image-prompt | Mantido |
| `OPENAI_CORRECTION_MODEL` | `gpt-4o-mini` | correct-daily-quote | Mantido |
| `OPENAI_TRANSCRIPTION_MODEL` | `whisper-1` | generate-word-timestamps | Mantido |
| `OPENAI_TRANSCRIBE_TIMESTAMPS_MODEL` | `whisper-1` | transcribe-audio | Mantido |
| `OPENAI_RESPONSE_STRONG_MODEL` | `gpt-4o-mini` | best_cuts_ai, visual_storyboard | Mantido |
| `OPENAI_RESPONSE_MODEL` | — | content-assets (fallback) | Mantido |
| `CLOUDFLARE_ACCOUNT_ID` | — | generate-daily-quote | Mantido |
| `CLOUDFLARE_API_TOKEN` | — | generate-daily-quote | Mantido |
| `CLOUDFLARE_TEXT_MODEL` | `@cf/meta/llama-3.1-8b-instruct` | generate-daily-quote | Mantido |

### Novas variáveis propostas (para AI-PROVIDER-002)

| Nome | Valores Possíveis | Padrão | Função |
|------|------------------|--------|--------|
| `AI_TEXT_PROVIDER` | `deepseek-flash` / `deepseek-pro` / `openai` / `cloudflare` | `openai` | Provedor primário para texto/JSON |
| `AI_TRANSCRIPTION_PROVIDER` | `openai` / `whisper` | `openai` | Provedor para transcrição (sempre OpenAI por enquanto) |
| `AI_IMAGE_PROVIDER` | `openai` / (futuro: `grok`) | `openai` | Provedor para prompts de imagem (só texto) |
| `DEEPSEEK_API_KEY` | — | — | Chave da API DeepSeek |
| `DEEPSEEK_FLASH_MODEL` | `deepseek-chat` (Flash) | `deepseek-chat` | Modelo Flash |
| `DEEPSEEK_PRO_MODEL` | `deepseek-reasoner` (Pro/R1) | `deepseek-reasoner` | Modelo Pro |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com/v1` | `https://api.deepseek.com/v1` | URL base |
| `AI_FALLBACK_MODE` | `openai` / `cloudflare` / `none` | `openai` | Fallback quando provedor primário falha |
| `AI_LOG_COSTS` | `true` / `false` | `false` | Log de custo por chamada |

---

## 6. Prompts Importantes

| # | Arquivo | Linhas | Objetivo | Tamanho | JSON? | Tom Pastoral? | Crítico? |
|---|---------|--------|----------|---------|-------|---------------|----------|
| P1 | `app/api/ai/transcribe-audio/route.ts` | 225-228 | Prompt do Whisper para transcrição | 1 linha | ❌ | Sim | 🟢 Médio |
| P2 | `app/api/ai/generate-word-timestamps/route.ts` | 194-197 | Prompt do Whisper para word timestamps | 1 linha | ❌ | Sim | 🟢 Médio |
| P3 | `app/api/ai/generate-daily-quote/route.ts` | 288-431 | **System + User: gerar 5 sugestões de Palavra do Dia** | ~144 linhas | ✅ Sim | ✅ Forte | 🔴 Crítico |
| P4 | `app/api/ai/generate-episode-metadata/route.ts` | 71-126 | **System + User: título, descrição, keywords** | ~56 linhas | ✅ Sim | ✅ Sim | 🟡 Moderado |
| P5 | `app/api/ai/correct-daily-quote/route.ts` | 109-124 | **System + User: corrigir gramática** | ~16 linhas | ✅ Sim | Sim | 🟢 Leve |
| P6 | `app/api/ai/generate-content-assets/route.ts` | 4339-4566 | **System + User: gerar todos os assets (megamodo)** | ~228 linhas | ✅ Sim | ✅ Forte | 🔴 Crítico |
| P7 | `app/api/ai/generate-content-assets/route.ts` | 2824-2961 | **User: best_cuts_ai — selecionar melhores cortes** | ~138 linhas | ✅ Sim | ✅ Forte | 🔴 Crítico |
| P8 | `app/api/ai/generate-content-assets/route.ts` | 3160-3253 | **User: visual_storyboard — storyboard visual** | ~94 linhas | ✅ Sim | ✅ Sim | 🟡 Moderado |
| P9 | `app/api/ai/generate-content-assets/route.ts` | 2748-2821 | **User: caption_ai_review — revisar legendas** | ~74 linhas | ✅ Sim | Sim | 🟢 Leve |
| P10 | `app/api/ai/generate-image-prompt/route.ts` | 211-352 | **System + User: prompt de imagem cinematográfica** | ~142 linhas | ✅ Sim | ✅ Sim (diretor de arte bíblico) | 🔴 Crítico |

### Descrição dos prompts críticos

- **P3 (generate-daily-quote):** Editor devocional cristão brasileiro. Extrai 5 frases fortes da transcrição com critérios editoriais rigorosos (especificidade, fonte real, nota 8-10, 8-28 palavras, sem genéricos). Retorna JSON com `suggestions[]` contendo `quote_text`, `reason`, `score`, `source_excerpt`, `use_case`, `specificity_reason`.

- **P6 (content-assets — megamodo):** Especialista em transformar transcrições em conteúdos para WhatsApp, Instagram, cards e Shorts. Gera summary, phrases, whatsapp_text, instagram_caption, hashtags, short_ideas, cut_suggestions. Regras detalhadas de especificidade bíblica, contraste espiritual, exemplos bons/ruins. Retorna JSON dentro de `{ assets: { ... } }`.

- **P7 (best_cuts_ai):** Editor de Shorts/Reels/TikTok para conteúdo devocional bíblico. Escolhe melhores cortes (15-90s) avaliando hook, clareza bíblica, tensão espiritual, imagem visual, retenção, fidelidade, CTA. Retorna JSON com `cuts[]` contendo ~30 campos por corte incluindo timestamps, scores e metadados editoriais.

- **P10 (generate-image-prompt):** Diretor de arte cinematográfico bíblico premium. Gera diagnóstico de cena, tema visual, prompt de fundo, prompt completo com texto, texto sobreposto e negative prompt. Regras específicas para cenas bíblicas (Betânia, naufrágio, entrada triunfal, grão de trigo). Retorna JSON com ~20 campos.

---

## 7. Proposta de Arquitetura Futura

### 7.1. `lib/ai/client.ts` — Wrapper Abstrato

```typescript
// lib/ai/client.ts
// Provider-agnostic AI client

export type TextProvider = 'deepseek-flash' | 'deepseek-pro' | 'openai' | 'cloudflare'
export type TranscriptionProvider = 'openai' | 'whisper'

export interface AIClientConfig {
  textProvider: TextProvider
  transcriptionProvider: TranscriptionProvider
  fallbackProvider: TextProvider
  logCosts: boolean
}

export interface GenerateTextParams {
  system: string
  prompt: string
  temperature?: number
  maxTokens?: number
}

export interface GenerateJsonParams<T> {
  system: string
  prompt: string
  schema: string       // descrição textual do JSON esperado
  validate: (raw: unknown) => T   // função de validação
  temperature?: number
  maxRetries?: number
}

export interface TranscribeAudioParams {
  audioUrl: string
  language: string
  wordTimestamps?: boolean
}

export interface TranscriptionResult {
  text: string
  segments: Array<{ start: number; end: number; text: string }>
  words?: Array<{ word: string; start: number; end: number }>
  provider: string
  model: string
}

export class AIClient {
  constructor(config: AIClientConfig) { /* ... */ }

  async generateText(params: GenerateTextParams): Promise<string> {
    const provider = this.getTextProvider()
    // Tenta provider primário, fallback se falhar
  }

  async generateJson<T>(params: GenerateJsonParams<T>): Promise<T> {
    const provider = this.getTextProvider()
    // Tenta provider primário com retry
    // Se falhar, tenta fallback
    // Valida com params.validate()
  }

  async transcribeAudio(params: TranscribeAudioParams): Promise<TranscriptionResult> {
    // Sempre OpenAI Whisper (ou outro STT no futuro)
  }

  private async callDeepSeek(params: {
    model: string  // 'deepseek-chat' | 'deepseek-reasoner'
    messages: Array<{ role: string; content: string }>
    temperature?: number
  }): Promise<string> {
    const response = await fetch(`${process.env.DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.5,
      }),
    })
    const data = await response.json()
    return data.choices[0].message.content
  }

  private async callOpenAI(params: {
    model: string
    messages: Array<{ role: string; content: string }>
    temperature?: number
    responseFormat?: 'json_object'
  }): Promise<string> {
    // Implementação existente (mantida para fallback)
  }
}
```

### 7.2. Provedores Separados por Função

```
AI_TEXT_PROVIDER=deepseek-flash     # texto simples
AI_JSON_PROVIDER=deepseek-pro       # JSON estruturado
AI_TRANSCRIPTION_PROVIDER=openai     # áudio (sempre OpenAI)
AI_FALLBACK_PROVIDER=openai          # fallback geral
```

### 7.3. Estratégia de Fallback em Camadas

```
1. Tenta DeepSeek Flash (texto) / DeepSeek Pro (JSON)
2. Se falhar → tenta OpenAI (GPT-4o-mini ou GPT-4.1)
3. Se falhar → fallback local (quando existir, ex: correct-daily-quote)
4. Log de erro + custo
```

### 7.4. Futuro: Grok para Imagens

Quando o projeto precisar gerar imagens de fato (não apenas prompts), avaliar:
- **Grok (xAI)** para geração de imagens bíblicas/devocionais
- **OpenAI DALL-E 3** como fallback
- Nova env var: `AI_IMAGE_GENERATION_PROVIDER=grok|openai`

---

## 8. Plano de Migração em Etapas

| Patch | Nome | Descrição | Riscos | Dependências |
|-------|------|-----------|--------|-------------|
| **AI-PROVIDER-002** | Criar `lib/ai/client.ts` | Wrapper abstrato com `AIClient` class. Implementar `DeepSeekProvider` e `OpenAIProvider`. Adicionar env vars. **Sem trocar comportamento.** | Nenhum (só adiciona código) | Nenhuma |
| **AI-PROVIDER-003** | Migrar texto simples | `generate-episode-metadata`, `correct-daily-quote`, textos do `generate-content-assets` para DeepSeek Flash. Modo opcional via env var. | Baixo — textos curtos, fallback OpenAI | AI-PROVIDER-002 |
| **AI-PROVIDER-004** | Migrar JSON estruturado | `generate-daily-quote`, `generate-content-assets` (JSON), `generate-image-prompt` para DeepSeek Pro. Validar com `validateSuggestions()` e `validateAssets()`. | Médio — consistência JSON, qualidade pastoral | AI-PROVIDER-002 |
| **AI-PROVIDER-005** | Avaliar transcrição separadamente | Manter OpenAI Whisper. Se aparecer necessidade de trocar, avaliar Google STT, Azure Speech ou AssemblyAI. | Baixo — apenas manter | Nenhuma |
| **AI-PROVIDER-006** | Logs de custo e erro | Adicionar `AI_LOG_COSTS=true`. Logar modelo, provedor, tokens, custo estimado e sucesso/erro por chamada. | Baixo | AI-PROVIDER-002 |
| **AI-PROVIDER-007** | Modo hard: DeepSeek-only | Forçar DeepSeek como único provedor, sem fallback OpenAI (para ambientes de teste/economia máxima). | Alto — requer testes exaustivos | AI-PROVIDER-003, 004 |

### Ordem Recomendada

```
AI-PROVIDER-002 → AI-PROVIDER-003 → AI-PROVIDER-004 → AI-PROVIDER-006 → AI-PROVIDER-005 → AI-PROVIDER-007 (opcional)
```

---

## 9. Riscos de Migração

### 🔴 Alto

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| DeepSeek não segue schema JSON complexo (best_cuts_ai, short_script) | Retrabalho, retries, inconsistência | Validação forte com `validateAssets()`, fallback automático OpenAI |
| Perda de qualidade pastoral em português devocional | Conteúdo genérico, sem profundidade | Testar com amostra real de 10+ episódios antes de migrar |
| `response_format: json_object` não suportado | Quebra em 4 rotas que usam este recurso | Usar `extractJsonFromText()` + validação |

### 🟡 Médio

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| DeepSeek pode ser mais lento que GPT-4o-mini | UX pior para admin gerando conteúdo | Usar DeepSeek Flash para texto, Pro só para JSON |
| Custo menor, mas mais retries | Economia parcialmente anulada | Monitorar taxa de erro vs economia |
| Prompts de 144-228 linhas podem exceder contexto | Truncamento ou perda de qualidade | Verificar limites de tokens do DeepSeek |

### 🟢 Baixo

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Mudança de temperatura | Resultados diferentes | Manter mesmas temps inicialmente |
| Fallback local (correct-daily-quote) continua funcionando | Sem impacto | Já testado |

---

## 10. Recomendações Finais

### O que migrar primeiro (AI-PROVIDER-003 — texto simples)

| Ordem | Rota | Modelo DeepSeek | Justificativa |
|-------|------|-----------------|---------------|
| 1º | `correct-daily-quote` | Flash | Prompt curto, já tem fallback local, baixo risco |
| 2º | `generate-episode-metadata` | Flash | JSON simples, validação existente |
| 3º | `generate-content-assets` (summary) | Flash | Texto corrido, sem schema |
| 4º | `generate-content-assets` (whatsapp/instagram) | Flash | Texto corrido |
| 5º | `generate-content-assets` (caption_ai_review) | Flash | Refinamento leve |
| 6º | `generate-image-prompt` | Flash | Só gera texto, não imagem |

### O que migrar depois (AI-PROVIDER-004 — JSON estruturado)

| Ordem | Rota | Modelo DeepSeek | Justificativa |
|-------|------|-----------------|---------------|
| 7º | `generate-daily-quote` (fallback) | Pro | Já tem Cloudflare como primário |
| 8º | `generate-content-assets` (phrases) | Pro | Schema médio |
| 9º | `generate-content-assets` (short_ideas) | Pro | Schema simples |
| 10º | `generate-content-assets` (cuts) | Pro | Schema complexo, testar bastante |
| 11º | `generate-content-assets` (short_script) | Pro | Schema muito complexo |
| 12º | `generate-content-assets` (visual_storyboard) | Pro | Schema complexo |
| 13º | `generate-content-assets` (best_cuts_ai) | Pro | **Último** — schema mais complexo |

### O que NÃO migrar

| Rota | Motivo | Ação |
|------|--------|------|
| `transcribe-audio` | DeepSeek não tem STT | Manter OpenAI Whisper |
| `generate-word-timestamps` | `whisper-1` forçado para word timestamps | Manter OpenAI Whisper |
| `generate-daily-quote` (Cloudflare primário) | Já usa Cloudflare, não OpenAI | Manter Cloudflare como primário |

---

## 11. Contagem Final

| Métrica | Valor |
|---------|-------|
| **Rotas de IA encontradas** | **8** |
| **Chamadas de IA individuais** | **14** (7 OpenAI chat + 2 OpenAI Whisper + 1 Cloudflare + 4 modos do megamodo) |
| **Chamadas sem IA** | **4** (persist-words, caption_sync, expand_cut, correct local fallback) |
| **Fáceis de migrar para DeepSeek** | **6** (texto simples) |
| **Migráveis com validação** | **7** (JSON estruturado) |
| **Manter OpenAI** | **2** (Whisper/transcrição) |
| **Já usa Cloudflare** | **1** (generate-daily-quote, manter) |

### Chamadas mais fáceis de migrar primeiro

1. **`correct-daily-quote`** — ✅ Prompt curto, fallback local, baixíssimo risco
2. **`generate-episode-metadata`** — ✅ JSON simples, validação existente
3. **`generate-content-assets` (summary/whatsapp/instagram)** — ✅ Texto corrido, sem schema
4. **`generate-content-assets` (caption_ai_review)** — ✅ Refinamento textual
5. **`generate-image-prompt`** — ✅ Só gera prompt textual

### Chamadas que devem ficar com OpenAI

1. **`transcribe-audio`** — ❌ Depende de Whisper (STT)
2. **`generate-word-timestamps`** — ❌ Depende de `whisper-1` forçado

---

## 12. Próximo Patch Sugerido

**AI-PROVIDER-002:** Criar `lib/ai/client.ts`

Escopo:
- Classe `AIClient` com métodos `generateText()`, `generateJson()`, `transcribeAudio()`
- Implementação `DeepSeekProvider` (Flash e Pro)
- Implementação `OpenAIProvider` (mantida para fallback)
- Config via env vars: `AI_TEXT_PROVIDER`, `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, etc.
- Sem alterar nenhuma rota existente
- Sem trocar comportamento — apenas adicionar infraestrutura