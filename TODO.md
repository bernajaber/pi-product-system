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

## Phase 0 — Limpeza do repo

> Remove informação V1 que contradiz a V2. Um agente que leia esses arquivos antes do ARCHITECTURE-V2 vai entender o sistema errado.

### 0.1 — Deletar arquivos obsoletos

- [ ] **Deletar `docs/WORKFLOW-SPEC.md`** (1.410 linhas)
  - É a spec técnica completa da V1. Descreve workflow-engine.ts (não existe no repo), extensões como arquivos de projeto (são npm packages), nomes antigos de skills, 4 gates em vez de 3
  - Completamente supersedido por `docs/ARCHITECTURE-V2.md`
  - Um agente lendo os dois vai se contradizer em tudo

- [ ] **Deletar `PROGRESS.md`** (~400 linhas, 15 entradas)
  - Histórico de desenvolvimento da V1: "corrigido bug no uv.ts", "testei counter app", "commitei stopwatch"
  - Nada relevante para V2. Gasta tokens de contexto com problemas que não existem mais
  - Se quiser preservar para arqueologia: `git log` tem tudo

- [ ] **Deletar `skills/product-clarify/SKILL.md`**
  - Skill sem output próprio — era só um conjunto de regras para fazer perguntas
  - Na V2, foi absorvida pela skill `discovery` (que produz brief.md)

### 0.2 — Arquivar referências V1

- [ ] **Mover `docs/WORKFLOW-SPEC.md` → `docs/archive/WORKFLOW-SPEC-V1.md`** (alternativa ao delete se preferir manter)
  - Adicionar header: "⚠️ ARCHIVED — V1 spec. Superseded by ARCHITECTURE-V2.md. Do NOT use for implementation."

---

## Phase 1 — Skills V2

> Cada skill tem: um input, um output, uma responsabilidade. Ver ARCHITECTURE-V2.md §4 para o mapa completo.
>
> **Ordem importa:** skills são criadas na ordem do workflow porque cada uma referencia a anterior.

### 1.1 — Criar skills novas

- [ ] **`skills/discovery/SKILL.md`** — NOVA (não existia na V1)
  - **Input:** descrição do operador em linguagem natural
  - **Output:** `brief.md` — documento curto (< 1 página) com 6 seções (ver ARCHITECTURE-V2.md §6)
  - **Mecanismo:** entrevista profunda em chat natural (PT), pesquisa web, Ctrl+.
  - **Profundidade:** sem limite de rodadas. Termina quando ZERO suposições sobre comportamento do usuário
  - **Perguntas obrigatórias:** problema, quem usa, capacidades, escopo negativo, definição de sucesso
  - **Perguntas condicionais:** dados, multi-user, integrações, dinheiro, conteúdo
  - **Apresenta Gate 1** via ask tool: operador vê brief.md e aprova direção
  - **Gate 1 feedback paths:** "é isso" / "quero corrigir algo" (atualiza brief) / "não é isso" (re-roda)
  - **Referência:** substitui `product-clarify` + fase de entrevista de `product-specify`

- [ ] **`skills/analyze/SKILL.md`** — NOVA (não existia na V1)
  - **Input:** brief.md + spec.md + plan.md + constitutions (product + engineering + review guidelines)
  - **Output:** `critique.md` — documento interno com issues classificadas + reviewDepth final
  - **Mecanismo:** sub-agente sem contexto de conversa (pi-subagents) — lê SOMENTE os documentos
  - **Classificação obrigatória:** cada issue é `spec-problem` ou `plan-problem` (sem ambiguidade)
  - **Cascata:** spec-problem → specify + plan re-rodam. plan-problem → somente plan re-roda
  - **Loop:** max 3 ciclos. Se não resolver → escala para operador (ver ARCHITECTURE-V2.md §10)
  - **reviewDepth:** simple/medium/complex baseado nos 3 documentos + modificadores
  - **Apresenta Gate 2** via ask tool: operador vê resumo em PT (sem tecnologia) + resultado do analyze
  - **Referência:** usa `agents/spec-checker.md` como sub-agente (atualizar agent — ver 3.1)

