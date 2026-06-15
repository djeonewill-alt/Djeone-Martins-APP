# AGENDA-003B — Guard público da Palavra do Dia

Data: 15 de junho de 2026

## 1. Arquivos alterados

- `app/palavra/[id]/page.tsx`
- `app/api/og/quote/[id]/route.tsx`
- `reports/AGENDA-003B-QUOTE-PUBLIC-VISIBILITY-GUARD.md`

O helper existente `lib/episodes/publicVisibility.ts` foi reaproveitado sem alteração.

## 2. Proteção da página pública

A consulta da Palavra do Dia agora inclui `episode_id` e o campo `editorial_status` da relação com `episodes`.

Após carregar uma quote publicada:

- sem `episode_id`, a quote continua pública;
- com episódio legado e `editorial_status = null`, a quote continua pública;
- com `editorial_status = 'published'`, a quote continua pública;
- com qualquer outro estado editorial, a quote é tratada como não encontrada.

Assim, `repository`, `calendar_scheduled`, `draft` e `archived` resultam no `notFound()` já usado pela página, sem alteração do layout visual.

## 3. Proteção do OG da Palavra

A rota OG aplica a mesma validação com `isPublicEpisodeVisible`.

Quando a quote está vinculada a episódio editorial interno, a rota retorna HTTP `404` e não renderiza texto, capa ou fallback derivado da quote.

Quotes sem episódio ou vinculadas a episódio público continuam usando o comportamento e a composição visual existentes.

## 4. Compatibilidade

Palavra sem episódio associado continua funcionando porque `episode_id = null` não exige validação de episódio.

Episódios legados continuam compatíveis porque o helper considera `editorial_status = null` público.

## 5. Áreas não alteradas

Não foram alterados:

- OG de episódio;
- player ou componentes de áudio;
- upload e armazenamento R2;
- imagem estática já gerada;
- preview de episódio/áudio;
- WhatsApp;
- cron e publicação automática;
- SQL;
- Novo Episódio.

## 6. Próximo patch recomendado

AGENDA-004 — botão “Salvar no repositório” em Novo Episódio, usando `editorial_status = 'repository'` sem preencher `scheduled_publish_at` e sem acionar o cron.

## 7. Risco residual

Uma imagem estática da Palavra já publicada no R2 pode continuar acessível por sua URL direta se alguém já conhecer esse endereço. Este patch impede que a página pública e o OG dinâmico revelem a quote interna, mas não remove nem modifica objetos existentes no R2, conforme o escopo solicitado.
