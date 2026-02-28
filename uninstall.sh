#!/bin/bash
set -e

# Pi Product System — Global Uninstaller (legacy)
# Removes symlinks from ~/.pi/agent/ that were created by the old global install.
# For local installs, use: bash .pi/uninstall-product-system.sh

PI_DIR="$HOME/.pi/agent"

echo "Pi Product System — Uninstall (global)"
echo "======================================="

remove() {
  local target="$1"
  local name="$2"
  if [ -L "$target" ] || [ -e "$target" ]; then
    rm -rf "$target"
    echo "✓ Removed $name"
  fi
}

# Skills
for skill in discovery specify plan analyze build test review validate publish janitor; do
  remove "$PI_DIR/skills/$skill" "skills/$skill"
done

# Extensions
remove "$PI_DIR/extensions/product-setup" "extensions/product-setup"
remove "$PI_DIR/extensions/ask-tool.ts" "extensions/ask-tool.ts"
remove "$PI_DIR/extensions/product-loop.ts" "extensions/product-loop.ts"
remove "$PI_DIR/extensions/janitor.ts" "extensions/janitor.ts"

# Agents
remove "$PI_DIR/agents/scout.md" "agents/scout.md"
remove "$PI_DIR/agents/spec-checker.md" "agents/spec-checker.md"

# Root files
remove "$PI_DIR/product-constitution.md" "product-constitution.md"
remove "$PI_DIR/REVIEW_GUIDELINES.md" "REVIEW_GUIDELINES.md"

echo ""
echo "✅ Global install removed."
echo ""
echo "For local installs, run from the project: bash .pi/uninstall-product-system.sh"
