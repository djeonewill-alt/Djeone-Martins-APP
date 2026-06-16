# SERIES-OPEN-001 — Séries abertas/fechadas para gravação de novos episódios

## 1. Arquivos alterados/criados

### Criados
- `supabase/sql/005_series_is_open.sql` — Migração SQL para adicionar campo `is_open`
- `reports/SERIES-OPEN-001-OPEN-CLOSED-SERIES.md` — Este relatório

### Alterados
- `lib/supabase.ts` — Adicionado `is_open?: boolean | null` ao tipo `Series`
- `app/admin/nova-serie/page.tsx` — Adicionado checkbox `is_open` (default true) no formulário de criação
- `app/admin/series/[id]/page.tsx` — Adicionado checkbox `is_open` no formulário de edição, carregamento e salvamento
- `app/admin/series/page.tsx` — Adicionado badge "Aberta"/"Fechada" na listagem
- `app/admin/novo-episodio/page.tsx` — Filtro `.eq('is_open', true)` na query de séries

---

## 2. SQL criado

`supabase/sql/005_series_is_open.sql`:

```sql
ALTER TABLE public.series
ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_series_is_open
ON public.series(is_open);
```

Todas as séries existentes recebem `is_open = true` (default), mantendo o comportamento atual.

---

## 3. Campo adicionado em series

`is_open: boolean NOT NULL DEFAULT true`

- **true**: série aparece no seletor do Novo Episódio
- **false**: série não aparece no seletor do Novo Episódio

---

## 4. Onde o controle aberta/fechada foi adicionado no admin

### Criação de série (`/admin/nova-serie`)
- Checkbox "Série aberta para novos episódios" na coluna "Destaque"
- Texto de ajuda: "Séries fechadas não aparecem na tela de Novo Episódio."
- Default: marcado (aberta)

### Edição de série (`/admin/series/[id]`)
- Mesmo checkbox na coluna "Destaque"
- Carrega o valor atual do banco (`is_open: data.is_open !== false`)
- Salva o valor no `UPDATE`

### Listagem de séries (`/admin/series`)
- Badge "Aberta" (blue) para `is_open !== false`
- Badge "Fechada" (slate) para `is_open === false`

---

## 5. Como o Novo Episódio filtra séries abertas

A query em `loadSeries()` no `novo-episodio/page.tsx` foi alterada de:

```ts
const { data, error } = await supabase
  .from('series')
  .select('id, title, cover_image_url')
  .order('created_at', { ascending: false })
```

Para:

```ts
const { data, error } = await supabase
  .from('series')
  .select('id, title, cover_image_url')
  .eq('is_open', true)
  .order('created_at', { ascending: false })
```

Se não houver séries abertas, o select exibirá apenas a option "Selecione a série..." vazia. O próximo número automático não será acionado.

---

## 6. Confirmações

### Séries fechadas continuam existindo e não são apagadas
✅ O campo `is_open` é apenas um filtro visual. Nenhum dado é removido.

### Catálogo público não foi alterado
✅ Nenhuma rota pública (`/ep`, listagens públicas, player) foi modificada. Apenas o admin de Novo Episódio filtra por `is_open`.

### Agenda/publicação/cron/OG/player/Palavra não foram alterados
✅ Nenhum desses sistemas foi tocado. A mudança é estritamente no admin de séries e no fluxo de criação de episódio.

---

## 7. Como testar

1. Rodar o SQL `supabase/sql/005_series_is_open.sql` no banco.
2. Acessar `/admin/series` — verificar que todas as séries têm badge "Aberta".
3. Editar uma série — desmarcar "Série aberta para novos episódios" e salvar.
4. Verificar na listagem que a badge mudou para "Fechada".
5. Acessar `/admin/novo-episodio` — a série fechada não aparece no select.
6. Criar uma nova série em `/admin/nova-serie` — checkbox aparece marcado.
7. Salvar e verificar que aparece como "Aberta" na listagem e disponível no Novo Episódio.

---

## 8. Riscos restantes

1. **SQL precisa ser executado manualmente**: O patch não tem migração automática. Execute o SQL antes de usar.
2. **Séries fechadas em fluxos de edição**: Se um episódio já existente pertence a uma série fechada, a tela de edição de episódio (`/admin/episodios/[id]`) pode precisar mostrar a série mesmo fechada. Isso não foi alterado neste patch — apenas o Novo Episódio filtra.
3. **UX sem séries abertas**: Se todas as séries forem fechadas, o select fica vazio. O usuário precisa abrir uma série para criar episódios. Pode ser confuso inicialmente.

## Validação
- `npx tsc --noEmit`: ✅ Passou sem erros
- `npm run build`: ✅ Build bem-sucedido