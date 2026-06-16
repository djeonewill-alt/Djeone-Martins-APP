# NOVO-EP-UX-001 — Filtrar séries abertas e sugerir próximo número automático

## 1. Arquivos alterados

- `app/admin/novo-episodio/page.tsx` — Adicionada função `suggestNextEpisodeNumber` e chamada no `useEffect` de `formData.series_id`

---

## 2. Qual campo define série aberta/fechada

A tabela `series` não possui um campo específico de status (como `is_open`, `status`, `is_finished`, `archived` ou `closed_at`).

Campos existentes na tabela:
- `id`, `title`, `description`, `cover_image_url`, `book_name`, `bible_book`
- `icon_emoji`, `is_free`, `is_current`, `total_episodes`, `order_index`
- `created_at`, `updated_at`

**Conclusão:** Não há campo que indique série aberta/fechada.

**Decisão:** Manter comportamento atual (todas as séries são exibidas). Documentado para patch futuro.

---

## 3. Como séries fechadas foram removidas do select

Neste patch, **nenhuma série foi removida** porque a tabela `series` não possui campo de status.

Se no futuro for adicionado um campo `is_open` ou `status`, o filtro no `loadSeries` seria:
```ts
const { data, error } = await supabase
  .from('series')
  .select('id, title, cover_image_url')
  .eq('is_open', true) // ou .eq('status', 'active')
  .order('created_at', { ascending: false })
```

---

## 4. Como o próximo número é calculado

Adicionada função `suggestNextEpisodeNumber(seriesId)`:

1. Busca no banco o maior `episode_number` da série selecionada:
   ```ts
   supabase
     .from('episodes')
     .select('episode_number')
     .eq('series_id', seriesId)
     .not('episode_number', 'is', null)
     .order('episode_number', { ascending: false })
     .limit(1)
   ```
2. Se encontrar episódio, usa `maxNumber + 1`.
3. Se não encontrar (série vazia), usa `1`.
4. Atualiza `formData.episode_number` com o valor sugerido.

**Quando é acionado:**
- No `useEffect` que monitora `formData.series_id` — ou seja, sempre que o usuário seleciona ou troca a série.
- A função é assíncrona e faz uma consulta ao banco por série.

---

## 5. Confirmação de que o número continua editável

- `formData.episode_number` é um campo nativo de input `type="number"`.
- O valor sugerido apenas preenche o campo.
- O usuário pode:
  - Apagar o número
  - Digitar qualquer outro número
  - O sistema não bloqueia ou trava o valor
- A regra é: quando o usuário escolhe/troca a série, o próximo número é sugerido automaticamente. Depois disso, o campo fica livre para edição manual.

---

## 6. Confirmação de que upload/transcrição/publicação/repositório/cron/OG não foram alterados

- Upload de áudio — ✅ NÃO ALTERADO
- Transcrição — ✅ NÃO ALTERADO
- Geração de título/descrição — ✅ NÃO ALTERADO
- Publicação — ✅ NÃO ALTERADO
- Agendamento — ✅ NÃO ALTERADO
- Salvar no repositório — ✅ NÃO ALTERADO
- Palavra do Dia — ✅ NÃO ALTERADO
- OG — ✅ NÃO ALTERADO
- Player — ✅ NÃO ALTERADO
- R2 — ✅ NÃO ALTERADO
- Cron — ✅ NÃO ALTERADO
- Rotas públicas — ✅ NÃO ALTERADO

Apenas duas adições localizadas no arquivo:
1. Função `suggestNextEpisodeNumber`
2. Chamada a essa função no `useEffect` de `formData.series_id`

---

## 7. Resultado TypeScript

`npx tsc --noEmit --pretty false` — ✅ Passou sem erros

## 8. Resultado build

`npm run build` — ✅ Compilado com sucesso

## Como testar

1. Acessar `/admin/novo-episodio`.
2. Abrir o select de "Série".
3. Verificar que todas as séries disponíveis aparecem (filtro de abertas não implementado por falta de campo na tabela).
4. Selecionar uma série que já tenha episódios cadastrados (ex: "Orvalho da Manhã").
5. Verificar que o campo "Episódio Nº" foi preenchido automaticamente com `último número + 1`.
6. Selecionar uma série sem episódios.
7. Verificar que o campo sugere `1`.
8. Editar manualmente o número — campo permanece editável.
9. Trocar de série — número é recalculado.