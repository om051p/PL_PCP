# PROJECT STRUCTURE AUDIT

**Date:** June 10, 2026  
**Auditor:** Buffy — Principal Software Architect  
**Scope:** Full repository structure analysis for multi-project, multi-standard, multi-segment pipeline CP platform  

---

## 1. Current Structure Map

```
PL PCP/                              ← Repository root
├── cp-platform/                     ← Main application (React SPA)
│   ├── src/
│   │   ├── components/              ← Shared UI primitives
│   │   │   ├── ui.jsx               ← 15+ reusable components (FieldInput, ResultRow, etc.)
│   │   │   ├── layout.jsx           ← Sidebar, TopBar, ProjectSelector
│   │   │   ├── ProtectedRoute.jsx   ← Auth route guard (new, untracked)
│   │   │   └── ErrorBoundary.jsx    ← (referenced but in App.jsx inline)
│   │   ├── constants/               ← Engineering constants registry
│   │   │   └── index.js             ← ANODE_SPECS, CABLE_SPECS, THRESHOLDS, DESIGN_MODES
│   │   ├── engine/                  ← Domain logic (pure functions)
│   │   │   ├── modules/
│   │   │   │   ├── calculations.js  ← 7 calculation modules + orchestrator
│   │   │   │   ├── validation.js    ← Zod schemas for input validation
│   │   │   │   └── attenuationEngine.js ← Attenuation analysis (cosh model)
│   │   │   ├── rules/
│   │   │   │   ├── rulesEngine.js   ← 6 validation rules + proactive insights
│   │   │   │   └── bomEngine.js     ← Rule-based BOM generation
│   │   │   ├── optimizer/
│   │   │   │   └── optimizer.js     ← Design alternatives generator
│   │   │   └── __tests__/           ← Golden dataset & verification tests
│   │   ├── firebase/                ← Firebase auth config (new, untracked)
│   │   │   └── config.js
│   │   ├── pages/                   ← Page-level components
│   │   │   ├── index.jsx            ← 11 pages in ONE file (~2,800 lines)
│   │   │   ├── PageDashboard.jsx    ← Multi-project dashboard (new)
│   │   │   ├── LoginPage.jsx        ← Firebase auth login (new)
│   │   │   └── AttenuationPage.jsx  ← Attenuation analysis page (new)
│   │   ├── reporting/               ← Export/Import engines
│   │   │   ├── pdfGenerator.js      ← jsPDF engineering report
│   │   │   ├── excelEngine.js       ← xlsx import/export
│   │   │   └── bomExporter.js       ← CSV BOM export
│   │   ├── standards/               ← Engineering standards config
│   │   │   ├── index.js             ← Standards resolver
│   │   │   ├── saudiAramco.js       ← Saudi Aramco standard config
│   │   │   └── naceSP0169.js        ← NACE SP0169 standard config
│   │   ├── store/                   ← State management
│   │   │   ├── projectStore.js      ← Main Zustand store (multi-project, ~600 lines)
│   │   │   ├── authStore.js         ← Firebase auth store (new)
│   │   │   └── attenuationStoreSlice.js ← Attenuation state (new, migration guide)
│   │   ├── test-utils/              ← Test helpers
│   │   ├── types/                   ← JSDoc type definitions
│   │   ├── e2e/                     ← Playwright E2E tests
│   │   ├── App.jsx                  ← Root component + routing
│   │   ├── main.jsx                 ← Entry point
│   │   └── index.css                ← Global styles
│   ├── docs/                        ← Documentation
│   ├── scripts/                     ← Build/deploy scripts
│   ├── public/                      ← Static assets
│   ├── dist/                        ← Production build output
│   └── coverage/                    ← Test coverage reports
│
├── attenuation/                     ← Standalone attenuation module (separate)
│   ├── attenuationEngine.js
│   ├── attenuationDatasets.json
│   ├── attenuationTests.js
│   ├── ATTENUATION_ENGINE_SPEC.md
│   └── attenuationVerification.md
│
├── Reference/                       ← Engineering reference documents
│   ├── CP2.pdf, CP3.pdf, CP4.pdf    ← CP calculation sheets (PDF)
│   ├── PCP Calculation sheet.xlsx   ← Source Excel workbook
│   └── KnowledgeBase/               ← AI-readable knowledge base
│       ├── DESIGN_METHODOLOGY.md
│       ├── DOCUMENT_INDEX.md
│       ├── EXCEL_TO_APPLICATION_MAPPING.md
│       ├── ATTENUATION_GUIDE.md
│       ├── AI_ENGINEERING_GUIDE.md
│       ├── ENGINEERING_ASSUMPTIONS.md
│       ├── FORMULA_LIBRARY.md
│       └── ENGINEERING_CONCEPTS.md
│
├── graphify-out/                    ← Graphify knowledge graph output
├── .gitnexus/                       ← GitNexus code intelligence index
├── .claude/                         ← Claude Code agent config
├── .claude-flow/                    ← Ruflo runtime data
└── .hive-mind/                      ← Hive mind agent config
```

