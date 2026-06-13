# SCALABILITY ROADMAP — RAXA CP Designer Platform

**Version:** 1.0
**Date:** 2026-06-12
**Based on:** TECHNICAL_DEBT_AUDIT.md findings

---

## 1. Current Scale Assessment

| Dimension | Current | Near-Term (6mo) | Long-Term (2yr) |
|-----------|---------|-----------------|-----------------|
| **Users** | ~5 (single org) | ~50 (3-5 orgs) | ~500+ (multi-org) |
| **Projects** | ~10-20 | ~100-200 | ~1,000+ |
| **Stations per project** | 1-5 | 5-10 | 10-20+ |
| **Calculations** | Synchronous | Web Worker | Server-side + cache |
| **Data storage** | localStorage (~5MB) | Firestore | PostgreSQL |
| **Deployment** | Vite SPA | SPA + CDN | Micro-frontend |
| **Standards** | 5 hardcoded | 5 + remote loaded | 20+ + versioned API |

---

## 2. Scalability Bottlenecks (Ordered by Impact)

### Bottleneck #1: Monolithic projectStore (1,134 lines)
**Impact:** Every new feature adds to an already-unmanageable file. Merge conflicts inevitable with 2+ developers.

**Current:**
- 30+ actions in one Zustand store
- Project CRUD, Station CRUD, Tank/Vessel, Workflow, Revisions, BOM, Theming all in one

**Target:**
- Split into domain slices (see Section 3)
- Each slice <200 lines

**Effort:** 3-4 days

---

### Bottleneck #2: Synchronous Calculation Pipeline
**Impact:** UI freezes during station calculation. For 10+ stations, total calculation time could exceed 500ms — noticeable lag.

**Current:**
- `runFullCalculation()` runs synchronously in the main thread
- All stations calculated sequentially in `calculateAllStations()`

**Target:**
- Move heavy calculations to Web Worker
- Keep orchestration on main thread
- Add progress indicator for batch calculations

**Effort:** 5-7 days

---

### Bottleneck #3: No Code Splitting
**Impact:** 20+ pages bundled into a single JS chunk. Initial load includes all visualizations, Recharts, Firebase SDK — ~800KB+ gzipped.

**Current:**
- `App.jsx` imports all pages eagerly
- No `React.lazy()` or dynamic imports

**Target:**
- `React.lazy()` for every page route
- Firebase SDK loaded on demand (auth pages only)
- Visualization components lazy-loaded

**Effort:** 2-3 days

---

### Bottleneck #4: 5,406-line Monolithic CSS
**Impact:** Any CSS change risks unintended side effects. No way to scope styles to components.

**Current:**
- Single `index.css` with 5,406 lines
- No CSS modules, no styled-components, no Tailwind component extraction

**Target:**
- CSS modules per component
- Extract Tailwind utilities into `@apply` components
- Or adopt CSS-in-JS for critical paths

**Effort:** 5-10 days (incremental)

---

### Bottleneck #5: No Calculation Memoization
**Impact:** Same station recalculated when any unrelated field changes. For 5 stations, redundant calculations waste CPU.

**Current:**
- No input hash or version tracking for calculation results
- `runTankCalculations()` recalculates even with identical inputs

**Target:**
- Hash station inputs; skip calculation if hash unchanged
- Add `useMemo` in pages that read calculation results
- Store `lastCalcInputs` hash alongside `lastCalcResult`

**Effort:** 2-3 days

---

### Bottleneck #6: Single-Organization Architecture
**Impact:** `organizationId` hardcoded to `'ikk'` in 8+ locations. Cannot support multi-tenant without rewrite.

**Current:**
- `userRepository.js`: `organizationId = 'ikk'` default
- `authPolicy.js`: domain check assumes single org
- `firestore.rules`: no org-level isolation enforcement

**Target:**
- Multi-org support via `organizationId` from user profile
- Organization-scoped projects in Firestore/PostgreSQL
- Admin can manage multiple orgs

