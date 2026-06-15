# AGENDA-002 — Campos editoriais de episódios

Data: 15 de junho de 2026

## 1. Campos adicionados

A migration `supabase/sql/004_episode_editorial_schedule_fields.sql` adiciona à tabela `public.episodes`:

- `editorial_status text`: estado editorial futuro do episódio;
- `calendar_scheduled_at timestamptz`: posição do episódio na agenda editorial;
- `internal_notes text`: observações internas.

Também foram criados índices parciais para `editorial_status` e `calendar_scheduled_at`, considerando apenas valores não nulos.

Os mesmos três campos foram adicionados como opcionais e anuláveis ao tipo `Episode` em `lib/supabase.ts`.

Não foram definidos default, backfill, constraint ou trigger. Assim, registros antigos permanecem com os novos campos nulos.

## 2. Por que `calendar_scheduled_at`

O nome `calendar_scheduled_at` diferencia explicitamente a data da agenda editorial do campo legado `scheduled_publish_at`.

`calendar_scheduled_at` apenas representará a posição visual e editorial de um episódio no calendário. Ele não possui efeito de publicação e não é consumido pelo cron.

## 3. Cron e publicação automática

O campo `scheduled_publish_at`, a rota `/api/cron/publish-scheduled` e `vercel.json` não foram alterados.

A migration não cria trigger nem conecta `calendar_scheduled_at` a qualquer automação. A lógica atual de publicação permanece intacta.

## 4. Comportamento público

Nenhuma rota pública, consulta pública, filtro de catálogo, tela Hoje, Favoritos, página de episódio, OG, player, Palavra do Dia ou preview de áudio foi alterado.

Como `editorial_status` permanece nulo nos registros legados e ainda não é usado por nenhuma consulta, este patch não modifica visibilidade ou comportamento público.

## 5. Próximo patch recomendado

O AGENDA-003 deve implementar primeiro um guard de visibilidade pública consistente para impedir que episódios do repositório sejam acessados antes da publicação.

Esse guard deve cobrir especialmente `/ep/[id]`, metadata/OG e Favoritos. Somente depois dessa proteção deve ser criado o botão “Salvar no repositório”.
