@AGENTS.md

# Contratos validados — Palavra do Dia, Upload e PWA

Valores extraídos do código atual em 2026-07-03. Não alterar sem revalidar com o Gestor.

---

## 1. Palavra do Dia — Open Graph (og:image) para WhatsApp

**Arquivo:** `app/palavra/[id]/page.tsx` (`generateMetadata`)

### Prioridade de `og:image`
1. `quote.share_image_url` — imagem JPEG estática no R2 (prioritário)
2. `${baseUrl}/api/og/quote/${id}?v=quote-og-v26` — fallback dinâmico

### Regras
- `share_image_url` está no `select` do Supabase (campo 83).
- A rota dinâmica `/api/og/quote/[id]` NÃO deve ser o caminho principal para WhatsApp — ela é lenta (~11s) e pesada. Só deve ser usada como fallback quando `share_image_url` é `NULL`.
- O campo `share_image_url` deve sempre ser populado via rota admin `generate-share-image` antes da publicação.

---

## 2. Geração da imagem otimizada (share_image_url)

**Arquivos:** `lib/images/generateQuoteShareImage.ts`, `app/api/admin/daily-quotes/[id]/generate-share-image/route.ts`

### Dimensão e formato
- **Dimensões testadas:** `1200×630` e `800×420` (tenta a maior primeiro)
- **Formato:** JPEG com `mozjpeg: true`
- **Qualidades testadas:** `84`, `78`, `72`, `66` (itera até caber no limite)
- **Limites de tamanho no código:**
  - `idealSizeBytes = 300 * 1024` (300 KB)
  - `maxSizeBytes = 400 * 1024` (400 KB)
  - Se nenhuma combinação ficar abaixo de 400 KB, a função lança erro

### Caminho R2
- **Key:** `daily-quotes/share-images/${quote.id}-quote-share-v1.jpg`
- **URL pública:** `${R2_PUBLIC_URL}/daily-quotes/share-images/${quote.id}-quote-share-v1.jpg`

### Campos atualizados no banco
- `share_image_url`: URL pública do JPEG gerado
- `share_image_status`: `'ready'`
- `share_image_error`: `null`
- `share_image_generated_at`: ISO timestamp

### UUID
- Validação: função `isUuid()` com regex `[89ab]` no 4º grupo (UUID v7)
- Aceita UUIDs como `baa02ee2-ac8a-4c2e-ad51-edc8403e30e5`

### Renderização de texto
- **Fonte:** `Inter-Bold.ttf` (`lib/fonts/Inter-Bold.ttf`), carregada via `opentype.js` (`parse(readFileSync(...))`)
- **Método:** `textToSvgPath()` — converte cada caractere em path SVG usando `charToGlyph()` + `glyph.getPath().toPathData(2)`
- **NÃO** usa `<text>`, `font-family` ou `@font-face` para a frase principal
- **NÃO** depende de fontes do sistema operacional
- Funciona identicamente em Windows, macOS e Linux/Vercel

### Como evita corte da frase
- **Fonte inicial:** `58px` (large, 1200px) / `39px` (small, 800px)
- **Fonte mínima:** `38px` / `26px`
- **Caracteres por linha:** `30`
- **Área segura:** `y = 22%` a `y = 75%` da altura, margem de 10px
- **Redução progressiva:** `fontSize -= 2` até caber ou atingir a mínima
- **Reticências:** só aparecem se a frase não couber nem na fonte mínima

### Aspas
- **Tipo:** aspas retas `"`
- **Detecção:** regex testa 6 variantes (retas simples/duplas, curvas inglesas, latinas) antes de adicionar
- **Não duplica** se o texto já vier com aspas do banco

### Acentos e caracteres especiais
- Renderizados como paths SVG — zero dependência de suporte do renderizador
- Caracteres com glifos próprios na fonte: `é` (eacute), `ç` (ccedilla), `ã` (atilde), etc.

---

## 3. Upload de áudio gravado (Novo Episódio)

