# BACKEND DEPENDENCY MAP — RAXA CP Designer Platform

**Generated:** 2026-06-12
**Audit Scope:** `cp-platform/src/` + config files
**Method:** Recursive grep of all `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs` sources (excluding `node_modules/` and `dist/`)

---

## 1. Firebase Dependency Inventory

### 1.1 npm Dependencies

| Package | Version | Purpose | Risk if Removed |
|---|---|---|---|
| `firebase` | ^12.14.0 | Auth SDK + Firestore SDK + App Check | Auth system breaks completely |
| `firebase-admin` | ^14.0.0 | Seed scripts + token validation (dev) | Admin scripts break |
| `@firebase/rules-unit-testing` | ^5.0.1 | Firestore rules test harness | Rules tests break |

### 1.2 Source Code Dependencies — Detailed Map

#### A. Firebase SDK Initialization

| File | Lines | Firebase Imports | Purpose | Migration Risk | Priority |
|---|---|---|---|---|---|
| `src/firebase/config.js` | 1–41 | `firebase/app`, `firebase/auth`, `firebase/app-check` | Initialize Firebase app, get `auth` singleton, optional App Check | **HIGH** — Single choke point for all Firebase init. Must be replaced wholesale. | **P1** |

**Details:**
- `initializeApp(firebaseConfig)` — reads VITE_FIREBASE_* env vars
- `getAuth(app)` — exports `auth` singleton used by `firebaseAuthApi`
- `connectAuthEmulator(auth, ...)` — dev-only emulator support
- `initializeAppCheck(...)` — production-only App Check (reCAPTCHA v3)

---

#### B. Auth API Layer

| File | Lines | Firebase Imports | Purpose | Migration Risk | Priority |
|---|---|---|---|---|---|
| `src/api/firebaseAuthApi.js` | 1–70 | `firebase/auth` | Wraps 7 Firebase Auth SDK functions | **MEDIUM** — Clean wrapper with clear method signatures. Replaceable. | **P2** |

**Methods:**
- `signIn(email, password)` → `signInWithEmailAndPassword(auth, ...)`
- `signUp(email, password)` → `createUserWithEmailAndPassword(auth, ...)`
- `signOut()` → `signOut(auth)`
- `onAuthStateChanged(callback)` → `onAuthStateChanged(auth, callback)`
- `sendPasswordReset(email)` → `sendPasswordResetEmail(auth, email)`
- `sendVerification(firebaseUser)` → `sendEmailVerification(firebaseUser)`

**Note:** `sendVerification` accepts a raw Firebase `User` object — this is a leak of Firebase type into the API layer.

---

#### C. Firestore API Layer

| File | Lines | Firebase Imports | Purpose | Migration Risk | Priority |
|---|---|---|---|---|---|
| `src/api/firestoreUserApi.js` | 1–51 | `firebase/firestore` | Wraps 5 Firestore CRUD operations | **MEDIUM** — Clean wrapper. Returns Firestore `DocumentSnapshot`/`QuerySnapshot` objects (type leak). | **P2** |

**Methods:**
- `getUserProfile(uid)` → `getDoc(doc(db, 'users', uid))`
- `setUserProfile(uid, data, options)` → `setDoc(doc(db, 'users', uid), data, options)`
- `getAllUsers(organizationId)` → `getDocs(query(collection(...)))`
- `createAuditLog(logId, logData)` → `setDoc(doc(db, 'audit_logs', logId), logData)`
- `getAuditLogs()` → `getDocs(collection(db, 'audit_logs'))`

**Note:** All methods call `getFirestore()` directly (no dependency injection). Returns raw Firestore types (`DocumentSnapshot.exists()`, `querySnapshot.forEach()`) that leak into `userRepository.js`.

---

#### D. Repository Layer

| File | Lines | Firebase Dependency | Type | Migration Risk | Priority |
|---|---|---|---|---|---|
| `src/repositories/authRepository.js` | 1–67 | `import { firebaseAuthApi } from '../api/firebaseAuthApi.js'` | Indirect (via API) | **LOW** — Clean facade. Method names are provider-agnostic. | **P3** |
| `src/repositories/userRepository.js` | 1–286 | `import { firestoreUserApi } from '../api/firestoreUserApi.js'` | Indirect (via API) | **MEDIUM** — Large file (286 lines). Calls `.exists()`, `.data()`, `.forEach()` on Firestore types. | **P2** |

