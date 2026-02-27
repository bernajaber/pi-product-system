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
5. Update progress in `.pi/workflow-state.json`:
   ```json
   { "task": N, "of": TOTAL, "status": "ok" }
   ```
   Where N = number of tasks completed (1-based: after completing task 1, set `task: 1`).
   TOTAL = total build tasks (excluding Write Tests).
   The product-loop uses `task + 1` to tell you the next task number.
6. Move to the next task

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

For static HTML/JS apps, verify visually using `file://` protocol — NO server needed:
```bash
cat index.html | head -50
```

For apps that REQUIRE a server (API, SSR): defer visual verification to the `validate` phase. During build, verify that the code runs without errors:
```bash
node server.js &
curl -s http://localhost:4321 | head -5
kill %1
```

**Do NOT start long-running dev servers during build.** The bash tool cannot handle background processes reliably.

## Rules

- Follow the plan's task order. Tasks are ordered so each produces a working (if incomplete) state.
- First task should produce something visible (even if minimal).
- If a task is unclear or seems wrong, re-read the plan. If still unclear, report stuck — don't guess.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`.
- Do NOT use the `interview` tool or the `ask` tool. This skill has no operator interaction.
