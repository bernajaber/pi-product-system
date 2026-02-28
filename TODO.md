# TODO — Pi Product System V2

> **Para quem vai trabalhar nisso:** leia `docs/ARCHITECTURE-V2.md` PRIMEIRO. Este TODO é o plano de execução — o ARCHITECTURE-V2 é o porquê de cada decisão.
>
> Status: `[ ]` pending · `[x]` done · `[~]` in progress
>
> **Regra:** execute na ordem. Cada fase depende da anterior. Não pule fases.

---

## O que é este projeto

Um sistema de criação de produtos para o [Pi coding agent](https://github.com/badlogic/pi-mono/). O operador descreve o que quer construir em português → o sistema cuida de spec, planejamento, build, review e publicação — com 3 gates de aprovação do operador.

O sistema vive neste repo e é instalado em `~/.pi/agent/` via symlinks (`install.sh`). Cada produto criado tem sua própria pasta e git — este repo é a ferramenta, não o produto.

**Repo:** `github.com/bernajaber/pi-product-system` (privado)
**Local:** `/Users/bernardojaber/pi-product-system-repo`
**Install path:** `~/.pi/agent/` (skills, extensions, agents via symlinks)

---

## Done — V1 (Phases 0-9)

> V1 está funcional. Piloto completo com personal-crm (~/personal-crm). O refactor V2 corrige violações de filosofia e melhora a arquitetura.

- [x] Pi packages instalados (pi-web-access, pi-model-switch, pi-subagents, pi-interactive-shell, pi-interview, pi-review-loop, pi-prompt-template-model, mitsupi)
- [x] workflow-state.json + feature-list.json + progress.md schemas
- [x] ask-tool.ts — aprovações interativas via ctx.ui.select
- [x] V1 skills: product-specify, product-clarify, auto-plan, build-loop, product-validate, auto-publish
- [x] Agents: reviewer.md, scout.md, spec-checker.md
- [x] REVIEW_GUIDELINES.md, Product Constitution v1.1.0, Engineering Constitution template
- [x] install.sh / uninstall.sh (symlink-based), README, CHANGELOG
- [x] /setup command como extensão determinística
- [x] Piloto end-to-end: personal-crm (~/personal-crm) — ciclo completo funcionou
- [x] Removed project-tracker.ts (extensão conflitante do pi-mono que bloqueava TDD)

## Done — V2 Design (2026-02-26)

> Sessão de design completa. Todas as decisões documentadas em ARCHITECTURE-V2.md.

- [x] Análise de filosofia: V1 viola "do one thing well" em 5 skills
- [x] Nova arquitetura: 9 skills, 2 loops de qualidade, 3 gates
- [x] 13 pontos abertos identificados, discutidos e resolvidos
- [x] Auditoria completa do repo: classificou cada arquivo como deletar/reescrever/atualizar/manter
- [x] ARCHITECTURE-V2.md completo — spec de implementação

---

## Phase 0 — Limpeza do repo ✅

> Remove informação V1 que contradiz a V2. Um agente que leia esses arquivos antes do ARCHITECTURE-V2 vai entender o sistema errado.

### 0.1 — Deletar arquivos obsoletos

- [x] **Deletar `docs/WORKFLOW-SPEC.md`** (1.410 linhas)
  - É a spec técnica completa da V1. Descreve workflow-engine.ts (não existe no repo), extensões como arquivos de projeto (são npm packages), nomes antigos de skills, 4 gates em vez de 3
  - Completamente supersedido por `docs/ARCHITECTURE-V2.md`
  - Um agente lendo os dois vai se contradizer em tudo

- [x] **Deletar `PROGRESS.md`** (~400 linhas, 15 entradas)
  - Histórico de desenvolvimento da V1: "corrigido bug no uv.ts", "testei counter app", "commitei stopwatch"
  - Nada relevante para V2. Gasta tokens de contexto com problemas que não existem mais
  - Se quiser preservar para arqueologia: `git log` tem tudo

- [x] **Deletar `skills/product-clarify/SKILL.md`**
  - Skill sem output próprio — era só um conjunto de regras para fazer perguntas
  - Na V2, foi absorvida pela skill `discovery` (que produz brief.md)

### 0.2 — Arquivar referências V1

- [x] **Mover `docs/WORKFLOW-SPEC.md` → `docs/archive/WORKFLOW-SPEC-V1.md`** (alternativa ao delete se preferir manter)
  - Adicionar header: "⚠️ ARCHIVED — V1 spec. Superseded by ARCHITECTURE-V2.md. Do NOT use for implementation."

---

## Phase 1 — Skills V2 ✅

> Cada skill tem: um input, um output, uma responsabilidade. Ver ARCHITECTURE-V2.md §4 para o mapa completo.
>
> **Ordem importa:** skills são criadas na ordem do workflow porque cada uma referencia a anterior.

### 1.1 — Criar skills novas

- [x] **`skills/discovery/SKILL.md`** — NOVA (não existia na V1)
  - **Input:** descrição do operador em linguagem natural
  - **Output:** `brief.md` — documento curto (< 1 página) com 6 seções (ver ARCHITECTURE-V2.md §6)
  - **Mecanismo:** entrevista profunda em chat natural (PT), pesquisa web, Ctrl+.
  - **Profundidade:** sem limite de rodadas. Termina quando ZERO suposições sobre comportamento do usuário
  - **Perguntas obrigatórias:** problema, quem usa, capacidades, escopo negativo, definição de sucesso
  - **Perguntas condicionais:** dados, multi-user, integrações, dinheiro, conteúdo
  - **Apresenta Gate 1** via ask tool: operador vê brief.md e aprova direção
  - **Gate 1 feedback paths:** "é isso" / "quero corrigir algo" (atualiza brief) / "não é isso" (re-roda)
  - **Referência:** substitui `product-clarify` + fase de entrevista de `product-specify`

- [x] **`skills/analyze/SKILL.md`** — NOVA (não existia na V1)
  - **Input:** brief.md + spec.md + plan.md + constitutions (product + engineering + review guidelines)
  - **Output:** `critique.md` — documento interno com issues classificadas + reviewDepth final
  - **Mecanismo:** sub-agente sem contexto de conversa (pi-subagents) — lê SOMENTE os documentos
  - **Classificação obrigatória:** cada issue é `spec-problem` ou `plan-problem` (sem ambiguidade)
  - **Cascata:** spec-problem → specify + plan re-rodam. plan-problem → somente plan re-roda
  - **Loop:** max 3 ciclos. Se não resolver → escala para operador (ver ARCHITECTURE-V2.md §10)
  - **reviewDepth:** simple/medium/complex baseado nos 3 documentos + modificadores
  - **Apresenta Gate 2** via ask tool: operador vê resumo em PT (sem tecnologia) + resultado do analyze
  - **Referência:** usa `agents/spec-checker.md` como sub-agente (atualizar agent — ver 3.1)

- [x] **`skills/test/SKILL.md`** — NOVA (extraída de build-loop)
  - **Input:** código commitado (output do build)
  - **Output:** testes passando
  - **Mecanismo:** `/loop tests` — condição objetiva: testes verdes. Retry automático em falha
  - **Testes:** `node tests/<feature>.test.js` — Node.js assert, sem frameworks externos
  - **Referência:** era a última task do `build-loop`, agora é skill independente

- [x] **`skills/review/SKILL.md`** — NOVA (extraída de build-loop)
  - **Input:** código commitado que já passou por test
  - **Output:** código limpo — sem P0/P1
  - **Mecanismo:** `/review uncommitted` (mitsupi), max 3 ciclos
  - **Critérios V2:** P0/P1 = o que testes não cobrem (UX, visual, acessibilidade, princípios da constitution)
  - **NÃO re-verifica funcionalidade** (isso é do test). Verifica qualidade e princípios
  - **Referência:** era Phase 2 do `build-loop`, agora é skill independente

### 1.2 — Reescrever skills existentes

- [x] **`skills/specify/SKILL.md`** — REESCRITA de product-specify
  - **Input:** brief.md (aprovado no Gate 1) — NÃO faz entrevista, NÃO pesquisa
  - **Output:** spec.md — cenários de aceite estruturados, documento INTERNO (operador não vê)
  - **Diferença da V1:** product-specify fazia 3 coisas (pesquisa + entrevista + spec). V2 specify só escreve spec
  - **Se o brief foi profundo o suficiente:** spec não precisa assumir nada. Se assume algo → discovery falhou
  - **Template:** manter formato de cenários de aceite, remover "Assumed Decisions" (não devem existir)
  - **Criar como arquivo novo** em `skills/specify/SKILL.md`

- [x] **`skills/build/SKILL.md`** — REESCRITA de build-loop
  - **Input:** plan.md (aprovado no Gate 2)
  - **Output:** código commitado — uma task = um commit
  - **Mecanismo:** `/loop self` — persistência autônoma entre turnos
  - **NÃO escreve testes** (isso é do test skill)
  - **NÃO faz review** (isso é do review skill)
  - **Diferença da V1:** build-loop fazia 3 coisas. V2 build só implementa features
  - **Criar como arquivo novo** em `skills/build/SKILL.md`

### 1.3 — Renomear skills (conteúdo atualizado para V2)

- [x] **`skills/auto-plan/` → `skills/plan/SKILL.md`**
  - Renomear diretório
  - Atualizar conteúdo: remover "Gate 2 Presentation" (Gate 2 agora é responsabilidade do analyze)
  - Manter: template de plan.md, regras de tasks atômicas, stack choice, "Write Tests" como última task
  - **A task "Write Tests" continua no plan** mas é executada pela skill `test`, não pela skill `build`

- [x] **`skills/auto-publish/` → `skills/publish/SKILL.md`**
  - Renomear diretório
  - Atualizar: nomes de gates (briefApproved, planApproved, releaseApproved em vez de V1)
  - Manter: os 8 passos do pipeline de release (decisão consciente — ver ARCHITECTURE-V2.md §17)
  - Adicionar: `gh repo create` se remote não existir (fix do piloto V1)

### 1.4 — Deletar skills V1 substituídas

> Só deletar DEPOIS que as novas estiverem criadas e testadas.

- [x] Deletar `skills/product-specify/` (substituída por `skills/specify/`)
- [x] Deletar `skills/build-loop/` (split em `skills/build/` + `skills/test/` + `skills/review/`)
- [x] Deletar `skills/product-validate/` (substituída por `skills/validate/` — Phase 3)
- [x] Deletar `skills/product-clarify/` (absorvida por `skills/discovery/`)
- [x] Deletar `skills/auto-plan/` (renomeada para `skills/plan/`)
- [x] Deletar `skills/auto-publish/` (renomeada para `skills/publish/`)

---

## Phase 2 — Infraestrutura ✅

> Atualiza tudo que referencia skills V1 ou workflow V1.

### 2.1 — Extension: product-setup

- [x] **Reescrever `extensions/product-setup/index.ts`**
  - **AGENTS.md template:** reescrever inteiro para workflow V2:
    - Workflow: discovery → Gate 1 → specify → plan → analyze loop → Gate 2 → build → test → review → validate → Gate 3 → publish
    - Skill names: `discovery`, `specify`, `plan`, `analyze`, `build`, `test`, `review`, `validate`, `publish`
    - Referências: `~/.pi/agent/skills/<name>/SKILL.md` para cada skill
    - Gates: Gate 1 = brief (não spec), Gate 2 = plan summary (não plan técnico), Gate 3 = produto verificado
    - Regras: usar ask tool para gates, todos artefatos em English, comunicação em PT
  - **ENGINEERING_CONSTITUTION template:** revisar mas manter estrutura (é sólida)
  - **WORKFLOW_STATE template:** atualizar para schema V2:
    ```json
    {
      "currentPhase": "init",
      "feature": null,
      "gates": { "briefApproved": false, "planApproved": false, "releaseApproved": false },
      "analyzeLoop": { "cycle": 0, "maxCycles": 3, "lastIssueType": null, "lastIssueSummary": null },
      "codeLoop": { "cycle": 0, "maxCycles": 3, "lastFailedScenario": null, "lastDiagnosis": null, "lastReentryTask": null },
      "failureCount": 0
    }
    ```
  - **REVIEW_GUIDELINES template:** atualizar para critérios V2
  - **Adicionar `gh repo create`:** após initial commit, perguntar operador public/private, criar remote
  - **sendUserMessage:** atualizar texto para "seguir workflow em .pi/AGENTS.md: começar com discovery skill"

### 2.2 — Review Guidelines

- [x] **Reescrever `REVIEW_GUIDELINES.md`**
  - **Contexto V2:** o review skill recebe código que JÁ PASSOU por test. Os critérios refletem isso:
    - **P0 (bloqueia release):** quebra algo que test não pegou — estado impossível, crash visual, dados perdidos
    - **P1 (urgente):** violação de princípio da constitution — lento, não responsivo, complexo demais, faltou carinho
    - **P2 (normal):** qualidade de código — naming, organização, dead code, imports não usados
    - **P3 (sugestão):** nice to have — refactoring, padrões melhores
  - **Remover:** foco excessivo em mobile/responsive (isso vira um critério entre vários, não O critério)
  - **Adicionar:** critérios de UX, acessibilidade, princípios da Product Constitution

### 2.3 — Install/Uninstall

- [x] **Reescrever `install.sh`**
  - Skills V2: `discovery`, `specify`, `plan`, `analyze`, `build`, `test`, `review`, `validate`, `publish` (9 skills, não 6)
  - Extensions: `product-setup/` (diretório) + `ask-tool.ts` (arquivo) — mantém igual
  - Agents: `reviewer.md`, `scout.md`, `spec-checker.md` — mantém igual
  - Root files: `product-constitution.md`, `REVIEW_GUIDELINES.md` — mantém igual

- [x] **Reescrever `uninstall.sh`**
  - Espelhar install.sh com os 9 nomes V2

### 2.4 — Agents

- [x] **Atualizar `agents/reviewer.md`**
  - Adicionar contexto V2: "O código que você está revisando já passou por testes automatizados. Não re-verifique funcionalidade. Foque em: UX, visual, acessibilidade, princípios da Product Constitution, e o que testes automatizados não cobrem."
  - Manter: modelo haiku, rubric P0-P3, output "correct" ou "needs attention"

- [x] **Atualizar `agents/scout.md`**
  - Adicionar lógica V2: quando chamado pelo code loop, mapear cenário falho → task do plan.md
  - Output deve incluir: qual cenário falhou, qual task é responsável, se é build problem ou test problem
  - Manter: modelo haiku, investigação sem contexto de build

- [x] **Atualizar `agents/spec-checker.md`**
  - Adaptar para o `analyze` skill: ler brief+spec+plan+constitutions (não só spec+code)
  - Classificar issues como `spec-problem` ou `plan-problem`
  - Output deve incluir: reviewDepth recomendado
  - Manter: modelo haiku, checklist format

### 2.5 — ask-tool.ts

- [x] **Atualizar description do `ask-tool.ts`**
  - Trocar "Gate 1: confirm spec and assumed decisions" → "Gate 1: confirm brief and direction"
  - Trocar "Gate 2: confirm build plan" → "Gate 2: confirm plan summary"
  - Trocar "Gate 3: final validation before publishing" → "Gate 3: verified product, approve release"
  - Código funcional não muda — só a description para o agente

### 2.6 — Repo AGENTS.md

- [x] **Reescrever `.pi/AGENTS.md`**
  - Este é o AGENTS.md do REPO (para desenvolver o sistema), não dos produtos
  - Atualizar: referências V2, skill map V2, workflow V2
  - Remover: referências a `bernardo-blog`, nomes V1, pilotos antigos

---

## Phase 3 — Browser + Validate ✅

> Depende de Phase 1 e 2 estarem completas. O validate é a última skill porque depende do browser E de todas as outras skills para o loop funcionar.

- [x] **Pesquisar comandos do `agent-browser`**
  - Ler SKILL.md do agent-browser: `~/.pi/agent/skills/agent-browser/` (se existir) ou docs do pacote
  - Mapear equivalências: surf `window.new` → agent-browser `open`, surf `screenshot` → agent-browser `screenshot`, etc.
  - Documentar os comandos no SKILL.md do validate

- [x] **Criar `skills/validate/SKILL.md`**
  - **Input:** código limpo (output do review) + spec.md (cenários de aceite)
  - **Output:** produto verificado + checklist de evidências + screenshots
  - **Mecanismo:** agent-browser (Playwright, headless, auto-gerenciado — não precisa de Chrome open)
  - **Processo:** abrir app → percorrer CADA cenário do spec → screenshot → PASS/FAIL
  - **Regra hard:** "Verificação DEVE incluir pelo menos 1 screenshot. Sem screenshot = sem Gate 3."
  - **Se cenário falha:** entra no code quality loop (ver ARCHITECTURE-V2.md §5)
  - **Apresenta Gate 3:** operador vê produto + screenshots + checklist

- [x] Deletar `skills/product-validate/` (substituída por validate)

---

## Phase 4 — Documentação ✅

> Reescreve docs para refletir V2. Só fazer DEPOIS que skills e infra estiverem prontas — assim documenta o que realmente existe.

- [x] **Reescrever `README.md`**
  - Estrutura do repo com 9 skills V2 (não 6 V1)
  - Workflow V2: discovery → Gate 1 → specify → plan → analyze loop → Gate 2 → build → test → review → validate → Gate 3 → publish
  - 3 gates (não 4), nomes corretos, sem referência a surf
  - Install/usage atualizado
  - Referência ao ARCHITECTURE-V2.md para detalhes técnicos

- [x] **Reescrever `docs/PARA-BERNARDO.md`**
  - 3 gates (não 4): Gate 1 = brief, Gate 2 = plano, Gate 3 = produto verificado
  - Fluxo atualizado: discovery profundo antes de qualquer escrita
  - Remover referências a surf, product-specify, auto-plan, build-loop
  - Manter tom: linguagem de produto, sem jargão, exemplos práticos
  - Seção "Como vai parecer na prática" — reescrever com o fluxo V2

- [x] **Atualizar `CHANGELOG.md`**
  - Adicionar entry v2.0.0 com todas as mudanças da V2

---

## Phase 5 — Verificação

> Testa tudo junto. Só começar quando Phases 1-4 estiverem completas.

- [x] **Test: install.sh em ambiente limpo**
  - Verified: 9 skills + 3 extensions + 2 agents + 2 root files correct

- [x] **Test: uninstall.sh + reinstall**
  - Verified: clean uninstall, clean reinstall

- [x] **Test: /setup em projeto novo**
  - Verified: AGENTS.md V2, workflow-state V2, all skill references correct

- [x] **Piloto end-to-end com produto real**
  - Hello World integration test: build → test → review → validate → Gate 3 → publish (~4 min)
  - Propostas Comerciais: full pipeline discovery → Gate 3 (~$8.34)
  - Brownfield dashboard: discovery → review (~$3.68)
  - Checkpoints verified:
    - [x] Discovery faz perguntas profundas (sem limite de rodadas)
    - [x] brief.md tem 6 seções, < 1 página
    - [x] Gate 1 apresenta brief (não spec)
    - [x] specify produz spec sem suposições
    - [x] plan tem tasks atômicas com mapeamento de cenários
    - [x] analyze loop detecta inconsistências
    - [x] Gate 2 apresenta resumo em PT sem tecnologia
    - [x] build implementa uma task por commit (product-loop governs)
    - [x] test roda até verde (product-loop governs)
    - [x] review usa critérios V2 (P0/P1 = o que test não cobre, product-loop sends rubric)
    - [x] validate abre browser, percorre cenários, tira screenshots
    - [ ] Code loop re-entry cirúrgico (untested — tests passed after review)
    - [x] Gate 3 mostra produto + screenshots + checklist
    - [x] publish completa o ciclo (tested via Hello World integration)

---

## V2.4 — Confiança e Visibilidade (2026-02-27)

> **Problema real:** tudo acontece debaixo do capô. Não é fácil saber se estamos indo na direção certa sem ler dezenas de arquivos. E não há garantia de que Feature B não quebra Feature A.
>
> **Princípio:** Radical simplicity. Essas mudanças são instruções em skills — zero código novo.
>
> **Regra:** executar na ordem. Regressão é a fundação de confiança.

### Phase 5.1 — Regressão

> **Problema:** Quando o agente constrói Feature B, não roda os testes de Feature A. Se algo quebrou, ninguém sabe até abrir o app. É isso que destrói a confiança ao adicionar features.
>
> **Solução:** Rodar TODOS os testes do projeto, sempre. Antes de implementar e depois de implementar.

- [ ] **Adicionar baseline check no `build/SKILL.md`**
  - Novo Step 0 (antes de implementar qualquer task):
    - "Rode todos os testes existentes no projeto (`npm test`, `node --test`, ou o runner configurado). Se algum teste falha, conserte ANTES de implementar qualquer task nova. O main deve estar verde antes de você tocar em qualquer coisa."
  - **Arquivo modificado:** `skills/build/SKILL.md`

- [ ] **Atualizar `test/SKILL.md` para rodar TODOS os testes**
  - Instrução explícita: "Rode TODOS os testes do projeto, não apenas os testes da feature atual. Regressão é tão importante quanto os testes novos. Se um teste antigo quebrou, é sua responsabilidade consertar."
  - **Arquivo modificado:** `skills/test/SKILL.md`

---

### Phase 5.2 — Progress.md (visibilidade durante o build)

> **Problema:** Entre Gate 2 e Gate 3, o operador não tem como saber o que está acontecendo sem perguntar ao agente ou ler git log. Quer abrir UM arquivo e saber em 30 segundos: onde está, o que foi feito, o que falta.
>
> **Solução:** O agente atualiza `.pi/specs/<feature>/progress.md` após cada task do build.

- [ ] **Adicionar instrução no `build/SKILL.md`**
  - Após completar cada task (depois do commit), atualizar `.pi/specs/<feature>/progress.md`:
    ```markdown
    # <nome do produto> — Progresso

    ## O que estamos construindo
    <1-2 frases do brief.md>

    ## Progresso
    ✅ 1. <task 1 — descrição curta>
    ✅ 2. <task 2 — descrição curta>
    🔨 3. <task 3 — descrição curta> ← agora
    ⬜ 4. <task 4 — descrição curta>
    ⬜ 5. <task 5 — descrição curta>

    ## O que acabou de acontecer
    <2-3 frases sobre o que foi implementado no último task>

    ## Decisões técnicas
    - <decisão 1 e por quê>
    - <decisão 2 e por quê>
    ```
  - Escrever em português (o operador é brasileiro).
  - Manter curto — o objetivo é 30 segundos de leitura, não documentação.
  - **Arquivo modificado:** `skills/build/SKILL.md`

- [ ] **Criar progress.md no `/setup`**
  - Adicionar ao template do `product-setup/index.ts`: criar `.pi/specs/<feature>/progress.md` com conteúdo inicial:
    ```markdown
    # <nome> — Progresso

    Aguardando início do build.
    ```
  - **Arquivo modificado:** `extensions/product-setup/index.ts`

---

### Phase 5.3 — Backlog (feature-list.json como fila real)

> **Problema:** `feature-list.json` existe mas é write-only. Não funciona como backlog — não tem prioridade, não orienta "o que fazer depois", não conecta features entre si.
>
> **Solução:** Transformar em backlog real. Operador prioriza. Agente pega da fila.

- [ ] **Definir schema do backlog**
  - `feature-list.json` passa a ser array ordenado (posição = prioridade):
    ```json
    [
      {
        "id": "proposal-generator",
        "name": "Gerador de Propostas",
        "status": "done",
        "brief": ".pi/specs/proposal-generator/brief.md"
      },
      {
        "id": "proposal-history",
        "name": "Histórico de Propostas",
        "status": "in-progress",
        "brief": ".pi/specs/proposal-history/brief.md"
      },
      {
        "id": "client-management",
        "name": "Gestão de Clientes",
        "status": "backlog",
        "brief": null
      }
    ]
    ```
  - Status possíveis: `backlog` (ideia), `in-progress` (sendo construída), `done` (publicada)
  - Ordenação = prioridade (o operador pode reordenar)

- [ ] **Atualizar `discovery/SKILL.md`**
  - No Step 0: ler `feature-list.json`. Se a feature sendo descoberta já existe como `backlog`, atualizar status para `in-progress`. Se não existe, adicionar.
  - **Arquivo modificado:** `skills/discovery/SKILL.md`

- [ ] **Atualizar `publish/SKILL.md`**
  - No Step 8 (reset): atualizar status da feature para `done` no `feature-list.json`.
  - Já faz algo parecido (audit fix #8) — alinhar com o novo schema.
  - **Arquivo modificado:** `skills/publish/SKILL.md`

- [ ] **Atualizar `product-setup/index.ts`**
  - `/setup` cria `feature-list.json` como array vazio `[]` (se não existir).
  - Se já existe, não sobrescreve (idempotência — já implementada no audit fix #1).
  - **Arquivo modificado:** `extensions/product-setup/index.ts`

---

## V3 — Observabilidade (2026-02-27)

> **Princípio:** Radical simplicity. O trace grava. O summary mostra. Você lê e decide.
>
> Sem dashboard HTML, sem analytics engine, sem scorers automáticos, sem registry centralizado.
> Um arquivo JSONL grava tudo. Um arquivo markdown resume. Você compara com os olhos.
>
> **Regra de arquitetura:** cada extension faz UMA coisa.
> - `product-loop.ts` → governa fluxo (já existe, recebe verificação de transição + check de suposições)
> - `execution-trace.ts` → registra o que aconteceu (NOVA, JSONL append-only)
> - `ask-tool.ts` → apresenta gates (já existe, recebe gate entries no trace)
>
> **Regra de execução:** execute na ordem. Phase 6 é fundação.

### Phase 6 — Execution Trace

> **Problema:** O Pi não registra o que aconteceu. Quando uma sessão reinicia, o único contexto é workflow-state.json (números). Não há como responder "o que o agente fez?", "quanto custou?", "onde travou?".
>
> **Depois:** Você lê o trace, vê "discovery levou 12 turns e $3.40", reescreve a skill, próxima feature leva 6 turns e $1.80. Otimização por visibilidade, não por automação.

- [ ] **Criar `extensions/execution-trace.ts`**
  - Extension separada. Uma responsabilidade: gravar o que aconteceu.
  - **Hook principal: `turn_end`** (não `agent_end`) — dispara uma vez por chamada LLM, tem `event.message` com usage completo.
  - Lê `workflow-state.json` → campo `feature`. Se não existe, não grava.
  - Append ao `.pi/specs/<feature>/trace.jsonl` — um JSON por linha.
  - **Schema do trace entry:**
    ```typescript
    {
      timestamp: string,         // ISO 8601
      phase: string,             // currentPhase do workflow-state
      turn: number,              // incremental dentro da extension
      action: string,            // resumo ≤150 chars (últimos chars da resposta, limpos)
      tags: string[],            // extraídos por pattern-matching (ver abaixo)
      progress: {                // snapshot do workflow-state
        task: number,
        of: number,
        status: string
      } | null,
      duration_ms: number,       // tempo desde último entry
      // Dados de custo — vêm de event.message.usage (AssistantMessage)
      tokens_in: number,
      tokens_out: number,
      cache_read: number,
      cost_usd: number,          // usage.cost.total — já calculado pelo Pi
      model: string,             // event.message.model
      stop_reason: string        // event.message.stopReason
    }
    ```
  - **Tags extraídas por pattern-matching na resposta do agente:**
    - `COMMIT` — contém "git commit" / "committed"
    - `WRITE_FILE` — contém "created file" / "wrote file"
    - `TEST_PASS` — contém "test" + "pass"
    - `TEST_FAIL` — contém "test" + "fail"
    - `REVIEW_CYCLE` — contém "P0" ou "P1"
    - `SCREENSHOT` — contém "screenshot"
    - `PHASE_CHANGE` — `currentPhase` mudou desde último turn
  - **State persistido via `pi.appendEntry`:** `{ lastTimestamp, turn, lastPhase }`
  - **Handlers:** `turn_end` (gravar entry), `session_start` (restaurar state)
  - **Arquivo novo:** `extensions/execution-trace.ts`

- [ ] **Adicionar gate entries no `ask-tool.ts`**
  - Quando operador responde um gate, append entry no trace com tag `GATE_APPROVED` ou `GATE_REJECTED`
  - 5 linhas: ler workflow-state, montar entry, append.
  - **Arquivo modificado:** `extensions/ask-tool.ts`

- [ ] **Atualizar `install.sh` e `uninstall.sh`**
  - Adicionar symlink para `execution-trace.ts`
  - **Arquivos modificados:** `install.sh`, `uninstall.sh`

- [ ] **Unit tests**
  - Entry escrita no arquivo correto, tags extraídas, JSONL válido, duration calculado, cost fields presentes, feature ausente não causa crash
  - **Arquivo novo:** `test/test-execution-trace.ts`

---

### Phase 7 — Verified Completion

> **Problema:** Nada impede o agente de avançar de fase sem ter feito o trabalho. Enforced por prompt, não por mecanismo.

- [ ] **Verificação de transição no `product-loop.ts`**
  - `build → test`: `execSync("git log --oneline -1")` — se falha, bloqueia
  - `test → review`: existe `*.test.*` no projeto? — se não, bloqueia
  - Se falha: enviar follow-up mandando voltar. Se passa: fluxo normal.
  - try/catch no execSync — exceção = falha.
  - **Arquivo modificado:** `extensions/product-loop.ts`

- [ ] **Unit tests**
  - build→test sem commit rejeita, com commit aceita, exceção tratada
  - **Arquivo modificado:** `test/test-product-loop.ts`

---

### Phase 8 — Discovery Depth

> **Problema:** O agente pode ignorar "ZERO suposições" e escrever o brief com assumptions.

- [ ] **"Assumption Audit" step no `discovery/SKILL.md`**
  - Antes de escrever o brief: listar suposições restantes. Lista vazia = pode escrever.
  - **Arquivo modificado:** `skills/discovery/SKILL.md`

- [ ] **Check de suposições no `product-loop.ts`**
  - Se brief.md existe e contém "assumed" / "TBD" / "assumption" / "assuming" (case insensitive): follow-up alertando.
  - Heurística simples, pattern matching, zero tokens.
  - **Arquivo modificado:** `extensions/product-loop.ts`

---

### Phase 9 — Workspace Safety

> **Problema:** Se o Pi trava no build, não tem como voltar ao estado limpo.

- [ ] **Tag `pre-build/<feature>` no `build/SKILL.md`**
  - Criar antes do primeiro task. Recovery: `git reset --hard pre-build/<feature>`.
  - **Arquivo modificado:** `skills/build/SKILL.md`

- [ ] **Cleanup da tag no `publish/SKILL.md`**
  - Deletar no Step 8: `git tag -d pre-build/<feature> 2>/dev/null || true`
  - **Arquivo modificado:** `skills/publish/SKILL.md`

---

### Phase 10 — Feature Summary

> **Problema:** Após publish, não há visão consolidada de como a feature foi construída.
>
> **Solução:** Um markdown gerado após publish que agrega o trace em números legíveis.
> Não é um dashboard HTML. Não é analytics. É um summary que você lê em 30 segundos.
>
> **Dependência:** Phase 6 (trace). Sem trace, não há dados para agregar.

- [ ] **Gerar summary no `publish/SKILL.md`**
  - Após Step 7 (antes do reset), ler `.pi/specs/<feature>/trace.jsonl` e gerar `.pi/specs/<feature>/summary.md`
  - **Conteúdo do summary:**
    ```markdown
    # Feature Summary: <feature-name>

    **Período:** 2026-02-27 10:00 → 2026-02-27 12:30 (2h30)
    **Custo total:** $8.34
    **Modelo principal:** claude-sonnet-4
    **Turns totais:** 52

    ## Por fase
    | Fase       | Turns | Custo  | Duração | Stuck |
    |------------|-------|--------|---------|-------|
    | discovery  |     8 |  $2.30 |   15min |     0 |
    | specify    |     2 |  $0.40 |    3min |     0 |
    | plan       |     3 |  $0.55 |    5min |     0 |
    | analyze    |     4 |  $0.70 |    6min |     0 |
    | build      |    24 |  $3.10 |   85min |     2 |
    | test       |     5 |  $0.60 |   12min |     1 |
    | review     |     4 |  $0.50 |    8min |     0 |
    | validate   |     2 |  $0.19 |   16min |     0 |

    ## Qualidade
    - Gate 1: aprovado na 1ª tentativa
    - Gate 3: aprovado na 1ª tentativa
    - Review cycles: 2
    - Escalações: 0

    ## Observações
    - Build task 3 causou 2 turns stuck (auth module)
    - Cache hit rate: 64%
    - Stop reason "length": 0 (contexto nunca estourou)
    ```
  - O agente gera esse markdown lendo o trace.jsonl e fazendo as contas.
  - Instrução no publish: "Antes do Step 8, leia `.pi/specs/<feature>/trace.jsonl`, agrege por fase, e escreva `.pi/specs/<feature>/summary.md` com o template acima."
  - **Arquivo modificado:** `skills/publish/SKILL.md`

---

## Future

> Não implementar agora. Registrado para não perder.

**Infraestrutura:**
- [ ] Converter para pi package (`pi install git:github.com/bernajaber/pi-product-system`)
- [ ] Per-project constitution overrides
- [ ] Multi-feature workflow (worktrees completas) ← Phase 9 é o primeiro passo

**Observabilidade avançada (quando a escala justificar):**
- [ ] Dashboard HTML — visualização da feature em andamento (burndown, timeline)
- [ ] Analytics cross-project — velocity, custo por feature, tendências
- [ ] Skill versioning — correlacionar mudanças nas skills com métricas (conceito MLflow)
- [ ] Scorers automáticos — validar output de cada skill (brief tem 6 seções? tests usam assert?)
- [ ] Prompt optimization loop — A/B de versões de skills com métricas comparadas

**Qualidade:**
- [ ] Two-stage review pre-filtering (regex antes do LLM)
- [ ] Long-term memory across sessions (TF-IDF para preferências do operador)

**Produtividade:**
- [ ] Extensões: git-checkpoint, protected-paths, session-name, status-line, notify
