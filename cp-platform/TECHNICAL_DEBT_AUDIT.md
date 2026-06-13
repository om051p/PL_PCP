# TECHNICAL DEBT AUDIT — RAXA CP Designer Platform

**Audit Date:** 2026-06-12
**Codebase:** `cp-platform/src/`
**Files Analyzed:** 91 production + 30 test
**Lines of Code:** ~24,720 src + ~9,365 test = ~34,000 total

---

## Executive Summary

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| **Technical Debt Ratio** | ~38% | <15% | Critical |
| **Largest File** | `projectStore.js` (1,134 lines) | <300 | 3.8× over |
| **Duplicate Code** | 2 complete files + 1 function pair | 0 | Must fix |
| **Auth Security** | E2E bypass in production code | Removed | Critical |
| **Test Coverage** | ~30% (estimated) | >70% | Significant |
| **Monolithic CSS** | 5,406 lines single file | Component-scoped | Must split |

---

## 1. Folder Structure Assessment

### 1.1 Current Structure

```
src/
├── api/               (3 files)  — Firebase-specific API wrappers
├── components/        (14 files) — Shared UI + layout
├── config/            (3 files)  — Auth policy, error messages, workspace registry
├── constants/         (1 file)   — All engineering constants (379 lines)
├── e2e/               (5 files)  — Playwright tests
├── engine/            (12 files) — Pure calculations, rules, optimizer
├── firebase/          (1 file)   — Firebase init
├── hooks/             (4 files)  — Custom React hooks
├── motion/            (2 files)  — Animation config
├── pages/             (26 files) — Route-level components
├── reporting/         (3 files)  — PDF, Excel, BOM export
├── repositories/      (3 files)  — Data access (auth, users, projects)
├── services/          (3 files)  — Calculation orchestration
├── standards/         (6 files)  — Engineering standards configs
├── store/             (2 files)  — Zustand stores (auth + project)
├── test-utils/        (4 files)  — Test helpers, verification framework
├── types/             (1 file)   — JSDoc type definitions
└── visualizations/    (13 dirs)  — SVG canvas, widgets, side panel
```

### 1.2 Issues Found

| Issue | Severity | Detail |
|-------|----------|--------|
| **Monolithic store** | 🔴 Critical | `projectStore.js` at 1,134 lines contains 30+ actions — project CRUD, station CRUD, tank/vessel calculations, workflow, revisions, theming, BOM |
| **God component file** | 🟠 High | `ui.jsx` exports 20 components in 532 lines — should be 20 separate files |
| **Monolithic CSS** | 🟠 High | `index.css` is 5,406 lines with no CSS modules, no component scoping |
| **Constants monolith** | 🟡 Medium | `constants/index.js` (379 lines) mixes design modes, specs, thresholds, standards — should be split by domain |
| **Test files in source** | 🟡 Medium | `firestore.rules.test.js` lives in `test-utils/` not `__tests__/` |
| **Duplicate root files** | 🔴 Critical | `resistivityEngine.js` and `resistivityEngine.test.js` exist at project root AND inside `src/engine/` — identical byte-for-byte |
| **Poor visualization nesting** | 🟡 Medium | Files like `visualizations/sidePanel/widgets/DonutChart.jsx` — 4 levels deep |

### 1.3 Recommended Restructure

```
src/
├── components/
│   ├── ui/            ← split ui.jsx into 20 individual files
│   ├── layout/        ← split layout.jsx (Sidebar, TopBar, ProjectSelector)
│   └── ...
├── constants/
│   ├── designModes.js
│   ├── anodeSpecs.js
│   ├── cableSpecs.js
│   ├── thresholds.js
│   └── index.js       ← re-exports only
├── store/
│   ├── projectStore.js        ← split into:
│   ├── projectSlice.js        ← project CRUD only
│   ├── stationSlice.js        ← station CRUD only
│   ├── calculationSlice.js    ← calculation orchestration
│   ├── tankVesselSlice.js     ← tank/vessel calculations
│   └── themeSlice.js          ← theme management
└── ...
```

---

## 2. State Management Audit

### 2.1 Current Architecture

