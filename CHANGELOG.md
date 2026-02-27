# Changelog

## v2.3.0 — 2026-02-27

### Fixed
- **Brownfield support**: agent was ignoring the pipeline and coding directly when adding a new feature to an existing project
  - Root cause: nothing enforced the workflow for `idle`/`init` phases — AGENTS.md alone was insufficient
  - Fix: `product-loop` sends a guided nudge on `session_start` with `triggerTurn=false` so it becomes context alongside the operator's first message
  - Three iterations to get right: `agent_end` (too late), `session_start + triggerTurn=true` (stole the turn), `session_start + triggerTurn=false` (correct)
- **Validate skill**: removed `file://` recommendation — ES modules fail with CORS on `file://` protocol
  - Both test features (propostas + dashboard) hit this issue; agent wasted time self-recovering
  - Now always requires HTTP server: `npx serve` as default, `python3 -m http.server` as fallback
- **Build skill**: removed `file://` verification reference, deferred visual verification to validate phase

### Added
- `GUIDED_PHASES` constant in product-loop: `['idle', 'init']` — phases that need a one-time workflow nudge
- `guidedNudgeSent` flag in loop state to prevent repeated nudges
- 4 new unit tests for guided-phase behavior (24 total for product-loop, 39 total across all extensions)

### Tested
- **Brownfield test**: added dashboard feature to existing proposal-generator app
  - Agent correctly read all existing code, created new specs alongside existing ones
  - Discovery asked targeted integration questions ("status field exists?", "separate page or same screen?")
  - 5 commits on `feature/proposal-dashboard` branch (878 lines, SVG chart, responsive CSS)
  - Review found P2 (dead CSS class) — no P0/P1
  - Validate got stuck (server startup issue in sandbox) but pipeline was 90% complete

## v2.2.0 — 2026-02-27

### Added
- Integration test: automated end-to-end pipeline verification via `interactive_shell` dispatch mode
  - `test/integration/setup-hello-world.sh` creates pre-seeded fixture at build phase
  - `test/integration/verify-hello-world.sh` runs 9 assertions on outcomes
  - Uses `PI_AUTO_TEST=true` to auto-approve gates — zero manual interaction
  - First run: full pipeline (build → test → review → validate → Gate 3 → publish) in ~4 minutes
  - Proves: product-loop wiring, sendMessage delivery, ask-tool auto-test, widget rendering, agent-browser screenshots
- README: added Testing section with commands for unit + integration tests

## v2.1.1 — 2026-02-27

### Fixed
- Plan skill marker mismatch: looked for wrong HTML comment in REVIEW_GUIDELINES.md (P0 — tech standards were never injected)
- ARCHITECTURE-V2.md §4/§5: removed V1 commands (`/loop self`, `/loop tests`, `/review uncommitted`) — now references `product-loop`
- Analyze skill: removed invalid `currentPhase: "gate2"` (not in valid phases — broke session restart)
- Product-loop: review cycle off-by-one — `>=` gave 2 reviews instead of 3 before force-proceed (now `>`)
- Product-loop: review cycle display showed cycle N+1 instead of cycle N (widget was inconsistent too)
- Build skill: removed "Git safety" section referencing non-existent `.pi/intercepted-commands`
- Discovery skill: now sets `currentPhase: "discovery"` at start (was stuck at "init" on session restart)
- CHANGELOG: all version dates corrected to 2026-02-27

### Added
- Discovery skill: guidance on choosing feature ID (kebab-case, used across all `.pi/specs/<id>/` paths)
- Validate skill: explicit workflow-state.json update instructions for code quality loop (codeLoop fields, scout flow, phase transition)

## v2.1.0 — 2026-02-27

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
