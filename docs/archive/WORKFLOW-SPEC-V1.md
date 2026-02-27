> ⚠️ **ARCHIVED — V1 spec. Superseded by `docs/ARCHITECTURE-V2.md`. Do NOT use for implementation.**
> This file is preserved for reference only. All V2 design decisions are in ARCHITECTURE-V2.md.

# Bernardo's Product System — Especificação Técnica Completa (V1 — ARCHIVED)
## Motor: Pi Coding Agent + Ecossistema nicobailon + mitsuhiko

> **Para quem é este documento:** O agente que vai implementar o sistema, e qualquer desenvolvedor que precise entender como as peças se conectam. Não é para o operador (Bernardo) ler — ele tem o `PARA-BERNARDO.md`.

> **Fonte de verdade:** Este documento + os repositórios analisados. Em caso de conflito, o código-fonte do Pi vence.

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    OPERADOR (Bernardo)                       │
│         Conversa natural em português brasileiro             │
│   Fala livremente → responde gates → valida resultado        │
│              ZERO comandos. ZERO código.                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                  WORKFLOW ENGINE                             │
│                                                             │
│  AGENTS.md (sistema nervoso central)                        │
│  workflow-engine.ts (extensão: gates + bloqueios)           │
│  ask-tool.ts (extensão: interação estruturada)              │
│  loop.ts (extensão: build loop com breakout)                │
│  review.ts (extensão: self-review P0-P3 com loop fixing)    │
│  answer.ts (extensão: extração reativa de clarificações)    │
│                                                             │
│  Artefatos no disco:                                        │
│    .pi/workflow-state.json  ← máquina de estados           │
│    .pi/progress.md          ← log narrativo cross-session   │
│    .pi/feature-list.json    ← features com passes: bool     │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                SKILLS DE PRODUTO                             │
│                                                             │
│  product-specify   → descricao → spec estruturada           │
│  product-clarify   → ambiguidades → perguntas de produto    │
│  auto-plan         → spec → plano técnico interno           │
│  product-validate  → checklist comportamental + preview     │
│  commit            → mudanças → conventional commit         │
│  update-changelog  → commits → CHANGELOG.md atualizado      │
│  frontend-design   → spec visual → UI com direção estética  │
│  web-browser       → app local → verificação via CDP        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│              INFRA DO PI (nativo + pacotes)                  │
│                                                             │
│  pi-subagents      → agentes especializados nomeados        │
│  pi-model-switch   → escalação automática de modelo         │
│  pi-web-access     → busca web + extração de conteúdo       │
│  pi-interactive-shell → dev server + dispatch de agentes    │
│  surf-cli          → controle de Chrome para screenshots    │
│  pi-review-loop    → fallback de review loop (nicobailon)   │
│  mitsupi           → skills do mitsuhiko via npm            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Pacotes a Instalar

### 2.1 Pacotes Pi (via `pi install`)

```bash
# Sub-agentes nomeados com frontmatter (substitui Task Tool do oh-my-pi)
pi install npm:pi-subagents

# Troca de modelo autônoma pelo agente (substitui Model Roles do oh-my-pi)
pi install npm:pi-model-switch

# Busca web + extração de conteúdo
pi install npm:pi-web-access

# PTY emulation: dev server (hands-free) + sub-agentes (dispatch)
pi install npm:pi-interactive-shell

# Formulário web para clarificações ricas (perguntas com contexto visual)
pi install npm:pi-interview

# Loop de review automatizado (fallback/complemento ao review.ts do mitsuhiko)
pi install npm:pi-review-loop

# Prompt template com model+skill por modo
pi install npm:pi-prompt-template-model

# Skills do mitsuhiko: commit, update-changelog, frontend-design, web-browser, tmux, github
pi install npm:mitsupi
```

### 2.2 Ferramentas externas

```bash
# Controle de Chrome via CLI (screenshots, cliques, navegação)
npm install -g surf-cli
# → seguir setup: surf extension-path + load unpacked no Chrome + surf install <id>

# GitHub CLI (para review de PRs e issues)
brew install gh  # macOS
gh auth login
```

### 2.3 Extensões do mitsuhiko (clonar do repo)

As extensões centrais vêm do repositório `mitsuhiko/agent-stuff`. São copiadas para `.pi/extensions/` do projeto:

```
.pi/extensions/
├── workflow-engine.ts    ← construído do zero (ver Seção 6)
├── ask-tool.ts           ← portado do oh-my-pi/ask.ts (ver Seção 7)
├── answer.ts             ← de mitsuhiko/agent-stuff/pi-extensions/answer.ts
├── loop.ts               ← de mitsuhiko/agent-stuff/pi-extensions/loop.ts
├── review.ts             ← de mitsuhiko/agent-stuff/pi-extensions/review.ts
└── todos.ts              ← de mitsuhiko/agent-stuff/pi-extensions/todos.ts
```

---

## 3. Estrutura de Diretórios do Projeto

Todo projeto criado com o sistema terá esta estrutura:

```
<projeto>/
├── .pi/
│   ├── settings.json              ← overrides de configuração do projeto
│   ├── workflow-state.json        ← estado atual do workflow (máquina de estados)
│   ├── progress.md                ← log narrativo cross-session (últimas 10 entradas)
│   ├── progress-archive.md        ← entradas antigas (rotação automática)
│   ├── feature-list.json          ← features com status passes: true/false
│   ├── product-constitution.md    ← princípios de produto (capturado via answer.ts)
│   ├── engineering-constitution.md← padrões técnicos (gerado automaticamente)
│   ├── REVIEW_GUIDELINES.md       ← regras de review específicas do produto
│   ├── AGENTS.md                  ← instruções para o agente (parte fixa + dinâmica)
│   ├── extensions/
│   │   ├── workflow-engine.ts     ← extensão central do workflow
│   │   ├── ask-tool.ts            ← ferramenta de gates estruturados
│   │   ├── answer.ts              ← extração reativa de perguntas
│   │   ├── loop.ts                ← loop de build com breakout condition
│   │   ├── review.ts              ← self-review P0-P3 com loop fixing
│   │   └── todos.ts               ← todo manager interno
│   ├── skills/
│   │   ├── product-specify/       ← skill: descrição → spec estruturada
│   │   ├── product-clarify/       ← skill: perguntas só de produto
│   │   ├── auto-plan/             ← skill: plano técnico sem operador
│   │   └── product-validate/      ← skill: checklist + preview
│   ├── agents/
│   │   ├── reviewer.md            ← agente de review (para pi-subagents)
│   │   ├── spec-checker.md        ← agente de compliance com spec
│   │   └── scout.md               ← agente de exploração de codebase
│   ├── specs/
│   │   └── <feature>/
│   │       └── spec.md            ← spec gerada na fase specify
│   └── todos/                     ← armazenamento de todos (gerenciado por todos.ts)
├── CHANGELOG.md                   ← atualizado automaticamente no publish
├── AGENTS.md                      ← symlink ou cópia de .pi/AGENTS.md
└── <código do projeto>
```

