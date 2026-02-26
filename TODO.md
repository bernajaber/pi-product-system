# TODO — Fases de Implementação
## Sistema de Criação de Produtos no Pi

> **Como ler este arquivo:** Cada fase tem um objetivo claro, uma lista de tarefas e um critério de "pronto". As tarefas técnicas estão explicadas em linguagem de consequência — você entenderá o que está sendo construído e por quê. O agente que implementar usará o `WORKFLOW-SPEC.md` para os detalhes técnicos.

> **Status de uma tarefa:** `[ ]` pendente → `[x]` concluído → `[~]` em progresso → `[!]` bloqueado

> **Atualização:** O agente atualiza este arquivo ao fim de cada sessão de implementação. Commit no repositório `oh-my-pi-plan/` com a mensagem `"progress: fase X — o que foi feito"`.

---

## Protocolo de Sessão (ler ao iniciar qualquer sessão de implementação)

**Contexto pode ser perdido entre sessões. Este protocolo garante que o trabalho continua de onde parou.**

### Ao INICIAR uma sessão:
1. `cd ~/oh-my-pi-plan`
2. `git log --oneline -5` — ver o que foi feito nas últimas sessões
3. Ler `PROGRESS.md` — APENAS a última entrada (não o arquivo inteiro)
4. Ler `TODO.md` — identificar a próxima fase com `[ ]` pendentes
5. Perguntar ao Bernardo se há alguma atualização de contexto antes de começar
6. Só então: iniciar o trabalho da sessão

### Ao ENCERRAR uma sessão:
1. Atualizar checkboxes no `TODO.md` (pendentes → concluídos)
2. Adicionar entrada no `PROGRESS.md` com: o que fez, decisões, problemas, próximos passos
3. `cd ~/oh-my-pi-plan && git add . && git commit -m "progress: fase X — [resumo em 1 linha]"`
4. Verificar que o Pi ainda funciona antes de fechar

### Escopo por sessão (não tentar fazer demais):
- 1 fase por sessão é o ideal
- Máximo 2 fases se forem curtas (ex: Fase 0 + início da Fase 1)
- Se a fase for grande (Fase 4, Fase 8): dividir em sub-sessões

---

## Protocolo de Segurança (ler antes de qualquer fase)

O maior risco deste projeto é quebrar o Pi durante a construção do sistema — e ficar sem a ferramenta para consertar. Estas regras valem para TODAS as fases:

**Antes de cada fase:**
- [ ] Verificar que `pi` inicia normalmente (abrir e fechar)
- [ ] Fazer backup do global: `cp -r ~/.pi/agent ~/.pi/agent-backup-$(date +%Y%m%d)`
- [ ] Commitar o estado atual do plano: `cd ~/oh-my-pi-plan && git add . && git commit -m "checkpoint: antes da fase X"`

**Durante cada fase:**
- Instalar pacotes npm **um por um** — não todos de uma vez
- Testar cada extensão em `~/pi-system-test/` (diretório descartável) antes de usar em projeto real
- Se algo quebrar: parar imediatamente, não tentar "consertar no mesmo estado quebrado"

**Se o Pi quebrar:**
```bash
# Restaurar global do backup
rm -rf ~/.pi/agent && cp -r ~/.pi/agent-backup-YYYYMMDD ~/.pi/agent

# Desativar extensão problemática sem editar código
WORKFLOW_DISABLED=true pi
```

**Kill switch nas extensões:** toda extensão crítica terá esta primeira linha:
```typescript
if (process.env.WORKFLOW_DISABLED === "true") return;
```

**Escopo das extensões:** extensões em `.pi/extensions/` afetam APENAS aquele projeto. Nunca o Pi globalmente. Esse é o isolamento principal.

---

## FASE 0 — Preparação do Ambiente
**Objetivo:** Ter tudo instalado antes de começar a construir.
**Tempo estimado:** 30 minutos
**Critério de pronto:** `pi` rodando, todas as dependências instaladas, `gh` autenticado.

### 0.1 Verificações básicas
- [x] Node.js instalado e atualizado (v24.1.0 ✓)
- [x] Pi instalado globalmente (v0.55.0, via pi-mono local ✓)
- [x] Anthropic API key configurada (auth.json ✓)
- [x] `pi` inicia sem erros ✓
- [x] Git configurado ✓

