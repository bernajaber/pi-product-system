# Architecture V2 — Pi Product System

> **Para o agente que vai trabalhar nisso:** Este documento é a especificação completa da V2.
> Cada decisão aqui foi discutida e aprovada pelo operador (2026-02-26).
> Não mude sem entender o porquê — leia tudo antes de implementar.

> **Status:** Design completo. Todos os 13 pontos resolvidos. Pronto para implementação.

---

## 1. Contexto — por que estamos refatorando

O sistema atual (V1) foi construído de forma incremental ao longo de 15 sessões. Funciona para casos simples, mas uma análise profunda de filosofia revelou violações dos princípios do operador:

- `build-loop` faz 3 coisas: implementa features, escreve testes, faz self-review
- `product-specify` faz 3 coisas: pesquisa referências, entrevista operador, escreve spec
- `product-clarify` não tem output próprio — é um fragmento de skill
- `product-validate` faz verificação técnica E apresenta gate ao operador
- `auto-publish` faz 8 coisas diferentes

**Princípio violado:** "Do one thing well" — cada skill deveria ter um input claro e um output claro.

---

## 2. Filosofia do operador (Bernardo)

Antes de tudo, o agente deve ler `~/.pi/agent/product-constitution.md`. Os princípios que mais impactam decisões de arquitetura:

- **Do one thing well (inegociável):** cada feature, função e skill tem uma razão clara de existir
- **Radical simplicity:** menos é mais. O usuário decide em 5 segundos
- **Extensible, not configurable:** cresce por extensão, não por configuração
- **Local and transparent:** sem caixas-pretas

**Aplicado às skills:** cada skill tem um input, um output, uma responsabilidade. O "como" (loop, auto, product-) não é o nome, é o mecanismo interno.

---

## 3. Decisões de naming

**Regra:** o nome da skill é o que ela PRODUZ, não como ela trabalha.

`/loop self` e `/loop tests` são mecanismos internos — não nomes de skills. `auto-` e `product-` são prefixos que descrevem o como, não o quê.

---

## 4. Nova arquitetura de skills

### Mapa completo

| Skill | Input | Output | Substitui |
|-------|-------|--------|-----------|
| `discovery` | descrição do operador | `brief.md` — descrição rica do produto | `product-clarify` + fase de entrevista/pesquisa do `product-specify` |
| `specify` | `brief.md` | `spec.md` — cenários de aceite estruturados | `product-specify` (só a escrita da spec) |
| `plan` | `spec.md` | `plan.md` — tasks atômicas + stack + estrutura | `auto-plan` |
| `analyze` | brief + spec + plan + constitutions | `critique.md` + resumo para Gate 2 | nova skill |
| `build` | `plan.md` | código commitado — uma task, um commit | `build-loop` Phase 1 |
| `test` | código commitado | testes passando — `/loop tests` | última task do `build-loop` |
| `review` | código commitado | código limpo — sem P0/P1 | `build-loop` Phase 2 |
| `validate` | código limpo + spec | produto verificado + checklist de evidências | `product-validate` |
| `publish` | aprovação Gate 3 | release publicado | `auto-publish` |

### Skills removidas
- `product-clarify` → absorvida pelo `discovery` (não tinha output próprio)

### Skills novas
- `discovery` — nova, não existia
- `analyze` — nova, não existia
- `test` — extraída do `build-loop`
- `review` — extraída do `build-loop`

---

## 5. Fluxo completo com gates

