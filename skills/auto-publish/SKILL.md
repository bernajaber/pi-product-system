---
name: auto-publish
description: "After Gate 3 approval: push branch, create PR, review, merge, reset workflow for next feature cycle."
---

# Auto-Publish Skill

## When to Use
After Gate 3 is approved ("Tudo certo, pode publicar").

## Process

### Step 1: Push feature branch
```bash
git push origin feature/<id>
```

### Step 2: Create Pull Request
```bash
gh pr create \
  --title "feat: <feature name>" \
  --body "<PR description with acceptance scenarios checklist>" \
  --base main \
  --head feature/<id>
```

The PR body should include:
- Summary of what was built
- Acceptance scenarios as a checklist
- Link to the spec file
- Review depth classification

### Step 3: Wait for CI to pass
After creating the PR, GitHub Actions runs lint and tests automatically.

```bash
gh pr checks --watch
```

- If CI passes: proceed to Step 4
- If CI fails:
  1. Read the failure: `gh pr checks` to see which check failed
  2. Read the log: `gh run view <run-id> --log-failed`
  3. Fix the issue on the feature branch
  4. Push the fix: `git push origin <branch>`
  5. CI runs again automatically — repeat until green
  
**Do NOT merge a PR with failing CI.**

### Step 4: Review the PR
Run a review against main:
```bash
/review branch main
```
- If P0/P1 issues found: fix → push → re-review
- When clean: `/end-review`

### Step 5: Merge the PR
```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```

### Step 6: Tag version
```bash
# Update package.json version
npm version <new-version> --no-git-tag-version

git tag v<new-version>
git push origin v<new-version>
```
Versioning: patch for simple features, minor for medium, major for breaking changes.

### Step 7: Update artifacts

**feature-list.json** — mark completed feature as `"passes": true`

**workflow-state.json** — reset for next cycle:
```json
{
  "project": "<keep current>",
  "currentPhase": "init",
  "feature": {
    "id": "",
    "name": "",
    "branch": "",
    "reviewDepth": "simple"
  },
  "gates": {
    "specApproved": false,
    "buildApproved": false,
    "validationApproved": false
  },
  "phaseHistory": [],
  "scopeChanges": [],
  "iterationCount": 0,
  "failureCount": 0,
  "feedback": [],
  "version": "<new version>"
}
```

**progress.md** — add completion entry:
```
## Session: <feature name> delivered
### What was done
- <summary of what was built>
- PR: #<number>
- Version: v<new-version>
### Current state
- currentPhase: init (ready for next feature)
### Next steps
- Waiting for operator to describe the next feature
```

### Step 8: Update CHANGELOG.md (MANDATORY)

**⚠️ You MUST update the changelog. Do NOT skip this step.**

If CHANGELOG.md exists, add a new entry AT THE TOP (below the header), following Keep a Changelog format:

```markdown
## v<new-version> — <YYYY-MM-DD>

### Added
- <what was built, one bullet per feature>

### Fixed
- <bugs fixed during self-review, if any>
```

If CHANGELOG.md does not exist, create it with the entry above plus a header:
```markdown
# Changelog
```

### Step 9: Final commit
```bash
git add .
git commit -m "chore: reset workflow after <feature name> delivery"
git push origin main
```

### Step 10: Notify operator (in Portuguese)
"Feature entregue!

[resumo do que foi construído em 1-2 frases]

PR: [link do PR]
Versão: v<new-version>

Pronto para a próxima feature — é só descrever o que quer construir."

---

## Future: Adding Review Layers

The PR-based flow supports adding review layers later:
- **Automated CI**: add GitHub Actions to run tests on PR
- **Human review**: require approval before merge
- **Multi-agent review**: launch a reviewer sub-agent on the PR

To add a required review, just modify Step 4 to wait for approval before merging.