---

## 4. Artefatos de Continuidade

Padrão baseado em Anthropic "Effective Harnesses for Long-Running Agents". São a fonte de verdade entre sessões — não o histórico de mensagens.

### 4.1 `workflow-state.json`

```json
{
  "project": "nome-do-projeto",
  "currentPhase": "clarification",
  "feature": {
    "id": "001",
    "name": "sistema-basico",
    "branch": "feature/001-sistema-basico",
    "reviewDepth": "medium"
  },
  "gates": {
    "specApproved": false,
    "buildApproved": false,
    "validationApproved": false
  },
  "phaseHistory": [
    { "phase": "init", "status": "completed", "timestamp": "ISO8601" },
    { "phase": "specification", "status": "completed", "timestamp": "ISO8601" },
    { "phase": "clarification", "status": "in_progress", "pendingQuestions": 2 }
  ],
  "scopeChanges": [],
  "iterationCount": 0,
  "failureCount": 0,
  "feedback": [],
  "version": "v0.1.0"
}
```

**Campos críticos:**
- `currentPhase`: `init | specification | clarification | planning | building | self_review | validation | publishing`
- `reviewDepth`: `simple | medium | complex` — definido na fase plan, controla profundidade do review
- `gates.*`: nunca avança sem `true` explícito via gate aprovado pelo operador
- `failureCount`: acumulador para o Protocolo de Falha (ver Seção 14)
- `scopeChanges[]`: registra mudanças mid-build (ver Seção 15)

### 4.2 `progress.md`

Log narrativo. Cada sessão escreve uma entrada ao terminar. O agente lê APENAS a última entrada ao iniciar.

```markdown
## Sessão 2026-02-25 18:30

### O que foi feito
- Implementei o sistema de autenticação básico (feature/002)
- Testes passando: 24/24

### Decisões tomadas
- Escolhi Supabase para auth em vez de Auth0 (mais simples para MVP)
- Email/senha apenas por enquanto (Google OAuth é Sprint 2)

### Problemas encontrados
- CORS no preview bloqueava chamadas da API — resolvido com proxy config

### Próximos passos
- Gate 3 pendente: operador precisa validar no preview https://projeto-preview.vercel.app
- Após Gate 3: publish (merge + tag v0.2.0 + deploy)
```

**Rotação:** quando exceder 10 entradas, move as mais antigas para `progress-archive.md`. O agente nunca lê o arquivo inteiro — só a última entrada.

### 4.3 `feature-list.json`

```json
[
  {
    "id": "001",
    "category": "core",
    "description": "Sistema básico de lista de compras",
    "reviewDepth": "medium",
    "scenarios": [
      "Criar lista com nome personalizado",
      "Adicionar itens digitando o nome",
      "Item aparece imediatamente após adicionar",
      "Marcar item como comprado (fica riscado)"
    ],
    "passes": false
  },
  {
    "id": "002",
    "category": "sharing",
    "description": "Compartilhamento em tempo real",
    "reviewDepth": "complex",
    "scenarios": [
      "Convidar outra pessoa via link",
      "Mudanças aparecem para todos em < 2 segundos",
      "Funciona em 2 navegadores simultâneos"
    ],
    "passes": false
  }
]
```

**Regras:**
- `passes: true` APENAS após teste local confirmado (Camada 0 do review)
- Proibido editar `description` ou `scenarios` após aprovação do Gate 1
- Proibido remover features — apenas mudar `passes`
- O agente lê este arquivo no início de toda sessão

---

## 5. AGENTS.md Template

O AGENTS.md tem duas partes: **fixa** (igual em todos os projetos) e **dinâmica** (gerada na fase init com a Product Constitution do operador).

### 5.1 Parte Fixa (template)

