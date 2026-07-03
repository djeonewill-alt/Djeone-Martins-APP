# CHECKUP-APP-DEVOCIONAL-ROADMAP-BASE.md

> Relatório técnico-estratégico do estado atual do App Devocional Diário.
> Base para planejamento do roadmap futuro.
> 2026-07-03

---

## PARTE 1 — Inventário do que já existe

### Aplicativo Público

| Módulo | Status | Observações |
|---|---|---|
| Home (/) | ✅ Funcional | Sistema de abas (Hoje, Leitura, Oração, Você, Mais). Lazy-load aplicado nas abas não-iniciais via `next/dynamic`. |
| Aba Hoje | ✅ Funcional | Episódio do dia + Palavra do Dia + Áudio + Leitura + Oração + Oferta. Consulta Supabase (`episodes` com `show_on_today=true`). |
| Aba Leitura | ✅ Funcional | Planos de leitura bíblica com progresso (localStorage). |
| Aba Oração | ✅ Funcional | Guia de oração diário (mock data). |
| Aba Você | ✅ Funcional | Perfil, favoritos, configurações. |
| Aba Mais | ✅ Funcional | Séries, Oferta, Central do Testador. |
| Palavra do Dia | ✅ Funcional | Página pública `/palavra/[id]` com compartilhamento WhatsApp. |
| Episódios públicos | ✅ Funcional | Página `/ep/[id]` com player e compartilhamento. |
| Player de áudio | ✅ Funcional | MiniPlayer + ExpandedPlayer. Suporte a áudio compatível (MP3). |
| PWA | ✅ Funcional | `manifest.json` configurado. `display: standalone`. Ícones 192×192 e 512×512. |
| Cadastro | ✅ Funcional | `/cadastro` com formulário de registro. |
| Login/Logout | ✅ Funcional | AuthProvider existe em `lib/AuthProvider.tsx`. |
| Loading PWA | ✅ Funcional | Spinner CSS moderno (sem ampulheta). `app/loading.tsx` criado. |
| Compartilhamento | ✅ Funcional | Episódio e Palavra do Dia com `navigator.share` e fallback clipboard. |
| Analytics | ✅ Funcional | Eventos via `trackAppEvent` (`app_opened`, `episode_viewed`, `quote_share_clicked`, etc.). |

### Admin

| Módulo | Status | Observações |
|---|---|---|
| Dashboard | ✅ Funcional | `/admin` — estatísticas consolidadas (séries, episódios, frases, orações). |
| Novo Episódio | ✅ Funcional | Upload de áudio (gravado ou arquivo), transcrição IA, geração de frases, cards, capa FLUX. |
| Upload longo (>4 MB) | ✅ Funcional | Presigned upload R2 implementado em 2026-07-03. |
| Séries | ✅ Funcional | CRUD de séries, listagem, criação, edição. |
| Episódios por série | ✅ Funcional | `/admin/series/[id]/episodios` — criação vinculada. |
| Agenda | ✅ Funcional | Calendário editorial com drag-and-drop e agendamento. |
| Central de Conteúdo | ✅ Funcional | Repositório de episódios com filtros e curadoria. |
| Editor de episódio | ✅ Funcional | `/admin/episodios/[id]` — edição completa. |
| Orações | ✅ Funcional | Moderação de orações (públicas, privadas, respondidas). |
| Denúncias | ✅ Funcional | Gestão de denúncias de orações. |
| Testadores Beta | ✅ Funcional | Gestão de testadores, onboarding, perfil. |
| Mantenedores | ✅ Funcional | CRUD de apoiadores financeiros. |
| Premium/Interesses | ✅ Funcional | Lista de usuários interessados em premium. |
| Analytics (admin) | ✅ Funcional | Painel de métricas do app. |

### Conteúdo

