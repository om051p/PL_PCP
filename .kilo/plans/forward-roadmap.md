# RAXA — Full Forward Plan (Post Formula-Fix)

**Date:** 2026-06-13
**Branch:** `feat/phase-c-motion` (7 unpushed commits, modified working tree)
**Status:** Phase A (formula fixes) complete — 617/633 tests pass, build clean

---

## 0. Recap of What Just Shipped (Phase A)

| Bug | File | Fix |
|---|---|---|
| Back EMF formula `2*V/I` | `src/engine/modules/calculations.js:353` | `R_emf = V/I` (SAES-X-600 §5.2.5) |
| HSCI current density 10.8 | `src/constants/index.js` | 7.0 A/m² (SAES-X-400 Table 5) |
| MMO_TUBULAR 200 | `src/constants/index.js` | Split into `_FRESH` (7.0) / `_SALT` (35.0) |
| 6 golden datasets | `src/test-utils/verificationFramework.js` | Updated backEMFResistanceOhm + 2 dependents per dataset |
| 2 test fixtures | `engineeringAcceptance`, `calculations` tests | Updated |
| 2 e2e fixtures | `fullWorkflow`, `naceWorkflow` | `maxCurrentDensity: 10.8 → 7.0` |
| 4 formula strings | `PageTRSizing.jsx`, `pdfGenerator.js` | SAES-cited formula text |
| 1 hand-calc | `scripts/verify_datasets.mjs` | Updated formula |

**Tests:** 617/633 — same as baseline (1 pre-existing governance failure, 1 firestore test needs emulator)
**Build:** clean (825ms)
**New lint errors:** 0

---

## 1. Remaining Work — Phased Roadmap

| Phase | Scope | Effort | Risk | Status |
|---|---|---|---|---|
| **1** | Git hygiene (push unpushed commits, branch cleanup) | S | Low | Pending |
| **2** | Full formula audit (verify fixes, check edge cases) | S | Low | Pending |
| **3** | Input linking audit (extend traceability to all 11 designBasis fields) | M | Low | Pending |
| **4** | Sensitivity module (tornado + sweep + spider) | M-L | Med | Pending |
| **5** | AttenuationExplorer flagship (curve + cursor + scenarios) | L | High | Pending |
| **6** | More visualizations (ProtectionHeatMap, KPITrendWidget, ProjectOverviewMap) | M | Low | Pending |
| **7** | Polish (component tests, a11y, bundle split, real activity log) | M | Low | Pending |
| **8** | Deploy & document | S | Low | Pending |

**Total estimated effort:** ~25-35 eng-days

---

## 2. Phase 1 — Git Hygiene

### 1.1 Push the 7 unpushed commits
```
git push origin feat/phase-c-motion
```

### 1.2 Clean up working tree
- 30+ modified files in working tree
- 13+ untracked files (new pages, components, scripts, reports)
- Commit the formula-fix changes from Phase A as a single commit (or split into "engine fix" + "test updates" + "string updates")
- Commit the untracked `PageCompliance.jsx`, `CalculationTraceability.jsx`, `PageSoilResistivity.jsx`, `standardsValidationEngine.js` as separate commits if they belong to a specific feature

### 1.3 Verify CI passes
- `npm run test:coverage`
- `npm run test:e2e`
- `npm run build`
- `npm run lint`

**Deliverable:** Clean working tree on `feat/phase-c-motion` matching remote.

---

## 3. Phase 2 — Full Formula Audit

### 2.1 Verify Phase A fixes in context
- Run `verify_datasets.mjs` — investigate pre-existing 3.7% / 15% drift (coatingEfficiency, designLife formula divergence between hand calc and engine)
- Spot-check 3 sample projects through the UI to confirm new R_T and V_min values are reasonable

