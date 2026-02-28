---
name: validate
description: "Verify the built product by walking through every acceptance scenario. Takes screenshots as evidence. Presents Gate 3."
---

# Validate Skill

## ⚠️ LANGUAGE: Evidence checklist in ENGLISH. Gate 3 presentation to operator in PORTUGUESE.

## What this skill does

ONE thing: verify that the built product works by testing every acceptance scenario.

- **Input:** clean code (output of `review` skill) + `.pi/specs/<feature>/spec.md` + `.pi/specs/<feature>/plan.md`
- **Output:** verified product + screenshots + evidence checklist

## Prerequisites

- Code must have passed `test` and `review` skills
- Read `plan.md` to understand the stack and determine validation strategy

## Step 0: Choose Validation Strategy

Read `.pi/specs/<feature>/plan.md` — specifically the Stack section. Based on the stack, choose ONE strategy:

| Stack | Strategy | Tools |
|-------|----------|-------|
| Web app (React/Vue/vanilla served by HTTP) | **web** | `agent-browser` (Playwright) |
| Tauri / Electron (web frontend + native backend) | **dev-server** | `agent-browser` + `screencapture` for native features |
| Native macOS (Swift, SwiftUI, AppKit) | **native** | `screencapture` + `cliclick` + `osascript` |
| Flutter desktop | **native** | `screencapture` + `cliclick` + `osascript` |
| CLI / TUI (no visual UI) | **cli** | Test results only — skip visual validation |

**Heuristics if unsure:**
- `tauri.conf.json` exists → **dev-server**
- `electron` in package.json → **dev-server**
- `.xcodeproj` or `Package.swift` with UI framework → **native**
- `package.json` with `dev` script, no native shell → **web**
- No UI framework in stack → **cli**

---

## Strategy: `web` (Playwright via HTTP)

For web apps served by a dev server or static HTTP server.

### Start the app

**⚠️ ALWAYS use an HTTP server.** The `file://` protocol does NOT work with ES modules.

**For static HTML/JS/CSS apps:**
```bash
npx -y serve -l 4321 &>/dev/null & disown
sleep 2
curl -s http://localhost:4321 | head -5
agent-browser open http://localhost:4321
```

**For apps with a custom server:**
```bash
nohup node server.js > /dev/null 2>&1 & disown
sleep 2
curl -s http://localhost:4321 | head -5
agent-browser open http://localhost:4321
```

**NEVER combine server start + browser open in one command.**

**If port is occupied:**
```bash
lsof -i :4321
kill $(lsof -ti :4321) 2>/dev/null
```

### Set viewport and take initial screenshot

```bash
agent-browser set viewport 1440 900
agent-browser screenshot /tmp/validate-initial.png
```

### Walk through scenarios

For EACH acceptance scenario:

1. **Interact:**
   ```bash
   agent-browser snapshot -i          # See interactive elements
   agent-browser click @e1            # Click buttons
   agent-browser fill @e2 "text"      # Fill inputs
   agent-browser wait --text "Success" # Wait for expected result
   ```

2. **Verify:**
   ```bash
   agent-browser get text @e1         # Check text content
   agent-browser is visible @e1       # Check visibility
   ```

3. **Screenshot:** `agent-browser screenshot /tmp/validate-scenario-N.png`

4. **Record:** PASS or FAIL

### Test responsive (if visual interface)

```bash
agent-browser set viewport 375 812    # Mobile
agent-browser screenshot /tmp/validate-mobile.png
agent-browser set viewport 768 1024   # Tablet
agent-browser screenshot /tmp/validate-tablet.png
agent-browser set viewport 1440 900   # Desktop (restore)
```

### Cleanup

```bash
agent-browser close
pkill -f "serve -l" 2>/dev/null || true
```

---

## Strategy: `dev-server` (Playwright for UI + native for backend features)

For apps with a web frontend inside a native shell (Tauri, Electron).

**Principle:** Most acceptance scenarios test UI behavior (layout, forms, navigation, states).
These work perfectly against the standalone dev server. Only scenarios that depend on
native backend features (IPC, audio, filesystem, OS permissions) need the full native app.

