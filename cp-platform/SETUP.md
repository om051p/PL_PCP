# Setup Guide — CP Designer ICCP Engineering Platform

## Quick Start

```bash
git clone <repo-url>
cd PL_PCP/cp-platform
npm ci
npm run doctor      # Verify environment
npm run dev         # Start development server
```

## Prerequisites

| Tool | Minimum Version | Required For |
|------|----------------|--------------|
| Node.js | 18+ (20 LTS recommended) | All development |
| npm | 8+ | Package management |
| Python | 3.9+ (optional) | Documentation (MkDocs) |
| Git | 2.0+ | Version control |

## Installation Methods

### 1. GitHub Codespaces (Recommended)

Click **"Code" → "Open with Codespaces"** in GitHub. Everything is pre-configured:

- Node 22 with all dependencies
- Python 3.12 for MkDocs
- Playwright Chromium for E2E tests
- VS Code extensions (ESLint, Prettier, Playwright)
- Ports 3000 (dev) and 4173 (preview) auto-forwarded

### 2. Local Development (Linux / macOS)

```bash
# Clone
git clone <repo-url>
cd PL_PCP/cp-platform

# Install dependencies
npm ci

# Install Python tools (for documentation)
pip install -r requirements.txt

# Install Playwright browser (for E2E tests)
npx playwright install chromium --with-deps

# Verify everything works
npm run doctor

# Start developing
npm run dev
```

### 3. Local Development (Windows)

Use **Git Bash**, **WSL2**, or **PowerShell**:

```powershell
# Clone
git clone <repo-url>
cd PL_PCP\cp-platform

# Install dependencies
npm ci

# Install Python tools (for documentation)
pip install -r requirements.txt

# Install Playwright browser (for E2E tests)
npx playwright install chromium --with-deps

# Verify everything works
npm run doctor

# Start developing
npm run dev
```

### 4. Docker

```bash
docker build -t cp-platform .
docker run -p 3000:80 cp-platform
```

### 5. Dev Container (VS Code)

If you have the **Dev Containers** extension:

1. `Ctrl+Shift+P` → "Dev Containers: Reopen in Container"
2. Wait for build and post-create script
3. Start with `npm run dev`

## Verification

```bash
# Full environment check
npm run doctor

# Run tests with coverage
npm run test:coverage

# Check code style
npm run format:check

# Run linter
npm run lint

# Full verification pipeline
npm run verify
```

## Troubleshooting

### "npm ci" fails

```bash
# Delete node_modules and try again
rm -rf node_modules package-lock.json
npm install
```

### Playwright fails

```bash
npx playwright install chromium --with-deps
```

### Python / MkDocs issues

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Port already in use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm run dev
```

## Project Scripts Reference

```bash
npm run dev            # Development server (port 3000)
npm run build          # Production build (dist/)
npm run preview        # Preview production build (port 4173)
npm test               # Run unit tests once
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
npm run test:e2e       # Run Playwright E2E tests
npm run lint           # ESLint check
npm run format         # Format code with Prettier
npm run verify         # Full verification pipeline
npm run doctor         # Environment health check
npm run docs:serve     # Documentation site (port 8000)
```
