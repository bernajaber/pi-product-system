#!/usr/bin/env bash
# Creates a pre-seeded test directory simulating a project at the start of build phase.
# Product: a trivial "Hello World" static HTML page.
# All docs (brief, spec, plan, critique) already written, Gate 2 approved.
#
# Usage: bash test/integration/setup-hello-world.sh [target-dir]
# Default target: /tmp/test-product-loop

set -euo pipefail

TARGET="${1:-/tmp/test-product-loop}"

# Clean slate
rm -rf "$TARGET"
mkdir -p "$TARGET/.pi/specs/hello-world"

# ---------------------------------------------------------------------------
# .pi/AGENTS.md — exact copy from product-setup/index.ts
# ---------------------------------------------------------------------------
cat > "$TARGET/.pi/AGENTS.md" << 'AGENTS_EOF'
# Product System — Active Project

> This project uses the Pi Product Creation System (V2).
> The agent MUST follow the workflow below. No code before Gates 1 and 2 are approved.

## Workflow

### Phase 1: Discovery → Gate 1
Use skill `discovery` (read `~/.pi/agent/skills/discovery/SKILL.md`).
- Deep interview with the operator — no round limit
- Output: `.pi/specs/<id>/brief.md` (< 1 page, 6 sections)
- Present Gate 1: "Entendi direito o que você quer construir?"
- Wait for operator approval before proceeding

### Phase 2: Specify
Use skill `specify` (read `~/.pi/agent/skills/specify/SKILL.md`).
- Input: approved brief.md
- Output: `.pi/specs/<id>/spec.md` (internal — operator never sees this)
- No operator interaction

### Phase 3: Plan
Use skill `plan` (read `~/.pi/agent/skills/plan/SKILL.md`).
- Input: spec.md
- Output: `.pi/specs/<id>/plan.md` (internal — operator never sees this)
- No operator interaction

### Phase 4: Analyze Loop → Gate 2
Use skill `analyze` (read `~/.pi/agent/skills/analyze/SKILL.md`).
- Sub-agent reviews brief + spec + plan + constitutions
- Output: `.pi/specs/<id>/critique.md` (internal)
- Cascade: spec-problem → specify + plan re-run. plan-problem → only plan re-runs.
- Max 3 cycles. If unresolved → escalate to operator.
- Present Gate 2: product-language summary of build etapas (ZERO technology)
- Wait for operator approval before proceeding

### Phase 5: Build (autonomous)
Use skill `build` (read `~/.pi/agent/skills/build/SKILL.md`).
- Input: approved plan.md
- One task = one commit. Update progress in workflow-state.json after each.
- The product-loop extension governs iteration automatically.
- Does NOT write tests or review code

### Phase 6: Test (autonomous)
Use skill `test` (read `~/.pi/agent/skills/test/SKILL.md`).
- Write tests for all acceptance scenarios, run until green
- Node.js assert, no external frameworks
- The product-loop extension governs iteration automatically.

### Phase 7: Review (autonomous)
Use skill `review` (read `~/.pi/agent/skills/review/SKILL.md`).
- Self-review of code quality: UX, visual, constitution violations
- The product-loop extension sends the review rubric automatically.
- P0/P1 must be fixed (max 3 cycles)

### Phase 8: Validate → Gate 3
Use skill `validate` (read `~/.pi/agent/skills/validate/SKILL.md`).
- Opens browser, walks through ALL acceptance scenarios
- Screenshots as evidence
- Present Gate 3: product + screenshots + checklist
- If scenario fails → code quality loop (scout diagnoses → surgical fix → test/review/validate again)

### Phase 9: Publish
Use skill `publish` (read `~/.pi/agent/skills/publish/SKILL.md`).
- After Gate 3 approval
- PR + merge + tag + changelog + reset

## Gates Summary

| Gate | After | Operator sees | Operator decides |
|------|-------|---------------|------------------|
| Gate 1 | Discovery | brief.md (< 1 page) | "Entendeu o que quero?" |
| Gate 2 | Analyze loop | Plan summary in PT (zero tech) | "Vai construir certo?" |
| Gate 3 | Validate | Product + screenshots + checklist | "Funcionou?" |

## Quality Loops

**Document loop (max 3 cycles):** specify → plan → analyze → [issues?] → cascade fix → analyze again
**Code loop (max 3 cycles):** build → test → review → validate → [fail?] → scout → surgical fix → test/review/validate again

