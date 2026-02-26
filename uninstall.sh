#!/bin/bash
set -e

# Pi Product System — Uninstaller
# Removes symlinks created by install.sh

PI_DIR="$HOME/.pi/agent"

echo "Pi Product System — Uninstall"
echo "=============================="

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

# Skills
for skill in product-specify auto-plan build-loop product-validate product-clarify auto-publish; do
  remove_link "$PI_DIR/skills/$skill" "skills/$skill"
done

# Extensions
remove_link "$PI_DIR/extensions/product-setup" "extensions/product-setup"
remove_link "$PI_DIR/extensions/ask-tool.ts" "extensions/ask-tool.ts"

# Agents
for agent in reviewer.md scout.md spec-checker.md; do
  remove_link "$PI_DIR/agents/$agent" "agents/$agent"
done

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