### 0.2 Instalar pacotes Pi (um por um, com verificação)

*Cada `pi install` modifica o global (`~/.pi/agent/`). Instalar um, abrir o Pi, confirmar que funciona, só então instalar o próximo.*

**Sequência de instalação segura:**

- [x] Backup antes de começar: `~/.pi/agent-backup-20260225` criado ✓
- [x] `pi install npm:pi-web-access` ✓
- [x] `pi install npm:pi-model-switch` ✓
- [x] `pi install npm:pi-subagents` ✓
- [x] `pi install npm:pi-interactive-shell` ✓
- [x] `pi install npm:pi-interview` ✓
- [x] `pi install npm:pi-review-loop` ✓
- [x] `pi install npm:pi-prompt-template-model` ✓
- [x] `pi install npm:mitsupi` ✓
- [ ] Verificação final: abrir Pi e pedir "liste as ferramentas disponíveis" → deve listar os pacotes instalados

*Se qualquer instalação causar problema: `rm -rf ~/.pi/agent && cp -r ~/.pi/agent-backup-fase0 ~/.pi/agent`*

### 0.3 Instalar ferramentas externas

- [x] `npm install -g surf-cli` — surf v2.6.0 instalado ✓
- [x] Configurar extensão Chrome do surf ✓ (ID: eioeokdkanehpbdnihhgdhehahbbjomk)
- [x] Instalar native host do surf ✓
- [x] Surf conectado e verificado: `surf tab.list` funcionando ✓
- [x] GitHub CLI instalado (gh v2.68.1) ✓
- [x] GitHub autenticado (conta bernajaber) ✓

### 0.4 Criar diretório de trabalho

- [x] Criar pasta para o sistema: `~/pi-product-system/` criado ✓
- [x] Inicializar git ✓
- [x] Criar estrutura base: `.pi/extensions .pi/skills .pi/agents .pi/specs .pi/todos` ✓

---

## FASE 1 — Sistema Nervoso Central
**Objetivo:** O agente sabe onde está, o que fazer e não esquece entre sessões.
**O que isso resolve:** Sem esta fase, o agente começa do zero toda vez que você abre uma nova conversa. Com ela, o agente retoma exatamente de onde parou.
**Tempo estimado:** 2-3 horas
**Critério de pronto:** Abrir uma nova sessão do Pi, o agente lê os artefatos automaticamente e descreve em qual fase o projeto está.

### 1.1 Criar os artefatos de continuidade

*São os arquivos que o agente lê ao início de toda sessão — como um "caderno de passagem de plantão".*

- [x] Criar `.pi/workflow-state.json` com estrutura inicial ✓
- [x] Criar `.pi/progress.md` com template de entrada ✓
- [x] Criar `.pi/feature-list.json` com array vazio ✓
- [x] Verificado: estrutura correta ✓

### 1.2 Criar o AGENTS.md

*Este é o arquivo mais importante do sistema. Contém as instruções do agente — o protocolo que ele segue sem precisar que você lembre dele a cada conversa.*

- [x] Criar `.pi/AGENTS.md` com template completo ✓
- [x] Todas as seções incluídas: identidade, início de sessão, fim de sessão, pós-compaction, workflow map, gates, comunicação, protocolo de falha, mudança de escopo ✓
- [x] Cópia em `./AGENTS.md` (raiz) ✓
- [x] **Teste crítico:** Pi abre em `~/pi-product-system/` com AGENTS.md carregado, 4 skills e 2 extensões do projeto sem erros ✓

### 1.3 Criar a extensão `workflow-engine.ts`

*O "policial" do sistema. Bloqueia ações que violam o processo (como fazer deploy sem aprovação) e injeta o estado do workflow no contexto do agente antes de cada resposta.*

- [x] Criar `.pi/extensions/workflow-engine.ts` ✓
- [x] Bloco 1: Bloqueio de git merge/push e deploy sem Gate 3 ✓
- [x] Bloco 2: Injeção de estado do workflow antes de cada LLM call ✓
- [x] Bloco 3: Preservação na compaction com compact() estático ✓
- [x] Bloco 4: Comando /workflow-status ✓
- [x] **Teste:** workflow-engine.ts carregada com sucesso ✓

### 1.4 Instalar extensões do mitsuhiko

*São ferramentas prontas que cobrem as capacidades que o Pi não tem nativamente.*

