# Para Bernardo — Como o Sistema Funciona

> **Este documento é para você.** Não tem código, não tem jargão. Explica o sistema em linguagem de produto para você entender como funciona e o que esperar de cada parte.

---

## A ideia em uma frase

Você descreve o que quer criar em português, e um agente de software constrói, testa, revisa e publica — com 3 momentos de aprovação sua e zero comandos técnicos.

---

## O problema que isso resolve

Hoje, se você quer criar um produto digital, você precisa de um desenvolvedor. Você descreve a ideia, ele interpreta, você corrige a interpretação, ele constrói, você testa, pede ajustes, ele ajusta — e cada ciclo leva dias.

Com este sistema, o ciclo acontece em horas. Você só toca no processo em 3 momentos:

1. **"Entendi direito o que você quer?"** — você confirma que o agente entendeu
2. **"Posso começar a construir?"** — você aprova a direção
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

[O agente pesquisa apps de lista de compras existentes, entende o
 que funciona e o que não serve. Depois começa a fazer perguntas.]

Agente: "Entendi a ideia geral! Antes de eu transformar isso em algo
         concreto, preciso entender melhor algumas coisas.

         Que problema isso resolve? Vocês usam alguma coisa hoje?"

Você: "A gente manda mensagem no WhatsApp, mas sempre esquece de
       atualizar. Quero algo onde os dois vejam a mesma lista."

Agente: "Faz sentido. Quando a Helena marca algo como comprado,
         o que deve acontecer? Some da lista ou fica riscado?"

Você: "Fica riscado."

Agente: "E as listas — uma única lista ou por categoria
         (feira, farmácia, padaria...)?"

Você: "Lista única. Simples."

[O agente continua perguntando até não ter NENHUMA dúvida sobre
 o que o produto deve fazer. Pode ser 3 perguntas ou 10 — o que
 importa é que ele entenda tudo antes de começar a construir.]

Agente: "Agora entendi tudo. Vou resumir:

         Problema: Vocês mantêm listas no WhatsApp e sempre esquecem
         de atualizar.

         O que a pessoa poderá fazer:
         • Criar e editar uma lista de compras compartilhada
         • Adicionar e remover itens
         • Marcar como comprado (fica riscado)
         • Ver mudanças em tempo real

         O que fica de fora:
         • Categorias, múltiplas listas, histórico

         Decisões que você tomou:
         • Lista única, não por categoria
         • Item comprado fica riscado, não some
         • Sem login — link compartilhado

         Entendi direito o que você quer construir?
         ○ É isso! Pode seguir
         ○ Quase, mas quero corrigir algo
         ○ Não é isso, vamos repensar"

[Você clica "É isso! Pode seguir"]

[O agente trabalha internamente: transforma o que você disse em
 cenários de teste, cria um plano de construção, verifica se tudo
 é consistente. Você não vê nada disso.]

Agente: "Vou construir em 3 etapas:

         Etapa 1: Lista básica — adicionar itens e visualizar
         Etapa 2: Marcar como comprado (fica riscado)
         Etapa 3: Compartilhamento em tempo real com a Helena

         O planejamento passou pela análise interna sem problemas.

         Posso começar a construir?
         ○ Sim, pode começar!
         ○ Quero ajustar o escopo antes"

[Você clica "Sim, pode começar!"]

[O agente trabalha autonomamente: constrói, testa, revisa o
 próprio trabalho, abre o produto no navegador e verifica que
 tudo funciona.]

Agente: "Verifiquei tudo e está funcionando! 🎉

         O que testei:
         ☑️ Lista aparece vazia na primeira vez
         ☑️ Adicionei 3 itens — todos aparecem
         ☑️ Marquei um como comprado — ficou riscado
         ☑️ Abri em outra aba — mudanças em tempo real
         ☑️ Funciona no celular

         [screenshots do produto]

         Você pode testar em: http://localhost:4321

         Tudo funcionando como esperado?
         ○ Tudo certo, pode publicar!
         ○ Preciso de ajustes
         ○ Não é isso, precisa repensar"

[Você testa e clica "Tudo certo, pode publicar!"]

Agente: "Feature entregue! 🎉
         Lista de compras compartilhada com marcação em tempo real.
         Versão: v0.1.0

         Pronto para a próxima feature — é só descrever o que quer construir."
