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

### Phase 12: Specify Quality
- [ ] **product-specify: clarification is being skipped entirely** — observed in bernardo-blog pilot:
      the operator gave a simple prompt and the agent went straight to spec+build without asking a
      single question. The current skill says "if the description is ambiguous, ask the operator" —
      but the agent interpreted a short prompt as sufficient and skipped clarification completely.
      Result: incomplete product (missing pages) and no context about what the operator actually wanted.
      Fix: make clarification MANDATORY for any prompt under ~50 words or that lacks explicit scope.
      The skill should always surface at least 3-5 questions before writing the spec when the
      description is a single sentence or paragraph. A short prompt is a signal to ask more, not
      a green light to assume everything.
- [ ] **product-specify: incomplete delivery not caught** — the blog was built with pages missing.
      The self-review and product-validate phases did not catch that the spec's acceptance scenarios
      were only partially met. Fix: spec-checker agent should be invoked before Gate 3 to verify
      every acceptance scenario is covered by the build.

### Future
- [ ] Convert to proper pi package (`pi install git:github.com/bernajaber/pi-product-system`)
- [ ] Per-project constitution overrides
- [ ] Multi-feature workflow (parallel features, dependencies)
- [ ] Cost tracking per project
