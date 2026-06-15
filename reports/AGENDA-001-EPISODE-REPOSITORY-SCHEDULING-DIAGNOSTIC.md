# AGENDA-001 — Diagnóstico do Repositório e Agenda de Episódios

Data do diagnóstico: 15 de junho de 2026
Projeto: App Djeone Martins / Devocional Diário
Escopo: documentação do comportamento atual, sem alteração de código, banco ou fluxo público.

## Resumo executivo

O app já possui três conceitos de publicação na coluna `episodes.status`: `draft`, `scheduled` e `published`. Também já possui `scheduled_publish_at` e uma rota cron ativa que publica automaticamente episódios vencidos. Portanto, a futura agenda editorial **não deve reutilizar `scheduled_publish_at`**, porque isso ligaria a nova agenda à automação atual antes da fase AGENDA-007.

O caminho mais seguro é separar:

- estado público atual: `status`, `published_at`, `show_on_today`;
- automação legada: `scheduled_publish_at` + `/api/cron/publish-scheduled`;
- agenda editorial futura: `editorial_status` + um novo `scheduled_at`, sem efeito público e sem consumo pelo cron.

Há dois fluxos de criação de episódio:

1. `/admin/novo-episodio`: fluxo completo, com gravação/upload, conversão, transcrição, metadados, capa, Palavra do Dia, rascunho, publicação imediata e agendamento automático.
2. `/admin/series/[id]/episodios/novo`: fluxo simplificado dentro do podcast, com upload, transcrição, capa, rascunho ou publicação imediata, sem agenda e sem Palavra do Dia.

Os catálogos de podcasts filtram corretamente `status = 'published'`. A tela Hoje exige `show_on_today = true`, mas também aceita episódios com `status` nulo por compatibilidade legada. Já `/ep/[id]`, seu metadata/OG e Favoritos buscam episódios por ID sem filtro de publicação no cliente. Isso é o principal risco de exposição antecipada a tratar antes de considerar a agenda totalmente isolada.

## 1. Estrutura atual de episódios

### 1.1 Tipo `Episode` em `lib/supabase.ts`

O tipo está em `lib/supabase.ts:88` e contém:

| Campo | Tipo atual |
| --- | --- |
| `id` | `string` |
| `series_id` | `string \| null` opcional |
| `title` | `string` |
| `description` | `string \| null` opcional |
| `bible_reference` | `string \| null` opcional |
| `audio_url` | `string` |
| `audio_url_compatible` | `string \| null` opcional |
| `audio_compatible_type` | `string \| null` opcional |
| `duration_seconds` | `number \| null` opcional |
| `episode_number` | `number \| null` opcional |
| `published_at` | `string \| null` opcional |
| `created_at` | `string \| null` opcional |
| `cover_image_url` | `string \| null` opcional |
| `og_image_url` | `string \| null` opcional |
| `status` | `string \| null` opcional |
| `is_preview` | `boolean \| null` opcional |
| `scheduled_publish_at` | `string \| null` opcional |
| `transcription_text` | `string \| null` opcional |
| `transcription_status` | `string \| null` opcional |
| `transcription_error` | `string \| null` opcional |
| `transcription_generated_at` | `string \| null` opcional |
| `daily_quote_status` | `string \| null` opcional |
| `daily_quote_suggestions` | `DailyQuoteSuggestion[] \| null` opcional |
| `daily_quote_generated_at` | `string \| null` opcional |
| `transcription_segments` | `TranscriptionSegment[] \| null` opcional |
| `series` | relação carregada, não coluna |

Inconsistências relevantes:

- `audio_url` é obrigatório no tipo, mas o fluxo completo grava `null` quando salva um rascunho sem áudio (`app/admin/novo-episodio/page.tsx:1661`).
- `status` é `string`, sem união de valores válidos.
- O tipo não inclui campos usados em runtime: `audio_original_url`, `audio_original_type`, `show_on_today` e os campos `transcription_words_*`.
- O campo de agenda existente chama-se `scheduled_publish_at`; não há `scheduled_at`, `editorial_status`, `internal_notes` ou `calendar_color`.

### 1.2 Campos que existem ou parecem existir em `episodes`

O repositório não contém o DDL completo da tabela `episodes`. A única migração versionada específica da tabela adiciona `og_image_url` (`supabase/sql/002_episodes_og_image_url.sql:1`). Assim, a lista abaixo é inferida de `select`, `insert` e `update` executados pelo app:

- Identidade e organização: `id`, `series_id`, `episode_number`.
- Conteúdo: `title`, `description`, `bible_reference`, `cover_image_url`, `og_image_url`.
- Áudio: `audio_url`, `audio_original_url`, `audio_original_type`, `audio_url_compatible`, `audio_compatible_type`, `duration_seconds`.
- Publicação: `status`, `published_at`, `scheduled_publish_at`, `show_on_today`, `is_preview`, `created_at`.
- Transcrição: `transcription_text`, `transcription_segments`, `transcription_status`, `transcription_error`, `transcription_generated_at`.
- Timestamps por palavra: `transcription_words_url`, `transcription_words_key`, `transcription_words_count`, `transcription_words_generated_at`, `transcription_words_status`, `transcription_words_error`.
- Conteúdo derivado: `daily_quote_status`, `daily_quote_suggestions`, `daily_quote_generated_at`.

Evidências principais:

- insert completo: `app/admin/novo-episodio/page.tsx:1652`;
- insert simplificado: `app/admin/series/[id]/episodios/novo/page.tsx:366`;
- edição: `app/admin/episodios/[id]/page.tsx:215`;
- Central de Conteúdo: `app/admin/central-conteudo/page.tsx:201`;
- timestamps avançados: `app/api/ai/persist-transcription-words/route.ts:181`;
- publicação automática: `app/api/cron/publish-scheduled/route.ts:190`.

### 1.3 Como os estados são diferenciados hoje

| Estado observado | Regra atual |
| --- | --- |
| Rascunho | `status = 'draft'` |
| Agendado automático | `status = 'scheduled'` e `scheduled_publish_at` preenchido |
| Publicado | `status = 'published'` |
| Legado publicado | em Hoje, `status is null` também é aceito se `show_on_today = true` |
| Destaque na tela Hoje | `show_on_today = true` |
| Degustativo de podcast premium | `is_preview = true`; não é um estado de publicação |
| Oculto/arquivado | não foi encontrado status dedicado |

Não existe separação formal entre estado editorial e estado público. `status` atende aos dois papéis, enquanto `scheduled_publish_at` também funciona como gatilho técnico para automação.

## 2. Fluxo atual de Novo Episódio

### 2.1 Fluxo completo: `/admin/novo-episodio`

Arquivos principais:

- `app/admin/novo-episodio/page.tsx`;
- `components/recorder/AudioRecorder.tsx`;
- `app/api/upload-audio/route.ts`;
- `app/api/r2/presigned-upload/route.ts`;
- `app/api/admin/audio/convert-to-mp3/route.ts`;
- `app/api/ai/transcribe-audio/route.ts`;
- `app/api/ai/generate-episode-metadata/route.ts`;
- `app/api/ai/persist-transcription-words/route.ts`;
- APIs de imagem e Palavra do Dia usadas pelo mesmo formulário.

Sequência:

1. O áudio é gravado ou selecionado.
2. O upload ocorre imediatamente, antes de existir linha em `episodes`.
   - Gravação: upload direto ao R2 com URL pré-assinada (`page.tsx:641` e `page.tsx:707`).
   - Arquivo: `/api/upload-audio` (`page.tsx:803`).
3. A versão MP3 compatível pode ser gerada antes de publicar/agendar.
4. A transcrição só é gerada quando o administrador aciona um botão (`page.tsx:1124`) ou o fluxo combinado de transcrição e frases.
5. Título e descrição podem ser digitados manualmente ou preenchidos por `/api/ai/generate-episode-metadata` a partir da transcrição (`page.tsx:1167`).
6. A capa pode usar a capa da série, receber upload próprio ou ser preparada pelos recursos de geração existentes.
7. A linha em `episodes` só é criada no submit (`page.tsx:1595` e `page.tsx:1652`).
8. Depois da criação, timestamps avançados pendentes podem ser persistidos com o ID definitivo.

Onde acontece “publicar”:

- Sem data agendada, o select oferece `draft` ou `published` (`page.tsx:3049`).
- Com data, o insert força `status = 'scheduled'` e preenche `scheduled_publish_at` (`page.tsx:1668`).
- A publicação futura é feita pela rota cron, não pela tela.

Salvar sem publicar:

- Sim. Há “Salvar como Rascunho”.
- Neste fluxo, rascunho pode ser salvo sem áudio; áudio só é obrigatório para publicar ou agendar.
- O upload de áudio/capa acontece antes do submit. Cancelar depois do upload pode deixar arquivo sem linha correspondente no banco.

Observação importante:

