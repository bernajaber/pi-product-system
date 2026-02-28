# Janitor — Codebase Stabilizer

> This file is read by the agent when the janitor extension tells it to.
> The `/janitor` command is provided by the extension, not by this skill.

## What this skill does

ONE thing: take a codebase from broken/messy to clean, compiling, and organized.

- **Input:** Build output provided by the janitor extension
- **Output:** A codebase that compiles, passes tests, and follows project standards

## What this skill does NOT do

- Does NOT add features — that's the product system's job
- Does NOT make architectural decisions — it fixes what's broken
- Does NOT declare completion — the extension verifies mechanically

---

## Phase 1: Create the Plan

When the extension asks you to create a plan, you receive the build output with error counts.
Analyze everything, then write `.pi/janitor-plan.md`.

### How to analyze

1. Read EVERY SINGLE LINE of the build output — not just the first few errors
2. Count the total errors yourself and write that count in the plan
3. Group errors by **root cause** (one fix may resolve many errors)
4. For each root cause, count how many errors it produces → write as `Impact: Resolves ~N errors`
5. **The sum of all Impact lines MUST equal or exceed the total error count.** If it doesn't, you missed something. Go back and read the output again.
6. Identify dead code, unused dependencies, placeholder files
7. Identify code organization issues (duplication, mismatched contracts, outdated docs)
8. Read the ACTUAL SOURCE FILES referenced in the errors — don't guess what's wrong from the error message alone

### ⚠️ Completeness rule

The extension will reject your plan if the estimated impact doesn't account for all errors.
A plan that addresses 10 out of 22 errors is INCOMPLETE — the janitor will send you back to redo it.

**Think of it this way:** if you execute every step in your plan perfectly, would the build pass?
If the answer is "maybe" or "probably", your plan is incomplete. The answer must be "yes".

### Plan format

```markdown
# Janitor Plan

## Errors: 22 total

## Steps

### Clean
1. [clean] What to remove and why
   Files: path/to/file.ext
   Impact: Resolves 0 errors (cleanup, no compilation impact)

2. [clean] What to remove and why
   Files: path/to/file.ext
   Impact: Resolves 2 errors (dead code referenced elsewhere)

### Fix
3. [fix] What to fix (root cause, not individual errors)
   Files: path/to/file.ext
   Impact: Resolves ~10 errors

4. [fix] Another root cause
   Files: path/to/file.ext
   Impact: Resolves ~5 errors

### Organize
7. [organize] What to reorganize and why
   Files: path/to/file1.ext, path/to/file2.ext
   Impact: Resolves 0 errors (reorganization only)

## Coverage: 17/22 errors addressed directly (remaining 5 are secondary — caused by errors above)
```

**Every step MUST have an `Impact:` line.** Clean and organize steps can say "0 errors" but must still have the line.
The `Coverage` line at the bottom must account for ALL errors. Secondary/cascading errors are fine — but you must explain which step's fix will cascade to resolve them.

### Plan rules

- **Clean first** — less code to fix downstream
- **Fix second** — make it compile
- **Organize last** — don't reorganize code that might get deleted or rewritten
- **One step per root cause** — if 10 errors share one cause, that's ONE step
- **Number sequentially** across all categories (1, 2, 3... not 1.1, 1.2)
- **Highest impact first** within each category
- **Be specific** about files — the extension uses this for context

### What counts as each category

| Category | Examples | Commit prefix |
|----------|----------|---------------|
| Clean | Dead code, unused deps, placeholder files, configs describing non-existent code | `chore:` |
| Fix | Compilation errors, broken deps, missing files, API mismatches | `fix:` |
| Organize | Duplicated code, mismatched types between modules, outdated docs | `refactor:` |

---

## Phase 2: Execute Steps

The extension sends you one step at a time. For each step:

1. Read the step description
2. Make ONLY the changes for that step
3. **Run the build command to verify your change works:**
   ```bash
   cargo build 2>&1    # for Rust projects
   pnpm build 2>&1     # for Node projects
   ```
   **You MUST run the build before committing.** If it fails, fix it. Don't commit broken code and hope the extension doesn't notice — it WILL notice.
4. Commit with the appropriate prefix:
   ```bash
   git add -A && git commit -m "<prefix>: <what you did>"
   ```

### Execution rules

- **One step = one commit.** Never batch.
- **ALWAYS run the build before committing.** The extension verifies AFTER you, but you must verify FIRST. Never commit blind.
- **Stay in scope.** If the step says "fix Cargo.toml", don't refactor other files.
- **Don't skip ahead.** The extension controls the order.
- **Don't say "done".** Just commit. The extension verifies by running the build.
- **Don't make "conservative" edits without verifying.** There is no such thing as a safe edit. Run the build.
- **If stuck:** Explain what you tried and what failed. The extension handles retries.

### When a step fails verification

The extension runs the build after your commit. If errors didn't improve:
- You'll get a retry message with the current error output
- Analyze what went wrong and try a different approach
- After 3 retries, the extension escalates to the operator

---

## Phase 3: Triage

When the extension says all checks pass, write `.pi/janitor-triage.md`:

```markdown
# Janitor Triage

## Summary
What was done, in 2-3 sentences.

## Changes Made
- [N] clean steps: what was removed
- [N] fix steps: what was fixed  
- [N] organize steps: what was reorganized

## Current State
- Build: ✅/❌
- Tests: ✅/❌ (N passing, M failing)
- App launches: ✅/❌/N/A

## Remaining Issues
Anything the janitor couldn't fix (P2/P3 issues, design problems, etc.)

## Ready for Product System
Yes/No — and why.
```
