# TODO — Pi Product System

> Status: `[ ]` pending · `[x]` done · `[~]` in progress

---

## Done

### Phase 0: Foundation
- [x] Install Pi packages (pi-web-access, pi-model-switch, pi-subagents, pi-interactive-shell, pi-interview, pi-review-loop, pi-prompt-template-model, mitsupi)

### Phase 1: Workflow State
- [x] workflow-state.json schema
- [x] feature-list.json schema
- [x] progress.md tracking

### Phase 2: Operator Interaction
- [x] ask-tool.ts — interactive gate approvals via ctx.ui.select

### Phase 3: Skills
- [x] product-specify — natural language → structured spec
- [x] product-clarify — clarification questions
- [x] auto-plan — spec → atomic build plan
- [x] build-loop — plan → code + self-review
- [x] product-validate — verify + present Gate 3
- [x] auto-publish — branch → PR → merge

### Phase 4: Build Loop + Self-Review
- [x] reviewer.md agent
- [x] scout.md agent
- [x] spec-checker.md agent
- [x] REVIEW_GUIDELINES.md (P0/P1/P2 severity)

### Phase 5: Release Pipeline
- [x] auto-publish skill
- [x] Conventional commits in all skills

### Phase 6: Model & Cost
- [x] Model aliases (cheap/default/heavy)
- [x] Cost protection rules

### Phase 7: Product Constitution
- [x] Product Constitution v1.1.0 (English)
- [x] Engineering Constitution template (in /setup)
- [x] Research: SpecKit, Pi, NanoClaw philosophies
- [x] Captured Bernardo's 7 core principles

### Phase 9: Consolidation
- [x] Single repo on GitHub (github.com/bernajaber/pi-product-system)
- [x] install.sh / uninstall.sh (symlink-based)
- [x] /setup command as deterministic extension
- [x] AGENTS.md for system development
- [x] README with structure, install, usage
- [x] CHANGELOG
- [x] Migrated PARA-BERNARDO.md, WORKFLOW-SPEC.md to docs/

---

## In Progress

### Phase 8: End-to-End Pilot
- [~] Test with real product: personal blog (~/bernardo-blog)
- [ ] /setup runs correctly and initializes project
- [ ] ask-tool works for gate approvals (interactive selection)
- [ ] product-specify: researches references before writing spec
- [ ] product-specify: presents Gate 1 via ask tool
- [ ] auto-plan: creates plan and presents Gate 2 via ask tool
- [ ] build-loop: implements task by task with commits
- [ ] build-loop: self-review catches issues
- [ ] product-validate: screenshots + checklist + Gate 3
- [ ] Full flow completes without manual intervention between gates
- [ ] Blog is functional, designed, and has 3 philosophy posts

---

## Pending

### Phase 10: Polish & Hardening
- [x] Update PARA-BERNARDO.md to reflect current system (Ctrl+. kept, /setup flow, no "Nova sessão.")
- [ ] Test /setup in completely fresh environment
- [ ] Test uninstall.sh + reinstall.sh cycle
- [ ] Edge case: what happens if agent ignores AGENTS.md? Document recovery steps
- [ ] Edge case: what happens mid-build if context compacts? Verify workflow-state survives

### Phase 11: Extensions (post-pilot)
- [ ] Evaluate: git-checkpoint extension (auto-stash per turn)
- [ ] Evaluate: protected-paths extension (block writes to .pi/AGENTS.md)
- [ ] Evaluate: session-name extension (auto-name sessions)
- [ ] Evaluate: status-line extension (show current workflow phase)
- [ ] Evaluate: notify extension (desktop notification on gate reached)

### Phase 12: End-to-End Process Audit (post-consolidation)
- [ ] **⚠️ AUDIT: full process broke during bernardo-blog pilot** — zero clarification questions
      asked, self-review skipped, product delivered incomplete (missing pages). The entire workflow
      ran without following the gates protocol.
      
      **Likely cause:** bernardo-blog was built BEFORE Phase 9 consolidation (skills/extensions
      were not yet in their final location, AGENTS.md template was different). This may be a
      false positive — the current system may work correctly.
      
      **Verification needed (run after Phase 8 pilot with current system):**
      - Does product-specify ask at least 3 questions before writing a spec from a short prompt?
      - Does build-loop invoke self-review after completing tasks?
      - Does product-validate invoke spec-checker to verify all acceptance scenarios are covered?
      - Does the full flow Gate 1 → Gate 2 → build → review → Gate 3 run without skipping steps?
      
      If the audit finds the same failures on the current system, the fixes are:
      - product-specify: treat short/vague prompts as mandatory clarification triggers
      - build-loop: make self-review non-optional (not just "if P0/P1 found")
      - product-validate: always run spec-checker before presenting Gate 3

### Phase 13: Browser Tool Audit
- [ ] **⚠️ INVESTIGATE: 3 browser skills conflicting** — three separate browser automation skills
      are loaded simultaneously, which likely confuses the agent about which one to use:

      | Skill | Source | How it works | Status |
      |-------|--------|--------------|--------|
      | `surf` | `surf-cli` npm global | Controls Chrome via CDP extension | Our skills use this |
      | `web-browser` | `mitsupi` (pi package) | Uses local `./scripts/` + Chrome on port 9222 | Broken: `./scripts/` don't exist in project folders |
      | `agent-browser` | `agent-browser` npm global | Playwright-based, headless | Not referenced anywhere |

      **Risks:**
      - Agent might pick `web-browser` or `agent-browser` instead of `surf` during validation
      - `web-browser` (mitsupi) will always fail: requires `./scripts/nav.js` etc. which
        don't exist outside Mario's own repo. License literally says "Stolen from Mario."
      - `agent-browser` uses completely different command syntax (Playwright) vs surf (CDP)
      - Our build-loop/product-validate skills hardcode `surf` commands — if agent uses
        another skill, output is incompatible

      **Note: none of these are MCP servers.** All three are CLI tools with a daemon pattern
      (first bash call starts the daemon, subsequent calls use a Unix socket). The daemon
      runs in background and does NOT consume context window. Context cost comes from
      reading the SKILL.md: surf=545 lines, agent-browser=252 lines, web-browser=91 lines.
      Skills are loaded on-demand (only when the agent reads the file), not at startup.

      **Investigation steps:**
      1. Confirm `web-browser` (mitsupi) fails in a real project (no `./scripts/` dir)
      2. Decide: keep `agent-browser` installed or remove it? (it's not in pi packages,
         just a global npm — may have been installed independently)
      3. Explicitly tell the agent in build-loop/product-validate: "use the `surf` skill,
         not `web-browser` or `agent-browser`"
      4. Consider: is `agent-browser` (Playwright, no Chrome extension needed) actually
         more reliable than `surf` (requires Chrome + extension setup)?

### Future
- [ ] Convert to proper pi package (`pi install git:github.com/bernajaber/pi-product-system`)
- [ ] Per-project constitution overrides
- [ ] Multi-feature workflow (parallel features, dependencies)
- [ ] Cost tracking per project