```
OPERADOR descreve o que quer
         │
         ▼
    discovery ──────────────────────────── brief.md
    (entrevista profunda + pesquisa)
    (vai tão fundo quanto necessário
     — sem limite de rodadas)
         │
         ▼
  ┌─── GATE 1 ─────────────────────────────────────────┐
  │  "Entendi direito o que você quer construir?"      │
  │  Operador vê: brief.md (curto, < 1 página)        │
  │  Operador aprova: direção e entendimento           │
  │                                                    │
  │  Opções:                                           │
  │  → "É isso! Pode seguir"                          │
  │  → "Quase, mas quero corrigir algo" (→ feedback)  │
  │  → "Não é isso, vamos repensar" (→ re-discovery)  │
  └────────────────────────────────────────────────────┘
         │
         ▼
    specify ────────────────────────────── spec.md  ← DOCUMENTO INTERNO
    (transforma brief aprovado em
     cenários de aceite precisos)
         │
         ▼
    plan ───────────────────────────────── plan.md
    (tasks atômicas, stack, estrutura)
         │
         ▼
    ┌──────────────────────────────────────────────────────────┐
    │         LOOP DE QUALIDADE — DOCUMENTOS                   │
    │                                                          │
    │  analyze                                                 │
    │  (sub-agente sem contexto de conversa)                  │
    │  (lê brief + spec + plan + constitutions)               │
    │  (cada issue classificada como spec-problem             │
    │   ou plan-problem — sem ambiguidade)                    │
    │      │                                                   │
    │   issues?                                                │
    │      │                                                   │
    │     YES → spec-problem? → specify re-roda               │
    │      │                    → plan re-roda SEMPRE          │
    │      │                      (plan deriva do spec)        │
    │      │   plan-problem? → SOMENTE plan re-roda           │
    │      │                    → spec intacto                 │
    │      │                         │                         │
    │      │                    analyze novamente              │
    │      │                    (max 3 ciclos)                 │
    │      │                                                   │
    │      NO                                                  │
    │      │                                                   │
    │      ▼                                                   │
    │  documentos limpos                                       │
    │  → define reviewDepth final (simple/medium/complex)      │
    │  → resumo em PT do que foi encontrado e corrigido        │
    └──────────────────────────────────────────────────────────┘
         │
         ▼
  ┌─── GATE 2 ─────────────────────────────────────────────────────┐
  │  "Aqui está o plano."                                          │
  │  Operador vê (em PT, sem tecnologia):                          │
  │  → "Vou construir em N etapas."                                │
  │  → "Etapa 1: [o que funciona]. Etapa N: [experiência completa]"│
  │  → "A análise interna encontrou X e já corrigi."               │
  │    (ou "O planejamento passou pela análise sem problemas.")     │
  │                                                                │
  │  Operador aprova: execução                                     │
  └────────────────────────────────────────────────────────────────┘
         │
         ▼
    build ──────────────────────────────── código commitado
    (implementa tasks do plan, /loop self,
     uma task = um commit)
         │
         ▼
    test ───────────────────────────────── testes passando
    (/loop tests — condição objetiva: testes verdes)
         │
         ▼
    review ─────────────────────────────── código limpo
    (/review uncommitted, corrige P0/P1,
     max 3 ciclos)
         │
         ▼
    validate ───────────────────────────── produto verificado
    (abre browser com agent-browser,        + checklist de evidências
     percorre TODOS os cenários do spec,    + screenshots
     registra: PASS ou FAIL)
         │
         ▼
    ┌──────────────────────────────────────────────────────────┐
    │         LOOP DE QUALIDADE — CÓDIGO                       │
    │                                                          │
    │  validate falha em cenário?                              │
    │      │                                                   │
    │     YES → scout diagnostica root cause                   │
    │            (sem contexto de conversa)                    │
    │                 │                                        │
    │           cenário X falhou                               │
    │           → qual task implementou X? (map do plan)       │
    │           → build corrige SOMENTE essa task              │
    │           → test roda TUDO (pode ter regressão)          │
    │           → review roda TUDO                             │
    │           → validate roda TUDO                           │
    │           (max 3 ciclos)                                 │
    │                                                          │
    │           se scout não mapeia para task específica:       │
    │           → "systemic" → build re-roda do início         │
    │                                                          │
    │      NO                                                  │
    │      │                                                   │
    │   todos os cenários PASS                                 │
    └──────────────────────────────────────────────────────────┘
         │
         ▼
  ┌─── GATE 3 ──────────────────────────────────────────────────┐
  │  "Verifiquei que funciona. Posso publicar?"                 │
  │  Operador vê: produto rodando + screenshots + checklist     │
  │  Operador aprova: release                                   │
  └─────────────────────────────────────────────────────────────┘
         │
         ▼
    publish ────────────────────────────── release publicado
    (PR + merge + tag + changelog + reset)
```

---

## 6. A skill `discovery` — detalhamento

### Por que existe
`product-specify` fazia entrevista + pesquisa + escrita de spec tudo junto. "Entender" e "formalizar" são atos cognitivos diferentes — quando vivem na mesma skill, a spec sofre porque o agente ainda está entendendo enquanto já escreve.

