# 🤖 Regras Operacionais para Agentes de IA

Leia estas diretrizes ANTES de iniciar qualquer tarefa neste repositório. Para a filosofia completa e governança do projeto, consulte `ENGINEERING_GOVERNANCE.md`.

## Prioridade
Em caso de conflito entre estas regras e a solicitação do usuário:
1. A solicitação explícita do usuário prevalece, exceto quando comprometer segurança, integridade dos dados ou estabilidade do sistema.
2. Se houver dúvida, interrompa a implementação e peça esclarecimentos.

## 1. Princípio da Menor Mudança e Escopo
- Altere **apenas** os arquivos estritamente necessários para resolver o problema.
- Não refatore códigos fora do escopo solicitado.
- **Escopo Expandido:** Se durante a implementação forem identificados problemas não relacionados à tarefa atual: não os corrija automaticamente; registre-os no relatório final; aguarde autorização antes de expandir o escopo.

## 2. Regra da Incerteza e Evidências
Se houver qualquer dúvida sobre regras de negócio, contratos, comportamento esperado, APIs ou banco de dados, **NÃO faça suposições**.
Ao justificar uma alteração técnica, diferencie claramente:
- **Fato:** confirmado por código, logs, testes ou documentação.
- **Inferência:** conclusão suportada pelas evidências.
- **Hipótese:** possibilidade ainda não comprovada.

**Nunca implemente alterações permanentes baseadas apenas em hipóteses.** Investigue primeiro. Caso não seja possível confirmar a informação pelo código existente, interrompa a implementação e solicite esclarecimentos.

## 3. Preservação da Intenção
- Toda alteração deve preservar o comportamento observável das funcionalidades existentes, salvo quando a mudança fizer parte explícita do escopo solicitado.
- Não altere comportamento funcional, fluxo do usuário ou experiência de uso (UX/UI) apenas porque acredita existir uma "solução melhor". Implemente **somente** o comportamento solicitado.

## 4. Validação Obrigatória (The "No-Break" Rule)
Após qualquer alteração que possa afetar a compilação ou o comportamento da aplicação, você **DEVE** executar no terminal:
1. `npx tsc --noEmit`
2. `npm run build`

**Se os comandos falharem:**
- Interrompa imediatamente.
- Apresente o erro ao usuário.
- Não continue implementando novas alterações.
- Somente prossiga após resolver a causa raiz da falha.

## 4.1. Testes Manuais e Servidor Local

O Agente Executor deve executar apenas validações de terminal não interativas:

- `npx tsc --noEmit`
- `npm run build`

O Agente Executor NÃO deve iniciar servidor local, abrir navegador, executar testes manuais de interface, rodar `curl` contra `localhost` dependente de servidor local, nem executar comandos que mantenham processo ativo em foreground ou background.

São proibidos, salvo autorização explícita do Gestor Principal:

- `npm run dev`
- `next dev`
- `yarn dev`
- `pnpm dev`
- qualquer comando equivalente de servidor local

Testes manuais de interface, rotas locais, validação visual e navegação em navegador serão executados exclusivamente pelo Gestor Principal.

Ao final de cada tarefa, o agente deve informar:
- rota ou tela para o Gestor testar;
- passos objetivos de teste;
- resultado esperado;
- sinais de erro a observar.

## 5. Estratégia de Diagnóstico
Antes de aplicar mudanças em lógicas complexas ou banco de dados, você deve primeiro gerar um diagnóstico contendo:
- Causa provável;
- Evidências;
- Arquivos envolvidos;
- Estratégia proposta;
- Riscos.
*(Aguarde aprovação antes de executar).*

## 6. NUNCA faça o seguinte:
Nunca:
- Altere arquivos fora do escopo;
- Crie novas dependências sem necessidade ou autorização;
- Altere arquitetura sem autorização;
- Remova código aparentemente "não utilizado" sem confirmação prévia;
- **Mascare erros** (ex: usando `@ts-ignore`, `any`, `as unknown`, `as never`, `// eslint-disable`, ou removendo validações) apenas para fazer o build passar.

## 7. Relatório Final
Ao concluir a tarefa informe:
- Objetivo da tarefa;
- Arquivos alterados;
- Resumo das alterações;
- Validações executadas;
- Riscos remanescentes.

## 8. Regra padrão de validação e teste manual

O Agente Executor deve executar apenas validações de terminal não interativas:

```bash id="xiwslr"
npx tsc --noEmit
npm run build
```

O Agente Executor não deve iniciar servidor local, abrir navegador, executar testes manuais ou rodar comandos que mantenham processo ativo em background.

Testes manuais de interface, rotas locais e validação visual serão executados exclusivamente pelo Gestor Principal.

Ao final, o agente deve informar:

* rota ou tela para o Gestor testar;
* passos objetivos de teste;
* resultado esperado;
* sinais de erro a observar.