## Rules
- Use the `ask` tool for gate approvals. Do NOT use the `interview` tool.
- All artifacts (specs, plans, code, commits) in ENGLISH. Only operator communication in Portuguese.
- Research BEFORE asking questions in discovery: if the operator mentions a reference, study it first.
- Escalation messages describe consequences for the user, never the technical problem.

## References
- Product Constitution: `~/.pi/agent/product-constitution.md`
- Review Guidelines: `~/.pi/agent/REVIEW_GUIDELINES.md`
- Engineering Constitution: `.pi/engineering-constitution.md`

## Product Context

Product: Hello World Page
Feature ID: hello-world
A single static HTML page that displays "Hello World" centered on a blue background.
AGENTS_EOF

# ---------------------------------------------------------------------------
# .pi/engineering-constitution.md
# ---------------------------------------------------------------------------
cat > "$TARGET/.pi/engineering-constitution.md" << 'CONST_EOF'
# Engineering Constitution

> Technical translation of the Product Constitution principles.

## I. Do One Thing Well → Scope Discipline
- Every feature must have a clear "why" documented in the brief
- Default answer to "should we add X?" is NO unless there's a clear user problem

## II. Pixel Perfect Design → Visual Standards
- Mobile-first: minimum viewport 375px
- Consistent spacing: multiples of 4px or 8px

## III. Fast or Feels Fast → Performance Standards
- First meaningful paint: < 1.5s on 4G

## IV. Zero Visible Bugs → Quality Standards
- Test every acceptance scenario before Gate 3

## V. Radical Simplicity → Architecture Standards
- Minimal dependencies: if doable in 20 lines of vanilla JS, no library

## VI. Extensible, Not Configurable → Code Standards
- Functions do one thing

## VII. Local and Transparent → Data Standards
- Local storage first

## Process Standards

### Version Control
- Feature branches: `feature/<name>`
- Conventional commits: feat:, fix:, refactor:, test:, chore:, docs:

### Testing
- Tests use Node.js assert — no external test framework
CONST_EOF

# ---------------------------------------------------------------------------
# .pi/workflow-state.json — build phase, Gate 2 approved
# ---------------------------------------------------------------------------
cat > "$TARGET/.pi/workflow-state.json" << 'WS_EOF'
{
  "currentPhase": "build",
  "feature": "hello-world",
  "gates": {
    "briefApproved": true,
    "planApproved": true,
    "releaseApproved": false
  },
  "progress": null,
  "analyzeLoop": {
    "cycle": 0,
    "maxCycles": 3,
    "lastIssueType": null,
    "lastIssueSummary": null
  },
  "codeLoop": {
    "cycle": 0,
    "maxCycles": 3,
    "lastFailedScenario": null,
    "lastDiagnosis": null,
    "lastReentryTask": null
  },
  "failureCount": 0
}
WS_EOF

# ---------------------------------------------------------------------------
# .pi/feature-list.json
# ---------------------------------------------------------------------------
cat > "$TARGET/.pi/feature-list.json" << 'FL_EOF'
[
  { "id": "hello-world", "name": "Hello World Page", "status": "active" }
]
FL_EOF

# ---------------------------------------------------------------------------
# .pi/specs/hello-world/brief.md
# ---------------------------------------------------------------------------
cat > "$TARGET/.pi/specs/hello-world/brief.md" << 'BRIEF_EOF'
# Hello World Page

## What
A single static HTML page that displays "Hello World" centered on a blue background.

## Who
Anyone opening the page in a browser.

## Why
Proof of concept for the product system pipeline.

