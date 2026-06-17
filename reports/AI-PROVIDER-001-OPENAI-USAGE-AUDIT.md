# AI-PROVIDER-001 — Auditoria de Uso da API OpenAI/ChatGPT no Projeto

**Projeto:** App Djeone Martins / Devocional Diário  
**Data:** 16/06/2026  
**Autor:** Auditoria de Código  
**Propósito:** Mapear todo uso de IA para avaliar troca parcial/total para DeepSeek ou outro provedor.  
**Regra:** Este patch é SOMENTE diagnóstico. Nenhum código funcional foi alterado.

---

## Sumário Executivo

O projeto **não utiliza SDK OpenAI** (`npm openai`). Todas as chamadas são feitas via `fetch()` direto para `https://api.openai.com`. O projeto já possui uma implementação de **provedor dual** (Cloudflare Workers AI + OpenAI) para a rota de geração de Palavra do Dia (`generate-daily-quote`), mas **não existe variável de ambiente `AI_PROVIDER`** para troca genérica de provedor.

Foram encontradas **8 rotas de API de IA** com **10 pontos de chamada distintos** (contando chamadas OpenAI e Cloudflare separadamente).

**Total de chamadas OpenAI identificadas:** 7 rotas + 1 fallback  
**Total de chamadas Cloudflare Workers AI:** 1 rota (primária)  
**Total de chamadas puramente locais (sem IA):** 1 rota + 2 funções

---

## 1. Dependências e Imports

### package.json

| Dependência | Relacionada a IA? | Observação |
|------------|-------------------|------------|
| `openai` | ❌ | **Não encontrado.** Nenhum SDK OpenAI instalado. |
| `@aws-sdk/client-s3` | ✅ | Usado para salvar words.json no R2 (pós-transcrição). |
| `sharp` | ❌ | Processamento de imagem, não IA. |
| `ffmpeg-static` | ❌ | Conversão de áudio, não IA. |
| `lamejs` | ❌ | Codificação MP3, não IA. |

### Tipo de chamada IA no código

Todas as chamadas OpenAI usam `fetch()` diretamente para:
- `https://api.openai.com/v1/chat/completions` (texto/JSON)
- `https://api.openai.com/v1/audio/transcriptions` (áudio)

Nenhuma chamada para:
- `https://api.openai.com/v1/responses` (nova API)
- `https://api.openai.com/v1/images/generations` (DALL-E)

---

## 2. Tabela de Todas as Rotas/Chamadas de IA

