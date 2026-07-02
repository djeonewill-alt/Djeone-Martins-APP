# Djeone Martins — Documentação de Arquitetura (cloud.md)

> **Objetivo:** Guia definitivo da arquitetura do projeto, estrutura de pastas, mapa de rotas e padrão de segurança.
>
> **Última atualização:** 2026-06-22

---

## 1. Visão Geral

| Camada | Tecnologia |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Linguagem** | TypeScript 5 |
| **Autenticação** | Supabase Auth (SSR via `@supabase/ssr`) |
| **Banco de Dados** | PostgreSQL (Supabase) |
| **Storage** | Cloudflare R2 (áudios, imagens, uploads) |
| **Hospedagem** | Vercel |
| **IA** | DeepSeek, OpenAI, FAL.ai (FLUX) |
| **Notificações** | Web Push (web-push) |
| **Estilização** | Tailwind CSS 4 |
| **PWA** | Sim (manifest.json, service worker) |
| **TWA (Play Store)** | Em preparação (Fase 4) |

---

## 2. Estrutura de Pastas

```
djeone-app/
├── .next/                  # Build output do Next.js (gerado, não versionado)
├── app/                    # Next.js App Router — páginas e rotas de API
│   ├── admin/              # Painel administrativo
│   ├── api/                # API routes (ai, cron, admin, upload, images, r2, etc.)
│   ├── apoie/              # Página pública "Apoie"
│   ├── auth/               # Callback de autenticação OAuth
│   ├── cadastro/           # Página de cadastro e login
│   ├── ep/                 # Páginas públicas de episódios
│   ├── excluir-conta/      # Exclusão de conta (LGPD)
│   ├── lista-espera/       # Lista de espera
│   ├── palavra/            # Página pública da Palavra do dia
│   ├── politica-de-privacidade/  # Estática
│   ├── solicitar-dados/    # Solicitação de dados (LGPD)
│   ├── termos-de-assinatura-e-cobranca/  # Estática
│   ├── termos-de-uso/      # Estática
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx          # Layout raiz com AudioProvider, MiniPlayer, ExpandedPlayer
│   └── page.tsx            # Página inicial com sistema de abas
├── components/             # Componentes React reutilizáveis
│   ├── admin/              # Componentes do painel administrativo
│   ├── audio/              # Player/gravador de áudio, AudioProvider
│   ├── daily-quote/        # Frase diária (DailyQuoteCard)
│   ├── favorites/          # Favoritos
│   ├── gamification/       # Gamificação
│   ├── icons/              # Ícones
│   ├── legal/              # Componentes legais/termos
│   ├── recorder/           # Gravador de áudio
│   ├── settings/           # Configurações do app
│   ├── tabs/               # Abas de navegação (Hoje, Leitura, Oração, Você, Mais)
│   ├── tester/             # Ferramentas de teste / beta onboarding
│   ├── BottomNav.tsx        # Navegação inferior mobile
│   └── Header.tsx           # Cabeçalho
├── lib/                    # Camada de serviços / lógica de negócio
│   ├── ai/                 # Provedores de IA (DeepSeek, OpenAI, FAL.ai), ImageOrchestrator
│   ├── analytics/          # Analytics e métricas
│   ├── audio/              # Processamento de áudio
│   ├── beta/               # Funcionalidades beta (betaTester)
│   ├── episodes/           # Lógica de episódios, filtro de visibilidade pública
│   ├── gamification/       # Lógica de gamificação
│   ├── images/             # Processamento de imagens
│   ├── notifications/      # Notificações push (web-push)
│   ├── r2/                 # Integração com Cloudflare R2
│   ├── share/              # Compartilhamento / geração de imagens sociais
│   ├── supabase/           # Clientes Supabase (browser, server, admin, middleware)
│   ├── appUrl.ts           # Utilitário de URL
│   ├── AuthProvider.tsx     # Provedor de autenticação React
│   └── supabase.ts         # Re-exporta createSupabaseBrowserClient()
├── public/                 # Ativos estáticos (manifest.json, sw.js, ícones, imagens)
├── reports/                # Relatórios de auditoria e documentação de features
├── scripts/                # Scripts utilitários one-off (.mjs)
├── supabase/               # Migrações SQL do banco de dados
│   └── sql/                # Arquivos SQL numerados (001 a 006+)
├── types/                  # Declarações de tipo (.d.ts)
├── middleware.ts            # GUARDA CENTRALIZADA de proteção administrativa
├── architecture.md         # Documento original de visão macro
├── cloud.md               # Este arquivo
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json             # Configuração de deploy + cron jobs
└── .env.local              # Variáveis de ambiente (não versionado)
```

