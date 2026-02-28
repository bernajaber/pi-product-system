#!/bin/bash
set -e

# Pi Product System — Local Installer
# Copies skills, extensions, agents, and config to .pi/ of the current project.
# Run from inside the project directory, or pass --global for ~/.pi/agent/ (legacy).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── Mode detection ──────────────────────────────────────────────────────────

if [ "$1" = "--global" ]; then
  PI_DIR="$HOME/.pi/agent"
  MODE="global"
else
  PI_DIR="$(pwd)/.pi"
  MODE="local"
fi

echo "Pi Product System — Install ($MODE)"
echo "====================================="
echo "Target: $PI_DIR"
echo ""

# Create target directories
mkdir -p "$PI_DIR/skills"
mkdir -p "$PI_DIR/extensions"
mkdir -p "$PI_DIR/agents"

# ─── Helper: copy file or directory ──────────────────────────────────────────

copy_item() {
  local src="$1"
  local dest="$2"
  local name="$3"

  if [ -L "$dest" ]; then
    rm "$dest"
  elif [ -e "$dest" ]; then
    rm -rf "$dest"
  fi

  if [ -d "$src" ]; then
    cp -R "$src" "$dest"
  else
    cp "$src" "$dest"
  fi
  echo "✓ $name"
}

# ─── Skills (10) ─────────────────────────────────────────────────────────────

for skill in discovery specify plan analyze build test review validate publish janitor; do
  if [ -d "$SCRIPT_DIR/skills/$skill" ]; then
    copy_item "$SCRIPT_DIR/skills/$skill" "$PI_DIR/skills/$skill" "skills/$skill"
  else
    echo "⚠️  skills/$skill not found — skipping"
  fi
done

# ─── Extensions (4) ──────────────────────────────────────────────────────────

copy_item "$SCRIPT_DIR/extensions/product-setup" "$PI_DIR/extensions/product-setup" "extensions/product-setup"
copy_item "$SCRIPT_DIR/extensions/ask-tool.ts" "$PI_DIR/extensions/ask-tool.ts" "extensions/ask-tool.ts"
copy_item "$SCRIPT_DIR/extensions/product-loop.ts" "$PI_DIR/extensions/product-loop.ts" "extensions/product-loop.ts"
copy_item "$SCRIPT_DIR/extensions/janitor.ts" "$PI_DIR/extensions/janitor.ts" "extensions/janitor.ts"

# ─── Agents (2) ──────────────────────────────────────────────────────────────

for agent in scout.md spec-checker.md; do
  copy_item "$SCRIPT_DIR/agents/$agent" "$PI_DIR/agents/$agent" "agents/$agent"
done

# ─── Config files ────────────────────────────────────────────────────────────

copy_item "$SCRIPT_DIR/product-constitution.md" "$PI_DIR/product-constitution.md" "product-constitution.md"

# ─── Uninstaller (local only) ────────────────────────────────────────────────

if [ "$MODE" = "local" ]; then
  cat > "$PI_DIR/uninstall-product-system.sh" << 'UNINSTALL'
#!/bin/bash
# Remove Pi Product System from this project's .pi/
PI_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Removing Pi Product System from $PI_DIR"

# Skills
for skill in discovery specify plan analyze build test review validate publish janitor; do
  rm -rf "$PI_DIR/skills/$skill" 2>/dev/null && echo "✓ removed skills/$skill"
done

# Extensions
rm -rf "$PI_DIR/extensions/product-setup" 2>/dev/null && echo "✓ removed extensions/product-setup"
rm -f "$PI_DIR/extensions/ask-tool.ts" 2>/dev/null && echo "✓ removed extensions/ask-tool.ts"
rm -f "$PI_DIR/extensions/product-loop.ts" 2>/dev/null && echo "✓ removed extensions/product-loop.ts"
rm -f "$PI_DIR/extensions/janitor.ts" 2>/dev/null && echo "✓ removed extensions/janitor.ts"

# Agents
rm -f "$PI_DIR/agents/scout.md" 2>/dev/null && echo "✓ removed agents/scout.md"
rm -f "$PI_DIR/agents/spec-checker.md" 2>/dev/null && echo "✓ removed agents/spec-checker.md"

# Config
rm -f "$PI_DIR/product-constitution.md" 2>/dev/null && echo "✓ removed product-constitution.md"

# Self-destruct
rm -f "$PI_DIR/uninstall-product-system.sh"

echo "✅ Product System removed."
UNINSTALL
  chmod +x "$PI_DIR/uninstall-product-system.sh"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo "✅ Done! Product System installed ($MODE)."
echo ""
echo "Skills: discovery, specify, plan, analyze, build, test, review, validate, publish, janitor"
echo "Extensions: product-setup (/setup), ask-tool, product-loop, janitor (/janitor)"
echo "Agents: scout, spec-checker"
echo ""
if [ "$MODE" = "local" ]; then
  echo "Start: pi → /setup"
  echo "Uninstall: bash .pi/uninstall-product-system.sh"
else
  echo "Start: cd ~/my-project && pi → /setup"
fi