| # | Área | Arquivo | Rota | Método | Tipo IA | Modelo | Provedor | Entrada | Saída | Admin? | Salva BD? | Salva R2? |
|---|------|---------|------|--------|---------|--------|----------|---------|-------|--------|-----------|-----------|
| 1 | Transcrição | `app/api/ai/transcribe-audio/route.ts` | POST /api/ai/transcribe-audio | POST | Transcrição c/ ou s/ word timestamps | `whisper-1` (ou OPENAI_TRANSCRIBE_TIMESTAMPS_MODEL) | OpenAI | audioUrl, advanced, episodeId, episodeTitle | texto, segmentos, words.json | Não (público via frontend) | Não direto | ✅ (words.json no R2) |
| 2 | Word Timestamps | `app/api/ai/generate-word-timestamps/route.ts` | POST /api/ai/generate-word-timestamps | POST | Transcrição c/ word timestamps | **forçado `whisper-1`** | OpenAI | episodeId (busca audio_url do BD) | words.json no R2 | ✅ Sim | ✅ (transcription_words_*) | ✅ (words.json no R2) |
| 3 | Persistir Words | `app/api/ai/persist-transcription-words/route.ts` | POST /api/ai/persist-transcription-words | POST | **Nenhuma** (apenas salva) | N/A | N/A (local) | episodeId, words | words.json no R2 | ✅ Sim | ✅ (transcription_words_*) | ✅ (words.json no R2) |
| 4 | Episódio Metadata | `app/api/ai/generate-episode-metadata/route.ts` | POST /api/ai/generate-episode-metadata | POST | JSON estruturado | `gpt-4.1` (via OPENAI_EPISODE_METADATA_MODEL) | OpenAI | transcriptionText, bibleReference, currentTitle | {title, description, theme_keywords} | Não (público) | Não | ❌ |
| 5 | Palavra do Dia | `app/api/ai/generate-daily-quote/route.ts` | POST /api/ai/generate-daily-quote | POST | JSON estruturado (5 sugestões) | `@cf/meta/llama-3.1-8b-instruct` (primário) / `gpt-4o-mini` (fallback) | **Cloudflare Workers AI** (primário) / **OpenAI** (fallback) | transcriptionText, title, bibleReference | {suggestions: DailyQuoteSuggestion[]} | Não (público) | Não | ❌ |
| 6 | Correção de Frase | `app/api/ai/correct-daily-quote/route.ts` | POST /api/ai/correct-daily-quote | POST | Correção/refinamento | `gpt-4o-mini` (ou OPENAI_CORRECTION_MODEL) | OpenAI (com fallback **local**) | text (frase curta até 500 chars) | {correctedText, changed, notes} | Não (público) | Não | ❌ |
| 7 | Content Assets | `app/api/ai/generate-content-assets/route.ts` | POST /api/ai/generate-content-assets | POST | JSON estruturado + texto | `gpt-4o-mini` (via OPENAI_CONTENT_ASSETS_MODEL) | OpenAI | transcriptionText, segments, mode, selectedCut | {summary, phrases, whatsapp, instagram, short_ideas, cuts, etc.} | ✅ Sim | Não | ❌ |
| 8 | Best Cuts AI | `app/api/ai/generate-content-assets/route.ts` | POST /api/ai/generate-content-assets?mode=best_cuts_ai | POST | JSON estruturado | `gpt-4o-mini` (via OPENAI_RESPONSE_STRONG_MODEL) | OpenAI | transcription, segments, dailyQuoteSuggestions | BestAiCutsResult (cuts analisados) | ✅ Sim | Não | ❌ |
| 9 | Caption AI Review | `app/api/ai/generate-content-assets/route.ts` | POST /api/ai/generate-content-assets?mode=caption_ai_review | POST | Refinamento de legenda | `gpt-4o-mini` | OpenAI | syncedCaptions, transcription | ReviewedCaptions (legendas revisadas) | ✅ Sim | Não | ❌ |
| 10 | Visual Storyboard | `app/api/ai/generate-content-assets/route.ts` | POST /api/ai/generate-content-assets?mode=visual_storyboard | POST | JSON estruturado | `gpt-4o-mini` | OpenAI | selectedCut, shortScript, finalCaptions | VisualStoryboard (storyboard textual) | ✅ Sim | Não | ❌ |
| 11 | Image Prompt | `app/api/ai/generate-image-prompt/route.ts` | POST /api/ai/generate-image-prompt | POST | JSON estruturado (prompt para imagem) | `gpt-4o-mini` (via OPENAI_CONTENT_ASSETS_MODEL) | OpenAI | title, bibleReference, description, selectedQuote, sourceExcerpt | ImagePromptResponse (prompts para gerar capa) | ✅ Sim | Não | ❌ |
| 12 | Caption Sync | `app/api/ai/generate-content-assets/route.ts` | POST /api/ai/generate-content-assets?mode=caption_sync | POST | **Local** (algoritmo próprio) | N/A | N/A (local) | episodeId, selectedCut | SyncedCaptions (SRT, legendas) | ✅ Sim | Não | ❌ |

### Observações importantes

- A rota `generate-content-assets` é um **megaroute** (4875 linhas) que agrega 7 modos diferentes, dos quais 4 chamam OpenAI, 1 chama Cloudflare Workers AI (integrado ao generate-daily-quote, não diretamente), 1 é local (caption_sync) e 1 é semi-local (expand_cut).
- A rota `correct-daily-quote` tem **fallback local** (correção via regex) quando OpenAI falha.
- A rota `generate-daily-quote` tem **Cloudflare Workers AI como provedor primário** e OpenAI como fallback.
- O modo `expand_cut` é puramente local (algoritmo de janela de segmentos).
- Nenhuma rota usa `response_format: { type: "json_object" }` exceto: generate-episode-metadata, generate-content-assets, generate-image-prompt e best_cuts_ai.

---

## 3. Classificação por Tipo de Uso

### A. Texto simples
| Rota | Descrição | Provedor |
|------|-----------|----------|
| `generate-content-assets` (summary) | Resumo devocional | OpenAI |
| `generate-content-assets` (whatsapp) | Texto para WhatsApp | OpenAI |
| `generate-content-assets` (instagram) | Legenda para Instagram | OpenAI |
| `generate-episode-metadata` | Título + descrição do episódio | OpenAI |
| `correct-daily-quote` | Correção gramatical de frase curta | OpenAI / Local |

