#!/usr/bin/env node
/**
 * Firebase Auth — User Seed Script
 *
 * Creates predefined user accounts for the CP Designer platform.
 *
 * Prerequisites:
 *   1. Download your service account key from Firebase Console:
 *      Project Settings → Service Accounts → Generate new private key
 *   2. Save it as cp-platform/firebase-service-account.json (gitignored)
 *   3. Run: node scripts/seed-firebase-users.mjs
 *
 * The script is idempotent — running it multiple times won't create duplicates.
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { config } from 'dotenv'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ─── Configuration ───────────────────────────────────────────────────────────
// Passwords are read from environment variables or a .env.seed file (gitignored).
// If not set, default test passwords are used — these are NOT for production.

const seedEnv = config({ path: join(ROOT, '.env.seed') }).parsed || {}
const pw = (key, fallback) => process.env[key] || seedEnv[key] || fallback

const USERS = [
  {
    email: 'admin@cpdesigner.com',
    password: pw('SEED_PW_ADMIN', 'Admin@2024!'),
    displayName: 'System Administrator',
    role: 'admin',
  },
  {
    email: 'engineer@cpdesigner.com',
    password: pw('SEED_PW_ENGINEER', 'Engineer@2024!'),
    displayName: 'Senior Engineer',
    role: 'engineer',
  },
  {
    email: 'reviewer@cpdesigner.com',
    password: pw('SEED_PW_REVIEWER', 'Reviewer@2024!'),
    displayName: 'Design Reviewer',
    role: 'reviewer',
  },
]

const showPasswords = process.argv.includes('--show-passwords')

// ─── Initialize Firebase Admin ───────────────────────────────────────────────

function initFirebase() {
  const serviceAccountPath = join(ROOT, 'firebase-service-account.json')

  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))
    initializeApp({ credential: cert(serviceAccount) })
    console.log('  ✓ Initialized with service account key file')
    return
  }

  // Fallback: use application default credentials (for CI/production)
  try {
    initializeApp({ credential: applicationDefault() })
    console.log('  ✓ Initialized with application default credentials')
  } catch {
    console.error('\n╔══════════════════════════════════════════════════════════════╗')
    console.error('║  ERROR: No credentials found                               ║')
    console.error('║                                                            ║')
    console.error('║  Option 1: Download service account key from Firebase      ║')
    console.error('║    → Project Settings → Service Accounts                   ║')
    console.error('║    → Save as: cp-platform/firebase-service-account.json    ║')
    console.error('║                                                            ║')
    console.error('║  Option 2: Set GOOGLE_APPLICATION_CREDENTIALS env var      ║')
    console.error('╚══════════════════════════════════════════════════════════════╝\n')
    process.exit(1)
  }
}

// ─── Seed Users ──────────────────────────────────────────────────────────────

async function seedUsers() {
  const auth = getAuth()
  let created = 0
  let skipped = 0
  let errors = 0

  for (const userData of USERS) {
    try {
      // Check if user already exists
      let existingUser = null
      try {
        existingUser = await auth.getUserByEmail(userData.email)
      } catch {
        // User doesn't exist — that's expected
      }

      if (existingUser) {
        console.log(`  ⊘ ${userData.email} — already exists, skipping`)
        skipped++
        continue
      }

      // Create the user
      const userRecord = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
        emailVerified: true,
        disabled: false,
      })

      // Set custom claims for role-based access
      await auth.setCustomUserClaims(userRecord.uid, { role: userData.role })

      console.log(`  ✓ ${userData.email} — created (uid: ${userRecord.uid.slice(0, 8)}…)`)
      created++
    } catch (err) {
      console.error(`  ✗ ${userData.email} — error: ${err.message}`)
      errors++
    }
  }

  return { created, skipped, errors }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('')
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║  Firebase Auth — User Seed Script                          ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log('')

  console.log('→ Initializing Firebase Admin SDK...')
  initFirebase()
  console.log('')

  console.log('→ Creating user accounts...')
  const { created, skipped, errors } = await seedUsers()
  console.log('')

  console.log('── Summary ──')
  console.log(`  Created: ${created}`)
  console.log(`  Skipped: ${skipped} (already exist)`)
  console.log(`  Errors:  ${errors}`)
  console.log('')

  if (created > 0 && showPasswords) {
    console.log('  Test credentials (use --show-passwords to display):')
    for (const u of USERS) {
      console.log(`    ${u.email} / ${u.password} (${u.role})`)
    }
    console.log('')
  } else if (created > 0) {
    console.log('  Run with --show-passwords to see test credentials.')
    console.log('')
  }

  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║  Done! You can now log in to CP Designer.                  ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log('')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
