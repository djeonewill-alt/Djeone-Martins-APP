# AGENDA-010 — Publicação automática controlada da Agenda

## 1. Arquivos alterados/criados

### Criados
- `app/api/cron/agenda-auto-publish/route.ts` — Nova rota de cron para publicação automática.

### Alterados
- `app/admin/agenda/page.tsx` — Adicionado aviso discreto: "Publicação automática: controlada por configuração do servidor."

### Criados (relatório)
- `reports/AGENDA-010-CONTROLLED-AGENDA-AUTO-PUBLISH.md` — Este relatório.

### Não alterados
- `vercel.json` — não foi alterado. A rota existe e pode ser adicionada ao Vercel Cron futuramente.
- Nenhum outro arquivo foi modificado.

---

## 2. Endpoint criado

```
GET /api/cron/agenda-auto-publish
```

- `runtime = 'nodejs'` (mesmo padrão do cron existente)
- Método `GET` (mesmo padrão do cron existente)
- Protegido com `Authorization: Bearer ${CRON_SECRET}`

---

## 3. Como a rota é protegida

Segue exatamente o padrão do cron existente (`app/api/cron/publish-scheduled/route.ts`):

```typescript
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Requer a env `CRON_SECRET` configurada e a requisição com header:
```
Authorization: Bearer <CRON_SECRET>
```

---

## 4. Como a flag AGENDA_AUTO_PUBLISH_ENABLED funciona

A env `AGENDA_AUTO_PUBLISH_ENABLED` controla o comportamento:

- Se **não for exatamente `"true"`** → modo `dry_run`
- Se **for exatamente `"true"`** → modo `publish`

Em dry-run, a rota conta episódios elegíveis mas NÃO atualiza nenhum registro.

---

## 5. Como o dry-run funciona

```json
{
  "ok": true,
  "enabled": false,
  "mode": "dry_run",
  "eligible_count": 5,
  "published_count": 0,
  "has_more": false,
  "checked_at": "..."
}
```

- Busca os mesmos episódios elegíveis
- Retorna a contagem
- **Nunca executa update no banco**

---

## 6. Critérios de elegibilidade

Um episódio só é elegível para publicação automática se TODOS os critérios forem atendidos:

| Campo | Condição |
|---|---|
| `editorial_status` | `'calendar_scheduled'` |
| `status` | `'draft'` |
| `calendar_scheduled_at` | `<= now` (já venceu) |
| `audio_url` | `IS NOT NULL` |
| `title` | `IS NOT NULL` |
| `series_id` | `IS NOT NULL` |

---

## 7. Campos atualizados ao publicar

| Campo | Valor |
|---|---|
| `status` | `'published'` |
| `editorial_status` | `'published'` |
| `published_at` | `new Date().toISOString()` |

**Campos que NÃO são alterados:**
- `calendar_scheduled_at` — preservado como histórico editorial
- `scheduled_publish_at` — não definido
- `title`, `description`, `cover_image_url`, `audio_url`, `series_id` — não alterados
- `episode_number`, `internal_notes` — não alterados

---

## 8. Confirmação de que scheduled_publish_at não é alterado

- A mutation só referencia `status`, `editorial_status` e `published_at`.
- `scheduled_publish_at` não aparece no objeto `update`.

---

## 9. Confirmação de que cron existente não foi quebrado

- `app/api/cron/publish-scheduled/route.ts` — não foi alterado.
- `vercel.json` — não foi alterado.
- A nova rota é independente e não interfere com o cron existente.

---

## 10. Confirmação de que Palavra do Dia/OG/WhatsApp/player/Novo Episódio não foram alterados

- ✅ Cron existente — não alterado.
- ✅ Palavra do Dia — não gerada.
- ✅ OG/preview — não gerado.
- ✅ WhatsApp — não alterado.
- ✅ Player — não alterado.
- ✅ Rota `/ep` público — não alterada.
- ✅ Novo Episódio — não alterado.
- ✅ Dashboard `/admin` — não alterado.

---

## 11. Como testar em modo dry-run

1. Configure `CRON_SECRET` no ambiente (`.env.local`).
2. Certifique-se de que `AGENDA_AUTO_PUBLISH_ENABLED` **não** está como `"true"` (ou não está definida).
3. Tenha pelo menos um episódio agendado com `calendar_scheduled_at` no passado.
4. Execute:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/cron/agenda-auto-publish"
```
5. Resposta esperada:
```json
{
  "ok": true,
  "enabled": false,
  "mode": "dry_run",
  "eligible_count": 1,
  "published_count": 0,
  "has_more": false
}
```
6. Verifique no banco que nenhum episódio foi alterado.

---

## 12. Como ativar publicação real com env

1. Configure no ambiente:
```
AGENDA_AUTO_PUBLISH_ENABLED=true
```
2. Execute o mesmo curl — desta vez os episódios elegíveis serão publicados.
3. Resposta esperada:
```json
{
  "ok": true,
  "enabled": true,
  "mode": "publish",
  "eligible_count": 1,
  "published_count": 1,
  "has_more": false
}
```
4. Para configurar no Vercel Cron, adicione em `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/agenda-auto-publish",
      "schedule": "0 9 * * *"
    }
  ]
}
```

---

## 13. Riscos restantes

- Se muitas datas no calendário estiverem no passado, a primeira execução pode publicar vários episódios de uma vez (limitado a 10 por execução).
- A publicação automática não gera Palavra do Dia nem OG image — o episódio fica público sem esses complementos.
- O aviso na UI é estático — não reflete se a env está ativa ou não (proposital, sem toggle client-side).