### 2.2 Check additional formula concerns
- **`resistivityEngine.js:665`** — `(V_rated - backEMF) / I_rated` for max allowable groundbed R. Per `FORMULA_CORRECTION_ANALYSIS.md` this is a *different* computation. **Action:** Add a code comment documenting why it does not conflict with the Phase A fix.
- **Attenuation engine** — verify NACE SP0169 §10 / ISO 15589-1 compliance for `E(x) = E_natural + ΔE_0 × e^(−αx)` and α = √(R_steel/R_leak)
- **Optimizer** — verify sensitivity / scenario logic in `src/engine/optimizer/optimizer.js`
- **Validation rules** — verify SAES-X-300/400/500/600/700 rule coverage in `src/engine/modules/standardsValidationEngine.js` (380 lines, 15+ rules)
- **Coating efficiency application** — the verify_datasets.mjs drift suggests `coatingEfficiency` may be double-applied or missed in `calcCurrentRequirement`

### 2.3 Produce updated `FORMULA_AUDIT_REPORT.md` v2
- Mark the 2 Phase A bugs as FIXED
- Add findings from 2.2
- Update the dependency graph if any flow changes

**Deliverable:** Updated `cp-platform/FORMULA_AUDIT_REPORT.md` v2.

---

## 4. Phase 3 — Input Linking Audit

### 4.1 The 11 designBasis fields and their consumers
| Field | Known consumers | Traceability status |
|---|---|---|
| `soilResistivityOhmCm` | 6 modules (audited in Phase 1 of UI work) | ✅ Audited |
| `systemDesignLifeYears` | calcDesignLife, BOM, validation | ⚠ Partial |
| `backEmfV` | calcTRCircuit, validation | ⚠ Partial |
| `structureResistanceOhm` | calcTRCircuit, validation | ⚠ Partial |
| `trEfficiencyPct` | calcTRCircuit, BOM | ⚠ Partial |
| `trPowerFactor` | calcTRCircuit | ⚠ Partial |
| `cokeContingencyPct` | calcCokeRequirement, BOM | ⚠ Partial |
| `acInputVoltageV` | calcTRCircuit | ⚠ Partial |
| `acInputPhase` | calcTRCircuit | ⚠ Partial |
| `actualRemotenessDistanceM` | validation, BOM | ⚠ Partial |
| `minRemotenessDistanceM` | validation, BOM | ⚠ Partial |

### 4.2 Build `InputLinkRegistry` (new module)
**File:** `src/engine/inputLinkRegistry.js`

Pure data structure mapping every designBasis field to:
- Type (`number`, `enum`, `boolean`)
- Unit (`Ω·cm`, `V`, `years`, `%`)
- Standard reference (SAES-X-400 §5.3 etc.)
- Default value
- Downstream consumers with **exact field paths** (e.g., `calcTRCircuit(..., backEmfV, ...)`)
- Validation rules that depend on it

### 4.3 Extend `CalculationTraceability` component
Add a new mode/prop to the existing component to render the **full dependency map** for any given input — showing all downstream modules, field paths, and the calculation result that the input affects.

### 4.4 Add to `PageProjectSetup` (Design Basis page)
A new "Input Dependencies" section showing the linkage map for the currently-edited designBasis field. Live-updates as the user changes fields.

**Deliverables:**
- `src/engine/inputLinkRegistry.js` (~150 lines)
- Extended `CalculationTraceability.jsx` (~+60 lines)
- New section in `PageProjectSetup.jsx` (~+80 lines)
- `INPUT_LINKING_AUDIT.md` report

---

## 5. Phase 4 — Sensitivity Module

### 5.1 Architecture
Read-only — consumes existing engine outputs, never modifies them. Three visualizations:

#### 5.1.1 Tornado Diagram
- Rank-orders inputs by impact on a chosen output (e.g., R_G, V_min, design life)
- X-axis: % change in output
- Y-axis: input names
- Each bar: ±10% perturbation (configurable)
- Color: red = increases output, green = decreases

#### 5.1.2 Sensitivity Sweep (Spider / Radar)
- Multi-axis radar chart
- Each axis = one output (R_G, V_min, design life, cable R, etc.)
- Overlay multiple curves: current state, +X% anodes, +X% depth, etc.
- Quickly shows trade-offs

