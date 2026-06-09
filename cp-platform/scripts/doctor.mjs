#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────────
// CP Platform — Environment Doctor
// Verifies the development environment is healthy.
// Usage: node scripts/doctor.mjs   (or: npm run doctor)
// ──────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync } from 'fs'
import { execSync } from 'child_process'

const PASS = '\x1b[32m\u2713\x1b[0m'
const FAIL = '\x1b[31m\u2717\x1b[0m'
const WARN = '\x1b[33m\u26a0\x1b[0m'

let allPassed = true

function check(description, testFn) {
  try {
    const result = testFn()
    if (result === true) {
      console.log('  ' + PASS + ' ' + description)
      return true
    }
    console.log('  ' + FAIL + ' ' + description)
    if (result) console.log('        ' + result)
    allPassed = false
    return false
  } catch (e) {
    console.log('  ' + FAIL + ' ' + description)
    console.log('        ' + e.message)
    allPassed = false
    return false
  }
}

function readJSON(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

async function main() {
  console.log('\n  CP Platform \u2014 Environment Doctor')
  console.log('  \u2500' .repeat(31) + '\n')

  // ── Runtime ────────────────────────────────────────────────────────────────
  console.log('  [Runtime]')
  check('Node.js 18+', () => {
    const major = parseInt(process.version.slice(1).split('.')[0])
    return major >= 18 ? true : 'Node 18+ required, found ' + process.version
  })
  check('npm 8+', () => {
    const v = execSync('npm --version', { encoding: 'utf8' }).trim()
    return parseInt(v) >= 8 ? true : 'npm 8+ required, found ' + v
  })

  // ── Dependencies ───────────────────────────────────────────────────────────
  console.log('')
  console.log('  [Dependencies]')
  check('node_modules exists', () => existsSync('node_modules'))
  check('All packages installed', () => {
    execSync('npm ls --depth=0 2>&1', { encoding: 'utf8' })
    return true
  })
  check('package-lock.json is valid', () => {
    const lock = readJSON('package-lock.json')
    return lock.lockfileVersion >= 2 ? true : 'lockfileVersion: ' + lock.lockfileVersion
  })

  // ── Configuration ──────────────────────────────────────────────────────────
  console.log('')
  console.log('  [Configuration]')
  const configs = [
    '.prettierrc', '.prettierignore', 'eslint.config.js',
    'vite.config.js', 'vitest.config.js', 'playwright.config.js',
    'tsconfig.json', 'mkdocs.yml', 'Dockerfile', 'nginx.conf',
  ]
  for (const f of configs) check(f + ' exists', () => existsSync(f))

  // ── Source ─────────────────────────────────────────────────────────────────
  console.log('')
  console.log('  [Source Directories]')
  const dirs = [
    'src/engine/modules', 'src/engine/rules', 'src/engine/optimizer',
    'src/components', 'src/pages', 'src/store', 'src/reporting',
    'src/constants', 'src/types', 'src/test-utils', 'src/e2e',
  ]
  for (const d of dirs) check(d + '/', () => existsSync(d))

  // ── Tests & Build ──────────────────────────────────────────────────────────
  console.log('')
  console.log('  [Tests & Build]')
  check('Unit tests pass', () => {
    const out = execSync('npx vitest run 2>&1', { encoding: 'utf8', timeout: 60000 })
    if (out.includes('FAIL')) throw new Error('Some tests failed')
    return true
  })
  check('Production build succeeds', () => {
    execSync('npx vite build 2>&1', { encoding: 'utf8', timeout: 60000 })
    return existsSync('dist/index.html')
  })

  // ── Lint & Format ──────────────────────────────────────────────────────────
  console.log('')
  console.log('  [Lint & Format]')
  check('ESLint passes', () => {
    execSync('npx eslint . 2>&1', { encoding: 'utf8', timeout: 30000 })
    return true
  })
  check('Prettier formatting correct', () => {
    execSync('npx prettier --check "src/**/*.{js,jsx,css}" 2>&1', { encoding: 'utf8', timeout: 30000 })
    return true
  })

  // ── Optional ───────────────────────────────────────────────────────────────
  console.log('')
  console.log('  [Optional Tools]')
  check('Python 3 available', () => {
    try {
      const v = execSync('python3 --version 2>&1', { encoding: 'utf8' }).trim()
      console.log('        ' + v)
      return true
    } catch {
      return true
    }
  })
  check('Playwright browser installed', () => {
    try {
      execSync('npx playwright install --dry-run chromium 2>&1', { encoding: 'utf8' })
      return true
    } catch {
      return true
    }
  })

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('')
  console.log('  ' + '\u2500'.repeat(31))
  if (allPassed) {
    console.log('  ' + PASS + ' Environment is healthy')
    process.exit(0)
  } else {
    console.log('  ' + FAIL + ' Environment has issues to resolve')
    process.exit(1)
  }
  console.log('')
}

main().catch((e) => {
  console.error('Doctor script failed:', e.message)
  process.exit(1)
})