**Effort:** 5-8 days

---

## 3. State Management Refactoring Plan

### 3.1 Split projectStore into Domain Slices

```
store/
├── authStore.js (existing, ~670 lines)
│   └── Auth state only — stays as-is after NormalizedUser refactor
├── projectSlice.js        ← Project CRUD, archive, import/export (~150 lines)
├── stationSlice.js        ← Station CRUD, segment mgmt (~150 lines)
├── designBasisSlice.js    ← Design basis, tank, vessel params (~120 lines)
├── calculationSlice.js    ← Orchestrate calculations, store results (~150 lines)
├── workflowSlice.js       ← Workflow status, revisions (~120 lines)
├── uiSlice.js             ← Theme, sidebar, active page (~80 lines)
├── activitySlice.js       ← Activity log, audit events (~60 lines)
└── index.js               ← Combined store via Zustand slices
```

**Zustand slice pattern:**
```javascript
// projectSlice.js
export const createProjectSlice = (set, get) => ({
  projects: [],
  activeProjectId: null,
  createProject: (overrides) => { /* ... */ },
  archiveProject: (id) => { /* ... */ },
  // ...
})

// index.js
import { create } from 'zustand'
import { createProjectSlice } from './projectSlice.js'
// ...

export const useProjectStore = create((...args) => ({
  ...createProjectSlice(...args),
  ...createStationSlice(...args),
  // ...
}))
```

**Migration:** Additive — old store remains working until all consumers migrated.

---

## 4. Performance Optimization Roadmap

| Phase | Task | Impact | Effort |
|-------|------|--------|--------|
| **P0** | Code splitting (React.lazy) | Initial load -60% | 2-3 days |
| **P0** | CSS splitting (Tailwind JIT scan) | CSS bundle -80% | 1-2 days |
| **P1** | Web Worker for calculations | Main thread free during calc | 5-7 days |
| **P1** | Calculation memoization | Redundant calc skip | 2-3 days |
| **P1** | Recharts tree-shaking | Bundle -200KB | 1 day |
| **P2** | Image/font optimization | LCP improvement | 1-2 days |
| **P2** | Service Worker for offline | Full offline capability | 5-7 days |
| **P3** | HTTP/2 Server Push hints | TTFB improvement | 1 day |

---

## 5. Multi-Tenant Architecture Target

```
Current (single-org):
  Users → organizationId: 'ikk' (hardcoded)
  Projects → no org field
  Standards → global

Target (multi-org):
  Users → organizationId from profile
  Projects → organizationId FK
  Standards → org-specific overrides possible
  Firestore → RLS by organizationId
  Admin → org-level admin + super-admin
```

---

## 6. Calculation Engine Scalability

### 6.1 Current vs Target

| Aspect | Current | Target |
|--------|---------|--------|
| Execution | Main thread, synchronous | Web Worker, async |
| Batch | Sequential loop | Parallel (worker pool) |
| Memoization | None | Input hash + cache |
| Validation | Inline in validation.js | Pluggable validators per standard |
| Standards | Hardcoded JS objects | Versioned, remote-loadable |

### 6.2 Web Worker Architecture

```
Main Thread                  Web Worker
─────────────                ──────────
calculateAllStations()  →   postMessage(stations, project)
showProgress(3/10)      ←   onmessage({ type: 'progress', ... })
updateResults()         ←   onmessage({ type: 'complete', ... })
```

---

## 7. Visualization Layer Scaling

### 7.1 Current Issues
- Deep nesting: `sidePanel/widgets/` is 4 levels from `visualizations/`
- No shared SVG primitives — each visualization builds its own axes, grids
- `CableNetworkVisualizer.jsx` (809 lines) and `GroundbedVisualizer.jsx` (893 lines) duplicate layout patterns

