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

## V3 — Evolução baseada em análise competitiva (2026-02-27)

> Análise de 7 repositórios: DeerFlow (ByteDance), Trae Agent (ByteDance), AgentScope (Alibaba),
> Vibe Kanban (Bloop), claude-code-security-review (Anthropic), git-ai, Claude-Flow.
> 16 findings identificados. 6 aprovados pelo operador para implementação.
>
> **Regra de arquitetura:** cada extension faz UMA coisa.
> - `product-loop.ts` → governa fluxo (follow-ups, escalação, verificação de transição)
> - `execution-trace.ts` → registra o que aconteceu (JSONL append-only)
> - `dashboard.ts` → visualiza progresso (lê trace, gera HTML estático)
> - `ask-tool.ts` → apresenta gates (já existe, recebe minor addition)
>
> **Regra de execução:** execute na ordem. Phase 6 é fundação — tudo visual depende dele.

### Phase 6 — Execution Trace (H1)

> **Inspirado por:** Trae Agent (trajectory recorder), DeerFlow (thread state), Vibe Kanban (event service)
>
> **Problema:** O Pi não registra o que aconteceu durante o build. Quando uma sessão reinicia, o único contexto é workflow-state.json (números). Não há história. Não há como responder "o que o agente fez nas últimas 2 horas?".
>
> **Princípio:** Local and transparent — cada decisão rastreável a um arquivo que um humano pode ler.
>
> **Nova extension: `execution-trace.ts`** — NÃO vai no product-loop. Razão: registrar é uma responsabilidade diferente de governar. Ambas escutam `agent_end`, cada uma faz seu trabalho.

- [ ] **Definir schema do trace entry**
  - Um JSON object por linha em `.pi/specs/<feature>/trace.jsonl` (append-only)
  - Campos: `timestamp` (ISO 8601), `phase`, `turn` (incremental dentro da extension), `action` (resumo curto ≤150 chars), `tags` (array de strings), `progress` (snapshot `{ task, of, status }` do workflow-state), `duration_ms` (tempo desde último entry), `error` (string, se houver)
  - Tags possíveis: `COMMIT`, `WRITE_FILE`, `TEST_RUN`, `TEST_PASS`, `TEST_FAIL`, `REVIEW_CYCLE`, `FIX`, `SCREENSHOT`, `GATE_APPROVED`, `GATE_REJECTED`, `ESCALATION`, `PHASE_CHANGE`
  - Não incluir conteúdo completo da resposta do agente (seria enorme). Só o resumo.
  - Documentar schema como tipo TypeScript no topo de `execution-trace.ts`

- [ ] **Criar `extensions/execution-trace.ts`**
  - Extension separada. Registra handlers:
    - `agent_end`: ler workflow-state.json → se tem `feature`, extrair resumo + tags → append ao trace.jsonl
    - `session_start`: restaurar `lastTimestamp` do state entry para calcular `duration_ms`
  - **Extração de resumo:** últimos 150 chars da resposta do agente, limpos (strip markdown headings, strip tool XML)
  - **Extração de tags por pattern-matching na resposta:**
    - Contém "git commit" / "committed" / "Committed" → `COMMIT`
    - Contém "created file" / "wrote file" / "Write(" → `WRITE_FILE`
    - Contém "test" + "pass" (case insensitive) → `TEST_PASS`
    - Contém "test" + "fail" / "error" / "assert" → `TEST_FAIL`
    - Contém "P0" ou "P1" → `REVIEW_CYCLE`
    - Contém "screenshot" / "Screenshot" → `SCREENSHOT`
  - **State persistido via `pi.appendEntry`**: `{ lastTimestamp, turn }`
  - **Feature ID**: ler `workflow-state.json` → campo `feature` (string). Se não existir, não gravar (projeto sem /setup).
  - **Caminho do trace**: `.pi/specs/<feature>/trace.jsonl`
  - **Append seguro**: `fs.appendFileSync(path, JSON.stringify(entry) + "\n")`
  - **Arquivo novo:** `extensions/execution-trace.ts`

