---
name: test
description: "Write and run automated tests for all acceptance scenarios. Uses /loop tests — objective exit condition: all tests green."
---

# Test Skill

## ⚠️ LANGUAGE: Test files and output in ENGLISH.

## What this skill does

ONE thing: ensure every acceptance scenario from the spec has a passing test.

- **Input:** committed code (output of `build` skill) + `.pi/specs/<feature>/spec.md`
- **Output:** all tests passing — `node tests/<feature>.test.js` exits with code 0

## Process

### Step 1: Read the spec

Read `.pi/specs/<feature>/spec.md` and identify every acceptance scenario.

### Step 2: Read the plan

Read `.pi/specs/<feature>/plan.md` — the last task should be "Write Tests" with specifics on what to test and how.

### Step 3: Write tests

Create test files in `tests/` directory:
- One file per feature: `tests/<feature>.test.js`
- Each acceptance scenario = at least one test case
- Use **Node.js `assert`** — no external test frameworks
- Each file must exit with code 0 on success, non-zero on failure

```javascript
// tests/shopping-list.test.js
import assert from 'node:assert';

// Test: User can add an item to the list
{
  // ... test implementation
  assert.strictEqual(result, expected, 'User should be able to add an item');
}

console.log('All tests passed');
```

For static HTML/JS apps: parse the HTML, simulate interactions via JS/DOM, assert state.
For apps with logic: test the logic functions directly.
For apps that are purely visual with no testable logic: validate HTML files exist, are well-formed, and contain expected content.

### Step 4: Run tests with /loop

Start the test loop:

```
/loop tests
```

This runs the tests with an objective exit condition: all tests pass (exit code 0).
- If tests fail → the loop retries automatically after you fix the issue
- Fix the code or the test (if the test is wrong), then let the loop re-run

### Step 5: Commit passing tests

When all tests pass:
```bash
git add tests/
git commit -m "test: add tests for <feature> acceptance scenarios"
```

### Step 6: Update state

Update `workflow-state.json`: set `currentPhase: "review"`.

## Test quality rules

- Every acceptance scenario from the spec MUST have a corresponding test
- Tests must be deterministic — no flaky tests, no timing dependencies
- Tests must be fast — no unnecessary delays or network calls
- Test names must describe the USER BEHAVIOR being tested, not the implementation:
  - ✅ "User can add an item to the list"
  - ❌ "addItem function returns correct array"
- Include at least one edge case test (empty input, boundary values)
- Include at least one error state test (if applicable to the feature)

## Rules

- Do NOT skip writing tests. Every plan includes a test task — this skill executes it.
- Do NOT use external test frameworks (Jest, Mocha, Vitest). Node.js `assert` is sufficient.
- If a test keeps failing after 3 attempts to fix: the problem might be in the build, not the test. Flag it for the code loop to handle.
- The test skill does NOT review code quality. That's the `review` skill's job.