- [x] `answer.ts` copiado de mitsupi (instalado em npm global) ✓
- [x] `loop.ts` copiado ✓
- [x] `review.ts` copiado ✓
- [x] `todos.ts` copiado ✓
- [x] Extensões carregam ao abrir Pi em ~/pi-product-system/ ✓ (confirmado)

---

## FASE 2 — Interação Estruturada com o Operador
**Objetivo:** Os 3 gates funcionam com opções clicáveis. Clarificações são naturais.
**O que isso resolve:** Sem esta fase, o agente pode interpretar "sim" de formas diferentes. Com ela, aprovações são explícitas e inequívocas.
**Tempo estimado:** 1-2 horas
**Critério de pronto:** Conseguir completar os 3 gates de um projeto de teste com opções clicáveis no terminal.

### 2.1 Criar o `ask-tool.ts`

*A ferramenta que o agente usa nos momentos de decisão. Em vez de interpretar o que você disse, apresenta opções clicáveis.*

- [x] Criar `.pi/extensions/ask-tool.ts` ✓
- [x] Single-select implementado ✓
- [x] Multi-select com checkboxes ✓
- [x] "Escrever resposta customizada" como escape ✓
- [x] **Teste:** ask tool aparece com opções clicáveis, navegação por setas, Enter confirma ✓

### 2.2 Configurar `answer.ts` para clarificações

*Diferente do ask tool (que é proativo), o answer.ts é reativo — você chama quando quiser responder perguntas que o agente fez em texto.*

- [x] `answer.ts` carregado via mitsupi global ✓
- [x] **Teste:** Ctrl+. abre TUI com as 2 perguntas extraídas automaticamente, campos de resposta funcionando ✓
- [x] Instrução no AGENTS.md: "Na fase clarify, escreva as perguntas em prosa natural. O operador usará Ctrl+. para responder." ✓

### 2.3 Definir quando usar cada ferramenta de interação

Adicionar ao AGENTS.md (seção de comunicação):

- [x] `ask` tool → Gates 1, 2 e 3 — definido no AGENTS.md ✓
- [x] `answer.ts` (Ctrl+.) → Fase clarify — definido no AGENTS.md ✓
- [x] `pi-interview-tool` → Clarificações ricas — definido no AGENTS.md ✓
- [x] Chat livre → Todo o resto — definido no AGENTS.md ✓

---

## FASE 3 — Skills de Produto
**Objetivo:** O agente sabe como fazer cada fase do processo sem instruções manuais.
**O que isso resolve:** Sem skills, o agente improvisa cada fase. Com elas, cada fase tem um protocolo definido que é seguido consistentemente.
**Tempo estimado:** 3-4 horas
**Critério de pronto:** Descrever um produto simples para o agente e ele gerar automaticamente spec estruturada, perguntas de clarificação e plano — sem você precisar guiá-lo.

### 3.1 Criar skill `product-specify`

*Transforma a sua descrição livre em uma especificação estruturada com cenários de teste. Determina também a profundidade do review necessário.*

- [x] `.pi/skills/product-specify/SKILL.md` criado ✓
- [x] Extraiu features de linguagem natural ✓
- [x] Cenários de aceite em linguagem de produto ✓
- [x] Decisões assumidas listadas ✓
- [x] reviewDepth classificado como `simple` ✓
- [x] feature-list.json populado ✓
- [x] Spec salva em `.pi/specs/todo-app/spec.md` ✓
- [x] **Teste:** "app de lista de tarefas simples" → gerou spec com 8+ cenários, classificou como simple ✓

### 3.2 Criar skill `product-clarify`

*Faz perguntas ao operador APENAS sobre comportamento do produto — nunca sobre tecnologia.*

- [x] `.pi/skills/product-clarify/SKILL.md` criado ✓
- [x] 3 perguntas por rodada ✓
- [x] Linguagem de produto (quem usa, o que faz, celular?) ✓
- [x] Escrito em prosa para answer.ts ✓
- [x] **Teste:** Perguntas sobre comportamento (não sobre banco de dados ou framework) ✓

### 3.3 Criar skill `auto-plan`

*Transforma a spec aprovada em um plano técnico sem envolver o operador. O operador só vê o resumo no Gate 2.*

