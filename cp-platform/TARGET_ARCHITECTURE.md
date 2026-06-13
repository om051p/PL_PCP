# TARGET ARCHITECTURE — Backend-Portable RAXA CP Designer

**Version:** 1.0
**Date:** 2026-06-12
**Purpose:** Design the Provider abstraction layer so Firebase can be replaced without touching UI.

---

## 1. Target Layer Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 1: PRESENTATION (NEVER TOUCHES BACKEND)                       │
│  pages/*.jsx, components/*.jsx                                       │
│  Imports: useAuthStore(), useProjectStore(), hooks only              │
│  Knows: NormalizedUser, NormalizedProject, NormalizedAuditLog        │
│  Does NOT know: Firebase, Supabase, PostgreSQL, REST, GraphQL        │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 2: STATE MANAGEMENT                                           │
│  store/authStore.js, store/projectStore.js                           │
│  Imports: authRepository, userRepository, projectRepository          │
│  Knows: Repository interface, Normalized types                       │
│  Does NOT know: Any provider implementation                          │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 3: REPOSITORY (ORCHESTRATION + BUSINESS LOGIC)                │
│  repositories/authRepository.js                                      │
│  repositories/userRepository.js                                      │
│  repositories/projectRepository.js                                   │
│  repositories/auditRepository.js     ← NEW, extracted                │
│  repositories/standardsRepository.js ← NEW                           │
│  Imports: getAuthProvider(), getUserProvider(), etc. (registry)      │
│  Knows: Provider interface only, normalization logic                 │
│  Does NOT know: Firebase, Supabase SDKs                              │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 4: PROVIDER INTERFACES (CONTRACTS)           ← NEW LAYER      │
│  contracts/authProvider.js                                           │
│  contracts/userProvider.js                                           │
│  contracts/projectProvider.js                                        │
│  contracts/auditProvider.js                                          │
│  contracts/storageProvider.js                                        │
│  contracts/standardsProvider.js                                      │
│  Knows: Method signatures, return types                              │
│  Does NOT know: Any SDK or implementation                            │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 5: PROVIDER IMPLEMENTATIONS                                   │
│  providers/backend/firebase/firebaseAuthProvider.js                  │
│  providers/backend/firebase/firebaseUserProvider.js                  │
│  providers/backend/firebase/firebaseProjectProvider.js               │
│  providers/backend/firebase/firebaseAuditProvider.js                 │
│  providers/backend/supabase/supabaseAuthProvider.js    ← FUTURE     │
│  providers/backend/supabase/supabaseUserProvider.js    ← FUTURE     │
│  providers/backend/rest/restAuthProvider.js             ← FUTURE     │
│  Imports: Firebase SDK (firebase-only), Supabase SDK (supabase)      │
│  Knows: Specific SDK, serialization, networking                      │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 6: PROVIDER REGISTRY (DEPENDENCY INJECTION)     ← NEW         │
│  providers/backend/registry.js                                       │
│  Exports: getAuthProvider(), getUserProvider(), etc.                 │
│  Reads: Backend config to select implementation at startup            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Provider Interface Contracts

### 2.1 AuthProvider Interface

```javascript
/**
 * @typedef {Object} AuthCredentials
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} AuthSession
 * @property {string} uid        — stable, backend-agnostic user ID
 * @property {string} email      — verified email
 * @property {string|null} displayName
 * @property {boolean} emailVerified
 */

/**
 * @typedef {Object} AuthProvider
 */
