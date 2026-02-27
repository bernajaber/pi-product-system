import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

// ============================================================
// IMMUTABLE TEMPLATES — these are written exactly as-is.
// The LLM never touches them. Change them HERE, not anywhere else.
// ============================================================

const AGENTS_MD = `# Product System — Active Project

> This project uses the Pi Product Creation System (V2).
> The agent MUST follow the workflow below. No code before Gates 1 and 2 are approved.

## Workflow

### Phase 1: Discovery → Gate 1
Use skill \`discovery\` (read \`~/.pi/agent/skills/discovery/SKILL.md\`).
- Deep interview with the operator — no round limit
- Output: \`.pi/specs/<id>/brief.md\` (< 1 page, 6 sections)
- Present Gate 1: "Entendi direito o que você quer construir?"
- Wait for operator approval before proceeding

### Phase 2: Specify
Use skill \`specify\` (read \`~/.pi/agent/skills/specify/SKILL.md\`).
- Input: approved brief.md
- Output: \`.pi/specs/<id>/spec.md\` (internal — operator never sees this)
- No operator interaction

### Phase 3: Plan
Use skill \`plan\` (read \`~/.pi/agent/skills/plan/SKILL.md\`).
- Input: spec.md
- Output: \`.pi/specs/<id>/plan.md\` (internal — operator never sees this)
- No operator interaction

### Phase 4: Analyze Loop → Gate 2
Use skill \`analyze\` (read \`~/.pi/agent/skills/analyze/SKILL.md\`).
- Sub-agent reviews brief + spec + plan + constitutions
- Output: \`.pi/specs/<id>/critique.md\` (internal)
- Cascade: spec-problem → specify + plan re-run. plan-problem → only plan re-runs.
- Max 3 cycles. If unresolved → escalate to operator.
- Present Gate 2: product-language summary of build etapas (ZERO technology)
- Wait for operator approval before proceeding

### Phase 5: Build (autonomous)
Use skill \`build\` (read \`~/.pi/agent/skills/build/SKILL.md\`).
- Input: approved plan.md
- One task = one commit. Update progress in workflow-state.json after each.
- The product-loop extension governs iteration automatically.
- Does NOT write tests or review code

### Phase 6: Test (autonomous)
Use skill \`test\` (read \`~/.pi/agent/skills/test/SKILL.md\`).
- Write tests for all acceptance scenarios, run until green
- Node.js assert, no external frameworks
- The product-loop extension governs iteration automatically.

### Phase 7: Review (autonomous)
Use skill \`review\` (read \`~/.pi/agent/skills/review/SKILL.md\`).
- Self-review of code quality: UX, visual, constitution violations
- The product-loop extension sends the review rubric automatically.
- P0/P1 must be fixed (max 3 cycles)

### Phase 8: Validate → Gate 3
Use skill \`validate\` (read \`~/.pi/agent/skills/validate/SKILL.md\`).
- Opens browser, walks through ALL acceptance scenarios
- Screenshots as evidence
- Present Gate 3: product + screenshots + checklist
- If scenario fails → code quality loop (scout diagnoses → surgical fix → test/review/validate again)

### Phase 9: Publish
Use skill \`publish\` (read \`~/.pi/agent/skills/publish/SKILL.md\`).
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
- Use the \`ask\` tool for gate approvals. Do NOT use the \`interview\` tool.
- All artifacts (specs, plans, code, commits) in ENGLISH. Only operator communication in Portuguese.
- Research BEFORE asking questions in discovery: if the operator mentions a reference, study it first.
- Escalation messages describe consequences for the user, never the technical problem.

## References
- Product Constitution: \`~/.pi/agent/product-constitution.md\`
- Review Guidelines: \`~/.pi/agent/REVIEW_GUIDELINES.md\`
- Engineering Constitution: \`.pi/engineering-constitution.md\`

## Product Context

<!-- FILL THIS SECTION after discovery completes -->
`;

