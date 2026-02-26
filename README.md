# Pi Product System

A product creation system for [Pi coding agent](https://github.com/badlogic/pi-mono/). Describe what you want to build in natural language — the system handles specification, planning, building, reviewing, and publishing.

## Philosophy

Built on three principles, inspired by [Pi](https://github.com/badlogic/pi-mono/) and [NanoClaw](https://github.com/nicobailon/nanoclaw):

1. **Do one thing well** — every feature needs a clear reason to exist
2. **Extensible, not configurable** — files and skills, not settings menus
3. **Local and transparent** — no black boxes, no tracking, user controls their data

The full philosophy is in [product-constitution.md](product-constitution.md).

## Install

```bash
git clone https://github.com/bernajaber/pi-product-system.git
cd pi-product-system
./install.sh
```

This creates symlinks from the repo to `~/.pi/agent/`. Edit files in the repo — changes take effect immediately in Pi.

To remove: `./uninstall.sh`

## Usage

```bash
mkdir ~/my-product
cd ~/my-product
pi
```

Inside Pi, type `/setup`. The system initializes the project and asks what you want to build.

---

## The Workflow

### Step 0: Setup (`/setup` command)

The `/setup` extension runs deterministically (no LLM interpretation):

1. Initializes git if not present
2. Creates `.pi/AGENTS.md` — the workflow the agent must follow
3. Creates `.pi/engineering-constitution.md` — technical standards
4. Creates `.pi/workflow-state.json` — tracks current phase
5. Makes initial commit
6. Asks the operator: "What do you want to build?"

### Step 1: Research

When the operator describes what to build, the agent **researches first** before writing anything.

- If a design reference is mentioned (e.g., "inspired by stephango.com"), the agent fetches it, takes screenshots, studies the design patterns
- If the domain is unfamiliar, the agent researches existing solutions
- Findings are shown to the operator before proceeding

Skill: [`product-specify`](skills/product-specify/SKILL.md) (Step 1)

### Step 2: Clarify

The agent asks 3-5 questions about **product behavior** (never technology) in Portuguese. This is mandatory — the agent cannot skip to writing the spec without understanding what the operator wants.

Examples of good questions:
- "When an item is marked as purchased, should it disappear or stay crossed out?"
- "Should the blog have an About page, or just posts?"

Examples of questions the agent will NOT ask:
- "Should I use React or vanilla JS?"
- "Do you prefer localStorage or a database?"

The agent waits for answers before proceeding.

Skills: [`product-clarify`](skills/product-clarify/SKILL.md), [`product-specify`](skills/product-specify/SKILL.md) (Step 2)

### Step 3: Spec — Gate 1

Based on research + operator's answers, the agent writes a structured spec:

- Description of what gets built
- Design reference findings
- Acceptance scenarios (testable, in product language)
- Assumed decisions (what the agent decided without asking, with justification)
- Constraints (what's NOT in scope)
- Review depth classification (simple / medium / complex)

The spec is saved to `.pi/specs/<id>/spec.md` and presented to the operator via the **ask tool** (interactive selection):

- "Aprovado! Pode construir assim"
- "Quase, mas quero ajustar algumas coisas"
- "Não é isso, vamos repensar"

Skill: [`product-specify`](skills/product-specify/SKILL.md) (Step 3)

### Step 4: Plan — Gate 2

The agent transforms the approved spec into an atomic build plan:

- Stack choice with justification
- File structure
- Ordered tasks — each one produces a working (if incomplete) state
- Each task maps to acceptance scenarios from the spec
- Last task is always "Write tests" (mandatory)
- Risks identified

Presented to the operator in product language ("I'll build in N steps. First step: [what works]. Final step: [complete experience]"). No technology mentioned.

Approval via ask tool:

- "Aprovado! Pode começar a construir"
- "Quero ajustar a ordem ou o que entra primeiro"
- "Voltar e repensar o que vai ser feito"

Skill: [`auto-plan`](skills/auto-plan/SKILL.md)

### Step 5: Build — Gate 3

The agent implements the plan task by task:

- **One task = one commit** (atomic, conventional commit messages)
- After each task: verify it works, commit, move to next
- Visual verification using `surf` (screenshots) for UI projects

When all tasks are done, the agent enters **self-review**.

Skill: [`build-loop`](skills/build-loop/SKILL.md)

### Step 6: Self-Review

Before showing anything to the operator, the agent reviews its own work:

1. Runs `/review` against the [Review Guidelines](REVIEW_GUIDELINES.md)
2. Issues classified by severity:
   - **P0 (Critical)**: blocks usage, data loss, security — must fix
   - **P1 (Major)**: significant quality issue — should fix
   - **P2 (Minor)**: polish, style — fix if time allows
3. If P0/P1 found: fix and re-review (max 3 cycles)
4. If still failing after 3 cycles: escalate to operator

Subagents available for difficult problems:
- **[reviewer](agents/reviewer.md)** — fresh-eyes code review
- **[scout](agents/scout.md)** — debugging and diagnostics
- **[spec-checker](agents/spec-checker.md)** — verifies code matches spec

Skill: [`build-loop`](skills/build-loop/SKILL.md) (Phase 2)

### Step 7: Validate — Gate 4

The agent verifies the build against every acceptance scenario:

1. Opens the app (via `surf` for visual, `curl` for API)
2. Walks through each scenario from the spec
3. Takes screenshots as evidence
4. Builds a checklist: PASS or FAIL per scenario
5. If any FAIL: goes back to build, does not present Gate 4

Presented to the operator with the checklist and test instructions:

- "Tudo certo, pode publicar"
- "Preciso de ajustes (vou descrever)"
- "Não é isso, preciso repensar"

Skill: [`product-validate`](skills/product-validate/SKILL.md)

### Step 8: Publish (optional)

After Gate 4 approval:

1. Creates PR from feature branch to main
2. Reviews the PR
3. Merges (squash)
4. Updates version and changelog
5. Deploys (if CI/CD configured)

Skill: [`auto-publish`](skills/auto-publish/SKILL.md)

---

## Failure Handling

The build-loop tracks failures and escalates automatically:

| Failures | Action |
|----------|--------|
| 1-2 | Retry with different approach |
| 3 | Launch scout agent for diagnosis |
| 5 | Switch to heavier model + ask operator |
| 7 | Partial delivery: ship what works, document what's missing |

---

## Interactive Approvals (ask tool)

All gates use the `ask` tool — a Pi extension that presents options via `ctx.ui.select()` (native Pi UI). The operator selects an option or writes a custom response.

No forms, no wizards, no external tools. Just a clean selection in the terminal.

Extension: [`ask-tool.ts`](extensions/ask-tool.ts)

---

## Product Constitution

The [Product Constitution](product-constitution.md) defines who the operator is and what they value. The agent reads it at the start of every session. It governs all product decisions.

Core principles:
1. **Do one thing well** (non-negotiable)
2. **Pixel perfect design** (non-negotiable)
3. **Fast or feels fast** (non-negotiable)
4. **Zero visible bugs** (non-negotiable)
5. **Radical simplicity**
6. **Extensible, not configurable**
7. **Local and transparent**

---

## Engineering Constitution

Created per-project by `/setup`. Technical translation of the product principles into actionable standards:

- Visual: mobile-first, 4/8px spacing, typography hierarchy, 44px touch targets
- Performance: < 1.5s first paint, < 100ms feedback, loading states
- Quality: test all scenarios, handle edge cases, zero console errors
- Architecture: minimal dependencies, no premature abstraction
- Data: local first, exportable, no tracking
- Process: conventional commits, mandatory tests, trunk-based development

---

## Review Guidelines

The [Review Guidelines](REVIEW_GUIDELINES.md) define severity levels for code review:

- **P0 (Critical)**: security vulnerabilities, data loss, crashes, broken core functionality
- **P1 (Major)**: significant UX issues, missing error handling, performance problems
- **P2 (Minor)**: code style, naming, minor polish

P0 and P1 must be fixed before Gate 4. P2 is fix-if-time-allows.

---

## Structure

```
pi-product-system/
├── skills/                     # Pi skills (loaded on demand)
│   ├── product-specify/        # Research + clarify + spec + Gate 1
│   ├── product-clarify/        # Behavioral clarification questions
│   ├── auto-plan/              # Spec → atomic build plan + Gate 2
│   ├── build-loop/             # Build + self-review + Gate 3
│   ├── product-validate/       # Verify + checklist + Gate 4
│   └── auto-publish/           # Branch → PR → merge → deploy
├── extensions/                 # Pi extensions (always loaded)
│   ├── product-setup/          # /setup command — deterministic project init
│   └── ask-tool.ts             # Interactive gate approvals (ctx.ui.select)
├── agents/                     # Subagent definitions
│   ├── reviewer.md             # Fresh-eyes code review
│   ├── scout.md                # Debugging and diagnostics
│   └── spec-checker.md         # Spec compliance verification
├── docs/                       # Documentation
│   ├── WORKFLOW-SPEC.md        # Full technical specification
│   └── PARA-BERNARDO.md        # System explained for the operator (Portuguese)
├── product-constitution.md     # Operator's product principles
├── REVIEW_GUIDELINES.md        # Code review severity standards
├── TODO.md                     # Implementation roadmap
├── PROGRESS.md                 # Session-by-session history
├── CHANGELOG.md                # Release history
├── install.sh                  # Symlink installer
└── uninstall.sh                # Clean removal
```

## Requirements

- [Pi coding agent](https://github.com/badlogic/pi-mono/) v0.20+
- Node.js 20+
- Git

## License

MIT