**Total:** 5 usos de texto simples

### B. JSON estruturado
| Rota | Descrição | Provedor |
|------|-----------|----------|
| `generate-daily-quote` | 5 sugestões de Palavra do Dia (JSON) | Cloudflare (primário) / OpenAI (fallback) |
| `generate-content-assets` (phrases) | Frases fortes com metadados | OpenAI |
| `generate-content-assets` (short_ideas) | Ideias de Shorts com hook/ângulo | OpenAI |
| `generate-content-assets` (cuts) | Sugestões de cortes com timestamps | OpenAI |
| `generate-content-assets` (short_script) | Roteiro completo de Short | OpenAI |
| `generate-content-assets` (best_cuts_ai) | Cortes editoriais com scores | OpenAI |
| `generate-content-assets` (visual_storyboard) | Storyboard visual para Short | OpenAI |
| `generate-image-prompt` | Prompt de imagem + diagnóstico | OpenAI |

**Total:** 8 usos de JSON estruturado

### C. Transcrição / Áudio
| Rota | Descrição | Provedor |
|------|-----------|----------|
| `transcribe-audio` | Transcrever áudio (c/ ou s/ word timestamps) | OpenAI Whisper |
| `generate-word-timestamps` | Word timestamps forçado (somente whisper-1) | OpenAI Whisper |

**Total:** 2 usos de transcrição/áudio

### D. Correção / Refinamento
| Rota | Descrição | Provedor |
|------|-----------|----------|
| `correct-daily-quote` | Correção gramatical de frase | OpenAI / Local |
| `generate-content-assets` (caption_ai_review) | Revisão de legendas sincronizadas | OpenAI |

**Total:** 2 usos de correção/refinamento

### E. Outro
| Rota | Descrição | Provedor |
|------|-----------|----------|
| `persist-transcription-words` | Apenas salva words.json no R2 | Nenhum (local) |
| `generate-content-assets` (caption_sync) | Algoritmo local de sincronia de legendas | Nenhum (local) |
| `generate-content-assets` (expand_cut) | Expansão local de cortes via janela de segmentos | Nenhum (local) |

**Nota:** `generate-image-prompt` gera prompt textual para imagem, não gera a imagem em si (não chama DALL-E).

---

## 4. Avaliação de Possibilidade de Troca para DeepSeek

| # | Rota | Tipo | Pode Migrar? | Dificuldade | Observação |
|---|------|------|-------------|-------------|------------|
| 1 | `transcribe-audio` | Transcrição áudio | ❌ **Manter OpenAI** | Alta | DeepSeek não tem API de transcrição de áudio equivalente ao Whisper. |
| 2 | `generate-word-timestamps` | Transcrição + word timestamps | ❌ **Manter OpenAI** | Alta | Exige whisper-1 forçado para word timestamps. DeepSeek não oferece equivalente. |
| 3 | `generate-episode-metadata` | Texto + JSON | ✅ **Fácil** | Baixa | Apenas texto/JSON. Migrável para DeepSeek via chat completions. |
| 4 | `generate-daily-quote` | JSON estruturado | ⚠️ **Migrável com ajustes** | Média | Já usa Cloudflare como primário. DeepSeek substituiria OpenAI fallback. Validar qualidade. |
| 5 | `correct-daily-quote` | Correção de frase | ✅ **Fácil** | Baixa | Prompt curto, correção leve. Migrável. |
| 6 | `generate-content-assets` (textos) | Texto simples | ✅ **Fácil** | Baixa | Summary, WhatsApp, Instagram. Migrável. |
| 7 | `generate-content-assets` (JSON) | JSON estruturado | ⚠️ **Migrável com validação** | Média | Exige validação forte de JSON e schema. DeepSeek pode ser menos consistente. |
| 8 | `generate-content-assets` (best_cuts_ai) | JSON complexo | ⚠️ **Migrável com validação** | Média | Schema muito específico. Validar consistência. |
| 9 | `generate-content-assets` (caption_ai_review) | Refinamento | ✅ **Fácil** | Baixa | Prompt curto, refinamento textual. |
| 10 | `generate-content-assets` (visual_storyboard) | JSON estruturado | ⚠️ **Migrável com validação** | Média | Schema complexo com múltiplos níveis. |
| 11 | `generate-image-prompt` | JSON + texto | ✅ **Fácil** | Baixa | Só gera prompt textual para imagem, não gera imagem. |