```
authStore.js (672 lines)     projectStore.js (1,134 lines)
├── login (193 lines)        ├── getProject
├── register (51 lines)      ├── createProject
├── logout (128 lines)       ├── duplicateProject
├── setUser (19 lines)       ├── archiveProject
├── initialize (104 lines)   ├── deleteProject
├── sendVerification         ├── importProject
├── approveUser              ├── switchProject
├── rejectUser               ├── updateProject
├── suspendUser              ├── updateDesignBasis
├── enableUser               ├── addStation (20 actions)
├── disableUser              ├── removeStation
├── updateUserRole           ├── updateStation
├── sendPasswordReset        ├── calculateStation
├── fetchUsersList           ├── calculateAllStations
├── fetchAuditLogs           ├── advanceWorkflow
└── logAuditEvent (external) ├── createRevision
                             ├── runTankCalculations
                             ├── runVesselCalculations
                             ├── setTheme
                             ├── setNeedsRecalculation
                             ├── getBOMForStation
                             ├── exportProjectAsJSON
                             └── parseImportedFile
```

### 2.2 Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| **God store** | 🔴 Critical | `projectStore.js` violates Single Responsibility — 30+ actions across 5 domains |
| **Cross-store import** | 🟠 High | `projectStore` imports `useAuthStore` — tight coupling between state slices |
| **Auth state persisted to localStorage** | 🟠 High | User session (including approved/role) stored in plain localStorage — token theft risk |
| **E2E mock auth in production** | 🔴 Critical | `authStore.js:534` — `localStorage.getItem('e2e-mock-auth')` creates a bypass with engineer role, no production guard |
| **Store knows Firebase shape** | 🟡 Medium | `authStore` uses `firebaseUser.uid`, `.emailVerified`, `.photoURL` — tightly coupled |
| **No state selectors** | 🟡 Medium | Components import entire stores; no memoized selectors for derived state |
| **Zustand persist partialize** | 🟡 Medium | `authStore` persist whitelists `user`, `usersList`, `failedAttempts`, `lockoutUntil`, `sessionStart` — sensitive data in localStorage |

### 2.3 Refactor Target

Split `projectStore.js` into:
1. `projectSlice.js` — project metadata, CRUD, switching
2. `stationSlice.js` — station CRUD, segment management
3. `calculationSlice.js` — orchestration, result caching
4. `tankVesselSlice.js` — tank/vessel domain calculations
5. `themeSlice.js` — UI theme

Remove `useAuthStore` import from project store (use event bus or middleware).

---

## 3. Repository Pattern Audit

### 3.1 Current Repositories

| Repository | Lines | Operations | Backend |
|------------|-------|------------|---------|
| `authRepository.js` | 67 | signIn, signUp, signOut, onAuthStateChanged, sendPasswordReset | Firebase Auth |
| `userRepository.js` | 286 | fetchUserProfile, createUserProfile, approveUser, rejectUser, suspendUser, enableUser, updateUserRole, logAuditEvent, fetchAuditLogs | Firestore |
| `projectRepository.js` | 127 | loadProjects, saveProjects, exportProject, parseImportedFile | localStorage only |

### 3.2 Missing Repositories

| Domain | Status | Risk |
|--------|--------|------|
| **AuditLogRepository** | ❌ Missing | Audit logging is embedded in `userRepository.js` (lines 193-261) — mixed concerns |
| **StandardsRepository** | ❌ Missing | Standards are hardcoded JS modules — no remote loading, no versioning |
| **CalculationRepository** | ⚠️ N/A | Calculations are pure functions; no persistence needed |
| **ReportRepository** | ⚠️ N/A | Reports are generated client-side; no persistence needed |
| **StorageRepository** | ❌ Missing | Firebase Storage rules exist but no code uses storage yet; no abstraction |

### 3.3 Violations

| Violation | File | Detail |
|-----------|------|--------|
| **Direct Firestore access** | `firestoreUserApi.js` | Called directly by `userRepository.js` — should go through Provider interface |
| **Direct Firebase Auth access** | `firebaseAuthApi.js` | Called directly by `authRepository.js` — same issue |
| **Audit + User mixed** | `userRepository.js:193-261` | `logAuditEvent`, `queueOffline`, `processQueue` are audit concerns, not user concerns |
| **No interface contracts** | All repositories | No `AuthProvider` or `UserProvider` interface — repositories call Firebase-specific APIs directly |