---

## 2. Responsibility of Each Folder

### `cp-platform/src/`

| Folder | Responsibility | LOC Estimate | Coupling |
|--------|---------------|-------------|----------|
| `components/` | Shared UI primitives (domain-agnostic) | ~700 | Low — depends only on lucide-react, store |
| `constants/` | Single source of truth for engineering parameters | ~400 | **Zero** — pure data, no imports from project |
| `engine/modules/` | Pure calculation functions | ~800 | **Zero** — imports only from constants |
| `engine/rules/` | Validation rules + BOM generation | ~600 | Low — imports constants, no store |
| `engine/optimizer/` | Design alternatives generator | ~120 | Medium — imports calculations + rules |
| `engine/__tests__/` | Golden dataset & verification tests | ~500 | Test-only |
| `firebase/` | Firebase authentication config | ~30 | External service dependency |
| `pages/` | Page-level components (UI + routing) | ~2,800 | **HIGH** — imports engine, store, components, reporting |
| `reporting/` | PDF/Excel export and import | ~900 | Medium — imports store types, constants |
| `standards/` | Engineering standard configurations | ~400 | Low — pure config objects |
| `store/` | State management (Zustand) | ~800 | **HIGH** — imports all engine modules, constants |
| `types/` | JSDoc type definitions | ~150 | **Zero** — pure documentation |
| `test-utils/` | Test helpers | ~100 | Test-only |
| `e2e/` | End-to-end Playwright tests | ~300 | Test-only |

### `attenuation/` (standalone)

| File | Responsibility |
|------|---------------|
| `attenuationEngine.js` | Identical copy of `cp-platform/src/engine/modules/attenuationEngine.js` |
| `attenuationDatasets.json` | Test datasets for attenuation engine |
| `attenuationTests.js` | Test runner for attenuation (Node.js) |
| `ATTENUATION_ENGINE_SPEC.md` | Engineering specification |

### `Reference/`

| Folder | Responsibility |
|--------|---------------|
| `*.pdf` | Source engineering calculation sheets (reference only) |
| `PCP Calculation sheet.xlsx` | Original Excel workbook the app was built from |
| `KnowledgeBase/` | 8 AI-readable markdown documents for domain knowledge |

---

## 3. Folder Coupling Analysis

### 3.1 Dependency Graph (Who imports whom?)

```
constants/index.js          ← 24+ imports (most imported file in project)
    ↑
types/index.js              ← Referenced via JSDoc only
    ↑
engine/modules/*            ← imports constants only (CLEAN)
engine/rules/*              ← imports constants only (CLEAN)
engine/optimizer/*          ← imports engine/modules + engine/rules + constants
    ↑
standards/*                 ← exports from constants/index.js re-exports
    ↑
store/projectStore.js       ← imports ALL engine modules + constants + standards
    ↑
pages/*                     ← imports store + components + engine + reporting
components/*                ← imports store (for theme, project) + lucide-react
reporting/*                 ← imports constants + xlsx/jspdf
```

