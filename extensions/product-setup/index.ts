import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

// ============================================================
// IMMUTABLE TEMPLATES — these are written exactly as-is.
// The LLM never touches them. Change them HERE, not anywhere else.
// ============================================================

const AGENTS_MD = `# Product System — Active Project

> This project uses the Product Creation System.
> The agent MUST follow the workflow below. No code before Gates 1 and 2 are approved.

## Workflow

### Gate 1: Spec
Use skill \`product-specify\` (read \`~/.pi/agent/skills/product-specify/SKILL.md\`).
- Output: \`.pi/specs/<id>/spec.md\`
- Present to operator in Portuguese
- Wait for approval before proceeding

### Gate 2: Plan
Use skill \`auto-plan\` (read \`~/.pi/agent/skills/auto-plan/SKILL.md\`).
- Output: \`.pi/specs/<id>/plan.md\`
- Present to operator in Portuguese
- Wait for approval before proceeding

### Gate 3: Build + Review
Use skill \`build-loop\` (read \`~/.pi/agent/skills/build-loop/SKILL.md\`).
- One task = one commit
- Self-review after all tasks
- Use skill \`product-validate\` for final check

### Rules
- Research BEFORE specifying: if the operator mentions a reference, study it in depth first
- Use the \`ask\` tool for gate approvals (interactive selection). Do NOT use the \`interview\` tool or any form/wizard.
- All artifacts (specs, plans, code, commits) in ENGLISH. Only operator communication in Portuguese.

### References
- Product Constitution: \`~/.pi/agent/product-constitution.md\`
- Review Guidelines: \`~/.pi/agent/REVIEW_GUIDELINES.md\`
- Engineering Constitution: \`.pi/engineering-constitution.md\`

## Product Context

<!-- FILL THIS SECTION after /setup completes -->
`;

const ENGINEERING_CONSTITUTION = `# Engineering Constitution

> Technical translation of the Product Constitution principles.
> The agent follows these standards automatically. The operator does NOT edit this file.
> When in doubt, refer to ~/.pi/agent/product-constitution.md — it takes precedence.

## I. Do One Thing Well → Scope Discipline
- Every feature must have a clear "why" documented in the spec
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
- Every plan includes a "Write tests" task (mandatory, last task)
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
    failureCount: 0,
  },
  null,
  2
);

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
      const gitignorePath = path.join(cwd, ".gitignore");

      fs.writeFileSync(agentsPath, AGENTS_MD);
      fs.writeFileSync(engConstPath, ENGINEERING_CONSTITUTION);
      fs.writeFileSync(workflowPath, WORKFLOW_STATE);

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
      ctx.ui.notify("✅ Product System initialized!", "info");

      pi.sendUserMessage(
        `The Product System has been initialized. Files created: .pi/AGENTS.md, .pi/engineering-constitution.md, .pi/workflow-state.json, .gitignore.

Ask the operator IN PORTUGUESE: **"Tudo pronto! O que você quer construir?"**

When the operator responds, follow the workflow in .pi/AGENTS.md: start with Gate 1 (product-specify skill).`,
        { deliverAs: "followUp" }
      );
    },
  });
}