**Details:**
- `authRepository` methods: `signIn`, `signUp`, `signOut`, `onAuthStateChanged`, `sendPasswordReset` — all provider-agnostic names
- `userRepository` methods: `fetchUserProfile`, `createUserProfile`, `fetchUsersList`, `approveUser`, `rejectUser`, `updateUserRole`, `suspendUser`, `disableUser`, `enableUser`, `logAuditEvent`, `fetchAuditLogs`, `updateUserLastLogin`
- `userRepository` calls `querySnapshot.forEach((doc) => list.push(doc.data()))` — Firestore-specific data extraction pattern
- `userRepository` calls `userDoc.exists()` — Firestore-specific existence check

---

#### E. State Management (Zustand Store)

| File | Lines | Firebase Dependency | Type | Migration Risk | Priority |
|---|---|---|---|---|---|
| `src/store/authStore.js` | 1–672 | `import { authRepository }`, `import { userRepository }` | Indirect (via Repository) | **LOW** — Only references repositories. One function name `mapFirebaseUser` needs renaming. | **P3** |

**Details:**
- `mapFirebaseUser(firebaseUser, ...)` — function name references "Firebase" but only accesses standard User properties (`uid`, `email`, `displayName`, `photoURL`). Rename to `mapAuthUser`.
- 15 calls to `authRepository.*` methods — all provider-agnostic
- 4 calls to `userRepository.*` methods — all provider-agnostic

---

#### F. Config Layer (Soft Coupling)

| File | Lines | Firebase Reference | Type | Migration Risk | Priority |
|---|---|---|---|---|---|
| `src/config/errorMessages.js` | 1–87 | Maps Firebase error codes to user messages | Soft (string matching only) | **LOW** — Only maps strings. Replace with new backend error codes. | **P3** |

**Details:**
- `ERROR_MAP` object keys include `auth/user-not-found`, `auth/wrong-password`, `auth/too-many-requests`, etc.
- `mapFirebaseError(error)` extracts Firebase error codes via regex
- No import of Firebase SDK — pure string matching
- **Design Note:** This is a well-designed abstraction. Replace ERROR_MAP keys with new backend's error codes.

---

#### G. Firebase Configuration Files

| File | Purpose | Migration Risk | Priority |
|---|---|---|---|
| `firebase.json` | Firebase Hosting + Firestore + Storage config | **LOW** — Only relevant if using Firebase Hosting | **P3** |
| `firestore.rules` | Firestore security rules (99 lines) | **MEDIUM** — Rules must be re-implemented for new backend | **P1** |
| `firestore.indexes.json` | Firestore composite indexes | **LOW** — Only relevant for Firestore | **P3** |
| `storage.rules` | Firebase Storage rules (26 lines) | **LOW** — Storage SDK not yet used in code | **P3** |
| `.firebaserc` | Firebase project alias | **LOW** — Deployment config only | **P3** |

---

#### H. Test Files

| File | Firebase Dependency | Migration Risk | Priority |
|---|---|---|---|
| `src/store/authStore.test.js` | Mocks `firebase/auth` and `firebase/firestore` | **LOW** — Mock imports can be redirected | **P3** |
| `src/test-utils/firestore.rules.test.js` | `@firebase/rules-unit-testing`, `firebase/firestore` | **MEDIUM** — Rules tests must be rewritten for new backend | **P2** |

---

#### I. Scripts (Dev/Admin Tools)

| File | Firebase Dependency | Migration Risk | Priority |
|---|---|---|---|
| `scripts/seed-firebase-users.mjs` | `firebase-admin/app`, `firebase-admin/auth` | **LOW** — Replaceable admin script | **P3** |
| `scripts/setup-smoke-users.mjs` | `firebase-admin` (via seed script) | **LOW** — Smoke test helper | **P3** |

---

#### J. E2E Tests

| File | Firebase Dependency | Migration Risk | Priority |
|---|---|---|---|
| `src/e2e/productionSmoke.spec.js` | References `firebase-tools.json` config + Firestore REST API | **LOW** — E2E tests to be rewritten for new backend endpoint | **P3** |

---

## 2. Files With ZERO Firebase References

The following source directories are **completely clean** — no Firebase imports, no Firestore, no Auth references:

| Directory | Files | Content | Portability |
|---|---|---|---|
| `src/engine/` | ~15 files | Pure engineering calculations, resistivity models, optimization | ✅ Fully portable |
| `src/constants/` | 1 file | Engineering constants registry | ✅ Fully portable |
| `src/types/` | 1 file | JSDoc type definitions | ✅ Fully portable |
| `src/services/` | 3 files | Calculation orchestration, BOM service | ✅ Fully portable |
| `src/reporting/` | 5 files | PDF generator, Excel engine, BOM exporter | ✅ Fully portable |
| `src/pages/` | 26 files | All page components (import from stores only) | ✅ Fully portable |
| `src/components/` | 14 files | All UI components (import from stores only) | ✅ Fully portable |
| `src/hooks/` | 4 files | Animation, session timeout, rate limiting | ✅ Fully portable |
| `src/visualizations/` | ~8 files | Charts, protection bands, side panels | ✅ Fully portable |
| `src/standards/` | 5 files | Engineering standard implementations | ✅ Fully portable |
| `src/config/authPolicy.js` | 1 file | Domain validation, role permissions (no Firebase) | ✅ Fully portable |
| `src/config/workspaceRegistry.js` | 1 file | Workspace definitions | ✅ Fully portable |
| `src/api/localStorageApi.js` | 1 file | localStorage wrapper with in-memory fallback | ✅ Fully portable |

