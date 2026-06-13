# BACKEND PORTABILITY AUDIT — RAXA CP Designer Platform

**Audit Date:** 2026-06-12  
**Auditor:** Kun / DeepSeek GUI  
**Codebase:** `cp-platform/src/`  
**Framework:** React 19 + Vite 8 + Zustand 5 + Immer 11  
**Current Backend:** Firebase Auth + Firestore (users, audit logs only)

---

## 1. Executive Summary

### 1.1 Architecture Scorecard

| Dimension | Score | Notes |
|-----------|-------|-------|
| **UI-Backend Decoupling** | ✅ **Good** | Zero Firebase imports in components/pages |
| **Repository Pattern** | ⚠️ **Partial** | Exists for Auth + Users, missing for Projects/Calculations/Standards |
| **Provider Abstraction** | ❌ **Missing** | No interface layer — repositories call Firebase-specific APIs directly |
| **Authentication Decoupling** | ⚠️ **Partial** | `authRepository` wraps Firebase, but `authStore` knows Firebase `User` shape |
| **Storage Decoupling** | ✅ **N/A** | Firebase Storage not yet used; only rules exist |
| **Error Mapping** | ⚠️ **Coupled** | Error map contains Firebase error codes; caller-agnostic otherwise |
| **Migration Readiness** | **5.5 / 10** | Good separation but missing key abstractions |

### 1.2 Migration Complexity Score: **MODERATE (6.0 / 10)**

Estimated effort to replace Firebase with another backend: **4-6 engineering weeks** (one senior developer).

---

## 2. Current Architecture Assessment