export const AuthProviderContract = {
  /**
   * Sign in with credentials. Throws on failure.
   * @param {AuthCredentials} creds
   * @returns {Promise<{ session: AuthSession }>}
   */
  signIn: null,

  /**
   * Register a new user. Throws on failure.
   * @param {AuthCredentials} creds
   * @returns {Promise<{ session: AuthSession }>}
   */
  signUp: null,

  /**
   * Sign out current session.
   * @returns {Promise<void>}
   */
  signOut: null,

  /**
   * Subscribe to auth state changes.
   * @param {(session: AuthSession|null) => void} callback
   * @returns {() => void} unsubscribe function
   */
  onAuthStateChanged: null,

  /**
   * Send password reset email.
   * @param {string} email
   * @returns {Promise<void>}
   */
  sendPasswordReset: null,

  /**
   * Send email verification.
   * @param {AuthSession} session
   * @returns {Promise<void>}
   */
  sendVerification: null,
}
```

### 2.2 UserProvider Interface

```javascript
/**
 * @typedef {Object} NormalizedUser
 * @property {string} uid
 * @property {string} email
 * @property {string} displayName
 * @property {string} role          — 'admin' | 'manager' | 'engineer' | 'reviewer' | 'viewer'
 * @property {boolean} approved
 * @property {string} status        — 'pending' | 'active' | 'suspended' | 'disabled' | 'rejected'
 * @property {string} organizationId
 * @property {string} createdAt
 * @property {string} [lastLogin]
 * @property {string} [approvedBy]
 * @property {string} [approvedAt]
 */

/**
 * @typedef {Object} UserProvider
 */
export const UserProviderContract = {
  /**
   * Fetch a user's profile. Returns null if not found.
   * @param {string} uid
   * @returns {Promise<NormalizedUser|null>}
   */
  getUserProfile: null,

  /**
   * Create or fully overwrite a user's profile.
   * @param {string} uid
   * @param {NormalizedUser} data
   * @returns {Promise<void>}
   */
  setUserProfile: null,

  /**
   * Merge partial fields into a user's profile.
   * @param {string} uid
   * @param {Partial<NormalizedUser>} data
   * @returns {Promise<void>}
   */
  updateUserProfile: null,

  /**
   * Fetch all users in an organization.
   * @param {string} organizationId
   * @returns {Promise<NormalizedUser[]>}
   */
  getAllUsers: null,
}
```

### 2.3 AuditProvider Interface

```javascript
/**
 * @typedef {Object} AuditLogEntry
 * @property {string} id
 * @property {string} timestamp      — ISO 8601
 * @property {string} action
 * @property {string} targetUser
 * @property {string} performedBy
 * @property {string} status
 * @property {string|null} ip
 * @property {Object} details
 * @property {string} organizationId
 */

/**
 * @typedef {Object} AuditProvider
 */
export const AuditProviderContract = {
  /**
   * Create an audit log entry.
   * @param {string} logId
   * @param {Omit<AuditLogEntry, 'id'>} logData
   * @returns {Promise<void>}
   */
  createAuditLog: null,

  /**
   * Fetch all audit logs.
   * @returns {Promise<AuditLogEntry[]>}
   */
  getAuditLogs: null,
}
```

### 2.4 ProjectProvider Interface

```javascript
/**
 * @typedef {Object} ProjectProvider
 */
export const ProjectProviderContract = {
  /**
   * Fetch a project by ID from remote storage.
   * @param {string} projectId
   * @param {string} organizationId
   * @returns {Promise<Object|null>}
   */
  fetchProject: null,

  /**
   * Save/update a project to remote storage.
   * @param {string} projectId
   * @param {Object} projectData
   * @param {string} organizationId
   * @returns {Promise<void>}
   */
  saveProject: null,

  /**
   * List project IDs for an organization.
   * @param {string} organizationId
   * @returns {Promise<string[]>}
   */
  listProjects: null,

  /**
   * Delete a project from remote storage.
   * @param {string} projectId
   * @returns {Promise<void>}
   */
  deleteProject: null,
}
```

### 2.5 StorageProvider Interface

```javascript
/**
 * @typedef {Object} StorageProvider
 */
export const StorageProviderContract = {
  /**
   * Upload a file.
   * @param {string} path      — logical path (e.g., "projects/{id}/report.pdf")
   * @param {Blob|File} file
   * @returns {Promise<string>} public/download URL
   */
  upload: null,

  /**
   * Get a download URL for a stored file.
   * @param {string} path
   * @returns {Promise<string>}
   */
  getDownloadUrl: null,

  /**
   * Delete a stored file.
   * @param {string} path
   * @returns {Promise<void>}
   */
  delete: null,
}
```

### 2.6 StandardsProvider Interface

```javascript
/**
 * @typedef {Object} StandardDefinition
 * @property {string} id           — 'saudiAramco' | 'naceSP0169' | 'iso15589' | 'adnoc' | 'pdo'
 * @property {string} name
 * @property {Object} parameters   — design thresholds, constants
 */

