# Para Bernardo — Como o Sistema Funciona

> **Este documento é para você.** Não tem código, não tem jargão. Explica o sistema em linguagem de produto para você entender como funciona e o que esperar de cada parte.

---

## A ideia em uma frase

Você descreve o que quer criar em português, e um agente de software constrói, testa, revisa e publica — com 3 momentos de aprovação sua e zero comandos técnicos.

---

## O problema que isso resolve

Hoje, se você quer criar um produto digital, você precisa de um desenvolvedor. Você descreve a ideia, ele interpreta, você corrige a interpretação, ele constrói, você testa, pede ajustes, ele ajusta — e cada ciclo leva dias.

Com este sistema, o ciclo acontece em horas. Você só toca no processo em 3 momentos:

1. **"Entendi direito o que você quer?"** — você confirma a especificação
2. **"Posso começar a construir?"** — você aprova o plano
3. **"Funcionou como esperado?"** — você valida o resultado

Tudo o mais — escolha de tecnologia, construção, testes, revisão, deploy — acontece sem você precisar intervir.

---

## Como vai parecer na prática

Você cria uma pasta para o projeto, abre o Pi, digita `/setup`, e começa a conversar em português:

```
/setup

[Sistema inicializado. Pi pergunta:]
"Tudo pronto! O que você quer construir?"

Você: "Quero criar um app de lista de compras onde eu e a Helena
       possamos adicionar itens e marcar como comprado em tempo real"

Agente: "Entendi! Antes de começar, preciso confirmar duas coisas:
         As listas são por categoria (feira, farmácia...) ou uma lista única?
         Quando você marca algo como comprado, ele some da lista ou fica riscado?"

         [Você pressiona Ctrl+. e responde no formulário que aparece]
         "Lista única. Fica riscado."

         [Ou simplesmente responde no chat, se preferir]

Agente: "Perfeito. Aqui está o que vou construir:

         ✓ Lista única compartilhada entre você e a Helena
         ✓ Adicionar e remover itens
         ✓ Marcar como comprado (fica riscado)
         ✓ Mudanças aparecem para os dois em tempo real
         ✓ Funciona no celular sem precisar instalar nada

         Decisões que tomei sozinho:
         - Não funciona sem internet (mais simples e confiável)
         - Qualquer um dos dois pode editar qualquer item

         Isso está correto?
         ○ Sim, está correto
         ○ Preciso corrigir algo
         ○ Quero adicionar cenários"

[Você clica "Sim, está correto"]

Agente: "Vou construir em 2 etapas:
         1. Lista básica (adicionar, marcar, visualizar)
         2. Compartilhamento em tempo real com a Helena

         ○ Sim, pode começar
         ○ Quero ajustar o escopo antes"

[Você clica "Sim, pode começar"]

[Agente trabalha autonomamente por alguns minutos]

Agente: "Lista básica pronta. Construindo compartilhamento..."

[Mais alguns minutos]

Agente: "Pronto para você validar! 🎉

         Teste aqui: http://localhost:4321

         Checklist do que fazer:
         □ Criar uma lista
         □ Adicionar 3 itens
         □ Marcar um como comprado (deve ficar riscado)
         □ Abrir o mesmo link em outra aba ou celular e ver as mudanças aparecerem

         ○ Tudo certo, pode publicar
         ○ Preciso de ajustes
         ○ Não é isso, precisa repensar"

[Você testa e clica "Tudo certo, pode publicar"]

Agente: "Publicado! 🎉
         https://lista-compras.vercel.app

         O que foi entregue: sistema de lista compartilhada com marcação em tempo real
         Versão: v0.1.0

         Quer adicionar algo mais?"
```

É isso. Do início ao fim: 6 respostas suas + 3 cliques nos gates.

---

## Como responder às perguntas do agente

O agente faz perguntas de produto em linguagem natural. Você tem duas formas de responder:

### Opção A — Resposta no chat
Simplesmente digitando no chat. Funciona bem para respostas curtas.

### Opção B — Ctrl+. (formulário interativo)
Para respostas mais longas ou quando o agente fizer várias perguntas de uma vez, pressione **Ctrl+.** — um formulário aparece com cada pergunta em um campo separado. Você preenche, confirma, e as respostas chegam ao agente de forma organizada.

**Use Ctrl+. quando:**
- O agente fizer 2 ou mais perguntas de uma vez
- Quiser organizar respostas longas
- Quiser revisar o que escreveu antes de enviar

---

## As 3 partes do sistema

### Parte 1 — O Sistema Nervoso (o que garante o processo)

É o conjunto de arquivos que o agente lê antes de responder qualquer coisa. Funciona como um "briefing de plantão": quando você abre uma nova conversa, o agente lê o estado do projeto e continua exatamente de onde parou — mesmo que tenham passado dias.

