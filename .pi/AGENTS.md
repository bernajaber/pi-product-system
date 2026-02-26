# Pi Product System — Development

> This is the product creation system itself. Not a product — the tool that builds products.
> When working here, you are improving the system, not using it.

## What this repo is

A set of skills, extensions, and agents for Pi that enable product creation through natural conversation. The operator describes what to build → the system handles spec, plan, build, review, and publish.

Installed via symlinks to `~/.pi/agent/`. Changes here take effect immediately.

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
- The `install.sh` creates symlinks — no need to re-run after editing files in this repo

### File conventions
- All files in English
- Skills: `skills/<name>/SKILL.md` — follow existing template structure
- Extensions: `extensions/<name>/index.ts` or `extensions/<name>.ts`
- Agents: `agents/<name>.md`

### What NOT to do
- Do not edit files in `~/.pi/agent/` directly — edit here, symlinks handle the rest
- Do not add Pi config files (settings.json, auth.json) to this repo
- Do not add product code here — this repo is the system, not a product

### Communication
- Always in Portuguese with the operator
- Describe consequences, not implementation
- When proposing changes to skills/extensions: explain what the OPERATOR will experience differently