- [ ] **`skills/test/SKILL.md`** — NOVA (extraída de build-loop)
  - **Input:** código commitado (output do build)
  - **Output:** testes passando
  - **Mecanismo:** `/loop tests` — condição objetiva: testes verdes. Retry automático em falha
  - **Testes:** `node tests/<feature>.test.js` — Node.js assert, sem frameworks externos
  - **Referência:** era a última task do `build-loop`, agora é skill independente

- [ ] **`skills/review/SKILL.md`** — NOVA (extraída de build-loop)
  - **Input:** código commitado que já passou por test
  - **Output:** código limpo — sem P0/P1
  - **Mecanismo:** `/review uncommitted` (mitsupi), max 3 ciclos
  - **Critérios V2:** P0/P1 = o que testes não cobrem (UX, visual, acessibilidade, princípios da constitution)
  - **NÃO re-verifica funcionalidade** (isso é do test). Verifica qualidade e princípios
  - **Referência:** era Phase 2 do `build-loop`, agora é skill independente

### 1.2 — Reescrever skills existentes

- [ ] **`skills/specify/SKILL.md`** — REESCRITA de product-specify
  - **Input:** brief.md (aprovado no Gate 1) — NÃO faz entrevista, NÃO pesquisa
  - **Output:** spec.md — cenários de aceite estruturados, documento INTERNO (operador não vê)
  - **Diferença da V1:** product-specify fazia 3 coisas (pesquisa + entrevista + spec). V2 specify só escreve spec
  - **Se o brief foi profundo o suficiente:** spec não precisa assumir nada. Se assume algo → discovery falhou
  - **Template:** manter formato de cenários de aceite, remover "Assumed Decisions" (não devem existir)
  - **Criar como arquivo novo** em `skills/specify/SKILL.md`

- [ ] **`skills/build/SKILL.md`** — REESCRITA de build-loop
  - **Input:** plan.md (aprovado no Gate 2)
  - **Output:** código commitado — uma task = um commit
  - **Mecanismo:** `/loop self` — persistência autônoma entre turnos
  - **NÃO escreve testes** (isso é do test skill)
  - **NÃO faz review** (isso é do review skill)
  - **Diferença da V1:** build-loop fazia 3 coisas. V2 build só implementa features
  - **Criar como arquivo novo** em `skills/build/SKILL.md`

### 1.3 — Renomear skills (conteúdo atualizado para V2)

- [ ] **`skills/auto-plan/` → `skills/plan/SKILL.md`**
  - Renomear diretório
  - Atualizar conteúdo: remover "Gate 2 Presentation" (Gate 2 agora é responsabilidade do analyze)
  - Manter: template de plan.md, regras de tasks atômicas, stack choice, "Write Tests" como última task
  - **A task "Write Tests" continua no plan** mas é executada pela skill `test`, não pela skill `build`

- [ ] **`skills/auto-publish/` → `skills/publish/SKILL.md`**
  - Renomear diretório
  - Atualizar: nomes de gates (briefApproved, planApproved, releaseApproved em vez de V1)
  - Manter: os 8 passos do pipeline de release (decisão consciente — ver ARCHITECTURE-V2.md §17)
  - Adicionar: `gh repo create` se remote não existir (fix do piloto V1)

### 1.4 — Deletar skills V1 substituídas

> Só deletar DEPOIS que as novas estiverem criadas e testadas.

- [ ] Deletar `skills/product-specify/` (substituída por `skills/specify/`)
- [ ] Deletar `skills/build-loop/` (split em `skills/build/` + `skills/test/` + `skills/review/`)
- [ ] Deletar `skills/product-validate/` (substituída por `skills/validate/` — Phase 3)
- [ ] Deletar `skills/product-clarify/` (absorvida por `skills/discovery/`)
- [ ] Deletar `skills/auto-plan/` (renomeada para `skills/plan/`)
- [ ] Deletar `skills/auto-publish/` (renomeada para `skills/publish/`)

---

## Phase 2 — Infraestrutura

> Atualiza tudo que referencia skills V1 ou workflow V1.

### 2.1 — Extension: product-setup