```markdown
# AGENTS.md — Sistema de Criação de Produtos

## Identidade
Você é um agente de produto. Constrói software para o operador seguindo um processo
rigoroso. O operador NÃO é técnico — nunca mostre código, erros técnicos ou jargão.
Toda comunicação em português brasileiro.

## Rotina de Início de Sessão (OBRIGATÓRIA — executar ANTES de responder)
1. Ler `.pi/workflow-state.json` — identificar `currentPhase` e estado dos `gates`
2. Ler `.pi/progress.md` — APENAS a última entrada (não o arquivo inteiro)
3. Ler `.pi/feature-list.json` — ver o que foi feito e o que falta
4. Se `currentPhase` é "building" ou posterior: `git log --oneline -10`
5. Se já há código: iniciar dev server e verificar via web-browser skill
6. Somente então: responder ao operador baseado no estado lido

Se algum arquivo não existir: projeto novo → iniciar fase `init`.

## Rotina de Fim de Sessão (OBRIGATÓRIA — executar ANTES de encerrar)
1. Commit atômico usando a skill `commit`
2. Atualizar `.pi/progress.md` com: o que fez, decisões, problemas, próximos passos
3. Atualizar `.pi/workflow-state.json` se houve transição de fase
4. Atualizar `.pi/feature-list.json` se alguma feature passou nos testes
5. Verificar que o código compila e o app roda (estado limpo para próxima sessão)
6. Se progress.md tem mais de 10 entradas: mover antigas para `progress-archive.md`

## Rotina Pós-Compaction (OBRIGATÓRIA)
Se perceber que o contexto foi compactado (mensagens sumarizadas):
1. PARAR o que está fazendo
2. Reler `.pi/workflow-state.json`
3. Reler `.pi/progress.md` (última entrada)
4. Reler `.pi/feature-list.json`
5. Confirmar a fase atual ANTES de continuar qualquer trabalho

Os artefatos no disco são a fonte de verdade. Não o histórico de mensagens.

## Workflow — Máquina de Estados
```
init → specify → clarify → GATE 1 → plan → GATE 2 → build → self-review → GATE 3 → publish
```

Transições especiais:
- Se GATE 3 → "preciso de ajustes": volta para build com feedback
- Se GATE 3 → "não é isso": volta para specify
- Se mudança de escopo mid-build: GATE 1 mini (ver Protocolo de Mudança de Escopo)

## Regra Absoluta dos Gates
NUNCA avançar por um gate sem aprovação explícita do operador via ask tool.
Mesmo que o operador diga "já vai logo" — apresentar o resumo e as opções primeiro.
A resposta do operador deve ser registrada em `workflow-state.json`.

## Comunicação com o Operador
- Sempre português brasileiro
- Descrever CONSEQUÊNCIAS, nunca tecnologia
  ✓ "vai funcionar direto do celular sem precisar instalar nada"
  ✗ "vou usar PWA com Next.js e service workers"
- Erros técnicos: descrever o que aconteceu + o que vai fazer, nunca o stack trace
- Decisões técnicas: decidir sozinho, listar como "decisões assumidas" no Gate 1
- Nunca perguntar sobre tecnologia — decidir e explicar a consequência

## Progresso
- Reportar em termos de features e comportamento, nunca tasks técnicas
- Usar Todo Tool (todos.ts) para tracking interno — operador não precisa ver
- Updates de progresso: "Lista básica pronta. Trabalhando no compartilhamento (40%)."

## Protocolo de Falha
- 2 falhas no mesmo erro → tentar abordagem diferente
- 3 falhas → lançar subagente scout para diagnóstico (pi-subagents)
- 5 falhas → perguntar ao operador em linguagem de consequência
- 7 falhas → entrega parcial: publicar o que funciona, registrar o que falta
- Max 20 turnos sem progresso visível → escalar para operador
- `failureCount` acumula em `workflow-state.json`, resetar quando resolvido

## Protocolo de Mudança de Escopo Mid-Build
Mudança menor (estética, wording): absorver no build atual, registrar em `feedback[]`
Mudança significativa (arquitetura, features, remoção):
  1. Pausar build
  2. Registrar em `scopeChanges[]` com timestamp
  3. Apresentar GATE 1 mini com resumo do novo escopo via ask tool
  4. Se aprovado: atualizar spec, re-plan (apenas delta), continuar
  5. Trabalho que não conflita: manter. Trabalho que conflita: descartar.

---
[PARTE DINÂMICA — gerada na fase init após captura da Product Constitution]

## Projeto: {nome}
{contexto do projeto}

## Product Constitution
{princípios capturados do operador via answer.ts na fase init}
```

### 5.2 Como o AGENTS.md é gerado

Na fase `init`, o agente:
1. Verifica se `.pi/product-constitution.md` existe
2. Se não existe: usa `answer.ts` para capturar as preferências do operador (conversa natural → extração estruturada)
3. Combina a parte fixa com a Product Constitution capturada
4. Escreve `.pi/AGENTS.md`

---

## 6. Extensão: `workflow-engine.ts`

**Localização:** `.pi/extensions/workflow-engine.ts`
**Propósito:** Controle programático do workflow — o que o AGENTS.md faz por instrução, esta extensão faz por código.

### 6.1 O que faz

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync, existsSync, writeFileSync } from "fs";

export default function(pi: ExtensionAPI) {
  // KILL SWITCH: se algo quebrar, rodar `WORKFLOW_DISABLED=true pi` para desativar
  if (process.env.WORKFLOW_DISABLED === "true") {
    console.log("[workflow-engine] desativado via WORKFLOW_DISABLED");
    return;
  }

  const STATE_PATH = ".pi/workflow-state.json";

  function readState() {
    try {
      if (!existsSync(STATE_PATH)) return null;
      return JSON.parse(readFileSync(STATE_PATH, "utf-8"));
    } catch { return null; }
  }

  // BLOCO 1: Bloquear git merge/push sem gate aprovado
  pi.on("tool_call", async (event) => {
    if (event.toolName === "bash") {
      const cmd = (event.input as any).command as string;

      // Bloquear merge para main sem validação aprovada
      if (/git\s+(merge|push).*(main|master)/.test(cmd)) {
        const state = readState();
        if (state && !state.gates?.validationApproved) {
          return {
            block: true,
            reason: "❌ Merge bloqueado: Gate 3 (validação) não foi aprovado pelo operador."
          };
        }
      }

      // Bloquear deploy sem validação
      if (/(vercel|netlify|fly|railway)\s+deploy/.test(cmd)) {
        const state = readState();
        if (state && !state.gates?.validationApproved) {
          return {
            block: true,
            reason: "❌ Deploy bloqueado: Gate 3 (validação) não foi aprovado."
          };
        }
      }
    }
    return undefined;
  });

  // BLOCO 2: Injetar estado do workflow no contexto antes de cada LLM call
  pi.on("before_agent_start", async (event) => {
    const state = readState();
    if (!state) return undefined;

    const injection = `
[ESTADO DO WORKFLOW — reler se perdeu contexto]
Fase: ${state.currentPhase}
Feature atual: ${state.feature?.name ?? "nenhuma"}
Gates: spec=${state.gates?.specApproved}, build=${state.gates?.buildApproved}, validation=${state.gates?.validationApproved}
Failures: ${state.failureCount ?? 0}
`;

    return {
      systemPrompt: event.systemPrompt + "\n\n" + injection
    };
  });

  // BLOCO 3: Preservar estado do workflow na compaction
  // Usa a função compact() exportada pelo pi para gerar sumário com estado incluído
  pi.on("session_before_compact", async (event, ctx) => {
    const state = readState();
    if (!state || !ctx.model) return undefined;

    const apiKey = await ctx.modelRegistry.getApiKey(ctx.model);
    if (!apiKey) return undefined;

    // Importar compact do pi-coding-agent
    const { compact } = await import("@mariozechner/pi-coding-agent");

    const workflowInstructions = `
Estado do workflow a preservar OBRIGATORIAMENTE no sumário:
- Fase atual: ${state.currentPhase}
- Feature em construção: ${state.feature?.name ?? "nenhuma"}
- Gates aprovados: spec=${state.gates?.specApproved}, build=${state.gates?.buildApproved}, validation=${state.gates?.validationApproved}
- failureCount: ${state.failureCount ?? 0}
- INSTRUÇÃO PÓS-COMPACTION: O agente DEVE reler .pi/workflow-state.json, .pi/progress.md e .pi/feature-list.json antes de continuar.
`;

    const instructions = [event.customInstructions, workflowInstructions]
      .filter(Boolean)
      .join("\n\n");

    try {
      const compaction = await compact(event.preparation, ctx.model, apiKey, instructions, event.signal);
      return { compaction };
    } catch {
      return undefined; // fallback para compaction padrão do Pi
    }
  });

  // BLOCO 4: Registrar commands de status
  pi.registerCommand("workflow-status", {
    description: "Mostra o estado atual do workflow",
    handler: async (_args, ctx) => {
      const state = readState();
      if (!state) {
        ctx.ui.notify("Nenhum workflow ativo neste projeto", "info");
        return;
      }
      ctx.ui.notify(
        `Fase: ${state.currentPhase} | Feature: ${state.feature?.name ?? "—"} | Failures: ${state.failureCount ?? 0}`,
        "info"
      );
    }
  });
}
```

### 6.2 Por que `compact()` e não `context[]`

O Pi exporta uma função `compact()` que gera o sumário inteiro usando o modelo do usuário com instruções customizadas. Isso é usado no `loop.ts` do mitsuhiko e é a garantia real — não uma hint que o modelo de compaction pode ignorar.

Importar: `import { compact } from "@mariozechner/pi-coding-agent"`

---

## 7. Extensão: `ask-tool.ts` (portado do oh-my-pi)

**Localização:** `.pi/extensions/ask-tool.ts`
**Propósito:** Ferramenta que o agente chama nos gates para apresentar opções estruturadas ao operador. Porta direta do `ask.ts` do oh-my-pi — usa `ctx.ui.select()` e `ctx.ui.input()` do Pi.

### 7.1 Schema

```typescript
// O agente chama assim:
ask({
  questions: [
    {
      id: "gate1",
      question: "Entendi os cenários corretamente?",
      options: [
        { label: "Sim, está correto" },
        { label: "Preciso corrigir algo" },
        { label: "Quero adicionar cenários" }
      ],
      recommended: 0  // índice 0 = "Sim, está correto" fica pre-selecionado
    }
  ]
})
// → retorna: "gate1: Sim, está correto"
```

### 7.2 Implementação

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function(pi: ExtensionAPI) {
  // KILL SWITCH: `WORKFLOW_DISABLED=true pi` desativa esta extensão
  if (process.env.WORKFLOW_DISABLED === "true") return;

  pi.registerTool({
    name: "ask",
    label: "Ask",
    description: `Ferramenta para fazer perguntas estruturadas ao operador com opções de escolha.