| Módulo | Status | Observações |
|---|---|---|
| Séries | ✅ Funcional | CRUD completo, flag `is_open`. |
| Episódios | ✅ Funcional | Criação, edição, exclusão, agendamento. |
| Áudio | ✅ Funcional | Upload (direto e presigned), conversão MP3, player. |
| Transcrição | ✅ Funcional | IA (transcrição avançada com timestamps). |
| Capa | ✅ Funcional | FLUX Schnell via FAL.ai, overlay de texto via Canvas. |
| Palavra do Dia | ✅ Funcional | Geração IA, correção, cards, publicação agendada. |
| Imagem compartilhamento | ✅ Funcional | JPEG otimizado 1200×630 via `generateQuoteShareImage.ts`. |
| Agenda/Publicação | ✅ Funcional | Publicação manual e automática (cron). |

### Infraestrutura

| Módulo | Status | Observações |
|---|---|---|
| Supabase | ✅ Funcional | PostgreSQL + Auth + Storage. 6 migrações SQL. |
| RLS | ✅ Parcial | Documentado em `cloud.md` (padrão de segurança). |
| Cloudflare R2 | ✅ Funcional | Upload de áudio, imagens, share images. |
| Presigned Upload | ✅ Funcional | `/api/r2/presigned-upload` para arquivos grandes. |
| Open Graph | ✅ Funcional | Rotas `/api/og/episode` e `/api/og/quote`. |
| PWA Manifest | ✅ Funcional | Configurado para standalone, TWA em preparação. |
| IA | ✅ Funcional | DeepSeek, OpenAI, FAL.ai (FLUX). Transcrição, frases, capas. |
| Web Push | ✅ Funcional | Notificações push (web-push). |
| Vercel Cron | ✅ Funcional | Publicação automática de episódios agendados. |
| Middleware | ✅ Funcional | Guarda centralizada para rotas admin. |
| TWA (Play Store) | ⚠️ Parcial | manifest.json e assetlinks.json preparados. Placeholders a preencher. |

### Crescimento / Engajamento

| Módulo | Status | Observações |
|---|---|---|
| Compartilhamento WhatsApp | ✅ Funcional | Palavra do Dia com imagem otimizada + episódios. |
| Analytics/Eventos | ✅ Funcional | `app_opened`, `episode_viewed`, `share_clicked`, etc. |
| Beta Testers | ✅ Funcional | Onboarding, perfil, missões de teste. |
| Mantenedores | ✅ Funcional | CRUD, dashboard. |
| Premium (interesses) | ✅ Funcional | Cadastro de interessados. |
| Lista de Espera | ✅ Funcional | Página `/lista-espera`. |

---

## PARTE 2 — Classificação de maturidade

### FUNCIONAL_VALIDADO

| Módulo | Evidência |
|---|---|
| Palavra do Dia (OG WhatsApp) | Validado pelo Gestor — thumbnail carrega, sem tofu, frase completa, aspas. |
| Geração de share image | JPEG otimizado via opentype.js paths, alvo <300 KB, máx 400 KB. Testado em produção. |
| Upload de gravação longa | Fato: Blob de ~10 MB falhava com HTTP 413. Correção: >4 MB usam presigned R2. Validação: Gestor confirmou funcionamento. |
| Loading PWA | Spinner moderno, lazy-load de tabs. Validado pelo Gestor. |
| Novo Episódio | Fluxo completo: gravação → upload → transcrição → frases → cards → publicação. |
| Agenda | Drag-and-drop, publicação agendada via cron. |
| Player de áudio | MiniPlayer + ExpandedPlayer com progresso e legenda. |
| Transcrição IA | Transcrição avançada com timestamps por palavra. |

### FUNCIONAL_NAO_VALIDADO

| Módulo | Observação |
|---|---|
| Analytics (admin) | Existe painel em `/admin/analytics`, sem evidência de validação recente. |
| Web Push | Implementado mas sem confirmação de teste em produção. |
| Gamificação | Componentes existem em `components/gamification/`, sem evidência de uso ativo. |
| Oração (pública) | Mural de orações existe, sem confirmação de moderação ativa. |