### 3.2 Coupling Hotspots

| Hotspot | Severity | Description |
|---------|----------|-------------|
| `store/projectStore.js` | 🔴 CRITICAL | 600+ line monolith. Imports ALL engine modules. Manages projects, stations, segments, calculations, attenuation, UI, revisions, workflow. The single biggest risk to scalability. |
| `pages/index.jsx` | 🔴 CRITICAL | 2,800+ lines with 11 page components in ONE file. Mixes business logic (BOM generation calls, validation display) with presentation. |
| `constants/index.js` | 🟡 MEDIUM | Re-exports from `standards/index.js` — creates a circular concern between constants and standards. Should be separated. |
| `engine/optimizer/optimizer.js` | 🟡 MEDIUM | Imports both calculations.js AND rulesEngine.js — creates a dependency chain that's hard to test in isolation. |
| `attenuation/` vs `engine/modules/attenuationEngine.js` | 🟡 MEDIUM | Duplicated file. The `attenuation/` folder contains a standalone copy. Should be a single source of truth. |

---

## 4. Architectural Violations

### 4.1 Violation: God File — `pages/index.jsx`

**Severity: 🔴 CRITICAL**

The file contains **11 page components** in a single 2,800-line file:
- `PageProjectSetup`
- `PagePipeline`
- `PageCurrentRequirement`
- `PageGroundbed`
- `PageCableResistance`
- `PageTRSizing`
- `PageValidation`
- `PageOptimizer`
- `PageBOM`
- `PageReport`
- `PageImport`

Each page has its own state logic, callbacks, and rendering. This makes:
- Code review difficult
- Merge conflicts likely
- Tree-shaking impossible
- Individual page refactoring risky

### 4.2 Violation: Store Contains Business Logic

**Severity: 🟡 MEDIUM**

`projectStore.js` contains:
- **Calculation orchestration** (calls `runStationCalculations`, `runRules`, `generateBOM`, `generateAlternatives`, `runAttenuationAnalysis`)
- **Validation** (calls `validateStation`)
- **Data transformation** (import/export parsing)

The store should be a thin state container. Business logic orchestration should live in a **service layer** or **use case layer**.

### 4.3 Violation: Missing Standards (ISO, PDO, ADNOC)

**Severity: 🟡 MEDIUM**

Only 2 standards implemented:
- `saudiAramco` ✅
- `nace` ✅

Missing:
- `iso15589` ❌ (referenced in types but not implemented)
- `pdo` ❌ (referenced in types but not implemented)
- `adnoc` ❌ (referenced in types but not implemented)
- `custom` ❌ (referenced in types but not implemented)

The type system (`DesignStandard`) defines all 6 but only 2 exist. This creates a false sense of completeness.

### 4.4 Violation: Duplicated Attenuation Code

**Severity: 🟡 MEDIUM**

The attenuation engine exists in TWO locations:
1. `cp-platform/src/engine/modules/attenuationEngine.js`
2. `attenuation/attenuationEngine.js`

This is a maintenance hazard. Changes in one won't propagate to the other.

### 4.5 Violation: No Multi-Segment Calculation Support

**Severity: 🟡 MEDIUM**

While the data model supports multiple `pipelineSegments[]` per station, the **calculation engine** handles them correctly (loops over segments in `calcCurrentRequirement`), but:
- The **PDF report** only reads `pipelineSegments[0]` for station detail pages
- The **Excel export** only reads `pipelineSegments[0]`
- The **import** only creates a single segment

### 4.6 Violation: Auth Not Connected to App

**Severity: 🟢 LOW**

`LoginPage.jsx` and `authStore.js` exist but `App.jsx` does NOT route through `ProtectedRoute.jsx`. The auth system is implemented but not wired into the application routing.

