# AGENDA-011 — Drag-and-drop na Agenda com confirmação

## 1. Arquivos alterados/criados

### Alterados
- `app/admin/agenda/page.tsx` — Adicionado drag-and-drop nativo, modal de confirmação, handlers e estilos CSS

### Criados
- `reports/AGENDA-011-AGENDA-DRAG-AND-DROP.md` — Este relatório

---

## 2. Como funciona o drag do repositório para o calendário

1. Cada card da lista lateral "Repositório" (episódios com `editorial_status = 'repository'`) recebeu os atributos `draggable`, `onDragStart` e `onDragEnd`.
2. Ao iniciar o arrasto (`dragStart`):
   - O ID do episódio é salvo no `dataTransfer` como `text/plain`.
   - `effectAllowed` é configurado como `'move'`.
   - O estado `dragState` é atualizado com `source: 'repository'` e `originalTime: '06:00'`.
3. Durante o arrasto sobre células do calendário, `dragOver` e `dragLeave` controlam o destaque visual (`drag-over` class).
4. Ao soltar (`drop`) em uma célula válida:
   - O episódio é identificado pelo ID no `dataTransfer`.
   - Verifica se o episódio não está publicado.
   - Abre o modal de confirmação (não salva imediatamente).

---

## 3. Como funciona o drag de chip agendado para outro dia

1. Cada chip no calendário com `editorial_status = 'calendar_scheduled'` e `status !== 'published'` recebeu `draggable`, `onDragStart`, `onDragEnd`.
2. Ao iniciar o arrasto:
   - O horário original do episódio é preservado via `getDragTime()`.
   - Se não houver horário no `calendar_scheduled_at`, usa `06:00`.
3. Ao soltar em outra célula:
   - O modal de confirmação aparece com o horário original preservado.
   - O usuário pode editar o horário antes de confirmar.

---

## 4. Como a confirmação funciona

### Modal — Agendar do repositório
- Título: "Agendar episódio"
- Mostra:
  - Título do episódio
  - Série e número do episódio
  - Texto: "Deseja agendar este episódio para [data] às [horário]?"
  - Campo de horário editável (padrão `06:00`)
- Ação "Confirmar agendamento": executa a mutation no Supabase
- Ação "Cancelar": fecha o modal sem alterações

### Modal — Mover agendado
- Título: "Mover agendamento"
- Mostra:
  - Título do episódio
  - Série e número do episódio
  - Texto: "Deseja mover este episódio para [data] às [horário]?"
  - Campo de horário editável (preserva horário original ou `06:00`)
- Ação "Confirmar agendamento": executa a mutation no Supabase
- Ação "Cancelar": fecha o modal sem alterações

### Prevenção de conflito click vs drag
- `handleChipClick` verifica `dragState.isDragging` e ignora o clique se o usuário estava arrastando.
- Garante que arrastar não dispare o modal de edição.

---

## 5. Como o horário padrão 06:00 foi aplicado

- Ao arrastar do **repositório**: horário padrão é `06:00`.
- Ao arrastar **chip agendado**: o horário é extraído de `calendar_scheduled_at` via `parseCalendarScheduledAt()`. Se não conseguir extrair, usa `06:00`.
- O modal permite editar o horário livremente antes de confirmar.
- Ao confirmar, o ISO offset é gerado com o timezone `-03:00` (São Paulo).

---

## 6. Quais campos são atualizados em cada ação

### Arrastar do repositório → calendário
```sql
-- Campos atualizados:
editorial_status = 'calendar_scheduled'
calendar_scheduled_at = 'YYYY-MM-DDTHH:mm:00-03:00'

-- Preservados:
status (permanece 'draft')
scheduled_publish_at (não alterado)
internal_notes (preservado)
```

### Arrastar chip agendado → outro dia
```sql
-- Campos atualizados:
calendar_scheduled_at = 'YYYY-MM-DDTHH:mm:00-03:00'

-- Preservados:
editorial_status = 'calendar_scheduled'
status = 'draft'
scheduled_publish_at (não alterado, permanece null)
internal_notes (preservado)
```

---

## 7. Confirmação de que episódios publicados não são arrastáveis

- Chips com `status === 'published'` recebem `draggable={false}` no código.
- O `handleDrop` também verifica `ep.status === 'published' || ep.editorial_status === 'published'` e rejeita o drop, resetando o estado de drag.
- Episódios publicados permanecem estáticos no calendário.