const ENGINEERING_CONSTITUTION = `# Engineering Constitution

> Technical translation of the Product Constitution principles.
> The agent follows these standards automatically. The operator does NOT edit this file.
> When in doubt, refer to ~/.pi/agent/product-constitution.md — it takes precedence.

## I. Do One Thing Well → Scope Discipline
- Every feature must have a clear "why" documented in the brief
- If a feature's purpose can't be explained in one sentence, split or cut
- Default answer to "should we add X?" is NO unless there's a clear user problem

## II. Pixel Perfect Design → Visual Standards
- Mobile-first: minimum viewport 375px
- Consistent spacing: multiples of 4px or 8px
- Typography: max 2 font families, clear size scale
- Alignment: every element intentionally placed. No "close enough."
- Interactive elements: minimum touch target 44x44px on mobile
- Transitions: 150-300ms for micro-interactions
- Self-review: inspect every screen at 375px, 768px, and 1440px

## III. Fast or Feels Fast → Performance Standards
- First meaningful paint: < 1.5s on 4G
- Feedback on every user action: < 100ms visual response
- Optimistic updates where safe
- If operation > 500ms: show spinner. If > 3s: show progress bar.

## IV. Zero Visible Bugs → Quality Standards
- Test every acceptance scenario before Gate 3
- Edge cases: empty states, boundary values, rapid actions, network interruption, long/short text
- No console errors in production
- No broken links, missing images, or placeholder text

## V. Radical Simplicity → Architecture Standards
- Minimal dependencies: if doable in 20 lines of vanilla JS, no library
- Stack based on spec, not habit
- Flat file structure until complexity demands nesting
- No premature abstraction. Duplication > wrong abstraction.

## VI. Extensible, Not Configurable → Code Standards
- Separation of concerns: logic separate from presentation
- Functions do one thing
- Prefer composition over inheritance
- No config files for things that should be code changes

## VII. Local and Transparent → Data Standards
- Local storage first: localStorage, IndexedDB, SQLite, filesystem
- If cloud needed: explicitly document what data leaves the device
- No analytics/tracking unless user explicitly opts in
- User data is exportable. No lock-in.

## Process Standards

### Version Control
- Trunk-based development: main is always deployable
- Feature branches: \`feature/<name>\`
- Squash merge to main
- Conventional commits: feat:, fix:, refactor:, test:, chore:, docs:

### Testing
- Every plan includes a "Write Tests" task (mandatory, last task)
- Tests use Node.js assert — no external test framework for simple projects
- Tests cover all acceptance scenarios from the spec

### Communication to Operator
- Describe consequences, never technology
- Progress: what the user can now do, not what was coded
- Errors: what happened + what will be done, never stack traces
`;

const WORKFLOW_STATE = JSON.stringify(
  {
    currentPhase: "init",
    feature: null,
    gates: {
      briefApproved: false,
      planApproved: false,
      releaseApproved: false,
    },
    analyzeLoop: {
      cycle: 0,
      maxCycles: 3,
      lastIssueType: null,
      lastIssueSummary: null,
    },
    codeLoop: {
      cycle: 0,
      maxCycles: 3,
      lastFailedScenario: null,
      lastDiagnosis: null,
      lastReentryTask: null,
    },
    failureCount: 0,
  },
  null,
  2
);