#### 5.1.3 One-At-A-Time Sweep (Sweep Chart)
- Single input swept across a range (e.g., soil resistivity 100-10000 Ω·cm)
- X-axis: input value
- Y-axis: output value (configurable)
- Highlight current operating point

### 5.2 Pure engine module
**File:** `src/engine/sensitivity/index.js`

```javascript
// Pure read-only functions, no side effects
export function computeTornado(baseStation, output, inputs, perturbation = 0.1) { ... }
export function computeSweep(baseStation, input, range, output) { ... }
export function computeScenarioComparison(baseStation, scenarios) { ... }
```

### 5.3 Visualization components
**Files:**
- `src/visualizations/SensitivityTornado.jsx` (SVG, ~200 lines)
- `src/visualizations/SensitivitySweep.jsx` (Recharts LineChart, ~120 lines)
- `src/visualizations/sidePanel/widgets/SensitivityRadar.jsx` (~150 lines)

### 5.4 Wire-in
- New dedicated page `/sensitivity` (or add as a tab on `PageOptimizer`)
- Side panel widget for `PageGroundbed` and `PageTRSizing`
- Reuses `useAnimatedNumber` from Phase C0 for value tweening

### 5.5 Tests
- Unit tests for `computeTornado` / `computeSweep` (deterministic, golden output)
- Snapshot test for `SensitivityTornado` SVG render
- Visual regression (Playwright) for 3 cases

**Deliverables:**
- `src/engine/sensitivity/` (3-4 files, ~400 lines)
- 3 visualization components (~470 lines)
- New `/sensitivity` page (~250 lines)
- ~150 lines of tests
- `SENSITIVITY_MODULE_REPORT.md`

---

## 6. Phase 5 — AttenuationExplorer Flagship

The single biggest productivity win per the C4 plan.

### 6.1 Components
- **`AttenuationExplorer.jsx`** (flagship) — Recharts LineChart with potential (mV) vs distance (km)
  - `<ProtectionBand>` overlay (NACE -850 mV shaded region)
  - Station markers (vertical lines + labels), groundbed markers, TR marker
  - **Live cursor inspector** — animated crosshair + dot on `onMouseMove`, hover panel shows distance / potential / protection state / local gradient (dV/dx from neighbors)
  - Keyboard control: `←/→` move crosshair, `Home/End` jump to ends
  - 60 fps cursor tracking, memoized, requestAnimationFrame-throttled
- **`ScenarioToggle.jsx`** — 4-scenario overlay: existing current, +20%, -20%, alternate groundbed

### 6.2 Live in `AttenuationPage`
- Replace the current 593 LoC implementation in stages
- Keep existing inputs/results tabs working
- Add the explorer as the **Profile** tab content (it already shows ProfileChart — replace it)

### 6.3 Sensitivity integrated
- The SensitivityTornado for "design current" lives in the right side panel of AttenuationPage
- Clicking a tornado bar re-runs the explorer with the perturbed current

### 6.4 Risk mitigation
- Build in vertical slices: curve → protection band → scenarios → cursor → sensitivity
- Stop after cursor if schedule slips (cursor is the biggest UX win alone)
- Cap data points to 500; use `requestAnimationFrame` for cursor tracking; memoize aggressively
- All viz consume read-only snapshots of engine output

### 6.5 Tests
- Unit tests for cursor state management
- Snapshot tests for the explorer SVG render
- A11y test: keyboard navigation reaches all markers
- Visual regression (Playwright) for 3 cases

**Deliverables:**
- `AttenuationExplorer.jsx` (~400 lines)
- Refactored `AttenuationPage.jsx` (~+200 lines)
- ~200 lines of tests
- `ATTENUATION_EXPLORER_REPORT.md`

---

## 7. Phase 6 — More Visualizations

### 7.1 `ProtectionHeatMap`
- 2D grid: rows = stations, columns = scenarios (or stations × time)
- Cell color: green/amber/red by protection status
- Hover: scenario name, station name, mV value, status
- Reuses `VizTooltip`, `VizLegend`
- **Lives on `PageValidation`** (new "Spatial View" tab)