Use nos 3 gates do workflow e em qualquer decisão que precise de aprovação explícita.
Sempre use opções em português. O operador sempre pode escrever uma resposta customizada.`,
    parameters: Type.Object({
      questions: Type.Array(
        Type.Object({
          id:          Type.String({ description: "ID da pergunta, ex: 'gate1'" }),
          question:    Type.String({ description: "Texto da pergunta em português" }),
          options:     Type.Array(Type.Object({ label: Type.String() }), { minItems: 1 }),
          multi:       Type.Optional(Type.Boolean({ description: "Permitir múltiplas seleções" })),
          recommended: Type.Optional(Type.Number({ description: "Índice da opção recomendada (0-based)" })),
        }),
        { minItems: 1 }
      )
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!ctx?.ui) {
        return {
          content: [{ type: "text", text: "Erro: requer modo interativo" }],
          details: {}
        };
      }

      const results = [];

      for (const q of params.questions) {
        const labels = q.options.map(o => o.label);

        if (q.multi) {
          // Multi-select com checkboxes
          const selected: string[] = [];
          let done = false;
          while (!done) {
            const opts = [
              ...labels.map(l => (selected.includes(l) ? `✓ ${l}` : `○ ${l}`)),
              ...(selected.length > 0 ? ["✅ Confirmar seleção"] : []),
              "✏️ Escrever resposta customizada"
            ];
            const choice = await ctx.ui.select(q.question, opts, {
              initialIndex: q.recommended ?? 0
            });
            if (!choice || choice === "✅ Confirmar seleção") { done = true; break; }
            if (choice === "✏️ Escrever resposta customizada") {
              const custom = await ctx.ui.input("Sua resposta:");
              results.push({ id: q.id, selected: [], custom: custom ?? "(sem resposta)" });
              done = true; break;
            }
            const label = choice.replace(/^[✓○] /, "");
            if (selected.includes(label)) selected.splice(selected.indexOf(label), 1);
            else selected.push(label);
          }
          if (!results.find(r => r.id === q.id))
            results.push({ id: q.id, selected, custom: undefined });
        } else {
          // Single select
          const opts = [...labels, "✏️ Escrever resposta customizada"];
          const choice = await ctx.ui.select(q.question, opts, {
            initialIndex: q.recommended ?? 0
          });
          if (choice === "✏️ Escrever resposta customizada") {
            const custom = await ctx.ui.input("Sua resposta:");
            results.push({ id: q.id, selected: [], custom: custom ?? "(sem resposta)" });
          } else {
            results.push({ id: q.id, selected: choice ? [choice] : [], custom: undefined });
          }
        }
      }

      const text = results.map(r =>
        r.custom
          ? `${r.id}: "${r.custom}"`
          : r.selected.length > 0
            ? `${r.id}: ${r.selected.join(", ")}`
            : `${r.id}: (cancelado)`
      ).join("\n");

      return {
        content: [{ type: "text", text: `Respostas do operador:\n${text}` }],
        details: { results }
      };
    }
  });
}
```

---

## 8. Extensões do mitsuhiko: instalação e uso no plano

### 8.1 `answer.ts` — clarificação reativa

**De onde vem:** `mitsuhiko/agent-stuff/pi-extensions/answer.ts`
**Como instalar:** copiar para `.pi/extensions/answer.ts`
**Ativa:** `/answer` command + atalho `Ctrl+.`

**Uso no plano — fase clarification:**

O agente ESCREVE perguntas em prosa natural na sua resposta:
```
"Entendi que você quer um app de lista de compras. Antes de continuar, 
preciso confirmar duas coisas: as listas são por categoria ou uma lista 
única? E quando um item é comprado, ele some ou fica riscado?"
```

O operador pressiona `Ctrl+.` → o `answer.ts` extrai as perguntas com um LLM leve (Haiku ou Codex mini) → abre TUI interativo com campos de resposta → submete respostas estruturadas de volta ao agente.

**Por que não usar sempre o `ask` tool:** O `ask` tool requer que o agente estruture as perguntas antes de enviar. Para clarificações orgânicas onde o agente descobre perguntas ao escrever, o `answer.ts` é mais natural.

**Quando usar cada um:**
- `ask` tool → gates (estruturado, aprovação explícita necessária)
- `answer.ts` → clarificações durante a fase clarify (prosa natural)
- `pi-interview-tool` → clarificações ricas onde contexto visual ajuda (mockups, diagramas)

