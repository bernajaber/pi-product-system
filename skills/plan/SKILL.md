---
name: plan
description: "Transform an approved spec into a technical plan with atomic tasks, stack choice, and file structure. No operator interaction."
---

# Plan Skill

## ⚠️ LANGUAGE: Write plan.md in ENGLISH. This is an internal document — the operator sees only a product-language summary at Gate 2 (presented by the `analyze` skill).

## What this skill does

ONE thing: create a technical build plan from the spec.

- **Input:** `.pi/specs/<feature>/spec.md`
- **Output:** `.pi/specs/<feature>/plan.md` — atomic tasks + stack + file structure

## What this skill does NOT do

- Does NOT present Gate 2. That's the `analyze` skill's job.
- Does NOT interact with the operator. The plan is internal.
- Does NOT build anything. That's the `build` skill's job.

## Process

### Step 1: Read inputs

1. Read `.pi/specs/<feature>/spec.md` — acceptance scenarios to deliver
2. Read `.pi/engineering-constitution.md` — project-wide technical constraints
3. Read `~/.pi/agent/product-constitution.md` — product principles that affect technical decisions

### Step 2: Choose stack

Choose the most appropriate stack. Prioritize:
1. **Simplicity** — minimal dependencies, if doable in vanilla, don't add a framework
2. **Maturity** — well-documented, battle-tested technologies
3. **Fitness to spec** — the stack should serve the requirements, not the other way around

### Step 3: Define atomic tasks

Each task must be:
- One logical commit (one task = one commit in the `build` skill)
- Independently testable (has a clear "Done when" condition)
- Mapped to at least one acceptance scenario from the spec

Task ordering rules:
- First task produces something visible (even if minimal)
- Each task builds on the previous, always leaving the project in a working state
- Second-to-last task covers polish, empty states, and edge cases
- **Last task is ALWAYS "Write Tests"** (executed by the `test` skill, not `build`)

If a task touches more than 3 files: consider splitting it.

### Step 4: Update REVIEW_GUIDELINES.md

Replace the `<!-- Plan skill updates this section with project-specific rules -->` comment in the project's `REVIEW_GUIDELINES.md` with project-specific technical standards:

- Stack: language, runtime, frameworks used (and what is NOT used)
- Architecture: file organization, naming conventions
- Patterns: preferred patterns (e.g., "no classes, use plain functions")
- Testing: how tests are structured and run
- Build: how to build and serve the project

### Step 5: Create feature branch

```bash
git checkout -b feature/<id>
```

### Step 6: Save plan.md

Save to `.pi/specs/<feature>/plan.md` using the template below.

### Step 7: Update state

Update `workflow-state.json`:
- Set `currentPhase: "analyze"`
- Verify `feature` field is already set (string, e.g., `"shopping-list"` — set by discovery in Step 0)

## plan.md Template

```markdown
# Plan: [feature name]

## What will be built
[Description in product language — what the user will be able to do]

## Stack
- **Runtime**: [e.g., Browser-only, Node.js, etc.]
- **Language**: [e.g., TypeScript, vanilla JS, Python]
- **Framework**: [e.g., None, React, Vue, etc.]
- **Justification**: [Why this stack fits the spec — 1-2 sentences]

## File Structure
```
project-root/
├── [file/folder] — [purpose]
├── [file/folder] — [purpose]
└── ...
```

## Build Tasks (atomic, ordered)

### Task 1: [short title]
- **What**: [what gets built/changed]
- **Files**: [which files are created/modified]
- **Done when**: [specific testable condition]
- **Scenarios covered**: [which acceptance scenarios from spec]

### Task 2: [short title]
[...]

### Task N: Write automated tests
- **What**: Create test files covering all acceptance scenarios from the spec
- **Files**: `tests/<feature>.test.js` (or equivalent for the chosen stack)
- **Done when**: Tests exit with code 0
- **Scenarios covered**: All acceptance scenarios

## Review Depth: [simple|medium|complex]
Justification: [1-sentence reason]

## Risks
- [What could complicate things and what to do if it happens]
- If none: "No significant risks — scope is small and well-defined."
```

## Quality rules for tasks

- Each task MUST have a "Done when" condition that's objectively testable
- Each task MUST map to at least one acceptance scenario
- Tasks should be ordered so each one produces a working (if incomplete) state
- The "Write Tests" task must specify what tests to write and how to run them

## Rules

- Do NOT present Gate 2. The `analyze` skill handles that after verifying the plan.
- Do NOT mention Gate 2 in the plan document. It's a technical artifact.
- Do NOT interact with the operator. If the spec is unclear, flag it for the analyze loop.
- Do NOT use the `interview` tool or the `ask` tool. This skill has no operator interaction.