---

## 3. Mapa de Rotas

### 3.1 Rotas Administrativas (`/admin`)

| Rota | Descrição | Supabase? |
|---|---|---|
| `/admin` | **Dashboard**. Estatísticas consolidadas: séries, episódios, frases, orações, users. | Sim |
| `/admin/agenda` | **Calendário editorial**. Grid mensal com episódios agendados, drag-and-drop. | Sim |
| `/admin/analytics` | **Painel de analytics**. Eventos do app (app_opened, episode_viewed, etc.). | Sim |
| `/admin/central-conteudo` | **Central de conteúdo**. Repositório de episódios para curadoria e agendamento. | Sim |
| `/admin/central-conteudo/[episodeId]` | **Detalhe de episódio** na central de conteúdo. | Sim |
| `/admin/episodios` | Redireciona para `/admin/central-conteudo` (Server Component). | Não |
| `/admin/episodios/[id]` | **Editor detalhado de episódio**. | Sim |
| `/admin/mantenedores` | **Gestão de mantenedores** (apoiadores financeiros). CRUD + dashboard. | Sim |
| `/admin/nova-serie` | **Criação de nova série**. | Sim |
| `/admin/novo-episodio` | **Criação de episódio avulso**. | Sim |
| `/admin/oracoes` | **Moderação de orações**. Públicas, privadas, respondidas. | Sim |
| `/admin/oracoes/denuncias` | **Gestão de denúncias** de orações. | Sim |
| `/admin/premium-interesses` | **Interesses premium**. Lista de usuários interessados. | Sim |
| `/admin/series` | **Lista de séries** com indicadores. | Sim |
| `/admin/series/[id]` | **Edição de série**. | Sim |
| `/admin/series/[id]/episodios` | **Episódios de uma série**. | Sim |
| `/admin/series/[id]/episodios/novo` | **Novo episódio vinculado a série**. | Sim |
| `/admin/testadores-beta` | **Gestão de testadores beta**. | Sim |

### 3.2 Rotas Públicas

| Rota | Descrição | Supabase? |
|---|---|---|
| `/` | **Home**. Sistema de abas (Hoje, Leitura, Oração, Você, Mais). | Sim |
| `/ep/[id]` | **Página de episódio**. Player, metadados, compartilhamento. | Sim |
| `/palavra/[id]` | **Palavra do dia**. Frase/devocional com ações de compartilhamento. | Sim |
| `/apoie` | **Página de apoio financeiro**. | Possivelmente |
| `/auth/callback` | **Callback OAuth**. Processa retorno do fluxo de autenticação Supabase. | Sim |
| `/cadastro` | **Cadastro e login**. Formulário completo com aceitação de termos. | Sim |
| `/excluir-conta` | **Exclusão de conta** (LGPD). | Sim |
| `/lista-espera` | **Lista de espera** para acesso antecipado. | Sim |
| `/politica-de-privacidade` | Política de privacidade. **Estática.** | Não |
| `/solicitar-dados` | **Solicitação de dados** (LGPD). | Sim |
| `/termos-de-assinatura-e-cobranca` | Termos de assinatura. **Estática.** | Não |
| `/termos-de-uso` | Termos de uso. **Estática.** | Não |

### 3.3 API Routes (`/api`)

