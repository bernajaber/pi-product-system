---
name: product-validate
description: "Verify the build locally, generate behavioral checklist, and present Gate 3 to the operator."
---

# Product Validate Skill

## Step 1: Open the App

**For static HTML/JS apps (no build step):** use `file://` protocol directly — NO server needed:
```bash
surf window.new "file:///absolute/path/to/index.html"
```

**For apps that require a server (API, SSR, frameworks):** start with TWO SEPARATE bash commands:
```bash
# Command 1 (returns immediately):
nohup python3 -m http.server 4321 --directory app > /dev/null 2>&1 & disown
```
```bash
# Command 2 (separate bash call — verify it's up):
sleep 1 && curl -s http://localhost:4321 | head -5
```
Then: `surf window.new http://localhost:4321`

**NEVER combine server start + verify in one command. NEVER use `command &` without `nohup` + `disown`.**

## Step 2: Open Browser and Verify

```bash
surf window.new http://localhost:4321
```
This returns a window ID. Use it for ALL subsequent commands:
```bash
surf --window-id <ID> screenshot /tmp/verify-scenario-1.png
surf --window-id <ID> read
surf --window-id <ID> go http://localhost:4321/other-page
```

If surf is not available, fall back to `curl` checks for content verification.

## Step 3: Walk Through Acceptance Scenarios

For each scenario in `.pi/specs/<feature>/spec.md`:
1. Perform the action described in the scenario
2. Take a screenshot as evidence
3. Record: ✅ pass or ❌ fail

**If ANY scenario fails:** do NOT present Gate 3. Go back to build phase, fix, and re-verify.

## Step 4: Cleanup

```bash
pkill -f "serve.*4321"
surf window.close <ID>
```

## Step 5: Present Gate 3 (in Portuguese)

Build a checklist from the spec scenarios and present to the operator:

"Construí tudo e já verifiquei que está funcionando. Aqui está o que você pode testar:

[checklist of scenarios in product language — Portuguese]

Você pode testar em: [URL or localhost instruction]"

Then ask the operator directly in Portuguese for approval:
- "✅ Tudo certo, pode publicar"
- "🔧 Preciso de ajustes (vou descrever)"
- "❌ Não é isso, preciso repensar"

Use the `ask` tool to present options to the operator. Do NOT use the `interview` tool or any other form/wizard.

## If Operator Requests Adjustments
1. Record feedback in `workflow-state.json feedback[]` with timestamp
2. Increment `iterationCount`
3. Return to `build` phase — fix → self-review → Gate 3 again
4. Do NOT redo Gate 2

## If Operator Says "Not What I Wanted"
1. Record in `workflow-state.json feedback[]`
2. Return to `specify` phase
3. Reset gates: `specApproved: false`, `buildApproved: false`
