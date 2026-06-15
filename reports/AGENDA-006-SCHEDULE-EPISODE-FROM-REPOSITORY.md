# AGENDA-006 — Agendar episódio do repositório clicando no calendário

## 1. Arquivos alterados/criados

### Alterados
- `app/admin/agenda/page.tsx` — Adicionado modal de agendamento e mutation client-side.

### Criados (relatório)
- `reports/AGENDA-006-SCHEDULE-EPISODE-FROM-REPOSITORY.md` — Este relatório.

---

## 2. Como funciona o clique no dia

1. O admin clica em qualquer dia do calendário (somente dias do mês atual).
2. Um **modal** é aberto com título "Agendar episódio", mostrando a data selecionada.
3. Se não houver episódios no repositório, o modal exibe:
   > "Não há episódios no repositório para agendar."
4. Se houver, o modal exibe:
   - **Select** com episódios do repositório (título, série, número).
   - **Input type="time"**, padrão `07:00`.
   - Aviso de conflito se já existir episódio no mesmo horário (não bloqueante).
   - Botão "Agendar episódio" e "Cancelar".

---

## 3. Como o episódio é escolhido

- O select é populado com `repositoryEpisodes` (estado local, filtrado por `editorial_status = 'repository'`).
- O primeiro episódio da lista vem pré-selecionado.
- O admin pode trocar livremente antes de confirmar.

---

## 4. Como o horário é salvo

O timestamp é montado manualmente no formato ISO com offset `-03:00` (horário de São Paulo):

```
{ano}-{mês}-{dia}T{horas}:{minutos}:00-03:00
```

Exemplo:
- Data selecionada: 18/06/2026, horário 07:00
- Valor salvo: `2026-06-18T07:00:00-03:00`

**Não usa UTC puro. Não usa `scheduled_publish_at`.**

---

## 5. Quais campos são atualizados

| Campo | Valor |
|---|---|
| `editorial_status` | `'calendar_scheduled'` |
| `calendar_scheduled_at` | ISO string com offset `-03:00` |

**Nenhum outro campo é alterado.** Especificamente:
- `status` permanece `'draft'`
- `scheduled_publish_at` não é tocado
- `internal_notes` preservado
- `title`, `description`, `cover_image_url` etc. não são alterados

A mutation é feita via Supabase client-side (`.update()`), protegida com filtro `.eq('editorial_status', 'repository')` para garantir que só episódios no repositório sejam afetados.

---

## 6. Confirmação de que `scheduled_publish_at` não é alterado

- A mutation only updates `editorial_status` and `calendar_scheduled_at`.
- `scheduled_publish_at` is never referenced in the update call.

---

## 7. Confirmação de que cron/publicação automática não foram alterados

- Nenhum arquivo de cron foi tocado.
- Nenhuma rota de publicação automática foi criada ou modificada.
- O agendamento editorial (`calendar_scheduled_at`) é um campo de organização interna, separado do `scheduled_publish_at` usado pelo cron.

---

## 8. Confirmação de que outros módulos não foram alterados

- ✅ Novo Episódio (`/admin/novo-episodio`) — não alterado.
- ✅ Palavra do Dia — não alterada.
- ✅ OG/preview — não alterado.
- ✅ Player — não alterado.
- ✅ WhatsApp — não alterado.
- ✅ Rota `/ep` público — não alterada.
- ✅ Favoritos — não alterado.
- ✅ Build — sucesso, zero erros TypeScript.

---

## 9. Como testar no admin

1. Acesse `/admin/agenda` e faça login.
2. **Pré-requisito:** tenha pelo menos um episódio com `editorial_status = 'repository'` (criado via "Salvar no repositório" em Novo Episódio).
3. Clique em um dia do calendário.
4. No modal, selecione o episódio desejado e ajuste o horário se necessário.
5. Clique em **"Agendar episódio"**.
6. Confirme que:
   - O episódio some da lista lateral "Repositório".
   - Aparece como chip no dia correspondente do calendário.
   - Mensagem de sucesso aparece.
7. Verifique no banco (via Supabase Table Editor) que `editorial_status = 'calendar_scheduled'` e `calendar_scheduled_at` foi preenchido.
8. Clique em outro dia quando o repositório estiver vazio — deve mostrar "Não há episódios no repositório para agendar."
9. Agende dois episódios no mesmo dia e horário — o aviso de conflito deve aparecer, mas o agendamento ainda funciona.

---

## 10. Próximo patch recomendado

**AGENDA-007 — Editar/remover agendamento e devolver episódio ao repositório**

- Clicar em chip do calendário para editar ou remover agendamento.
- Ação de devolver episódio ao repositório (`editorial_status = 'repository'`, `calendar_scheduled_at = null`).
- Confirmar que `scheduled_publish_at` e demais campos permanecem intactos.