### Profundidade
O discovery vai **tão fundo quanto necessário**. Sem limite de rodadas. A única condição de saída é: o agente consegue escrever o brief com **ZERO suposições** sobre comportamento do usuário.

Se ainda tem uma suposição → faz mais uma pergunta. Não importa se é a rodada 2 ou a rodada 8. A completude é o limite natural.

### Perguntas obrigatórias (sempre, sem exceção)
1. Que problema isso resolve? Por que isso precisa existir?
2. Quem vai usar? Em que contexto? (mesa, celular, correndo, no trabalho...)
3. O que a pessoa poderá fazer? (capacidades concretas)
4. O que NÃO deve ter? (escopo negativo explícito)
5. Como é o sucesso? (quando o operador olha e diz "é isso")

### Perguntas condicionais (se o produto envolver)
- Dados do usuário → acesso, persistência, login
- Múltiplos usuários → interação, permissões, visibilidade
- Integrações → serviços externos, APIs, dados de terceiros
- Dinheiro → fluxo de pagamento, quem paga quem, quando
- Conteúdo do usuário → criação, moderação, visibilidade

### Pesquisa obrigatória
- Se existem soluções no mercado → pesquisar, entender o que funciona e o que não serve
- Se o operador mencionou referências → estudar em profundidade antes de perguntar

### Condição de saída
O agente tenta escrever o brief mentalmente. Se para em qualquer seção e pensa "aqui eu vou ter que assumir algo" → não terminou. Faz a pergunta que elimina a suposição.

**Discovery termina quando: toda decisão de comportamento foi tomada pelo operador, não pelo agente.**

### Output: brief.md

Template com 6 seções obrigatórias. **Sempre curto (< 1 página).** A profundidade é do processo, não do documento. Analogia: jornalista entrevista por 2 horas, escreve artigo de 500 palavras.

```markdown
# Brief: [nome do produto]

## Problema
[Que problema isso resolve? Por que existe? 2-3 frases.]

## Para quem
[Quem vai usar e em que contexto.]

## O que a pessoa poderá fazer
- [Capacidade 1 — em linguagem de ação, não feature técnica]
- [Capacidade 2]
- [...]

## O que fica de fora
- [Explicitamente: o que NÃO entra nesta versão]

## Referências pesquisadas
- [Produto/site pesquisado — o que foi aproveitado e o que não se aplica]
- (se nenhuma referência: "Nenhuma referência externa necessária")

## Decisões do operador
- [Decisão 1 — ex: "Lista única, não por categoria"]
- [Decisão 2 — ex: "Item comprado fica riscado, não some"]
- [...]
```

A seção "Decisões do operador" NÃO é transcrição. É uma lista das **decisões de produto** tomadas durante o discovery — curta, direta, rastreável.

---

## 7. A skill `analyze` — detalhamento

### Por que existe
O agente que criou spec.md e plan.md tem viés sobre seus próprios documentos. O analyze é um sub-agente sem contexto da conversa que lê os três documentos e questiona consistência, completude e riscos.

### Critério objetivo
O analyze NÃO decide o que é "bom" por intuição. Ele verifica contra:
- `~/.pi/agent/product-constitution.md` — princípios de produto do operador
- `.pi/engineering-constitution.md` — padrões técnicos do projeto
- `~/.pi/agent/REVIEW_GUIDELINES.md` — critérios de qualidade

As constituições são o critério. O analyze é o verificador.

### O que analisa
1. **Brief → Spec:** o spec cobre todos os aspectos do brief? Há cenários faltando?
2. **Spec → Plan:** o plan entrega todos os cenários de aceite do spec?
3. **Consistência:** há contradições entre os três documentos?
4. **Riscos:** há riscos técnicos ou de produto que deveriam ser endereçados antes do build?
5. **Filosofia:** o que está sendo construído viola algum princípio da Product Constitution?

### Classificação de issues (OBRIGATÓRIA)
Cada issue encontrada DEVE ser classificada como:
- `spec-problem` → spec não cobre algo do brief, ou tem contradição
- `plan-problem` → plan não entrega um cenário do spec, ou tem gap técnico

**Sem classificação ambígua.** Isso determina a cascata no loop (ver seção 5).

