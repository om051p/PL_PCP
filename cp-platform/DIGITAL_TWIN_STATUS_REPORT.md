# Digital Twin — Status Report

**Date:** 2026-06-14
**Scope:** Current implementation status of the RAXA Digital Twin subsystem (`src/digitalTwin/`)
**Audience:** Engineering leads, product owners

---

## 1. Executive Summary

The Digital Twin **engine and state layer are complete and tested** (1,416 LOC across 8 files, with 351 lines of test coverage). The **entire UI surface is missing** — no page, no route, no sidebar entry, no consumer component. All Digital Twin code is wired only into the Zustand store; no user can see it from the app.

**Status: foundation only, not user-accessible.**

---

## 2. Direct Answers to the 8 Questions

| # | Question | Answer | Evidence |
|---|----------|--------|----------|
| 1 | Does a user-facing Digital Twin page exist? | **NO** | No `PageDigitalTwin.jsx` or equivalent in `src/pages/`. Grep across all `src/pages/` for `DigitalTwin\|Asset Registry\|Health Engine\|Risk Engine` returns zero matches. |
| 2 | Is there a route registered for Digital Twin? | **NO** | `App.jsx` has 23 protected routes (`/dashboard`, `/project`, `/pipeline`, ..., `/tank`, `/vessel`, `/settings`, `/users`). None reference Digital Twin. |
| 3 | Is there a sidebar navigation entry? | **NO** | `src/components/layout.jsx` has no Digital Twin nav item. Grep for `DigitalTwin\|Asset Registry\|Health Engine\|Risk Engine` in `components/layout.jsx` returns zero matches. |
| 4 | Which files implement the Digital Twin UI? | **NONE** | `grep -rn "DigitalTwin\|digitalTwin"` in `src/` (excluding `src/digitalTwin/` itself and tests) returns exactly one match: the store wiring in `src/store/projectStore.js:16`. No component imports the slice's hooks. |
| 5 | Which files implement the Digital Twin engine? | **8 files, 1,416 LOC** | Listed in §3 below. |
| 6 | Is Asset Registry currently visible anywhere? | **NO** | `assetRegistry.js` (166 LOC) is imported only by `assetSlice.js` and `digitalTwin.test.js`. Never rendered. |
| 7 | Is Health Engine currently displayed anywhere? | **NO** | `healthScoreEngine.js` (261 LOC) is imported only by `assetSlice.js`, `DigitalTwinModel.js`, and tests. The dashboard's "Station Health Matrix" uses `validationErrors` + `checks.status` from the calculation engine — **not** the Digital Twin health engine. |
| 8 | Is Risk Engine currently displayed anywhere? | **NO** | `riskEngine.js` (178 LOC) is imported only by `assetSlice.js`, `DigitalTwinModel.js`, and tests. Never rendered. |

---

## 3. File Inventory

### 3.1 Engine — Foundation Complete (1,065 LOC, 5 files)

| File | LOC | Purpose | Consumers |
|---|---|---|---|
| `src/digitalTwin/assets/AssetTypes.js` | 68 | Enum of 6 asset types (PIPELINE, TR_UNIT, GROUNDBED, BOND, TEST_STATION, JUNCTION_BOX) with display metadata | assetFactory, tests |
| `src/digitalTwin/assets/assetFactory.js` | 150 | Pure factory: design data → asset objects (pipeline / TR / groundbed / station) | assetSlice, DigitalTwinModel, tests |
| `src/digitalTwin/assets/assetRegistry.js` | 166 | `getAssetsForStation(registry, stationId)` plus registry shape (byStation index) | assetSlice, tests |
| `src/digitalTwin/healthScoreEngine.js` | 261 | Deterministic 0–100 health score; `HEALTH_THRESHOLDS`, `getHealthStatus`, `computeProjectHealthScores` | assetSlice, DigitalTwinModel, tests |
| `src/digitalTwin/riskEngine.js` | 178 | Risk = Consequence × Likelihood matrix; `RISK_LEVELS`, `getRiskLevel`, `computeProjectRiskAssessments` | assetSlice, DigitalTwinModel, tests |
| `src/digitalTwin/DigitalTwinModel.js` | 73 | Root model + `refreshDigitalTwin(project, currentModel)` immutable update | tests |
| `src/digitalTwin/assetSlice.js` | 169 | Zustand slice: `createAssetSlice(set, get)` exposes `digitalTwin` state + `getAssetsForStation`, `getHealthScore`, `getRiskAssessment`, `refreshDigitalTwinForProject` | projectStore |
| `src/digitalTwin/digitalTwin.test.js` | 351 | Vitest suite covering AssetTypes, assetFactory (4 cases), assetRegistry, healthScoreEngine, riskEngine | self |

### 3.2 State Wiring — Complete (1 hookup)

`src/store/projectStore.js:16` imports `createAssetSlice` and merges it into the root store. The slice is reachable via `useProjectStore.getState().digitalTwin` or selectors (`getAssetsForStation`, `getHealthScore`, `getRiskAssessment`).