### PARCIAL

| Módulo | O que falta |
|---|---|
| TWA (Play Store) | `package_name` e `sha256_cert_fingerprints` são placeholders. |
| Mantenedores | CRUD existe, mas sem integração com pagamento/recorrência. |
| Premium | Apenas cadastro de interesses — produto não implementado. |
| Conteúdo multilíngue | Infraestrutura existe (IA), mas sem interface/admin para múltiplos idiomas. |
| RLS | Documentado, mas sem auditoria completa de todas as tabelas. |

### BASE_TECNICA

| Módulo | Observação |
|---|---|
| Motor de conteúdo (vídeo) | `architecture.md` menciona "Fábrica de Conteúdo" — FFmpeg, Best Cuts, Storyboard. Código não encontrado nos diretórios auditados. |
| YouTube API | Mencionada em `architecture.md`. Sem integração implementada. |
| Cursos/Formação | Sem estrutura no código. |

### NAO_EXISTE

| Módulo | Observação |
|---|---|
| Interface multilíngue | Apenas português. Sem i18n, sem rotas por idioma. |
| Canais por idioma | Sem estrutura para separar conteúdo EN/ES. |
| Pagamento/Assinatura | Sem integração (Stripe, Mercado Pago, etc.). |
| Área do mantenedor | Apenas admin. Sem dashboard para o próprio mantenedor. |
| Dados missionários (países) | Sem coleta de localização geográfica dos usuários. |
| Eventos presenciais | Sem estrutura. |
| Plantação de trabalhos/igrejas | Sem estrutura. |

---

## PARTE 3 — Lacunas para a visão futura

### Pilar A — Conteúdo devocional e séries

**O que já existe:** ✅ Séries, episódios, áudio, transcrição, capa, Palavra do Dia, agenda, publicação.

**Lacunas:**
- Categorias/tags para séries (ex: "Evangelhos", "Cartas", "Profetas").
- busca e filtro por tema no app público.
- Notificações de novos episódios por série (web push configurado, falta UI).
- Métricas de consumo por série/episódio.
- playlists automáticas (ex: "Plano de leitura de João em 21 dias" sequencial).

### Pilar B — Motor de conteúdo e redes sociais

**O que já existe:** ⚠️ `architecture.md` menciona "Fábrica de Conteúdo" com FFmpeg, Best Cuts, Storyboard. Sem código implementado auditável.

**Lacunas:**
- Extração de cortes do áudio/vídeo (best cuts).
- Geração automática de shorts/reels com legenda.
- Templates visuais para redes sociais.
- Agendamento de posts.
- Métricas de engajamento por plataforma.
- Links de volta para o app nos conteúdos sociais.

### Pilar C — Integração YouTube

**O que já existe:** ❌ Sem código.

**Lacunas:**
- Autenticação OAuth YouTube.
- Upload de vídeos.
- Agendamento de publicação.
- Sincronização de metadados (título, descrição, tags, thumbnail).
- Métricas (views, watch time, retenção).
- Comentários e engajamento.
- Múltiplos canais (PT, EN, ES).

### Pilar D — Multilíngue

**O que já existe:** ❌ Apenas português.

**Lacunas:**
- i18n framework (next-intl ou similar).
- Tradução de interface (PT, EN, ES).
- Conteúdo por idioma (séries, episódios, Palavra do Dia, orações).
- Canais separados por idioma.
- Preferência de idioma no perfil do usuário.
- Detecção automática por navegador/região.
- Rotas por idioma (`/en`, `/es`).
- Admin multilíngue (criar conteúdo em múltiplos idiomas).
- IA de tradução automática de conteúdo.

### Pilar E — Mantenedores e sustentabilidade