### 2.1 Actual Layer Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: PRESENTATION (UI)                                     │
│  pages/*.jsx, components/*.jsx                                  │
│  Imports: useAuthStore, useProjectStore, hooks                  │
│  ✅ ZERO Firebase imports                                        │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: STATE MANAGEMENT                                      │
│  store/authStore.js, store/projectStore.js                      │
│  Imports: authRepository, userRepository, localStorageApi       │
│  ⚠️ authStore knows Firebase User shape (uid, emailVerified…)   │
│  ⚠️ authStore calls authRepository.onAuthStateChanged() directly │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: REPOSITORY (Partial)                                  │
│  repositories/authRepository.js                                 │
│  repositories/userRepository.js                                 │
│  repositories/projectRepository.js                              │
│  ✅ authRepository wraps firebaseAuthApi                        │
│  ✅ userRepository wraps firestoreUserApi                       │
│  ❌ projectRepository uses localStorage only (no remote)        │
│  ❌ No repositories for: Standards, Calculations, Reports       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: API PROVIDER (Firebase-specific)                      │
│  api/firebaseAuthApi.js    — wraps Firebase Auth SDK            │
│  api/firestoreUserApi.js   — wraps Firestore SDK                │
│  api/localStorageApi.js    — wraps localStorage                 │
│  ❌ No interface/contract above this layer                      │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 5: FIREBASE SDK (Vendor Lock)                            │
│  firebase/config.js — init, getAuth, appCheck                   │
│  firebase/app, firebase/auth, firebase/firestore                │
│  firebase/app-check (reCAPTCHA)                                 │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 6: INFRASTRUCTURE                                        │
│  firestore.rules, storage.rules, firebase.json                  │
│  Firebase Hosting (dist/)                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 What Follows the Pattern vs. What Violates It

| Component | Follows Pattern? | Violation |
|-----------|-----------------|-----------|
| `LoginPage.jsx` | ✅ | Imports `useAuthStore` only |
| `RegisterPage.jsx` | ✅ | Imports `useAuthStore` only |
| `UserManagementPage.jsx` | ✅ | Imports `useAuthStore` only |
| `ProtectedRoute.jsx` | ✅ | Imports `useAuthStore` only |
| `authStore.js` | ⚠️ | References `firebaseUser.uid`, `firebaseUser.emailVerified`, etc. |
| `authRepository.js` | ✅ | Clean wrapper over `firebaseAuthApi` |
| `userRepository.js` | ✅ | Clean wrapper over `firestoreUserApi` |
| `projectRepository.js` | ⚠️ | localStorage only; no remote sync path |
| `firebaseAuthApi.js` | N/A | Direct Firebase SDK calls — target for abstraction |
| `firestoreUserApi.js` | N/A | Direct Firebase SDK calls — target for abstraction |
| `errorMessages.js` | ⚠️ | Maps Firebase error codes; caller-agnostic but maintenance drag |
| `engine/`, `constants/`, `types/` | ✅ | Pure domain logic, zero backend dependency |
| `services/` | ✅ | Pure orchestration over engine, zero backend dependency |
| `reporting/` | ✅ | Pure export generation, zero backend dependency |

---

## 3. Repository Pattern Audit

### 3.1 Existing Repositories

| Repository | File | Status | Remote | Offline |
|------------|------|--------|--------|---------|
| `authRepository` | `repositories/authRepository.js` | ✅ Complete | Firebase Auth | N/A |
| `userRepository` | `repositories/userRepository.js` | ✅ Complete | Firestore | Queue-based |
| `projectRepository` | `repositories/projectRepository.js` | ⚠️ Incomplete | ❌ None | localStorage |

### 3.2 Missing Repositories

| Repository | Needed For | Current State |
|------------|------------|---------------|
| `standardsRepository` | Loading engineering standards (Saudi Aramco, NACE, ISO, ADNOC, PDO) | Hardcoded in `src/standards/*.js` |
| `calculationRepository` | Persisting/syncing calculation results | Embedded in `projectStore` via localStorage |
| `settingsRepository` | User preferences, theme, workspace config | Embedded in `projectStore` via localStorage |
| `auditRepository` | Audit log CRUD | Mixed into `userRepository` |
| `reportRepository` | Generated reports storage/retrieval | Pure export; no persistence |

### 3.3 Direct Backend Calls (Violations)

**None found in UI layer.** All pages/components go through stores. However:

- `authStore.js` references `firebaseUser` object shape directly (L32-L38, L79-L110)
- `authStore.js` calls `authRepository.onAuthStateChanged()` and receives a Firebase `User` object
- `errorMessages.js` maps Firebase error codes (`auth/user-not-found`, etc.)

These are the only coupling points between the application layer and Firebase specifics.

---

## 4. Backend Provider Layer Design

### 4.1 Proposed Interface Architecture

```
                    ┌──────────────────────┐
                    │   Application Layer   │
                    │  (Stores + Repos)     │
                    └──────┬───────────────┘
                           │ depends on
                    ┌──────▼───────────────┐
                    │  Provider Interfaces  │
                    │  (Abstract Contracts) │
                    └──────┬───────────────┘
                           │ implemented by
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌────────▼───────┐  ┌───────▼──────┐
│  Firebase    │  │   Supabase     │  │   Custom     │
│  Provider    │  │   Provider     │  │  REST/GraphQL│
└──────────────┘  └────────────────┘  └──────────────┘
```

### 4.2 Core Provider Interfaces

```typescript
// ─── providers/backend/AuthProvider.js ───

/**
 * @interface AuthProvider
 * Abstract authentication contract. Implementations:
 *   - FirebaseAuthProvider
 *   - SupabaseAuthProvider
 *   - CustomRestAuthProvider
 */
export const AuthProvider = {
  /** Sign in with email + password. Returns normalized UserCredential. */
  signIn(email, password) → { user: NormalizedUser, token: string },

  /** Create account. Returns normalized UserCredential. */
  signUp(email, password) → { user: NormalizedUser, token: string },

  /** Sign out current session. */
  signOut() → void,

  /** Subscribe to auth state changes. Returns unsubscribe function. */
  onAuthStateChanged(callback: (NormalizedUser | null) => void) → () => void,

  /** Send password reset email. */
  sendPasswordReset(email) → void,

  /** Send email verification. */
  sendVerification(user: NormalizedUser) → void,
}

