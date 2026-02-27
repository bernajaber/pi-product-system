# TODO — Pi Product System

> Status: `[ ]` pending · `[x]` done · `[~]` in progress
> Architecture spec: `docs/ARCHITECTURE-V2.md`

---

## Done

### V1 — Foundation & First Pilot (Phases 0-9)
- [x] Install Pi packages (pi-web-access, pi-model-switch, pi-subagents, pi-interactive-shell, pi-interview, pi-review-loop, pi-prompt-template-model, mitsupi)
- [x] workflow-state.json + feature-list.json + progress.md schemas
- [x] ask-tool.ts — interactive gate approvals via ctx.ui.select
- [x] V1 skills: product-specify, product-clarify, auto-plan, build-loop, product-validate, auto-publish
- [x] Agents: reviewer.md, scout.md, spec-checker.md
- [x] REVIEW_GUIDELINES.md (P0/P1/P2 severity)
- [x] Model aliases (cheap/default/heavy) + cost protection
- [x] Product Constitution v1.1.0 (English, 7 principles)
- [x] Engineering Constitution template (in /setup)
- [x] Single repo on GitHub (github.com/bernajaber/pi-product-system)
- [x] install.sh / uninstall.sh (symlink-based)
- [x] /setup command as deterministic extension
- [x] README, CHANGELOG, PARA-BERNARDO.md, WORKFLOW-SPEC.md
- [x] End-to-end pilot with personal-crm (~/personal-crm) — ran successfully

### V2 — Architecture Design (2026-02-26)
- [x] Deep philosophy analysis: identified V1 violations of "do one thing well"
- [x] Identified build-loop does 3 things, product-specify does 3 things, product-clarify has no output
- [x] Designed 9-skill architecture: discovery, specify, plan, analyze, build, test, review, validate, publish
- [x] Designed 2 quality loops: documents (specify→plan→analyze) and code (build→test→review→validate)
- [x] Designed 3 gates: Gate 1 (brief), Gate 2 (plan summary), Gate 3 (verified product)
- [x] Resolved cascade rule: spec-problem → both re-run, plan-problem → plan only
- [x] Resolved code loop re-entry: scout maps failed scenario → specific task, surgical fix
- [x] Resolved escalation protocol: product-language message + 3 options via ask tool
- [x] Resolved validate dependency: implement last (Phase 3), other 8 skills first
- [x] Defined brief.md format: 6 sections, < 1 page, deep process but short output
- [x] Defined Gate 2 presentation: product-language summary, zero technology
- [x] Defined discovery depth: no round limit, terminates when zero assumptions remain
- [x] Defined review criteria V2: P0/P1 = what tests don't cover (UX, visual, principles)
- [x] Defined workflow-state.json V2: analyzeLoop + codeLoop fields for compaction survival
- [x] Removed project-tracker.ts (conflicting extension from pi-mono)
- [x] Confirmed agent-browser over surf (surf fails without Chrome open)
- [x] ARCHITECTURE-V2.md — complete spec with all 13 points resolved

---

## V2 Implementation

> Full spec in `docs/ARCHITECTURE-V2.md`. Each task references the relevant section.

### Phase 1 — Skills (no browser dependency)

**New skills:**
- [ ] `skills/discovery/SKILL.md` — deep interview + research → brief.md (ARCH-V2 §6)
- [ ] `skills/analyze/SKILL.md` — sub-agent reads brief+spec+plan+constitutions → critique.md (ARCH-V2 §7)
- [ ] `skills/test/SKILL.md` — `/loop tests`, objective condition (extracted from build-loop)
- [ ] `skills/review/SKILL.md` — `/review uncommitted`, P0/P1 criteria V2 (extracted from build-loop)

**Rewritten skills:**
- [ ] `skills/specify/SKILL.md` — input: brief.md only, output: spec.md only (no interview, no research)
- [ ] `skills/build/SKILL.md` — `/loop self`, one task = one commit (no tests, no review)

**Renamed skills:**
- [ ] `skills/auto-plan/` → `skills/plan/SKILL.md` (update content for V2 workflow)
- [ ] `skills/auto-publish/` → `skills/publish/SKILL.md` (update content for V2 workflow)

**Deleted skills:**
- [ ] Delete `skills/product-clarify/` (absorbed into discovery)
- [ ] Delete `skills/build-loop/` (split into build + test + review)
- [ ] Delete `skills/product-specify/` (replaced by specify)

### Phase 2 — Infrastructure

- [ ] Rewrite `extensions/product-setup/index.ts` — AGENTS.md template with V2 workflow + skill names (ARCH-V2 §5, §9)
- [ ] Add `gh repo create` to /setup — ask operator public/private after initial commit
- [ ] Rewrite `REVIEW_GUIDELINES.md` — V2 criteria: P0/P1 for what tests don't cover (ARCH-V2 §13)
- [ ] Update `workflow-state.json` schema — gates renamed, analyzeLoop + codeLoop fields (ARCH-V2 §14)
- [ ] Update `install.sh` — new skill names and paths (9 skills, not 6)
- [ ] Update `uninstall.sh` — match new skill names
- [ ] Update `README.md` — V2 architecture, new skill map, updated install

### Phase 3 — Browser + Validate

- [ ] Migrate browser commands from `surf` → `agent-browser` in skill templates
- [ ] `skills/validate/SKILL.md` — agent-browser, all scenarios, screenshots as evidence (ARCH-V2 §8)
- [ ] Hard requirement: "Verification MUST include at least one screenshot. No screenshot = no Gate 3."
- [ ] Delete `skills/product-validate/` (replaced by validate)

### Phase 4 — Verification

- [ ] Test install.sh in completely fresh environment
- [ ] Test uninstall.sh + reinstall cycle
- [ ] End-to-end pilot with real product using V2 flow
- [ ] Verify: discovery asks deep questions (no round limit)
- [ ] Verify: analyze loop catches spec/plan inconsistencies
- [ ] Verify: code loop re-entry is surgical (specific task, not full rebuild)
- [ ] Verify: escalation messages are in product language
- [ ] Verify: workflow-state survives compaction mid-loop

---

## Future

- [ ] Convert to proper pi package (`pi install git:github.com/bernajaber/pi-product-system`)
- [ ] Per-project constitution overrides
- [ ] Multi-feature workflow (parallel features, dependencies)
- [ ] Cost tracking per project
- [ ] Evaluate extensions: git-checkpoint, protected-paths, session-name, status-line, notify
