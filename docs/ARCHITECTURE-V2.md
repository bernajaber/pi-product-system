# Architecture V2 — Pi Product System

> **Para o agente que vai trabalhar nisso:** Este documento captura uma sessão inteira de design (2026-02-26) entre Bernardo e um agente. Leia tudo antes de implementar qualquer coisa. Cada decisão aqui tem raciocínio por trás — não mude sem entender o porquê.

> **Status:** Design aprovado conceitualmente. Implementação não iniciada. Os 13 pontos abertos devem ser resolvidos antes de codar.

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

## 3. Decisões de naming (chegamos aqui por raciocínio, não por convenção)

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
| `build` | `plan.md` | código commitado — uma task, um commit | `build-loop` Phase 1 |
| `test` | código commitado | testes passando — `/loop tests` | última task do `build-loop` |
| `review` | código commitado | código limpo — sem P0/P1 | `build-loop` Phase 2 |
| `validate` | código limpo + spec | produto verificado + checklist de evidências | `product-validate` |
| `publish` | aprovação Gate 3 | release publicado | `auto-publish` |

### Skills removidas
- `product-clarify` → absorvida pelo `discovery` (não tinha output próprio)

### Skills novas
- `discovery` — nova, não existia
- `test` — extraída do `build-loop`
- `review` — extraída do `build-loop`
- `analyze` — nova, não existia (ver seção 6)

---

## 5. Fluxo completo com gates