---

## 4. Provider Layer Audit

### 4.1 Current State

```
api/
├── firebaseAuthApi.js    — Firebase Auth SDK wrapper
├── firestoreUserApi.js   — Firestore SDK wrapper
└── localStorageApi.js    — localStorage wrapper

NO provider interface layer exists.
Repositories import api/* directly.
Switching backends requires rewriting repositories.
```

### 4.2 Missing Abstractions

| Interface | Methods Needed | Priority |
|-----------|---------------|----------|
| `AuthProvider` | signIn, signUp, signOut, onAuthStateChanged, sendPasswordReset, sendVerification | P0 |
| `UserProvider` | getUserProfile, setUserProfile, getAllUsers | P0 |
| `AuditProvider` | createAuditLog, getAuditLogs | P1 |
| `ProjectProvider` | getProjects, saveProjects (remote) | P2 |
| `StorageProvider` | upload, download, delete | P2 |
| `StandardsProvider` | getStandard, getActiveStandard, listStandards | P2 |

---

## 5. Engineering Engine Audit

### 5.1 Structure

```
engine/
├── modules/
│   ├── calculations.js           (573 lines) — Core CP calculations
│   ├── resistivityEngine.js      (913 lines) — Resistivity, groundbed, cable, anode
│   ├── attenuationEngine.js      (788 lines) — Attenuation/potential profiling
│   ├── standardsValidationEngine.js (380 lines) — Standards-aware validation
│   └── validation.js             (100 lines) — Input validation
├── rules/
│   ├── rulesEngine.js            (150 lines) — Business rules + insights
│   └── bomEngine.js              (368 lines) — Bill of Materials generation
└── optimizer/
    └── optimizer.js              (180 lines) — Design alternatives
```

### 5.2 Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| **Duplicate file** | 🔴 Critical | `resistivityEngine.js` at project root is byte-for-byte identical to `src/engine/modules/resistivityEngine.js` |
| **Duplicate function** | 🟠 High | `calculateCurrentRequirement()` exists in BOTH `resistivityEngine.js` (exported, with spareFactor) and `attenuationEngine.js` (private, simplified) — different implementations will diverge |
| **God module** | 🟡 Medium | `resistivityEngine.js` has 26 exported functions — mixing resistivity, groundbed, anode, cable, and current calculations |
| **No TypeScript** | 🟡 Medium | Engineering calculations lack type safety — JSDoc only |
| **No input fuzzing tests** | 🟡 Medium | No property-based testing for calculation robustness |
| **Functions are pure** | ✅ Good | All engine functions are pure, deterministic, zero side effects |

### 5.3 Refactor Target

1. Delete root `resistivityEngine.js` and `resistivityEngine.test.js` — use `src/engine/modules/` versions
2. Extract `calculateCurrentRequirement` to a shared `currentCalculations.js` module
3. Split `resistivityEngine.js` into domain modules:
   - `soilResistivity.js` — Wenner, averaging, classification, seasonal correction
   - `currentRequirement.js` — surface area, current density, current requirement
   - `groundbedResistance.js` — Dwight, parallel, deepwell, shallow vertical
   - `anodeCalculations.js` — lifetime, quantity from current, quantity from TR
   - `cableCalculations.js` — tail cable, main cable, total circuit

---

## 6. Visualization Layer Audit

### 6.1 Structure

```
visualizations/
├── VisualizationCanvas.jsx    (1,873 lines) — Reusable SVG canvas
├── ZoomPan.jsx                (6,581 lines) — Pan/zoom controller
├── VizTooltip.jsx             (1,218 lines)
├── VizLegend.jsx              (1,258 lines)
├── VizAxis.jsx                (3,010 lines)
├── VizGrid.jsx                (1,048 lines)
├── PipelineOverviewCanvas.jsx (18,786 lines) — Large pipeline visualizer
├── GroundbedVisualizer.jsx    (28,428 lines) — Very large groundbed visualizer
├── CableNetworkVisualizer.jsx (26,072 lines) — Very large cable visualizer
├── sidePanel/
│   ├── RightSideEngineeringPanel.jsx
│   ├── pageWidgets/           (3 widget files)
│   └── widgets/               (11 widget files)
├── cableVoltage.js            — Pure calculation
├── groundbedStatus.js         — Pure classification
└── index.js                   — Re-exports
```