/**
 * @typedef {Object} StandardsProvider
 */
export const StandardsProviderContract = {
  /**
   * Get the active standard definition.
   * @param {string} standardId
   * @returns {Promise<StandardDefinition>}
   */
  getStandard: null,

  /**
   * List all available standards.
   * @returns {Promise<StandardDefinition[]>}
   */
  listStandards: null,
}
```

---

## 3. Provider Registry (Dependency Injection)

### 3.1 Design

```javascript
// providers/backend/registry.js

/** @type {'firebase'|'supabase'|'rest'|'graphql'} */
let backendId = 'firebase'

/** @type {Map<string, Object>} */
const providers = new Map()

export function configureBackend(id, providerMap) {
  backendId = id
  for (const [contract, impl] of Object.entries(providerMap)) {
    providers.set(contract, impl)
  }
}

export function getAuthProvider() {
  return providers.get('auth')
}

export function getUserProvider() {
  return providers.get('user')
}

export function getAuditProvider() {
  return providers.get('audit')
}

export function getProjectProvider() {
  return providers.get('project')
}

export function getStorageProvider() {
  return providers.get('storage')
}

export function getStandardsProvider() {
  return providers.get('standards')
}
```

### 3.2 Initialization (main.jsx)

```javascript
// main.jsx — startup before React renders
import { configureBackend } from './providers/backend/registry.js'
import { firebaseAuthProvider } from './providers/backend/firebase/firebaseAuthProvider.js'
import { firebaseUserProvider } from './providers/backend/firebase/firebaseUserProvider.js'
import { firebaseAuditProvider } from './providers/backend/firebase/firebaseAuditProvider.js'

configureBackend('firebase', {
  auth: firebaseAuthProvider,
  user: firebaseUserProvider,
  audit: firebaseAuditProvider,
  // project: firebaseProjectProvider,  // when ready
  // storage: firebaseStorageProvider,  // when ready
  // standards: localStandardsProvider, // default: hardcoded
})

// Only THEN mount React
import('./main.jsx')  // or import App directly
```

---

## 4. Repository Refactoring Pattern

### 4.1 Before (current authRepository.js)

```javascript
import { firebaseAuthApi } from '../api/firebaseAuthApi.js'

export const authRepository = {
  async signIn(email, password) {
    return await firebaseAuthApi.signIn(email, password)  // coupled
  },
}
```

### 4.2 After (using registry)

```javascript
import { getAuthProvider } from '../providers/backend/registry.js'

export const authRepository = {
  async signIn(email, password) {
    const auth = getAuthProvider()
    return await auth.signIn({ email, password })  // backend-agnostic
  },
}
```

### 4.3 Normalization in Repository

The repository is responsible for converting Provider-specific shapes to Normalized types:

```javascript
// userRepository.js
import { getUserProvider } from '../providers/backend/registry.js'