### 8.2 `loop.ts` — build loop com breakout condition

**De onde vem:** `mitsuhiko/agent-stuff/pi-extensions/loop.ts`
**Como instalar:** copiar para `.pi/extensions/loop.ts`
**Ativa:** `/loop` command + ferramenta `signal_loop_success`

**Uso no plano — fase build:**

Após Gate 2 (build aprovado), o AGENTS.md instrui:
```
"Inicie o loop de build: /loop self
Continue implementando features da feature-list.json em ordem.
Quando todas as features tiverem passes: true, chame signal_loop_success."
```

O loop:
1. Agente implementa feature
2. Roda testes + verificação local
3. Marca `passes: true` no feature-list.json se passou
4. Commit atômico
5. Recebe o prompt de loop de volta
6. Quando feature-list.json está toda `passes: true` → chama `signal_loop_success`
7. Loop termina → agente vai para self-review

**Compaction-aware:** O `loop.ts` intercepta `session_before_compact` e usa `compact()` com instruções que preservam o estado do loop no sumário. Loop sobrevive a compactions.

**Modos disponíveis:**
- `/loop tests` — loop até todos os testes passarem
- `/loop self` — agente decide quando está pronto (chama `signal_loop_success`)
- `/loop custom "features 001 e 002 com passes: true"` — condição específica

### 8.3 `review.ts` — self-review com loop fixing

**De onde vem:** `mitsuhiko/agent-stuff/pi-extensions/review.ts`
**Como instalar:** copiar para `.pi/extensions/review.ts`
**Ativa:** `/review` command + atalho `Ctrl+R`

**Uso no plano — fase self_review:**

Após o build loop terminar (signal_loop_success chamado), o AGENTS.md instrui:
```
"Ative loop fixing mode: /review-auto on
Inicie review: /review uncommitted
Aguarde até não haver mais findings P0/P1."
```

**Fresh session mode:** O `/review` navega para o primeiro user message da sessão criando um branch isolado. O agente revisor vê o código mas não o histórico de construção — aproximação prática de "fresh eyes".

**Loop fixing mode:** Quando ativo:
1. Review detecta P0/P1 → retorna ao código com summary das findings
2. Agente corrige os problemas
3. Novo review
4. Loop até "correct" (sem P0/P1)

**REVIEW_GUIDELINES.md:** Arquivo em `.pi/REVIEW_GUIDELINES.md` com regras específicas do produto. O review.ts o lê automaticamente se existir. Conteúdo para o plano:

```markdown
# Review Guidelines — Sistema de Produto

Além das regras padrão de código, verificar:

## Comunicação com o usuário
- Nenhuma mensagem de erro técnica exposta ao usuário
- Todas as mensagens em português brasileiro
- Formulários validam em tempo real, não após submit
- Loading states em toda operação async > 500ms

## Performance
- Nenhuma tela com carregamento > 3 segundos
- Imagens otimizadas (WebP, lazy loading)
- Sem chamadas de API desnecessárias no render

## Mobile
- Layout funciona em telas de 375px (iPhone SE)
- Botões com área de toque mínima de 44px
- Sem overflow horizontal

## Dados
- Nenhum dado perdido por erro de usuário (confirmação antes de deletar)
- Estado local sincronizado com servidor
```

**`/end-review` com as 3 opções:**
- "Return and fix findings" → agente aplica as correções imediatamente
- "Return and summarize" → sumariza os findings para o operador entender
- "Return only" → volta sem action (para inspeção manual)

### 8.4 `todos.ts` — tracking interno

**De onde vem:** `mitsuhiko/agent-stuff/pi-extensions/todos.ts`
**Armazena em:** `.pi/todos/`
**Ativa:** `todo` tool (LLM) + `/todos` command (TUI)

O agente usa este tool para tracking interno de tasks durante o build. O operador NUNCA precisa ver — é infraestrutura interna. Substitui o "Todo Tool" mencionado no plano original.

**Claim/release** permite coordenação quando múltiplos agentes trabalham em paralelo (via pi-subagents).

---

## 9. Skills de Produto

Localizadas em `.pi/skills/`. Seguem o padrão Agent Skills (SKILL.md).

### 9.1 `product-specify` skill

**Trigger:** Operador descreve o que quer criar
**Output:** `spec.md` estruturada + `feature-list.json` populado + `reviewDepth` classificado

```markdown
<!-- .pi/skills/product-specify/SKILL.md -->
---
name: product-specify
description: "Transforma descrição do operador em spec estruturada com cenários de aceite,
decisões assumidas e reviewDepth. Usar quando operador descrever um produto ou feature."
---

# Product Specify Skill

## Processo

1. Leia a descrição do operador com atenção
2. Identifique: funcionalidades core, comportamentos esperados, restrições implícitas
3. Gere a spec no template abaixo
4. Classifique o reviewDepth:
   - simple: páginas estáticas, formulários básicos, componentes visuais
   - medium: CRUD, integrações de API, lógica de negócio moderada
   - complex: real-time, pagamentos, autenticação, multi-usuário, dados críticos
   Modificadores: toca dados de usuário (+1), toca dinheiro (→ complex), API externa (+1)
5. Popule feature-list.json com cada feature identificada (passes: false)
6. Salve em .pi/specs/<nome-feature>/spec.md

## Template de spec.md

# Spec: [nome da feature]

## Descrição
[O que a feature faz, em linguagem natural]

## Cenários de Aceite
- [ ] [Cenário 1: comportamento esperado]
- [ ] [Cenário 2: ...]

## Decisões Assumidas
[O que o agente decidiu sem perguntar — listado para revisão no Gate 1]
- [Decisão sobre X: escolhi Y porque Z]

## Restrições
[O que NÃO fazer / fora do escopo]

## Dependências
[Features ou infraestrutura necessária antes]

## Review Depth
[simple | medium | complex] — [justificativa]
```

### 9.2 `product-clarify` skill

**Trigger:** Spec gerada com ambiguidades identificadas
**Output:** Perguntas em prosa natural (para o operador responder via `answer.ts`)