- [x] `.pi/skills/auto-plan/SKILL.md` criado ✓
- [x] Escolheu stack sem perguntar ao operador (HTML/CSS/JS puro) ✓
- [x] Criou feature branch `feature/todo-app` ✓
- [x] Plano salvo em `.pi/specs/todo-app/plan.md` ✓
- [x] Gate 2 apresentado sem mencionar tecnologia ao operador ✓
- [x] **Teste:** Gate 1 → plano automático → Gate 2 sem perguntar sobre tecnologia ✓

### 3.4 Criar skill `product-validate`

*Prepara a validação final: verifica localmente, faz deploy de preview, gera checklist comportamental.*

- [x] `.pi/skills/product-validate/SKILL.md` criado ✓
- [x] Skill instrui verificação local antes do Gate 3 ✓
- [x] Checklist e Gate 3 com 3 opções definidos ✓
- [ ] **Teste pendente:** Verificação local travou (surf/web-browser precisa calibração na Fase 4)

### 3.5 Configurar as skills do mitsupi

*Já instaladas, mas precisam estar disponíveis no contexto certo.*

- [x] mitsupi instalado e verificado ✓
- [x] Skills disponíveis (agente usou frontend-design automaticamente no build) ✓
- [x] AGENTS.md tem instruções de quando usar cada skill ✓

---

## FASE 4 — Build Loop e Self-Review
**Objetivo:** O agente constrói features em loop e revisa o próprio trabalho antes de apresentar.
**O que isso resolve:** Sem esta fase, o agente constrói e imediatamente pede validação — sem checar se está correto. Com ela, o agente só chega ao Gate 3 quando tem evidência de que o que fez funciona.
**Tempo estimado:** 3-4 horas
**Critério de pronto:** Feature de complexidade `medium` construída e revisada sem intervenção manual, com pelo menos 1 bug encontrado e corrigido no self-review.

### 4.1 Configurar o build loop (loop.ts)

*O agente fica em loop construindo features até que todas estejam prontas e testadas. Você pode ver o progresso mas não precisa intervir.*

- [x] loop.ts carregado via mitsupi ✓
- [x] AGENTS.md seção build com instruções de /loop self ✓
- [x] Aliases de modelo configurados: cheap (haiku-4-5), default (sonnet-4-6), heavy (opus-4-6) ✓
- [x] AGENTS.md protocolo de falha com escalonamento de modelo ✓
- [x] /loop tests testado: 3 testes falhando → agente corrigiu 2 bugs → 7/7 passando → signal_loop_success ✓

### 4.2 Configurar sub-agentes para diagnóstico

*Quando o agente principal fica preso num problema, lança um sub-agente "fresh eyes" para investigar sem o viés do histórico.*

- [x] reviewer.md criado (em inglês, com rubric P0-P3) ✓
- [x] spec-checker.md criado (em inglês, checklist pass/fail) ✓
- [x] scout.md criado (em inglês, diagnóstico + soluções) ✓
- [x] AGENTS.md protocolo de falha com /run scout ✓
- [x] Scout testado: subagent tool funciona, scout diagnosticou corretamente o isOverdue ✓ (faltavam tools/model no frontmatter)

### 4.3 Configurar self-review

*Após o build, o agente revisa o próprio código em contexto isolado, usando o rubric P0-P3. Para features complexas, fica em loop até não ter mais problemas bloqueantes.*

- [x] review.ts carregado via mitsupi ✓
- [x] REVIEW_GUIDELINES.md criado (em inglês, com rubric P0-P3, mobile, acessibilidade) ✓
- [x] AGENTS.md seção self-review com /review uncommitted + ciclo de fix ✓
- [x] Corrigido: /review-auto não existe → instruções usam /review uncommitted em loop ✓
- [x] Self-review testado: encontrou 3 bugs P1 reais no teste end-to-end #2 ✓

### 4.4 Configurar verificação local

*O agente testa o app localmente ANTES de apresentar ao operador. Nunca mostra um preview que não funciona.*

- [x] AGENTS.md verificação local com padrão nohup + surf window.new ✓
- [x] Descoberto: bash tool trava com `&` simples — DEVE usar `nohup ... > /dev/null 2>&1 & disown` ✓
- [x] surf testado com localhost: window.new → screenshot → read → window.close funciona ✓
- [x] product-validate skill atualizada com o padrão correto ✓
- [x] Interceptor git push criado em .pi/intercepted-commands/git — bloqueia push main sem Gate 3 ✓
- [x] Verificação local testada: surf + file:// funciona para screenshots e read. Chrome precisa estar aberto. ✓