### 6.2 Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| **Massive visualizer files** | 🔴 Critical | `GroundbedVisualizer.jsx` is 28,428 bytes (~900 lines) — single component with too many concerns |
| **CableNetworkVisualizer size** | 🔴 Critical | 26,072 bytes (~800 lines) — same issue |
| **PipelineOverviewCanvas size** | 🔴 Critical | 18,786 bytes (~500 lines) — same issue |
| **Deep import nesting** | 🟡 Medium | Widgets use `../../../` relative imports (3+ levels deep) |
| **Mixed concerns** | 🟡 Medium | `cableVoltage.js` and `groundbedStatus.js` are pure calculations mixed in visualization layer — belong in engine |
| **No SVG abstraction** | 🟡 Medium | Each visualizer re-implements coordinate transforms, scaling, hit testing |

### 6.3 Recommendations

1. Extract `cableVoltage.js` and `groundbedStatus.js` to `engine/modules/`
2. Create a shared `SvgPlot` base component for coordinate transforms, scaling, hit testing
3. Split large visualizers into sub-components (e.g., `GroundbedAnodeLayer`, `GroundbedProfileLayer`)
4. Replace `../../../` imports with `@/` path aliases (via `vite.config.js`)
5. Add visual regression tests (Playwright screenshot comparison)

---

## 7. Standards System Audit

### 7.1 Current Architecture

5 standard config files (133-166 lines each):
- `saudiAramco.js` — Default
- `naceSP0169.js`
- `iso15589.js`
- `pdo.js`
- `adnoc.js`

`standards/index.js` provides `getStandard()` and `getActiveStandard()`.

### 7.2 Assessment

| Aspect | Rating | Detail |
|--------|--------|--------|
| **Extensibility** | ✅ Good | Add a new standard = 1 new file + registry entry |
| **Isolation** | ✅ Good | Standards are pure config, no logic, no side effects |
| **Hardcoding** | ⚠️ Fair | Standards are embedded JS — cannot be updated without deploy |
| **Versioning** | ❌ Missing | No standard version history or upgrade path |
| **Feature flags** | ❌ Missing | No way to A/B test standard changes |

### 7.3 Recommendation

Standards system is the cleanest part of the codebase. Consider:
- Move standards to JSON (loadable from API/DB later)
- Add standard version tracking per project

---

## 8. Report Generation Audit

### 8.1 Current Modules

| Module | Lines | Library | Function |
|--------|-------|---------|----------|
| `pdfGenerator.js` | 483 | jsPDF + autotable | Multi-page engineering report with charts, tables, signatures |
| `excelEngine.js` | 458 | xlsx | Multi-sheet XLSX with formulas, formatting |
| `bomExporter.js` | 31 | xlsx | BOM-specific CSV/Excel export |

### 8.2 Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| **No report templating** | 🟡 Medium | PDF layout is hardcoded in `pdfGenerator.js` — no template system for different report formats |
| **Memory risk** | 🟡 Medium | Large projects with many stations could OOM during single-threaded PDF generation |
| **No streaming** | 🟡 Medium | Entire PDF is built in memory before download |
| **No PDF test coverage** | 🟡 Medium | `pdfGenerator.test.js` is 645 lines but tests may not validate visual output |

---

## 9. Testing Architecture Audit

### 9.1 Test Suite Summary

| Category | Files | Lines | Active Tests |
|----------|-------|-------|-------------|
| **Unit (engine)** | 9 | 3,200 | ~120 |
| **Unit (reporting)** | 2 | 1,379 | ~87 |
| **Unit (store)** | 4 | 1,088 | ~90 |
| **Unit (config)** | 2 | 383 | ~80 |
| **Unit (visualizations)** | 2 | 285 | ~36 |
| **Unit (standards)** | 1 | 556 | 96 |
| **E2E (Playwright)** | 5 | 1,480 | ~37 |
| **Test utils** | 4 | 412 | ~30 |
| **Total** | **30** | **~9,365** | **~576** |

