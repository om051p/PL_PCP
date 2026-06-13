# RESTRUCTURE RECOMMENDATIONS

**Date:** June 10, 2026  
**Auditor:** Buffy — Principal Software Architect  
**Priority:** Actionable recommendations ordered by impact and dependency  

---

## Executive Summary

The CP Designer has a **world-class calculation engine** wrapped in a **needs-refactoring application shell**. The core engineering logic is pure, testable, and standards-parameterized — this is the hardest part to get right and it's done well. The restructuring focuses on:

1. Splitting the god file (`pages/index.jsx`)
2. Extracting business logic from the store
3. Completing the standards framework
4. Preparing for cloud synchronization

---

## What Should STAY (Do Not Touch)

| Component | Rationale |
|-----------|-----------|
| `engine/modules/calculations.js` | Pure, stateless, correct. Matches Excel source. |
| `engine/rules/rulesEngine.js` | Clean rule interface (check + insight pattern). |
| `engine/rules/bomEngine.js` | Rule-based BOM per design mode. |
| `constants/index.js` (engineering constants) | Single source of truth for ANODE_SPECS, CABLE_SPECS, THRESHOLDS. |
| `standards/saudiAramco.js` | Well-documented config object. |
| `standards/naceSP0169.js` | Well-documented config object. |
| `components/ui.jsx` | Domain-agnostic UI primitives. |
| `reporting/pdfGenerator.js` | Professional PDF output. |
| `reporting/excelEngine.js` | Robust import/export with format detection. |
| `Reference/KnowledgeBase/` | Valuable domain knowledge base. |

---

## What Should CHANGE (Priority Order)

### Priority 1: Split `pages/index.jsx` (Critical)

**Problem:** 2,800+ lines, 11 components in one file. Impossible to review, refactor, or tree-shake.

**Action:** Split into individual page files:

```
src/pages/
├── index.jsx                    ← Re-export barrel only
├── PageProjectSetup.jsx         ← Project setup page
├── PagePipeline.jsx             ← Pipeline parameters page
├── PageCurrentRequirement.jsx   ← Current calculation page
├── PageGroundbed.jsx            ← Groundbed design page
├── PageCableResistance.jsx      ← Cable resistance page
├── PageTRSizing.jsx             ← TR sizing page
├── PageValidation.jsx           ← Validation page
├── PageOptimizer.jsx            ← Design optimizer page
├── PageBOM.jsx                  ← Bill of materials page
├── PageReport.jsx               ← Summary report page
├── PageImport.jsx               ← Excel import page
├── PageDashboard.jsx            ← Already separate ✓
├── LoginPage.jsx                ← Already separate ✓
├── AttenuationPage.jsx          ← Already separate ✓
└── StationTabs.jsx              ← Extract shared StationTabs component
```

**Impact:** Reduces merge conflicts, enables per-page testing, improves DX.

---

### Priority 2: Extract Business Logic from Store (High)

**Problem:** `projectStore.js` orchestrates calculations, validation, BOM generation, and optimization directly in store actions. This makes the store a god object.

**Action:** Create a `services/` layer:

```
src/services/
├── calculationService.js        ← Orchestration: validate → calculate → rules → optimize
├── bomService.js                ← BOM generation orchestration
├── attenuationService.js        ← Attenuation calculation orchestration
├── importService.js             ← Excel import parsing
└── projectService.js            ← Project CRUD orchestration
```

**Before:**
```javascript
// In store — business logic mixed with state management
calculateStation: (stationId) => set((state) => {
  const validation = validateStation(...)
  const result = runStationCalculations(station, ...)
  const { checks, insights } = runRules(station, result, ...)
  const bom = generateBOM(station, result, ...)
  const alternatives = generateAlternatives(station, result, ...)
  station.lastCalcResult = result
  // ...
})
```

**After:**
```javascript
// In store — thin wrapper that delegates to service
calculateStation: (stationId) => {
  const project = get().getProject()
  const station = project.stations.find(s => s.id === stationId)
  const result = calculationService.calculateStation(station, project)
  set((state) => {
    const proj = state.projects.find(p => p.id === state.activeProjectId)
    const st = proj.stations.find(s => s.id === stationId)
    st.lastCalcResult = result.calcResult
    st.insights = result.insights
    st.alternatives = result.alternatives
    st.status = 'calculated'
  })
}
```

**Impact:** Store becomes a thin state container. Business logic is testable independently.

---

### Priority 3: Complete Standards Framework (High)

**Problem:** Types declare 6 standards but only 2 are implemented. Users see "ISO 15589" as an option but it doesn't exist.

**Action:** Either implement the missing standards or remove them from the UI.

**Recommended approach (implement):**

```
src/standards/
├── index.js                 ← Registry (add new entries)
├── saudiAramco.js           ← Existing ✓
├── naceSP0169.js            ← Existing ✓
├── iso15589.js              ← NEW: ISO 15589-1 (Petroleum — CP of pipelines)
├── pdo.js                   ← NEW: PDO EP-EPT-SP-001 (Oman)
├── adnoc.js                 ← NEW: ADNOC GS Standard (UAE)
└── custom.js                ← NEW: User-defined custom standard
```