---

## FASE 5 — Pipeline de Release
**Objetivo:** Publicar uma feature vai de "gate aprovado" para "url de produção + tag de versão + changelog" automaticamente.
**O que isso resolve:** Sem esta fase, o operador precisa fazer merge manualmente, criar tags, atualizar changelog. Com ela, tudo acontece após clicar "Publicar" no Gate 3.
**Tempo estimado:** 2-3 horas
**Critério de pronto:** Feature de teste publicada em produção com tag v0.1.0 e CHANGELOG.md atualizado — tudo automático após Gate 3.

### 5.1 Configurar pipeline de publish

*Sequência de ações automáticas após Gate 3 aprovado.*

- [x] Criar `.pi/skills/auto-publish/SKILL.md` ✓ (feito na Fase 4)
- [x] Squash merge para main via PR ✓
- [x] Criar tag de versão ✓
- [x] Atualizar CHANGELOG.md (mandatory) ✓
- [x] Atualizar `feature-list.json` (passes: true) ✓
- [x] Atualizar `workflow-state.json` (reset) ✓
- [x] Atualizar `progress.md` ✓
- [x] Notificar operador ✓
- [x] **Teste:** counter app (v0.3.0) e stopwatch (v0.4.0) publicados com ciclo completo ✓

### 5.2 Qualidade automatizada e GitHub Actions

*Hoje o agente faz self-review (lê o código e avalia), mas não existe validação automatizada. Esta fase adiciona testes e lint que rodam automaticamente no PR — se falharem, o merge é bloqueado.*

> **Nota:** Deploy para Vercel/Netlify foi despriorizado. O foco aqui é qualidade pré-merge, não hosting. Release no GitHub (PR + tag) continua sendo o publish.

**5.2.1 GitHub Actions — CI no PR**
- [x] Criar `.github/workflows/ci.yml` ✓
  - [x] Trigger: pull_request para main ✓
  - [x] Rodar lint (HTML válido) ✓
  - [x] Rodar testes automatizados se existirem ✓
  - [x] CI rodou e passou no PR #3 (tip calculator) em 12s ✓
- [x] **Teste:** CI passou no PR do tip calculator ✓

**5.2.2 GitHub Actions — Release automático na tag**
- [x] Criar `.github/workflows/release.yml` ✓
  - [x] Trigger: push de tag `v*` ✓
  - [x] Extrair notas do CHANGELOG.md ✓
  - [x] Criar GitHub Release com as notas ✓
- [x] **Teste:** Tag v0.5.0 → Release action rodou com sucesso ✓

**5.2.3 Atualizar skill auto-plan para incluir testes**
- [x] Modificar `.pi/skills/auto-plan/SKILL.md` ✓
  - [x] Toda plan inclui task final "Write automated tests" ✓
  - [x] Testes cobrem cenários de aceitação da spec ✓
  - [x] Para HTML/JS: testes com Node.js assert (sem framework) ✓
- [x] **Teste:** Tip calculator → plan incluiu Task 7 (testes) → 25 testes criados → todos passando ✓

### 5.3 Versionar o próprio sistema

*O sistema de criação de produtos também precisa de controle de versão.*

- [x] CHANGELOG.md já existe e é mantido pelo auto-publish ✓
- [x] Criar `package.json` com versão (v0.5.0, sincronizado com tag atual) ✓
- [x] Auto-publish atualizado: `npm version` no Step 6 mantém package.json sincronizado ✓
- [x] Processo de release: auto-publish skill É o processo — não precisa do make-release do mitsupi ✓

---

## FASE 6 — Calibração e Ajustes de Modelo
**Objetivo:** O agente usa o modelo certo para cada tarefa — barato para tarefas simples, potente para tarefas complexas.
**O que isso resolve:** Sem calibração, o agente usa o mesmo modelo para tudo. Com ela, commits e exploração usam Haiku (barato), implementação usa Sonnet, debugging difícil escalona para Opus.
**Tempo estimado:** 1 hora
**Critério de pronto:** Commit gerado automaticamente usando modelo barato. Review de código usando modelo adequado.

### 6.1 Configurar aliases de modelo