---

## 8. Confirmação de que cron/publicação automática não foram alterados

- `app/api/cron/agenda-auto-publish/route.ts` — NÃO ALTERADO.
- `app/api/cron/publish-scheduled` — NÃO ALTERADO.
- Nenhuma rota de API foi criada ou modificada.
- Nenhum cron job foi criado ou alterado.

---

## 9. Confirmação de que outros arquivos não foram alterados

- `app/admin/novo-episodio/page.tsx` — NÃO ALTERADO.
- `app/palavra/[id]/page.tsx` — NÃO ALTERADO.
- `app/api/og/quote/[id]/route.tsx` — NÃO ALTERADO.
- `app/api/og/episode/[id]/route.tsx` — NÃO ALTERADO.
- Player — NÃO ALTERADO.
- Rotas públicas (`/ep/[id]`, etc.) — NÃO ALTERADAS.
- WhatsApp — NÃO ALTERADO.
- R2 — NÃO ALTERADO.
- Banco de dados — NÃO ALTERADO (esquema mantido).

---

## 10. Como testar no admin

### Pré-requisitos
1. Acessar `/admin/agenda` com credenciais de admin.

### Teste 1 — Arrastar do repositório
1. Verificar se os cards no repositório estão com cursor `grab`.
2. Arrastar um card para uma célula do calendário.
3. Confirmar que a célula recebe destaque (borda azul) durante o drag-over.
4. Soltar sobre a célula.
5. Verificar que o modal de confirmação aparece com título "Agendar episódio".
6. Verificar que o horário padrão é `06:00`.
7. Clicar "Confirmar agendamento".
8. Verificar mensagem de sucesso: "Episódio agendado no calendário. Ele ainda não está público."
9. Verificar que o episódio sumiu do repositório e apareceu no calendário.

### Teste 2 — Mover chip agendado
1. Arrastar um chip com label "Agendado" de um dia para outro.
2. Confirmar que o modal "Mover agendamento" aparece.
3. Verificar que o horário original foi preservado.
4. Alterar horário e confirmar.
5. Verificar mensagem: "Agendamento atualizado. O episódio ainda não está público."

### Teste 3 — Publicados não arrastam
1. Localizar chip com label "Publicado".
2. Tentar arrastar — deve ser impossível (cursor padrão, sem reação).

### Teste 4 — Conflito de horário
1. Arrastar episódio para um dia que já tem episódio no mesmo horário.
2. Verificar aviso: "Já existe um episódio nesse horário."
3. Confirmar que é possível agendar mesmo com o aviso.

### Teste 5 — Cancelar
1. Arrastar, soltar, clicar "Cancelar" no modal.
2. Confirmar que nenhuma alteração foi feita.

### Teste 6 — Fallback mobile
1. Em viewport mobile (< 600px), chips ficam ocultos (comportamento existente).
2. Clicar em célula ainda abre modal de agendamento (comportamento existente).
3. Drag-and-drop não quebra em mobile; o fallback de clique continua funcional.

---

## 11. Riscos/restantes

### Riscos identificados
1. **Compatibilidade drag-and-drop**: Navegadores muito antigos podem não suportar HTML5 drag-and-drop. O fallback de clique (AGENDA-006 e AGENDA-007) permanece intacto.
2. **Mobile/touch**: Drag-and-drop nativo do navegador tem suporte limitado em dispositivos touch. O comportamento de clique existente serve como fallback. Documentado no relatório.
3. **Concorrência**: Se dois admins arrastarem o mesmo episódio simultaneamente, a última confirmação vence. A mutation usa `.eq('editorial_status', 'repository')` e `.eq('editorial_status', 'calendar_scheduled')` como guardas.

### Não implementado neste patch
- Drag-and-drop mobile nativo (seria necessário biblioteca externa, o que foi proibido).
- Animação de drag (apenas cursor visual e opacidade).
- Reordenamento de episódios no mesmo dia.
- Drag de episódios publicados (proposital, para evitar confusão de histórico).
- Notificação visual de conflito de horário no calendário antes do drop (apenas no modal).

### Validação
- `npx tsc --noEmit`: ✅ Passou sem erros
- `npm run build`: ✅ Build bem-sucedido
- `git status`: Apenas `app/admin/agenda/page.tsx` modificado