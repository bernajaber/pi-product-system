---
name: publish
description: "After Gate 3 approval: push branch, create PR, merge, tag, update changelog, and reset workflow for the next feature."
---

# Publish Skill

## ⚠️ LANGUAGE: All artifacts in ENGLISH. Final notification to operator in PORTUGUESE.

## What this skill does

ONE thing: release the approved feature.

- **Input:** Gate 3 approval (`gates.releaseApproved: true` in workflow-state.json)
- **Output:** published release — PR merged, version tagged, changelog updated, workflow reset

## When to use

After Gate 3 is approved ("Tudo certo, pode publicar").

## Process (8 steps — one atomic release)

### Step 1: Ensure remote exists

```bash
git remote get-url origin 2>/dev/null
```

If no remote exists, create one:
```bash
gh repo create <project-name> --private --source=. --remote=origin
```
Ask the operator first:
```
questions: [{
  id: "repo-visibility",
  question: "Vou criar o repositório no GitHub. Prefere público ou privado?",
  options: [
    { label: "Privado" },
    { label: "Público" }
  ],
  recommended: 0
}]
```

### Step 2: Push feature branch

```bash
git push origin feature/<id>
```

### Step 3: Create Pull Request

```bash
gh pr create \
  --title "feat: <feature name>" \
  --body "<PR description with acceptance scenarios checklist>" \
  --base main \
  --head feature/<id>
```

PR body includes:
- Summary of what was built
- Acceptance scenarios as a checklist
- Review depth classification

### Step 4: Wait for CI (if configured)

```bash
gh pr checks --watch
```

- If CI passes: proceed
- If CI fails: read logs, fix, push fix, repeat until green
- If no CI configured: proceed immediately

**Do NOT merge a PR with failing CI.**

### Step 5: Include review summary in PR

Update the PR body to include what the review phase found and fixed:

```bash
gh pr edit --body "<updated body with review findings summary>"
```

The code was already reviewed in the review phase. No second review needed here.

### Step 6: Merge the PR

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```

### Step 7: Tag version and update artifacts

**Version bump:**

If the project has a `package.json`:
```bash
npm version <new-version> --no-git-tag-version
```

If there is no `package.json` (simple HTML/JS projects), skip `npm version` — just tag directly:
```bash
git tag v<new-version>
```

Versioning: patch for simple features, minor for medium, major for breaking changes.

**feature-list.json** — mark feature as done:
- Read `.pi/feature-list.json`, find the entry with the current feature ID, set `"status": "done"`. Write back.

**workflow-state.json** — reset for next cycle:
```json
{
  "currentPhase": "init",
  "feature": null,
  "gates": { "briefApproved": false, "planApproved": false, "releaseApproved": false },
  "analyzeLoop": { "cycle": 0, "maxCycles": 3, "lastIssueType": null, "lastIssueSummary": null },
  "codeLoop": { "cycle": 0, "maxCycles": 3, "lastFailedScenario": null, "lastDiagnosis": null, "lastReentryTask": null },
  "failureCount": 0,
  "version": "<new version>"
}
```

**CHANGELOG.md** — add entry at the top:
```markdown
## v<new-version> — <YYYY-MM-DD>

### Added
- <what was built, one bullet per feature>

### Fixed
- <bugs fixed during review, if any>
```
If CHANGELOG.md doesn't exist, create it with a `# Changelog` header.

### Step 8: Final commit and push

```bash
git add .
git commit -m "chore: reset workflow after <feature name> delivery"
git push origin main
git push origin v<new-version>
```

## Notify operator (in Portuguese)

After all 8 steps:

"Feature entregue! 🎉

[resumo do que foi construído em 1-2 frases]

PR: [link]
Versão: v<new-version>

Pronto para a próxima feature — é só descrever o que quer construir."

## Rules

- All 8 steps must complete. If any step fails, fix it before moving on.
- Do NOT merge a PR with failing CI.
- Do NOT skip the CHANGELOG update. It's mandatory.
- The workflow-state.json reset must use the V2 schema (with analyzeLoop and codeLoop fields).
- Do NOT use the `interview` tool. Use `ask` tool only for repo visibility (Step 1, if needed).
