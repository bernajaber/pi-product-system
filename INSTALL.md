# Pi Product System — Installation Guide

> **For LLM Agents**: Fetch this file and follow the steps below.
> ```bash
> curl -s https://raw.githubusercontent.com/bernajaber/pi-product-system/main/INSTALL.md
> ```

## What this installs

The Pi Product System — a workflow that guides product creation from discovery to ship.
It adds skills (`/setup`, `/janitor`), extensions, and agents to the **current project only**.

## Step 1: Clone the repo (temp)

```bash
TMPDIR=$(mktemp -d)
git clone --depth 1 https://github.com/bernajaber/pi-product-system.git "$TMPDIR/pi-product-system"
```

## Step 2: Run the local installer

```bash
bash "$TMPDIR/pi-product-system/install.sh"
```

This copies all skills, extensions, agents, and config files to `.pi/` in the current directory.

## Step 3: Verify

After installation, these commands should be available:
- `/setup` — Initialize the product creation workflow
- `/janitor` — Stabilize a broken codebase

## Step 4: Clean up

```bash
rm -rf "$TMPDIR"
```

## Step 5: Start building

```
/setup
```

The agent will ask what you want to build and guide you through the full product workflow:
discovery → specify → plan → analyze → build → test → review → validate → publish.

## What gets installed

```
.pi/
├── skills/
│   ├── discovery/SKILL.md    — Deep interview, produces brief.md
│   ├── specify/SKILL.md      — Acceptance scenarios from brief
│   ├── plan/SKILL.md         — Technical plan with atomic tasks
│   ├── analyze/SKILL.md      — Sub-agent reviews brief+spec+plan
│   ├── build/SKILL.md        — One task = one commit
│   ├── test/SKILL.md         — Automated tests for all scenarios
│   ├── review/SKILL.md       — Self-review (UX, visual, constitution)
│   ├── validate/SKILL.md     — Visual verification with screenshots
│   ├── publish/SKILL.md      — PR + merge + tag + changelog
│   └── janitor/GUIDE.md      — Codebase stabilizer instructions
├── extensions/
│   ├── product-setup/index.ts — /setup command
│   ├── product-loop.ts       — Autonomous workflow governor
│   ├── ask-tool.ts           — Gate approval tool
│   └── janitor.ts            — /janitor command + verification loop
├── agents/
│   ├── scout.md              — Diagnoses failed scenarios
│   └── spec-checker.md       — Validates doc consistency
├── product-constitution.md   — Product principles
└── REVIEW_GUIDELINES.md      — Code review rubric
```

## Uninstall

```bash
# From the project directory:
bash .pi/uninstall-product-system.sh
```

Or manually remove the files listed above from `.pi/`.

## Requirements

- [Pi coding agent](https://github.com/badlogic/pi-mono) (v0.54+)
- Node.js v22+ (for native TypeScript execution)
- Git