const REVIEW_GUIDELINES = `# Review Guidelines

> Project-specific review rules. Loaded automatically by the product-loop extension during review phase.
> Updated by the plan skill with technical decisions.

## Product Principles (from Product Constitution — always apply)

- Every feature, button, and function must have a clear reason to exist. If not obvious, flag it.
- Visual interface must be flawless: alignment, spacing, typography, visual hierarchy. No "close enough."
- Never appear slow. Every user action must have immediate visual feedback (< 100ms).
- No broken state visible to the user. Edge cases handled: empty inputs, network errors, impossible states.
- Less is more. If it needs a tutorial, it's too complex. If 3 options suffice, don't offer 10.
- Minimal dependencies: if doable in 20 lines of vanilla code, no library.
- No premature abstraction. Duplication is better than the wrong abstraction.
- Local first. No tracking, no hidden telemetry. User data must be exportable.

## V2 Review Criteria (code already passed tests — focus on what tests can't catch)

| Severity | What it catches | Action |
|----------|----------------|--------|
| P0 — blocks release | Breaks something tests missed: impossible UI state, visual crash, data loss, security | MUST fix |
| P1 — urgent | Violates Product Constitution: slow, no feedback, not responsive, too complex, faltou carinho | MUST fix |
| P2 — normal | Code quality: bad naming, dead code, unused imports, inconsistent patterns | Informational |
| P3 — suggestion | Nice to have: better abstractions, minor optimizations | Informational |

## Code Review Focus

- Flag dead code, unused imports, and leftover debug statements
- Flag inconsistent naming or file organization
- Flag missing error handling for user-facing operations
- Flag accessibility issues: missing alt text, keyboard navigation, contrast
- Flag hardcoded values that should be constants

## Technical Standards

<!-- Plan skill updates this section with project-specific rules -->
`;

const GITIGNORE = `node_modules/
dist/
.DS_Store
`;

export default function (pi: ExtensionAPI) {
  pi.registerCommand("setup", {
    description: "Initialize the Product Creation System in this project",
    handler: async (_args, ctx) => {
      const cwd = ctx.cwd;

      // --- Pre-check: Product Constitution must exist ---
      const constitutionPath = path.join(
        process.env.HOME || "~",
        ".pi",
        "agent",
        "product-constitution.md"
      );
      if (!fs.existsSync(constitutionPath)) {
        ctx.ui.notify(
          "Product Constitution not found at ~/.pi/agent/product-constitution.md. Run the system setup first.",
          "error"
        );
        return;
      }

      // --- Step 1: Git ---
      const gitDir = path.join(cwd, ".git");
      if (!fs.existsSync(gitDir)) {
        execSync("git init", { cwd });
        ctx.ui.notify("Git initialized", "info");
      } else {
        ctx.ui.notify("Git already initialized", "info");
      }

      // --- Step 2: Create .pi/ structure ---
      const piDir = path.join(cwd, ".pi");
      const specsDir = path.join(piDir, "specs");
      fs.mkdirSync(piDir, { recursive: true });
      fs.mkdirSync(specsDir, { recursive: true });

      // --- Step 3: Write immutable files ---
      const agentsPath = path.join(piDir, "AGENTS.md");
      const engConstPath = path.join(piDir, "engineering-constitution.md");
      const workflowPath = path.join(piDir, "workflow-state.json");
      const reviewGuidelinesPath = path.join(cwd, "REVIEW_GUIDELINES.md");
      const gitignorePath = path.join(cwd, ".gitignore");

      fs.writeFileSync(agentsPath, AGENTS_MD);
      fs.writeFileSync(engConstPath, ENGINEERING_CONSTITUTION);
      fs.writeFileSync(workflowPath, WORKFLOW_STATE);
      fs.writeFileSync(reviewGuidelinesPath, REVIEW_GUIDELINES);

      if (!fs.existsSync(gitignorePath)) {
        fs.writeFileSync(gitignorePath, GITIGNORE);
      }

      // --- Step 4: Initial commit ---
      execSync("git add -A", { cwd });
      try {
        execSync('git commit -m "setup: product system initialized"', { cwd });
      } catch {
        // Already committed or nothing to commit — fine
      }

      // --- Step 5: Notify and hand off to agent ---
      ctx.ui.notify("Product System initialized!", "info");

      pi.sendMessage(
        {
          customType: "product-setup",
          content: `The Product System has been initialized. Files created: .pi/AGENTS.md, .pi/engineering-constitution.md, .pi/workflow-state.json, REVIEW_GUIDELINES.md, .gitignore.

Ask the operator IN PORTUGUESE: **"Tudo pronto! O que você quer construir?"**

When the operator responds, follow the workflow in .pi/AGENTS.md: start with the discovery skill (read ~/.pi/agent/skills/discovery/SKILL.md).`,
          display: true,
        },
        { deliverAs: "followUp", triggerTurn: true }
      );
    },
  });
}