| Rota | Método | Descrição | Proteção |
|---|---|---|---|
| `/api/admin/episodes/[id]/delete` | DELETE | Deleta episódio e daily_quotes vinculadas | ✅ Admin + Session |
| `/api/admin/episodes/[id]/generate-og-image` | POST | Gera imagem OG para episódio | ✅ Admin + Session |
| `/api/admin/audio/convert-to-mp3` | POST | Converte áudio para MP3 | ✅ Session |
| `/api/admin/daily-quotes/[id]/generate-share-image` | POST | Gera imagem de compartilhamento | ✅ Admin |
| `/api/mantenedores` | GET, POST | CRUD de mantenedores | ✅ Admin + Session |
| `/api/images/search-backgrounds` | POST | Gera fundo via FLUX Schnell para Palavra do Dia | ✅ Admin + Session |
| `/api/images/register-used-background` | POST | Registra imagem usada no histórico | ✅ Admin + Session |
| `/api/upload-audio` | POST | Upload de áudio | ✅ Session + Admin email |
| `/api/r2/presigned-upload` | POST | URL pré-assinada para upload R2 | ✅ Session + Admin email |
| `/api/cron/publish-scheduled` | GET | Cron job de publicação automática | 🔒 Vercel Cron |
| `/api/cron/agenda-auto-publish` | GET | Cron job de auto-publicação da agenda | 🔒 Vercel Cron |
| `/api/og/episode` | GET | Imagem OG pública para episódios | 🌐 Pública |
| `/api/og/quote` | GET | Imagem OG pública para frases | 🌐 Pública |
| `/api/ai/*` | POST | Geração de conteúdo por IA | ✅ Session |

---

## 4. Padrão de Segurança Atual

### 4.1 Middleware Centralizado (`middleware.ts`)

O arquivo `middleware.ts` na raiz do projeto atua como **guarda centralizada** para todas as rotas administrativas.

**Matcher:**
```
/admin/:path*
/api/admin/:path*
```

**Fluxo:**
1. Cria `createServerClient` do `@supabase/ssr` com cookies (`getAll`/`setAll`).
2. Chama `supabase.auth.getUser()` — valida a sessão ativa e faz refresh automático do token.
3. **Sem sessão:** redireciona para `/cadastro?source=admin_required`.
4. **Usuário não-admin:** redireciona para `/` (home).
5. **Admin autorizado:** `NextResponse.next()` propagando cookies de sessão renovados.

### 4.2 Configuração de Admin Emails

A lista de emails autorizados é lida da variável de ambiente:

```env
# .env.local ou Vercel Environment Variables
ADMIN_EMAILS=djeonewill@gmail.com,segundo-admin@exemplo.com,terceiro@exemplo.com
```

Fallback para compatibilidade com a variável antiga:
```env
ADMIN_EMAIL=djeonewill@gmail.com
```

A lista é suportada por todas as rotas de API protegidas e pelo middleware.

### 4.3 Regra Estrita: Separação de Clientes Supabase

| Cliente | Função | Key | Uso |
|---|---|---|---|
| `createSupabaseBrowserClient()` | Browser (client components) | `anon_key` | Páginas públicas e admin CSR |
| `createSupabaseServerClient()` | Server (cookies) | `anon_key` | **Verificação de sessão** em rotas API e server components |
| `createSupabaseAdminClient()` | Admin (bypass RLS) | `service_role_key` | **Operações de banco** APÓS verificação de sessão + admin |

**Regra fundamental:** Em rotas de API acessíveis a usuários finais, o `createSupabaseAdminClient()` **nunca** é chamado antes da verificação de sessão e da confirmação de que o usuário é um admin autorizado.

### 4.4 Fluxo de Autorização nas Rotas de API

```
┌─────────────────────────────────────────────────────┐
│ 1. createSupabaseServerClient()                     │
│    └─ Cliente efêmero com cookies da requisição     │
│                                                     │
│ 2. supabase.auth.getUser()                          │
│    └─ Valida sessão + refresh automático do token   │
│                                                     │
│ 3. Verifica user.email ∈ ADMIN_EMAILS              │
│    ├─ Não autenticado → 401                         │
│    └─ Não admin → 403                               │
│                                                     │
│ 4. createSupabaseAdminClient()                      │
│    └─ Cliente com service_role (bypass RLS)         │
│                                                     │
│ 5. Executa lógica de negócio                        │
└─────────────────────────────────────────────────────┘
```

### 4.5 Rotas Blindadas

As seguintes rotas foram refatoradas e agora seguem o fluxo de autorização acima:

- ✅ `/api/admin/episodes/[id]/delete` — DELETE
- ✅ `/api/mantenedores` — GET, POST
- ✅ `/api/images/search-backgrounds` — POST
- ✅ `/api/images/register-used-background` — POST

