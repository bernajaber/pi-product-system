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
- [x] Test with real product: personal CRM (~/personal-crm) — pilot ran successfully
- [x] /setup runs correctly and initializes project
- [x] ask-tool works for gate approvals (interactive selection)
- [x] product-specify: researches references before writing spec
- [x] product-specify: presents Gate 1 via ask tool
- [x] auto-plan: creates plan and presents Gate 2 via ask tool
- [x] build-loop: implements task by task with commits
- [ ] build-loop: self-review catches issues — agent confused /loop self with review_loop tool
- [ ] product-validate: screenshots + checklist + Gate 3 — browser verification skipped
- [x] Full flow completes without manual intervention between gates
- [~] Blog is functional, designed, and has 3 philosophy posts — replaced by personal-crm pilot

---

## Pending

### Phase 10: Polish & Hardening
- [x] Update PARA-BERNARDO.md to reflect current system (Ctrl+. kept, /setup flow, no "Nova sessão.")
- [ ] Test /setup in completely fresh environment
- [ ] Test uninstall.sh + reinstall.sh cycle
- [ ] Edge case: what happens if agent ignores AGENTS.md? Document recovery steps
- [ ] Edge case: what happens mid-build if context compacts? Verify workflow-state survives

### Phase 14: Pilot Fixes (observed in personal-crm pilot — 2026-02-26)

- [ ] **FIX: /setup should create GitHub remote** — today the project is initialized locally
      but no remote is created. The auto-publish skill needs `gh repo create` to work. Fix:
      add `gh repo create <project-name> --private --source=. --push` to the /setup extension
      after the initial commit. Ask the operator if they want public or private repo.

- [ ] **FIX: /loop self confusion** — agent confused the build loop command with the
      review_loop tool. Observed reasoning: "The build-loop skill says /loop self. This is a
      self-review loop. Let me start the review_loop." — completely wrong interpretation.
      Root cause: the names are too similar (/loop = loop.ts build loop, review_loop = pi-review-loop tool).
      Fix: rewrite the build-loop SKILL.md to be explicit:
        - "/loop self" is a SLASH COMMAND from the loop.ts extension (type it in the chat input)
        - "review_loop" is a SEPARATE TOOL only used for self-review AFTER build is complete
        - They are NOT the same thing. Do NOT confuse them.
      Add a ⚠️ WARNING box at the top of build-loop/SKILL.md with this distinction.

- [ ] **FIX: browser verification being skipped** — product-validate ran without using any
      browser tool for visual verification. Confirmed surf doesn't work without Chrome open.
      Blocked by Phase 13 (migrate to agent-browser). Once agent-browser is in place, add
      a hard requirement to product-validate: "Verification MUST include at least one
      screenshot. If no screenshot is taken, do NOT present Gate 3."

- [ ] **IMPROVE: interview/specify process too weak for complex products** — the clarification
      phase works acceptably for small/simple products but will not scale to complex ones.
      The agent asks superficial questions or skips to spec too quickly.
      Needs more structure and energy — dedicated investigation in Phase 12 audit.

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

      **Recommendation: migrate to `agent-browser`.** Confirmed: surf fails when Chrome
      is not open (`Connection refused. Native host not running`). agent-browser (Playwright)
      is self-contained — no Chrome extension required, starts its own Chromium.

      **Action items:**
      1. Update `build-loop/SKILL.md`: replace `surf window.new / surf --window-id` commands
         with `agent-browser open / agent-browser screenshot / agent-browser snapshot -i`
      2. Update `product-validate/SKILL.md`: same replacement
      3. Remove `web-browser` skill confusion: add note to AGENTS.md template in /setup
         that `web-browser` (mitsupi) is not usable (requires Mario's local ./scripts/)
      4. `surf` can stay installed for manual use (AI queries, real Chrome session) but
         should not be the tool for automated product validation

### Future
- [ ] Convert to proper pi package (`pi install git:github.com/bernajaber/pi-product-system`)
- [ ] Per-project constitution overrides
- [ ] Multi-feature workflow (parallel features, dependencies)
- [ ] Cost tracking per project
