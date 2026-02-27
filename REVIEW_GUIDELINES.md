# Review Guidelines — V2

> These are the review criteria for the `review` skill.
> The code being reviewed has ALREADY PASSED automated tests.
> Focus on what tests CAN'T catch.

## Severity Levels

| Severity | What it catches | Action |
|----------|----------------|--------|
| **P0 — blocks release** | Breaks something tests missed | MUST fix before proceeding |
| **P1 — urgent** | Violates Product Constitution principle | MUST fix before proceeding |
| **P2 — normal** | Code quality issue | Informational — fix if time allows |
| **P3 — suggestion** | Nice to have | Informational — optional |

## P0 — Blocks Release

Issues that break the user experience in ways automated tests can't detect:

- **Impossible UI states:** dead-end screens, overlapping modals, unreachable buttons
- **Visual crashes:** broken layout at common viewport sizes, invisible text, overlapping elements
- **Data loss:** unsaved work lost on navigation, input cleared unexpectedly
- **Security holes:** exposed secrets, XSS via unvalidated input, insecure data transmission

## P1 — Urgent (Constitution Violations)

Each maps to a principle from `~/.pi/agent/product-constitution.md`:

- **Do one thing well:** feature/button with no clear purpose, scope creep
- **Pixel perfect:** misaligned elements, inconsistent spacing, typography issues, broken visual hierarchy
- **Fast or feels fast:** user action with no immediate visual feedback, perceived slowness
- **Zero visible bugs:** edge case a user hits in 30 seconds of normal use
- **Radical simplicity:** unnecessary complexity, too many options, needs explanation to use
- **Local and transparent:** hidden data transmission, unexpected tracking

## P2 — Normal (Code Quality)

- Dead code, unused imports, leftover debug statements (`console.log`, `TODO`, `FIXME`)
- Inconsistent naming or file organization
- Missing error handling for user-facing operations
- Accessibility gaps: missing alt text, no keyboard navigation, poor contrast
- Hardcoded values that should be constants or configuration

## P3 — Suggestion

- Better abstractions or patterns
- Minor performance optimizations
- Refactoring opportunities
- Documentation improvements

## What NOT to Review

- **Functionality:** Tests already verified this. Do not re-check if "user can add item" works.
- **Architecture choices:** The plan was approved at Gate 2. Don't second-guess stack or structure.
- **Code style preferences:** Unless they cause a P0/P1 issue, style is not a review concern.

## Review Output Format

```
## Review: [feature name]

### P0 Issues
- [description] — [file:line] — [how to fix]

### P1 Issues
- [description] — [file:line] — [how to fix]

### P2 Issues
- [description] — [file:line]

### P3 Suggestions
- [description]

### Verdict: [correct | needs attention]
```

If no P0/P1 issues: verdict is "correct".
If any P0/P1: verdict is "needs attention" with specific fixes listed.
