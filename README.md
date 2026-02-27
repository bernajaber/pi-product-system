# Pi Product System

A product creation system for the [Pi coding agent](https://github.com/badlogic/pi-mono/). Describe what you want to build in natural language → the system handles discovery, specification, planning, building, testing, reviewing, validation, and publishing — with 3 approval gates.

## How it works

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

9 skills, each with one input → one output:

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
skills/           → 9 workflow skills (SKILL.md each)
extensions/       → /setup command + ask tool for gates
agents/           → sub-agents: reviewer, scout, spec-checker
product-constitution.md  → operator's product principles
REVIEW_GUIDELINES.md     → V2 review criteria (P0-P3)
docs/ARCHITECTURE-V2.md  → complete V2 specification
docs/PARA-BERNARDO.md    → non-technical guide for the operator
```

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

## Documentation

- **For the operator** (non-technical): `docs/PARA-BERNARDO.md`
- **Architecture details**: `docs/ARCHITECTURE-V2.md`
- **Implementation plan**: `TODO.md`
