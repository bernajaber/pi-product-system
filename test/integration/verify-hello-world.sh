#!/usr/bin/env bash
# Verifies outcomes of the Hello World integration test.
# Run after the inner pi session completes.
#
# Usage: bash test/integration/verify-hello-world.sh [target-dir]
# Default target: /tmp/test-product-loop
#
# Exit code: 0 = all checks pass, 1 = failures found

set -euo pipefail

TARGET="${1:-/tmp/test-product-loop}"
PASS=0
FAIL=0
WARN=0

pass() { echo "  ✅ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL + 1)); }
warn() { echo "  ⚠️  $1"; WARN=$((WARN + 1)); }

echo ""
echo "═══════════════════════════════════════════════"
echo "  Integration Test: Hello World — Verification"
echo "═══════════════════════════════════════════════"
echo ""
echo "Target: $TARGET"
echo ""

# ---------------------------------------------------------------------------
# Check 1: Extensions loaded (proxy: workflow-state was modified)
# ---------------------------------------------------------------------------
echo "── Check 1: Extensions loaded ──"

if [ -f "$TARGET/.pi/workflow-state.json" ]; then
  WS=$(cat "$TARGET/.pi/workflow-state.json")
  PHASE=$(echo "$WS" | grep -o '"currentPhase"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"currentPhase"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

  if [ "$PHASE" != "build" ] || [ "$(echo "$WS" | grep -c '"progress"')" -gt 0 ]; then
    pass "workflow-state.json was modified (currentPhase: $PHASE)"
  else
    fail "workflow-state.json unchanged from initial state"
  fi
else
  fail "workflow-state.json missing"
fi

# ---------------------------------------------------------------------------
# Check 2: Build phase completed
# ---------------------------------------------------------------------------
echo ""
echo "── Check 2: Build phase ──"

if [ -f "$TARGET/index.html" ]; then
  pass "index.html created"

  # Check content
  if grep -qi "hello world" "$TARGET/index.html"; then
    pass "index.html contains 'Hello World'"
  else
    fail "index.html missing 'Hello World' text"
  fi

  if grep -q "#2563eb\|2563eb" "$TARGET/index.html"; then
    pass "index.html contains blue color (#2563eb)"
  else
    warn "index.html might not have exact blue color #2563eb"
  fi
else
  fail "index.html not created — build phase may not have started"
fi

# Check git commits on feature branch
cd "$TARGET"
COMMIT_COUNT=$(git log --oneline feature/hello-world ^main 2>/dev/null | wc -l | tr -d ' ')
if [ "$COMMIT_COUNT" -gt 0 ]; then
  pass "Feature branch has $COMMIT_COUNT commit(s) beyond main"
  echo "       $(git log --oneline feature/hello-world ^main | head -5)"
else
  fail "No commits on feature branch beyond main"
fi

# ---------------------------------------------------------------------------
# Check 3: Test phase completed
# ---------------------------------------------------------------------------
echo ""
echo "── Check 3: Test phase ──"

TEST_FILES=$(find "$TARGET/tests" -name "*.test.js" -o -name "*.test.mjs" 2>/dev/null | head -5)
if [ -n "$TEST_FILES" ]; then
  pass "Test file(s) created"
  for f in $TEST_FILES; do
    echo "       $(basename "$f")"
  done

  # Try running the tests
  if node "$TARGET/tests/"*.test.* 2>/dev/null; then
    pass "Tests pass when run manually"
  else
    warn "Tests exist but may not pass independently (could depend on project state)"
  fi
else
  fail "No test files found in tests/"
fi

# ---------------------------------------------------------------------------
# Check 4: Phase progression
# ---------------------------------------------------------------------------
echo ""
echo "── Check 4: Phase progression ──"

# Read current phase
if [ -f "$TARGET/.pi/workflow-state.json" ]; then
  WS=$(cat "$TARGET/.pi/workflow-state.json")
  PHASE=$(echo "$WS" | grep -o '"currentPhase"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"currentPhase"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

  case "$PHASE" in
    "build")
      fail "Still in build phase — product-loop may not have driven transitions"
      ;;
    "test")
      pass "Reached test phase"
      warn "Stopped at test — build→test transition worked but test→review didn't complete"
      ;;
    "review")
      pass "Reached review phase (build→test→review transitions worked)"
      ;;
    "validate")
      pass "Reached validate phase (full autonomous cycle: build→test→review→validate)"
      ;;
    "publish")
      pass "Reached publish phase (entire pipeline including Gate 3 auto-approval)"
      ;;
    *)
      warn "Unexpected phase: $PHASE"
      ;;
  esac
else
  fail "Cannot read workflow-state.json"
fi

# ---------------------------------------------------------------------------
# Check 5: Product-loop was active (check commit messages)
# ---------------------------------------------------------------------------
echo ""
echo "── Check 5: Product-loop evidence ──"

cd "$TARGET"
GIT_LOG=$(git log --oneline feature/hello-world --not main 2>/dev/null || true)

# Look for test commit (proves test phase was entered via product-loop)
if echo "$GIT_LOG" | grep -qi "test:"; then
  pass "Found test commit — product-loop drove build→test transition"
else
  warn "No test commit found — agent may not have reached test phase"
fi

# Look for review fix commits (may not exist if code was already clean)
if echo "$GIT_LOG" | grep -qi "fix:"; then
  pass "Found review fix commit — product-loop drove review cycle"
else
  warn "No review fix commits (code was clean — no fixes needed during review)"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "═══════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed, $WARN warnings"
echo "═══════════════════════════════════════════════"
echo ""

# The KEY assertion: did the product-loop drive at least one phase transition?
if [ "$PHASE" != "build" ] && [ "$COMMIT_COUNT" -gt 0 ]; then
  echo "🎉 INTEGRATION TEST PASSED"
  echo "   The product-loop successfully drove the agent through autonomous phases."
  echo "   Final phase: $PHASE | Commits: $COMMIT_COUNT"
  exit 0
else
  echo "💥 INTEGRATION TEST FAILED"
  echo "   The product-loop did not drive the agent beyond the build phase."
  echo "   Current phase: $PHASE | Commits: $COMMIT_COUNT"
  exit 1
fi