**O que já existe:** ⚠️ CRUD admin de mantenedores. Cadastro de interesses premium.

**Lacunas:**
- Integração com gateway de pagamento (Stripe, Mercado Pago, Pix).
- Planos de assinatura (mensal, anual, vitalício).
- Renovação automática.
- Área do mantenedor (dashboard, recibos, conteúdo exclusivo).
- Comunicação com mantenedores (email, notificações).
- Relatórios financeiros.
- Conteúdo exclusivo para mantenedores.

### Pilar F — Formação e cursos

**O que já existe:** ❌ Sem estrutura.

**Lacunas:**
- Estrutura de cursos (módulos, aulas, quizzes).
- Player de vídeo/aula.
- Certificado de conclusão.
- Trilhas de formação (ex: "Fundamentos da Fé", "Escatologia", "Liderança").
- Conteúdo exclusivo para mantenedores.
- Área do aluno (progresso, notas, certificados).
- Curadoria de conteúdo teológico.

### Pilar G — Dados missionários

**O que já existe:** ⚠️ Analytics de eventos do app (sem geolocalização confirmada).

**Lacunas:**
- Coleta de país/cidade/idioma do usuário (com consentimento LGPD).
- Dashboard de audiência por região.
- Retenção e engajamento por país.
- Conteúdo mais consumido por região.
- Mapa de calor de audiência.
- Base para decisão de eventos presenciais e tradução.

### Pilar H — Eventos e expansão missionária

**O que já existe:** ❌ Sem estrutura.

**Lacunas:**
- Cadastro de eventos (país, cidade, data, capacidade).
- Inscrições online.
- Comunicação pré/pós-evento.
- Mapa de audiência para escolha de locais.
- Agenda missionária pública.
- Acompanhamento pós-evento (follow-up, materiais).
- Plantação de trabalhos/igrejas (tracking de novos núcleos).

---

## PARTE 4 — Ordem sugerida de construção

### Fase 0 — Estabilização e documentação

**Objetivo:** Consolidar o que já existe e preparar para crescimento.
**Entregas:**
- Auditoria de RLS em todas as tabelas.
- Testes de carga/perda de dados.
- Monitoramento de erros (Sentry ou similar).
- Documentação de API (OpenAPI/Swagger).
- CLAUDE.md e AGENTS.md atualizados.
**Dependências:** Nenhuma.
**Riscos:** Baixo — é documentação e hardening.
**Critério de pronto:** RLS auditado, monitoramento configurado, docs atualizados.

### Fase 1 — Produto devocional forte

**Objetivo:** Fortalecer o app como devocional diário antes de expandir.
**Entregas:**
- Busca e filtro de séries/episódios.
- Notificações de novos episódios.
- Playlists automáticas.
- Métricas de consumo por conteúdo.
- Melhorias no player (velocidade, sleep timer).
**Dependências:** Fase 0 concluída.
**Riscos:** Baixo — melhorias incrementais.
**Critério de pronto:** Usuário consegue descobrir e consumir conteúdo com facilidade.

### Fase 2 — Crescimento e compartilhamento

**Objetivo:** Expandir alcance via redes sociais.
**Entregas:**
- QR code / link de compartilhamento melhorado.
- Página de destino para novos usuários (landing page no app).
- Métricas de aquisição (de onde vem o usuário).
- Teste A/B de telas de cadastro.
**Dependências:** Fase 1 concluída.
**Riscos:** Baixo — foco em aquisição orgânica.
**Critério de pronto:** Novos usuários conseguem descobrir e se cadastrar com baixa fricção.

### Fase 3 — Mantenedores e sustentabilidade

**Objetivo:** Criar base financeira para o projeto.
**Entregas:**
- Integração com gateway de pagamento (Pix + cartão).
- Planos de assinatura.
- Área do mantenedor.
- Conteúdo exclusivo.
- Relatórios financeiros.
**Dependências:** Fase 1 concluída.
**Riscos:** Médio — complexidade de pagamento, chargebacks, LGPD financeiro.
**Critério de pronto:** Usuário consegue se tornar mantenedor e acessar benefícios.

