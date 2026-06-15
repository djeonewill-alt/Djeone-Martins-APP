# AGENDA-003 — Guard de visibilidade pública

Data: 15 de junho de 2026

## 1. Arquivos alterados

- `lib/episodes/publicVisibility.ts`
- `components/tabs/TabSeries.tsx`
- `components/tabs/TabHoje.tsx`
- `components/tabs/favorites/TabFavoritos.tsx`
- `app/ep/[id]/page.tsx`
- `app/ep/[id]/layout.tsx`
- `app/api/og/episode/[id]/route.tsx`
- `reports/AGENDA-003-PUBLIC-VISIBILITY-GUARD.md`

## 2. Onde o filtro foi aplicado

O helper central exporta:

- `PUBLIC_EPISODE_EDITORIAL_FILTER`, usado nas queries Supabase e REST;
- `isPublicEpisodeVisible`, usado como verificação adicional nos dados carregados.

A regra aplicada é:

```text
editorial_status IS NULL
OR editorial_status = 'published'
```

O filtro foi incluído:

- na contagem pública de episódios por podcast;
- na lista pública de episódios de um podcast;
- na busca do episódio da tela Hoje;
- na busca dos episódios favoritados;
- na página pública `/ep/[id]`;
- no metadata de `/ep/[id]`;
- na imagem OG pública de episódio.

## 3. Compatibilidade com episódios legados

Episódios antigos continuam visíveis porque `editorial_status IS NULL` faz parte da regra pública.

Os filtros preexistentes de `status`, `show_on_today`, série e ordenação foram preservados. O patch apenas acrescenta a barreira editorial.

## 4. Estados internos ocultos

Episódios com qualquer valor editorial diferente de `published` são excluídos das consultas públicas. Isso inclui:

- `repository`;
- `calendar_scheduled`;
- `draft`;
- `archived`.

## 5. Acesso direto por `/ep/[id]`

A página pública e seu metadata agora filtram o episódio antes de retorná-lo. Um episódio interno cai no comportamento já existente de “Episódio não encontrado”.

## 6. Favoritos

A consulta de Favoritos agora aplica o filtro editorial no Supabase. Há também uma verificação local com `isPublicEpisodeVisible` antes de preencher a lista.

Um favorito continua armazenado, mas não é exibido enquanto o episódio estiver em estado editorial interno.

## 7. Áreas não alteradas

As telas administrativas continuam sem filtro editorial e podem carregar todos os episódios.

Não foram alterados:

- cron e publicação automática;
- SQL ou dados;
- fluxo de Novo Episódio;
- edição administrativa de episódio;
- player;
- R2;
- WhatsApp;
- OG de Palavra do Dia;
- página Palavra do Dia.

A rota OG de episódio foi alterada somente porque o diagnóstico confirmou que ela buscava título e capa diretamente por ID, expondo dados de episódios internos mesmo quando a página estivesse bloqueada.

## 8. Próximo patch recomendado

AGENDA-004 — adicionar o botão “Salvar no repositório” em Novo Episódio, gravando o estado editorial interno sem reutilizar `scheduled_publish_at` e sem acionar o cron.

## 9. Observações de implantação e risco residual

A migration `supabase/sql/004_episode_editorial_schedule_fields.sql` deve estar aplicada no Supabase antes do deploy deste patch. Caso a coluna `editorial_status` ainda não exista no ambiente, as novas consultas públicas falharão.

Palavra do Dia foi mantida fora do escopo, conforme solicitado. Se uma `daily_quote` publicada for associada manualmente a um episódio editorial interno, a relação aninhada ainda poderá fornecer metadados desse episódio nas telas de Palavra do Dia. Esse estado inconsistente deve ser evitado e auditado em patch específico, sem ampliar o escopo deste guard.
