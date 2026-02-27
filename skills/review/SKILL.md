---
name: review
description: "Self-review of code for issues that tests don't catch: UX, visual quality, accessibility, and constitution violations. Uses /review uncommitted."
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

### Step 1: Start review

```
/review uncommitted
```

This reviews all uncommitted changes against `REVIEW_GUIDELINES.md`.

### Step 2: Evaluate findings

For each finding, classify severity using the V2 criteria above.

- **P0 or P1 found:**
  1. `/end-review` → return to code
  2. Fix the issues
  3. Commit the fixes: `git commit -m "fix: [what was fixed] (review P0/P1)"`
  4. `/review uncommitted` again
  5. **Max 3 review cycles.** If still P0/P1 after 3: escalate to operator.

- **Only P2/P3 (or clean):**
  1. `/end-review` → "Return and summarize"
  2. Proceed to `validate` skill

### Step 3: Update state

Update `workflow-state.json`: set `currentPhase: "validate"`.

## Review checklist (what to look for)

### P0 checks (breaks something)
- [ ] Any UI state that's impossible to recover from (dead-end screens)
- [ ] Data loss scenarios (unsaved work, lost input on navigation)
- [ ] Visual crashes (overlapping elements, invisible text, broken layout)
- [ ] Security issues (exposed secrets, XSS, unvalidated input displayed as HTML)

### P1 checks (constitution violations)
Read `~/.pi/agent/product-constitution.md` and check each principle:
- [ ] **Do one thing well:** Is there a feature/button with no clear purpose?
- [ ] **Pixel perfect:** Alignment issues? Spacing inconsistencies? Typography problems?
- [ ] **Fast or feels fast:** Any action without immediate visual feedback?
- [ ] **Zero visible bugs:** Edge cases the user hits in 30 seconds of use?
- [ ] **Radical simplicity:** Is anything unnecessarily complex? Too many options?
- [ ] **Local and transparent:** Any hidden data transmission or tracking?

### P2/P3 checks (code quality)
- [ ] Dead code, unused imports, leftover debug statements
- [ ] Inconsistent naming or file organization
- [ ] Missing error handling for user-facing operations
- [ ] Accessibility: missing alt text, keyboard navigation, contrast
- [ ] Hardcoded values that should be constants

## Escalation (after 3 review cycles)

If P0/P1 issues persist after 3 cycles, they'll be caught by the broader code quality loop (build → test → review → validate). The `validate` skill and `scout` agent handle systematic failures.

## Rules

- Do NOT re-check functionality. If a test passes for "user can add item", don't manually verify adding items works. Trust the test.
- Focus on the HUMAN experience: what does it look like? What does it feel like? Is it obvious?
- The Product Constitution is your rubric. When in doubt about severity, check the principles.
- Do NOT use the `interview` tool. This skill has no operator interaction.