- [x] Aliases criados em `/opt/homebrew/lib/node_modules/pi-model-switch/aliases.json` ✓ (feito na Fase 4)
- [x] cheap=haiku-4-5, default=sonnet-4-6, heavy=opus-4-6 ✓
- [x] Testado: switch_model funciona ✓

### 6.2 Criar prompt templates por modo

*Cada fase do workflow usa o modelo e as skills certas automaticamente.*

- [x] Criar `.pi/prompts/spec-mode.md` (Sonnet + product-specify) ✓
- [x] Criar `.pi/prompts/review-mode.md` (Sonnet + product-validate) ✓
- [x] Criar `.pi/prompts/heavy-debug.md` (Opus + scout) ✓
- [x] **Teste:** Pi reconhece os 3 templates como `/spec-mode`, `/review-mode`, `/heavy-debug` ✓

### 6.3 Adicionar proteção de custo ao AGENTS.md

- [x] Max 3 iterações de review (Sonnet). Se não convergir: 1 tentativa com Opus ✓
- [x] Max 2 escalações para Opus por feature ✓
- [x] Max 20 turnos sem progresso → escalar para operador ✓
- [x] Max 2 self-review rounds (não polir pra sempre) ✓
- [x] Estimativas de referência: simple ~$2-5, medium ~$5-15, complex ~$15-40 ✓

---

## FASE 7 — Captura da Product Constitution
**Objetivo:** O operador define seus princípios de produto UMA VEZ e o agente os segue para sempre em todos os projetos.
**O que isso resolve:** Sem a constitution, o agente não sabe que "texto de erro nunca pode ser técnico" ou "todo produto deve funcionar no celular". Com ela, essas regras são automáticas.
**Tempo estimado:** 1-2 horas (inclui conversa com o operador)
**Critério de pronto:** `product-constitution.md` criado. Agente cita os princípios ao tomar decisões.

### 7.1 Criar mecanismo de captura e estrutura

- [x] Estrutura de duas camadas definida:
  - Global: `~/.pi/agent/product-constitution.md` (quem é o Bernardo, princípios universais)
  - Projeto: `.pi/engineering-constitution.md` (tradução técnica dos princípios)
  - Projeto-específico: `.pi/product-constitution.md` (princípios que variam por projeto — opcional)
- [x] AGENTS.md atualizado: lê product constitution no início de toda sessão ✓
- [x] AGENTS.md referencia ambas as constitutions ✓

### 7.2 Sessão de captura com Bernardo

- [x] Conversa sobre quem é o Bernardo: detalhista, curioso, não técnico ✓
- [x] Captura de frustrações: "faltou carinho", bugs visíveis, botões quebrados ✓
- [x] Captura de inspirações: Pi e NanoClaw — simples, manutenível, expansível ✓
- [x] Pesquisa de referências: SpecKit constitution, NanoClaw philosophy, Pi blog post ✓
- [x] 7 princípios fundamentais definidos:
  1. Faça uma coisa bem feita (INEGOCIÁVEL)
  2. Design pixel perfect (INEGOCIÁVEL)
  3. Rápido ou parece rápido (INEGOCIÁVEL)
  4. Zero bugs visíveis (INEGOCIÁVEL)
  5. Simplicidade radical
  6. Extensível, não configurável
  7. Local e transparente
- [x] Product Constitution escrita em `~/.pi/agent/product-constitution.md` ✓

### 7.3 Criar `engineering-constitution.md`

- [x] Criar `.pi/engineering-constitution.md` com:
  - [x] Scope discipline: cada feature precisa de um "porquê" claro ✓
  - [x] Visual standards: mobile-first 375px, spacing 4/8px, tipografia, touch targets ✓
  - [x] Performance: < 1.5s first paint, < 100ms feedback, loading states ✓
  - [x] Quality: edge cases, automated tests, zero console errors ✓
  - [x] Architecture: minimal deps, stack based on spec, no premature abstraction ✓
  - [x] Code: separation of concerns, composition over inheritance ✓
  - [x] Data: local first, exportable, no tracking ✓
  - [x] Version control: trunk-based, feature branches, squash merge, conventional commits ✓
  - [x] Testing: mandatory test task in every plan, Node.js assert ✓
  - [x] Communication: consequences not technology ✓

---

