# Changelog

## v2.0.0 — 2026-02-27

### Architecture
- Complete redesign: 9 skills replacing 6, each with one input → one output → one responsibility
- 3 gates (was 4): Gate 1 = brief, Gate 2 = plan summary, Gate 3 = verified product
- 2 quality loops: document loop (specify → plan → analyze) and code loop (build → test → review → validate)
- Escalation protocol: product-language messages with consequence-based options

### New Skills
- `discovery`: deep interview with no round limit → `brief.md` (< 1 page, 6 sections)
- `analyze`: sub-agent consistency check → `critique.md` + reviewDepth + Gate 2
- `test`: extracted from build-loop → `/loop tests` with objective exit condition
- `review`: extracted from build-loop → P0/P1 criteria for what tests can't catch

### Rewritten Skills
- `specify`: input is brief.md only (no interview, no research — pure spec writing)
- `build`: `/loop self` only (no tests, no review — one task = one commit)

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