```markdown
<!-- .pi/skills/product-clarify/SKILL.md -->
---
name: product-clarify
description: "Gera perguntas de clarificação sobre comportamento do produto. APENAS
perguntas sobre o que o produto deve FAZER — nunca sobre tecnologia."
---

# Product Clarify Skill

## Regras Absolutas
- Perguntas APENAS sobre comportamento, nunca sobre tecnologia
  ✓ "Quando o item é comprado, ele some da lista ou fica riscado?"
  ✗ "Devo usar localStorage ou IndexedDB para persistir os itens?"
- Máximo 3 perguntas por clarificação (mais confunde o operador)
- Se a resposta pode ser "qualquer uma das duas está OK", não perguntar — decidir e listar como decisão assumida
- Escrever em prosa natural (o operador vai usar answer.ts para responder)

## Processo
1. Identifique ambiguidades na spec que AFETAM o comportamento percebido pelo usuário
2. Priorize: perguntas cujas respostas mudam features ou cenários de aceite
3. Escreva em linguagem de produto, não técnica
4. Apresente em prosa (não lista de bullets — o operador vai usar Ctrl+. para responder)
```

### 9.3 `auto-plan` skill

**Trigger:** Gate 1 aprovado
**Output:** Plano técnico interno (operador não vê), tasks no todo tool, GitHub Issues

```markdown
<!-- .pi/skills/auto-plan/SKILL.md -->
---
name: auto-plan
description: "Transforma spec aprovada em plano técnico e tasks. Sem interação com o
operador. Escolhe stack, define tasks atômicas, cria issues, define reviewDepth final."
---

# Auto-Plan Skill

## Processo
1. Leia a spec aprovada (.pi/specs/<feature>/spec.md)
2. Leia .pi/engineering-constitution.md para padrões técnicos
3. Escolha o stack mais adequado (priorizar: maturidade, conhecimento do modelo, simplicidade)
4. Defina tasks atômicas (cada task = 1 commit)
5. Crie todos usando o todo tool para tracking interno
6. Crie GitHub Issues para descobertas inesperadas (capacidades novas, blockers)
7. Defina reviewDepth final (pode ajustar o da spec com mais contexto)
8. Crie feature branch: git checkout -b feature/<id>-<nome>
9. Salve o plano em .pi/specs/<feature>/plan.md

## Template de plan.md

# Plano: [nome da feature]

## Stack Escolhido
[Tecnologia e justificativa em termos de consequência para o produto]

## Etapas
1. [O que será construído, em linguagem de produto]
2. [...]

## Tasks (para Todo Tool — interno)
- [ ] [Task atômica 1]
- [ ] [Task atômica 2]

## Review Depth: [simple|medium|complex]
Justificativa: [razão]

## Riscos Identificados
- [O que pode dar errado e mitigação]
```

### 9.4 `product-validate` skill

**Trigger:** Self-review aprovado (sem P0/P1)
**Output:** Mensagem para o operador com URL de preview + checklist comportamental

```markdown
<!-- .pi/skills/product-validate/SKILL.md -->
---
name: product-validate
description: "Prepara a validação do operador após build completo. Gera checklist em
linguagem de produto, verifica localmente antes de apresentar."
---

# Product Validate Skill

## Processo
1. Verificar LOCALMENTE que o app funciona (web-browser skill + dev server via interactive-shell)
2. Fazer deploy de preview (feature branch → preview URL)
3. Montar checklist dos cenários de aceite da spec (em linguagem natural, sem termos técnicos)
4. Apresentar ao operador com ask tool (Gate 3)

## Checklist template
Para cada cenário em feature-list.json:
"[ ] [Descrição em linguagem de produto do que o operador deve testar]"

## Gate 3 — Perguntas via ask tool
```
ask({
  questions: [{
    id: "gate3",
    question: "Validação do que foi construído:",
    options: [
      { label: "✅ Tudo certo, pode publicar" },
      { label: "🔧 Preciso de ajustes (vou descrever)" },
      { label: "❌ Não é isso, preciso repensar" }
    ]
  }]
})
```

## Se operador pede ajustes
Registrar feedback em workflow-state.json `feedback[]`
Voltar para build com as correções descritas
Não fazer novo Gate 2 — apenas build + self-review + Gate 3 novamente

## Verificação local (Camada 0)
Usar pi-interactive-shell modo hands-free para dev server:
interactive_shell({ command: "npm run dev", mode: "hands-free", reason: "Dev server" })
Usar web-browser skill para navegar e tirar screenshots
Só apresentar preview ao operador APÓS confirmação local
```

---

## 10. Agentes para `pi-subagents`

Localizados em `.pi/agents/`. O `pi-subagents` os descobre automaticamente.

### 10.1 `reviewer.md` — agente de code review

```markdown
---
name: reviewer
description: Fresh eyes code review — revisar código sem contexto de construção
tools: read, grep, find, ls, bash
model: claude-haiku-4-5
thinking: high
---

Você é um code reviewer. Receberá código para revisar e uma spec.
Você NÃO tem contexto de como o código foi construído — isso é intencional.
Revise como se fosse a primeira vez que vê este código.

Siga o rubric P0-P3:
- [P0] Quebra o produto, bloqueia release
- [P1] Urgente, próximo ciclo
- [P2] Normal, corrigir eventualmente
- [P3] Sugestão, nice to have

Finalize com veredito: "correct" ou "needs attention"
```

### 10.2 `spec-checker.md` — agente de compliance

```markdown
---
name: spec-checker
description: Verifica se a implementação cobre todos os cenários da spec
tools: read, grep, find, ls
model: claude-haiku-4-5
thinking: medium
---

Você receberá: (1) a spec da feature e (2) o código implementado.
Compare cada cenário de aceite da spec com a implementação.
Para cada cenário: ✅ implementado | ⚠️ parcial | ❌ não implementado

Finalize com: quantos cenários OK vs total.
```

### 10.3 `scout.md` — diagnóstico de problemas

```markdown
---
name: scout
description: Diagnóstico de problemas sem contexto de build — fresh eyes para debugging
tools: read, bash, grep, find, ls
model: claude-haiku-4-5
thinking: high
---

Você recebe: logs, stack traces, ou descrição de um problema.
Investigue sem assumir contexto prévio.
Retorne: causa provável + evidências + sugestão de correção.
```

---

## 11. Pipeline de Release

Combina as skills do mitsuhiko com o nosso workflow.

### 11.1 Fluxo completo de publish

Triggered por: Gate 3 aprovado (validationApproved: true)