### 9.2 Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| **Commented-out tests** | 🔴 Critical | `attenuationEngine.test.js` (667 lines) has 1 active test, 20+ commented-out stubs (T101-T120) |
| **Low coverage thresholds** | 🟠 High | `vitest.config.js` thresholds: 30% statements, 20% branches, 25% functions — far below industry 70-80% |
| **No integration tests** | 🟠 High | No tests crossing store ↔ engine boundaries |
| **No visual regression** | 🟡 Medium | No screenshot comparison tests for visualizations |
| **Empty test files** | 🟡 Medium | `distributed.test.js` (23 lines, 2 tests), `goldenDatasets.test.js` (34 lines, 5 tests) |
| **E2E auth bypass in source** | 🔴 Critical | `authStore.js` has mock auth for E2E tests — test infrastructure leaked into production code |
| **No performance tests** | 🟡 Medium | No load/benchmark tests for calculations or rendering |
| **No accessibility tests** | 🟡 Medium | No axe-core or similar a11y testing |

### 9.3 Commentary

The test suite has good intentions (576 tests, 30 files) but:
- Completely commented-out tests suggest incomplete migration or abandoned work
- The E2E auth bypass (`e2e-mock-auth`) is a security risk — should use Playwright's `page.evaluate` or Firebase Auth emulator
- Coverage thresholds are set very low, suggesting known debt

---

## 10. Duplicate Logic — Complete List

### 10.1 Complete File Duplication

| File | Duplicate Of | Action |
|------|-------------|--------|
| `/resistivityEngine.js` | `src/engine/modules/resistivityEngine.js` | **Delete root copy** |
| `/resistivityEngine.test.js` | `src/engine/__tests__/resistivityEngine.test.js` | **Delete root copy** |

### 10.2 Function Duplication

| Function | File 1 | File 2 | Issue |
|----------|--------|--------|-------|
| `calculateCurrentRequirement` | `resistivityEngine.js` (exported, with spare factor) | `attenuationEngine.js` (private, simplified) | Different implementations, risk of divergence |

### 10.3 Scattered UUID Creation

`uuid()` imported 4 times across:
- `store/projectStore.js`
- `repositories/projectRepository.js`
- `reporting/excelEngine.js`
- `components/BulkGridEditor.jsx`

No centralized ID factory.

### 10.4 Repeated Import Patterns

`DURATION, EASE` from `motion/timings` imported in **12+ widget files** — should be a theme-level context or barrel export.

---

## 11. Circular Dependencies

| From | To | Direction |
|------|----|-----------|
| `store/projectStore.js` | `store/authStore.js` | projectStore → authStore ✅ (one-way, safe) |
| `services/attenuationService.js` | `store/projectStore.js` | service → store ❌ (should be store → service) |
| `services/bomService.js` | `store/projectStore.js` | service → store ❌ (same issue) |
| `services/calculationService.js` | `store/projectStore.js` | service → store ❌ (same issue) |

**No actual circular dependencies detected.** But the service→store direction is inverted — services should be pure and store should call them, not vice versa.

---

## 12. Performance Risks

| Risk | Severity | Detail |
|------|----------|--------|
| **Single-threaded calculations** | 🟡 Medium | All station calculations run synchronously — large projects with 10+ stations block UI |
| **No calculation memoization** | 🟡 Medium | `projectStore` doesn't cache identical calculation results — recalculates on every call |
| **Massive CSS bundle** | 🟠 High | 5,406-line `index.css` loaded eagerly — no code splitting, no critical CSS extraction |
| **Recharts bundle size** | 🟡 Medium | Recharts (~400KB) loaded even when no charts are rendered |
| **Firebase SDK size** | 🟡 Medium | Full Firebase SDK (~300KB) for auth + Firestore — tree-shaking limited |
| **No lazy loading** | 🟠 High | All 20+ pages imported eagerly in `App.jsx` — no `React.lazy` or code splitting |

---

## 13. Security Risks

| Risk | Severity | Detail | Fix |
|------|----------|--------|-----|
| **E2E auth bypass** | 🔴 Critical | `authStore.js:534` — `localStorage.getItem('e2e-mock-auth')` creates engineer user, no production guard | Add `import.meta.env.PROD` guard or move to E2E setup only |
| **User session in localStorage** | 🟠 High | `authStore` persist stores user role, approved status, sessionStart in plain localStorage | Use httpOnly cookies or sessionStorage with encryption |
| **No token refresh** | 🟡 Medium | Firebase SDK handles token refresh, but no visibility or logging of refresh failures | Add auth error boundary |
| **No CSP headers** | 🟡 Medium | No Content-Security-Policy configured in `firebase.json` or `vercel.json` | Add strict CSP |
| **Firestore rules complexity** | 🟡 Medium | 99-line `firestore.rules` with nested functions — difficult to audit | Simplify, add rule unit tests (already have 19) |

