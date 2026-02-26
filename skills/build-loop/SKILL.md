---
name: build-loop
description: "Execute the build and self-review cycle. Use after Gate 2 is approved to implement all features, review code, and prepare for Gate 3."
---

# Build Loop Skill

## ⚠️ MANDATORY: Start with `/loop self` before writing any code. Do NOT skip this step.

## Phase 1: Build

1. **Start the build loop: `/loop self`** ← Do this FIRST, before any code changes
2. Read the plan from `.pi/specs/<feature>/plan.md`
3. Implement tasks ONE AT A TIME in order from the plan
4. After EACH task — STOP and do ALL of the following before moving to the next task:
   a. Verify it works (see Testing below)
   b. `git add . && git commit -m "feat(<scope>): <what this task did>"`
   c. Confirm the commit was created: `git log --oneline -1`
   
   **⚠️ RULE: One task = one commit. You MUST commit after each task. Do NOT implement multiple tasks then commit once. If git log shows N tasks in one commit, you broke this rule.**

5. When ALL tasks are done and each has its own commit: call `signal_loop_success`

### Testing During Build
For static HTML/JS apps, verify visually using `file://` protocol — NO server needed:

```bash
surf window.new "file:///absolute/path/to/index.html"
```
Returns a window ID. Then use separate bash calls:
```bash
surf --window-id <ID> screenshot /tmp/verify.png
surf --window-id <ID> read --compact
```
To reload after code changes:
```bash
surf --window-id <ID> go "file:///absolute/path/to/index.html"
```
**NEVER start a dev server during build.** The bash tool cannot handle background processes.
For apps that REQUIRE a server (API, SSR), defer verification to the `product-validate` phase.

### Git Safety
Always prefix git push with the intercepted-commands PATH:
```bash
PATH=".pi/intercepted-commands:$PATH" git push origin main
```
This blocks pushes to main unless Gate 3 is approved.

---

## Phase 2: Self-Review

After `signal_loop_success`:

1. `/review uncommitted` — reviews changes against `.pi/REVIEW_GUIDELINES.md`
2. If P0/P1 issues found:
   - `/end-review` → return to code
   - Fix the issues
   - `/review uncommitted` again
3. Maximum **3 review cycles**. If still P0/P1 after 3: escalate to operator.
4. When verdict is "correct" (no P0/P1):
   - `/end-review` → "Return and summarize"
   - Move to `product-validate` skill → Gate 3

### Available Review Commands
- `/review uncommitted` — review all uncommitted changes
- `/review branch main` — review current branch vs main
- `/review commit <hash>` — review specific commit
- `/end-review` — end review, choose: return / summarize / discard

---

## Failure Escalation During Build

Track `failureCount` in `workflow-state.json`:

| Count | Action |
|-------|--------|
| 1-2 | Retry with different approach |
| 3 | Launch scout: `/run scout "diagnose: [problem in 1 line]"` |
| 5 | Switch model: `switch_model({ action: "switch", search: "heavy" })` + ask operator |
| 7 | Partial delivery: publish what works, document what's missing |

Reset `failureCount` to 0 when problem is resolved.