```
OPERADOR descreve o que quer
         │
         ▼
    discovery ──────────────────────────── brief.md
    (entrevista profunda + pesquisa)
         │
         ▼
  ┌─── GATE 1 ─────────────────────────────────────────┐
  │  "Entendi direito o que você quer construir?"      │
  │  Operador vê: brief.md (resumo em PT)              │
  │  Operador aprova: direção e entendimento           │
  └────────────────────────────────────────────────────┘
         │ (se rejeitado: discovery re-roda com feedback)
         ▼
    specify ────────────────────────────── spec.md  ← DOCUMENTO INTERNO
    (transforma brief aprovado em
     cenários de aceite precisos)
         │
         ▼
    plan ───────────────────────────────── plan.md
    (tasks atômicas, stack, estrutura,
     define reviewDepth FINAL)
         │
         ▼
    ┌──────────────────────────────────────────────────┐
    │         LOOP DE QUALIDADE — DOCUMENTOS           │
    │                                                  │
    │  analyze                                         │
    │  (lê brief + spec + plan SEM contexto conversa) │
    │  (usa constitutions como critério objetivo)      │
    │      │                                           │
    │   issues?──YES──→ specify ou plan corrige        │
    │      │            (cascade: ver ponto aberto #1) │
    │      NO               │                          │
    │      │            analyze novamente              │
    │      ▼            (max 3 ciclos)                 │
    │  documentos limpos                               │
    │  → resumo do que foi encontrado e corrigido      │
    └──────────────────────────────────────────────────┘
         │
         ▼
  ┌─── GATE 2 ─────────────────────────────────────────────────────┐
  │  "Aqui está o plano."                                          │
  │  Operador vê: resumo do plan em linguagem de produto (PT)      │
  │  + o que o analyze encontrou e foi corrigido (se houver)       │
  │  + "análise passou sem problemas" (se limpo de primeira)       │
  │  Operador aprova: execução                                     │
  └────────────────────────────────────────────────────────────────┘
         │ (se rejeitado: volta para specify com feedback)
         ▼
    build ──────────────────────────────── código commitado
    (implementa tasks do plan, /loop self,
     uma task = um commit)
         │
         ▼
    test ───────────────────────────────── testes passando
    (/loop tests — Ralph Loop real,
     condição objetiva: testes verdes)
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
    ┌──────────────────────────────────────────────────┐
    │         LOOP DE QUALIDADE — CÓDIGO               │
    │                                                  │
    │  validate falha em cenário?                      │
    │      │                                           │
    │     YES──→ scout diagnostica root cause          │
    │              (sem contexto de conversa)          │
    │                   │                              │
    │          build problem?──→ re-entra build        │
    │          test problem? ──→ re-entra test         │
    │                   │                              │
    │              → review → validate novamente       │
    │              (max 3 ciclos)                      │
    │      NO                                          │
    │      │                                           │
    │   todos os cenários PASS                         │
    └──────────────────────────────────────────────────┘
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

## 6. A skill `analyze` — detalhamento

### Por que existe
O agente que criou spec.md e plan.md tem viés sobre seus próprios documentos. O analyze é um sub-agente sem contexto da conversa que lê os três documentos e questiona consistência, completude e riscos.

### Critério objetivo (resposta ao problema de "subjetividade")
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

### reviewDepth final
O analyze define o `reviewDepth` final (simple/medium/complex) baseado nos três documentos. Esta é a única classificação confiável — só depois do plan você sabe a complexidade real.

Critérios:
- `simple`: local-only, sem integrações, sem dados críticos, 1-3 cenários
- `medium`: CRUD com backend, integrações de API, lógica de negócio moderada
- `complex`: real-time, pagamentos, autenticação, multi-usuário, dados críticos
- Modificadores: toca dados de usuário (+1), toca dinheiro (→ complex), API externa (+1)

---

## 7. Mecanismos internos das skills

### `discovery` usa:
- Entrevista em chat natural (Portuguese) — sem formulários
- `Ctrl+.` / answer.ts para respostas estruturadas quando o operador preferir
- web_search + fetch_content para pesquisar referências
- Perguntas obrigatórias (ver ponto aberto #7)

### `build` usa:
- `/loop self` — Ralph Loop para persistência autônoma entre turnos
- NÃO é o mesmo que `review_loop` tool (ver confusão no piloto)
- Compaction-aware via loop.ts

### `test` usa:
- `/loop tests` — Ralph Loop real, condição objetiva (testes verdes)
- `node tests/<feature>.test.js` — Node.js assert, sem frameworks externos

### `review` usa:
- `/review uncommitted` — mitsupi
- Critérios do `REVIEW_GUIDELINES.md`

### `validate` usa:
- `agent-browser` (NÃO surf — ver Phase 13)
- Percorre cenários do spec.md
- Screenshots como evidência

### `analyze` usa:
- Sub-agente sem contexto de conversa (pi-subagents)
- Lê: `brief.md` + `spec.md` + `plan.md` + constituições
- Produz: `critique.md` (temporário, usado pelo loop, não exposto ao operador diretamente)

---

## 8. Gates — semântica precisa

| Gate | Momento | Operador vê | Operador decide |
|------|---------|------------|-----------------|
| Gate 1 | Após discovery | brief.md em PT | "Entendeu o que quero?" — direção |
| Gate 2 | Após loop de documentos | Resumo do plan em PT + o que o analyze encontrou/corrigiu | "Vai construir certo?" — execução |
| Gate 3 | Após loop de código | Produto rodando + screenshots + checklist | "Funcionou?" — release |

**Princípio:** em nenhum gate o operador resolve problemas técnicos. Ele só toma decisões de produto.

---

## 9. Referências que validam esta arquitetura

### Ralph Loop
Fonte: https://medium.com/@tentenco/what-is-ralph-loop-a-new-era-of-autonomous-coding-96a4bb3e2ac8

- `/loop self` = persistência autônoma (não é Ralph Loop — condição subjetiva)
- `/loop tests` = Ralph Loop real — condição objetiva, retry em falha
- Cada um no lugar certo: `/loop self` no build, `/loop tests` no test

### Anthropic — Effective Harnesses for Long-Running Agents
Fonte: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

Valida nossa arquitetura inteira:
- Feature list com `passes: false` → nosso `feature-list.json` ✅
- Progress file → nosso `progress.md` ✅
- Commits atômicos → nossa disciplina de build ✅
- Specialized agents (testing agent, QA agent) → exatamente nossa separação de skills ✅
- Browser automation para testes → valida migração para `agent-browser` ✅

Citação direta da conclusão do artigo:
> "It seems reasonable that specialized agents like a testing agent, a quality assurance agent, or a code cleanup agent, could do an even better job at sub-tasks across the software development lifecycle."
> — Esta é nossa arquitetura. O artigo descreve como trabalho futuro o que estamos implementando.

---

## 10. Os 13 pontos abertos

### 🔴 Críticos — devem ser resolvidos ANTES de implementar

**#1 — Cascata no loop de documentos**
Quando `analyze` encontra problema no spec → `specify` re-roda e gera novo spec.md → o `plan` precisa re-rodar também? Sempre? Só se a mudança for estrutural? Sem esta regra, o loop pode corrigir o spec e deixar o plan desatualizado — estado pior que o inicial.

*Proposta para discussão:* definir dois tipos de problema:
- "Spec inconsistency" → spec re-roda → plan re-roda obrigatoriamente
- "Plan gap" → só plan re-roda → spec não muda

**#2 — Re-entrada no loop de código é por task ou por skill inteira?**
Scout diagnostica "build problem" → re-entra no build. Mas qual task? A partir da task quebrada ou do início? Se task 3 está errada mas 1 e 2 estão corretas, refazer tudo desperdiça e pode introduzir regressões.

*Proposta para discussão:* scout identifica qual task do plan.md é responsável. Re-entrada é a partir dessa task, não do início.

**#3 — Escalação após max ciclos não tem protocolo**
Após 3 ciclos sem resolução, como comunicamos ao operador em linguagem de produto? "O sistema não conseguiu resolver a inconsistência entre o que foi entendido e o plano técnico" — mas qual é a ação do operador? Redefinir? Simplificar o escopo?

*Proposta para discussão:* protocolo de escalação em 3 opções via ask tool:
- "Simplificar o escopo para desbloquear"
- "Redefinir o que quer construir" (volta ao discovery)
- "Aceitar o risco e continuar mesmo assim"

**#4 — `validate` depende da migração para `agent-browser` (Phase 13)**
A skill validate ainda usa surf, que está confirmadamente quebrado sem Chrome aberto. A nova arquitetura precisa do validate funcionando. Dependência circular: nova arquitetura precisa de validate, validate precisa de Phase 13.

*Decisão necessária:* implementar Phase 13 (migrar para agent-browser) ANTES de implementar Phase 15 (nova arquitetura). Ordem: Phase 13 → Phase 14 → Phase 15.

---

### 🟡 Importantes — devem ser definidos antes de implementar

**#5 — Formato do `brief.md` não está definido**
O brief pode ser 5 linhas ou 5 páginas. Sem formato definido, Gate 1 pode ser esmagador ou insuficiente. O operador precisa entender o brief para aprovar com confiança.

*Proposta:* template de brief.md com seções obrigatórias:
- O que será construído (2-3 frases)
- Para quem / contexto de uso
- O que a pessoa poderá fazer (lista de capacidades, não features técnicas)
- O que ficou de fora (explícito)
- Referências pesquisadas e o que foi aproveitado
- Perguntas respondidas pelo operador durante a entrevista

**#6 — Gate 2 — o operador vê o quê exatamente?**
`plan.md` é técnico. O operador não deveria precisar ler stack, estrutura de arquivos, tasks técnicas. Mas também não pode aprovar às cegas.

*Proposta:* Gate 2 apresenta:
- "Vou construir em N etapas. Na primeira: [o que funciona]. No final: [experiência completa]."
- "A análise interna encontrou X problemas e todos foram resolvidos." (ou "nenhum problema encontrado")
- Nunca menciona tecnologia, framework ou estrutura técnica

**#7 — Profundidade do `discovery` não tem mecanismo**
Discovery faz entrevista profunda — mas quão profunda? Quais perguntas são obrigatórias vs opcionais? Sem isso, pode ser raso para produtos complexos ou excessivo para simples.

*Proposta:* discovery tem perguntas de duas categorias:
- Obrigatórias (sempre): problema que resolve, quem usa, o que pode fazer, o que NÃO pode fazer
- Condicionais (se o produto envolver): dados de usuário, múltiplos usuários, integrações, dinheiro, conteúdo gerado pelo usuário
O discovery termina quando todas as obrigatórias estão respondidas + as condicionais relevantes.

**#8 — `/setup` quebra com os novos nomes de skills**
O `/setup` escreve AGENTS.md com nomes antigos (`product-specify`, `auto-plan`, etc.). Após o refactor, projetos novos teriam AGENTS.md errado. É uma breaking change que precisa ser sincronizada com a implementação.

*Decisão:* a extensão `product-setup/index.ts` deve ser atualizada JUNTO com o refactor das skills. Não antes, não depois — na mesma implementação.

---

### 🔵 Decisões de design — podem ser decididas durante a implementação

**#9 — O critique do analyze some após o loop?**
Depois que o loop resolve, o operador no Gate 2 vê: (a) nada, (b) resumo do que foi encontrado/corrigido, ou (c) critique completo?

*Recomendação:* opção (b) — resumo em linguagem de produto. Transparência sem complexidade técnica.

**#10 — `publish` ainda faz 8 coisas**
PR + merge + tag + changelog + reset + notifica. Viola "do one thing well" — mas todos produzem UM output (release publicado). É complexidade inevitável de um release?

*Recomendação:* manter como uma skill, documentar os 8 passos como sequência obrigatória de um release. A alternativa (dividir em 8 micro-skills) cria complexidade de orquestração sem benefício claro.

**#11 — Compaction no meio do loop de documentos**
O loop de código usa `loop.ts` (compaction-aware). O loop de documentos é manual — sem loop.ts. Se compaction acontecer no ciclo 2 de 3 do analyze, o estado é perdido.

*Recomendação:* `workflow-state.json` deve ter campo `analyzeLoop: { cycle: 2, maxCycles: 3, lastIssue: "..." }` para sobreviver a compactions.

**#12 — Review Guidelines foram escritas para o sistema antigo**
As guidelines atuais focam em UX e mobile. Com skills separadas, `review` recebe código que já passou por `test`. Os critérios precisam refletir isso: o que é P0/P1 no código depois que testes já passaram?

*Recomendação:* reescrever REVIEW_GUIDELINES.md junto com a implementação do `review` skill.

**#13 — Gate 1 — feedback path se operador rejeitar o brief**
Se operador diz "não é isso" no Gate 1, o que acontece? Discovery re-roda inteiro ou só atualiza partes?

*Recomendação:* discovery re-roda com o feedback como contexto adicional. Não parte do zero — parte do brief existente com as correções do operador. O ask tool em Gate 1 deve ter opção "Quero corrigir algo específico" que abre input para o operador descrever o que está errado.

---

## 11. O que está implementado hoje (V1)

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
└── product-setup/      → mantém, mas requer atualização (ponto aberto #8)
```