- [ ] **Adicionar trace entries para gates no `ask-tool.ts`**
  - Quando o operador responde um gate, gravar entry no trace: tag `GATE_APPROVED` ou `GATE_REJECTED`, com a opção escolhida no campo `action`
  - Reutilizar a mesma função de append (extrair helper compartilhado, ou duplicar — são 5 linhas)
  - Precisa do feature ID: ler workflow-state.json → campo `feature`
  - **Arquivo modificado:** `extensions/ask-tool.ts`

- [ ] **Adicionar trace entry para mudança de fase no `execution-trace.ts`**
  - No handler `agent_end`, comparar `ws.currentPhase` com `lastPhase` (persistido no state)
  - Se mudou: append entry extra com tag `PHASE_CHANGE`, action = `"Phase: {old} → {new}"`
  - **Arquivo modificado:** `extensions/execution-trace.ts`

- [ ] **Atualizar `install.sh` e `uninstall.sh`**
  - Adicionar symlink para `execution-trace.ts`
  - **Arquivos modificados:** `install.sh`, `uninstall.sh`

- [ ] **Unit tests para execution-trace**
  - Testar: entry é escrita no arquivo correto, tags são extraídas corretamente, JSONL é válido (cada linha é JSON parseável), append não corrompe entradas anteriores, duration_ms é calculado, feature ID ausente não causa crash
  - **Arquivo novo:** `test/test-execution-trace.ts`

---

### Phase 7 — Verified Completion + Richer Observability (H3 + M6)

> **Inspirado por:** Trae Agent (`task_done` tool com verificação obrigatória), Trae LakeView (tags + resumo)
>
> **Problema H3:** Nada impede o agente de avançar de fase sem verificar que o trabalho está feito. Hoje é enforced por prompt, não por mecanismo.
>
> **Problema M6:** O widget do TUI mostra "build · turn 4" mas não O QUE o agente está fazendo.
>
> **Princípio:** Zero visible bugs — se o agente pode pular verificação, eventualmente vai pular.
>
> **Onde vive:** Verificação de transição fica no `product-loop.ts` porque **gata** a decisão do follow-up ("devo avançar ou mandar de volta?"). Widget mais rico também fica no product-loop porque é apresentação do estado que ele já gerencia.

- [ ] **Adicionar verificação de transição de fase no `product-loop.ts`**
  - Quando detecta mudança de fase (`ws.currentPhase !== loopState.phase`):
    - `build → test`: executar `execSync("git log --oneline -1", { cwd })` — se falha ou retorna vazio, verificação falhou
    - `test → review`: verificar que existe pelo menos um arquivo `*.test.*` ou `tests/` no projeto (glob rápido via `fs.readdirSync` ou `execSync("find . -name '*.test.*' -not -path '*/node_modules/*' | head -1")`)
    - `review → validate`: nenhuma verificação adicional (review já é self-check)
  - Se verificação **falha**: NÃO enviar follow-up da nova fase. Em vez disso, enviar:
    `"Você avançou para {fase} mas a verificação falhou: {motivo}. Atualize currentPhase de volta para {fase anterior} e complete o trabalho."`
  - Se verificação **passa**: fluxo normal — enviar follow-up da nova fase
  - **Cuidado:** `execSync` pode lançar exceção. Wrap em try/catch — exceção = falha de verificação.
  - **Arquivo modificado:** `extensions/product-loop.ts`

- [ ] **Melhorar TUI widget com info do trace**
  - Atualmente: `🔨 Build: 3/8 ✓ (turn 12)`
  - Proposta: `🔨 Build: 3/8 · COMMIT auth-module (turn 12)`
  - Ler última linha do `trace.jsonl` (se existir) → extrair última tag + resumo truncado (≤30 chars)
  - Se trace não existe (Phase 6 não implementada), manter widget atual — graceful degradation
  - **Arquivo modificado:** `extensions/product-loop.ts`

