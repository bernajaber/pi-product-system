# Integration Tests

Automated end-to-end tests that verify the product system works in a real pi session.
Uses `interactive_shell` (dispatch mode) + `PI_AUTO_TEST=true` to run without manual interaction.

## What these tests verify

| Component | What's tested |
|-----------|--------------|
| **product-loop** | `agent_end` fires → reads workflow-state → sends follow-up → agent receives it → loop continues |
| **ask-tool** | `PI_AUTO_TEST=true` auto-approves Gate 3 |
| **product-setup** | AGENTS.md and workflow-state.json are read correctly by the agent |
| **Skills chain** | build → test → review → validate → publish transitions work |
| **Widget** | TUI widget renders phase + progress (visible in overlay) |
| **agent-browser** | Screenshots captured during validate phase |

## Tests

### Hello World (`setup-hello-world.sh` + `verify-hello-world.sh`)

**Product:** A single static HTML page with "Hello World" centered on a blue background.

**Pre-seeded state:** All docs written (brief, spec, plan, critique), Gate 2 approved, build phase.

**Expected flow:**
1. Agent reads AGENTS.md → sees build phase
2. Product-loop sends build follow-up → agent creates `index.html` → commits
3. Product-loop detects done → sends "transition to test"
4. Agent writes tests → runs → pass → commits
5. Product-loop → "transition to review"
6. Agent reviews code → clean
7. Product-loop → "transition to validate"
8. Agent opens page with agent-browser → screenshots → Gate 3 (auto-approved)
9. Agent transitions to publish → goes quiet → auto-exit

**Duration:** ~4 minutes | **Cost:** ~$0.70 (Opus)

## How to run

### Step 1: Create fixture

```bash
bash test/integration/setup-hello-world.sh /tmp/test-product-loop
```

### Step 2: Launch pi via interactive_shell (from a pi session)

```
interactive_shell({
  command: 'PI_AUTO_TEST=true pi "Read .pi/AGENTS.md for the workflow. Read .pi/workflow-state.json for current state. You are in the build phase with Gate 2 approved. Start implementing according to the build skill."',
  mode: "dispatch",
  cwd: "/tmp/test-product-loop",
  name: "integration-test",
  handsFree: { autoExitOnQuiet: true, quietThreshold: 90000, gracePeriod: 45000 },
  timeout: 480000
})
```

### Step 3: Verify outcomes (after session completes)

```bash
bash test/integration/verify-hello-world.sh /tmp/test-product-loop
```

Expected output:
```
🎉 INTEGRATION TEST PASSED
   The product-loop successfully drove the agent through autonomous phases.
   Final phase: publish | Commits: 2
```

## Key assertion

The test PASSES if:
- `currentPhase` is beyond "build" (agent progressed)
- Feature branch has commits beyond main (agent built something)

This proves the product-loop's `agent_end` → `readWorkflowState` → `phaseFollowUp` → `sendMessage` wiring works in a real pi session.

## Prerequisites

- Pi installed with product system (`bash install.sh`)
- `agent-browser` available (for validate phase screenshots)
- Git configured (for commits)
- An LLM API key configured in pi (test costs ~$0.70 with Opus)