**O que fica salvo entre sessões:**
- Em que fase está o projeto (especificando, construindo, revisando...)
- O que já foi aprovado em cada gate
- O que o agente fez na última sessão e o que falta
- Quais features estão prontas e quais ainda precisam ser construídas

**Por que isso importa para você:** Você pode interromper a qualquer momento, fechar tudo, voltar dias depois, e o agente retoma sem perder o fio. Não precisa explicar o contexto de novo.

---

### Parte 2 — O Processo (o que garante a qualidade)

São as fases que o agente segue para toda feature:

**Fase 1 — Entender (specification)**
O agente pesquisa referências (se você mencionou alguma), transforma o que você descreveu em uma especificação estruturada com cenários de teste. Você não vê isso — é trabalho interno.

**Fase 2 — Clarificar (clarification)**
Se houver ambiguidades, o agente pergunta — mas só sobre comportamento do produto, nunca sobre tecnologia. "O item some ou fica riscado?" é uma boa pergunta. "Devo usar localStorage ou IndexedDB?" nunca aparece.

**Gate 1 — Aprovação da spec**
Você vê o resumo do que vai ser construído + as decisões que o agente tomou sozinho. Você confirma ou corrige.

**Fase 3 — Planejar (planning)**
O agente decide a tecnologia, divide o trabalho em tarefas e cria um plano. Você não vê os detalhes técnicos — só o resumo no Gate 2.

**Gate 2 — Aprovação do plano**
"Vou construir em X etapas. Pode começar?" Você diz sim ou pede ajuste.

**Fase 4 — Construir (building)**
O agente constrói em loop: implementa, testa, corrige se falhar, passa para a próxima feature. Você pode ver updates opcionais de progresso, mas não precisa intervir.

**Fase 5 — Revisar (self-review)**
Antes de mostrar para você, o agente revisa o próprio trabalho como se fosse um segundo revisor vendo o código pela primeira vez. Bugs encontrados são corrigidos nesta fase. Você nunca vê trabalho incompleto.

**Gate 3 — Validação**
Checklist do que testar + instruções para rodar localmente (ou URL de preview). Você usa o produto e decide: publicar, ajustar, ou repensar.

**Fase 6 — Publicar (publishing)**
Merge, versão, changelog, deploy. Automático após sua aprovação.

---

### Parte 3 — As Ferramentas (o que dá as capacidades)

São os componentes instalados que dão superpoderes ao agente:

| Ferramenta | Para que serve |
|---|---|
| **Loop de build** | Agente fica construindo features até todas estarem prontas, sem precisar de intervenção |
| **Self-review** | Agente revisa o próprio trabalho antes de apresentar. Usa um sistema de prioridades (crítico, urgente, normal, sugestão) |
| **Ctrl+.** | Formulário interativo para você responder perguntas do agente de forma organizada |
| **Verificação local** | Agente testa o app no computador antes de qualquer deploy |
| **Sub-agentes** | Quando preso num problema, lança um "assistente" para diagnosticar sem o viés do histórico |
| **Troca de modelo** | Usa modelos mais baratos para tarefas simples e modelos mais poderosos para debugging difícil |
| **Commit semântico** | Todo código commitado tem mensagem descritiva que você entende se precisar consultar o histórico |
| **Changelog automático** | A cada publicação, o histórico de mudanças é atualizado automaticamente |

---

## Seus 3 momentos de decisão

O sistema foi projetado para que você seja o tomador de decisão — não o executor. Só há 3 momentos onde você precisa agir:

### Gate 1 — "Entendeu certo?"

O agente apresenta:
- O resumo do que vai ser construído (em português)
- Os cenários de aceite (como você vai saber que funcionou)
- As decisões que ele tomou sozinho

Você tem 3 opções: confirmar, corrigir, ou adicionar.

**Importância:** Este é o momento mais crítico. Aqui você garante que o agente vai construir o que você realmente quer. Investir 2 minutos aqui evita construir a coisa errada por horas.

### Gate 2 — "Pode começar?"

O agente apresenta:
- Como vai dividir o trabalho (sem detalhes técnicos)
- O que será entregue primeiro

Você tem 2 opções: aprovar ou ajustar o escopo.

**Importância:** Último momento para mudar de ideia antes do trabalho começar. Depois disso, mudanças de escopo ainda são possíveis mas interrompem o build.

### Gate 3 — "Funcionou como esperado?"

O agente apresenta:
- Instruções para testar localmente (ou URL de preview)
- Checklist dos cenários para testar
- O que foi construído (em linguagem de produto)

Você tem 3 opções: publicar, pedir ajustes, ou repensar.

**Importância:** Você é o QA final. O agente testou tecnicamente, mas só você sabe se atende à necessidade real.

---

## O que o sistema garante (e o que não garante)