### reviewDepth final
O analyze define o `reviewDepth` final (simple/medium/complex) baseado nos três documentos. Esta é a única classificação confiável — só depois do plan você sabe a complexidade real.

Critérios:
- `simple`: local-only, sem integrações, sem dados críticos, 1-3 cenários
- `medium`: CRUD com backend, integrações de API, lógica de negócio moderada
- `complex`: real-time, pagamentos, autenticação, multi-usuário, dados críticos
- Modificadores: toca dados de usuário (+1), toca dinheiro (→ complex), API externa (+1)

### Output: critique.md
Artefato interno salvo em `.pi/specs/<feature>/critique.md`. Não é deletado (transparência), mas nunca é apresentado diretamente ao operador. O Gate 2 mostra um resumo em linguagem de produto.

---

## 8. Mecanismos internos das skills

### `discovery` usa:
- Entrevista em chat natural (Portuguese) — sem formulários
- `Ctrl+.` / answer.ts para respostas estruturadas quando o operador preferir
- web_search + fetch_content para pesquisar referências
- Sem limite de rodadas — profundidade total

### `build` usa:
- `product-loop` extension — envia follow-ups automáticos a cada agent_end
- Agente reporta progresso via `progress` em workflow-state.json
- Compaction-aware via product-loop.ts (injeta instruções no compaction)

### `test` usa:
- `product-loop` extension — condição objetiva (testes verdes)
- `node tests/<feature>.test.js` — Node.js assert, sem frameworks externos

### `review` usa:
- `product-loop` extension — envia rubric + REVIEW_GUIDELINES.md como follow-up
- Max 3 ciclos de review, enforced pela extensão (não pelo LLM)
- Critérios do `REVIEW_GUIDELINES.md` (reescrito para V2 — ver seção 13)

### `validate` usa:
- `agent-browser` (NÃO surf — surf requer Chrome open)
- Percorre cenários do spec.md
- Screenshots como evidência

### `analyze` usa:
- Sub-agente sem contexto de conversa (pi-subagents)
- Lê: `brief.md` + `spec.md` + `plan.md` + constituições
- Produz: `critique.md` (interno, resumo vai para Gate 2)

---

## 9. Gates — semântica precisa

| Gate | Momento | Operador vê | Operador decide |
|------|---------|------------|-----------------|
| Gate 1 | Após discovery | brief.md (< 1 página, em PT) | "Entendeu o que quero?" — direção |
| Gate 2 | Após loop de documentos | Resumo em PT das etapas + resultado do analyze | "Vai construir certo?" — execução |
| Gate 3 | Após loop de código | Produto rodando + screenshots + checklist | "Funcionou?" — release |

**Princípio:** em nenhum gate o operador resolve problemas técnicos. Ele só toma decisões de produto.

### Gate 1 — feedback paths
- "É isso! Pode seguir" → aprovado, segue para specify
- "Quase, mas quero corrigir algo" → abre input → discovery atualiza brief com feedback (não recomeça do zero)
- "Não é isso, vamos repensar" → discovery re-roda do início (raro)

### Gate 2 — apresentação
O operador NUNCA vê o plan.md. Vê um resumo em 3 partes:
1. "Vou construir em N etapas. Etapa 1: [o que funciona]. Etapa N: [experiência completa]."
2. Se houve correções: "Durante o planejamento, identifiquei que [X] e já corrigi."
3. Se limpo: "O planejamento passou pela análise interna sem problemas."

**Zero menção a tecnologia, framework, stack ou estrutura de arquivos. Nunca.**

### Gate 3 — apresentação
O operador vê:
- O produto rodando (URL ou instrução de como abrir)
- Screenshots de cada cenário verificado
- Checklist de cenários: PASS ou FAIL
- "Verifiquei que funciona. Posso publicar?"

---

## 10. Escalação após max ciclos (protocolo)

Quando um loop atinge 3 ciclos sem resolução, o sistema escala para o operador.

### Loop de documentos — escalação
```
"Tentei 3 vezes alinhar o plano com o que você descreveu, mas não
consegui resolver: [issue em linguagem de produto — ex: 'o compartilhamento
em tempo real conflita com o funcionamento offline que você pediu'].

O que prefere?"
→ "Simplificar — tirar o que está conflitando"
→ "Repensar o produto desde o início"
→ "Aceitar como está e seguir em frente"
```