### 7.2 `KPITrendWidget`
- Recharts LineChart showing KPI value over time (across recent calculations)
- Animated value tween (use `useAnimatedNumber`)
- Threshold lines for pass/warn/fail zones
- **Lives on `PageDashboard`** (replaces the static KPI row)

### 7.3 `ProjectOverviewMap`
- 2D scatter on stylized grid (no real map tiles — zero-dep)
- If no lat/lng: high-density project grid sorted by status
- Mini `PipelineOverviewCanvas` per project
- **Lives on top of `PageDashboard`** (new section)

**Deliverables:**
- 3 new visualization components (~500 lines total)
- Updates to `PageValidation.jsx`, `PageDashboard.jsx`
- ~150 lines of tests

---

## 8. Phase 7 — Polish (C6)

### 8.1 Component tests
- jsdom + Vitest for all new widgets (`CalculationTraceability`, `SensitivityTornado`, `AttenuationExplorer`, etc.)
- Use React Testing Library

### 8.2 A11y audit
- Lighthouse CI: a11y ≥ 95
- axe-core run on every visualization page
- Keyboard audit: every viz navigable without mouse
- Screen reader smoke test (VoiceOver / NVDA)

### 8.3 Real activity log
- Replace the derived activity feed in the dashboard with a real store
- Persist to Firestore (new `activity` collection)

### 8.4 Bundle split
- Dynamic imports for `AttenuationExplorer`, `SensitivityTornado` (heavy components)
- Recharts and Framer Motion already tree-shaken
- Target: initial bundle < 600 KB

### 8.5 Visualization guide doc
- `docs/ui/visualization-guide.md` — when to use which viz, do/don't

**Deliverables:**
- ~600 lines of component tests
- 1 Lighthouse + axe CI workflow
- 1 real activity log module
- 1 visualization guide doc

---

## 9. Phase 8 — Deploy & Document

### 9.1 Commit strategy
Each phase is one PR:
- `fix(formula): back-EMF resistance and MMO/HSCI current density per SAES-X-400/X-600`
- `docs(formula): update audit report v2`
- `feat(input-link): full designBasis dependency registry`
- `feat(sensitivity): tornado + sweep + radar module`
- `feat(attenuation): AttenuationExplorer flagship with cursor inspector`
- `feat(viz): ProtectionHeatMap, KPITrendWidget, ProjectOverviewMap`
- `chore(polish): component tests, a11y, bundle split`

### 9.2 Final verification
- All 633+ tests pass
- Build clean
- 0 lint errors
- Screenshots regenerated
- One release notes entry per PR

---

## 10. Open Questions for User

Before I start, please confirm:

1. **Scope of phase 3 (input linking):** all 11 designBasis fields, or just the 7 currently consumed by `runStationCalculations`?
2. **Phase 4 sensitivity module:** new dedicated page `/sensitivity`, or add as a tab to the existing `PageOptimizer`?
3. **Phase 5 AttenuationExplorer:** full flagship (curve + cursor + scenarios + sensitivity) or MVP (curve + cursor only)?
4. **Phase 6 visualizations:** all 3 (HeatMap + KPITrend + ProjectMap) or pick the highest-impact one?
5. **Phase 7 polish:** in scope now, or defer to a separate release?
6. **Phase 1 (push commits):** push first, or wait until at least Phase 3 ships?

---

## 11. Risk Register (Updated)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sensitivity tornado produces misleading results if base case has zero outputs | Med | Med | Guard: skip inputs whose ±perturbation is below numeric threshold |
| AttenuationExplorer overscopes | High | High | Vertical-slice delivery; stop at cursor if needed |
| `coatingEfficiency` double-applied in `calcCurrentRequirement` | Med | Med | Investigate in Phase 2.2; fix if confirmed |
| MMO_TUBULAR split breaks any consumer | Low | High | grep verified 0 references outside constants file |
| 7 unpushed commits have their own lint/test issues | Med | Med | Run full test + lint after stash in Phase 1 |
| `Back EMF` formula fix invalidates existing real-world projects' "approved" calculations | High | Med | Document in migration notes; consider offering a "pre-fix" mode toggle for legacy data |
