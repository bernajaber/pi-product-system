# Pi Product System

A product creation system for the [Pi coding agent](https://github.com/badlogic/pi-mono/). Describe what you want to build in natural language → the system handles discovery, specification, planning, building, testing, reviewing, validation, and publishing — with 3 approval gates.

## How it works

**Greenfield** — new product from scratch:

```
You: "Quero criar um app de lista de compras compartilhado"

→ Discovery (deep interview — no round limit)
→ Gate 1: "Entendi o que você quer?" (you see brief.md, < 1 page)
→ Specify + Plan + Analyze loop (internal, automatic)
→ Gate 2: "Posso começar a construir?" (you see plan summary, zero tech)
→ Build + Test + Review + Validate (autonomous)
→ Gate 3: "Funcionou?" (you see product + screenshots + checklist)
→ Publish (PR + merge + tag + changelog)
```

You make 3 decisions. The system does everything else.

**Brownfield** — stabilize an existing broken project:

```
You: /janitor

→ Scan (auto-detects stack, runs build + tests, counts errors)
→ Plan (LLM analyzes ALL errors, groups by root cause, creates plan)
→ Execute (one step at a time, extension verifies after each)
→ Verify (final build + test check)
→ Triage (report of what's left for the product system)
```

Then `/setup` to start building features on a stable foundation.

## Install

```bash
git clone https://github.com/bernajaber/pi-product-system.git ~/pi-product-system-repo
cd ~/pi-product-system-repo
./install.sh
```

This creates symlinks from the repo to `~/.pi/agent/` — Pi loads them globally.

## Usage

```bash
mkdir ~/my-product
cd ~/my-product
pi
```

Then type `/setup`. The system initializes and asks: "O que você quer construir?"

## Architecture (V2)

9 product skills + 1 stabilization skill, each with one input → one output:

| Skill | Output | What it does |
|-------|--------|-------------|
| `discovery` | `brief.md` | Deep interview → understand what to build |
| `specify` | `spec.md` | Brief → acceptance scenarios (internal) |
| `plan` | `plan.md` | Spec → atomic tasks + stack (internal) |
| `analyze` | `critique.md` | Sub-agent consistency check → Gate 2 |
| `build` | committed code | Plan → implementation, one task per commit |
| `test` | passing tests | Code → verified acceptance scenarios |
| `review` | clean code | Code → quality check (UX, visual, constitution) |
| `validate` | evidence | Browser verification → screenshots → Gate 3 |
| `publish` | release | PR + merge + tag + changelog + reset |
| `janitor` | stable build | Broken codebase → compiles, tests pass |

### Quality loops

**Document loop** (max 3 cycles): specify → plan → analyze → [issues?] → cascade fix
- `spec-problem` → specify + plan re-run
- `plan-problem` → only plan re-runs

**Code loop** (max 3 cycles): build → test → review → validate → [fail?] → scout diagnoses → surgical fix

### Gates

| Gate | After | You see | You decide |
|------|-------|---------|-----------|
| Gate 1 | Discovery | `brief.md` (< 1 page) | "Entendeu o que quero?" |
| Gate 2 | Analyze loop | Plan summary in PT (zero tech) | "Vai construir certo?" |
| Gate 3 | Validate | Product + screenshots + checklist | "Funcionou?" |

## Repo structure

```
skills/           → 9 product skills + janitor (SKILL.md / GUIDE.md)
extensions/       → product-loop, /setup, ask tool, /janitor
agents/           → sub-agents: scout, spec-checker
product-constitution.md  → operator's product principles
REVIEW_GUIDELINES.md     → V2 review criteria (P0-P3)
docs/ARCHITECTURE-V2.md  → complete V2 specification
docs/PARA-BERNARDO.md    → non-technical guide for the operator
```

## Janitor (`/janitor`)

The janitor stabilizes broken or messy codebases so the product system can take over.

**How it works:**

1. **Scan** — detects stack (Rust, Node, Go, Python, Java, C/C++, Swift), runs build + tests
2. **Plan** — LLM reads ALL build output, identifies root causes, creates `janitor-plan.md` with Impact lines
3. **Execute** — one step at a time; extension verifies after each step (errors must decrease for `fix`, can't increase for `clean`/`organize`)
4. **Verify** — final build + test check; if issues remain, new cycle (max 3)
5. **Triage** — LLM writes `janitor-triage.md` with remaining concerns for the product system

**Design principles:**

- **Extension = mechanics** (run build, count errors, verify progress)
- **LLM = understanding** (extract errors, identify root causes, write fixes)
- The extension never trusts the agent's "I'm done" — it runs the build and checks
- Plan coverage validation: rejects plans that don't account for ≥70% of errors
- Separate from product-loop — different concern, different lifecycle, different state
- Won't start if product-loop is active (conflict prevention)

## Design principles

From `product-constitution.md`:

1. **Do one thing well** — each skill has one input, one output, one responsibility
2. **Pixel perfect design** — no "good enough" in design
3. **Fast or feels fast** — immediate feedback on every action
4. **Zero visible bugs** — edge cases handled before Gate 3
5. **Radical simplicity** — less is more
6. **Extensible, not configurable** — grows by extension
7. **Local and transparent** — no black boxes

## Uninstall

```bash
cd ~/pi-product-system-repo
./uninstall.sh
```

Removes all symlinks. Pi works normally without the product system.

## Testing

### Unit tests (85 tests, ~2 seconds)

Tests the logic of all 4 extensions with mocks — no pi session needed.

```bash
cd ~/pi-product-system-repo
node --experimental-strip-types test/test-janitor.ts        # 48 tests
node --experimental-strip-types test/test-product-loop.ts   # 23 tests
node --experimental-strip-types test/test-product-setup.ts  # 8 tests
node --experimental-strip-types test/test-ask-tool.ts       # 6 tests
```

Requires Node.js v22+ (for `--experimental-strip-types`).

### Integration test (9 checks, ~4 minutes)

Tests the full pipeline in a real pi session — proves the product-loop drives autonomous phases.

**What it does:** Creates a pre-seeded "Hello World" project at build phase, launches pi via `interactive_shell` dispatch mode with `PI_AUTO_TEST=true`, and lets the product-loop drive the agent through build → test → review → validate → Gate 3 → publish. No manual interaction needed.

**Step 1 — Create the fixture:**

```bash
cd ~/pi-product-system-repo
bash test/integration/setup-hello-world.sh /tmp/test-product-loop
```

**Step 2 — Launch pi (from inside a pi session):**

```
interactive_shell({
  command: 'PI_AUTO_TEST=true pi "Read .pi/AGENTS.md for the workflow. Read .pi/workflow-state.json for current state. You are in the build phase with Gate 2 approved. Start implementing according to the build skill."',
  mode: "dispatch",
  cwd: "/tmp/test-product-loop",
  name: "integration-test",
  handsFree: { autoExitOnQuiet: true, quietThreshold: 90000, gracePeriod: 45000 },
  timeout: 480000
})
```

**Step 3 — Verify (after the session completes):**

```bash
bash test/integration/verify-hello-world.sh /tmp/test-product-loop
```

Expected: `🎉 INTEGRATION TEST PASSED` — 9/9 checks, final phase "publish".

See `test/integration/README.md` for full details.

## Documentation

- **For the operator** (non-technical): `docs/PARA-BERNARDO.md`
- **Architecture details**: `docs/ARCHITECTURE-V2.md`
- **Implementation plan**: `TODO.md`
- **Testing details**: `test/integration/README.md`