### 4.7 Violation: No Feature Leakage Per Standard

**Severity: 🟢 LOW**

Standards are well-isolated in `src/standards/`. Each standard is a pure config object. This is GOOD. However, the `calculationEngine.js` imports `THRESHOLDS` directly in some places instead of always going through the standard config. For example, `calcCurrentRequirement` defaults to `THRESHOLDS.SPARE_FACTOR` instead of requiring a standard config.

---

## 5. Multi-Project Management Readiness

| Feature | Status | Assessment |
|---------|--------|------------|
| New Project | ✅ Implemented | `createProject()` in store |
| Open/Switch Project | ✅ Implemented | `switchProject()` + ProjectSelector UI |
| Duplicate Project | ✅ Implemented | `duplicateProject()` with UUID reassignment |
| Archive Project | ✅ Implemented | Soft-delete with `archived` flag |
| Delete Project | ✅ Implemented | Hard delete with min-1 guard |
| Multiple Projects | ✅ Implemented | `projects[]` array in store |
| Dashboard | ✅ Implemented | `PageDashboard.jsx` with project cards |
| Import/Export | ✅ Implemented | JSON project export/import |

**Verdict: STRONG.** Multi-project support is fully implemented and functional. The migration from single-project to multi-project format is handled by `migrateLegacyState()`.

---

## 6. Standards Framework Readiness

| Standard | Config Exists | Calculation Support | UI Support |
|----------|:------------:|:-------------------:|:----------:|
| Saudi Aramco | ✅ | ✅ Full | ✅ |
| NACE SP0169 | ✅ | ✅ Full | ✅ |
| ISO 15589 | ❌ | ❌ | ❌ |
| PDO | ❌ | ❌ | ❌ |
| ADNOC | ❌ | ❌ | ❌ |
| Custom | ❌ | ❌ | ❌ |

**Verdict: PARTIALLY READY.** The architecture supports standards cleanly — each standard is a config object that parameterizes the same calculation engine. Adding new standards requires only creating a new config file in `src/standards/`. The calculation engine already accepts standard config via `getActiveStandard()`.

---

## 7. Reference Knowledge Management

| Asset | Location | Status |
|-------|----------|--------|
| Source Excel workbook | `Reference/PCP Calculation sheet.xlsx` | ✅ Present |
| PDF calculation sheets | `Reference/CP{2,3,4}.pdf` | ✅ Present |
| KnowledgeBase docs | `Reference/KnowledgeBase/` (8 files) | ✅ Present |
| AI-readable formulas | `Reference/KnowledgeBase/FORMULA_LIBRARY.md` | ✅ Present |
| Engineering assumptions | `Reference/KnowledgeBase/ENGINEERING_ASSUMPTIONS.md` | ✅ Present |
| Design methodology | `Reference/KnowledgeBase/DESIGN_METHODOLOGY.md` | ✅ Present |

**Verdict: GOOD but scattered.** The KnowledgeBase is well-organized but exists outside the application directory. The application has no mechanism to consume these documents at runtime (e.g., for AI-assisted design recommendations).

---

## 8. Summary

| Area | Score | Notes |
|------|:-----:|-------|
| Calculation Engine Separation | 9/10 | Pure functions, zero side effects, independently testable |
| UI/Engine Separation | 8/10 | Clean boundary, but store orchestrates too much |
| Standards Framework | 7/10 | Good architecture, but only 2 of 6 standards implemented |
| Multi-Project Support | 9/10 | Fully implemented with migration support |
| Multi-Segment Support | 6/10 | Data model supports it, but reporting only uses first segment |
| Attenuation Integration | 7/10 | Fully functional but duplicated across 2 locations |
| Knowledge Management | 7/10 | Good content, but no runtime consumption mechanism |
| Code Organization | 5/10 | pages/index.jsx is a critical god file |
| State Management | 6/10 | Functional but store contains business logic |
| Auth Integration | 3/10 | Code exists but not wired into routing |