### Agents
```
~/.pi/agent/agents/
├── reviewer.md         → mantém (usado pelo review skill)
├── scout.md            → mantém (usado para diagnóstico no loop de código)
└── spec-checker.md     → mantém (usado pelo analyze)
```

### Install.sh
Precisa ser atualizado para os novos nomes. Não atualizar antes que as skills existam.

---

## 12. Ordem de implementação recomendada

Baseada nos pontos críticos e dependências:

```
1. Phase 13: migrar validate de surf → agent-browser
   (desbloqueador crítico — validate quebrado sem isso)

2. Phase 14 items 1 e 2:
   - /setup cria GitHub remote (gh repo create)
   - Clarificar /loop self vs review_loop na build-loop

3. Phase 15: refactor completo de skills
   a. Resolver pontos abertos #1, #2, #3 primeiro (design)
   b. Criar skills na ordem: discovery → specify → plan → analyze → build → test → review → validate → publish
   c. Atualizar /setup (product-setup/index.ts) com novos nomes
   d. Atualizar install.sh
   e. Deletar product-clarify
   f. Atualizar README.md
```

---

## 13. O que NÃO mudar

- `workflow-state.json` schema — continua sendo a fonte de verdade entre sessões
- `progress.md` — continua sendo o log narrativo
- `feature-list.json` — continua rastreando features com `passes: false/true`
- `ask-tool.ts` — continua sendo usado para gates
- Agentes (reviewer, scout, spec-checker) — continuam, só são usados em contextos diferentes
- Convenção de commits (conventional commits)
- Estrutura de diretórios do projeto (`.pi/specs/<feature>/`)

