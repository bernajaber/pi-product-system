# Para Bernardo — O Que Estamos Construindo e Por Quê

> **Este documento é para você.** Não tem código, não tem jargão. Explica o sistema em linguagem de produto para você entender o que está sendo construído, como vai funcionar e o que esperar de cada parte.

---

## A ideia em uma frase

Estamos construindo um sistema onde você descreve o que quer criar em português, e um agente de software constrói, testa, revisa e publica — com 3 momentos de aprovação sua e zero comandos técnicos.

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

Você abre o terminal, digita `pi`, e começa a conversar em português:

```
Você: "Quero criar um app de lista de compras onde eu e a Helena 
       possamos adicionar itens e marcar como comprado em tempo real"

Agente: "Entendi! Antes de começar, tenho 2 dúvidas:
         As listas são por categoria (feira, farmácia...) ou uma lista única?
         Quando você marca algo como comprado, ele some da lista ou fica riscado?"
         
         [Você pressiona Ctrl+. e responde no formulário que aparece]
         "Lista única. Fica riscado."

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
         
         Teste aqui: https://lista-preview.vercel.app
         
         Checklist do que fazer:
         □ Criar uma lista
         □ Adicionar 3 itens
         □ Marcar um como comprado (deve ficar riscado)
         □ Abrir o mesmo link em outro aba ou celular e ver as mudanças aparecerem
         
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

São as 8 fases que o agente segue para toda feature:

**Fase 1 — Entender (specification)**
O agente transforma o que você descreveu em uma especificação estruturada com cenários de teste. Você não vê isso — é trabalho interno.

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
URL de preview + checklist do que testar. Você usa o produto e decide: publicar, ajustar, ou repensar.

**Fase 6 — Publicar (publishing)**
Merge, versão, changelog, deploy. Automático após sua aprovação.

---

### Parte 3 — As Ferramentas (o que dá as capacidades)

São os componentes instalados que dão superpoderes ao agente:

| Ferramenta | Para que serve |
|---|---|
| **Loop de build** | Agente fica construindo features até todas estarem prontas, sem precisar de intervenção |
| **Self-review** | Agente revisa o próprio trabalho antes de apresentar. Usa um sistema de prioridades (crítico, urgente, normal, sugestão) |
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
- URL de preview para você testar
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
- ❌ Que você vai gostar do design (isso depende da Product Constitution que você definir)
- ❌ Que o produto vai ter sucesso de mercado (isso é sua responsabilidade de produto)
- ❌ Zero iterações no Gate 3 (às vezes o que você imaginava é diferente do que foi construído)
- ❌ Performance perfeita para escala massiva (o sistema é para MVPs e produtos menores)

---

## A Product Constitution — o único documento que você define

É o único texto técnico que você vai criar no sistema inteiro. São seus princípios de produto: como você quer que os produtos que construir se comportem.

Não precisa ser formal. O agente vai fazer perguntas e capturar a partir das suas respostas.

**Exemplos do que vai ter:**
- "O usuário nunca deve ver uma mensagem de erro técnica"
- "Todo produto deve funcionar bem no celular"
- "Prefiro entregar rápido e simples do que esperar pelo perfeito"
- "Dados do usuário são sagrados — nunca perder, sempre poder desfazer"
- "Me mostre um checklist do que foi feito, não o código"

Uma vez definida, o agente segue esses princípios automaticamente em todos os projetos. Você só precisa fazer isso uma vez.

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

## Como iniciar uma sessão de trabalho

```
cd ~/oh-my-pi-plan
pi
```

Quando o Pi abrir, digite apenas:

> **"Nova sessão."**

O agente lê os arquivos do projeto, te conta onde está e o que vai fazer. Você confirma e ele começa. Se você quiser direcionar a sessão para algo específico, pode dizer: *"Nova sessão. Quero focar na Fase 2 hoje."*

---

## O que você não vai precisar fazer nunca

Para ficar claro o que o sistema cuida por você:

- ❌ Nunca digitar um comando de terminal (exceto abrir o Pi)
- ❌ Nunca ler um diff de código
- ❌ Nunca escolher entre frameworks ou bibliotecas
- ❌ Nunca configurar servidores ou bancos de dados
- ❌ Nunca escrever testes
- ❌ Nunca fazer merge ou criar branches
- ❌ Nunca atualizar um CHANGELOG
- ❌ Nunca configurar CI/CD
- ❌ Nunca depurar um erro técnico

Tudo isso é responsabilidade do agente. Sua responsabilidade é: descrever o que quer, aprovar nos gates, e validar que funcionou.

---

## Cronograma de construção do sistema

O sistema em si está sendo construído em fases. Aqui está o que cada fase entrega para você:

| Fase | O que você ganha |
|---|---|
| **Fase 1 (Sistema nervoso)** | Agente não esquece entre sessões |
| **Fase 2 (Interação)** | Gates com opções clicáveis |
| **Fase 3 (Skills)** | Agente sabe como fazer cada fase do processo |
| **Fase 4 (Build loop)** | Construção automática + self-review |
| **Fase 5 (Release)** | Publicação automática com changelog |
| **Fase 7 (Constitution)** | Agente segue seus princípios de produto |
| **Fase 8 (Piloto)** | **Primeiro projeto real do sistema** |

O piloto (Fase 8) é o site pessoal com blog. A partir daí, o sistema está pronto para qualquer projeto.