- [ ] **Reescrever `extensions/product-setup/index.ts`**
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

- [ ] **Reescrever `REVIEW_GUIDELINES.md`**
  - **Contexto V2:** o review skill recebe código que JÁ PASSOU por test. Os critérios refletem isso:
    - **P0 (bloqueia release):** quebra algo que test não pegou — estado impossível, crash visual, dados perdidos
    - **P1 (urgente):** violação de princípio da constitution — lento, não responsivo, complexo demais, faltou carinho
    - **P2 (normal):** qualidade de código — naming, organização, dead code, imports não usados
    - **P3 (sugestão):** nice to have — refactoring, padrões melhores
  - **Remover:** foco excessivo em mobile/responsive (isso vira um critério entre vários, não O critério)
  - **Adicionar:** critérios de UX, acessibilidade, princípios da Product Constitution

### 2.3 — Install/Uninstall

- [ ] **Reescrever `install.sh`**
  - Skills V2: `discovery`, `specify`, `plan`, `analyze`, `build`, `test`, `review`, `validate`, `publish` (9 skills, não 6)
  - Extensions: `product-setup/` (diretório) + `ask-tool.ts` (arquivo) — mantém igual
  - Agents: `reviewer.md`, `scout.md`, `spec-checker.md` — mantém igual
  - Root files: `product-constitution.md`, `REVIEW_GUIDELINES.md` — mantém igual

- [ ] **Reescrever `uninstall.sh`**
  - Espelhar install.sh com os 9 nomes V2

### 2.4 — Agents

- [ ] **Atualizar `agents/reviewer.md`**
  - Adicionar contexto V2: "O código que você está revisando já passou por testes automatizados. Não re-verifique funcionalidade. Foque em: UX, visual, acessibilidade, princípios da Product Constitution, e o que testes automatizados não cobrem."
  - Manter: modelo haiku, rubric P0-P3, output "correct" ou "needs attention"

- [ ] **Atualizar `agents/scout.md`**
  - Adicionar lógica V2: quando chamado pelo code loop, mapear cenário falho → task do plan.md
  - Output deve incluir: qual cenário falhou, qual task é responsável, se é build problem ou test problem
  - Manter: modelo haiku, investigação sem contexto de build

- [ ] **Atualizar `agents/spec-checker.md`**
  - Adaptar para o `analyze` skill: ler brief+spec+plan+constitutions (não só spec+code)
  - Classificar issues como `spec-problem` ou `plan-problem`
  - Output deve incluir: reviewDepth recomendado
  - Manter: modelo haiku, checklist format

### 2.5 — ask-tool.ts

- [ ] **Atualizar description do `ask-tool.ts`**
  - Trocar "Gate 1: confirm spec and assumed decisions" → "Gate 1: confirm brief and direction"
  - Trocar "Gate 2: confirm build plan" → "Gate 2: confirm plan summary"
  - Trocar "Gate 3: final validation before publishing" → "Gate 3: verified product, approve release"
  - Código funcional não muda — só a description para o agente

### 2.6 — Repo AGENTS.md

- [ ] **Reescrever `.pi/AGENTS.md`**
  - Este é o AGENTS.md do REPO (para desenvolver o sistema), não dos produtos
  - Atualizar: referências V2, skill map V2, workflow V2
  - Remover: referências a `bernardo-blog`, nomes V1, pilotos antigos

---

## Phase 3 — Browser + Validate

> Depende de Phase 1 e 2 estarem completas. O validate é a última skill porque depende do browser E de todas as outras skills para o loop funcionar.

- [ ] **Pesquisar comandos do `agent-browser`**
  - Ler SKILL.md do agent-browser: `~/.pi/agent/skills/agent-browser/` (se existir) ou docs do pacote
  - Mapear equivalências: surf `window.new` → agent-browser `open`, surf `screenshot` → agent-browser `screenshot`, etc.
  - Documentar os comandos no SKILL.md do validate