### Fase 4 — Motor de conteúdo

**Objetivo:** Automatizar criação de conteúdo para redes sociais.
**Entregas:**
- Extração de cortes do áudio (best cuts).
- Geração de shorts/reels com legenda.
- Templates visuais.
- Agendamento de posts.
**Dependências:** FFmpeg no servidor, storage para vídeos.
**Riscos:** Alto — complexidade técnica (FFmpeg, processamento de vídeo), custo de computação.
**Critério de pronto:** Um episódio gera automaticamente 3+ cortes para redes sociais.

### Fase 5 — Multilíngue

**Objetivo:** Expandir para inglês e espanhol.
**Entregas:**
- i18n framework.
- Tradução de interface.
- Conteúdo por idioma.
- Canais separados.
- Admin multilíngue.
**Dependências:** Fase 1 concluída. Estrutura de conteúdo sólida em português.
**Riscos:** Alto — complexidade de i18n, duplicação de conteúdo, operação editorial.
**Critério de pronto:** Usuário consegue usar o app em EN/ES com conteúdo nativo.

### Fase 6 — Cursos e formação

**Objetivo:** Oferecer formação teológica estruturada.
**Entregas:**
- Estrutura de cursos (módulos, aulas).
- Player de aula.
- Certificados.
- Trilhas de formação.
- Área do aluno.
**Dependências:** Fase 3 (mantenedores) para monetização.
**Riscos:** Médio — produção de conteúdo, curadoria teológica, qualidade.
**Critério de pronto:** Aluno consegue se matricular, assistir aulas e obter certificado.

### Fase 7 — Inteligência missionária e eventos

**Objetivo:** Usar dados para decisão missionária.
**Entregas:**
- Coleta de geolocalização (com LGPD).
- Dashboard de audiência por região.
- Mapa de calor.
- Cadastro de eventos.
- Inscrições online.
**Dependências:** Fase 2 (analytics), Fase 5 (multilíngue).
**Riscos:** Alto — privacidade (LGPD/GDPR), qualidade dos dados, logística de eventos.
**Critério de pronto:** Dashboard mostra países/cidades com maior audiência; evento pode ser criado e ter inscrições.

### Fase 8 — Plataforma global

**Objetivo:** App como plataforma missionária completa.
**Entregas:**
- Integração YouTube completa.
- Múltiplos canais por idioma.
- Plantação de trabalhos/igrejas (tracking).
- Acompanhamento pós-evento.
- Comunidade/feed.
**Dependências:** Fases 4, 5, 6, 7 concluídas.
**Riscos:** Muito alto — complexidade, escala, operação global.
**Critério de pronto:** App suporta múltiplos idiomas, canais, eventos e plantação de igrejas.

---

## PARTE 5 — Top 10 próximos blocos recomendados

### 1. Auditoria de RLS e segurança
- **Tipo:** FUNDAÇÃO
- **Por quê agora:** Segurança é pré-requisito para crescimento. Dados de usuários, mantenedores e conteúdo precisam de proteção adequada.
- **Arquivos prováveis:** `supabase/sql/*`, `middleware.ts`, `lib/supabase/*`
- **Risco técnico:** Baixo — é auditoria, não implementação.
- **Risco ministerial:** Baixo.
- **Dependências:** Nenhuma.
- **Resultado esperado:** Relatório de RLS com tabelas protegidas e lacunas identificadas.

### 2. Push para produção (commits locais)
- **Tipo:** FUNDAÇÃO
- **Por quê agora:** 5 commits locais validados precisam ir para produção.
- **Arquivos prováveis:** `git push origin main`
- **Risco técnico:** Baixo — já validado com `tsc` e `build`.
- **Risco ministerial:** Baixo.
- **Dependências:** Nenhuma.
- **Resultado esperado:** Deploy na Vercel com todas as correções recentes.