### Start the frontend dev server

```bash
npm run dev &>/dev/null & disown
sleep 3
curl -s http://localhost:5173 | head -5   # Vite default port
agent-browser open http://localhost:5173
```

### Walk through UI scenarios via Playwright

Same as `web` strategy — use `agent-browser` for all scenarios that don't require
the native backend. This covers:
- Layout and visual design
- Form validation and input handling
- Navigation and routing
- Empty states and error states
- Responsive design

### For scenarios that need the native backend

Switch to the **native** strategy for these specific scenarios:

1. Stop the dev server: `pkill -f "vite" 2>/dev/null || true`
2. Launch the full app (see native strategy below)
3. Validate those specific scenarios via `screencapture` + `cliclick`
4. Take screenshots as evidence

**Mark in the evidence checklist which strategy was used for each scenario.**

### Cleanup

```bash
agent-browser close
pkill -f "vite" 2>/dev/null || true
# If native app was launched:
pkill -f "APP_NAME" 2>/dev/null || true
```

---

## Strategy: `native` (universal macOS — any app)

For any application that runs on macOS: Swift, Tauri, Electron, Flutter, Qt, or anything else.

### Prerequisites

- **`cliclick`** — install with `brew install cliclick` if not present
- **Accessibility permission** — System Settings → Privacy → Accessibility → terminal app
- **Screen Recording permission** — System Settings → Privacy → Screen Recording → terminal app

Check before starting:
```bash
which cliclick || brew install cliclick
```

### Launch the app

```bash
# For Tauri:
cargo tauri dev &>/dev/null & disown

# For a built .app bundle:
open ./target/debug/bundle/macos/MyApp.app

# For Swift:
swift run &>/dev/null & disown

# For Electron:
npx electron . &>/dev/null & disown
```

### Wait for the window to appear

Poll until the window is visible (max 30s for compiled apps like Tauri):

```bash
APP_NAME="MyApp"  # Case-insensitive match
for i in $(seq 1 60); do
    WID=$(swift -e "
import Cocoa
let ws = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
for w in ws {
    let name = w[\"kCGWindowOwnerName\"] as? String ?? \"\"
    if name.lowercased().contains(\"${APP_NAME,,}\") {
        print(w[\"kCGWindowNumber\"] as? Int ?? 0)
        break
    }
}
" 2>/dev/null)
    [ -n "$WID" ] && [ "$WID" != "0" ] && break
    sleep 0.5
done
echo "Window ID: $WID"
```

### Bring app to front and take initial screenshot

```bash
osascript -e "tell application \"$APP_NAME\" to activate"
sleep 0.5
screencapture -l $WID -o /tmp/validate-initial.png
```

### Walk through scenarios

For EACH acceptance scenario:

1. **Screenshot current state:**
   ```bash
   screencapture -l $WID -o /tmp/validate-before-N.png
   ```

2. **Read the screenshot** — examine it to understand what's visible on screen and
   where interactive elements are located. Use this to determine click coordinates.

3. **Interact using cliclick:**
   ```bash
   # Click a button (coordinates from reading the screenshot)
   cliclick c:<x>,<y>

   # Double-click
   cliclick dc:<x>,<y>

   # Type text into a focused field
   cliclick t:"hello world"

   # Press specific keys
   cliclick kp:return       # Enter
   cliclick kp:tab          # Tab
   cliclick kp:escape       # Escape
   cliclick kp:delete       # Backspace

   # Keyboard shortcut (e.g., Cmd+A to select all)
   cliclick kd:cmd a ku:cmd
   ```

4. **Wait for UI to update:**
   ```bash
   sleep 1   # Adjust based on expected response time
   ```

5. **Screenshot result:**
   ```bash
   screencapture -l $WID -o /tmp/validate-after-N.png
   ```

6. **Evaluate** — Read the after screenshot. Compare with expected behavior from
   the acceptance scenario. The screenshot IS the evidence.

7. **Record** PASS or FAIL

### Multiple windows