```

---

## Como responder às perguntas do agente

O agente faz perguntas de produto em linguagem natural. Você tem duas formas de responder:

### Opção A — Resposta no chat
Simplesmente digitando no chat. Funciona bem para respostas curtas.

### Opção B — Ctrl+. (formulário interativo)
Para respostas mais longas ou quando o agente fizer várias perguntas de uma vez, pressione **Ctrl+.** — um formulário aparece com cada pergunta em um campo separado.

**Use Ctrl+. quando:**
- O agente fizer 2 ou mais perguntas de uma vez
- Quiser organizar respostas longas
- Quiser revisar o que escreveu antes de enviar

---

## As 3 partes do sistema

### Parte 1 — Discovery (entender o que você quer)

O agente não começa a construir imediatamente. Primeiro, ele entende.

**A profundidade do discovery é proporcional à importância do projeto.** O agente vai tão fundo quanto necessário — pode fazer 3 perguntas ou 15. O objetivo é: nenhuma suposição sobre o que o produto deve fazer.

Se existem apps parecidos no mercado, o agente pesquisa antes de perguntar. Quando ele apresenta o resumo no Gate 1, você sabe que ele entendeu porque vê suas próprias palavras organizadas.

**Por que isso importa:** Um produto bem entendido é construído certo da primeira vez. Investir tempo aqui evita refazer tudo depois.

---

### Parte 2 — Construção autônoma

Depois que você aprova a direção (Gate 1) e o plano (Gate 2), o agente trabalha sozinho:

1. **Constrói** — implementa feature por feature, cada uma com seu próprio commit
2. **Testa** — escreve testes automatizados e roda até todos passarem
3. **Revisa** — verifica qualidade visual, UX, acessibilidade, e seus princípios da constitution
4. **Verifica** — abre o produto no navegador, percorre cada cenário, tira screenshots

Se algo falha em qualquer etapa, o agente diagnostica e corrige sozinho. Se não consegue depois de 3 tentativas, te avisa em linguagem de consequência (nunca em jargão técnico).

**Dois loops de qualidade garantem consistência:**
- O primeiro verifica que os documentos internos (spec e plano) estão alinhados com o que você descreveu
- O segundo verifica que o código funciona, está bem escrito, e o produto se comporta como esperado

---

### Parte 3 — Seus 3 momentos de decisão

### Gate 1 — "Entendeu o que quero?"

O agente apresenta um resumo curto (menos de 1 página) com:
- O problema que o produto resolve
- O que a pessoa poderá fazer
- O que fica de fora
- As decisões que você tomou durante a conversa

Você tem 3 opções: "É isso!", "Quase, mas quero corrigir algo", ou "Não é isso, vamos repensar".

**Importância:** Este é o momento mais crítico. Se o agente entendeu errado aqui, tudo o que vem depois está errado.

### Gate 2 — "Posso começar a construir?"

O agente apresenta em que etapas vai construir — em linguagem de produto, sem nenhuma menção a tecnologia:
- "Etapa 1: lista básica"
- "Etapa 2: marcação de comprados"
- "Etapa 3: compartilhamento em tempo real"

Se houve correções durante o planejamento interno, ele te avisa: "Identifiquei que X conflitava com Y e já corrigi."

Você tem 2 opções: "Pode começar!" ou "Quero ajustar o escopo antes".

### Gate 3 — "Funcionou?"

O agente mostra o produto rodando + screenshots + checklist de tudo que testou.

Você tem 3 opções: "Pode publicar!", "Preciso de ajustes" (descreva), ou "Não é isso, precisa repensar".

**Importância:** Você é o QA final. O agente testou tecnicamente, mas só você sabe se atende à necessidade real.

---

## O que o sistema garante (e o que não garante)

### O sistema garante:
- ✅ Nenhum código, erro técnico ou jargão chega até você
- ✅ Nada vai para produção sem sua aprovação explícita
- ✅ O agente retoma onde parou, mesmo dias depois
- ✅ Bugs são encontrados e corrigidos antes de chegar em você
- ✅ Cada aprovação é registrada
- ✅ O histórico do projeto é mantido de forma legível

### O sistema não garante:
- ❌ Que você vai gostar do design (depende da Product Constitution que você definiu)
- ❌ Que o produto vai ter sucesso de mercado
- ❌ Zero iterações no Gate 3 (às vezes o que você imaginou é diferente do que foi construído)
- ❌ Performance para escala massiva (o sistema é para MVPs e produtos menores)

---

## O que acontece quando as coisas dão errado

O sistema tem 4 níveis de resposta:

**Nível 1 — Problema simples:** O agente tenta de novo com abordagem diferente. Você não é notificado.

**Nível 2 — Problema recorrente:** Lança um "assistente de diagnóstico" que investiga sem o viés de quem criou o problema. Você não é notificado.

**Nível 3 — Problema que precisa de você:** O agente para e descreve em linguagem de consequência:
> "O compartilhamento em tempo real não está funcionando depois de 3 tentativas. O que prefere?"
> → "Entregar sem essa funcionalidade por agora"
> → "Tentar de novo com uma abordagem diferente"
> → "Voltar ao planejamento e repensar como fazer"

Nunca: "WebSocket connection refused on port 8080. ECONNREFUSED..."

**Nível 4 — Entrega parcial:** Se o problema não tem solução rápida, o agente entrega o que funciona e registra o que falta.

---

## A Product Constitution — seus princípios de produto

Está em `~/.pi/agent/product-constitution.md`. É o documento que define como você quer que os produtos se comportem.

O agente lê automaticamente no início de todo projeto. Governa decisões de design, qualidade e arquitetura sem você precisar repetir.

Se quiser ajustar algum princípio, edite o arquivo. Mudanças valem para todos os projetos a partir da próxima sessão.

---

## Como iniciar um novo projeto

```bash
mkdir ~/nome-do-projeto
cd ~/nome-do-projeto
pi
```

Quando o Pi abrir, digite `/setup`. O sistema inicializa e pergunta: "O que você quer construir?"

---

## Como retomar um projeto existente

```bash
cd ~/nome-do-projeto
pi
```

Basta abrir o Pi na pasta. O agente lê o estado automaticamente e continua de onde parou.

---

## O que você nunca vai precisar fazer

- ❌ Digitar um comando de terminal (exceto `pi` e `/setup` uma vez)
- ❌ Ler código ou diffs
- ❌ Escolher frameworks ou bibliotecas
- ❌ Configurar servidores
- ❌ Escrever testes
- ❌ Fazer merge ou criar branches
- ❌ Atualizar changelog
- ❌ Depurar erros técnicos

Sua responsabilidade é: descrever o que quer, responder as dúvidas, aprovar nos gates, e validar que funcionou.
