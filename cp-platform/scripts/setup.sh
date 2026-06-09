#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# CP Platform — Fresh Environment Setup Script
# Run this on a clean clone to get a fully working environment.
# Usage: bash scripts/setup.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  CP Designer — ICCP Engineering Platform Setup             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Check prerequisites ──────────────────────────────────────────────────
echo "→ Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo "✗ Node.js is required. Install Node 18+ from https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "✗ npm is required."; exit 1; }

NODE_MAJOR=$(node -e "console.log(process.version.slice(1).split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "✗ Node 18+ required (found $(node --version))"
  exit 1
fi
echo "  ✓ Node $(node --version)"
echo "  ✓ npm $(npm --version)"

# ── 2. Install Node dependencies ────────────────────────────────────────────
echo ""
echo "→ Installing Node dependencies..."
npm ci --no-audit --no-fund
echo "  ✓ Node dependencies installed"

# ── 3. Install Playwright browser ───────────────────────────────────────────
echo ""
echo "→ Installing Playwright Chromium..."
npx playwright install chromium --with-deps 2>&1 | tail -1
echo "  ✓ Playwright Chromium ready"

# ── 4. Install Python dependencies (optional) ───────────────────────────────
echo ""
echo "→ Installing Python tools (optional — needed for docs)..."
if command -v python3 &>/dev/null && command -v pip &>/dev/null; then
  pip install --quiet --no-input -r requirements.txt 2>&1 | tail -1
  echo "  ✓ Python dependencies installed"
else
  echo "  ⚠ python3/pip not found — skipping Python deps"
  echo "    Install Python 3.9+ and pip, then run: pip install -r requirements.txt"
fi

# ── 5. Verify ────────────────────────────────────────────────────────────────
echo ""
echo "→ Running verification..."
npm run doctor 2>&1
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Setup complete!                                           ║"
echo "║                                                            ║"
echo "║  Next steps:                                               ║"
echo "║    npm run dev        — Start development server           ║"
echo "║    npm test           — Run unit tests                     ║"
echo "║    npm run build      — Production build                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
