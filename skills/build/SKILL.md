---
name: build
description: "Implement features from the plan, one task per commit. Autonomous — the product-loop governs iteration. Does NOT write tests or review code."
---

# Build Skill

## ⚠️ LANGUAGE: All code, commits, and artifacts in ENGLISH.

## What this skill does

ONE thing: implement the tasks from the plan as working code.

- **Input:** `.pi/specs/<feature>/plan.md` (approved at Gate 2)
- **Output:** committed code — one task = one commit

## What this skill does NOT do

- Does NOT write tests. That's the `test` skill's job.
- Does NOT review code quality. That's the `review` skill's job.
- Does NOT validate the product. That's the `validate` skill's job.
- Does NOT present anything to the operator. No gates here.

## Process

### Step 0: Baseline check

Before touching anything, verify the project is healthy:

```bash
# Run whatever test runner the project uses
npm test 2>/dev/null || node --test 2>/dev/null || true
```

- **If tests exist and PASS:** Good. Proceed to Step 1.
- **If tests exist and FAIL:** Fix the failures FIRST. Do NOT implement new tasks on a broken baseline. Commit the fix: `git commit -m "fix: repair broken baseline tests before new feature"`
- **If no tests exist yet:** That's fine — this is a new project. Proceed to Step 1.

**Why:** Feature B must never break Feature A. A green baseline before you start is your safety net.

Then create the initial progress file. Read `.pi/specs/<feature>/plan.md` and write `.pi/specs/<feature>/progress.md` in Portuguese:

```markdown
# <nome do produto> — Progresso

## O que estamos construindo
<1-2 frases do brief.md — copie a seção Problem>

## Progresso
⬜ 1. <task 1 — descrição curta>
⬜ 2. <task 2 — descrição curta>
⬜ 3. <task 3 — descrição curta>
...

## O que acabou de acontecer
Começando o build.

## Decisões técnicas
(nenhuma ainda)
```

### Step 1: Read the plan

Read `.pi/specs/<feature>/plan.md`. Note:
- The ordered list of tasks
- The "Done when" condition for each task
- The "Files" list for each task
- The "Scenarios covered" mapping

**IMPORTANT:** The last task in the plan is "Write Tests". Skip it — that's the `test` skill's job. Build implements all tasks EXCEPT the test task.

### Step 2: Implement tasks one at a time

For each task (except "Write Tests"):
1. Implement the task according to the plan
2. Verify the "Done when" condition is met
3. Commit:
   ```bash
   git add .
   git commit -m "feat(<scope>): <what this task did>"
   ```
4. Confirm the commit: `git log --oneline -1`
5. Update `.pi/specs/<feature>/progress.md`: mark the completed task with ✅, update "O que acabou de acontecer" with 2-3 sentences about what was done, add any technical decisions made.
6. Update progress in `.pi/workflow-state.json`:
   ```json
   { "task": N, "of": TOTAL, "status": "ok" }
   ```
   Where N = number of tasks completed (1-based: after completing task 1, set `task: 1`).
   TOTAL = total build tasks (excluding Write Tests).
   The product-loop uses `task + 1` to tell you the next task number.
7. Move to the next task

**⚠️ RULE: One task = one commit. Do NOT implement multiple tasks then commit once.**

### Step 3: Update state when done

When ALL build tasks are done (each with its own commit):
- Update progress: `{ task: TOTAL, of: TOTAL, status: "ok" }`
- The product-loop will handle the transition to the test phase

## How the loop works

The product-loop extension governs this phase automatically:

1. You enter the build phase (currentPhase: "build")
2. Product-loop sends you a follow-up: "Implement Task N from the plan"
3. You implement, commit, update progress
4. Product-loop detects the update, sends next follow-up
5. When all tasks done: product-loop transitions to test phase

**You don't need to type any commands.** Just implement, commit, update progress.

**If you get stuck:** Update progress status to `"stuck"`. The product-loop will shift to diagnostic mode and help you troubleshoot. If still stuck after 2 turns, it will escalate to the operator.

## Verification during build

During build, verify the code is correct by reading it — NOT by opening a browser. Visual verification happens in the `validate` phase.

For quick checks, read the generated files:
```bash
cat index.html | head -50
```

For apps that REQUIRE a server to verify basic functionality:
```bash
node server.js &
curl -s http://localhost:4321 | head -5
kill %1
```

**Do NOT start long-running dev servers during build.** The bash tool cannot handle background processes reliably.

**Do NOT use `file://` protocol.** ES modules do not work with `file://` due to CORS. All browser testing happens in the `validate` phase with a proper HTTP server.

## Rules

- Follow the plan's task order. Tasks are ordered so each produces a working (if incomplete) state.
- First task should produce something visible (even if minimal).
- If a task is unclear or seems wrong, re-read the plan. If still unclear, report stuck — don't guess.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`.
- Do NOT use the `interview` tool or the `ask` tool. This skill has no operator interaction.