Some apps have multiple windows (e.g., Tauri main window + overlay).
Find all windows:

```bash
swift -e '
import Cocoa
let ws = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
for w in ws {
    let name = w["kCGWindowOwnerName"] as? String ?? ""
    if name.lowercased().contains("APP_NAME") {
        let wid = w["kCGWindowNumber"] as? Int ?? 0
        let title = w["kCGWindowName"] as? String ?? ""
        let b = w["kCGWindowBounds"] as? [String: Any] ?? [:]
        print("wid=\(wid) title=\"\(title)\" at \(b["X"]!),\(b["Y"]!) \(b["Width"]!)x\(b["Height"]!)")
    }
}
'
```

Capture each window separately by its WID.

### Cleanup

```bash
pkill -f "APP_NAME" 2>/dev/null || true
# Or for Tauri dev:
pkill -f "cargo-tauri" 2>/dev/null || true
```

---

## Strategy: `cli` (no visual UI)

For CLI tools, TUI apps, or backend-only projects.

Skip visual validation entirely. Gate 3 presents test results instead of screenshots:

- All automated tests must pass (from `test` skill)
- Show the test output as evidence
- The operator reviews test coverage instead of screenshots

---

## Step 1: Walk through EVERY acceptance scenario

Regardless of strategy, walk through **every** scenario from `.pi/specs/<feature>/spec.md`.

- At least **1 screenshot per scenario** (except `cli` strategy)
- Screenshots show the **RESULT** of the action, not just the initial state
- Record each as PASS or FAIL with the screenshot path as evidence

## Step 2: Evaluate results

**If ALL scenarios PASS:**
- Proceed to Gate 3

**If ANY scenario FAILS:**
- Do NOT present Gate 3
- Update `workflow-state.json` for the code quality loop:
  1. Increment `codeLoop.cycle` by 1
  2. Set `codeLoop.lastFailedScenario` to the scenario description that failed
  3. Check: if `codeLoop.cycle > codeLoop.maxCycles` → escalate to operator (see Escalation below). Stop here.
  4. Launch the `scout` agent to diagnose root cause:
     ```
     subagent({
       agent: "scout",
       task: "Scenario failed: [description]. Investigate root cause.\n\nSpec: [paste spec.md]\nPlan: [paste plan.md]"
     })
     ```
  5. Set `codeLoop.lastDiagnosis` to the scout's root cause description
  6. Set `codeLoop.lastReentryTask` to the mapped task (or `null` if systemic)
  7. Set `currentPhase: "build"` — this triggers the product-loop extension, which detects surgical fix mode from `codeLoop.lastFailedScenario` and sends targeted build instructions
- The code quality loop then runs automatically:
  - `build` fixes ONLY the mapped task (surgical fix)
  - `test` runs ALL tests (may have regressions)
  - `review` runs on ALL code
  - `validate` runs ALL scenarios again (you'll re-enter this skill)
  - Max 3 cycles total (tracked by `codeLoop.cycle`)

## Step 3: Present Gate 3 (in Portuguese)

Build a checklist from the scenario results:

"Verifiquei tudo e está funcionando! 🎉

**O que testei:**
☑️ [Scenario 1 — in product language]
☑️ [Scenario 2]
☑️ [Scenario N]

**Screenshots:** [list of screenshot paths or inline display]

**Estratégia usada:** [web / dev-server / native / cli]

Você pode testar em: [URL, localhost instruction, or 'abra o app']"

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

- **MANDATORY:** At least 1 screenshot per scenario (except `cli` strategy). No screenshot = no Gate 3.
- Choose the right strategy based on the stack in plan.md. Don't default to `web` for everything.
- Walk through EVERY scenario, not just the happy path.
- Screenshots should show the RESULT of the action, not just the initial state.
- For `native` strategy: always read screenshots before interacting — coordinates come from understanding what's on screen.
- For `dev-server` strategy: mark which scenarios used Playwright vs native capture.
- Do NOT use the `interview` tool. Use `ask` tool for Gate 3 only.
- `cliclick` coordinates use logical points (not retina pixels). Same coordinate space as window positions.
