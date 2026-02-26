---
name: auto-plan
description: "Transform an approved spec into a technical plan with atomic tasks, stack choice, and file structure. No operator interaction needed."
---

# Auto-Plan Skill

## ⚠️ LANGUAGE: Write the plan in ENGLISH. All artifacts (plan.md, todos, commit messages) must be in English. Only Gate 2 presentation to the operator is in Portuguese.

## Process

1. Read the approved spec (`.pi/specs/<feature>/spec.md`)
2. Read `.pi/engineering-constitution.md` if it exists (project-wide tech constraints)
3. Choose the most appropriate stack (prioritize: simplicity, maturity, fitness to spec)
4. Define atomic tasks (each task = 1 logical commit = 1 testable increment)
5. Create todos using the todo tool for internal tracking
6. Set final reviewDepth (may adjust from spec with more technical context)
7. Create feature branch: `git checkout -b feature/<id>`
8. Save the plan to `.pi/specs/<feature>/plan.md`
9. **Update `workflow-state.json`**: set `feature.id`, `feature.name`, `feature.branch`, `currentPhase: "plan"`

## Plan Template

```markdown
# Plan: [feature name]

## What will be built
[Description in product language — what the user will be able to do]

## Stack
- **Runtime**: [e.g., Browser-only, Node.js, etc.]
- **Language**: [e.g., TypeScript, vanilla JS, Python]
- **Framework**: [e.g., None, React, Vue, etc.]
- **Justification**: [Why this stack fits the spec — in 1-2 sentences]

## File Structure
```
project-root/
├── [file/folder] — [what it contains / purpose]
├── [file/folder] — [what it contains / purpose]
└── ...
```

## Build Tasks (atomic, ordered)

### Task 1: [short title]
- **What**: [what gets built/changed]
- **Files**: [which files are created/modified]
- **Done when**: [specific testable condition]
- **Scenarios covered**: [which acceptance scenarios from spec]

### Task 2: [short title]
- **What**: [...]
- **Files**: [...]
- **Done when**: [...]
- **Scenarios covered**: [...]

[...continue for all tasks]

## Review Depth: [simple|medium|complex]
Justification: [1-sentence reason]

## Risks
- [What could complicate things and what to do if it happens]
- If none: "No significant risks — scope is small and well-defined."
```

## Quality Rules for Tasks

- Each task MUST have a "Done when" condition that's objectively testable
- Each task MUST map to at least one acceptance scenario from the spec
- Tasks should be ordered so each one produces a working (if incomplete) state
- First task should produce something visible (even if minimal)
- Second-to-last task should cover polish, empty states, and edge cases
- If a task touches more than 3 files: consider splitting it

## ⚠️ MANDATORY: Final Task Must Be "Write Tests"

The LAST task in every plan MUST be writing automated tests. No exceptions.

This task should:
1. Create test files in `tests/` directory
2. Cover ALL acceptance scenarios from the spec
3. Each test uses Node.js `assert` — no external test framework needed
4. Each test file must exit with code 0 on success, non-zero on failure
5. Tests run via `node tests/<file>.js`

Example test task in plan:

```markdown
### Task N: Write automated tests
- **What**: Create test files covering all acceptance scenarios from the spec
- **Files**: `tests/<feature>.test.js` (create)
- **Done when**: `node tests/<feature>.test.js` exits with code 0
- **Scenarios covered**: All acceptance scenarios
```

For static HTML/JS apps: tests can use a headless approach (parse the HTML, simulate clicks via JS, assert DOM state). For apps with logic: test the logic functions directly.

If the app is purely visual with no testable logic (e.g., a static landing page), the test task should at minimum validate that the HTML files exist, are well-formed, and contain expected content.

## Gate 2 Presentation (in Portuguese to operator)

Present to the operator in product language:
1. "Vou construir em [N] etapas"
2. "Na primeira etapa: [what will work]"
3. "No final: [complete experience]"
4. DO NOT mention technology, database, framework, or programming language
5. Ask the operator directly in Portuguese for approval:
   - "✅ Aprovado! Pode começar a construir"
   - "🔧 Quero ajustar a ordem ou o que entra primeiro"
   - "❌ Voltar e repensar o que vai ser feito"

Use the `ask` tool to present options to the operator. Do NOT use the `interview` tool or any other form/wizard.