---

## 14. Validação filosófica da V2

Checando cada skill contra os princípios do operador:

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
| publish | ⚠️ 8 passos | ✅ um output final | ✅ pipeline extensível |

`publish` é o único com ressalva — 8 passos internos, mas um output único. Decisão consciente de manter assim (ver ponto #10).

---

## 15. Glossário de termos usados neste documento

- **Ralph Loop:** loop autônomo com condição objetiva de saída (testes passando). Fonte: Ralph Wiggum dos Simpsons — persistência sem desistência.
- **Loop de qualidade de documentos:** specify → plan → analyze → corrige → analyze. Máx 3 ciclos.
- **Loop de qualidade de código:** build → test → review → validate → [scout diagnose] → corrige. Máx 3 ciclos.
- **brief.md:** output do discovery. Documento em linguagem de produto que descreve o que o operador quer.
- **spec.md:** documento INTERNO. Cenários de aceite. O operador não vê — aprovou o brief que o gerou.
- **critique.md:** output temporário do analyze. Usado internamente pelo loop. Resumo vai para Gate 2.
- **reviewDepth:** simple/medium/complex. Definido pelo analyze (não pelo specify). Controla profundidade dos loops.
- **scout:** sub-agente sem contexto. Diagnostica root cause quando loops falham.