- [ ] **Unit tests para verificação de transição**
  - Testar: build→test sem commit rejeita, build→test com commit aceita, test→review sem arquivo de teste rejeita, execSync exception é tratada como falha
  - **Arquivo modificado:** `test/test-product-loop.ts` (adicionar seção)

---

### Phase 8 — Discovery Depth Enforcement (M5)

> **Inspirado por:** DeerFlow (ClarificationMiddleware — agente não pode agir antes de clarificar)
>
> **Problema:** Discovery é a fundação — se falha, tudo downstream quebra. Hoje a profundidade é enforced por prompt ("ZERO suposições"). Mas o agente pode ignorar o prompt e escrever o brief com suposições.
>
> **Princípio:** Do one thing well — discovery produz o brief. Se o brief tem suposições, discovery não fez o trabalho.
>
> **Onde vive:** Skill change (prompt-level) + product-loop (mechanism-level heuristic). O check de suposições no product-loop gata o follow-up da mesma forma que a verificação de transição (Phase 7) — é decisão de fluxo, não observabilidade.

- [ ] **Adicionar "Assumption Audit" step ao `discovery/SKILL.md`**
  - Novo passo entre "entrevista" e "escrita do brief":
    - Listar explicitamente: "Minhas suposições restantes: [lista numerada]"
    - Se a lista tem 1+ item → NÃO pode escrever o brief. Deve fazer as perguntas que eliminam cada suposição.
    - Se a lista é vazia → pode prosseguir para escrever o brief
  - Isso é um checkpoint interno da skill, não uma fase nova
  - **Arquivo modificado:** `skills/discovery/SKILL.md`

- [ ] **Adicionar check de suposições no `product-loop.ts`**
  - Na fase `discovery`: após `agent_end`, checar se brief.md existe
  - Se brief.md existe e contém keywords suspeitas: `"assumed"`, `"TBD"`, `"to be decided"`, `"assumption"`, `"we assume"`, `"assuming"` (case insensitive)
  - Se match: enviar follow-up: `"⚠️ O brief contém suposições (detectado: '{keyword}'). Volte ao discovery e pergunte ao operador antes de prosseguir."`
  - Heurística simples — pattern matching, não LLM. False positives são ok (agente pode ignorar se for false positive, mas pelo menos é alertado).
  - **Arquivo modificado:** `extensions/product-loop.ts`

---

### Phase 9 — Workspace Safety (H2)

> **Inspirado por:** Vibe Kanban (git worktree isolation por task)
>
> **Problema:** Se o Pi trava no meio do build, a pasta do projeto fica num estado "meio-feito". Não tem como voltar atrás facilmente.
>
> **Decisão:** Worktrees completas são para multi-feature (Future). Por agora, implementar **safety checkpoint**: tag do estado limpo antes do build, com instrução de recovery.
>
> **Onde vive:** Nas skills (build + publish). Não precisa de extension — é uma instrução de git.

- [ ] **Adicionar safety checkpoint na `build/SKILL.md`**
  - No Step 1 (antes de implementar qualquer task): criar tag `pre-build/<feature>`
  - `git tag pre-build/<feature> HEAD`
  - Se algo der errado e precisa reset: `git reset --hard pre-build/<feature>`
  - Documentar no skill: "Se o build falhar catastroficamente, o operador pode executar `git reset --hard pre-build/<feature>` para voltar ao estado limpo."
  - **Arquivo modificado:** `skills/build/SKILL.md`

- [ ] **Adicionar cleanup da tag no `publish/SKILL.md`**
  - No Step 8 (reset workflow): deletar a tag `pre-build/<feature>` — já não é necessária
  - `git tag -d pre-build/<feature> 2>/dev/null || true`
  - **Arquivo modificado:** `skills/publish/SKILL.md`

---

### Phase 10 — Dashboard (requer design discussion)