---

## 3. Dependency Graph (Firebase Only)

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI LAYER                                 │
│  pages/*.jsx  components/*.jsx  hooks/*.js                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ NO FIREBASE IMPORTS — useStore only                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ useAuthStore()  useProjectStore()
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STATE LAYER                                 │
│  store/authStore.js   store/projectStore.js                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Imports: authRepository, userRepository (NO firebase/*)   │   │
│  │ Weak ref: mapFirebaseUser function name (rename needed)   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ authRepository.*  userRepository.*
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REPOSITORY LAYER                              │
│  repositories/authRepository.js                                  │
│  repositories/userRepository.js                                  │
│  repositories/projectRepository.js ← localStorage ONLY, clean   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Imports: firebaseAuthApi, firestoreUserApi                │   │
│  │ NO firebase/* imports                                       │   │
│  │ Weak ref: .exists(), .data(), .forEach() Firestore types  │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ firebaseAuthApi.*  firestoreUserApi.*
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER                                   │
│  api/firebaseAuthApi.js   api/firestoreUserApi.js                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ DIRECT FIREBASE IMPORTS:                                   │   │
│  │   import { signInWithEmailAndPassword, ... } from          │   │
│  │     'firebase/auth'                                        │   │
│  │   import { getFirestore, doc, getDoc, ... } from           │   │
│  │     'firebase/firestore'                                   │   │
│  │   import { auth } from '../firebase/config.js'             │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ auth  getFirestore()
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FIREBASE SDK LAYER                             │
│  src/firebase/config.js                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ initializeApp(firebaseConfig)                              │   │
│  │ getAuth(app) → exports auth singleton                      │   │
│  │ initializeAppCheck(app, ReCaptchaV3Provider)               │   │
│  │ Env vars: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN│   │
│  │           VITE_FIREBASE_PROJECT_ID, etc.                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FIREBASE CLOUD                                 │
│  Firebase Auth  |  Cloud Firestore  |  Firebase Storage          │
│  (users/emails)   (users/, audit_logs/)  (rules only, unused)   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Migration Risk Summary

| Risk Level | Count | Files |
|---|---|---|
| **HIGH** | 1 | `src/firebase/config.js` (init choke point) |
| **MEDIUM** | 3 | `src/api/firebaseAuthApi.js`, `src/api/firestoreUserApi.js`, `src/repositories/userRepository.js` |
| **LOW** | 9 | `src/repositories/authRepository.js`, `src/store/authStore.js`, `src/config/errorMessages.js`, `firebase.json`, `firestore.indexes.json`, `storage.rules`, `.firebaserc`, `src/store/authStore.test.js`, `scripts/` |

---

## 5. Refactor Priority Queue

| Priority | Task | Files Affected | Effort |
|---|---|---|---|
| **P1** | Create `AuthProvider` interface + `FirebaseAuthProvider` implementation | `src/providers/auth/` (new) + `src/firebase/config.js` | 3–5 days |
| **P1** | Create `UserDataProvider` interface + `FirestoreUserProvider` | `src/providers/data/` (new) + `src/api/firestoreUserApi.js` | 2–3 days |
| **P2** | Rewrite `firebaseAuthApi.js` → generic `authProvider.js` behind interface | `src/api/firebaseAuthApi.js` → replace | 1–2 days |
| **P2** | Rewrite `firestoreUserApi.js` → generic `userDataProvider.js` behind interface | `src/api/firestoreUserApi.js` → replace | 1–2 days |
| **P2** | Fix return types in `userRepository.js` — stop leaking Firestore types | `src/repositories/userRepository.js` | 1 day |
| **P2** | Rename `mapFirebaseUser` → `mapAuthUser` in authStore | `src/store/authStore.js` | 0.5 day |
| **P3** | Rewrite `errorMessages.js` — support multiple backend error code maps | `src/config/errorMessages.js` | 1 day |
| **P3** | Rewrite `firestore.rules.test.js` for backend-agnostic rules testing | `src/test-utils/firestore.rules.test.js` | 2 days |
| **P3** | Abstract Firestore security rules into policy config | `firestore.rules` + new rules config | 2–3 days |

**Total Estimated Effort (P1–P3):** 15–22 engineering days