---

## 14. Enterprise Readiness Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| **No multi-tenancy isolation** | 🔴 Critical | All users under `organizationId: 'ikk'` — no org-level data isolation |
| **No audit trail for engineering changes** | 🟠 High | Audit log covers user mgmt only; station/project changes have no immutable audit trail |
| **No RBAC granularity** | 🟡 Medium | Roles are broad (admin/engineer/manager); no project-level or station-level permissions |
| **No data export/backup API** | 🟡 Medium | Export is manual (UI download); no automated backup or API-driven export |
| **No version pinning for standards** | 🟡 Medium | Standards are latest-version always; no way to pin a project to a specific standard version |
| **No offline-first design** | 🟠 High | App requires internet for auth; no offline calculation capability |
| **No monitoring/telemetry** | 🟡 Medium | No error tracking (Sentry), no analytics, no performance monitoring |
| **No i18n** | 🟡 Medium | All strings are hardcoded English; no localization infrastructure |

---

## 15. Prioritized Debt Backlog

### Critical (Must Fix — Security/Data Loss)
1. 🔴 Remove E2E auth bypass from production code
2. 🔴 Delete duplicate `resistivityEngine.js` from project root
3. 🔴 Split `projectStore.js` (1,134 lines → 100-200 line slices)
4. 🔴 Split `ui.jsx` (20 components → 20 files)

### High (Should Fix — Scalability/Maintainability)
5. 🟠 Implement `AuthProvider` and `UserProvider` interfaces
6. 🟠 Extract `auditRepository` from `userRepository`
7. 🟠 Add `React.lazy` code splitting for all pages
8. 🟠 Split `index.css` (5,406 lines) into CSS modules
9. 🟠 Uncomment and complete attenuationEngine tests (T101-T120)
10. 🟠 Raise coverage thresholds to 70/60/70/70

### Medium (Could Fix — Quality/Performance)
11. 🟡 Extract duplicate `calculateCurrentRequirement` to shared module
12. 🟡 Add Web Worker for heavy calculations
13. 🟡 Add memoization for calculation results
14. 🟡 Split `constants/index.js` by domain
15. 🟡 Replace deep `../../../` imports with `@/` aliases
16. 🟡 Move `cableVoltage.js` and `groundbedStatus.js` to engine
17. 🟡 Add visual regression tests for visualizations

### Low (Nice to Have)
18. 🟢 Add i18n infrastructure
19. 🟢 Add property-based testing for calculations
20. 🟢 Add accessibility (a11y) test suite
21. 🟢 Create shared SVG plot abstraction

---

## 16. Technical Debt Ratio

```
Debt Ratio = (Debt Items × Severity) / Total Code Size

Critical items:  4 × 10 = 40
High items:      6 × 7  = 42
Medium items:    7 × 4  = 28
Low items:       4 × 2  =  8
──────────────────────────────
Total Debt Score:         118

Codebase Size:         ~34,000 lines
Debt Ratio:           118 / 340 = 34.7%

Rating: MODERATELY HIGH DEBT
Target: <15% (would require resolving all Critical + High items)
```

---

## 17. Conclusion

The RAXA CP Designer platform has **solid engineering fundamentals** (pure calculations, clean standards system, well-structured engine) but **significant infrastructure debt**:

1. **Security**: E2E auth bypass must be removed immediately
2. **Code organization**: Two god objects (projectStore, ui.jsx) need splitting
3. **Duplication**: Complete file duplicates at project root
4. **Testing**: Large commented-out test stubs, low coverage thresholds
5. **Performance**: No code splitting, no lazy loading, no calculation memoization

The engineering core (calculations, standards, rules) is the strongest part and requires minimal changes. The presentation and state management layers need the most restructuring.

**Estimated remediation effort: 6-8 engineering weeks** (one senior developer) to resolve all Critical and High items.