export const userRepository = {
  async fetchUserProfile(uid) {
    const provider = getUserProvider()
    const raw = await provider.getUserProfile(uid)
    if (!raw) return null

    // Normalize from provider shape → NormalizedUser
    return {
      uid: raw.uid || raw.id,
      email: raw.email,
      displayName: raw.displayName || raw.name || raw.email?.split('@')[0],
      role: raw.role || 'engineer',
      approved: raw.approved ?? false,
      status: raw.status || 'pending',
      organizationId: raw.organizationId || 'ikk',
      createdAt: raw.createdAt || raw.created_at,
      lastLogin: raw.lastLogin || raw.last_login,
      approvedBy: raw.approvedBy || raw.approved_by,
      approvedAt: raw.approvedAt || raw.approved_at,
    }
  },
}
```

---

## 5. Auth Store Refactoring

### 5.1 Current Problem
`authStore.js` directly references `firebaseUser.emailVerified`, `firebaseUser.uid`, etc. This is a Firebase `User` object shape leak.

### 5.2 Target
The store works with `AuthSession` (from AuthProvider) and `NormalizedUser` (from UserProvider). The normalization happens in the repository.

```javascript
// authStore.js — target signature
const authRepository = {  // already repository-backed
  async login(email, password) {
    const { session } = await getAuthProvider().signIn({ email, password })
    // session is already normalized: { uid, email, displayName, emailVerified }
    const profile = await userRepository.fetchUserProfile(session.uid, session.email)
    // profile is already NormalizedUser
    return { session, profile }
  },
}
```

### 5.3 The `mapFirebaseUser` function is renamed to `normalizeUser` and moved to `userRepository`.

---

## 6. File Structure — Target State

```
src/
├── providers/
│   └── backend/
│       ├── registry.js                        ← NEW: DI container
│       ├── contracts/
│       │   ├── authProvider.js                ← NEW: interface
│       │   ├── userProvider.js                ← NEW: interface
│       │   ├── auditProvider.js               ← NEW: interface
│       │   ├── projectProvider.js             ← NEW: interface
│       │   ├── storageProvider.js             ← NEW: interface
│       │   └── standardsProvider.js           ← NEW: interface
│       ├── firebase/
│       │   ├── firebaseAuthProvider.js        ← NEW: refactored from api/firebaseAuthApi.js
│       │   ├── firebaseUserProvider.js        ← NEW: refactored from api/firestoreUserApi.js
│       │   ├── firebaseAuditProvider.js       ← NEW: extracted from firestoreUserApi.js
│       │   ├── firebaseProjectProvider.js     ← NEW: when needed
│       │   └── firebaseStorageProvider.js     ← NEW: when needed
│       └── supabase/                          ← FUTURE
│           ├── supabaseAuthProvider.js
│           ├── supabaseUserProvider.js
│           └── ...
├── api/                                       ← EVENTUALLY REMOVED
│   ├── firebaseAuthApi.js                     → MIGRATE to providers/backend/firebase/
│   ├── firestoreUserApi.js                    → MIGRATE
│   └── localStorageApi.js                     → KEEP (platform API, not backend-specific)
├── repositories/                              ← REFACTORED
│   ├── authRepository.js                      → Uses registry, not direct import
│   ├── userRepository.js                      → Uses registry + normalization
│   ├── projectRepository.js                   → Uses registry (remote) + local fallback
│   ├── auditRepository.js                     ← NEW, extracted from userRepository
│   └── standardsRepository.js                 ← NEW
├── config/
│   ├── errorMessages.js                       → Make backend-agnostic (P3)
│   ├── authPolicy.js                          → Unchanged (business logic)
│   └── backendConfig.js                       ← NEW: backend selection
├── types/
│   ├── index.js                               ← ADD: NormalizedUser, AuthSession types
│   └── normalizedTypes.js                     ← NEW
├── store/                                     ← REFACTORED
│   ├── authStore.js                           → Use normalized types only
│   └── projectStore.js                        → Use projectRepository (already does)
├── pages/                                     ← UNCHANGED (no Firebase imports)
├── components/                                ← UNCHANGED
└── engine/                                    ← UNCHANGED
```

---

## 7. Migration Path: Firebase → Supabase

### Phase 1: Interface Design (Week 1)
- Create `providers/backend/contracts/*` — all 6 provider interfaces
- Create `providers/backend/registry.js` — DI container
- Create `types/normalizedTypes.js` — shared normalized types
- Refactor repositories to use registry
- Refactor `authStore.js` to use normalized types only
- **Zero behavioral change. All tests pass.**

### Phase 2: Firebase Provider Cleanup (Week 2)
- Migrate `api/firebaseAuthApi.js` → `providers/backend/firebase/firebaseAuthProvider.js`
- Migrate `api/firestoreUserApi.js` → `providers/backend/firebase/firebaseUserProvider.js`
- Extract audit logic from `firestoreUserApi.js` → `firebaseAuditProvider.js`
- Extract `auditRepository.js` from `userRepository.js`
- Wire registry in `main.jsx`
- **Still Firebase underneath. All tests pass.**

### Phase 3: Supabase Implementation (Weeks 3-4)
- Add `@supabase/supabase-js` dependency
- Implement all 6 providers for Supabase
- Add `configureBackend('supabase', {...})` toggle
- Write provider-level integration tests
- Migrate user data from Firebase Auth → Supabase Auth
- Run both backends in parallel for testing

### Phase 4: Removal (Week 5)
- Switch to Supabase in production
- Remove Firebase SDK from `package.json`
- Remove `providers/backend/firebase/`
- Remove `firebase.json`, `firestore.rules`, `storage.rules`
- Deploy

---

## 8. Non-Goals (What Does NOT Change)

| Component | Reason |
|-----------|--------|
| **Engine modules** (`engine/`) | Pure functions, zero side effects, already portable |
| **Constants** (`constants/`) | Static data, zero backend dependency |
| **Standards** (`standards/`) | Embedded JS modules; could become remote-loaded later |
| **Reporting** (`reporting/`) | Pure export, uses jsPDF/xlsx, zero backend calls |
| **UI components** (`components/ui.jsx`, etc.) | Already zero backend imports |
| **All page components** | Already import stores only, never Firebase |
| **localStorageApi** | Browser platform API, stays regardless of backend |
| **AuthPolicy** (`config/authPolicy.js`) | Domain/role business rules, backend-agnostic |

---

## 9. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `authStore.test.js` needs rewrite | Medium | Mock Provider interface, not Firebase SDK |
| `firestore.rules.test.js` becomes invalid | Low | Replace with Supabase RLS tests when migrating |
| `e2e/productionSmoke.spec.js` references Firestore URL | Low | Update to Supabase REST API when migrating |
| `scripts/seed-firebase-users.mjs` obsolete | Low | Replace with Supabase seed script |
| Performance regression from added abstraction layer | Very Low | One extra function call per operation; negligible |

---

## 10. Success Criteria

After Phase 1+2 completion (interface design + Firebase refactor):

1. ✅ Zero `firebase/auth` or `firebase/firestore` imports outside `providers/backend/firebase/`
2. ✅ All repositories import from `registry.js`, not from `../api/firebase*.js`
3. ✅ `NormalizedUser` type is the only user shape known to the store + UI
4. ✅ Switching backend is a single `configureBackend(...)` call in `main.jsx`
5. ✅ All existing 290+ tests pass without modification (or with mock provider updates only)
6. ✅ `flutter analyze` (218 files) shows 0 new issues
7. ✅ E2E smoke tests pass with both backends

After Phase 3 (Supabase implementation):

1. ✅ Supabase Auth signs in users previously created in Firebase
2. ✅ User profiles load correctly from Supabase PostgreSQL
3. ✅ Audit logs write to Supabase and are queryable
4. ✅ Offline queue works with Supabase (retry logic unchanged)

---

## 11. Effort Summary

| Phase | Tasks | Calendar Time | Developer Days |
|-------|-------|---------------|----------------|
| Phase 1: Interfaces | 6 contracts, registry, normalized types | 1 week | 5 days |
| Phase 2: Firebase Refactor | 4 provider migrations, repo cleanup | 1 week | 5 days |
| Phase 3: Supabase Implementation | 6 provider implementations, data migration, tests | 2 weeks | 10 days |
| Phase 4: Cleanup | Remove Firebase, production switch | 1 week | 3 days |
| **Total** | | **5 weeks** | **23 days** |

---

## 12. Long-Term Vision

```
Current:  Firebase Auth + Firestore (users only)
          ↓
Phase 3:  Supabase (Firebase-compatible, PostgreSQL underneath)
          ↓
Future:   Any PostgreSQL-compatible backend (Neon, AWS RDS, Azure SQL)
          + Any Auth provider (Auth0, Clerk, Keycloak, Supabase Auth)
          + Any Storage (S3, Supabase Storage, Azure Blob)
          + Any Standards source (API, database, filesystem)
```

The Provider interface layer ensures that the **engineering core never changes** — regardless of which backend infrastructure is underneath.
