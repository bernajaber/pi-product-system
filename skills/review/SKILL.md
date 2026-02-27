---
name: review
description: "Self-review of code for issues that tests don't catch: UX, visual quality, accessibility, and constitution violations. Autonomous — no operator commands needed."
---

# Review Skill

## ⚠️ LANGUAGE: Review findings in ENGLISH.

## What this skill does

ONE thing: catch quality issues that automated tests can't detect.

- **Input:** committed code that already passed `test` skill
- **Output:** clean code — no P0 or P1 issues remaining

## What this skill does NOT do

- Does NOT re-verify functionality. Tests already did that.
- Does NOT check if acceptance scenarios work. That's the `test` skill's job.
- Does NOT validate the product end-to-end. That's the `validate` skill's job.

## V2 Review Criteria

The code already passed tests. The review focuses on what tests CAN'T cover:

| Severity | What it catches | Examples |
|----------|----------------|----------|
| **P0 — blocks release** | Breaks something tests didn't catch | Impossible UI state, visual crash, data loss on edge case, security hole |
| **P1 — urgent** | Violates Product Constitution principle | Slow/no feedback on action, not responsive, too complex for the task, faltou carinho |
| **P2 — normal** | Code quality issues | Bad naming, dead code, unused imports, inconsistent patterns |
| **P3 — suggestion** | Nice to have | Better abstractions, cleaner patterns, minor optimizations |

**P0 and P1 MUST be fixed before proceeding. P2/P3 are informational.**

## Process

### Step 1: Read the diff

Run `git diff main` (or the base branch) to see ALL changes on this branch. This is what you're reviewing — the actual diff, not just the files.

### Step 2: Review against criteria

For each file in the diff, check:

**P0 checks (breaks something)**
- [ ] Any UI state that's impossible to recover from (dead-end screens)
- [ ] Data loss scenarios (unsaved work, lost input on navigation)
- [ ] Visual crashes (overlapping elements, invisible text, broken layout)
- [ ] Security issues (exposed secrets, XSS, unvalidated input displayed as HTML)
- [ ] SQL injection (non-parameterized queries)

**P1 checks (constitution violations)**
Read `~/.pi/agent/product-constitution.md` and check each principle:
- [ ] **Do one thing well:** Is there a feature/button with no clear purpose?
- [ ] **Pixel perfect:** Alignment issues? Spacing inconsistencies? Typography problems?
- [ ] **Fast or feels fast:** Any action without immediate visual feedback?
- [ ] **Zero visible bugs:** Edge cases the user hits in 30 seconds of use?
- [ ] **Radical simplicity:** Is anything unnecessarily complex? Too many options?
- [ ] **Local and transparent:** Any hidden data transmission or tracking?

**P2/P3 checks (code quality)**
- [ ] Dead code, unused imports, leftover debug statements
- [ ] Inconsistent naming or file organization
- [ ] Missing error handling for user-facing operations
- [ ] Accessibility: missing alt text, keyboard navigation, contrast
- [ ] Hardcoded values that should be constants

The product-loop extension automatically includes the project's `REVIEW_GUIDELINES.md` in its follow-up. Use it as your reference for severity definitions and project-specific rules.

### Step 3: Report findings

List each finding with: priority tag, file:line, explanation.

End with a verdict:
- **"correct"** — no P0/P1 issues found
- **"needs attention"** — has P0/P1 issues that must be fixed

### Step 4: Act on findings

**If P0 or P1 found:**
1. Fix the specific issues
2. Commit: `git commit -m "fix: [what was fixed] (review P0/P1)"`
3. Update progress status to "ok" in workflow-state.json
4. The product-loop will trigger another review cycle automatically

**If only P2/P3 (or clean):**
1. Update progress: `{ task: 1, of: 1, status: "ok" }` — marks review as complete
2. The product-loop will trigger the transition to validate

**Max 3 review cycles.** After 3 cycles, proceed to validate anyway — it will catch remaining issues through browser testing.

### Step 5: Review summary

When the review is complete (clean verdict), note what was found and fixed during review. This summary will be included in the PR description at publish time. Don't write it to a file — it goes in the PR.

## How the loop works

The product-loop extension governs this phase automatically:

1. You enter the review phase (currentPhase: "review")
2. Product-loop sends you the review prompt with rubric + REVIEW_GUIDELINES.md
3. You review the diff, report findings, fix P0/P1
4. Product-loop detects progress, sends another review cycle
5. When clean: you mark review complete, product-loop transitions to validate

**You don't need to type any commands.** Just review, fix, and update progress.

## Rules

- Do NOT re-check functionality. If a test passes for "user can add item", don't manually verify adding items works. Trust the test.
- Focus on the HUMAN experience: what does it look like? What does it feel like? Is it obvious?
- The Product Constitution is your rubric. When in doubt about severity, check the principles.
- Do NOT use the `interview` tool. This skill has no operator interaction.
- Do NOT use the `ask` tool. This phase is fully autonomous.