- [ ] **Criar `skills/validate/SKILL.md`**
  - **Input:** código limpo (output do review) + spec.md (cenários de aceite)
  - **Output:** produto verificado + checklist de evidências + screenshots
  - **Mecanismo:** agent-browser (Playwright, headless, auto-gerenciado — não precisa de Chrome open)
  - **Processo:** abrir app → percorrer CADA cenário do spec → screenshot → PASS/FAIL
  - **Regra hard:** "Verificação DEVE incluir pelo menos 1 screenshot. Sem screenshot = sem Gate 3."
  - **Se cenário falha:** entra no code quality loop (ver ARCHITECTURE-V2.md §5)
  - **Apresenta Gate 3:** operador vê produto + screenshots + checklist

- [ ] Deletar `skills/product-validate/` (substituída por validate)

---

## Phase 4 — Documentação

> Reescreve docs para refletir V2. Só fazer DEPOIS que skills e infra estiverem prontas — assim documenta o que realmente existe.

- [ ] **Reescrever `README.md`**
  - Estrutura do repo com 9 skills V2 (não 6 V1)
  - Workflow V2: discovery → Gate 1 → specify → plan → analyze loop → Gate 2 → build → test → review → validate → Gate 3 → publish
  - 3 gates (não 4), nomes corretos, sem referência a surf
  - Install/usage atualizado
  - Referência ao ARCHITECTURE-V2.md para detalhes técnicos

- [ ] **Reescrever `docs/PARA-BERNARDO.md`**
  - 3 gates (não 4): Gate 1 = brief, Gate 2 = plano, Gate 3 = produto verificado
  - Fluxo atualizado: discovery profundo antes de qualquer escrita
  - Remover referências a surf, product-specify, auto-plan, build-loop
  - Manter tom: linguagem de produto, sem jargão, exemplos práticos
  - Seção "Como vai parecer na prática" — reescrever com o fluxo V2

- [ ] **Atualizar `CHANGELOG.md`**
  - Adicionar entry v2.0.0 com todas as mudanças da V2

---

## Phase 5 — Verificação

> Testa tudo junto. Só começar quando Phases 1-4 estiverem completas.

- [ ] **Test: install.sh em ambiente limpo**
  - Remover todos os symlinks existentes
  - Rodar install.sh do zero
  - Verificar que os 9 skills + 2 extensions + 3 agents + 2 root files estão corretos

- [ ] **Test: uninstall.sh + reinstall**
  - Rodar uninstall.sh → verificar que tudo foi removido
  - Rodar install.sh → verificar que tudo foi restaurado

- [ ] **Test: /setup em projeto novo**
  - `mkdir /tmp/test-v2 && cd /tmp/test-v2 && pi`
  - `/setup` → verificar que AGENTS.md tem workflow V2, skill names V2, gates V2
  - Verificar que workflow-state.json tem schema V2

- [ ] **Piloto end-to-end com produto real**
  - Criar produto novo usando o fluxo V2 completo
  - Verificar cada checkpoint:
    - [ ] Discovery faz perguntas profundas (sem limite de rodadas)
    - [ ] brief.md tem 6 seções, < 1 página
    - [ ] Gate 1 apresenta brief (não spec)
    - [ ] specify produz spec sem suposições
    - [ ] plan tem tasks atômicas com mapeamento de cenários
    - [ ] analyze loop detecta inconsistências (testar com spec intencionalmente incompleto)
    - [ ] Gate 2 apresenta resumo em PT sem tecnologia
    - [ ] build implementa uma task por commit
    - [ ] test roda com /loop tests até verde
    - [ ] review usa critérios V2 (P0/P1 = o que test não cobre)
    - [ ] validate abre browser, percorre cenários, tira screenshots
    - [ ] Code loop re-entry é cirúrgico (task específica, não rebuild total)
    - [ ] Gate 3 mostra produto + screenshots + checklist
    - [ ] publish completa o ciclo

---

## Future

> Não implementar agora. Registrado para não perder.

- [ ] Converter para pi package (`pi install git:github.com/bernajaber/pi-product-system`)
- [ ] Per-project constitution overrides
- [ ] Multi-feature workflow (features paralelas com dependências)
- [ ] Cost tracking por projeto
- [ ] Extensões de produtividade: git-checkpoint, protected-paths, session-name, status-line, notify
