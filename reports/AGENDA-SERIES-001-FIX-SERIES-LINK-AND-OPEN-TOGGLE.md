# AGENDA-SERIES-001 — Corrigir série na Agenda e deixar Aberta/Fechada visível

## 1. Arquivos alterados/criados

### Alterados
- `app/admin/agenda/page.tsx` — Corrigido tipo `series` para aceitar objeto e array; adicionada função `getSeriesTitle`; resolvido problema "Sem série"
- `app/admin/series/page.tsx` — Adicionados badges "Aberta"/"Fechada" e botões Fechar/Reabrir série
- `app/admin/novo-episodio/page.tsx` — Já tinha `.eq('is_open', true)` do patch SERIES-OPEN-001

### Criados
- `reports/AGENDA-SERIES-001-FIX-SERIES-LINK-AND-OPEN-TOGGLE.md` — Este relatório

---

## 2. O que causava "SEM SÉRIE"

O problema era duplo:

1. **Tipo do Supabase Join**: O join `series:series_id(title)` pode retornar tanto um **objeto** (quando é has-one) quanto um **array** (quando o tipo genérico assume). O tipo TypeScript declarava apenas `{ title: string | null }[] | null`, o que fazia com que o acesso `ep.series[0]?.title` falhasse silenciosamente quando o Supabase retornava um objeto (não array), resultando em `undefined` → "Sem série".

2. **Tipo `any`**: Para resolver definitivamente, o tipo `series` foi alterado para `any` (com `SeriesJoin = any`), e a função `getSeriesTitle()` usa `Array.isArray()` para detectar o formato real.

---

## 3. Como foi corrigido

### `getSeriesTitle(ep)` — helper robusto
```ts
function getSeriesTitle(ep: EpisodeWithSeries): string {
  if (!ep.series) return 'Sem série'
  if (Array.isArray(ep.series)) {
    return ep.series[0]?.title || 'Sem série'
  }
  return ep.series.title || 'Sem série'
}
```

### Tipo atualizado
```ts
type SeriesJoin = any
type EpisodeWithSeries = {
  // ...
  series: SeriesJoin
  // ...
}
```

### Onde é usado
- `allSeries` (filtro de séries no cabeçalho) — ✅
- Todos os `ep.series[0]?.title` inline no JSX
- Modal de edição e drag confirm

---

## 4. Como abrir/fechar série agora

### Na listagem de séries (`/admin/series`)
- Adicionados botões diretos:
  - **"Fechar série"** (quando `is_open = true`) — com confirmação
  - **"Reabrir série"** (quando `is_open = false`) — sem confirmação
- Badges "Aberta"/"Fechada" já existentes do patch SERIES-OPEN-001

### Comportamento
- Clicar em "Fechar série" → confirma → `UPDATE is_open = false`
- Clicar em "Reabrir série" → `UPDATE is_open = true` direto
- Estado local atualizado sem recarregar a página
- Texto de ajuda: "Séries fechadas não aparecem em Novo Episódio."

---

## 5. Resultado TypeScript

`npx tsc --noEmit --pretty false` — ✅ Passou sem erros

## 6. Resultado build

`npm run build` — ✅ Compilado com sucesso

## 7. Confirmação de que não mexeu em catálogo público/cron/OG/player

- Catálogo público — ✅ NÃO ALTERADO
- Cron — ✅ NÃO ALTERADO
- OG — ✅ NÃO ALTERADO
- Player — ✅ NÃO ALTERADO
- Palavra do Dia — ✅ NÃO ALTERADO
- WhatsApp/R2 — ✅ NÃO ALTERADO
- Mutations da Agenda — ✅ NÃO ALTERADAS