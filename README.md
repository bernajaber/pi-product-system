# Pi Product System

A product creation system for [Pi coding agent](https://github.com/badlogic/pi-mono/). Describe what you want to build in natural language — the system handles specification, planning, building, reviewing, and publishing.

## Philosophy

Built on three principles, inspired by [Pi](https://github.com/badlogic/pi-mono/) and [NanoClaw](https://github.com/nicobailon/nanoclaw):

1. **Do one thing well** — every feature needs a clear reason to exist
2. **Extensible, not configurable** — files and skills, not settings menus
3. **Local and transparent** — no black boxes, no tracking, user controls their data

The full philosophy is in [product-constitution.md](product-constitution.md).

## How It Works

```
/setup              → initializes the project (git, AGENTS.md, engineering standards)
                    → asks: "What do you want to build?"
                    
Gate 1: Spec        → researches references, writes structured spec, asks for approval
Gate 2: Plan        → creates atomic build plan, asks for approval
Gate 3: Build       → implements task by task, commits after each, self-reviews
Gate 4: Validate    → verifies with screenshots, presents checklist, asks for approval
```

The operator communicates in Portuguese. All artifacts are in English.

## Install

```bash
git clone https://github.com/bernajaber/pi-product-system.git
cd pi-product-system
./install.sh
```

### What `install.sh` does

Creates symlinks from this repo to `~/.pi/agent/`:

```
~/.pi/agent/
├── skills/
│   ├── product-specify → repo/skills/product-specify
│   ├── auto-plan       → repo/skills/auto-plan
│   ├── build-loop      → repo/skills/build-loop
│   ├── product-validate→ repo/skills/product-validate
│   ├── product-clarify → repo/skills/product-clarify
│   └── auto-publish    → repo/skills/auto-publish
├── extensions/
│   ├── product-setup   → repo/extensions/product-setup
│   └── ask-tool.ts     → repo/extensions/ask-tool.ts
├── agents/
│   ├── reviewer.md     → repo/agents/reviewer.md
│   ├── scout.md        → repo/agents/scout.md
│   └── spec-checker.md → repo/agents/spec-checker.md
├── product-constitution.md → repo/product-constitution.md
└── REVIEW_GUIDELINES.md    → repo/REVIEW_GUIDELINES.md
```

Symlinks mean: edit in the repo, changes take effect immediately.

## Usage

### New product

```bash
mkdir ~/my-product
cd ~/my-product
pi
```

Inside Pi:
```
/setup
```

Then describe what you want to build.

### Existing product

If the project already has `.pi/AGENTS.md` from a previous `/setup`, just open Pi and continue working. The workflow state is in `.pi/workflow-state.json`.

## Structure

```
pi-product-system/
├── skills/                     # Pi skills (loaded on demand)
│   ├── product-specify/        # Gate 1: natural language → structured spec
│   ├── auto-plan/              # Gate 2: spec → atomic build plan
│   ├── build-loop/             # Gate 3: plan → code + self-review
│   ├── product-validate/       # Gate 4: code → verified checklist
│   ├── product-clarify/        # Clarification questions (used by specify)
│   └── auto-publish/           # Post-approval: branch → PR → merge
├── extensions/                 # Pi extensions (always loaded)
│   ├── product-setup/          # /setup command — initializes a project
│   └── ask-tool.ts             # Interactive approval gates (ctx.ui.select)
├── agents/                     # Subagent definitions
│   ├── reviewer.md             # Code review agent
│   ├── scout.md                # Debugging/diagnostic agent
│   └── spec-checker.md         # Spec compliance agent
├── docs/                       # Documentation
│   └── WORKFLOW-SPEC.md        # Full technical specification
├── product-constitution.md     # Operator's product principles
├── REVIEW_GUIDELINES.md        # Code review standards
├── TODO.md                     # What's left to build
├── PROGRESS.md                 # Session history
├── CHANGELOG.md                # Release history
├── install.sh                  # Symlink installer
└── uninstall.sh                # Clean removal
```

## Key Files

| File | Purpose |
|------|---------|
| [product-constitution.md](product-constitution.md) | Who the operator is and what they value — read by the agent every session |
| [REVIEW_GUIDELINES.md](REVIEW_GUIDELINES.md) | Standards for code review (P0/P1/P2 severity) |
| [TODO.md](TODO.md) | Implementation roadmap with checkboxes |
| [PROGRESS.md](PROGRESS.md) | Detailed session-by-session history |

## Requirements

- [Pi coding agent](https://github.com/badlogic/pi-mono/) v0.20+
- Node.js 20+
- Git

## License

MIT
