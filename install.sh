#!/bin/bash
set -e

# Pi Product System — Installer
# Creates symlinks from this repo to ~/.pi/agent/

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
PI_DIR="$HOME/.pi/agent"

echo "Pi Product System — Install"
echo "==========================="
echo "Repo:   $REPO_DIR"
echo "Target: $PI_DIR"
echo ""

# Ensure target directories exist
mkdir -p "$PI_DIR/skills"
mkdir -p "$PI_DIR/extensions"
mkdir -p "$PI_DIR/agents"

# --- Skills ---
SKILLS=(product-specify auto-plan build-loop product-validate product-clarify auto-publish)
for skill in "${SKILLS[@]}"; do
  target="$PI_DIR/skills/$skill"
  if [ -L "$target" ]; then
    rm "$target"
  elif [ -d "$target" ]; then
    echo "⚠️  $target exists and is not a symlink. Skipping (backup manually if needed)."
    continue
  fi
  ln -s "$REPO_DIR/skills/$skill" "$target"
  echo "✓ skills/$skill"
done

# --- Extensions ---
# product-setup (directory)
target="$PI_DIR/extensions/product-setup"
if [ -L "$target" ]; then rm "$target"; fi
if [ -d "$target" ] && [ ! -L "$target" ]; then
  echo "⚠️  $target exists and is not a symlink. Skipping."
else
  ln -s "$REPO_DIR/extensions/product-setup" "$target"
  echo "✓ extensions/product-setup"
fi

# ask-tool.ts (single file)
target="$PI_DIR/extensions/ask-tool.ts"
if [ -L "$target" ]; then rm "$target"; fi
if [ -f "$target" ] && [ ! -L "$target" ]; then
  echo "⚠️  $target exists and is not a symlink. Skipping."
else
  ln -s "$REPO_DIR/extensions/ask-tool.ts" "$target"
  echo "✓ extensions/ask-tool.ts"
fi

# --- Agents ---
AGENTS=(reviewer.md scout.md spec-checker.md)
for agent in "${AGENTS[@]}"; do
  target="$PI_DIR/agents/$agent"
  if [ -L "$target" ]; then rm "$target"; fi
  if [ -f "$target" ] && [ ! -L "$target" ]; then
    echo "⚠️  $target exists and is not a symlink. Skipping."
    continue
  fi
  ln -s "$REPO_DIR/agents/$agent" "$target"
  echo "✓ agents/$agent"
done

# --- Root files ---
for file in product-constitution.md REVIEW_GUIDELINES.md; do
  target="$PI_DIR/$file"
  if [ -L "$target" ]; then rm "$target"; fi
  if [ -f "$target" ] && [ ! -L "$target" ]; then
    echo "⚠️  $target exists and is not a symlink. Backing up to ${target}.bak"
    mv "$target" "${target}.bak"
  fi
  ln -s "$REPO_DIR/$file" "$target"
  echo "✓ $file"
done

echo ""
echo "✅ Done! All components symlinked."
echo ""
echo "Test: open Pi in any directory and type /setup"