### 3. Documentação de API (OpenAPI)
- **Tipo:** DOCUMENTAÇÃO
- **Por quê agora:** Facilita integração futura (YouTube, mantenedores, app mobile nativo).
- **Arquivos prováveis:** `docs/api/` ou `reports/API-REFERENCE.md`
- **Risco técnico:** Baixo.
- **Risco ministerial:** Baixo.
- **Dependências:** Nenhuma.
- **Resultado esperado:** Documento com todas as rotas de API, parâmetros e respostas.

### 4. Monitoramento de erros
- **Tipo:** FUNDAÇÃO
- **Por quê agora:** App está crescendo. Erros em produção precisam ser detectados antes do usuário reportar.
- **Arquivos prováveis:** `sentry.client.config.ts`, `sentry.server.config.ts`
- **Risco técnico:** Baixo — Sentry ou similar é integração padrão.
- **Risco ministerial:** Baixo.
- **Dependências:** Nenhuma.
- **Resultado esperado:** Dashboard de erros com alertas para erros 500.

### 5. Busca e filtro de conteúdo público
- **Tipo:** FEATURE
- **Por quê agora:** Usuário precisa encontrar episódios antigos. Base para playlists.
- **Arquivos prováveis:** `components/tabs/TabLeitura.tsx`, `app/ep/`
- **Risco técnico:** Baixo — filtro no Supabase.
- **Risco ministerial:** Baixo.
- **Dependências:** Nenhuma.
- **Resultado esperado:** Usuário consegue buscar por título, referência ou tema.

### 6. Integração com gateway de pagamento (Pix)
- **Tipo:** MONETIZAÇÃO
- **Por quê agora:** Sustentabilidade do projeto. Mantenedores já cadastrados manualmente precisam de automação.
- **Arquivos prováveis:** `app/api/payments/*`, `lib/payments/*`, `app/admin/mantenedores/*`
- **Risco técnico:** Médio — integração com API externa, webhooks, conciliação.
- **Risco ministerial:** Médio — experiência de doação, transparência.
- **Dependências:** Nenhuma.
- **Resultado esperado:** Mantenedor consegue contribuir via Pix com recorrência.

### 7. Conteúdo exclusivo para mantenedores
- **Tipo:** MONETIZAÇÃO
- **Por quê agora:** Valor para o mantenedor. Incentivo para contribuição.
- **Arquivos prováveis:** `app/mantenedor/*`, `lib/supabase/` (RLS para conteúdo exclusivo)
- **Risco técnico:** Baixo.
- **Risco ministerial:** Médio — decidir o que é exclusivo vs gratuito.
- **Dependências:** Bloco 6 (pagamento).
- **Resultado esperado:** Mantenedor acessa séries/episódios exclusivos.

### 8. Analytics de audiência por região
- **Tipo:** DADOS
- **Por quê agora:** Base para decisão de tradução, eventos e expansão.
- **Arquivos prováveis:** `app/api/analytics/*`, `lib/analytics/*`
- **Risco técnico:** Baixo — coleta de IP/geolocalização com consentimento.
- **Risco ministerial:** Médio — LGPD, privacidade.
- **Dependências:** Nenhuma.
- **Resultado esperado:** Dashboard admin mostra países/cidades dos usuários.

### 9. Playlists automáticas
- **Tipo:** FEATURE
- **Por quê agora:** Aumenta retenção. Usuário ouve sequencialmente sem precisar buscar.
- **Arquivos prováveis:** `components/audio/*`, `components/tabs/TabHoje.tsx`
- **Risco técnico:** Baixo.
- **Risco ministerial:** Baixo.
- **Dependências:** Bloco 5 (busca/filtro) desejável.
- **Resultado esperado:** Ao terminar um episódio, próximo da série começa automaticamente.