**Resumo:**
- **Fácil (DeepSeek):** 5 usos
- **Migrável com ajustes:** 4 usos (exigem validação JSON forte)
- **Manter OpenAI:** 2 usos (transcrição/Whisper)

---

## 5. Riscos de Migração

### Risco 1 — Mudança de formato JSON
- DeepSeek pode retornar JSON com schemas diferentes.
- **Mitigação:** Toda chamada já tem `extractJsonFromText()` e `validateAssets()`/`validateSuggestions()` — mas precisam ser testadas com DeepSeek.

### Risco 2 — Respostas menos consistentes
- Modelos como `deepseek-chat` podem ser menos consistentes que GPT-4 em JSON estruturado.
- **Impacto:** Maior taxa de reprocessamento para `generate-daily-quote` e `generate-content-assets`.

### Risco 3 — Perda de qualidade pastoral/devocional
- Prompts são cuidadosamente escritos para tom pastoral/devocional cristão.
- **Risco:** DeepSeek pode não seguir instruções de "tom pastoral" tão bem quanto GPT-4/GPT-4o-mini.
- **Recomendação:** Testar com amostra real de transcrições.

### Risco 4 — Diferença em português bíblico/devocional
- Prompts exigem português brasileiro com termos bíblicos.
- **Risco:** DeepSeek pode ter desempenho inferior em português comparado ao GPT-4o-mini.

### Risco 5 — Falhas em transcrição de áudio
- DeepSeek **não oferece** API de transcrição de áudio.
- **Decisão:** Manter OpenAI/Whisper para `transcribe-audio` e `generate-word-timestamps`.

### Risco 6 — Diferença em word timestamps
- Word timestamps é funcionalidade específica do Whisper.
- **Decisão:** Manter OpenAI.

### Risco 7 — Prompts que dependem de comportamento específico do GPT
- Alguns prompts usam `response_format: { type: "json_object" }` (recurso específico da API OpenAI).
- **Risco:** DeepSeek não suporta este parâmetro — precisaria de fallback para extração manual de JSON.

### Risco 8 — Custo menor, mas retrabalho na validação
- DeepSeek é mais barato, mas taxa de erro em JSON pode exigir mais chamadas de retry.
- **Impacto:** Economia pode ser parcialmente consumida por retries e validação extra.

### Risco 9 — Necessidade de fallback
- Estratégia de fallback já existe em `generate-daily-quote` (Cloudflare -> OpenAI).
- **Sugestão:** Manter padrão: DeepSeek como primário, OpenAI como fallback para JSON.

---

## 6. Prompts Importantes

| # | Arquivo | Linha aprox. | Objetivo | Tom Pastoral? | Exige JSON? | Estrutura Rígida? | Conteúdo Bíblico? |
|---|---------|-------------|----------|---------------|-------------|-------------------|-------------------|
| 1 | `app/api/ai/transcribe-audio/route.ts` | 225-228 | Prompt para transcrição Whisper | Sim | ❌ | ❌ | Sim ("termos bíblicos, nomes próprios, referências bíblicas") |
| 2 | `app/api/ai/generate-word-timestamps/route.ts` | 194-197 | Prompt para word timestamps Whisper | Sim | ❌ | ❌ | Sim (mesmo texto) |
| 3 | `app/api/ai/generate-daily-quote/route.ts` | 288-431 | **Prompt principal (144 linhas)** — gerar 5 sugestões de Palavra do Dia | ✅ Forte | ✅ Sim | ✅ Sim (5 campos obrigatórios por sugestão) | ✅ Sim |
| 4 | `app/api/ai/generate-episode-metadata/route.ts` | 71-126 | Gerar título, descrição e keywords | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| 5 | `app/api/ai/correct-daily-quote/route.ts` | 111-124 | Corrigir gramática/acentuação | Sim | ✅ Sim | Sim | Indireto |
| 6 | `app/api/ai/generate-content-assets/route.ts` | 4339-4566 | **Prompt principal do megamodo (228 linhas)** — gerar todos os assets | ✅ Forte | ✅ Sim | ✅ Sim | ✅ Sim |
| 7 | `app/api/ai/generate-content-assets/route.ts` | 2824-2961 | **Prompt best_cuts_ai (138 linhas)** — selecionar melhores cortes editoriais | ✅ Forte | ✅ Sim | ✅ Sim (múltiplos campos) | ✅ Sim |
| 8 | `app/api/ai/generate-content-assets/route.ts` | 2748-2821 | **Prompt caption_ai_review (74 linhas)** — revisar legendas sincronizadas | Sim | ✅ Sim | ✅ Sim | Sim |
| 9 | `app/api/ai/generate-content-assets/route.ts` | 3160-3253 | **Prompt visual_storyboard (94 linhas)** — storyboard visual para Short | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| 10 | `app/api/ai/generate-image-prompt/route.ts` | 211-352 | **Prompt premium (142 linhas)** — gerar prompt de imagem cinematográfica | ✅ Sim (tom de diretor de arte bíblico) | ✅ Sim | ✅ Sim (múltiplos níveis) | ✅ Sim |