### 3.3 UI — None

No `PageDigitalTwin.jsx`, no `DigitalTwinPanel.jsx`, no `AssetRegistryTable.jsx`, no `HealthScoreWidget.jsx`, no `RiskMatrix.jsx`, no chart, no widget, no card, no sidebar link.

---

## 4. Status by Category

### Completed Components
- ✅ **Asset Types enum** (`AssetTypes.js`) — frozen, documented
- ✅ **Asset Factory** (`assetFactory.js`) — pure, deterministic
- ✅ **Asset Registry** (`assetRegistry.js`) — query API
- ✅ **Health Score Engine** (`healthScoreEngine.js`) — 0–100 scoring + status tiers
- ✅ **Risk Engine** (`riskEngine.js`) — Consequence × Likelihood matrix
- ✅ **Digital Twin Model** (`DigitalTwinModel.js`) — immutable refresh
- ✅ **Zustand Slice** (`assetSlice.js`) — store integration
- ✅ **Test Suite** (`digitalTwin.test.js`) — 351 LOC of coverage
- ✅ **State Hookup** (`projectStore.js`) — slice merged into root

### UI Components
- ❌ **None**

### Hidden Components (engine complete, zero UI)
- 🫥 **Asset Registry** — engine ready, never rendered
- 🫥 **Health Engine** — engine ready, never rendered (dashboard uses a different health proxy)
- 🫥 **Risk Engine** — engine ready, never rendered
- 🫥 **Asset Factory** — engine ready, only triggered via slice (not triggered by any user action)

### Foundation-Only Components
- All 7 production files in `src/digitalTwin/` plus the slice integration are **foundation only**. They compute correctly but produce data that no UI ever reads.

### Missing Components
- ❌ Digital Twin landing page (e.g. `PageDigitalTwin.jsx`)
- ❌ Route registration in `App.jsx` (e.g. `<Route path="/digital-twin" />`)
- ❌ Sidebar nav entry in `components/layout.jsx`
- ❌ Asset Registry table / list view
- ❌ Health Score gauge / trend widget
- ❌ Risk Matrix heatmap
- ❌ Per-station Digital Twin panel
- ❌ Project-level twin summary
- ❌ Refresh action / button / trigger UI
- ❌ Click-through from dashboard "Station Health Matrix" to twin detail
- ❌ Any visualization consuming `useProjectStore(s => s.getHealthScore(stationId))` or `getRiskAssessment(stationId)`

---

## 5. How to Access Current Functionality

**Short answer: you can't, from the UI.**

The only way to interact with the Digital Twin code today is to open a DevTools console while logged in and read state directly:

```js
// In browser DevTools, after login:
useProjectStore.getState().digitalTwin
// or:
useProjectStore.getState().getHealthScore('st_001')
useProjectStore.getState().getAssetsForStation('st_001')
useProjectStore.getState().getRiskAssessment('st_001')
```

(`useProjectStore` is the Zustand store import path; the above is conceptual — actual invocation requires the store reference in the console scope.)

`refreshDigitalTwinForProject` is not called by any component, so the registry remains empty until manually invoked.

---

## 6. Dashboard "Health" Is Not the Digital Twin Health Engine

Worth flagging: `PageDashboard.jsx:486-528` renders a "Station Health Matrix" that *looks* like Digital Twin health, but it derives health color from `st.validationErrors` and `st.lastCalcResult.checks` — the calculation-validation pipeline, not `healthScoreEngine.js`. The KPI at `PageDashboard.jsx:719` ("Project Health") follows the same data source.

This means the dashboard's health display is a **separate, simpler health proxy** that has not been replaced by (or integrated with) the Digital Twin `healthScoreEngine`. Any future UI work should decide whether to:
1. Replace the dashboard proxy with `getHealthScore(stationId)`, or
2. Leave the proxy and add Digital Twin health as a separate surface.

---

## 7. Cross-References

- `cp-platform/DIGITAL_TWIN_FOUNDATION.md` — original foundation document
- `cp-platform/PLATFORM_ROADMAP_COMPLETION_REPORT.md:31` — lists "M15: Full Digital Twin" as ✅ Complete; the data layer matches, the user-facing layer does not
- `src/store/projectStore.js:16` — the only non-test consumer of Digital Twin code in the entire app
- `.kilo/plans/REPOSITORY_CLEANUP_PLAN.md` — active "DO NOT" list; any Digital Twin UI work would be net-new scope, not cleanup

---

## 8. Recommended Next Steps (out of scope for this report)

1. Create `PageDigitalTwin.jsx` — list stations, show per-station health/risk/assets
2. Register route `<Route path="/digital-twin" element={<PageDigitalTwin />} />` in `App.jsx`
3. Add sidebar nav entry in `components/layout.jsx`
4. Wire `refreshDigitalTwinForProject()` into the project-load lifecycle
5. Decide dashboard integration: replace or supplement the existing "Station Health Matrix"
6. Add a small "Digital Twin" badge/summary in the topbar for at-a-glance project health