### 10. i18n framework (preparação multilíngue)
- **Tipo:** FUNDAÇÃO
- **Por quê agora:** Preparar arquitetura antes de produzir conteúdo multilíngue. Evita retrabalho.
- **Arquivos prováveis:** `lib/i18n/*`, `app/[locale]/*`
- **Risco técnico:** Médio — reestruturação de rotas.
- **Risco ministerial:** Baixo — é infraestrutura, não conteúdo.
- **Dependências:** Nenhuma.
- **Resultado esperado:** App suporta `/en` e `/es` com interface traduzida (conteúdo ainda em PT).

---

## PARTE 6 — Decisões que o Gestor precisa tomar

1. **O que será gratuito no lançamento?** Todo o conteúdo atual? Apenas o episódio do dia?
2. **Quando premium/mantenedores entram?** Antes ou depois do crescimento de audiência?
3. **O app será primeiro português e depois multilíngue?** Ou já nasce com estrutura para EN/ES?
4. **YouTube será integração futura ou prioridade próxima?** Depende de produção de vídeo.
5. **Cursos serão gratuitos, pagos ou exclusivos para mantenedores?**
6. **Qual é a primeira métrica de sucesso do app?** Usuários ativos? Mantenedores? Compartilhamentos?
7. **Qual é o público inicial mais importante?** Brasil? EUA? América Latina?
8. **Qual é o papel da igreja local no app?** Divulgação? Grupos? Conteúdo?
9. **Como evitar que o app fique complexo demais antes de ter audiência?** Priorizar features ou audiência?
10. **Conteúdo pastoral sensível pode ser automatizado?** Ou sempre requer revisão humana?

---

## PARTE 7 — Riscos estratégicos

| Risco | Impacto | Probabilidade |
|---|---|---|
| Construir motor de conteúdo antes de ter base de usuários | Alto | Média |
| Automatizar publicação sem revisão pastoral | Crítico | Média |
| App ficar pesado/lento com muitas features | Alto | Alta |
| Misturar muitas funções antes do produto central estar forte | Alto | Média |
| Multilíngue cedo demais sem operação editorial | Alto | Baixa (Fase 5) |
| Dados de métricas sem consentimento LGPD | Crítico | Média |
| Dependência excessiva de APIs externas (IA, YouTube) | Alto | Alta |
| Custo de IA/vídeo (FAL.ai, DeepSeek, FFmpeg) | Médio | Alta |
| Complexidade de YouTube API (OAuth, cotas, permissões) | Alto | Alta |
| Monetização precoce afastar usuários | Médio | Média |
| Conteúdo teológico sem curadoria adequada | Crítico | Baixa |

---

## PARTE 8 — Recomendações de governança

1. **Sempre auditar antes de fazer roadmap.** Cada fase deve começar com diagnóstico do estado atual.
2. **Cada fase deve ter documento próprio.** Ex: `reports/FASE-1-PRODUTO-DEVOCIONAL.md`.
3. **Cada feature grande deve ter diagnóstico antes de patch.** Padrão já estabelecido nos reports existentes.
4. **Integrações externas devem ter fallback.** Se YouTube/IA falhar, app continua funcionando.
5. **Automações de publicação devem exigir aprovação humana.** Nunca publicar sem revisão.
6. **Analytics devem respeitar LGPD.** Consentimento explícito, dados anonimizados, direito ao esquecimento.
7. **Conteúdo pastoral sensível não deve ser automatizado sem revisão.** IA pode gerar, mas humano revisa.
8. **Cada integração externa deve ter documento de contingência.** O que fazer se a API sair do ar ou mudar?
9. **Roadmap deve ser revisado a cada trimestre.** Prioridades mudam com audiência e feedback.
10. **Nunca fazer push sem validação local (`tsc` + `build`).** Regra já estabelecida no AGENTS.md.