**Observação:** Todos os prompts exigem tom pastoral/devocional cristão. Os prompts 3, 6, 7, 9 e 10 são **críticos** para a qualidade do conteúdo — devem ser preservados e testados exaustivamente na migração.

---

## 7. Variáveis de Ambiente

**Nomes listados (sem expor valores):**

| Nome | Onde é usado | Padrão (se houver) | Obrigatório? |
|------|-------------|-------------------|-------------|
| `OPENAI_API_KEY` | Todas as rotas OpenAI | — | ✅ Sim |
| `OPENAI_MODEL` | Várias rotas (fallback) | `gpt-4o-mini` | ❌ Opcional |
| `OPENAI_DAILY_QUOTE_MODEL` | generate-daily-quote | `gpt-4o-mini` | ❌ Opcional |
| `OPENAI_EPISODE_METADATA_MODEL` | generate-episode-metadata | `gpt-4.1` | ❌ Opcional |
| `OPENAI_CONTENT_ASSETS_MODEL` | generate-content-assets, generate-image-prompt | `gpt-4o-mini` | ❌ Opcional |
| `OPENAI_CORRECTION_MODEL` | correct-daily-quote | `gpt-4o-mini` | ❌ Opcional |
| `OPENAI_TRANSCRIPTION_MODEL` | generate-word-timestamps | `whisper-1` | ❌ Opcional |
| `OPENAI_TRANSCRIBE_TIMESTAMPS_MODEL` | transcribe-audio, generate-word-timestamps | `whisper-1` | ❌ Opcional |
| `OPENAI_RESPONSE_STRONG_MODEL` | generate-content-assets (best_cuts_ai, visual_storyboard) | `gpt-4o-mini` | ❌ Opcional |
| `OPENAI_RESPONSE_MODEL` | generate-content-assets (fallback) | — | ❌ Opcional |
| `CLOUDFLARE_ACCOUNT_ID` | generate-daily-quote (Cloudflare) | — | ✅ Para Cloudflare |
| `CLOUDFLARE_API_TOKEN` | generate-daily-quote (Cloudflare) | — | ✅ Para Cloudflare |
| `CLOUDFLARE_TEXT_MODEL` | generate-daily-quote (Cloudflare) | `@cf/meta/llama-3.1-8b-instruct` | ❌ Opcional |
| `R2_ACCOUNT_ID` | generate-daily-quote (fallback) | — | ❌ |
| `ADMIN_EMAIL` | Rotas admin | `djeonewill@gmail.com` | ❌ Opcional |

**Não existem:** `AI_PROVIDER`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `AI_TEXT_PROVIDER`, `AI_TRANSCRIPTION_PROVIDER`

---

## 8. Arquitetura Futura Proposta (Não Implementar Ainda)

### 8.1. Wrapper Abstrato de IA

Criar `lib/ai/provider.ts` com interface comum:

```typescript
interface AIProvider {
  generateText(params: {
    system: string
    prompt: string
    temperature?: number
    maxTokens?: number
  }): Promise<string>

  generateJson<T>(params: {
    system: string
    prompt: string
    schema?: string // descrição do JSON esperado
    temperature?: number
  }): Promise<T>
}

interface TranscriptionProvider {
  transcribeAudio(params: {
    audioUrl: string
    language: string
    wordTimestamps?: boolean
  }): Promise<{
    text: string
    segments: TranscriptionSegment[]
    words?: WordTimestamp[]
  }>
}
```