**Arquivos:** `app/admin/novo-episodio/page.tsx`, `app/api/upload-audio/route.ts`, `app/api/r2/presigned-upload/route.ts`

### Função de envio
- `uploadAudioDirectToR2(file, fileName, folder)` em `page.tsx`

### Limite e rotas
- `MAX_DIRECT_UPLOAD_BYTES = 4 * 1024 * 1024` (4 MB)
- **≤ 4 MB:** `POST /api/upload-audio` com `FormData` (comportamento original)
- **> 4 MB:** `POST /api/r2/presigned-upload` (JSON) → `PUT` direto ao R2 com a URL assinada

### Presigned upload
- **Campos enviados:** `{ fileName, contentType, sizeBytes, folder }`
- **Headers:** `Content-Type: application/json`, `x-admin-password`
- **Campos retornados usados:** `signedUrl`, `publicUrl`, `key`, `extension`, `compatibleAudioUrl`, `compatibleAudioType`, `isAudioCompatible`
- **Método PUT:** body = Blob/File, header `Content-Type: file.type || 'audio/webm'`

### Tratamento de erro
- `response.json()` **NUNCA** é chamado sem try-catch
- Status 413 retorna erro amigável: "Arquivo de audio muito grande para envio direto (limite de 4.5 MB da Vercel)..."
- O Blob gravado (`recordingBlob`) é preservado no estado React após falha
- **Não existe** botão explícito de retry

### Limite da Vercel documentado na rota
- Linhas 7-9 de `/api/upload-audio/route.ts`:
  > Vercel Hobby impõe limite de ~4.5 MB no body da requisição.
  > Para arquivos > 4.5 MB, use upload via presigned URL: /api/r2/presigned-upload

---

## 4. Loading PWA e lazy-load

**Arquivos:** `components/tabs/TabHoje.tsx`, `app/page.tsx`, `app/loading.tsx`, `public/manifest.json`

### Loading atual
- **Visual:** spinner CSS duplo concêntrico com `animate-spin` em direções opostas
- **Cores:** `border-t-blue-400`, `border-r-blue-400/40`, fundo `bg-slate-950`
- **Texto:** "Preparando seu devocional..."
- **NÃO** contém emoji `⏳` — removido de `TabHoje` e `TabFavoritos`

### Estrutura de imports
- **Estático (carrega no bundle inicial):** `TabHoje`
- **Dinâmico (lazy-load via `next/dynamic`):** `TabLeitura`, `TabOracao`, `TabVoce`, `TabMais`, `TabSettings`, `TabSeries`, `TabOferta`, `TabFavoritos`

### Fallback global
- `app/loading.tsx` renderiza o mesmo spinner da TabHoje
- Sem fetch, sem dependência de dados, sem `'use client'`

### Manifest PWA
- `start_url: "/"`
- `display: "standalone"`
- `background_color: "#020617"`
- `theme_color: "#020617"`
- `orientation: "portrait"`

### Regras de preservação
- `TabHoje` deve permanecer com import estático (é a aba inicial)
- Abas não iniciais devem permanecer em lazy-load
- `app/loading.tsx` deve permanecer leve e sem fetch

---

## 5. O que NÃO reintroduzir

- ❌ `loadSync` de `opentype.js` (deprecated, retorna `undefined` no v2)
- ❌ `font-family` ou `@font-face` com fontes de sistema em SVG (quebra na Vercel)
- ❌ Corte da frase com `fitText` (limite de 150 chars) ou `maxLines` fixo
- ❌ `share_image_url` apontando para PNG/capa pesada (> 400 KB)
- ❌ Rota dinâmica `/api/og/quote/[id]` como `og:image` principal
- ❌ Upload de blobs > 4 MB via `/api/upload-audio` (limite de ~4.5 MB da Vercel)
- ❌ `response.json()` sem try-catch em respostas que podem ser HTML (413)
- ❌ Emoji `⏳` em qualquer estado de loading
- ❌ Import estático de abas não usadas na tela inicial