> **Inspirado por:** Vibe Kanban (conceito de kanban visual — NÃO o design, que viola toda a nossa filosofia)
>
> **Problema:** O operador não tem visão de "painel de controle" do produto sendo construído. Tem que perguntar ao agente ou ler git log.
>
> **Princípio:** Radical simplicity — o operador decide em 5 segundos. Local and transparent — abre um HTML no browser.
>
> **Nova extension: `dashboard.ts`** — NÃO vai no product-loop. Razão: visualizar dados é uma responsabilidade diferente de governar fluxo. Lê `trace.jsonl` (produzido pela execution-trace) + `plan.md` + `workflow-state.json` + screenshots. Gera HTML.
>
> **Dependência HARD de Phase 6 (trace).** Sem trace, não há timeline para mostrar. Phase 7 (tags) enriquece mas não é blocker.
>
> ⚠️ **O design deste dashboard será discutido intensamente com o operador antes de qualquer implementação.** O Vibe Kanban é referência de conceito (painel visual), NÃO de visual (que é cluttered e viola radical simplicity). O design deve ser pixel-perfect, mínimo, com hierarquia visual clara.

- [ ] **Design session com operador**
  - Definir: que informação aparece? qual hierarquia? qual estética?
  - Mockup antes de implementar — não fazer e depois iterar
  - Input: dados disponíveis (trace.jsonl, plan.md, workflow-state.json, screenshots de validate)
  - Anti-referência: screenshot do Vibe Kanban — o que NÃO fazer
  - Output: mockup aprovado (pode ser sketch manual, HTML estático, ou wireframe)

- [ ] **Criar `extensions/dashboard.ts`**
  - Extension separada. Registra handler em `agent_end`:
    - Ler `workflow-state.json` → checar se `currentPhase` mudou desde última verificação
    - Se mudou (phase change): regenerar dashboard
    - Se não mudou: não fazer nada (não gerar a cada turn — wasteful)
  - **Gerar:** `.pi/specs/<feature>/dashboard.html`
    - HTML estático, self-contained (CSS inline, dados inline como JSON no `<script>`)
    - Lê: `trace.jsonl` (timeline + tags), `plan.md` (tasks), `workflow-state.json` (phase + progress)
    - Screenshots de validate: se existirem em `.pi/specs/<feature>/screenshots/`, embute como base64 ou referencia como paths relativos
  - Zero servidor, zero infra. Operador abre `open .pi/specs/<feature>/dashboard.html`
  - **Arquivo novo:** `extensions/dashboard.ts`

- [ ] **Atualizar `install.sh` e `uninstall.sh`**
  - Adicionar symlink para `dashboard.ts`
  - **Arquivos modificados:** `install.sh`, `uninstall.sh`

- [ ] **Adicionar link ao dashboard nos gates**
  - Quando Gate 2 ou Gate 3 é apresentado, mencionar: "Veja o progresso completo em `.pi/specs/<id>/dashboard.html`"
  - **Arquivos modificados:** `skills/analyze/SKILL.md`, `skills/validate/SKILL.md`

- [ ] **Unit tests para dashboard**
  - Testar: HTML é gerado corretamente, dados do trace são embutidos, arquivo é self-contained, graceful se trace não existe
  - **Arquivo novo:** `test/test-dashboard.ts`

---

## Future

> Não implementar agora. Registrado para não perder.
> Items marcados com ← são habilitados pelas phases V3.

- [ ] Converter para pi package (`pi install git:github.com/bernajaber/pi-product-system`)
- [ ] Per-project constitution overrides
- [ ] Multi-feature workflow (features paralelas com dependências) ← habilitado por Phase 9 (worktree) quando evoluir para worktrees completas
- [ ] Cost tracking por projeto ← habilitado por Phase 6 (trace) quando pi expor token counts na extension API
- [ ] Extensões de produtividade: git-checkpoint, protected-paths, session-name, status-line, notify
- [ ] Long-term memory across sessions (inspirado por DeerFlow — TF-IDF similarity para injetar preferências do operador)
- [ ] Two-stage review pre-filtering (inspirado por claude-code-security-review — regex hard-exclusion antes do LLM)
