---
title: Architecture Review
---

# ARCHITECTURE REVIEW — CP Designer ICCP Platform

> **Review Date:** June 2026
> **Version Analyzed:** 1.0.0
> **Codebase:** `cp-platform/`
> **Cross-References:** [UI/UX Audit](UI_UX_AUDIT.md) · [Performance Report](PERFORMANCE_REPORT.md) · [Formula Inventory](engineering/FORMULA_INVENTORY.md) · [Calculation Flow](engineering/CALCULATION_FLOW.md) · [Dependency Map](engineering/DEPENDENCY_MAP.md) · [Engineering Assumptions](engineering/ENGINEERING_ASSUMPTIONS.md)

---

## 1. Architecture Score: **82/100**

### Strengths

| Layer | Score | Key Strength |
|---|---|---|
| Domain Logic (engine/) | 95/100 | Pure functions, testable, stateless |
| State (store/) | 90/100 | Immutable, Zustand+Immer, well-structured |
| Constants (constants/) | 95/100 | Single source of truth for all engineering params |
| Presentation (components/) | 75/100 | Reusable primitives, consistent styling |
| Pages (pages/) | 60/100 | All-in-one file, mixing concerns |
| Reporting (reporting/) | 85/100 | Clean separation, dynamic imports |

---

## 2. Architecture Pattern

### DDMLA (Domain-Driven Modular Layered Architecture)

```
Layer 0: Foundation        constants/, types/          Engineering constants + types
Layer 1: Presentation      components/, pages/         UI components + pages
Layer 2: State             store/ (Zustand + Immer)    Centralized state
Layer 3: Business Rules    engine/rules/               Validation rules (6 rules)
Layer 4: Calculations      engine/modules/             Pure calc functions (7 modules)
Layer 5: Optimization      engine/optimizer/           Design alternatives (3 variants)
Layer 6: Reporting         reporting/                  PDF + Excel export
```

### Data Flow

```
User Input → Store → Calculate → Run Rules → Generate BOM → Optimize → Report
    ↑           ↓
    └─── UI reads result from Store ───┘
```

**Verification:** All data flows are unidirectional. No calculation function accesses the DOM or store. The store orchestrates calculations via `calculateStation()` which calls `runStationCalculations()` then `runRules()` then `generateAlternatives()`.

---

## 3. Layer-by-Layer Analysis

### Layer 0: Foundation (`constants/`, `types/`)

**Files:** `src/constants/index.js` (300 lines), `src/types/index.js`

| Aspect | Assessment |
|---|---|
| Completeness | ✅ All engineering constants in one place |
| Anode specs | ✅ HSCI_TA4, HSCI_TA2, MMO_TUBULAR, ZINC_RIBBON |
| Cable specs | ✅ 6 sizes with resistances |
| Coating types | ✅ 4 types with efficiencies |
| Soil classification | ✅ 5 categories |
| Thresholds | ✅ 10 engineering thresholds documented |
| Standards reference | ✅ 6 Aramco standards |
| JSDoc types | ⚠️ JSDoc types exist but `checkJs: false` in tsconfig |

**Issues:**
1. `ANODE_SPECS.ZINC_RIBBON.weightKg = 0` — per-meter weight would be more useful
2. No temperature correction coefficients for cable resistance
3. No utilization factor for anode consumption

### Layer 1: Presentation (`components/`, `pages/`)

**Files:** `components/ui.jsx` (230 lines), `components/layout.jsx` (163 lines), `pages/index.jsx` (1517 lines)

**Component Inventory:**
- `ui.jsx`: 15 reusable components (FieldInput, SelectField, ResultRow, CheckRow, InsightCard, StatCard, SectionCard, StatusBadge, WorkflowStepper, InfoBox, Divider, Grid2, Grid3)
- `layout.jsx`: 3 components (AppShell, Sidebar, TopBar)
- `pages/index.jsx`: 11 page components in one file

**Issues:**

| # | Issue | Severity | Details |
|---|---|---|---|
| 1 | **All 11 pages in one file** | 🟡 Medium | `pages/index.jsx` is 1517 lines. Each page should be a separate file. |
| 2 | **No route-based code splitting** | 🟡 Medium | No `React.lazy()` or route-based splitting — all page components bundled together |
| 3 | **BOM CSV Export is a no-op** | 🟢 Low | PageBOM has an "Export CSV" button with no onClick handler |
| 4 | **generateBOMForDisplay** duplicates `generateBOM` | 🟢 Low | Wrapper function in PageBOM that replicates `bomEngine.generateBOM` |
| 5 | **No error boundaries** | 🟡 Medium | If a page component throws, the entire app crashes |

### Layer 2: State (`store/`)

**File:** `src/store/projectStore.js` (300 lines)

**Technology:** Zustand + Immer persistence mix

| Aspect | Assessment |
|---|---|
| State shape | ✅ Well-structured: `project`, `activeStationId`, `ui` |
| Actions | ✅ Clear: CRUD for stations + segments, calculate, workflow, revisions |
| Persistence | ✅ localStorage with fallback to in-memory Map |
| Immer | ✅ Immutable updates with immer middleware |
| Selectors | ✅ getActiveStation, getTotalValidationFailCount, getAllStationsCalculated |

**Issues:**

| # | Issue | Severity | Details |
|---|---|---|---|
| 1 | **Business logic in store** | 🟡 Medium | `calculateStation` calls BOM gen + optimizer directly — should be orchestrated by a service layer |
| 2 | **No error handling in calculation** | 🟡 Medium | `try/finally` resets calculating state but doesn't surface errors to user |
| 3 | **localStorage has no size limit check** | 🟢 Low | Large projects with revisions could exceed 5MB localStorage limit |
| 4 | **Persist version not configurable** | 🟢 Low | `version: 1` hardcoded — should support migration path |

