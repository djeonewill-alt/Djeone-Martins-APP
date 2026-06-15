# AGENDA-005 — Tela inicial /admin/agenda com calendário mensal e repositório

## 1. Arquivos alterados/criados

### Criados
- `app/admin/agenda/page.tsx` — Página principal da Agenda administrativa.

### Alterados
- `app/admin/page.tsx` — Adicionado card "Agenda" nas ações rápidas do dashboard.

### Criados (relatório)
- `reports/AGENDA-005-ADMIN-AGENDA-CALENDAR-READONLY.md` — Este relatório.

---

## 2. Como acessar a página

1. Acesse `/admin` e faça login com a senha administrativa.
2. No grid de **Ações rápidas**, clique no card **"Agenda"** (ícone 📅).
3. Ou acesse diretamente: `/admin/agenda`.

---

## 3. Queries utilizadas

### Query 1 — Repositório
```sql
SELECT
  id, title, episode_number, series_id,
  cover_image_url, status, editorial_status,
  calendar_scheduled_at, created_at,
  series:series_id(title)
FROM episodes
WHERE editorial_status = 'repository'
ORDER BY created_at DESC
```

### Query 2 — Agendados no calendário
```sql
SELECT
  id, title, episode_number, series_id,
  cover_image_url, status, editorial_status,
  calendar_scheduled_at, created_at,
  series:series_id(title)
FROM episodes
WHERE calendar_scheduled_at IS NOT NULL
ORDER BY calendar_scheduled_at ASC
```

Ambas usam um join relacional do Supabase (`series:series_id(title)`) que retorna um array. O código acessa via `ep.series?.[0]?.title`.

---

## 4. Como episódios do repositório são listados

- Buscados com `editorial_status = 'repository'`.
- Exibidos na coluna lateral **"Repositório"** (largura 340px no desktop).
- Cada card exibe:
  - Nome da série e número do episódio.
  - Título do episódio.
  - Data de criação formatada (pt-BR).
  - Badge **"No repositório"**.
  - Link **"Abrir edição"** → `/admin/episodios/{id}`.
- Se não houver episódios: exibe mensagem "Não há episódios aguardando agendamento."
- Lista com scroll vertical se houver muitos itens (max-height: 70vh).

---

## 5. Como episódios com calendar_scheduled_at aparecem no calendário

- Buscados com `calendar_scheduled_at IS NOT NULL`.
- Mapeados para dias específicos na grade mensal via comparação `isSameDay`.
- Cada célula do calendário exibe:
  - Até **2 chips** com formato: `"Série — Ep. N"` / `"Título curto"`.
  - Se houver mais de 2 no mesmo dia: `"+X episódios"`.
- O calendário é construído manualmente com `Date`/`JS`/`TS`:
  - Grade 7x6 (42 células) com padding de meses adjacentes.
  - Cabeçalho: Dom, Seg, Ter, Qua, Qui, Sex, Sáb.
  - Mês atual destacado; meses anteriores/posteriores com opacidade reduzida.
  - Dia atual destacado com borda azul.
  - Navegação: botões ← → e "Hoje".
- Se não houver episódios agendados: mensagem "Nenhum episódio agendado neste mês."
- Tooltip/hover na célula: "Agendamento será liberado no próximo patch."

---

## 6. Confirmação de que não há mutations

- Nenhum `INSERT`, `UPDATE`, `DELETE` ou chamada a API de mutação.
- Nenhum clique no dia executa qualquer escrita no banco.
- Nenhum modal de agendamento foi implementado.
- Nenhuma rota `POST` ou `PATCH` foi criada.
- Nenhuma alteração em `calendar_scheduled_at` de qualquer episódio.
- A página é exclusivamente **read-only**.

---

## 7. O que não foi alterado

- ✅ Novo Episódio (`/admin/novo-episodio`) — não alterado.
- ✅ Cron/agendador — não alterado.
- ✅ Publicação automática — não alterada.
- ✅ OG/preview — não alterado.
- ✅ Player — não alterado.
- ✅ WhatsApp — não alterado.
- ✅ R2 — não alterado.
- ✅ Palavra do Dia — não alterada.
- ✅ Rota `/ep` público — não alterada.
- ✅ Banco de dados — sem migrations, sem novas colunas, sem novas tabelas.

---

## 8. Próximo patch recomendado

**AGENDA-006 — Clicar no dia e agendar episódio do repositório**

- Implementar modal para selecionar episódio do repositório e atribuir `calendar_scheduled_at`.
- PATCH no banco via server action ou API route.
- Remover placeholder "Agendamento será liberado no próximo patch."