**Key differences per standard:**
- ISO 15589-1: Linear temp correction (like NACE), -850mV criterion, 25% spare factor
- PDO: Aramco-like but with Oman-specific soil resistivity tables
- ADNOC: UAE-specific, references both NACE and ISO, +20% spare factor
- Custom: User-configurable all parameters

**Impact:** Eliminates phantom features, completes the product vision.

---

### Priority 4: Resolve Attenuation Code Duplication (Medium)

**Problem:** The attenuation engine exists in two locations with potential divergence.

**Action:** 
1. Keep `cp-platform/src/engine/modules/attenuationEngine.js` as the canonical source
2. Delete `attenuation/attenuationEngine.js` (duplicate)
3. Move `attenuation/attenuationTests.js` and `attenuation/attenuationDatasets.json` into `cp-platform/src/engine/__tests__/`
4. Move `attenuation/ATTENUATION_ENGINE_SPEC.md` to `cp-platform/docs/engineering/`

**Impact:** Single source of truth, no divergence risk.

---

### Priority 5: Wire Auth into Application (Medium)

**Problem:** `LoginPage.jsx`, `authStore.js`, `ProtectedRoute.jsx`, and `firebase/config.js` all exist but are NOT connected to `App.jsx`.

**Action:**
1. Wrap routes in `ProtectedRoute` in `App.jsx`
2. Add auth check to `main.jsx` initialization
3. Add user context to PDF/Excel exports (creator attribution)

**Before (App.jsx):**
```jsx
<Routes>
  <Route path="/dashboard" element={<PageDashboard />} />
  {/* ... all routes unprotected */}
</Routes>
```

**After (App.jsx):**
```jsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<PageDashboard />} />
    {/* ... all routes protected */}
  </Route>
</Routes>
```

**Impact:** Enables multi-user support, audit trails, and cloud sync prerequisites.

---

### Priority 6: Fix Multi-Segment Reporting (Medium)

**Problem:** The data model supports multiple `pipelineSegments[]` but reporting only uses the first segment.

**Action:**
1. Update `pdfGenerator.js` to iterate all segments per station
2. Update `excelEngine.js` export to include all segments
3. Update `excelEngine.js` import to create multiple segments from multi-segment input

**Impact:** Correct engineering output for multi-segment pipelines.

---

### Priority 7: Extract Custom Hooks (Low-Medium)

**Problem:** Several store access patterns are repeated across pages.

**Action:** Create `src/hooks/` directory:

```
src/hooks/
├── useActiveStation.js     ← Common pattern: get project + active station
├── useCalculations.js      ← Trigger calculations + read results
├── useValidation.js        ← Run validation + read checks
├── useBOM.js               ← Generate BOM for station
├── useAttenuation.js       ← Attenuation state + actions
└── useTheme.js             ← Theme toggle (currently in App.jsx)
```

**Impact:** Reduces code duplication across pages, improves consistency.

---

### Priority 8: Add Service Worker / PWA (Low)

**Problem:** No offline capability beyond localStorage. Engineering field work often happens in areas with poor connectivity.

**Action:** Add a service worker for offline access to the SPA shell.

**Impact:** Enables field use without internet connectivity.

---

## Proposed Future Folder Structure