### O sistema garante:
- ✅ Nenhum código, erro técnico ou jargão chegará até você
- ✅ Nada vai para produção sem sua aprovação explícita
- ✅ O agente retoma onde parou, mesmo dias depois
- ✅ Bugs encontrados no self-review são corrigidos antes de chegar em você
- ✅ Cada aprovação é registrada — nunca haverá "mas eu não disse isso"
- ✅ O histórico do projeto é mantido de forma legível
- ✅ Mudanças de escopo são tratadas com processo, não improvisação

### O sistema não garante:
- ❌ Que você vai gostar do design (isso depende da Product Constitution que você definiu)
- ❌ Que o produto vai ter sucesso de mercado (isso é sua responsabilidade de produto)
- ❌ Zero iterações no Gate 3 (às vezes o que você imaginava é diferente do que foi construído)
- ❌ Performance perfeita para escala massiva (o sistema é para MVPs e produtos menores)

---

## A Product Constitution — seus princípios de produto

Está em `~/.pi/agent/product-constitution.md`. É o único documento que define como você quer que os produtos se comportem.

O agente lê ela automaticamente no início de todo projeto. Ela governa decisões de design, qualidade e arquitetura sem você precisar repetir suas preferências.

Se quiser ajustar algum princípio, edite diretamente o arquivo. As mudanças valem para todos os projetos a partir da próxima sessão.

---

## Como iniciar um novo projeto

```bash
mkdir ~/nome-do-projeto
cd ~/nome-do-projeto
pi
```

Quando o Pi abrir, digite:

```
/setup
```

O sistema inicializa a estrutura do projeto e pergunta: *"Tudo pronto! O que você quer construir?"*

Descreva em português o que quer criar. O agente segue o workflow automaticamente a partir daí.

---

## Como retomar um projeto existente

Se o projeto já tem `.pi/AGENTS.md` de uma sessão anterior:

```bash
cd ~/nome-do-projeto
pi
```

Basta abrir o Pi na pasta do projeto. O agente lê o estado automaticamente e continua de onde parou.

---

## O que acontece quando as coisas dão errado

O sistema tem 5 níveis de resposta para problemas:

**Nível 1 — Problema simples:** O agente tenta de novo com uma abordagem diferente. Você não é notificado.

**Nível 2 — Problema recorrente:** Usa um modelo mais poderoso. Você não é notificado.

**Nível 3 — Problema difícil:** Lança um "assistente de diagnóstico" que investiga sem o viés de quem criou o problema. Você não é notificado.

**Nível 4 — Problema que precisa de você:** O agente para e descreve o problema em linguagem de consequência:
> "O sistema de login está com dificuldade para se conectar ao servidor. Posso tentar uma abordagem diferente que seria mais simples mas não suportaria login com Google. Quer que eu siga por esse caminho?"

Nunca: "Erro 500 no endpoint /auth/callback. StackTrace: TypeError at line 234..."

**Nível 5 — Entrega parcial:** Se o problema não tem solução rápida, o agente entrega o que funciona e registra o que falta:
> "A lista básica está pronta e funcionando. O compartilhamento em tempo real está com dificuldade — posso entregar o restante agora e voltar a isso na próxima sessão?"

---

## Como o sistema lida com "mudei de ideia"

Você pode mudar de ideia a qualquer momento. O sistema tem dois tratamentos:

**Mudança pequena** (cor, texto, comportamento visual):
O agente absorve e ajusta sem interromper o fluxo.

**Mudança significativa** (remove uma feature, muda o propósito, altera arquitetura):
O agente apresenta o que vai mudar e pede confirmação antes de jogar fora trabalho já feito.

---

## Os projetos de teste recomendados (em ordem de complexidade)

Para aprender o sistema sem pressão, construir nesta ordem:

1. **Site pessoal com blog** — complexidade baixa, bom para aprender o fluxo dos 3 gates
2. **App de lista de compras compartilhado** — complexidade média, testa real-time
3. **Sistema de agendamento simples** — complexidade média-alta, testa integração de dados
4. **Qualquer ideia que você já tenha** — você conhece o requisito de produto melhor do que qualquer exemplo

---

## O que você não vai precisar fazer nunca

Para ficar claro o que o sistema cuida por você:

- ❌ Nunca digitar um comando de terminal (exceto abrir o Pi e `/setup` uma vez por projeto)
- ❌ Nunca ler um diff de código
- ❌ Nunca escolher entre frameworks ou bibliotecas
- ❌ Nunca configurar servidores ou bancos de dados
- ❌ Nunca escrever testes
- ❌ Nunca fazer merge ou criar branches
- ❌ Nunca atualizar um CHANGELOG
- ❌ Nunca configurar CI/CD
- ❌ Nunca depurar um erro técnico

Tudo isso é responsabilidade do agente. Sua responsabilidade é: descrever o que quer, responder as dúvidas (no chat ou via Ctrl+.), aprovar nos gates, e validar que funcionou.