### Loop de código — escalação
```
"O [descrição do cenário] não está funcionando depois de 3 tentativas
de correção. O problema parece ser [diagnóstico em linguagem de produto
— ex: 'a lista não atualiza em tempo real quando outra pessoa adiciona'].

O que prefere?"
→ "Entregar sem essa funcionalidade por agora"
→ "Tentar de novo com uma abordagem diferente"
→ "Voltar ao planejamento e repensar como fazer"
```

**Regra:** a mensagem SEMPRE descreve a consequência para o usuário, nunca o problema técnico.

---

## 11. Referências que validam esta arquitetura

### Ralph Loop (inspiration — adapted into product-loop extension)
Fonte: https://medium.com/@tentenco/what-is-ralph-loop-a-new-era-of-autonomous-coding-96a4bb3e2ac8

- Concept: autonomous persistence with subjective and objective exit conditions
- Our adaptation: `product-loop.ts` extension handles both — sends follow-ups automatically,
  no operator commands needed. Build uses subjective progress, test uses objective condition (tests green).

### Anthropic — Effective Harnesses for Long-Running Agents
Fonte: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

Valida nossa arquitetura:
- Feature list com `passes: false` → nosso `feature-list.json` ✅
- Progress file → nosso `progress.md` ✅
- Commits atômicos → nossa disciplina de build ✅
- Specialized agents (testing agent, QA agent) → nossa separação de skills ✅
- Browser automation para testes → migração para `agent-browser` ✅

Citação da conclusão:
> "It seems reasonable that specialized agents like a testing agent, a quality assurance agent, or a code cleanup agent, could do an even better job at sub-tasks across the software development lifecycle."

---

## 12. O que está implementado hoje (V1)

### Skills existentes (com nomes antigos)
```
~/.pi/agent/skills/
├── product-specify/    → será dividido em discovery + specify
├── product-clarify/    → será deletado
├── auto-plan/          → será renomeado para plan
├── build-loop/         → será dividido em build + test + review
├── product-validate/   → será renomeado para validate (+ migrar para agent-browser)
└── auto-publish/       → será renomeado para publish
```

### Extensions
```
~/.pi/agent/extensions/
├── ask-tool.ts         → mantém, é fundamental para gates
└── product-setup/      → mantém, requer atualização de nomes
```

### Agents
```
~/.pi/agent/agents/
├── reviewer.md         → mantém (usado pelo review skill)
├── scout.md            → mantém (usado para diagnóstico no loop de código)
└── spec-checker.md     → mantém (usado pelo analyze)
```

---

## 13. REVIEW_GUIDELINES.md — V2

O review recebe código que já passou por `test`. Os critérios refletem isso:

- **P0:** quebra algo que test não pegou (UX, visual, acessibilidade, estado impossível)
- **P1:** violação de princípio da constitution (lento, não responsivo, complexo demais)
- **P2:** qualidade de código, naming, organização
- **P3:** sugestão, nice to have

O review NÃO re-verifica funcionalidade (isso é do test). O review verifica qualidade, princípios, e o que testes automatizados não cobrem.

Reescrever `REVIEW_GUIDELINES.md` junto com a implementação do `review` skill.

---

## 14. State persistence — workflow-state.json V2

Initial state created by `/setup`:

```json
{
  "currentPhase": "init",
  "feature": null,
  "gates": {
    "briefApproved": false,
    "planApproved": false,
    "releaseApproved": false
  },
  "analyzeLoop": {
    "cycle": 0,
    "maxCycles": 3,
    "lastIssueType": null,
    "lastIssueSummary": null
  },
  "codeLoop": {
    "cycle": 0,
    "maxCycles": 3,
    "lastFailedScenario": null,
    "lastDiagnosis": null,
    "lastReentryTask": null
  },
  "failureCount": 0
}
```

Fields added during the workflow (by skills, not by setup):
- `feature` becomes `{ id, name, branch, reviewDepth }` when the plan skill runs
- `progress` is `{ task, of, status }` — written by the agent during build/test/review, read by product-loop
- `version` is set by the publish skill