```
1. Merge squash para main
   git checkout main && git merge --squash feature/<id>-<nome>

2. Commit de release usando skill commit
   → conventional commit: "feat(<scope>): <descrição da feature>"

3. Atualizar CHANGELOG.md usando skill update-changelog
   → pega commits desde última tag
   → atualiza seção [Unreleased] com mudanças user-facing

4. Editar CHANGELOG.md
   → renomear [Unreleased] para [v0.X.0]
   → adicionar novo [Unreleased] vazio no topo

5. Criar tag de versão
   git tag v0.X.0 -m "Release v0.X.0"

6. Push (após confirmação do operador)
   git push origin main && git push origin v0.X.0

7. Deploy para produção (CI/CD automático via tag)

8. Atualizar feature-list.json
   → marcar passes: true para features publicadas

9. Atualizar workflow-state.json
   → currentPhase: "published"
   → incrementar versão

10. Atualizar progress.md com sumário do que foi publicado

11. Notificar operador em linguagem de produto
    "Publicado! 🎉 App disponível em https://..."
    "O que foi adicionado: [lista das features em linguagem de produto]"
    "Versão: v0.X.0 | Quer adicionar algo mais?"
```

### 11.2 Skill `commit` do mitsuhiko

Uso no plano: chamada pelo agente após cada implementação atômica.

```
Etapas da skill:
1. git status + git diff (entender mudanças)
2. Opcional: git log -n 50 (ver scopes usados no projeto)
3. Se arquivos ambíguos: perguntar ao operador
4. Stage apenas os arquivos relevantes
5. git commit -m "type(scope): descrição"
```

Tipos: `feat | fix | refactor | perf | docs | test | build | ci | chore | style | revert`

### 11.3 Skill `update-changelog` do mitsuhiko

```
Etapas:
1. git describe --tags --abbrev=0 (última tag)
2. git log <última-tag>..HEAD (commits desde então)
3. Filtrar: apenas mudanças user-facing (ignorar refactor, chore, test)
4. Atualizar seção [Unreleased] do CHANGELOG.md
5. Categorias: Breaking Changes, Added, Changed, Deprecated, Removed, Fixed, Security
```

---

## 12. Configuração de Modelo

### 12.1 `pi-model-switch` com aliases

Arquivo `~/.pi/agent/extensions/pi-model-switch/aliases.json`:

```json
{
  "cheap":   "anthropic/claude-haiku-4-5",
  "default": "anthropic/claude-sonnet-4-20250514",
  "heavy":   "anthropic/claude-opus-4-5",
  "fast":    ["anthropic/claude-haiku-4-5", "google/gemini-2.5-flash"]
}
```

**Uso no Protocolo de Falha:**
```
failureCount >= 3 → switch_model({ action: "switch", search: "default" })
failureCount >= 5 → switch_model({ action: "switch", search: "heavy" })
```

### 12.2 `pi-prompt-template-model` para fases

Cada fase usa o modelo mais adequado:

```markdown
<!-- ~/.pi/agent/prompts/spec-mode.md -->
---
description: Modo especificação de produto
model: anthropic/claude-sonnet-4-20250514
skill: product-specify
thinking: low
restore: true
---
$@
```

```markdown
<!-- ~/.pi/agent/prompts/review-mode.md -->
---
description: Modo self-review
model: anthropic/claude-sonnet-4-20250514
skill: product-validate
thinking: medium
restore: true
---
$@
```

### 12.3 `settings.json` do projeto

**`.pi/settings.json`:**
```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  },
  "defaultThinkingLevel": "low",
  "enableSkillCommands": true
}
```

**`~/.pi/agent/settings.json` (global):**
```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-20250514",
  "defaultThinkingLevel": "low",
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  },
  "retry": {
    "enabled": true,
    "maxRetries": 3,
    "baseDelayMs": 2000
  }
}
```

---

## 13. Guardrails (sem TTSR)

O Pi não tem TTSR. Os guardrails são implementados em camadas:

### Camada 1 — AGENTS.md (primária)
Instruções explícitas no system prompt. O agente segue por design.

### Camada 2 — `before_agent_start` (reforço)
A `workflow-engine.ts` injeta o estado do workflow antes de cada LLM call, incluindo reforços das regras principais.

### Camada 3 — `tool_call` blocker (programático)
A `workflow-engine.ts` bloqueia git merge/push e deploys sem gate aprovado. Independente do agente.

### Camada 4 — Intercepted commands (toolchain)
Scripts em `.pi/intercepted-commands/` que ficam no PATH antes dos comandos reais:

```bash
# .pi/intercepted-commands/git
#!/bin/bash
# Bloquear push direto para main sem gate aprovado
if [[ "$1" == "push" ]] && [[ "$2" == "origin" ]] && [[ "$3" == "main" ]]; then
  STATE=$(cat .pi/workflow-state.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['gates']['validationApproved'])" 2>/dev/null)
  if [[ "$STATE" != "True" ]]; then
    echo "❌ Push bloqueado: Gate 3 (validação) não foi aprovado." >&2
    exit 1
  fi
fi
exec /usr/bin/git "$@"
```

### Camada 5 — REVIEW_GUIDELINES.md (qualidade)
Regras de produto no review garantem que o código entregue segue os princípios da Product Constitution.

---

## 14. Protocolo de Falha (implementação)

Usando `failureCount` no `workflow-state.json` + `pi-model-switch`:

```
failureCount = 0-2: retry automático (abordagem diferente)
failureCount = 3:   /run scout "diagnosticar: [descrição do problema]" (pi-subagents)
failureCount = 5:   switch_model({ search: "heavy" }) + perguntar ao operador
failureCount = 7:   entrega parcial
                    → publicar features com passes: true
                    → registrar features pendentes no feature-list.json
                    → comunicar ao operador o que funciona vs o que falta
```

**O agente atualiza `failureCount`** no workflow-state.json a cada falha. Reseta quando o problema é resolvido.

**Max 20 turnos sem progresso:** instrução no AGENTS.md + monitoramento via `progress.md` (se a última entrada de sessão não mostra progresso em features, escalar).

---

## 15. Protocolo de Mudança de Escopo Mid-Build

**Detecção:** O agente monitora mensagens do operador durante o build. Qualquer mensagem que implique alteração de features, arquitetura ou remoção de funcionalidade dispara o protocolo.

**Fluxo:**
```
1. Pausar loop (loopState.active = false temporariamente)
2. Registrar em workflow-state.json scopeChanges[]:
   { timestamp, description, "removed": [...], "added": [...], "modified": [...] }
3. Gate 1 mini via ask tool:
   ask({ questions: [{ id: "scope-change", question: "Confirmando mudança de escopo...",
     options: [{ label: "Sim, continua com novo escopo" }, { label: "Não, mantém como estava" }, 
              { label: "Quero explicar melhor" }] }] })
4. Se aprovado:
   - Atualizar spec.md com o delta
   - Atualizar feature-list.json
   - Re-plan apenas do delta
   - Retomar loop
5. Trabalho que conflita com o novo escopo: descartar
6. Trabalho que não conflita: manter
```