```
raxa/
├── cp-platform/
│   ├── src/
│   │   ├── components/              ← Shared UI primitives (KEEP)
│   │   │   ├── ui.jsx
│   │   │   ├── layout.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── StationTabs.jsx      ← NEW: extracted from pages/index.jsx
│   │   │
│   │   ├── constants/               ← Engineering constants (KEEP)
│   │   │   └── index.js
│   │   │
│   │   ├── engine/                  ← Domain logic (KEEP, pure functions)
│   │   │   ├── modules/
│   │   │   │   ├── calculations.js
│   │   │   │   ├── validation.js
│   │   │   │   └── attenuationEngine.js
│   │   │   ├── rules/
│   │   │   │   ├── rulesEngine.js
│   │   │   │   └── bomEngine.js
│   │   │   ├── optimizer/
│   │   │   │   └── optimizer.js
│   │   │   └── __tests__/
│   │   │
│   │   ├── services/                ← NEW: Business logic orchestration
│   │   │   ├── calculationService.js
│   │   │   ├── bomService.js
│   │   │   ├── attenuationService.js
│   │   │   ├── importService.js
│   │   │   └── projectService.js
│   │   │
│   │   ├── hooks/                   ← NEW: Custom React hooks
│   │   │   ├── useActiveStation.js
│   │   │   ├── useCalculations.js
│   │   │   ├── useValidation.js
│   │   │   ├── useBOM.js
│   │   │   ├── useAttenuation.js
│   │   │   └── useTheme.js
│   │   │
│   │   ├── pages/                   ← REFACTORED: One file per page
│   │   │   ├── index.jsx            ← Barrel re-exports only
│   │   │   ├── PageDashboard.jsx
│   │   │   ├── PageProjectSetup.jsx  ← NEW: split from index.jsx
│   │   │   ├── PagePipeline.jsx      ← NEW: split from index.jsx
│   │   │   ├── PageCurrentRequirement.jsx ← NEW
│   │   │   ├── PageGroundbed.jsx     ← NEW
│   │   │   ├── PageCableResistance.jsx ← NEW
│   │   │   ├── PageTRSizing.jsx      ← NEW
│   │   │   ├── PageValidation.jsx    ← NEW
│   │   │   ├── PageOptimizer.jsx     ← NEW
│   │   │   ├── PageBOM.jsx           ← NEW
│   │   │   ├── PageReport.jsx        ← NEW
│   │   │   ├── PageImport.jsx        ← NEW
│   │   │   ├── LoginPage.jsx
│   │   │   └── AttenuationPage.jsx
│   │   │
│   │   ├── reporting/               ← Export/Import engines (KEEP)
│   │   │   ├── pdfGenerator.js
│   │   │   ├── excelEngine.js
│   │   │   └── bomExporter.js
│   │   │
│   │   ├── standards/               ← Engineering standards (COMPLETE)
│   │   │   ├── index.js
│   │   │   ├── saudiAramco.js
│   │   │   ├── naceSP0169.js
│   │   │   ├── iso15589.js          ← NEW
│   │   │   ├── pdo.js               ← NEW
│   │   │   ├── adnoc.js             ← NEW
│   │   │   └── custom.js            ← NEW
│   │   │
│   │   ├── store/                   ← State management (THINNED)
│   │   │   ├── projectStore.js      ← Reduced: state + thin action wrappers
│   │   │   ├── authStore.js
│   │   │   └── attenuationStoreSlice.js
│   │   │
│   │   ├── firebase/                ← Auth config (KEEP)
│   │   │   └── config.js
│   │   │
│   │   ├── types/                   ← JSDoc types (KEEP)
│   │   │   └── index.js
│   │   │
│   │   ├── test-utils/              ← Test helpers (KEEP)
│   │   ├── e2e/                     ← E2E tests (KEEP)
│   │   │
│   │   ├── App.jsx                  ← MODIFIED: add ProtectedRoute
│   │   ├── main.jsx                 ← MODIFIED: add auth initialization
│   │   └── index.css
│   │
│   ├── docs/                        ← Documentation (KEEP)
│   ├── public/                      ← Static assets (KEEP)
│   └── dist/                        ← Build output (KEEP)
│
├── Reference/                       ← Engineering references (KEEP)
│   ├── KnowledgeBase/
│   └── *.pdf, *.xlsx
│
└── attenuation/                     ← DELETE (duplicated in src/engine/modules/)
```

---

## Implementation Roadmap

| Phase | Priority | Tasks | Effort | Risk |
|-------|:--------:|-------|:------:|:----:|
| **Phase 1** | P1-Critical | Split `pages/index.jsx` into 11 files | 2-3 hours | Low |
| **Phase 2** | P1-High | Extract `src/services/` from store | 4-6 hours | Medium |
| **Phase 3** | P2-High | Complete standards (ISO, PDO, ADNOC) | 6-8 hours | Medium |
| **Phase 4** | P2-Medium | Resolve attenuation duplication | 1 hour | Low |
| **Phase 5** | P2-Medium | Wire auth into App.jsx routing | 1-2 hours | Low |
| **Phase 6** | P2-Medium | Fix multi-segment reporting | 2-3 hours | Medium |
| **Phase 7** | P3-Low | Extract custom hooks | 2-3 hours | Low |
| **Phase 8** | P3-Low | Add PWA/service worker | 2-4 hours | Low |

---

## Future: Cloud Sync Architecture

When adding a backend, the recommended architecture:

```
Browser (Zustand) ←→ REST/WS API ←→ PostgreSQL + Redis
                                      ↓
                              Audit Log (immutable)
```

**Key decisions:**
1. **Conflict resolution:** Last-write-wins for simplicity, CRDT (Yjs/Automerge) for collaboration
2. **Offline:** IndexedDB for pending writes when offline, sync queue
3. **Auth:** Firebase Auth (already partially implemented) → add Google/Azure SSO
4. **Storage:** IndexedDB (replaces localStorage) → 500MB+ capacity
5. **Audit:** Immutable revision log per project for regulatory compliance

---

## What NOT to Change

| Item | Rationale |
|------|-----------|
| Engine calculation functions | World-class purity. Do not refactor. |
| Constants structure | Single source of truth pattern is correct. |
| Standards config pattern | Config-driven design is extensible and correct. |
| UI component library | Domain-agnostic primitives are the right abstraction. |
| Reporting engines | Professional output, well-tested. |
| Reference/KnowledgeBase | Valuable domain knowledge, keep as-is. |
| CSS architecture | CSS custom properties + dark mode is working well. |
