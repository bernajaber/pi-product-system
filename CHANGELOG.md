# Changelog

## [0.1.0] — 2026-02-26

### Added
- Product Constitution v1.1.0 (English)
- Engineering Constitution template (created by `/setup`)
- 6 skills: product-specify, auto-plan, build-loop, product-validate, product-clarify, auto-publish
- 2 extensions: product-setup (`/setup` command), ask-tool (interactive gates)
- 3 agents: reviewer, scout, spec-checker
- Review Guidelines (P0/P1/P2 severity levels)
- `install.sh` / `uninstall.sh` for symlink-based installation
- Full workflow: `/setup` → Gate 1 (spec) → Gate 2 (plan) → Gate 3 (build) → Gate 4 (validate)

### Changed
- Migrated from scattered locations to single repository
- All artifacts in English (operator communication remains in Portuguese)
- Skills now explicitly prohibit `interview` tool — use natural chat or `ask` tool only
- `product-specify` now requires research step before writing spec
- Removed model-switching prompt templates (spec-mode, review-mode, heavy-debug)

### Architecture Decisions
- **Option D chosen**: file-based workflow (AGENTS.md + skills) over enforcement extension
- **`/setup` as extension**: deterministic file creation, not LLM-interpreted prompt template
- **Symlinks over copies**: edit in repo, changes take effect immediately
- **Global Product Constitution, per-project Engineering Constitution**: operator principles are universal, technical standards can vary
