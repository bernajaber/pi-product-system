---
name: analyze
description: "Sub-agent review of brief, spec, and plan for consistency and completeness. Produces critique.md, sets reviewDepth, and presents Gate 2."
---

# Analyze Skill

## ⚠️ LANGUAGE: critique.md in ENGLISH. Gate 2 presentation to operator in PORTUGUESE. Zero technology in Gate 2 — ever.

## What this skill does

ONE thing: verify that the documents are consistent, complete, and aligned with the operator's principles.

- **Input:** `brief.md` + `spec.md` + `plan.md` + constitutions (product + engineering + review guidelines)
- **Output:** `.pi/specs/<feature>/critique.md` — internal document with classified issues + reviewDepth

## How it works

The analyze runs as a **sub-agent without conversation context**. It reads ONLY the documents — it has no access to the chat history between you and the operator. This removes the bias of having created the documents yourself.

Use `pi-subagents` to launch the `spec-checker` agent with the documents as input.

## Process

### Step 1: Gather documents

Read all of these:
- `.pi/specs/<feature>/brief.md` — what the operator wants
- `.pi/specs/<feature>/spec.md` — acceptance scenarios
- `.pi/specs/<feature>/plan.md` — build tasks
- `~/.pi/agent/product-constitution.md` — operator's product principles
- `.pi/engineering-constitution.md` — project technical standards
- `~/.pi/agent/REVIEW_GUIDELINES.md` — quality criteria

### Step 2: Launch sub-agent

Use the `spec-checker` agent via the `subagent` tool:

```
subagent({
  agent: "spec-checker",
  task: "Review these documents for consistency and completeness:\n\n[paste brief.md, spec.md, plan.md, and constitution contents]"
})
```

Pass ALL documents as context in the task. The sub-agent checks:

1. **Brief → Spec coverage:** Does the spec cover ALL aspects of the brief? Missing scenarios?
2. **Spec → Plan coverage:** Does the plan deliver ALL acceptance scenarios? Any gaps?
3. **Cross-document consistency:** Any contradictions between brief, spec, and plan?
4. **Risk identification:** Technical or product risks that should be addressed before build?
5. **Philosophy alignment:** Does what's being built violate any Product Constitution principle?

### Step 3: Classify issues

Each issue found MUST be classified as one of:

- **`spec-problem`** — the spec doesn't cover something from the brief, or has a contradiction with the brief. Consequence: `specify` re-runs, then `plan` re-runs (because plan derives from spec).
- **`plan-problem`** — the plan doesn't deliver a spec scenario, or has a technical gap. Consequence: ONLY `plan` re-runs. Spec stays intact.

**No ambiguous classification.** Every issue is one or the other. If you can't decide, default to `spec-problem` (more conservative — triggers both re-runs).

### Step 4: Determine reviewDepth

Based on the three documents, classify the project complexity:

| Depth | Criteria |
|-------|----------|
| `simple` | Local-only, no integrations, no critical data, 1-3 scenarios |
| `medium` | CRUD with backend, API integrations, moderate business logic |
| `complex` | Real-time, payments, authentication, multi-user, critical data |

**Modifiers:**
- Touches user data → +1 level
- Touches money → automatically `complex`
- External API → +1 level

### Step 5: Write critique.md

Save to `.pi/specs/<feature>/critique.md`. This is an internal artifact — never shown directly to the operator.

```markdown
# Critique: [feature name]

## Review Depth: [simple|medium|complex]
Justification: [1 sentence]

## Issues Found

### Issue 1: [short title]
- **Type:** spec-problem | plan-problem
- **Document:** [which document has the problem]
- **Description:** [what's wrong]
- **Impact:** [what happens if not fixed]
- **Suggested fix:** [how to fix it]

### Issue 2: [...]
[...]

## No Issues
[If everything is clean: "All documents are consistent and complete. No issues found."]
```

### Step 6: Handle the loop

**If issues were found:**
1. Update `workflow-state.json`: increment `analyzeLoop.cycle`, set `lastIssueType` and `lastIssueSummary`
2. If `spec-problem` → re-run `specify` skill, then re-run `plan` skill, then `analyze` again
3. If `plan-problem` → re-run ONLY `plan` skill, then `analyze` again
4. If mixed → treat as `spec-problem` (re-run both)
5. **Max 3 cycles.** If still issues after 3 → escalate to operator (see Escalation below)

**If no issues (clean):**
1. Proceed to Gate 2 presentation (keep `currentPhase: "analyze"` — it transitions to `"build"` on Gate 2 approval)

### Step 7: Present Gate 2

Present to the operator in Portuguese. The operator sees:

1. **Build summary:** "Vou construir em N etapas."
   - "Etapa 1: [what will work — in product language]"
   - "Etapa 2: [what gets added]"
   - "Etapa N: [complete experience]"

2. **Analyze result** (one of):
   - "O planejamento passou pela análise interna sem problemas." (if clean on first pass)
   - "Durante o planejamento, identifiquei que [issue in product language] e já corrigi." (if fixed)

3. Use the `ask` tool:

```
questions: [{
  id: "gate2",
  question: "Posso começar a construir?",
  options: [
    { label: "Sim, pode começar!" },
    { label: "Quero ajustar o escopo antes" }
  ],
  recommended: 0
}]
```

**Gate 2 rules:**
- ZERO mention of technology, framework, stack, or file structure. NEVER.
- Describe etapas by what the USER will be able to DO, not what will be coded
- The operator does NOT see plan.md, critique.md, or any technical artifact

**On approval:** Update `workflow-state.json`: set `gates.planApproved: true`, `currentPhase: "build"`.

## Escalation (after 3 cycles)

If the analyze loop doesn't resolve after 3 cycles:

```
questions: [{
  id: "analyze-escalation",
  question: "Tentei 3 vezes alinhar o plano com o que você descreveu, mas não consegui resolver: [issue in product language]. O que prefere?",
  options: [
    { label: "Simplificar — tirar o que está conflitando" },
    { label: "Repensar o produto desde o início" },
    { label: "Aceitar como está e seguir em frente" }
  ]
}]
```

The message ALWAYS describes the consequence for the user, never the technical problem.

## Rules

- The sub-agent has NO access to conversation history. It reads only documents.
- critique.md is never deleted (transparency) but never shown directly to the operator.
- Gate 2 is a PRODUCT conversation. If you catch yourself typing a framework name, stop and rephrase.
- Do NOT use the `interview` tool. Use the `ask` tool for Gate 2 only.