/** Normalized user shape — backend-agnostic */
const NormalizedUser = {
  uid: string,
  email: string | null,
  displayName: string | null,
  emailVerified: boolean,
  metadata: {
    creationTime: string,
    lastSignInTime: string,
  }
}
```

```typescript
// ─── providers/backend/UserProvider.js ───

/**
 * @interface UserProvider
 * User profile CRUD. Implementations:
 *   - FirestoreUserProvider
 *   - PostgresUserProvider
 *   - SupabaseUserProvider
 */
export const UserProvider = {
  /** Fetch profile by uid */
  getUserProfile(uid) → NormalizedProfile | null,

  /** Create or update profile */
  setUserProfile(uid, data, options?) → void,

  /** Fetch all users in organization */
  getAllUsers(organizationId) → NormalizedProfile[],

  /** Create audit log entry */
  createAuditLog(logId, logData) → void,

  /** Fetch all audit logs */
  getAuditLogs() → NormalizedAuditLog[],
}
```

```typescript
// ─── providers/backend/ProjectProvider.js ───

/**
 * @interface ProjectProvider
 * Remote project persistence. Implementations:
 *   - FirestoreProjectProvider (future)
 *   - PostgresProjectProvider
 *   - SupabaseProjectProvider
 */
export const ProjectProvider = {
  /** Save/update project remotely */
  saveProject(projectId, projectData) → void,

  /** Load project from remote */
  loadProject(projectId) → NormalizedProject | null,

  /** List all projects for user/org */
  listProjects(organizationId) → NormalizedProject[],

  /** Save revision snapshot */
  saveRevision(projectId, revisionData) → void,

  /** Load revision snapshots */
  listRevisions(projectId) → NormalizedRevision[],
}
```

```typescript
// ─── providers/backend/StorageProvider.js ───

/**
 * @interface StorageProvider
 * File/blob storage. Implementations:
 *   - FirebaseStorageProvider
 *   - S3StorageProvider
 *   - SupabaseStorageProvider
 *   - AzureBlobProvider
 */
export const StorageProvider = {
  /** Upload a file */
  upload(path, blob, metadata?) → string /* URL */,

  /** Download a file */
  download(path) → Blob,

  /** Delete a file */
  delete(path) → void,

  /** Generate signed URL for sharing */
  getSignedUrl(path, expiresIn?) → string,
}
```

### 4.3 Provider Registry (Dependency Injection)

```javascript
// providers/backend/registry.js

import { firebaseAuthApi } from '../../api/firebaseAuthApi.js'
import { firestoreUserApi } from '../../api/firestoreUserApi.js'

let authProvider = firebaseAuthApi     // default
let userProvider = firestoreUserApi    // default
let projectProvider = null             // not yet remote
let storageProvider = null             // not yet implemented

