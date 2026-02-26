# Pi Product System — Development

> This is the product creation system itself. Not a product — the tool that builds products.
> When working here, you are improving the system, not using it.

## Repository

- **GitHub**: https://github.com/bernajaber/pi-product-system
- **Local**: `~/pi-product-system-repo/`
- **Installed to**: `~/.pi/agent/` via symlinks (run `./install.sh`)

## What this repo is

A set of skills, extensions, and agents for Pi that enable product creation through natural conversation. The operator describes what to build → the system handles spec, plan, build, review, and publish.

### How the system builds products

Products are NOT built here. Each product gets its own folder and git repo:

```
~/pi-product-system-repo/   ← THIS REPO. The system. Skills, extensions, agents.
~/.pi/agent/                ← Symlinks pointing here. Pi loads them globally.
~/my-product/               ← A PRODUCT. Created by the operator. Has its own git.
~/another-product/          ← Another product. Independent.
```

The workflow for building a product:
1. Operator creates a folder: `mkdir ~/my-product && cd ~/my-product`
2. Opens Pi: `pi`
3. Types `/setup` → deterministic extension initializes git, AGENTS.md, engineering standards
4. Describes what to build → agent follows: research → clarify → spec (Gate 1) → plan (Gate 2) → build (Gate 3) → validate
5. Each gate uses the `ask` tool for interactive approval

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Skills | `skills/` | On-demand workflow steps (specify, plan, build, validate, clarify, publish) |
| Extensions | `extensions/` | Always-loaded: `/setup` command, `ask` tool for gates |
| Agents | `agents/` | Subagents for review, debugging, spec checking |
| Constitution | `product-constitution.md` | Operator's product principles — read every session |
| Guidelines | `REVIEW_GUIDELINES.md` | Code review severity levels (P0/P1/P2) |

## Session routine

### Start
1. `git log --oneline -5` — recent changes
2. Read `PROGRESS.md` — last entry only
3. Read `TODO.md` — next pending task
4. Confirm with operator: "Continuing from [state]. Next: [task]."

### End
1. Update `TODO.md` checkboxes
2. Add entry to `PROGRESS.md`
3. Update `CHANGELOG.md` if user-facing changes were made
4. `git add . && git commit -m "[type]: [summary]"`
5. `git push origin main`
6. Confirm with operator: "Session done. [summary]. Next: [task]."

## Rules

### Editing skills and extensions
- After any change: verify Pi loads without errors (`cd /tmp && pi -p "list skills"`)
- Test in `~/pi-system-test/` before testing in a real project
- Symlinks mean changes here take effect immediately — no need to re-run install.sh

### Testing the system
- **Quick check**: `cd /tmp && pi -p "list skills that contain product"` — verify skills load
- **Full test**: `mkdir ~/pi-system-test && cd ~/pi-system-test && pi` → run `/setup` → test workflow
- **Pilot product**: `~/bernardo-blog/` — the ongoing end-to-end test

### File conventions
- All files in English
- Skills: `skills/<name>/SKILL.md` — follow existing template structure
- Extensions: `extensions/<name>/index.ts` or `extensions/<name>.ts`
- Agents: `agents/<name>.md`

### What NOT to do
- Do not edit files in `~/.pi/agent/` directly — edit here, symlinks handle the rest
- Do not add Pi config files (settings.json, auth.json) to this repo
- Do not add product code here — this repo is the system, not a product
- Do not create product specs, plans, or code in this repo

### Communication
- Always in Portuguese with the operator
- Describe consequences, not implementation
- When proposing changes to skills/extensions: explain what the OPERATOR will experience differently
