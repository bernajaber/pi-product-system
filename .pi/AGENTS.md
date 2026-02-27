# Pi Product System — Development

> This is the product creation system itself. Not a product — the tool that builds products.
> When working here, you are improving the system, not using it.

## Repository

- **GitHub**: https://github.com/bernajaber/pi-product-system
- **Local**: `~/pi-product-system-repo/`
- **Installed to**: `~/.pi/agent/` via symlinks (run `./install.sh`)

## What this repo is

A set of skills, extensions, and agents for Pi that enable product creation through natural conversation. The operator describes what to build → the system handles discovery, spec, plan, build, test, review, validate, and publish.

### Architecture (V2)

See `docs/ARCHITECTURE-V2.md` for the complete specification.

**9 skills, each with one input → one output:**

| Skill | Output | Purpose |
|-------|--------|---------|
| `discovery` | `brief.md` | Deep interview → understand what to build |
| `specify` | `spec.md` | Brief → acceptance scenarios |
| `plan` | `plan.md` | Spec → atomic tasks + stack + structure |
| `analyze` | `critique.md` | Sub-agent consistency check + Gate 2 |
| `build` | committed code | Plan → implementation (product-loop governs) |
| `test` | passing tests | Code → verified scenarios (product-loop governs) |
| `review` | clean code | Code → quality check (product-loop sends rubric) |
| `validate` | evidence | Code → browser verification + Gate 3 |
| `publish` | release | Gate 3 → PR + merge + tag + changelog |

**3 gates:** Gate 1 (brief), Gate 2 (plan summary), Gate 3 (verified product)

**2 quality loops:**
- Documents: specify → plan → analyze → [cascade fix] → max 3 cycles
- Code: build → test → review → validate → [scout → surgical fix] → max 3 cycles

### How products are built

Products are NOT built here. Each product gets its own folder and git repo:

```
~/pi-product-system-repo/   ← THIS REPO. The system. Skills, extensions, agents.
~/.pi/agent/                ← Symlinks pointing here. Pi loads them globally.
~/my-product/               ← A PRODUCT. Created by the operator. Has its own git.
```

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Skills | `skills/` | 9 workflow steps (discovery → publish) |
| Extensions | `extensions/` | `/setup` command, `ask` tool for gates |
| Agents | `agents/` | Sub-agents: scout, spec-checker |
| Constitution | `product-constitution.md` | Operator's product principles |
| Guidelines | `REVIEW_GUIDELINES.md` | V2 review severity (P0-P3) |
| Architecture | `docs/ARCHITECTURE-V2.md` | Complete V2 specification |

## Session routine

### Start
1. `git log --oneline -5` — recent changes
2. Read `TODO.md` — next pending task
3. Confirm with operator: "Continuing from [state]. Next: [task]."

### End
1. Update `TODO.md` checkboxes
2. Update `CHANGELOG.md` if user-facing changes were made
3. `git add . && git commit -m "[type]: [summary]"`
4. `git push origin main`
5. Confirm with operator: "Session done. [summary]. Next: [task]."

## Rules

### Editing skills and extensions
- After any change: verify Pi loads without errors
- Symlinks mean changes here take effect immediately — no need to re-run install.sh

### Testing the system
- **Quick check**: `cd /tmp && pi -p "list skills"` — verify skills load
- **Full test**: `mkdir /tmp/pi-test && cd /tmp/pi-test && pi` → run `/setup` → test workflow

### File conventions
- All files in English
- Skills: `skills/<name>/SKILL.md`
- Extensions: `extensions/<name>/index.ts` or `extensions/<name>.ts`
- Agents: `agents/<name>.md`

### What NOT to do
- Do not edit files in `~/.pi/agent/` directly — edit here, symlinks handle the rest
- Do not add Pi config files (settings.json, auth.json) to this repo
- Do not add product code here — this repo is the system, not a product

### Communication
- Always in Portuguese with the operator
- Describe consequences, not implementation
- When proposing changes: explain what the OPERATOR will experience differently
