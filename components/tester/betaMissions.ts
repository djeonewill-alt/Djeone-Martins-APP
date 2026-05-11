import type { BetaMission } from './types'

export const betaMissions: BetaMission[] = [
  {
    app_area: 'Aba Mais',
    section: 'Podcasts devocionais',
    mission_key: 'podcasts_salmo23_audio_basico',
    area: 'Aba Mais',
    title: 'Testar o áudio de um episódio do Salmo 23',
    estimated_minutes: 7,
    objective:
      'Verificar se o episódio abre corretamente, se o áudio toca no seu aparelho, se os controles do player funcionam e se a legenda sincronizada aparece sem travar a tela.',
    prerequisites: [
      'Faça o teste no aparelho que você realmente usa para acessar o app.',
      'Se possível, deixe o volume do celular audível.',
      'Se estiver no iPhone, teste do jeito que você normalmente abre o app: Safari ou app instalado na tela inicial.',
    ],
    step_by_step: [
      'Entre na aba Mais.',
      'Toque em Podcasts devocionais.',
      'Abra a série Salmo 23.',
      'Na tela da série, procure a seção Episódios.',
      'Toque em qualquer episódio liberado da série.',
      'Confira se abriu a tela do episódio com capa, título, referência bíblica e descrição.',
      'Toque em Voltar aos episódios.',
      'Abra novamente o mesmo episódio.',
      'Toque no botão azul de play.',
      'Aguarde o áudio começar e observe se o tempo atual começa a andar.',
      'Toque novamente no botão para pausar.',
      'Toque outra vez para continuar.',
      'Use o botão +15s para avançar.',
      'Use o botão -15s para voltar.',
      'Arraste a barra de progresso para outro ponto do áudio.',
      'Se aparecer Legenda sincronizada, toque em Ocultar e depois em Mostrar.',
      'Volte para a lista de episódios e confira se o app não travou.',
    ],
    what_to_observe: [
      'O episódio abriu sem tela branca ou travamento?',
      'O áudio começou depois de tocar no play?',
      'O botão mudou de play para pausa?',
      'O tempo atual e o tempo total apareceram corretamente?',
      'A barra de progresso respondeu ao toque?',
      'Os botões +15s e -15s funcionaram?',
      'A legenda sincronizada apareceu, ocultou e mostrou novamente?',
      'No seu aparelho, especialmente iPhone/Safari, o som saiu normalmente?',
      'Ao voltar para os episódios, o app continuou estável?',
    ],
    success_criteria:
      'Consegui abrir o episódio, tocar, pausar, avançar, voltar e usar a legenda sem problema.',
    problem_criteria:
      'O áudio não tocou, travou, ficou sem som, a tela quebrou ou algum controle não funcionou.',
    confusing_criteria:
      'Não soube onde clicar, não encontrei a série, não entendi o player ou fiquei confuso em algum passo.',
    criticality: 'alta',
    type: 'áudio',
  },
  {
    app_area: 'Aba Hoje',
    section: 'Áudio de Hoje',
    mission_key: 'hoje_ouvir_audio_do_dia',
    area: 'Aba Hoje',
    title: 'Ouvir o Áudio de Hoje',
    estimated_minutes: 5,
    objective:
      'Confirmar se o Áudio de Hoje começa a tocar, se o Mini Player aparece e se é possível pausar, retomar, expandir e fechar o player.',
    prerequisites: ['Ter um devocional publicado na Aba Hoje com áudio disponível.'],
    step_by_step: [
      'Abra o app na Aba Hoje.',
      'Procure o card Áudio de hoje.',
      'Toque na imagem grande ou no título dentro do card.',
      'Observe se o áudio começa a tocar.',
      'Veja se aparece um Mini Player na parte de baixo da tela.',
      'No Mini Player, toque no botão de pausar.',
      'Depois toque novamente para continuar.',
      'Toque no botão de expandir o player.',
      'Observe se abre a tela grande do player.',
      'Feche ou minimize o player e volte para a Aba Hoje.',
      'Toque no botão de fechar do Mini Player.',
    ],
    what_to_observe: [
      'Se o áudio inicia sem travar.',
      'Se o tempo do áudio anda.',
      'Se pausar e retomar funcionam.',
      'Se o player expandido abre corretamente.',
      'Se o fechamento realmente para ou oculta o player.',
    ],
    success_criteria:
      'O áudio tocou, pausou, voltou a tocar, abriu o player expandido e fechou sem erro.',
    problem_criteria:
      'O áudio não toca, o player não aparece, o botão de pausa não funciona, o tempo fica parado ou o app trava.',
    confusing_criteria:
      'O testador não soube onde tocar para iniciar ou pausar o áudio.',
    criticality: 'alta',
    type: 'áudio',
  },
  {
    app_area: 'Aba Hoje',
    section: 'Áudio de Hoje',
    mission_key: 'hoje_audio_iphone_safari_pwa',
    area: 'Aba Hoje',
    title: 'Testar Áudio no iPhone/Safari',
    estimated_minutes: 8,
    objective:
      'Confirmar se o Áudio de Hoje funciona bem em iPhone, Safari ou app instalado como PWA.',
    prerequisites: [
      'Missão apenas para quem usa iPhone, Safari ou app instalado como PWA.',
      'Ter um devocional publicado com áudio disponível.',
    ],
    step_by_step: [
      'Abra o app pelo Safari no iPhone ou pelo ícone instalado na tela inicial.',
      'Entre na Aba Hoje.',
      'Toque no card Áudio de hoje.',
      'Aguarde alguns segundos.',
      'Observe se o áudio começa sem erro.',
      'Bloqueie a tela por alguns segundos, se se sentir confortável.',
      'Volte ao app.',
      'Pause e retome pelo Mini Player.',
      'Abra o player expandido.',
      'Observe se título, tempo e controles aparecem corretamente.',
    ],
    what_to_observe: [
      'Se o áudio carrega no iPhone.',
      'Se o áudio continua estável.',
      'Se os botões respondem.',
      'Se o player não some de forma estranha.',
    ],
    success_criteria:
      'O áudio tocou normalmente no iPhone/Safari/PWA e os controles funcionaram.',
    problem_criteria:
      'O áudio não inicia, fica carregando, para sozinho ou não retoma.',
    confusing_criteria:
      'O testador não soube dizer se estava usando Safari, iPhone ou PWA.',
    criticality: 'alta',
    type: 'áudio',
  },
  {
    app_area: 'Aba Hoje',
    section: 'Compartilhamento',
    mission_key: 'hoje_compartilhar_palavra_e_audio',
    area: 'Aba Hoje',
    title: 'Compartilhar Palavra e Áudio',
    estimated_minutes: 6,
    objective:
      'Testar se é possível compartilhar a Palavra do Dia e o Áudio de Hoje.',
    prerequisites: [
      'Ter Palavra do Dia publicada.',
      'Ter Áudio de Hoje disponível.',
    ],
    step_by_step: [
      'Abra a Aba Hoje.',
      'No card da Palavra do Dia, toque no botão de compartilhar.',
      'Observe se abre a tela de compartilhamento do celular ou mensagem de link copiado.',
      'Se abrir a tela de compartilhamento, escolha copiar link ou enviar para alguém de confiança.',
      'Volte para a Aba Hoje.',
      'No card Áudio de hoje, toque em Compartilhar.',
      'Observe se abre a tela de compartilhamento ou se o link foi copiado.',
      'Relate se os dois links parecem levar para conteúdos diferentes: Palavra do Dia e áudio.',
    ],
    what_to_observe: [
      'Se os botões respondem.',
      'Se o compartilhamento abre.',
      'Se o app não trava.',
      'Se os links parecem corretos.',
    ],
    success_criteria: 'Conseguiu compartilhar ou copiar os dois links.',
    problem_criteria:
      'Botão não responde, app fecha, link não copia ou compartilhamento abre errado.',
    confusing_criteria:
      'O testador não identificou qual botão compartilha Palavra e qual compartilha áudio.',
    criticality: 'alta',
    type: 'compartilhamento',
  },
  {
    app_area: 'Aba Hoje',
    section: 'Áudio de Hoje',
    mission_key: 'hoje_favoritar_audio_do_dia',
    area: 'Aba Hoje',
    title: 'Favoritar Áudio de Hoje',
    estimated_minutes: 4,
    objective:
      'Verificar se o botão Favorito salva e remove o Áudio de Hoje corretamente.',
    prerequisites: ['Estar cadastrado/logado; sem login, relatar o aviso.'],
    step_by_step: [
      'Abra a Aba Hoje.',
      'Procure o card Áudio de hoje.',
      'Toque no botão Favorito.',
      'Observe se muda para Salvo ou coração preenchido.',
      'Saia da Aba Hoje e volte.',
      'Confira se continua salvo.',
      'Toque novamente em Salvo.',
      'Observe se volta para Favorito.',
    ],
    what_to_observe: [
      'Mudança visual do botão.',
      'Persistência ao sair e voltar.',
      'Mensagem quando não há cadastro/login.',
    ],
    success_criteria: 'Alternou entre Favorito e Salvo corretamente.',
    problem_criteria:
      'Erro, não salva, não remove ou perde estado ao voltar.',
    confusing_criteria: 'O testador não soube se ficou salvo ou não.',
    criticality: 'média',
    type: 'usabilidade',
  },
  {
    app_area: 'Aba Hoje',
    section: 'Notificações',
    mission_key: 'hoje_ativar_lembrete_diario',
    area: 'Aba Hoje',
    title: 'Ativar Lembrete Diário',
    estimated_minutes: 6,
    objective:
      'Testar o botão Lembrete do Áudio de Hoje para ativar ou desativar notificações.',
    prerequisites: [
      'Estar cadastrado/logado.',
      'Pode não funcionar em todos os navegadores.',
    ],
    step_by_step: [
      'Abra a Aba Hoje.',
      'No card Áudio de hoje, toque em Lembrete.',
      'Se o navegador pedir permissão, escolha permitir para testar.',
      'Observe se aparece mensagem de notificações ativadas.',
      'Veja se o ícone muda para sino ativado.',
      'Toque novamente em Lembrete.',
      'Observe se aparece mensagem de notificações desativadas.',
      'Se aparecer aviso de login, navegador sem suporte ou permissão negada, relatar exatamente a mensagem.',
    ],
    what_to_observe: [
      'Pedido de permissão.',
      'Mensagem de sucesso ou erro.',
      'Mudança visual do botão.',
      'Clareza das mensagens.',
    ],
    success_criteria: 'Ativou e desativou com mensagens claras.',
    problem_criteria:
      'Botão trava, não mostra resposta, erro estranho ou pede permissão repetidamente.',
    confusing_criteria:
      'O testador não soube se ficou ligado ou desligado.',
    criticality: 'alta',
    type: 'notificação',
  },
  {
    app_area: 'Aba Hoje',
    section: 'Atalhos',
    mission_key: 'hoje_estado_sem_devocional',
    area: 'Aba Hoje',
    title: 'Aba Hoje Sem Devocional',
    estimated_minutes: 4,
    objective:
      'Avaliar a experiência quando ainda não existe devocional publicado na Aba Hoje.',
    prerequisites: [
      'Só pode ser feita em ambiente onde a Aba Hoje esteja sem devocional publicado.',
    ],
    step_by_step: [
      'Abra o app na Aba Hoje.',
      'Observe se aparece Nenhum devocional publicado.',
      'Leia o texto abaixo.',
      'Toque em Leitura de hoje.',
      'Volte para Aba Hoje.',
      'Toque em Oração de hoje.',
      'Volte para Aba Hoje.',
      'Toque no banner de contribuição/oferta.',
      'Relate se a tela vazia parece acolhedora ou parece erro.',
    ],
    what_to_observe: [
      'Clareza da mensagem.',
      'Ausência de tela quebrada.',
      'Funcionamento dos atalhos.',
      'Tom pastoral do texto.',
    ],
    success_criteria: 'Tela vazia apareceu bem e atalhos funcionaram.',
    problem_criteria:
      'Tela branca, travou, erro técnico ou atalho não abriu.',
    confusing_criteria:
      'O testador achou que o app estava com defeito mesmo sem erro.',
    criticality: 'média',
    type: 'conteúdo',
  },
  {
    app_area: 'Aba Hoje',
    section: 'Atalhos',
    mission_key: 'hoje_navegar_atalhos',
    area: 'Aba Hoje',
    title: 'Navegar Pelos Atalhos da Aba Hoje',
    estimated_minutes: 5,
    objective:
      'Testar os caminhos da Aba Hoje para Série/Podcasts, Leitura, Oração e Oferta.',
    prerequisites: [
      'Ter devocional publicado.',
      'Para Série/Podcasts, episódio precisa mostrar nome da série.',
    ],
    step_by_step: [
      'Abra a Aba Hoje.',
      'No card Áudio de hoje, toque no nome da série, se aparecer no canto superior direito.',
      'Observe se abre a área de séries/podcasts.',
      'Volte para Aba Hoje pelo menu inferior.',
      'Toque em Leitura de hoje.',
      'Volte para Aba Hoje.',
      'Toque em Oração de hoje.',
      'Volte para Aba Hoje.',
      'Toque no banner Contribuição ministerial.',
      'Observe se abre oferta/contribuição.',
    ],
    what_to_observe: [
      'Se cada toque leva para a área esperada.',
      'Se é fácil voltar.',
      'Se algum botão parece pequeno ou difícil de perceber.',
    ],
    success_criteria:
      'Todos os atalhos disponíveis abriram a área correta.',
    problem_criteria:
      'Atalho não responde, abre tela errada ou dificulta voltar.',
    confusing_criteria:
      'O testador não percebeu que cards eram clicáveis ou não entendeu para onde foi levado.',
    criticality: 'média',
    type: 'navegação',
  },
  {
    app_area: 'Aba Leitura',
    section: 'Planos',
    mission_key: 'leitura_escolher_iniciar_plano',
    area: 'Aba Leitura',
    title: 'Escolher e iniciar um plano de leitura',
    estimated_minutes: 4,
    objective:
      'Confirmar se o testador entende como escolher um plano de leitura e iniciar sua jornada.',
    prerequisites: [
      'Idealmente estar sem plano ativo, ou aceitar trocar/reiniciar o plano atual.',
    ],
    step_by_step: [
      'Abra o app.',
      'Toque na aba Leitura no menu inferior.',
      'Se estiver na subaba Hoje e aparecer Escolha um plano de leitura, toque em Ver planos.',
      'Se já estiver em Planos, observe a lista de planos disponíveis.',
      'Leia os nomes dos planos gratuitos.',
      'Escolha um plano simples, como Evangelho de João em 21 dias.',
      'Toque no card do plano ou no botão Começar plano.',
      'Observe se o app volta para Hoje.',
      'Confira se aparece Leitura de hoje com Dia 1 do plano.',
    ],
    what_to_observe: [
      'Se ficou claro que era necessário escolher um plano.',
      'Se os planos são fáceis de entender.',
      'Se o toque no plano iniciou corretamente.',
      'Se a tela Hoje mostrou o plano iniciado.',
    ],
    success_criteria:
      'O plano iniciou e a tela Hoje mostrou a leitura do dia.',
    problem_criteria:
      'O plano não iniciou, abriu tela errada, travou ou não mostrou leitura do dia.',
    confusing_criteria:
      'O testador não soube qual plano escolher ou não percebeu onde tocar.',
    criticality: 'alta',
    type: 'navegação/usabilidade',
  },
  {
    app_area: 'Aba Leitura',
    section: 'Hoje',
    mission_key: 'leitura_fazer_leitura_de_hoje',
    area: 'Aba Leitura',
    title: 'Fazer a leitura de hoje',
    estimated_minutes: 5,
    objective:
      'Testar se é claro marcar os capítulos do dia como lidos e acompanhar o progresso.',
    prerequisites: ['Ter um plano ativo.'],
    step_by_step: [
      'Abra a Aba Leitura.',
      'Entre na subaba Hoje.',
      'Procure o card Leitura de hoje.',
      'Veja o dia atual do plano.',
      'Leia quais capítulos aparecem para hoje.',
      'Toque no primeiro capítulo da lista.',
      'Observe se ele muda para Concluído.',
      'Toque nos demais capítulos do dia, se houver.',
      'Observe a barra Progresso de hoje.',
      'Confira se ela chega a 100% quando todos os capítulos forem marcados.',
    ],
    what_to_observe: [
      'Se ficou claro onde tocar.',
      'Se a mudança para Concluído é visível.',
      'Se a barra de progresso atualiza.',
      'Se faltou alguma mensagem de celebração ao concluir.',
    ],
    success_criteria:
      'Os capítulos foram marcados e o progresso atualizou corretamente.',
    problem_criteria:
      'Capítulo não marcou, progresso não mudou, tela travou ou informação ficou errada.',
    confusing_criteria:
      'O testador não soube se precisava ler no app ou apenas marcar como lido.',
    criticality: 'alta',
    type: 'conteúdo/usabilidade',
  },
  {
    app_area: 'Aba Leitura',
    section: 'Hoje',
    mission_key: 'leitura_desmarcar_remarcar_capitulo',
    area: 'Aba Leitura',
    title: 'Desmarcar e remarcar um capítulo',
    estimated_minutes: 3,
    objective:
      'Verificar se a alternância entre lido e não lido é clara e não causa confusão.',
    prerequisites: [
      'Ter um plano ativo e pelo menos um capítulo disponível na leitura do dia.',
    ],
    step_by_step: [
      'Abra a Aba Leitura.',
      'Entre na subaba Hoje.',
      'Toque em um capítulo pendente para marcar como Concluído.',
      'Toque novamente no mesmo capítulo.',
      'Observe se ele volta para pendente.',
      'Toque mais uma vez para marcar como Concluído novamente.',
      'Observe se a barra de progresso acompanha essas mudanças.',
    ],
    what_to_observe: [
      'Se a ação de tocar novamente para desmarcar é intuitiva.',
      'Se é fácil desmarcar sem querer.',
      'Se a mudança visual é clara.',
    ],
    success_criteria:
      'O capítulo marcou, desmarcou e marcou novamente sem erro.',
    problem_criteria:
      'O estado visual não mudou, o progresso ficou errado ou o toque não respondeu.',
    confusing_criteria:
      'O testador não percebeu que tocar novamente desmarca o capítulo.',
    criticality: 'média',
    type: 'usabilidade',
  },
  {
    app_area: 'Aba Leitura',
    section: 'Progresso',
    mission_key: 'leitura_persistencia_progresso',
    area: 'Aba Leitura',
    title: 'Ver se o progresso fica salvo',
    estimated_minutes: 5,
    objective:
      'Confirmar se o progresso de leitura permanece salvo ao sair e voltar.',
    prerequisites: ['Ter plano ativo ou usar Bíblia livre.'],
    step_by_step: [
      'Abra a Aba Leitura.',
      'Marque pelo menos um capítulo como lido.',
      'Saia para outra aba, como Hoje ou Oração.',
      'Volte para a Aba Leitura.',
      'Confira se o capítulo continua marcado.',
      'Se possível, recarregue a página/app.',
      'Abra novamente a Aba Leitura.',
      'Confira se o progresso continua salvo.',
    ],
    what_to_observe: [
      'Se o progresso permanece ao trocar de aba.',
      'Se permanece após recarregar.',
      'Se houve perda inesperada de dados.',
    ],
    success_criteria:
      'O progresso continuou salvo ao sair, voltar e recarregar.',
    problem_criteria:
      'O progresso sumiu, voltou errado ou resetou sem explicação.',
    confusing_criteria:
      'O testador não soube confirmar se o progresso tinha sido salvo.',
    criticality: 'alta',
    type: 'persistência/usabilidade',
  },
  {
    app_area: 'Aba Leitura',
    section: 'Bíblia',
    mission_key: 'leitura_explorar_biblia_livre',
    area: 'Aba Leitura',
    title: 'Explorar a Bíblia livre',
    estimated_minutes: 6,
    objective:
      'Testar a navegação livre por testamento, livro e capítulos.',
    prerequisites: ['Nenhum.'],
    step_by_step: [
      'Abra a Aba Leitura.',
      'Toque na subaba Bíblia.',
      'Observe os cards Antigo Testamento e Novo Testamento.',
      'Toque em Novo Testamento.',
      'Escolha um livro, como João.',
      'Observe se aparecem os capítulos.',
      'Toque em um capítulo para marcar como lido.',
      'Use Voltar para livros.',
      'Use Voltar para Bíblia.',
      'Repita rapidamente com Antigo Testamento, se desejar.',
    ],
    what_to_observe: [
      'Se é fácil entender a diferença entre testamento, livro e capítulo.',
      'Se os botões de voltar são claros.',
      'Se livros longos ficam confortáveis no celular.',
      'Se o usuário entende que não há texto bíblico completo ali, apenas marcação.',
    ],
    success_criteria:
      'Foi possível navegar e marcar capítulos sem travar.',
    problem_criteria:
      'Não abriu livro, capítulos não aparecem, botão voltar falha ou progresso não muda.',
    confusing_criteria:
      'O testador esperava ler o texto bíblico completo e não entendeu a função da tela.',
    criticality: 'média',
    type: 'navegação/usabilidade',
  },
  {
    app_area: 'Aba Leitura',
    section: 'Progresso',
    mission_key: 'leitura_entender_dashboard_progresso',
    area: 'Aba Leitura',
    title: 'Entender o dashboard de progresso',
    estimated_minutes: 4,
    objective:
      'Avaliar se anel, barras e métricas de progresso são compreensíveis.',
    prerequisites: ['Ter pelo menos um capítulo marcado como lido.'],
    step_by_step: [
      'Abra a Aba Leitura.',
      'Entre na subaba Hoje.',
      'Role até a área Seu progresso.',
      'Observe o anel de progresso.',
      'Observe as barras do Antigo e Novo Testamento.',
      'Veja os números de capítulos lidos, livros concluídos e percentual de hoje.',
      'Toque em Drilldown, se aparecer.',
      'Observe para onde o app leva você.',
    ],
    what_to_observe: [
      'Se os percentuais fazem sentido.',
      'Se o anel e as barras são claros.',
      'Se o botão Drilldown é compreensível.',
      'Se a pessoa entende que está vendo progresso bíblico.',
    ],
    success_criteria:
      'O dashboard ficou claro e o botão abriu a área esperada.',
    problem_criteria:
      'Números estranhos, progresso incoerente, botão não responde ou tela confusa.',
    confusing_criteria:
      'O testador não entendeu o significado dos percentuais ou do botão Drilldown.',
    criticality: 'média',
    type: 'usabilidade',
  },
  {
    app_area: 'Aba Leitura',
    section: 'Planos',
    mission_key: 'leitura_trocar_reiniciar_plano',
    area: 'Aba Leitura',
    title: 'Trocar ou reiniciar plano',
    estimated_minutes: 4,
    objective:
      'Descobrir se o usuário entende o que acontece ao tocar em outro plano ou no plano ativo.',
    prerequisites: ['Ter plano ativo.'],
    step_by_step: [
      'Abra a Aba Leitura.',
      'Vá para a subaba Planos.',
      'Observe qual plano aparece como Plano ativo.',
      'Toque em outro plano.',
      'Observe se o app muda para esse novo plano.',
      'Volte para Planos.',
      'Toque no plano que já está ativo, se aparecer.',
      'Observe se ele reinicia ou se parece não fazer nada.',
      'Relate se isso ficou claro ou perigoso.',
    ],
    what_to_observe: [
      'Se trocar plano é compreensível.',
      'Se tocar no plano ativo confunde.',
      'Se falta confirmação antes de reiniciar.',
    ],
    success_criteria:
      'A troca aconteceu de forma compreensível e o testador entendeu o impacto.',
    problem_criteria:
      'O plano mudou sem clareza, reiniciou sem aviso ou causou perda de progresso.',
    confusing_criteria:
      'O testador não soube se trocou, reiniciou ou manteve o mesmo plano.',
    criticality: 'alta',
    type: 'usabilidade',
  },
  {
    app_area: 'Aba Leitura',
    section: 'Hoje',
    mission_key: 'leitura_estado_sem_plano',
    area: 'Aba Leitura',
    title: 'Testar o estado sem plano ativo',
    estimated_minutes: 3,
    objective:
      'Avaliar se a tela inicial sem plano é acolhedora e orienta bem o próximo passo.',
    prerequisites: ['Ambiente sem plano ativo ou progresso local apagado.'],
    step_by_step: [
      'Abra a Aba Leitura sem plano ativo.',
      'Observe se aparece o card Comece hoje.',
      'Leia o texto Escolha um plano de leitura.',
      'Toque em Ver planos.',
      'Volte para Hoje.',
      'Toque em Abrir Bíblia.',
      'Volte para Hoje.',
      'Relate se ficou claro o que fazer.',
    ],
    what_to_observe: [
      'Se a tela parece acolhedora.',
      'Se Ver planos e Abrir Bíblia são claros.',
      'Se o usuário entende que ainda precisa escolher um plano.',
    ],
    success_criteria:
      'A tela orientou bem e os botões abriram as áreas corretas.',
    problem_criteria:
      'Tela ficou vazia, botões não funcionaram ou abriu lugar errado.',
    confusing_criteria:
      'O testador não soube como começar a leitura.',
    criticality: 'média',
    type: 'conteúdo/usabilidade',
  },
  {
    app_area: 'Aba Oração',
    section: 'Criar pedido',
    mission_key: 'oracao_criar_pedido_publico',
    area: 'Aba Oração',
    title: 'Criar pedido público no Mural',
    estimated_minutes: 6,
    objective:
      'Testar se criar um pedido público de oração é claro, seguro e pastoralmente compreensível.',
    prerequisites: [
      'Estar cadastrado/logado no app.',
      'Usar um pedido simples de teste, sem dados sensíveis.',
    ],
    step_by_step: [
      'Abra o app.',
      'Toque na aba Oração no menu inferior.',
      'Confirme que está na subaba Mural.',
      'Toque em Pedir oração.',
      'Leia o aviso de privacidade.',
      'Marque a confirmação de que não está expondo dados sensíveis.',
      'Preencha Nome no mural, se desejar.',
      'Escreva um pedido simples de teste.',
      'Não marque a opção de pedido privado.',
      'Toque em Publicar pedido.',
      'Observe se o formulário fecha.',
      'Procure o pedido publicado no Mural.',
    ],
    what_to_observe: [
      'Se o aviso de privacidade ficou claro.',
      'Se o campo obrigatório é fácil de entender.',
      'Se ficou claro que o pedido público aparece no mural.',
      'Se o pedido apareceu depois de publicar.',
    ],
    success_criteria: 'O pedido foi publicado e apareceu no Mural sem erro.',
    problem_criteria:
      'Não publicou, travou, mostrou erro confuso ou o pedido não apareceu.',
    confusing_criteria:
      'O testador não soube se o pedido seria público ou onde ele apareceria.',
    criticality: 'alta',
    type: 'segurança pastoral',
  },
  {
    app_area: 'Aba Oração',
    section: 'Criar pedido',
    mission_key: 'oracao_criar_pedido_privado',
    area: 'Aba Oração',
    title: 'Criar pedido privado',
    estimated_minutes: 5,
    objective:
      'Confirmar se o testador entende que o pedido privado não vai para o Mural público.',
    prerequisites: [
      'Estar cadastrado/logado no app.',
      'Usar um pedido simples de teste, sem dados sensíveis.',
    ],
    step_by_step: [
      'Abra a aba Oração.',
      'Na subaba Mural, toque em Pedir oração.',
      'Leia o aviso de privacidade.',
      'Marque a confirmação de privacidade.',
      'Escreva um pedido simples de teste.',
      'Marque a opção Quero enviar como pedido privado.',
      'Toque em Enviar pedido privado.',
      'Vá para a subaba Meus.',
      'Veja se o pedido aparece ali.',
      'Volte ao Mural e confira se ele não aparece na lista pública.',
    ],
    what_to_observe: [
      'Se ficou claro o que significa privado.',
      'Se o texto do app dá segurança.',
      'Se o pedido privado aparece em Meus.',
      'Se ele não aparece no Mural.',
    ],
    success_criteria:
      'O pedido privado apareceu em Meus e não apareceu no Mural público.',
    problem_criteria:
      'O pedido privado apareceu no Mural, não apareceu em Meus, ou houve erro ao enviar.',
    confusing_criteria:
      'O testador não entendeu a diferença entre pedido público e privado.',
    criticality: 'alta',
    type: 'privacidade',
  },
  {
    app_area: 'Aba Oração',
    section: 'Criar pedido',
    mission_key: 'oracao_bloquear_sem_aviso_privacidade',
    area: 'Aba Oração',
    title: 'Tentar criar pedido sem aceitar o aviso',
    estimated_minutes: 3,
    objective:
      'Validar se o app impede publicação sem confirmação do aviso de privacidade.',
    prerequisites: ['Estar cadastrado/logado no app.'],
    step_by_step: [
      'Abra a aba Oração.',
      'Toque em Pedir oração.',
      'Escreva um pedido simples de teste.',
      'Não marque a confirmação de privacidade.',
      'Observe se o botão fica desabilitado ou se o app impede o envio.',
      'Depois marque a confirmação.',
      'Veja se o botão libera.',
    ],
    what_to_observe: [
      'Se o bloqueio é claro.',
      'Se o testador entende por que precisa confirmar.',
      'Se a mensagem protege contra exposição de dados sensíveis.',
    ],
    success_criteria:
      'O app impediu envio sem confirmação e liberou após marcar o aviso.',
    problem_criteria:
      'Publicou sem confirmação, travou ou não explicou o motivo.',
    confusing_criteria:
      'O testador não percebeu por que não conseguia enviar.',
    criticality: 'alta',
    type: 'segurança pastoral',
  },
  {
    app_area: 'Aba Oração',
    section: 'Mural',
    mission_key: 'oracao_orar_por_pedido',
    area: 'Aba Oração',
    title: 'Orar por um pedido no Mural',
    estimated_minutes: 4,
    objective:
      'Testar o botão Eu orei, o contador de orações e o estado Você já orou.',
    prerequisites: ['Existir pelo menos um pedido público no Mural.'],
    step_by_step: [
      'Abra a aba Oração.',
      'Entre na subaba Mural.',
      'Escolha um pedido público.',
      'Leia o pedido com atenção.',
      'Toque em Eu orei.',
      'Observe se o contador de orações aumenta.',
      'Observe se o botão muda para Você já orou.',
      'Tente tocar novamente no mesmo pedido.',
      'Veja se o app evita oração repetida no mesmo dispositivo.',
    ],
    what_to_observe: [
      'Se o botão é fácil de encontrar.',
      'Se o contador muda.',
      'Se o estado Você já orou fica claro.',
      'Se a ação transmite cuidado pastoral.',
    ],
    success_criteria:
      'O botão registrou a oração, atualizou o contador e mudou o estado.',
    problem_criteria:
      'Contador não mudou, botão não respondeu, duplicou oração ou mostrou erro.',
    confusing_criteria:
      'O testador não soube se a oração foi registrada.',
    criticality: 'alta',
    type: 'interação comunitária',
  },
  {
    app_area: 'Aba Oração',
    section: 'Encorajamento',
    mission_key: 'oracao_enviar_encorajamento',
    area: 'Aba Oração',
    title: 'Enviar apoio/encorajamento',
    estimated_minutes: 4,
    objective:
      'Testar se o botão Apoio abre mensagens prontas e salva um encorajamento seguro.',
    prerequisites: ['Existir pedido público no Mural.'],
    step_by_step: [
      'Abra a aba Oração.',
      'Entre no Mural.',
      'Escolha um pedido.',
      'Toque em Apoio.',
      'Veja as opções de encorajamento.',
      'Escolha uma mensagem, como Deus te fortaleça.',
      'Observe se a mensagem aparece no card.',
    ],
    what_to_observe: [
      'Se as mensagens são claras e pastorais.',
      'Se a opção escolhida aparece corretamente.',
      'Se o botão Apoio é compreensível.',
    ],
    success_criteria:
      'A mensagem de apoio foi enviada e apareceu no pedido.',
    problem_criteria:
      'Não salvou, duplicou, travou ou mostrou erro.',
    confusing_criteria:
      'O testador não entendeu para que serve o botão Apoio.',
    criticality: 'média',
    type: 'interação comunitária',
  },
  {
    app_area: 'Aba Oração',
    section: 'Moderação',
    mission_key: 'oracao_denunciar_pedido',
    area: 'Aba Oração',
    title: 'Denunciar pedido problemático',
    estimated_minutes: 4,
    objective:
      'Validar se o testador entende como sinalizar conteúdo sensível, ofensivo, spam ou inadequado.',
    prerequisites: [
      'Existir pedido no Mural.',
      'Usar ambiente de teste.',
    ],
    step_by_step: [
      'Abra a aba Oração.',
      'Entre no Mural.',
      'Escolha um pedido de teste.',
      'Procure o botão de denúncia com símbolo de bandeira.',
      'Toque no botão.',
      'Leia a mensagem do navegador.',
      'Escreva um motivo simples, como teste de denúncia.',
      'Confirme o envio.',
      'Observe se aparece agradecimento ou confirmação.',
    ],
    what_to_observe: [
      'Se o símbolo de denúncia é compreensível.',
      'Se o fluxo com aviso do navegador é claro.',
      'Se o testador entende quando deve denunciar.',
    ],
    success_criteria:
      'A denúncia foi enviada e o app mostrou confirmação clara.',
    problem_criteria:
      'Botão não responde, erro aparece, ou o fluxo parece inseguro/confuso.',
    confusing_criteria:
      'O testador não percebeu que a bandeira servia para denunciar.',
    criticality: 'alta',
    type: 'moderação',
  },
  {
    app_area: 'Aba Oração',
    section: 'Meus pedidos',
    mission_key: 'oracao_ver_meus_pedidos',
    area: 'Aba Oração',
    title: 'Ver Meus pedidos',
    estimated_minutes: 5,
    objective:
      'Confirmar se pedidos criados neste dispositivo aparecem na subaba Meus.',
    prerequisites: ['Criar antes um pedido público ou privado neste mesmo dispositivo.'],
    step_by_step: [
      'Abra a aba Oração.',
      'Crie um pedido simples de teste, se ainda não criou.',
      'Toque na subaba Meus.',
      'Observe se o pedido aparece ali.',
      'Veja se ele mostra se é público ou privado.',
      'Leia o texto Acompanhe pedidos enviados por este dispositivo.',
      'Se criou em outro aparelho, relate se isso ficou confuso.',
    ],
    what_to_observe: [
      'Se a subaba Meus mostra o pedido correto.',
      'Se fica claro que depende do dispositivo.',
      'Se público/privado está identificado.',
    ],
    success_criteria:
      'O pedido criado neste dispositivo apareceu em Meus com informações claras.',
    problem_criteria:
      'Pedido não apareceu, apareceu pedido errado ou a tela ficou vazia sem explicação.',
    confusing_criteria:
      'O testador não entendeu por que seus pedidos aparecem ou não aparecem.',
    criticality: 'média',
    type: 'navegação',
  },
  {
    app_area: 'Aba Oração',
    section: 'Meus pedidos',
    mission_key: 'oracao_marcar_pedido_respondido',
    area: 'Aba Oração',
    title: 'Marcar pedido como respondido',
    estimated_minutes: 4,
    objective:
      'Testar confirmação e mudança visual para Respondido.',
    prerequisites: ['Ter pedido próprio na subaba Meus.'],
    step_by_step: [
      'Abra a aba Oração.',
      'Toque na subaba Meus.',
      'Escolha um pedido seu.',
      'Toque em Marcar como respondido.',
      'Leia a confirmação.',
      'Confirme a ação.',
      'Observe se o pedido ganha selo ou área de Respondido.',
      'Se possível, volte ao Mural e veja como ele aparece.',
    ],
    what_to_observe: [
      'Se a confirmação é clara.',
      'Se a mudança visual para respondido aparece.',
      'Se o usuário sente falta de escrever testemunho.',
    ],
    success_criteria:
      'O pedido foi marcado como respondido e a mudança visual ficou clara.',
    problem_criteria:
      'Não marcou, erro apareceu, ou o pedido sumiu/confundiu.',
    confusing_criteria:
      'O testador não soube o que significa marcar como respondido.',
    criticality: 'média',
    type: 'usabilidade',
  },
  {
    app_area: 'Aba Oração',
    section: 'Mapa',
    mission_key: 'oracao_entender_mapa',
    area: 'Aba Oração',
    title: 'Entender o Mapa de Oração',
    estimated_minutes: 3,
    objective:
      'Verificar se a tela Mapa parece um recurso futuro planejado, não uma tela quebrada.',
    prerequisites: ['Nenhum.'],
    step_by_step: [
      'Abra a aba Oração.',
      'Toque na subaba Mapa.',
      'Leia o título Mapa de Oração.',
      'Observe o selo Em desenvolvimento.',
      'Leia os cards explicando o futuro recurso.',
      'Toque em Ir para o mural.',
      'Veja se volta ao Mural.',
    ],
    what_to_observe: [
      'Se ficou claro que é recurso futuro.',
      'Se a tela parece bonita e intencional.',
      'Se o botão leva ao Mural corretamente.',
    ],
    success_criteria:
      'O Mapa foi entendido como recurso em desenvolvimento e o botão voltou ao Mural.',
    problem_criteria:
      'A tela pareceu quebrada, vazia ou o botão não funcionou.',
    confusing_criteria:
      'O testador achou que deveria haver um mapa funcionando agora.',
    criticality: 'média',
    type: 'recurso futuro',
  },
  {
    app_area: 'Aba Oração',
    section: 'Navegação',
    mission_key: 'oracao_navegar_mural_meus_mapa',
    area: 'Aba Oração',
    title: 'Navegar entre Mural, Meus e Mapa',
    estimated_minutes: 4,
    objective:
      'Testar clareza das três subtabs e ida/volta entre elas.',
    prerequisites: ['Nenhum.'],
    step_by_step: [
      'Abra a aba Oração.',
      'Observe as subabas Mural, Meus e Mapa.',
      'Toque em Meus.',
      'Observe o que aparece.',
      'Toque em Mapa.',
      'Observe o que aparece.',
      'Toque em Mural.',
      'Veja se voltou para o mural de pedidos.',
      'Relate se os nomes das subabas são claros.',
    ],
    what_to_observe: [
      'Se os nomes Mural, Meus e Mapa fazem sentido.',
      'Se a troca de subabas é rápida.',
      'Se a pessoa entende a função de cada uma.',
    ],
    success_criteria:
      'As três subabas abriram corretamente e ficaram compreensíveis.',
    problem_criteria:
      'Alguma subaba não abriu, abriu errado ou travou.',
    confusing_criteria:
      'O testador não entendeu a diferença entre Mural, Meus e Mapa.',
    criticality: 'média',
    type: 'navegação',
  },
]
