# Validate V2 — Universal App Validation

> Design document for making the validate skill work with ANY application type,
> not just web apps served via HTTP.

## Problem

The current validate skill only supports web apps (Playwright via `agent-browser`).
This leaves out:
- **Tauri** apps (WebKit WebView inside native shell)
- **Electron** apps (Chromium inside native shell)
- **Native macOS** apps (Swift/SwiftUI, AppKit)
- **Flutter** desktop apps
- **Qt / GTK** apps
- **CLI** apps (TUI or stdout-based)

Validation requires two capabilities:
1. **Screenshot** — visual evidence that the UI looks right
2. **Interaction** — click buttons, fill forms, navigate, verify state

## Validation Strategies

Three strategies, chosen by the plan skill based on the stack:

### Strategy 1: `web` (current — Playwright)

**For:** Web apps, SPAs served by a dev server (`npm run dev`, `python -m http.server`, etc.)

**How:**
- Start dev server in background
- `agent-browser open http://localhost:PORT`
- Full Playwright interaction: click, fill, wait, screenshot
- Rich assertions: text content, visibility, DOM state

**Interaction:** Full (click, fill, type, wait, assert)
**Screenshots:** Playwright's built-in screenshot
**Precision:** Pixel-perfect, repeatable

### Strategy 2: `dev-server` (hybrid — Playwright for UI, native for integration)

**For:** Apps that have a web frontend but native backend (Tauri, Electron)

The frontend runs standalone via its dev server (`npm run dev`), which gives
Playwright full access to the UI. Backend features that require IPC (like audio
capture in Factae) are validated separately via unit tests and the native strategy.

**How:**
- Start frontend dev server: `npm run dev` (Vite, Webpack, etc.)
- `agent-browser open http://localhost:PORT`
- Walk through UI scenarios the same way as `web` strategy
- For backend-dependent features: note as "requires native validation" and use
  Strategy 3 for those specific scenarios

**Interaction:** Full for UI, limited for native features
**Screenshots:** Playwright
**Precision:** High for UI layout/design, partial for integration

**When to combine with `native`:**
- IPC-dependent features (Tauri invoke, Electron ipcRenderer)
- OS-level features (audio capture, file system, notifications)
- Permission prompts (Screen Recording, Accessibility, etc.)

### Strategy 3: `native` (universal — screencapture + osascript + cliclick)

**For:** Any app that runs on macOS. Universal fallback.

**How:**
1. Launch the app binary
2. Find its window via `CGWindowListCopyWindowInfo` (swift one-liner)
3. Capture screenshots via `screencapture -l <windowID> -o`
4. Interact via `cliclick` (coordinate-based clicks/typing) or `osascript`
5. LLM evaluates screenshots to verify scenarios

**Interaction:** Coordinate-based (less precise, but universal)
**Screenshots:** `screencapture` (native macOS, pixel-perfect)
**Precision:** Good for visual verification, weaker for precise DOM assertions

#### Tools required

| Tool | Purpose | Install |
|------|---------|---------|
| `screencapture` | Window screenshot | Built-in macOS |
| `swift` | List windows + get IDs | Built-in macOS (Xcode CLT) |
| `osascript` | AppleScript UI automation | Built-in macOS |
| `cliclick` | Coordinate-based mouse/keyboard | `brew install cliclick` |

#### Permission requirements

| Permission | Needed for | How to grant |
|------------|-----------|--------------|
| Accessibility | `osascript` UI interaction, `cliclick` | System Settings → Privacy → Accessibility → iTerm2 |
| Screen Recording | `screencapture -l` (window capture) | System Settings → Privacy → Screen Recording → iTerm2 |

#### Core primitives

**Find window:**
```bash
swift -e '
import Cocoa
let ws = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
for w in ws {
    let name = w["kCGWindowOwnerName"] as? String ?? ""
    let wid = w["kCGWindowNumber"] as? Int ?? 0
    let b = w["kCGWindowBounds"] as? [String: Any] ?? [:]
    if name.lowercased().contains("APP_NAME") {
        print("\(wid) \(b["X"]!),\(b["Y"]!) \(b["Width"]!)x\(b["Height"]!)")
    }
}
'
```

**Screenshot:**
```bash
screencapture -l <windowID> -o /tmp/screenshot.png
```

**Click at coordinates:**
```bash
cliclick c:<x>,<y>          # click
cliclick dc:<x>,<y>         # double-click
cliclick m:<x>,<y>          # move mouse
```