export const backendRegistry = {
  getAuthProvider: () => authProvider,
  setAuthProvider: (p) => { authProvider = p },
  getUserProvider: () => userProvider,
  setUserProvider: (p) => { userProvider = p },
  getProjectProvider: () => projectProvider,
  setProjectProvider: (p) => { projectProvider = p },
  getStorageProvider: () => storageProvider,
  setStorageProvider: (p) => { storageProvider = p },
}
```

Repositories would then use `backendRegistry.getAuthProvider()` instead of importing `firebaseAuthApi` directly.

---

## 5. Authentication Decoupling Audit

### 5.1 Current State

| File | What It Does | Firebase Coupling |
|------|-------------|-------------------|
| `api/firebaseAuthApi.js` | Wraps Firebase Auth SDK | **Hard** — only Firebase |
| `repositories/authRepository.js` | Business logic wrapper | **Soft** — imports firebaseAuthApi |
| `store/authStore.js` | Auth state management | **Medium** — references Firebase User shape, calls `onAuthStateChanged` |
| `components/ProtectedRoute.jsx` | Route guarding | **None** — uses `useAuthStore` only |
| `pages/LoginPage.jsx` | Login form | **None** — uses `useAuthStore` only |

### 5.2 What Must Change to Decouple

1. **Define `NormalizedUser`** — a plain object shape that all auth providers produce
2. **Refactor `authStore`** to work with `NormalizedUser` instead of Firebase `User`
3. **Create `AuthProvider` interface** — abstract contract for signIn/signUp/signOut/onAuthStateChanged
4. **Create `FirebaseAuthProvider`** — implements `AuthProvider` using Firebase SDK
5. **Update `authRepository`** to use provider from registry, not direct import
6. **Update `authStore.test.js`** — mock the interface, not Firebase SDK functions

### 5.3 Effort Estimate: **2-3 days** (one developer)

---

## 6. Storage Decoupling Audit

### 6.1 Current State

| Storage Type | Used? | Where |
|-------------|-------|-------|
| Firebase Storage | ❌ Not used | Only `storage.rules` exists |
| localStorage | ✅ Heavily used | Project data, auth session, theme, audit queue |
| In-memory | ✅ Used | Zustand state cache |
| File Export | ✅ Used | PDF (jsPDF), Excel (xlsx), JSON export |

### 6.2 What Must Change

Since Firebase Storage is not yet used, there is **zero migration risk** for storage. When storage is needed (reports, uploads), the `StorageProvider` interface above should be implemented first.

**Recommendation:** Implement `StorageProvider` as a pure abstraction *before* adding any storage feature. This prevents future lock-in.

---

## 7. Database Portability Score

### 7.1 Per-Domain Assessment

| Domain | Current Storage | Portability | Reason |
|--------|----------------|-------------|--------|
| **Authentication** | Firebase Auth | **Hard** | Deeply embedded; requires `AuthProvider` abstraction + migration of user accounts |
| **User Profiles** | Firestore `users/` | **Medium** | Clean repository pattern exists; only 1 API file to replace |
| **Audit Logs** | Firestore `audit_logs/` | **Medium** | Mixed into `userRepository`; should be separate repository + provider |
| **Projects** | localStorage only | **Easy** | No remote storage yet; adding is green-field |
| **Stations** | localStorage only | **Easy** | Same as Projects |
| **Calculations** | localStorage (embedded) | **Easy** | Pure deterministic; no remote storage needed; persists with project |
| **Reports** | In-memory + export | **Easy** | No persistence currently |
| **Settings** | localStorage | **Easy** | `localStorageApi` already abstracted |
| **Standards** | Hardcoded JS modules | **Easy** | Static data; could become remote-loaded |
| **Firestore Rules** | `firestore.rules` | **N/A** | Will be replaced by equivalent in target backend (RLS, etc.) |

### 7.2  Overall Portability Score: **5.5 / 10**

The core engineering domain (70% of the codebase) is already **fully backend-independent**. The Firebase coupling is concentrated in auth + user management (30% of backend surface).

---

## 8. Target Architecture Comparison

### 8.1 Backend Options Evaluated

| Backend | Auth | Database | Storage | Offline | Multi-User | Enterprise | Effort |
|---------|------|----------|---------|---------|------------|------------|--------|
| **Firebase** (current) | ✅ Built-in | ✅ Firestore | ✅ Available | ⚠️ Partial | ✅ | ⚠️ Moderate | 0 |
| **Supabase** | ✅ Built-in | ✅ PostgreSQL | ✅ S3-compatible | ⚠️ Partial | ✅ | ✅ | **3-4 weeks** |
| **Neon PostgreSQL** | ❌ DIY | ✅ Serverless PG | ❌ DIY | ❌ No | ❌ DIY | ✅ | **6-8 weeks** |
| **PostgreSQL + REST API** | ❌ DIY | ✅ Self-managed | ❌ DIY | ❌ No | ❌ DIY | ✅ | **8-12 weeks** |
| **Custom REST/GraphQL** | ❌ DIY | ✅ Any | ❌ DIY | ❌ No | ❌ DIY | ✅ | **10-16 weeks** |

### 8.2 Recommendation: **Supabase**

**Why Supabase:**

1. **Closest to Firebase mentally** — Auth, database, storage in one platform
2. **PostgreSQL underneath** — industry standard, no vendor lock
3. **Row-Level Security** — equivalent to Firestore rules, defined in SQL
4. **Self-hostable** — can run Supabase on-premise for enterprise deployments
5. **Real-time subscriptions** — equivalent to Firestore `onSnapshot`
6. **Migration compatibility** — Firebase Auth users can be exported/imported
7. **Open source** — no platform risk; can exit to vanilla PostgreSQL anytime

**Migration path:**
```
Week 1: Design + implement Provider interfaces (zero Firebase changes)
Week 2: Implement SupabaseAuthProvider + SupabaseUserProvider
Week 3: Migrate user data + test both backends side-by-side
Week 4: Switch over + remove Firebase SDK
```

---

## 9. Current Maturity Score

| Capability | Status | Score |
|-----------|--------|-------|
| Repository pattern | Partial (auth + users only) | 6/10 |
| Provider abstraction | Missing | 2/10 |
| Normalized data types | Missing | 2/10 |
| Offline queue | Partial (audit logs only) | 5/10 |
| Error abstraction | Partial (Firebase codes mapped) | 5/10 |
| Dependency injection | Manual imports | 3/10 |
| Testing with backend mocks | Present (authStore.test.js) | 6/10 |
| **Overall Maturity** | | **4.1 / 10** |

---

## 10. Recommended Implementation Order

| Phase | Task | Effort | Priority |
|-------|------|--------|----------|
| **P0** | Define `NormalizedUser` type | 2 hours | Critical |
| **P0** | Define `AuthProvider` interface | 4 hours | Critical |
| **P0** | Define `UserProvider` interface | 4 hours | Critical |
| **P1** | Create `backend/registry.js` | 2 hours | High |
| **P1** | Refactor `authRepository` to use registry | 4 hours | High |
| **P1** | Refactor `userRepository` to use registry | 4 hours | High |
| **P1** | Extract `auditRepository` from `userRepository` | 4 hours | High |
| **P1** | Refactor `authStore` to use `NormalizedUser` | 6 hours | High |
| **P2** | Define `ProjectProvider` interface | 2 hours | Medium |
| **P2** | Define `StorageProvider` interface | 2 hours | Medium |
| **P2** | Define `StandardsProvider` interface | 2 hours | Medium |
| **P3** | Update `errorMessages.js` to be backend-agnostic | 4 hours | Low |
| **P3** | Create provider-level integration tests | 8 hours | Low |

**Total estimated effort: 2-3 engineering weeks** for full interface design + Firebase refactor (no migration).

---

## 11. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Firebase Auth user export limitations | Medium | Supabase supports Firebase Auth import; test early |
| Firestore rules → RLS translation | Low | Supabase RLS is more expressive; mapped in design phase |
| Offline queue needs rewrite | Low | Existing queue pattern (`localStorageApi`) is backend-agnostic |
| `authStore` refactor breaks login flow | High | Existing tests + E2E smoke tests catch regressions |
| Engineering calculations depend on localStorage | None | Fully isolated in engine layer; no change needed |

---

## 12. Conclusion

The RAXA CP Designer platform has **good UI-backend separation** but **incomplete backend abstraction**. The Firebase dependency is concentrated in 2 API files + 1 store file. The engineering core (70% of code) is fully portable.

**Recommended priority:** Implement Provider interfaces (Phase 0-1 above) within the next development cycle. This adds zero migration risk, zero behavioral change, and makes the codebase ready for any backend switch without touching a single UI component.

**Migration complexity score: 6.0 / 10** — Moderate effort, well-scoped, clean separation already in place.

**Estimated total migration effort (Firebase → Supabase): 4-6 weeks** (one senior developer), including:
- 2 weeks: Provider interfaces + refactoring
- 2 weeks: Supabase provider implementation + data migration
- 1-2 weeks: Testing, E2E, deployment
