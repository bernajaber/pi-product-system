---
name: validate
description: "Verify the built product by walking through every acceptance scenario in the browser. Takes screenshots as evidence. Presents Gate 3."
---

# Validate Skill

## ⚠️ LANGUAGE: Evidence checklist in ENGLISH. Gate 3 presentation to operator in PORTUGUESE.

## What this skill does

ONE thing: verify that the built product works by testing every scenario in a real browser.

- **Input:** clean code (output of `review` skill) + `.pi/specs/<feature>/spec.md`
- **Output:** verified product + screenshots + evidence checklist

## Prerequisites

- `agent-browser` must be installed (`npm install -g agent-browser` or available as pi skill)
- Code must have passed `test` and `review` skills

## Process

### Step 1: Start the app

**For static HTML/JS apps (no server needed):**
```bash
agent-browser open "file:///absolute/path/to/index.html"
```

**For apps that require a server:**
```bash
# Start server in background
nohup node server.js > /dev/null 2>&1 & disown
sleep 2
# Verify it's up
curl -s http://localhost:4321 | head -5
# Open in browser
agent-browser open http://localhost:4321
```

**NEVER combine server start + browser open in one command.**

### Step 2: Set viewport

```bash
agent-browser set viewport 1440 900
```

Take an initial screenshot of the landing state:
```bash
agent-browser screenshot /tmp/validate-initial.png
```

### Step 3: Walk through EVERY acceptance scenario

Read `.pi/specs/<feature>/spec.md`. For EACH scenario:

1. **Interact:** Use agent-browser to perform the actions described in the scenario
   ```bash
   agent-browser snapshot -i          # See interactive elements
   agent-browser click @e1            # Click buttons
   agent-browser fill @e2 "text"      # Fill inputs
   agent-browser wait --text "Success" # Wait for expected result
   ```

2. **Verify:** Check that the expected behavior occurred
   ```bash
   agent-browser get text @e1         # Check text content
   agent-browser is visible @e1       # Check visibility
   agent-browser snapshot -i          # See current state
   ```

3. **Screenshot:** Capture evidence
   ```bash
   agent-browser screenshot /tmp/validate-scenario-N.png
   ```

4. **Record:** Mark as PASS or FAIL

### Step 4: Test responsive (if product has visual interface)

```bash
agent-browser set viewport 375 812    # Mobile
agent-browser screenshot /tmp/validate-mobile.png

agent-browser set viewport 768 1024   # Tablet
agent-browser screenshot /tmp/validate-tablet.png

agent-browser set viewport 1440 900   # Desktop (restore)
```

### Step 5: Cleanup

```bash
agent-browser close
# If server was started:
pkill -f "node server.js" 2>/dev/null || true
```

### Step 6: Evaluate results

**If ALL scenarios PASS:**
- Proceed to Gate 3

**If ANY scenario FAILS:**
- Do NOT present Gate 3
- Update `workflow-state.json` for the code quality loop:
  1. Increment `codeLoop.cycle` by 1
  2. Set `codeLoop.lastFailedScenario` to the scenario description that failed
  3. Check: if `codeLoop.cycle > codeLoop.maxCycles` → escalate to operator (see Escalation below). Stop here.
  4. Launch the `scout` agent (via pi-subagents) to diagnose root cause and map to a plan task
  5. Set `codeLoop.lastDiagnosis` to the scout's root cause description
  6. Set `codeLoop.lastReentryTask` to the mapped task (or `null` if systemic)
  7. Set `currentPhase: "build"` — this triggers the product-loop extension, which detects surgical fix mode from `codeLoop.lastFailedScenario` and sends targeted build instructions
- The code quality loop then runs automatically:
  - `build` fixes ONLY the mapped task (surgical fix)
  - `test` runs ALL tests (may have regressions)
  - `review` runs on ALL code
  - `validate` runs ALL scenarios again (you'll re-enter this skill)
  - Max 3 cycles total (tracked by `codeLoop.cycle`)

### Step 7: Present Gate 3 (in Portuguese)

Build a checklist from the scenario results:

"Verifiquei tudo e está funcionando! 🎉

**O que testei:**
☑️ [Scenario 1 — in product language]
☑️ [Scenario 2]
☑️ [Scenario N]

**Screenshots:** [list of screenshot paths or inline display]

Você pode testar em: [URL or localhost instruction]"

Then use the `ask` tool:

```
questions: [{
  id: "gate3",
  question: "Tudo funcionando como esperado?",
  options: [
    { label: "Tudo certo, pode publicar!" },
    { label: "Preciso de ajustes (vou descrever)" },
    { label: "Não é isso, precisa repensar" }
  ],
  recommended: 0
}]
```

### Gate 3 feedback paths

- **"Tudo certo, pode publicar!"** → Update `workflow-state.json`: set `gates.releaseApproved: true`, `currentPhase: "publish"`. Proceed to `publish` skill.
- **"Preciso de ajustes"** → Record feedback. Return to `build` phase for the specific adjustment. Do NOT redo Gate 2.
- **"Não é isso, precisa repensar"** → Record feedback. Return to `discovery` phase. Reset gates.

## Code quality loop escalation (after 3 cycles)

```
questions: [{
  id: "code-escalation",
  question: "[Descrição do cenário que falhou] não está funcionando depois de 3 tentativas. O que prefere?",
  options: [
    { label: "Entregar sem essa funcionalidade por agora" },
    { label: "Tentar de novo com uma abordagem diferente" },
    { label: "Voltar ao planejamento e repensar como fazer" }
  ]
}]
```

The message ALWAYS describes the consequence for the user, never the technical problem.

## Rules

- **MANDATORY:** At least 1 screenshot per scenario. No screenshot = no Gate 3.
- Use `agent-browser`, NOT `surf`. agent-browser is self-contained (Playwright, headless).
- Walk through EVERY scenario, not just the happy path.
- Screenshots should show the RESULT of the action, not just the initial state.
- Do NOT use the `interview` tool. Use `ask` tool for Gate 3 only.
