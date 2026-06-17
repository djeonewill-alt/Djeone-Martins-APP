# Fábrica de Conteúdo - Visão Macro da Arquitetura

## Fluxo do Sistema
1. Gravação/Upload de Áudio (Novo Áudio)
2. Central de Conteúdo: Identificação de Cortes (Best Cuts) e Geração de Roteiros/Storyboards Complexos
3. Renderização automatizada de Shorts via FFmpeg
4. Integração e Agendamento via API do YouTube
5. Cron Job de Analytics: Captura de métricas (24h/48h) para retroalimentação de prompts.

## Status Atual da Auditoria de Rotas de IA:
- [x] Otimização do `best_cuts_ai` para `deepseek-flash` (Commit: 73bfb4b)
- [ ] Homologação Final do `visual_storyboard` usando Vercel AI SDK (`streamObject`) com `deepseek-pro` (Ajustando densidade de cenas no prompt do sistema)
- [ ] Próximo Passo: Voltar para a fila de Auditoria (Modos Médios e Baixos).