## Core behavior
- Page loads with a blue (#2563eb) background
- "Hello World" text centered horizontally and vertically
- White text, large and readable

## Out of scope
- No JavaScript interactivity
- No navigation
- No backend

## Success
The page looks exactly as described when opened in any modern browser.
BRIEF_EOF

# ---------------------------------------------------------------------------
# .pi/specs/hello-world/spec.md
# ---------------------------------------------------------------------------
cat > "$TARGET/.pi/specs/hello-world/spec.md" << 'SPEC_EOF'
# Hello World Page — Specification

## Acceptance Scenarios

### Scenario 1: Page displays correctly
**Given** the user opens index.html in a browser
**When** the page loads
**Then** they see "Hello World" text centered on screen
**And** the background is blue (#2563eb)
**And** the text is white (#ffffff)
**And** the text is large and readable (at least 48px)

### Scenario 2: Page is responsive
**Given** the user opens index.html on a mobile device (375px wide)
**When** the page loads
**Then** "Hello World" is still visible and centered
**And** the text doesn't overflow the viewport
SPEC_EOF

# ---------------------------------------------------------------------------
# .pi/specs/hello-world/plan.md
# ---------------------------------------------------------------------------
cat > "$TARGET/.pi/specs/hello-world/plan.md" << 'PLAN_EOF'
# Hello World Page — Plan

## Stack
- Pure HTML + CSS (no JavaScript, no dependencies)

## File structure
```
index.html              # The page
tests/
  hello-world.test.js   # Acceptance tests
```

## Tasks

### Task 1: Create the Hello World page
**Files:** `index.html`
**Done when:** index.html exists with centered "Hello World" text, blue background (#2563eb), white text (#ffffff), font size >= 48px, viewport meta tag for responsive
**Scenarios covered:** Scenario 1, Scenario 2

### Task 2: Write Tests
**Files:** `tests/hello-world.test.js`
**Done when:** All acceptance scenarios have passing tests
**Test approach:** Parse index.html with fs, verify it contains expected elements and styles
**Scenarios covered:** Scenario 1, Scenario 2

## Technical standards
- Semantic HTML5
- Mobile-first: viewport meta tag
- CSS in `<style>` tag (single file, no external CSS)

<!-- Plan skill updates this section with project-specific rules -->
PLAN_EOF

# ---------------------------------------------------------------------------
# .pi/specs/hello-world/critique.md
# ---------------------------------------------------------------------------
cat > "$TARGET/.pi/specs/hello-world/critique.md" << 'CRIT_EOF'
# Hello World Page — Critique

## Result: CLEAN

No issues found. The plan is simple, appropriate, and aligned with the brief and spec.

## Checks performed
- ☑ All acceptance scenarios covered by at least one task
- ☑ Stack is minimal (pure HTML/CSS for a static page)
- ☑ Task order logical (page first, tests second)
- ☑ "Done when" conditions are verifiable
- ☑ No over-engineering

## Review depth recommendation
- **reviewDepth:** "light" — simple static page with no logic to review deeply
CRIT_EOF

# ---------------------------------------------------------------------------
# REVIEW_GUIDELINES.md
# ---------------------------------------------------------------------------
cat > "$TARGET/REVIEW_GUIDELINES.md" << 'RG_EOF'
# Review Guidelines

## Product Principles (from Product Constitution — always apply)
- Every feature must have a clear reason to exist
- Visual interface must be flawless
- Never appear slow
- No broken state visible to the user
- Less is more
- Minimal dependencies

## V2 Review Criteria

| Severity | What it catches | Action |
|----------|----------------|--------|
| P0 — blocks release | Breaks something tests missed | MUST fix |
| P1 — urgent | Violates Product Constitution | MUST fix |
| P2 — normal | Code quality issues | Informational |
| P3 — suggestion | Nice to have | Informational |

## Technical Standards

<!-- Plan skill updates this section with project-specific rules -->
RG_EOF

# ---------------------------------------------------------------------------
# .gitignore
# ---------------------------------------------------------------------------
cat > "$TARGET/.gitignore" << 'GI_EOF'
node_modules/
dist/
.DS_Store
GI_EOF

# ---------------------------------------------------------------------------
# Git setup: main branch with initial commit, then feature branch
# ---------------------------------------------------------------------------
cd "$TARGET"
git init -q
git add -A
git commit -q -m "setup: product system initialized"
git checkout -q -b feature/hello-world

echo ""
echo "✅ Fixture created at: $TARGET"
echo ""
echo "State:"
echo "  currentPhase: build"
echo "  gates: briefApproved=true, planApproved=true"
echo "  progress: null (product-loop will send initial build prompt)"
echo "  feature branch: feature/hello-world"
echo ""
echo "Build tasks: 1 (Create Hello World page)"
echo "  → Task 2 (Write Tests) is skipped by build skill"
echo ""
echo "To run: PI_AUTO_TEST=true pi   (from $TARGET)"