### 8.2. Provedores Separados

```
AI_TEXT_PROVIDER=openai|deepseek|cloudflare
AI_TRANSCRIPTION_PROVIDER=openai|whisper|outro
```

- **Texto/JSON:** DeepSeek como primário, OpenAI como fallback
- **Transcrição:** Manter OpenAI/Whisper (DeepSeek não suporta)
- **Word timestamps:** Manter OpenAI/Whisper

### 8.3. Fallback em Camadas

```
1. Tenta DeepSeek
2. Se falhar JSON -> tenta OpenAI
3. Se falhar OpenAI -> erro controlado com fallback local (quando existir)
```

### 8.4. Validação de JSON Antes de Salvar

Já existe validação forte em:
- `validateSuggestions()` (generate-daily-quote)
- `validateAssets()` (generate-content-assets)
- `validateMetadata()` (generate-episode-metadata)
- `normalizePromptResponse()` (generate-image-prompt)

Essas funções devem ser mantidas e fortalecidas.

---

## 9. Plano de Migração Recomendado (Etapas)

| Patch | Nome | Descrição |
|-------|------|-----------|
| **AI-PROVIDER-002** | Criar wrapper abstrato | `lib/ai/provider.ts` com interface comum **sem trocar comportamento** |
| **AI-PROVIDER-003** | Migrar texto simples | Migrar `generate-episode-metadata`, `correct-daily-quote` e textos do `generate-content-assets` para DeepSeek (modo opcional) |
| **AI-PROVIDER-004** | Migrar JSON estruturado | Migrar `generate-daily-quote`, `generate-content-assets` (JSON), `generate-image-prompt` com validação forte e fallback |
| **AI-PROVIDER-005** | Avaliar transcrição | Manter OpenAI Whisper; avaliar alternativas de STT (Google, Azure, AssemblyAI) |
| **AI-PROVIDER-006** | Adicionar fallback e logs | Logs de custo/erro por chamada; fallback automático para OpenAI |

---

## 10. Recomendação Final

### Chamadas que PODEM migrar para DeepSeek (com validação)

1. `generate-episode-metadata` — ✅ Fácil. Texto + JSON simples.
2. `correct-daily-quote` — ✅ Fácil. Prompt curto, tem fallback local.
3. `generate-content-assets` (summary, whatsapp, instagram) — ✅ Fácil. Texto simples.
4. `generate-content-assets` (caption_ai_review) — ✅ Fácil. Refinamento textual.
5. `generate-content-assets` (phrases, short_ideas, cuts, short_script) — ⚠️ Migrável com validação forte de JSON.
6. `generate-content-assets` (best_cuts_ai) — ⚠️ Migrável, mas schema muito complexo.
7. `generate-content-assets` (visual_storyboard) — ⚠️ Migrável, mas schema complexo.
8. `generate-daily-quote` — ⚠️ Já usa Cloudflare como primário; DeepSeek substituiria fallback OpenAI.
9. `generate-image-prompt` — ⚠️ Prompt longo e específico. Testar qualidade com DeepSeek.

### Chamadas que NÃO devem migrar agora

1. `transcribe-audio` — ❌ Depende de Whisper (OpenAI). DeepSeek não oferece STT.
2. `generate-word-timestamps` — ❌ Depende de `whisper-1` forçado. Word timestamps é funcionalidade específica.

### Principais Riscos

1. **Perda de qualidade em JSON estruturado** — DeepSeek pode ser menos consistente que GPT-4 em JSON complexo.
2. **Perda de tom pastoral** — Prompts são refinados para GPT; DeepSeek pode não seguir instruções de tom com mesma qualidade.
3. **Quebra de `response_format: "json_object"`** — DeepSeek não suporta; exigirá extração manual de JSON.
4. **Português bíblico** — DeepSeek pode ter desempenho inferior em português comparado ao GPT-4o-mini.
5. **Transcrição sem substituto** — DeepSeek não cobre STT; manter OpenAI obrigatório para áudio.

### Próximo Patch Recomendado

**AI-PROVIDER-002:** Criar `lib/ai/provider.ts` com interface `AIProvider` e `TranscriptionProvider`. Implementar `OpenAIProvider` existente. Adicionar env vars `AI_TEXT_PROVIDER` (futuro) e `AI_TRANSCRIPTION_PROVIDER` (futuro). **Sem trocar comportamento ainda.**