## FASE 8 — Teste End-to-End (Projeto Piloto)
**Objetivo:** Validar que o sistema inteiro funciona, da conversa até o deploy.
**O que isso resolve:** Esta fase descobre gaps que só aparecem quando tudo roda junto.
**Tempo estimado:** 4-8 horas (dependendo de bugs encontrados)
**Critério de pronto:** Projeto piloto publicado em produção após 5+ sessões, com menos de 2 intervenções manuais por sessão.

### 8.1 Projeto piloto: site pessoal com blog

*Projeto escolhido por ser simples o suficiente para focar no processo, mas real o suficiente para expor gaps.*

Features:
- Página "sobre mim"
- Lista de projetos
- Blog com posts em markdown
- Formulário de contato

### 8.2 Critérios de sucesso mensuráveis

- [ ] Fluxo sobreviveu 5+ sessões com no máximo 2 intervenções manuais por sessão
- [ ] Gates 1, 2 e 3 funcionaram sem ambiguidade (operador nunca teve dúvida do que clicar)
- [ ] Self-review encontrou ao menos 1 problema que o builder não havia visto
- [ ] `progress.md` + `feature-list.json` deram contexto suficiente entre sessões
- [ ] Verificação local (Camada 0) detectou pelo menos 1 problema antes do deploy
- [ ] Custo por feature ficou dentro do estimado: simple ~$2-5
- [ ] Nenhuma mensagem técnica chegou ao operador (zero stack traces, zero jargão)
- [ ] Nenhum push para main sem Gate 3 aprovado (bloqueio funcionou)

### 8.3 Roteiro do piloto

- [ ] **Sessão 1:** Descrever o projeto → Product Constitution → Gate 1 → Gate 2
- [ ] **Sessão 2:** Build das primeiras features (página sobre mim + projetos)
- [ ] **Sessão 3:** Build do blog + formulário
- [ ] **Sessão 4:** Self-review + correções + Gate 3
- [ ] **Sessão 5:** Publish + verificação em produção
- [ ] **Retrospectiva:** O que funcionou, o que precisou de intervenção, o que mudar

### 8.4 Documentar os gaps encontrados

- [ ] Manter lista de problemas encontrados durante o piloto
- [ ] Para cada problema: descrever, classificar (bug / falta de instrução / design flaw), propor correção
- [ ] Atualizar `WORKFLOW-SPEC.md` com as correções
- [ ] Atualizar o AGENTS.md com instruções adicionais se necessário

---

## FASE 9 — Experiência Visual (Opcional)
**Objetivo:** O agente gera UIs com estética intencional, não genérica.
**Nota:** Esta fase é opcional para o sistema funcionar. Adiciona qualidade mas não é bloqueante.
**Tempo estimado:** 1-2 horas

### 9.1 Configurar visual-explainer

*Transforma tabelas e diagramas chatos do terminal em páginas HTML bonitas que abrem no browser.*

- [ ] Instalar: `pi install https://github.com/nicobailon/visual-explainer`
- [ ] Testar: `/diff-review` após uma mudança no piloto → verificar página HTML gerada
- [ ] `/plan-review` com o plano de uma feature → verificar comparação visual

### 9.2 Configurar pi-annotate

*Permite anotar diretamente no browser e o agente recebe as anotações como feedback.*

- [ ] Instalar: `pi install npm:pi-annotate`
- [ ] Configurar extensão Chrome
- [ ] **Teste:** Abrir o preview do projeto piloto → anotar algo que está errado → verificar que o agente recebe e corrige

### 9.3 Calibrar frontend-design skill para o projeto

- [ ] Adicionar ao `.pi/AGENTS.md` (parte dinâmica, após Product Constitution):
  ```
  "Quando a spec mencionar interface, tela, componente visual ou layout:
  Carregar automaticamente a skill frontend-design antes de escrever código de UI.
  Definir direção estética consistente com os princípios da Product Constitution."
  ```

---

## FASE 10 — Operação Contínua
**Objetivo:** O sistema está em produção e o operador pode criar projetos e features indefinidamente.
**O que isso resolve:** Esta fase define como o sistema se mantém atualizado e como novos projetos são criados.

### 10.1 Criar script de bootstrap para novos projetos

*Um novo projeto deve ser criado em < 5 minutos com toda a infraestrutura pronta.*

