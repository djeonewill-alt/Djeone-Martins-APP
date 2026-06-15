# AGENDA-008 — Publicação manual a partir da agenda

## 1. Arquivos alterados/criados

### Alterados
- `app/admin/agenda/page.tsx` — Adicionado botão "Publicar agora" com confirmação e mutation de publicação.

### Criados (relatório)
- `reports/AGENDA-008-MANUAL-PUBLISH-FROM-AGENDA.md` — Este relatório.

---

## 2. Padrão de publicação existente identificado

Baseado na análise do código em `app/admin/episodios/[id]/page.tsx` e `app/admin/novo-episodio/page.tsx`:

| Campo | Valor quando publicado |
|---|---|
| `status` | `'published'` |
| `editorial_status` | `'published'` (seguindo fluxo editorial: `repository` → `calendar_scheduled` → `published`) |
| `published_at` | `new Date().toISOString()` (timestamp atual) |
| `scheduled_publish_at` | Não alterado / permanece `null` |

O projeto também valida que um áudio existe antes de publicar através do fluxo de Novo Episódio. Na agenda, a validação inclui `audio_url`:

```typescript
if (!ep.title || !ep.series_id || !ep.audio_url) {
  setPublishError('Este episódio ainda não tem todos os dados necessários para publicação.')
  return
}
```

O campo `audio_url` foi adicionado ao `select` das queries de busca e ao tipo `EpisodeWithSeries`.

---

## 3. Quais campos são atualizados ao publicar

| Campo | Valor |
|---|---|
| `status` | `'published'` |
| `editorial_status` | `'published'` |
| `published_at` | ISO string atual (`new Date().toISOString()`) |

**Campos que NÃO são alterados:**

- `calendar_scheduled_at` — preservado como histórico editorial
- `scheduled_publish_at` — não definido (permanece null)
- `title`, `description`, `cover_image_url`, `audio_url`, `series_id` — não alterados
- `episode_number`, `internal_notes` — não alterados
- `transcription_text`, `daily_quote_status` — não alterados

---

## 4. Confirmação de que `scheduled_publish_at` não é definido

- A mutation de publicação só referencia `status`, `editorial_status` e `published_at`.
- `scheduled_publish_at` não aparece no objeto `update`.
- O campo permanece exatamente como estava.

---

## 5. Confirmação de que cron/publicação automática não foram alterados

- Nenhum arquivo de cron foi tocado.
- Nenhuma rota de publicação automática foi criada ou modificada.
- A publicação manual é independente do cron e não interage com ele.

---

## 6. Confirmação de que Palavra do Dia/OG/WhatsApp não foram gerados

- Nenhuma chamada a API de geração de conteúdo foi adicionada.
- Nenhuma criação de `daily_quotes`, OG images ou WhatsApp preview.
- O episódio publicado aparece no app com o conteúdo que já possuía.

---

## 7. Confirmação de que Novo Episódio, player e /ep público não foram alterados

- ✅ Novo Episódio (`/admin/novo-episodio`) — não alterado.
- ✅ Palavra do Dia — não alterada.
- ✅ OG/preview — não alterado.
- ✅ Player — não alterado.
- ✅ WhatsApp — não alterado.
- ✅ Rota `/ep` público — não alterada.
- ✅ Favoritos — não alterado.
- ✅ Dashboard `/admin` — não alterado.

---

## 8. Como testar no admin

1. Acesse `/admin/agenda`, faça login.
2. **Pré-requisito:** tenha um episódio agendado (`editorial_status = 'calendar_scheduled'`).
3. Clique no chip do episódio no calendário.
4. No modal, role até a seção **"Publicação"**.
5. Clique em **"Publicar agora"**.
6. Na confirmação, clique **"Sim, publicar agora"**.
7. Verifique:
   - Badge muda para "Publicado" no modal.
   - Botões de editar/devolver/republicar são substituídos por "Fechar" e "Abrir edição".
   - Chip no calendário mostra borda verde e label "Publicado".
8. Confirme no banco (Supabase Table Editor) que:
   - `status = 'published'`
   - `editorial_status = 'published'`
   - `published_at` está preenchido
   - `scheduled_publish_at` continua null
   - `calendar_scheduled_at` preservado

---

## 9. Próximo patch recomendado

**AGENDA-009 — Filtros, busca e organização visual da agenda**

- Adicionar campo de busca/filtro por título ou série.
- Filtro por status (repositório / agendado / publicado).
- Melhorias visuais para grande volume de episódios.