**Type text:**
```bash
cliclick t:"hello world"    # type text
cliclick kp:return          # press key
cliclick kp:tab             # tab key
```

**Bring app to front:**
```bash
osascript -e 'tell application "APP_NAME" to activate'
```

**Wait for window:**
```bash
# Poll until window appears (max 10s)
for i in $(seq 1 20); do
    WID=$(swift -e '...' 2>/dev/null)
    [ -n "$WID" ] && break
    sleep 0.5
done
```

### Strategy choice: CLI apps

For CLI/TUI apps, none of the above strategies fit well. The validate skill
should detect this (no UI framework in stack) and skip visual validation,
relying entirely on the automated tests from the `test` skill. The Gate 3
presentation shows test results instead of screenshots.

## How the Plan Skill Declares Strategy

The `plan.md` template gets a new section:

```markdown
## Validation Strategy
- **Type**: web | dev-server | native | cli
- **Start command**: `npm run dev` / `cargo tauri dev` / `open ./build/MyApp.app` / etc.
- **URL or app name**: `http://localhost:5173` / `"Factae"` / etc.
- **Notes**: [e.g., "Audio capture scenarios require native strategy"]
```

The validate skill reads this and dispatches accordingly.

## How Validate Uses the Strategy

### Startup sequence

```
1. Read plan.md → extract Validation Strategy
2. Based on type:
   a. web       → start server, agent-browser open URL
   b. dev-server → start frontend dev server, agent-browser open URL
   c. native    → launch app, find window ID, verify visible
   d. cli       → skip visual, present test results at Gate 3
3. Take initial screenshot
4. Walk through acceptance scenarios
```

### Scenario walkthrough (native strategy)

For each acceptance scenario:

1. **Screenshot** current state → `/tmp/validate-before-N.png`
2. **Read** the screenshot to understand current UI state
3. **Interact** using cliclick/osascript based on what's visible
4. **Wait** briefly for UI to update (sleep 0.5-1s)
5. **Screenshot** result → `/tmp/validate-after-N.png`
6. **Evaluate** — LLM compares before/after with expected behavior
7. **Record** PASS/FAIL with evidence

The LLM does the heavy lifting here — it sees the screenshots and determines
if the scenario passed. This is less precise than Playwright DOM assertions
but works for ANY app.

### Mixed strategy (dev-server + native)

Some scenarios can be validated via dev-server (UI layout, form validation,
navigation), while others need the full native app (audio capture, IPC,
permissions). The validate skill handles both:

```
For each scenario:
  if scenario.needs_native_backend:
    use native strategy (screencapture + cliclick)
  else:
    use web strategy (Playwright via dev server)
```

The plan marks which scenarios need native validation. By default, pure UI
scenarios use the dev-server strategy (faster, more reliable).

## What Changes

### plan.md template (plan skill)
- Add `## Validation Strategy` section with type, start command, URL/app name

### validate SKILL.md
- Add strategy detection from plan.md
- Add native strategy instructions (screencapture, cliclick, osascript)
- Add dev-server strategy instructions (frontend-only Playwright)
- Keep web strategy as-is (current behavior)
- Add mixed strategy for dev-server+native combo
- Add CLI strategy (test-results-only Gate 3)

### Prerequisites
- `cliclick` installed for native strategy (`brew install cliclick`)
- Accessibility + Screen Recording permissions for iTerm2/terminal
- `agent-browser` still required for web/dev-server strategies

## Edge Cases

### App takes a long time to start
Native apps (especially Rust/Tauri) can take 5-30s to start.
The validate skill should poll for the window with a timeout, not assume instant startup.

### Multiple windows
Some apps open multiple windows (e.g., Tauri main + overlay).
The swift window-finder should return ALL windows for the app, and the skill
should capture/interact with each as needed.

### Retina displays
`screencapture -l` on macOS captures at native resolution (2x on Retina).
Coordinates for `cliclick` use logical points, not physical pixels.
No conversion needed — cliclick and screencapture both use logical coordinates.

### App is already running
The validate skill should check if the app is already running before launching.
If it is, it can reuse the existing instance (saves startup time).

## Non-goals

- **Windows/Linux support** — macOS only for now. `screencapture` and `osascript` are macOS-specific. Cross-platform would need different tools per OS.
- **Automated coordinate mapping** — The LLM reads screenshots and figures out where to click. No need for automated UI element detection at this stage.
- **CI/headless mode** — Native strategy requires a display. For CI, use the web/dev-server strategy only.