- [ ] Criar `scripts/new-project.sh` que:
  - [ ] Cria diretório do projeto
  - [ ] Cria estrutura `.pi/`
  - [ ] Copia extensões de `.pi/extensions/`
  - [ ] Copia skills de `.pi/skills/`
  - [ ] Inicializa artefatos (workflow-state, progress, feature-list)
  - [ ] Copia AGENTS.md template (parte fixa)
  - [ ] Inicializa git
- [ ] **Teste:** Criar novo projeto usando o script → verificar que está pronto para o operador descrever o produto

### 10.2 Criar README para o sistema

*Documentação de como o operador usa o sistema — não técnica.*

- [ ] Criar `README.md` em linguagem de produto (ver `PARA-BERNARDO.md` como base)
- [ ] Incluir: como iniciar um projeto, como funciona o processo, o que fazer se algo der errado

### 10.3 Manutenção e atualizações

- [ ] Processo para atualizar pacotes Pi: `pi update`
- [ ] Processo para atualizar extensões do mitsuhiko: re-copiar do repositório quando houver mudanças
- [ ] Processo para evoluir o AGENTS.md: baseado em aprendizados dos projetos (retrospectiva pós-projeto)

---

## FASE 11 — Extensões de Produtividade
**Objetivo:** Instalar extensões do repositório de exemplos do Pi que melhoram segurança, feedback e organização.
**Quando:** Após concluir todas as fases anteriores.
**Referência:** `github.com/badlogic/pi-mono/tree/main/packages/coding-agent/examples/extensions/`

### 11.1 Extensões prioritárias

| Extensão | Ganho |
|----------|-------|
| `notify.ts` | Notificação desktop quando o agente termina |
| `git-checkpoint.ts` | Pontos de restauração a cada turno |
| `trigger-compact.ts` | Compactação automática em sessões longas |
| `protected-paths.ts` | Bloqueia escrita em .env, .git/, node_modules/ |
| `preset.ts` | Modos de trabalho (plan/build/review) com modelo e tools definidos |
| `session-name.ts` | Nomes claros pra cada sessão |
| `handoff.ts` | Transfere contexto pra sessão nova sem perder |
| `status-line.ts` | Feedback visual de progresso |

- [ ] Avaliar cada extensão em detalhe
- [ ] Instalar uma por vez, testar após cada uma
- [ ] Verificar que não conflita com extensões existentes (workflow-engine, ask-tool)

---

## Resumo por Prioridade

### P0 — Sem isso o sistema não funciona
- Fase 1: AGENTS.md + artefatos + workflow-engine
- Fase 2: ask-tool + answer
- Fase 3: skills de produto (specify, clarify, plan, validate)
- Fase 4: build loop + self-review

### P1 — Sem isso o sistema é manual em partes importantes
- Fase 0: instalação de todos os pacotes
- Fase 5: pipeline de release automatizado
- Fase 7: product constitution
- Fase 8: piloto end-to-end

### P2 — Melhoria de qualidade e experiência
- Fase 6: calibração de modelo
- Fase 9: experiência visual
- Fase 10: operação contínua

---

## Dependências entre Fases

```
Fase 0 (instalação)
  └→ Fase 1 (sistema nervoso)
       └→ Fase 2 (interação)
       └→ Fase 4 (build loop) ←── Fase 3 (skills)
            └→ Fase 5 (release)
                 └→ Fase 8 (piloto)
                      └→ Fase 10 (operação)

Fase 6 (modelos) ──→ qualquer fase (pode ser feito a qualquer momento)
Fase 7 (constitution) ──→ antes do piloto
Fase 9 (visual) ──→ opcional, após piloto
```

---

## Estimativa de Tempo Total

| Fase | Horas estimadas |
|------|----------------|
| 0 — Preparação | 0.5h |
| 1 — Sistema nervoso | 2-3h |
| 2 — Interação estruturada | 1-2h |
| 3 — Skills de produto | 3-4h |
| 4 — Build loop + review | 3-4h |
| 5 — Release pipeline | 2-3h |
| 6 — Calibração modelos | 1h |
| 7 — Product Constitution | 1-2h |
| 8 — Piloto | 4-8h |
| 9 — Visual (opcional) | 1-2h |
| 10 — Operação | 1-2h |
| **Total** | **~20-31h** |

*Nota: estas horas são de trabalho do agente implementando, não tempo real do operador. O operador só intervém nos gates e no piloto.*
