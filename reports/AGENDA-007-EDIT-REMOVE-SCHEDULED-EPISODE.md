# AGENDA-007 — Editar/remover agendamento e devolver ao repositório

## 1. Arquivos alterados/criados

### Alterados
- `app/admin/agenda/page.tsx` — Adicionado modal de edição, devolução ao repositório e clique em chip do calendário.

### Criados (relatório)
- `reports/AGENDA-007-EDIT-REMOVE-SCHEDULED-EPISODE.md` — Este relatório.

---

## 2. Como abrir o modal do episódio agendado

- O admin clica em qualquer chip/épisode já posicionado no calendário.
- O chip agora tem `cursor: pointer` e efeito hover, e o clique abre o modal de edição (não o de agendamento).
- O modal exibe:
  - Título: "Episódio agendado"
  - Título, série e número do episódio
  - Data atual e horário atual
  - Badge "Agendado no calendário"
  - Aviso "Este episódio ainda não está público."
  - Campos para editar data (`type="date"`) e horário (`type="time"`)
  - Ações: "Salvar alteração", "Devolver ao repositório", "Abrir edição", "Cancelar"

---

## 3. Como editar data/horário

- O admin altera a data e/ou horário nos campos.
- Ao clicar em "Salvar alteração", executa mutation client-side:

```typescript
supabase.from('episodes').update({
  calendar_scheduled_at: isoOffset // YYYY-MM-DDTHH:mm:00-03:00
})
.eq('id', ep.id)
.eq('editorial_status', 'calendar_scheduled')
```

- Apenas `calendar_scheduled_at` é atualizado.
- `editorial_status` permanece `'calendar_scheduled'`.
- `status` permanece `'draft'`.
- `scheduled_publish_at` não é alterado.
- Timestamp continua formato ISO com offset `-03:00` (São Paulo).
- Estado local é atualizado imediatamente sem refresh.
- Mensagem de sucesso: "Agendamento atualizado. O episódio ainda não está público."

---

## 4. Como devolver ao repositório

- No modal de edição, o admin clica em "Devolver ao repositório".
- Um sub-modal de confirmação é exibido:
  > "Deseja remover este episódio da agenda e devolver ao repositório?"
- Ao confirmar, executa mutation:

```typescript
supabase.from('episodes').update({
  editorial_status: 'repository',
  calendar_scheduled_at: null,
})
.eq('id', ep.id)
.eq('editorial_status', 'calendar_scheduled')
```

- Apenas `editorial_status` e `calendar_scheduled_at` são alterados.
- `status` permanece `'draft'`.
- `scheduled_publish_at` não é alterado.
- `internal_notes` preservado.
- Após sucesso:
  - Episódio some do calendário.
  - Episódio aparece na lista lateral "Repositório".
  - Modal fecha automaticamente.

---

## 5. Quais campos são atualizados em cada ação

| Ação | `editorial_status` | `calendar_scheduled_at` |
|---|---|---|
| Editar (salvar) | Não alterado (mantém `calendar_scheduled`) | Atualizado |
| Devolver ao repositório | `'repository'` | `null` |

**Nenhum outro campo é alterado em nenhuma das ações.**

---

## 6. Confirmação de que `scheduled_publish_at` não é alterado

- Nenhuma das mutations referencia `scheduled_publish_at` no objeto `update`.
- O campo permanece exatamente como estava antes da operação.

---

## 7. Confirmação de que cron/publicação automática não foram alterados

- Nenhum arquivo de cron foi tocado.
- Nenhuma rota de publicação automática foi criada ou modificada.

---

## 8. Confirmação de que outros módulos não foram alterados

- ✅ Novo Episódio (`/admin/novo-episodio`) — não alterado.
- ✅ Palavra do Dia — não alterada.
- ✅ OG/preview — não alterado.
- ✅ Player — não alterado.
- ✅ WhatsApp — não alterado.
- ✅ Rota `/ep` público — não alterada.
- ✅ Favoritos — não alterado.
- ✅ Dashboard `/admin` — não alterado (alteração foi em AGENDA-005).
- ✅ Build — sucesso, zero erros TypeScript.

---

## 9. Como testar no admin

1. Acesse `/admin/agenda` e faça login.
2. **Pré-requisito:** tenha pelo menos um episódio agendado no calendário (`calendar_scheduled_at` preenchido).
3. **Clique no chip** do episódio no calendário.
4. Verifique que o modal "Episódio agendado" abre com os dados corretos.
5. **Editar:** altere data e horário, clique "Salvar alteração".
   - Mensagem de sucesso aparece.
   - Chip se move para o novo dia/horário (se mudou de data).
6. **Conflito:** tente salvar no mesmo horário de outro episódio — aviso "Já existe um episódio nesse horário" aparece, mas salva mesmo assim.
7. **Devolver:** clique "Devolver ao repositório" → confirme → episódio some do calendário e aparece na lista lateral.
8. **Abrir edição:** clique no link → vai para `/admin/episodios/{id}`.
9. **Cancelar:** fecha o modal sem alterar nada.

---

## 10. Próximo patch recomendado

**AGENDA-008 — Publicação manual a partir da agenda**

- Adicionar ação "Publicar agora" no modal de episódio agendado.
- Definir `scheduled_publish_at` para data/hora atual ou definida.
- Opcionalmente disparar geração de Palavra do Dia e OG image.