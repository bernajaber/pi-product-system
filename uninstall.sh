#!/bin/bash
set -e

# Pi Product System — Uninstaller (V2)
# Removes symlinks created by install.sh

PI_DIR="$HOME/.pi/agent"

echo "Pi Product System V2 — Uninstall"
echo "================================="

# Only remove symlinks — never delete actual files
remove_link() {
  local target="$1"
  local name="$2"
  if [ -L "$target" ]; then
    rm "$target"
    echo "✓ Removed $name"
  elif [ -e "$target" ]; then
    echo "⚠️  $name exists but is not a symlink. Skipping."
  fi
}

# Skills (V2 — 9 skills)
for skill in discovery specify plan analyze build test review validate publish; do
  remove_link "$PI_DIR/skills/$skill" "skills/$skill"
done

# Also clean up V1 skill names if they exist as symlinks
for skill in product-specify product-clarify auto-plan build-loop product-validate auto-publish; do
  if [ -L "$PI_DIR/skills/$skill" ]; then
    rm "$PI_DIR/skills/$skill"
    echo "✓ Removed V1 skills/$skill"
  fi
done

# Extensions
remove_link "$PI_DIR/extensions/product-setup" "extensions/product-setup"
remove_link "$PI_DIR/extensions/ask-tool.ts" "extensions/ask-tool.ts"
remove_link "$PI_DIR/extensions/product-loop.ts" "extensions/product-loop.ts"

# Agents
for agent in scout.md spec-checker.md; do
  remove_link "$PI_DIR/agents/$agent" "agents/$agent"
done

# Also clean up V1 agent names if they exist as symlinks
if [ -L "$PI_DIR/agents/reviewer.md" ]; then
  rm "$PI_DIR/agents/reviewer.md"
  echo "✓ Removed V1 agents/reviewer.md"
fi

# Root files
remove_link "$PI_DIR/product-constitution.md" "product-constitution.md"
remove_link "$PI_DIR/REVIEW_GUIDELINES.md" "REVIEW_GUIDELINES.md"

# Restore backups if they exist
for file in product-constitution.md REVIEW_GUIDELINES.md; do
  if [ -f "$PI_DIR/${file}.bak" ]; then
    mv "$PI_DIR/${file}.bak" "$PI_DIR/$file"
    echo "  ↳ Restored ${file} from backup"
  fi
done

echo ""
echo "✅ Done! All symlinks removed. Pi will work normally without the product system."