Mudanças vs V1:
- `gates` renomeados: `specApproved` → `briefApproved`, `buildApproved` → `planApproved`, `validationApproved` → `releaseApproved`
- `analyzeLoop` e `codeLoop` adicionados para sobreviver a compactions
- `codeLoop.lastFailedScenario` detected by product-loop to trigger surgical fix mode in build phase
- `currentPhase` values: `init`, `discovery`, `specify`, `plan`, `analyze`, `build`, `test`, `review`, `validate`, `publish`

---

## 15. Ordem de implementação

Baseada nas dependências resolvidas:

```
FASE 1 — Skills sem dependência de browser (8 skills):
  1. discovery/SKILL.md      ← nova
  2. specify/SKILL.md        ← reescrita (input: brief.md, não entrevista)
  3. plan/SKILL.md           ← renomeada de auto-plan
  4. analyze/SKILL.md        ← nova
  5. build/SKILL.md          ← extraída de build-loop (Phase 1 only)
  6. test/SKILL.md           ← extraída de build-loop (test task only)
  7. review/SKILL.md         ← extraída de build-loop (Phase 2 only)
  8. publish/SKILL.md        ← renomeada de auto-publish

FASE 2 — Infraestrutura:
  9. Atualizar product-setup/index.ts (AGENTS.md com novos nomes + workflow)
  10. Atualizar install.sh (novos nomes de skills)
  11. Deletar product-clarify/
  12. Reescrever REVIEW_GUIDELINES.md
  13. Atualizar README.md

FASE 3 — Browser + Validate:
  14. Migrar comandos de surf → agent-browser
  15. validate/SKILL.md (usa agent-browser)

FASE 4 — Verificação:
  16. Testar install.sh em ambiente limpo
  17. Piloto end-to-end com produto real
```

---

## 16. O que NÃO mudar

- `progress.md` — continua sendo o log narrativo cross-session
- `feature-list.json` — continua rastreando features com `passes: false/true`
- `ask-tool.ts` — continua sendo usado para gates
- Agentes (reviewer, scout, spec-checker) — continuam, só usados em contextos diferentes
- Convenção de commits (conventional commits)
- Estrutura de diretórios do projeto (`.pi/specs/<feature>/`)

---

## 17. Validação filosófica da V2

| Skill | Do one thing | Radical simplicity | Extensible |
|-------|-------------|-------------------|------------|
| discovery | ✅ produz brief | ✅ entrevista natural | ✅ perguntas adicionáveis |
| specify | ✅ produz spec | ✅ sem entrevista, só transforma | ✅ template extensível |
| plan | ✅ produz plan | ✅ sem gates, só planeja | ✅ tasks adicionáveis |
| analyze | ✅ produz critique | ✅ automático, sem operador | ✅ constitutions adicionáveis |
| build | ✅ produz código | ✅ uma task por vez | ✅ skills do plano |
| test | ✅ produz testes verdes | ✅ condição objetiva | ✅ test files adicionáveis |
| review | ✅ produz código limpo | ✅ critérios definidos | ✅ guidelines extensíveis |
| validate | ✅ produz evidências | ✅ percorre cenários | ✅ agent-browser extensível |
| publish | ⚠️ 8 passos internos | ✅ um output final | ✅ pipeline extensível |

`publish` é o único com ressalva — 8 passos internos, mas um output único (release publicado). Decisão consciente: os 8 passos são uma sequência obrigatória de release, separar criaria 8 micro-skills que só fazem sentido juntas.

---

## 18. Glossário

- **Ralph Loop:** loop autônomo com condição objetiva de saída (testes passando).
- **Loop de qualidade de documentos:** specify → plan → analyze → corrige → analyze. Máx 3 ciclos.
- **Loop de qualidade de código:** build → test → review → validate → [scout diagnose] → corrige. Máx 3 ciclos.
- **brief.md:** output do discovery. Documento curto (< 1 página) em linguagem de produto.
- **spec.md:** documento INTERNO. Cenários de aceite. O operador não vê.
- **critique.md:** output interno do analyze. Resumo vai para Gate 2 em linguagem de produto.
- **reviewDepth:** simple/medium/complex. Definido pelo analyze. Controla profundidade dos loops.
- **scout:** sub-agente sem contexto. Diagnostica root cause quando loops falham.
- **Correção cirúrgica:** build corrige somente a task do cenário que falhou, mas test/review/validate rodam tudo.
