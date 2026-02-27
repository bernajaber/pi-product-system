#!/bin/bash
set -e

# Pi Product System — Installer (V2)
# Creates symlinks from this repo to ~/.pi/agent/

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PI_DIR="$HOME/.pi/agent"

echo "Pi Product System V2 — Install"
echo "==============================="

# Create target directories if they don't exist
mkdir -p "$PI_DIR/skills"
mkdir -p "$PI_DIR/extensions"
mkdir -p "$PI_DIR/agents"

# Helper: create symlink (backup existing non-symlink files)
link() {
  local src="$1"
  local dest="$2"
  local name="$3"

  if [ -L "$dest" ]; then
    rm "$dest"
  elif [ -e "$dest" ]; then
    mv "$dest" "${dest}.bak"
    echo "  ↳ Backed up existing $name"
  fi

  ln -s "$src" "$dest"
  echo "✓ $name"
}

# Skills (V2 — 9 skills)
for skill in discovery specify plan analyze build test review validate publish; do
  if [ -d "$SCRIPT_DIR/skills/$skill" ]; then
    link "$SCRIPT_DIR/skills/$skill" "$PI_DIR/skills/$skill" "skills/$skill"
  else
    echo "⚠️  skills/$skill not found in repo — skipping"
  fi
done

# Extensions
link "$SCRIPT_DIR/extensions/product-setup" "$PI_DIR/extensions/product-setup" "extensions/product-setup"
link "$SCRIPT_DIR/extensions/ask-tool.ts" "$PI_DIR/extensions/ask-tool.ts" "extensions/ask-tool.ts"

# Agents
for agent in reviewer.md scout.md spec-checker.md; do
  link "$SCRIPT_DIR/agents/$agent" "$PI_DIR/agents/$agent" "agents/$agent"
done

# Root files
link "$SCRIPT_DIR/product-constitution.md" "$PI_DIR/product-constitution.md" "product-constitution.md"
link "$SCRIPT_DIR/REVIEW_GUIDELINES.md" "$PI_DIR/REVIEW_GUIDELINES.md" "REVIEW_GUIDELINES.md"

echo ""
echo "✅ Done! Product System V2 installed."
echo ""
echo "Skills: discovery, specify, plan, analyze, build, test, review, validate, publish"
echo "Extensions: product-setup (/setup command), ask-tool"
echo "Agents: reviewer, scout, spec-checker"
echo ""
echo "To start a new product: mkdir ~/my-product && cd ~/my-product && pi"
echo "Then type: /setup"