### Layer 3: Business Rules (`engine/rules/`)

**Files:** `rulesEngine.js` (310 lines), `bomEngine.js` (310 lines)

**Rules Engine Pattern:** Rules are first-class objects with `check`, `insight`, and `recommendation`.

**6 Validation Rules:**
| ID | Rule | Status |
|---|---|---|
| BR-001 | TR Voltage Adequate (`V_rated ≥ V_min`) | ✅ |
| BR-002 | Groundbed R < Max Allowable (`R_G < R_Gmax`) | ⚠️ RGmax formula may need EMF fix |
| BR-003 | Circuit R < 70% Operating Limit | ✅ |
| BR-004 | Circuit R < 90% Warning Limit | ✅ |
| BR-005 | Design Life ≥ Target | ✅ |
| BR-006 | Remoteness Check | ✅ |

**3 Proactive Insights:**
- High soil resistivity → recommend deepwell
- Low TR current headroom → recommend upgrade
- Elevated operating temperature → recommend monitoring

**BOM Engine:** 7 rule sets (TRU, Deepwell, Shallow, Cables, Junction Boxes, Test Stations, Misc)

### Layer 4: Calculations (`engine/modules/`)

**Files:** `calculations.js` (240 lines), `validation.js` (100 lines)

**7 Pure Calculation Functions:**
| Function | Inputs | Outputs | Lines |
|---|---|---|---|
| `calcSurfaceArea` | OD, length | Area m² | 10 |
| `calcTempCorrectedCurrentDensity` | Base CD, temp | i_T | 6 |
| `calcCurrentRequirement` | Segments | I_req, I_design, per-segment | 30 |
| `calcDweellGroundbedResistance` | Soil ρ, dims | R_G Ω | 20 |
| `calcShallowVerticalGroundbedResistance` | Soil ρ, dims, N | R_G Ω | 35 |
| `calcCableResistances` | Cable config | R_ac, R_pc, R_nc | 30 |
| `calcTRCircuit` | R_G, R_c, TR params | R_T, V_min, AC power | 35 |
| `calcDesignLife` | N, W, C, I | Years | 6 |
| `runStationCalculations` | Station + target | Full result (35+ fields) | 50 |

### Layer 5: Optimization (`engine/optimizer/`)

**File:** `optimizer.js` (150 lines)

Generates 3 design alternatives:
| Alternative | Description |
|---|---|
| Current | Baseline with current parameters |
| Alt A | +4 anodes |
| Alt B | +8 anodes |
| Alt C | Larger TR (next standard size up) |

**Issues:**
1. `JSON.parse(JSON.stringify(station))` for cloning — loses functions, prototype chains
2. Only adds anodes — doesn't try reducing anodes for cost optimization
3. TR upgrade only increments +10A/next standard — no consideration of different V/I combinations

### Layer 6: Reporting (`reporting/`)

**Files:** `pdfGenerator.js` (~250 lines), `excelEngine.js` (~370 lines)

- PDF: Full A4 engineering report with DW formula standard formatting
- Excel: Multi-sheet export with Summary, Stations, BOM, Revisions
- Both use dynamic imports ✅ (loaded on demand, not in critical path)

---

## 4. Technical Debt Register

| # | Item | Impact | Effort | Priority |
|---|---|---|---|---|
| TD-1 | All pages in one file (1517 lines) | Maintainability | 4h | 🟡 Medium |
| TD-2 | No error boundaries | User experience | 2h | 🟡 Medium |
| TD-3 | JSON.parse for cloning in optimizer | Performance/Correctness | 1h | 🟢 Low |
| TD-4 | No input validation before calculation | Safety | 2h | 🟡 Medium |
| TD-5 | Business logic in store layer | Architecture | 4h | 🟢 Low |
| TD-6 | JSDoc types not enforced (checkJs: false) | Type safety | Ongoing | 🟢 Low |
| TD-7 | No route-based code splitting | Performance | 4h | 🟢 Low |
| TD-8 | BOM CSV export is a no-op | Feature | 1h | 🟢 Low |
| TD-9 | No load testing or memory profiling | Performance | 8h | 🟢 Low |
| TD-10 | Excel import has no file size validation | Safety | 1h | 🟡 Medium |

---

## 5. Code Quality Metrics

| Metric | Value |
|---|---|
| Total JS/JSX source files | ~20 |
| Total Lines of Code (src/) | ~3,500 |
| Test files | 14 |
| Unit tests | 342 |
| Test coverage (engine) | 100% lines |
| Test coverage (overall) | 66% lines |
| ESLint errors | 0 (after fixes) |
| Prettier compliance | 100% (after fixes) |
| Dependencies | 14 runtime + 11 dev |

---

## 6. Recommendations

### Immediate (Fix Now)
1. Add error boundaries to App.jsx
2. Add input validation call before `runStationCalculations`
3. BOM CSV export should be functional

### Short-term (Next Sprint)
4. Split `pages/index.jsx` into individual page files
5. Add `React.lazy()` for route-based code splitting
6. Add file size validation on Excel import

### Medium-term (Next Month)
7. Extract business logic from store into service/action layer
8. Implement proper cloning in optimizer (structuredClone or manual)
9. Add calculation timing metrics
10. Enable `checkJs: true` for gradual type safety
