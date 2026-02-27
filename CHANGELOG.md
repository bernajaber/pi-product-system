# Changelog

## v2.1.0 — 2026-02-26

### Added
- `product-loop.ts` extension — autonomous workflow governor for build/test/review phases
  - Sends contextual follow-ups after each agent turn (Drive → Diagnose → Escalate)
  - Review rubric from REVIEW_GUIDELINES.md sent automatically, max 3 cycles enforced
  - Surgical fix mode: detects `codeLoop.lastFailedScenario` and sends targeted instructions
  - Compaction-safe, restart-safe (resumes loop on session_start), widget in TUI
- `ask` tool: improved multi-select with ☑/☐ indicators (index-based, no string-prefix hack)

### Changed
- All autonomous skills (build, test, review) no longer depend on operator slash commands
  - Removed: `/loop self`, `/loop tests`, `/review uncommitted`, `/end-review`, `signal_loop_success`
  - Replaced by: `product-loop.ts` extension which governs all three phases automatically
- `publish` skill: handles projects without `package.json` (skips `npm version`)
- `publish` skill: review summary goes in PR body (no separate `/review branch main` step)
- AGENTS.md template (product-setup): updated to reference product-loop, removed V1 commands
- `sendUserMessage` in product-setup replaced with `sendMessage` (correct API contract)

### Fixed
- Review phase could loop forever (no max cycle enforcement) — now capped at 3 by extension
- Code quality loop (validate fail → build fix) had no governance — product-loop now detects surgical fix mode
- Session restart during autonomous phase caused stall — product-loop now sends resume follow-up on session_start
- Review rubric was duplicated in 3 places — consolidated to REVIEW_GUIDELINES.md (single source of truth)

## v2.0.0 — 2026-02-27

### Architecture
- Complete redesign: 9 skills replacing 6, each with one input → one output → one responsibility
- 3 gates (was 4): Gate 1 = brief, Gate 2 = plan summary, Gate 3 = verified product
- 2 quality loops: document loop (specify → plan → analyze) and code loop (build → test → review → validate)
- Escalation protocol: product-language messages with consequence-based options

### New Skills
- `discovery`: deep interview with no round limit → `brief.md` (< 1 page, 6 sections)
- `analyze`: sub-agent consistency check → `critique.md` + reviewDepth + Gate 2
- `test`: extracted from build-loop → objective exit condition (tests green)
- `review`: extracted from build-loop → P0/P1 criteria for what tests can't catch

### Rewritten Skills
- `specify`: input is brief.md only (no interview, no research — pure spec writing)
- `build`: one task = one commit (no tests, no review — governed by product-loop)

### Renamed Skills
- `auto-plan` → `plan`: removed Gate 2 presentation (now analyze's job)
- `auto-publish` → `publish`: V2 workflow-state schema, `gh repo create` if no remote

### Removed Skills
- `product-clarify`: absorbed into `discovery`
- `product-specify`: replaced by `discovery` + `specify`
- `build-loop`: split into `build` + `test` + `review`

### Browser Migration
- `validate` skill uses `agent-browser` (Playwright, headless) instead of `surf` (required Chrome open)

### Infrastructure
- `product-setup/index.ts`: V2 AGENTS.md template, V2 workflow-state schema, V2 review guidelines
- `REVIEW_GUIDELINES.md`: V2 criteria (P0 = breaks something tests missed, P1 = constitution violation)
- `install.sh` / `uninstall.sh`: 9 V2 skill names
- Agents updated: reviewer (V2 context), scout (scenario → task mapping), spec-checker (brief+spec+plan)
- `.pi/AGENTS.md`: V2 architecture overview

### Removed
- `PROGRESS.md`: V1 development history (preserved in git log)
- `docs/WORKFLOW-SPEC.md`: archived to `docs/archive/` (superseded by ARCHITECTURE-V2.md)

## v0.1.0 — 2026-02-25

### Added
- Initial product creation system (V1)
- Skills: product-specify, product-clarify, auto-plan, build-loop, product-validate, auto-publish
- Extensions: product-setup (/setup command), ask-tool (interactive gates)
- Agents: reviewer, scout, spec-checker
- Product Constitution v1.1.0
- Engineering Constitution template
- REVIEW_GUIDELINES.md
- install.sh / uninstall.sh (symlink-based installation)