- O insert principal não grava `published_at` ao escolher “Publicar Agora” e não grava `show_on_today`. Esses valores dependem de defaults/triggers não versionados ou permanecem nulos.
- O mesmo fluxo cria/atualiza Palavra do Dia e pode gerar imagem de compartilhamento. Isso deve continuar fora do escopo da agenda.

### 2.2 Fluxo simplificado: `/admin/series/[id]/episodios/novo`

Arquivo principal:

- `app/admin/series/[id]/episodios/novo/page.tsx`.

Sequência:

1. Carrega o podcast e sugere o próximo `episode_number`.
2. Faz upload de áudio por `/api/upload-audio` (`page.tsx:109`).
3. Transcreve sob ação do usuário (`page.tsx:200`).
4. Após transcrever, tenta gerar título e descrição automaticamente (`page.tsx:232`).
5. Faz upload opcional da capa.
6. Insere em `episodes` no submit (`page.tsx:347`).

Diferenças:

- Exige áudio mesmo para rascunho.
- Só oferece `draft` ou `published`.
- Não agenda.
- Não cria Palavra do Dia.
- Define `show_on_today = false`.
- Define `published_at` ao publicar (`page.tsx:377`).

## 3. Fluxo atual de edição

Arquivos:

- listagem por podcast: `app/admin/series/[id]/episodios/page.tsx`;
- edição: `app/admin/episodios/[id]/page.tsx`;
- rota antiga de entrada: `app/admin/episodios/page.tsx`.

Campos editáveis:

- título;
- descrição;
- referência bíblica;
- número do episódio;
- status;
- `is_preview`;
- texto da transcrição;
- capa.

O áudio é apenas reproduzido; não há troca do áudio nesta tela.

Publicação:

- O select oferece somente `draft` e `published`.
- Ao mudar para `published`, preserva `published_at` existente ou grava o horário atual.
- Ao mudar para `draft`, zera `published_at`.
- Não carrega nem altera `scheduled_publish_at`.
- Não carrega nem altera `show_on_today`.

Riscos ao reaproveitar a tela para agenda:

1. Um episódio agendado possui `status = 'scheduled'`, mas esse valor não existe nas opções do select.
2. Alterar um episódio agendado para `draft` não limpa `scheduled_publish_at`.
3. O cron seleciona tanto `scheduled` quanto `draft` com `scheduled_publish_at` vencido. Portanto, “voltar para rascunho” sem limpar a data ainda pode publicar automaticamente.
4. A tela mistura edição editorial, publicação, degustativo e preview da Palavra do Dia. Acrescentar agenda nela aumentaria o acoplamento com áreas explicitamente fora deste patch.
5. A lista por podcast mostra todos os estados, mas não exibe `scheduled_publish_at`, então o administrador não vê a data do agendamento ali.

Conclusão: a tela pode continuar como editora de conteúdo, mas a agenda deve ter ações próprias e explícitas. Qualquer integração futura deve limpar/atualizar os campos de agenda de forma atômica e não depender do select atual.

## 4. Exibição pública

### 4.1 Catálogo e podcasts

`components/tabs/TabSeries.tsx`:

- conta episódios por série com `status = 'published'` (`TabSeries.tsx:739`);
- carrega a lista de episódios da série com `status = 'published'` (`TabSeries.tsx:782`);
- não consulta `scheduled_publish_at`.

Resultado: rascunhos e agendados não aparecem no catálogo normal.

### 4.2 Tela Hoje

`components/tabs/TabHoje.tsx:69`:

- aceita `status = 'published'` **ou** `status is null`;
- exige `show_on_today = true`;
- ordena primeiro por `published_at` e depois por `created_at`;
- pega apenas um episódio.

Resultado: `draft` e `scheduled` são bloqueados, mas linhas legadas sem status podem aparecer.

### 4.3 Página `/ep/[id]`

`app/ep/[id]/page.tsx:230` busca por `id` e não filtra:

- `status`;
- `published_at`;
- `scheduled_publish_at`;
- `show_on_today`.

O metadata em `app/ep/[id]/layout.tsx:11` também busca somente por ID. A rota de OG de episódio faz lookup direto por ID. Nenhum desses arquivos foi alterado neste patch.

Resultado: quem souber o ID pode tentar abrir um rascunho ou agendado diretamente, sujeito apenas às políticas reais do Supabase, que não estão versionadas neste repositório.

### 4.4 Favoritos

`components/tabs/favorites/TabFavoritos.tsx:42` carrega os IDs favoritos e depois busca `episodes` sem filtro de status.