### 7.2 Target
```
visualizations/
├── primitives/           ← Shared SVG/Axis/Grid/Tooltip/Legend
├── charts/               ← DonutChart, RadialGauge, FlowIndicator
├── canvases/             ← PipelineOverview, Groundbed, CableNetwork
├── side-panel/           ← RightSideEngineeringPanel, widgets
└── index.js              ← Re-exports
```

---

## 8. Testing Scalability

| Phase | Target | Effort |
|-------|--------|--------|
| **Now** | Complete commented-out attenuation tests (T101-T120) | 2 days |
| **Now** | Add golden dataset tests for resistivity (match Excel Cal.(DW)) | 3 days |
| **6mo** | Raise coverage to 70% | 10 days |
| **6mo** | Add visual regression tests for all charts | 3 days |
| **1yr** | Property-based testing with fast-check | 5 days |
| **1yr** | CI/CD pipeline with automated E2E | 3 days |

---

## 9. Enterprise Features Timeline

| Quarter | Feature | Description |
|---------|---------|-------------|
| **Q3 2026** | Multi-org support | Organization-scoped projects, users, standards |
| **Q3 2026** | Full audit trail | Immutable change log for every project/station mutation |
| **Q4 2026** | RBAC granularity | Project-level roles, station-level permissions |
| **Q4 2026** | Offline-first mode | Service Worker + IndexedDB sync |
| **Q1 2027** | Standards versioning | Pin projects to specific standard versions |
| **Q1 2027** | Reporting API | REST API for automated report generation |
| **Q2 2027** | SSO integration | SAML/OIDC for enterprise IdP |
| **Q2 2027** | i18n framework | Multi-language support |

---

## 10. Risk Assessment for Scaling

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| localStorage 5MB limit exceeded | High (6mo) | Data loss | Migrate to IndexedDB or Firestore for projects |
| Calculation time exceeds 2s for large projects | Medium (1yr) | Poor UX | Web Worker + server-side option |
| Merge conflicts in projectStore | High (any time) | Dev velocity 50% | Split store now (Phase 0) |
| Firebase cost scaling | Low (2yr) | Budget | Provider abstraction enables switch |
| Browser memory for 20+ station projects | Medium (1yr) | Tab crash | Virtualized station list, pagination |

---

## 11. Effort Summary

| Phase | Scope | Calendar Time | Dev Days |
|-------|-------|---------------|----------|
| **Phase 0** | Store splitting + code splitting | 2 weeks | 10 days |
| **Phase 1** | Web Worker + memoization | 1.5 weeks | 8 days |
| **Phase 2** | Multi-org + audit trail | 3 weeks | 15 days |
| **Phase 3** | CSS modules + visualization primitives | 2 weeks | 10 days |
| **Phase 4** | Offline + enterprise features | 4 weeks | 20 days |
| **Total** | | **12.5 weeks** | **63 days** |

---

## 12. Key Decisions Required

| Decision | Options | Recommendation |
|----------|---------|----------------|
| CSS strategy | CSS Modules vs Tailwind `@apply` vs styled-components | Tailwind `@apply` (minimal migration) |
| State splitting | Zustand slices vs separate stores | Zustand slices (backward-compatible) |
| Calculation engine | Web Worker vs WASM vs server-side | Web Worker (good enough for <50 stations) |
| Offline storage | IndexedDB vs SQLite (WASM) vs Firestore cache | IndexedDB (native browser API) |
| Multi-org data model | Separate DBs vs shared DB with RLS | Shared DB with RLS (cost-effective) |

---

## 13. Conclusion

The RAXA CP Designer platform can scale to 500+ users and 1,000+ projects with the phased approach outlined above. The **Phase 0** store + code splitting delivers immediate wins (faster load, better dev velocity) with low risk. The **Phase 2** multi-org support unlocks enterprise sales. The **Phase 4** offline support makes field engineering viable.

**Immediate priority:** Execute Phase 0 (store splitting + code splitting) in the next sprint. This unblocks parallel development and reduces the single biggest technical debt item.