### 4.6 Cron Jobs (Exceção Controlada)

As rotas `/api/cron/publish-scheduled` e `/api/cron/agenda-auto-publish` são as **únicas** que utilizam `createClient(url, SERVICE_ROLE_KEY)` diretamente. Isso é aceitável porque:

- São invocadas exclusivamente pelo **Vercel Cron Jobs** (configurados no `vercel.json`)
- Não são acessíveis por usuários finais
- Devem ser protegidas por **Cron Secret** no painel da Vercel

### 4.7 Outras Rotas com Verificação

As seguintes rotas usam `supabase.auth.getUser()` + verificação de email admin (hardcoded ou via env), sem o middleware mas com proteção inline:

| Rota | Verificação |
|---|---|
| `/api/upload-audio` | `getUser()` + email === ADMIN_EMAIL |
| `/api/r2/presigned-upload` | `getUser()` + email === ADMIN_EMAIL |
| `/api/admin/daily-quotes/[id]/generate-share-image` | `getUser()` + email === ADMIN_EMAIL |
| `/api/admin/audio/convert-to-mp3` | `getUser()` |
| `/api/ai/*` | `getUser()` |

---

## 5. Variáveis de Ambiente Necessárias

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...       # Apenas no servidor

# Admin
ADMIN_EMAILS=djeonewill@gmail.com,admin2@exemplo.com

# Cloudflare R2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=djeone-app
R2_PUBLIC_URL=https://r2.djeonemartins.com

# AI Providers
DEEPSEEK_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:contato@djeonemartins.com

---

## 6. Fase 4 — Preparação para Google Play Store (TWA)

> **Status:** Em andamento
>
> **Data:** 2026-06-22

### 6.1 Manifest PWA/TWA

Arquivo: `public/manifest.json`

Adicionados os campos obrigatórios para Trusted Web Activity:

```json
"prefer_related_applications": true,
"related_applications": [
  {
    "platform": "play",
    "id": "com.djeonemartins.app",
    "url": "https://play.google.com/store/apps/details?id=com.djeonemartins.app"
  }
]
```

**Placeholders a preencher:**
- `id`: Substituir `com.djeonemartins.app` pelo package name real do app Android
- `url`: Substituir pela URL real da listagem na Play Store após publicação

### 6.2 Digital Asset Links

Arquivo: `public/.well-known/assetlinks.json`

Servido estaticamente via Next.js na rota `/.well-known/assetlinks.json`.

**Conteúdo atual (placeholder):**
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.djeonemartins.app",
      "sha256_cert_fingerprints": [
        "PLACEHOLDER_REPLACE_WITH_RELEASE_KEY_SHA256"
      ]
    }
  }
]
```

**Placeholders a preencher:**
- `package_name`: Deve corresponder ao package name do app Android
- `sha256_cert_fingerprints`: Substituir pelo fingerprint SHA-256 do certificado de assinatura de release (gerado via Google Play Console ou keytool)

**Como obter o SHA-256:**
```bash
keytool -list -v -keystore <caminho-do-keystore> -alias <alias> -storepass <senha> -keypass <senha> | grep SHA256
```
Ou diretamente no **Google Play Console** → Setup → App Integrity → App Signing → SHA-256 certificate fingerprint.

### 6.3 Checklist TWA para Publicação

- [x] `manifest.json` com `prefer_related_applications: true`
- [x] `manifest.json` com bloco `related_applications`
- [x] `assetlinks.json` servido em `/.well-known/assetlinks.json`
- [ ] Preencher `package_name` real no `manifest.json` e `assetlinks.json`
- [ ] Preencher `sha256_cert_fingerprints` real no `assetlinks.json`
- [ ] Verificar se `assetlinks.json` está acessível em `https://<domínio>/.well-known/assetlinks.json` com Content-Type `application/json`
- [ ] Adicionar ícone maskable de 512x512 com padding seguro (zona segura de 80%)
- [ ] Configurar `asset_statements` no AndroidManifest.xml ou `strings.xml` do app Android
- [ ] Verificar compatibilidade com o verificador online: `https://developers.google.com/digital-asset-links/tools/generator`