Resultado: um episódio antes favoritado pode continuar aparecendo se depois for despublicado/agendado. Também não há uma segunda barreira pública no cliente.

### 4.5 Regra futura mais segura

Antes de ligar a agenda, padronizar uma regra pública central:

```text
status = 'published'
AND published_at IS NOT NULL
AND published_at <= now()
```

Para Hoje, acrescentar:

```text
AND show_on_today = true
```

Aplicação recomendada:

1. auditar e corrigir registros publicados com `published_at` nulo;
2. remover gradualmente a exceção `status is null`;
3. centralizar a regra em view/RPC ou RLS do Supabase, além dos filtros de interface;
4. aplicar a mesma regra a catálogo, Hoje, Favoritos, `/ep/[id]`, metadata e OG em patch próprio.

Não é seguro alterar esses filtros dentro do AGENDA-002 sem uma auditoria dos dados legados, pois isso pode ocultar conteúdo hoje visível.

## 5. Menu/Admin

Rotas e pontos atuais:

- dashboard e cards: `app/admin/page.tsx`;
- “Novo episódio”: card em `app/admin/page.tsx:233`;
- “Central de Conteúdo”: card em `app/admin/page.tsx:240`;
- “Podcasts”: card em `app/admin/page.tsx:247`;
- gestão por podcast: `app/admin/series/[id]/episodios/page.tsx`;
- o dashboard já calcula “Agendados” usando `scheduled_publish_at >= now()` (`app/admin/page.tsx:149`).

Melhor local futuro:

- rota: `/admin/agenda`;
- entrada: novo card no array `actionCards` do dashboard;
- posição visual: logo após “Novo episódio” e antes de “Central de Conteúdo”.

Nome recomendado:

- **Agenda de Episódios**.

Motivo: “Agenda” é curto, mas genérico; “Repositório e Agenda” descreve duas funções, porém fica longo no card. “Agenda de Episódios” é claro no menu, e a página pode usar o subtítulo “Repositório e agenda editorial”.

## 6. Modelo futuro recomendado

### Princípio

Não reutilizar `scheduled_publish_at` na nova agenda manual. Esse campo já é consumido pelo cron e causa publicação automática.

### Estado mínimo proposto

| Situação | `status` público | `editorial_status` | `scheduled_at` | `scheduled_publish_at` legado |
| --- | --- | --- | --- | --- |
| No repositório | `draft` | `repository` | `null` | `null` |
| Na agenda manual | `draft` | `scheduled` | data/hora | `null` |
| Pronto para ação manual | `draft` | `ready` opcional | data/hora passada | `null` |
| Publicado manualmente | `published` | `published` | preservado para histórico ou nulo | `null` |
| Agendamento automático atual | `scheduled`/`draft` | `legacy_scheduled` | `null` | data/hora |

### Operações

- Salvar no repositório: criar/atualizar com `status = 'draft'`, `editorial_status = 'repository'`, sem data.
- Listar aguardando agendamento: `editorial_status = 'repository'`.
- Agenda mensal: consultar `editorial_status = 'scheduled'` no intervalo de `scheduled_at`.
- Agendar: atualizar somente `editorial_status` e `scheduled_at`.
- Card do calendário: join com `series`; mostrar série, `episode_number` e título.
- Remover da agenda: voltar para `repository` e zerar `scheduled_at`.
- Publicar manualmente: ação confirmada que define `status = 'published'`, `published_at = now()` e `editorial_status = 'published'`.
- `show_on_today` deve ser uma escolha explícita de publicação, não um efeito implícito da agenda.
- Publicação automática: somente em fase futura e após decidir se o cron legado será removido, migrado ou mantido separado.

### Cor do calendário

Não adicionar `calendar_color` no primeiro patch. É possível derivar cor de `series_id` ou usar uma paleta por série no cliente. Persistir cor só faz sentido se houver requisito editorial para cor manual.

## 7. SQL futuro sugerido — não aplicar neste patch

`published_at` já parece existir e não deve ser recriado. Sugestão ilustrativa para AGENDA-002:

```sql
alter table public.episodes
  add column if not exists editorial_status text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists internal_notes text;

update public.episodes
set editorial_status = case
  when status = 'published' then 'published'
  when scheduled_publish_at is not null then 'legacy_scheduled'
  else 'repository'
end
where editorial_status is null;

alter table public.episodes
  alter column editorial_status set default 'repository',
  alter column editorial_status set not null;

alter table public.episodes
  add constraint episodes_editorial_status_check
  check (
    editorial_status in (
      'repository',
      'scheduled',
      'ready',
      'published',
      'archived',
      'legacy_scheduled'
    )
  );

create index if not exists idx_episodes_editorial_schedule
  on public.episodes (editorial_status, scheduled_at);

create index if not exists idx_episodes_repository_queue
  on public.episodes (created_at desc)
  where editorial_status = 'repository';

create index if not exists idx_episodes_series_number
  on public.episodes (series_id, episode_number);
```

Cuidados:

- verificar antes se já existe constraint de status no banco;
- tornar a criação da constraint idempotente na migração real;
- não copiar `scheduled_publish_at` para `scheduled_at` automaticamente;
- identificar os agendamentos legados como `legacy_scheduled`;
- não criar trigger de publicação;
- não criar índice único em `(series_id, episode_number)` sem auditar duplicidades;
- considerar `updated_at` apenas se a tabela já tiver padrão equivalente.

## 8. Plano de patches futuros

### AGENDA-002 — Campos, SQL e tipos

- adicionar `editorial_status`, `scheduled_at` e `internal_notes`;
- atualizar o tipo `Episode`, incluindo também os campos já usados mas ausentes;
- tipar estados editoriais;
- backfill conservador;
- criar índices;
- não alterar queries públicas;
- não conectar `scheduled_at` ao cron.

### AGENDA-003 — Salvar no repositório

- adicionar ação explícita “Salvar no repositório” no fluxo completo;
- persistir `status = 'draft'`, `editorial_status = 'repository'`;
- não preencher `scheduled_publish_at`;
- manter áudio, transcrição, Palavra do Dia, OG e preview com o comportamento atual;
- decidir separadamente se o fluxo simplificado também recebe a ação.

### AGENDA-004 — `/admin/agenda` somente leitura

- card no dashboard;
- lista de repositório;
- calendário mensal;
- exibir agendamentos editoriais e, com badge distinto, agendamentos automáticos legados;
- nenhuma mutação e nenhuma publicação.

### AGENDA-005 — Agendar clicando em um dia

- selecionar episódio do repositório;
- escolher data e horário;
- gravar `editorial_status = 'scheduled'` e `scheduled_at`;
- validar horário e timezone `America/Sao_Paulo`;
- impedir uso acidental de `scheduled_publish_at`.

### AGENDA-006 — Editar, remover e publicar manualmente

- mover data/hora;
- remover da agenda;
- abrir edição de conteúdo;
- publicar manualmente com confirmação;
- decidir explicitamente `show_on_today`;
- atualizar `published_at`;
- proteger as operações com atualização atômica e validação de estado.

### AGENDA-007 — Automação futura

- primeiro auditar a automação já existente;
- decidir se `/api/cron/publish-scheduled` será substituída, desativada ou mantida para conteúdo legado;
- só então permitir que a nova agenda alimente uma automação;
- adicionar idempotência, logs, retries, timezone, frequência compatível com horários arbitrários e testes;
- separar publicação de episódio, Palavra do Dia e push para evitar efeitos parciais.

## Achados críticos para decisão

1. Já existe publicação automática ativa em `vercel.json`, diariamente às `09:00 UTC`, pela rota `/api/cron/publish-scheduled`.
2. O cron publica episódios `scheduled` **ou `draft`** com `scheduled_publish_at` vencido.
3. O cron limpa a data, define `published_at`, ativa `show_on_today`, publica Palavras do Dia relacionadas e envia push.
4. Como o cron roda uma vez por dia, o horário arbitrário escolhido na UI não garante publicação naquele minuto; ele será processado apenas na próxima execução elegível.
5. O catálogo de séries filtra `published`, mas `/ep/[id]`, metadata e Favoritos não aplicam filtro de publicação no cliente.
6. O fluxo completo e o simplificado gravam publicação de maneiras diferentes.
7. Não há DDL completo nem políticas RLS da tabela `episodes` versionados no repositório.

## Recomendação objetiva para AGENDA-002

Implementar somente a camada editorial separada:

- `editorial_status`;
- `scheduled_at`;
- `internal_notes`;
- tipos e índices;
- backfill que marque agendamentos atuais como `legacy_scheduled`;
- nenhuma trigger;
- nenhuma mudança no cron;
- nenhuma mudança nas consultas públicas;
- nenhuma reutilização de `scheduled_publish_at`.

Essa separação permite construir repositório e calendário sem publicar conteúdo, sem alterar o fluxo público atual e sem acoplar a agenda nova à automação legada.
