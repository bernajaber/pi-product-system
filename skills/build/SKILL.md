---
name: build
description: "Implement features from the plan, one task per commit. Uses /loop self for autonomous persistence. Does NOT write tests or review code."
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

### Step 1: Start the build loop

**MANDATORY — do this FIRST, before any code changes.**

`/loop self` is a slash command that the OPERATOR types, not a tool you call. You cannot invoke it yourself. Ask the operator to activate it:

Tell the operator in Portuguese:
> "Para eu trabalhar autonomamente, por favor digite `/loop self` no chat."

Then STOP and WAIT for the loop to activate. You'll know it's active when you receive a follow-up message saying "Continue until you are done."

**If the operator doesn't activate the loop** (or you're unsure if it's active): implement ONE task at a time, commit it, then STOP. The operator will say "continue" or send you a message to proceed to the next task. Do NOT try to implement all tasks in a single turn — this generates too much output and crashes the session.

**When all build tasks are done:** call the `signal_loop_success` tool to end the loop.

### Step 2: Read the plan

Read `.pi/specs/<feature>/plan.md`. Note:
- The ordered list of tasks
- The "Done when" condition for each task
- The "Files" list for each task
- The "Scenarios covered" mapping

**IMPORTANT:** The last task in the plan is "Write Tests". Skip it — that's the `test` skill's job. Build implements all tasks EXCEPT the test task.

### Step 3: Implement tasks one at a time

For each task (except "Write Tests"):
1. Implement the task according to the plan
2. Verify the "Done when" condition is met
3. Commit:
   ```bash
   git add .
   git commit -m "feat(<scope>): <what this task did>"
   ```
4. Confirm the commit: `git log --oneline -1`
5. Move to the next task

**⚠️ RULE: One task = one commit. Do NOT implement multiple tasks then commit once.**

### Step 4: Finish the loop

When ALL build tasks are done (each with its own commit):

```
signal_loop_success
```

### Step 5: Update state

Update `workflow-state.json`: set `currentPhase: "test"`.

## Verification during build

For static HTML/JS apps, verify visually using `file://` protocol — NO server needed:
```bash
# Open the file in agent-browser or check DOM structure
cat index.html | head -50
```

For apps that REQUIRE a server (API, SSR): defer visual verification to the `validate` phase. During build, verify that the code runs without errors:
```bash
node server.js &
curl -s http://localhost:4321 | head -5
kill %1
```

**Do NOT start long-running dev servers during build.** The bash tool cannot handle background processes reliably.

## Failure escalation

Track `failureCount` in `workflow-state.json`:

| Count | Action |
|-------|--------|
| 1-2 | Retry with a different approach |
| 3 | Launch scout: use `scout` agent to diagnose the problem |
| 5 | Switch to a more powerful model + inform operator |
| 7 | Partial delivery: commit what works, document what's missing |

Reset `failureCount` to 0 when the problem is resolved.

## Git safety

Always prefix git push with the intercepted-commands PATH:
```bash
PATH=".pi/intercepted-commands:$PATH" git push origin main
```
This blocks pushes to main unless Gate 3 is approved.

## Rules

- Follow the plan's task order. Tasks are ordered so each produces a working (if incomplete) state.
- First task should produce something visible (even if minimal).
- If a task is unclear or seems wrong, re-read the plan. If still unclear, flag it — don't guess.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`.
- Do NOT use the `interview` tool or the `ask` tool. This skill has no operator interaction.