---

## 16. ReviewDepth — Calibração por Feature

Definido na fase plan, registrado em `workflow-state.json feature.reviewDepth`.

| Nível | Critérios | Review Aplicado |
|-------|-----------|-----------------|
| `simple` | Página estática, formulário básico, componente visual | Camada 0 (local) + LSP + testes unitários |
| `medium` | CRUD, integração API, lógica de negócio | + `/review uncommitted` (1 passada, sem loop fixing) |
| `complex` | Real-time, pagamentos, auth, multi-usuário, dados críticos | + loop fixing mode ativo (max 3 iterações) + spec-checker agent |

**Critérios modificadores (acumulativos):**
- Toca dados de usuário → +1 nível
- Toca dinheiro/pagamento → automático `complex`
- Estado compartilhado (multi-usuário) → +1 nível
- API externa → +1 nível
- Só visual/layout → `simple` (não sobe)

---

## 17. Fluxo Completo de uma Feature (fim-a-fim)

```
OPERADOR                          AGENTE (interno)
   │                               │
   │  "Quero criar app de lista    │
   │   de compras compartilhada"   │
   ├──────────────────────────────►│
   │                               ├─ [init] cria estrutura .pi/
   │                               ├─ captura Product Constitution (answer.ts)
   │                               ├─ gera AGENTS.md (fixa + dinâmica)
   │                               ├─ [specify] product-specify skill
   │                               │    → spec.md
   │                               │    → feature-list.json (passes: false)
   │                               │    → reviewDepth: complex (compartilhado)
   │                               ├─ [clarify] product-clarify skill
   │                               │    → escreve perguntas em prosa
   │                               │
   │  ◄── "Tenho 2 dúvidas: listas │
   │  por categoria ou única?      │
   │  Item some ou fica riscado?"  │
   │                               │
   │  [Ctrl+.] → TUI answer.ts     │
   │  "Lista única. Riscado."      │
   ├──────────────────────────────►│
   │                               ├─ atualiza spec.md
   │                               │
   │  [GATE 1 — ask tool]          │
   │  ◄── "Spec + decisões         │
   │  assumidas. Correto?"         │
   │  ○ Sim  ○ Corrigir ○ Adicionar│
   │                               │
   │  Seleciona "Sim"              │
   ├──────────────────────────────►│
   │                               ├─ gates.specApproved = true
   │                               ├─ [plan] auto-plan skill
   │                               │    → plan.md
   │                               │    → todos criados (todos.ts)
   │                               │    → feature branch criado
   │                               │
   │  [GATE 2 — ask tool]          │
   │  ◄── "Vou construir em        │
   │  2 etapas. Pode começar?"     │
   │  ○ Sim  ○ Ajustar escopo      │
   │                               │
   │  Seleciona "Sim"              │
   ├──────────────────────────────►│
   │                               ├─ gates.buildApproved = true
   │                               ├─ [build] /loop self
   │                               │    ┌─ implementa feature 001
   │                               │    ├─ testa localmente
   │                               │    ├─ passes: true → commit
   │                               │    ├─ implementa feature 002
   │                               │    ├─ testa localmente
   │                               │    ├─ passes: true → commit
   │                               │    └─ signal_loop_success()
   │  ◄── [updates opcionais]      │
   │  "Lista básica pronta (50%)"  │
   │  "Compartilhamento pronto"    │
   │                               ├─ [self_review] /review uncommitted
   │                               │    loop fixing mode (complex)
   │                               │    → corrige P0/P1 encontrados
   │                               │    → veredito: "correct"
   │                               ├─ /end-review (return and summarize)
   │                               ├─ [validation] product-validate skill
   │                               │    → verifica local (interactive-shell + web-browser)
   │                               │    → deploy preview
   │                               │
   │  [GATE 3 — ask tool]          │
   │  ◄── "Pronto! Preview:        │
   │  https://preview...           │
   │  Checklist: [cenários]"       │
   │  ○ Publicar ○ Ajustes ○ Rever │
   │                               │
   │  Seleciona "Publicar"         │
   ├──────────────────────────────►│
   │                               ├─ gates.validationApproved = true
   │                               ├─ [publish] pipeline de release
   │                               │    → merge squash para main
   │                               │    → commit skill
   │                               │    → update-changelog skill
   │                               │    → tag v0.1.0
   │                               │    → deploy produção
   │                               │    → feature-list: passes: true
   │                               │    → progress.md atualizado
   │                               │
   │  ◄── "Publicado! 🎉           │
   │  https://lista.vercel.app     │
   │  Versão v0.1.0                │
   │  Quer adicionar algo?"        │
```

---

## Apêndice A: Checklist de Verificação Local (Camada 0)

Antes de qualquer deploy ou Gate 3, executar:

```bash
# 1. Iniciar dev server (pi-interactive-shell hands-free)
interactive_shell({ command: "npm run dev", mode: "hands-free", reason: "Dev server" })

# 2. Aguardar server ready
interactive_shell({ sessionId: "...", poll: true })

# 3. Screenshot inicial
surf go "http://localhost:3000" && surf snap

# 4. Navegar pelos cenários da spec
surf go "http://localhost:3000/criar-lista"
surf snap  # evidence screenshot

# 5. Verificar sem erros de console
surf read  # ler conteúdo da página

# 6. Matar server
interactive_shell({ sessionId: "...", kill: true })
```

Se algum cenário falhar: NÃO fazer deploy. Voltar para build.

---

## Apêndice B: Compatibilidade de Versões

| Componente | Versão mínima | Notas |
|---|---|---|
| Pi Coding Agent | `@mariozechner/pi-coding-agent` latest | |
| pi-subagents | npm:pi-subagents latest | |
| pi-model-switch | npm:pi-model-switch latest | |
| pi-interactive-shell | npm:pi-interactive-shell latest | Requer node-pty, Xcode CLI tools no macOS |
| pi-web-access | npm:pi-web-access v0.37.3+ | Requer Pi v0.37.3+ |
| surf-cli | npm:surf-cli latest | Requer extensão Chrome + native host |
| mitsupi | npm:mitsupi latest | Skills: commit, update-changelog, frontend-design, web-browser |
| gh CLI | v2+ | Para review de PRs |
