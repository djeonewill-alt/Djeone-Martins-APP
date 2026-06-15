# AGENDA-004 - Salvar episódio no repositório

## Arquivos alterados

- `app/admin/novo-episodio/page.tsx`
- `reports/AGENDA-004-SAVE-EPISODE-TO-REPOSITORY.md`

## Botão adicionado

- Adicionada uma ação separada **Salvar no repositório** ao final do formulário de Novo Episódio.
- O botão fica próximo da área final de publicação, mas em um bloco visual próprio chamado **Repositório editorial** para reduzir risco de clique errado.
- A ação usa os dados já preparados no formulário: série, número, referência bíblica, título, descrição, capa, áudio e transcrição.
- O botão exibe o estado **Salvando no repositório...** e fica indisponível enquanto a gravação está em andamento.
- O fluxo exige áudio antes de salvar, pois o repositório é destinado a episódios preparados para agendamento posterior.

## Handler usado

- O novo handler é `handleSaveToRepository`.
- O caminho atual de criação/publicação, `handleSubmit`, não foi alterado funcionalmente.
- A tela possui agora dois caminhos de gravação de episódio: o fluxo atual via submit do formulário e o fluxo editorial via botão `type="button"`.
- O fluxo editorial usa insert próprio em `episodes` e encerra antes de qualquer criação de Palavra do Dia.

## Campos gravados

O episódio salvo no repositório recebe:

- `status = 'draft'`
- `editorial_status = 'repository'`
- `calendar_scheduled_at = null`
- `internal_notes = null`

O payload dessa ação não inclui `scheduled_publish_at`. Portanto, salvar no repositório não conecta o episódio ao agendamento de publicação existente.

Também são preservados no insert:

- `series_id`
- `episode_number`
- `bible_reference`
- `title`
- `description`
- `audio_url`
- `audio_original_url`
- `audio_original_type`
- `audio_url_compatible`
- `audio_compatible_type`
- `duration_seconds`
- `cover_image_url`
- `transcription_text`
- `transcription_segments`
- `transcription_status`

## Isolamento do fluxo público

- A ação não cria registro em `daily_quotes`.
- A ação não gera imagem estática de compartilhamento.
- A ação não gera preview de WhatsApp ou OG.
- A ação não publica o episódio e não oferece link público após o salvamento.
- O fluxo atual de publicar, agendar publicação e salvar rascunho permanece separado e sem alteração funcional.

Os guards adicionados anteriormente continuam sendo a barreira pública: episódios com `editorial_status = 'repository'` não aparecem nas listas públicas e não podem ser acessados diretamente.

## Escopo preservado

- Cron e publicação automática não foram alterados.
- `scheduled_publish_at` não é definido no fluxo de repositório.
- Palavra do Dia, OG e preview de WhatsApp não são gerados no fluxo de repositório.
- Player, áudio/R2, rotas públicas, Favoritos, `/ep/[id]`, Palavra do Dia pública e telas administrativas de edição não foram alterados.
- O fluxo atual de publicar/agendar/salvar rascunho continua no `handleSubmit`.

## Próximo patch recomendado

**AGENDA-005 - Página `/admin/agenda` com lista de episódios no repositório e calendário mensal inicial.**

Essa etapa deve listar episódios do repositório e itens com agenda editorial, sem conectar `calendar_scheduled_at` ao cron ou à publicação automática.
