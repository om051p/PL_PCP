# RAXA Pipeline — Release 2.2.0 Notes

**Release date:** 2026-06-14
**Branch:** `main`
**Codename:** M7 — Attenuation Hardening & Architecture Audit

---

## What ships in 2.2

A **robustness + audit** release. No formula changes, no standards changes, no engine changes. Two pillars:

1. **Attenuation hardening (M7)** — Attenuation is now a pure downstream consumer of actual project assets. No synthetic stations, no default TRs, no default groundbeds. State machine UI. Stale-data detection on upstream changes. Defensive programming throughout.
2. **Platform architecture audit** — Seven deliverable documents covering dependency mapping, data flow, broken links, staleness analysis, module validation design, dashboard recommendations, and report synchronization. No code changes from the audit itself; design proposals only.

---

## Pillar 1 — Attenuation Hardening (M7)

### New files

| File | Purpose | Tests |
|---|---|---|
| `src/services/attenuationInputBuilder.js` | Pure downstream consumer. Derives `AttenuationInput` from `project.stations`, TR, groundbed, pipeline segments, design basis. Returns `{ input, validation }`. | 36 unit tests |
| `src/services/attenuationStateMachine.js` | `EMPTY \| INCOMPLETE \| READY \| CALCULATED \| STALE \| ERROR` state machine for UI rendering. | 8 unit tests |
| `src/services/attenuationInputBuilder.test.js` | Coverage: 0/1/N assets, deletions, defensive (null/undefined/NaN, missing chainage, missing pipeline, missing TR, missing groundbed, partial station removal, designBasis missing, station id missing). | |
| `src/services/attenuationStateMachine.test.js` | Coverage: EMPTY, INCOMPLETE, READY, CALCULATED, STALE, ERROR transitions. | |

### Modified files

| File | Change |
|---|---|
| `src/pages/AttenuationPage.jsx` | Removed `DEFAULT_INPUT` and synthetic stations. Renders state-machine UI. EmptyState with engineering guidance when `INCOMPLETE`. "Attenuation requires recalculation" banner on `STALE`. Defensive `?.` everywhere. |
| `src/services/attenuationService.js` | Preflight structural validation. Wraps engine in try/catch. Never throws. Returns engineering messages. |
| `src/store/slices/attenuationSlice.js` | Adds `attenuationState`, `attenuationGuidance`, `markAttenuationStale()`. Updates state on every result. |
| `src/store/slices/stationSlice.js` | `addStation`, `removeStation`, `updateStation`, `addSegment`, `removeSegment`, `updateSegment` now set `attenuationDirty = true` so attenuation page shows STALE. |
| `src/visualizations/AttenuationExplorer.jsx` | Defensive: `currentA` NaN guard, `Array.isArray(stations)` guard, `buildScenarioInput` early-return for missing input. |
| `src/visualizations/CriticalKPDetector.jsx` | Defensive: `Array.isArray(profile)` guard, `Number.isFinite` formatting, hooks always run before early return (rules-of-hooks). |
| `src/visualizations/StationSpacingRecommendation.jsx` | Defensive: `Number.isFinite` formatting, safe array iteration. |

### Behaviour

- **1 station / 1 TR / 1 groundbed** → attenuation uses exactly those assets.
- **3 of each** → uses exactly those three.
- **Delete TR** → state becomes `INCOMPLETE` with `NO_TR` guidance ("Go to TR Sizing"). No crash.
- **Delete station** → `INCOMPLETE` with `NO_STATIONS` guidance.
- **Delete groundbed** → `INCOMPLETE` with `NO_GROUNDBED` guidance.
- **Edit TR / groundbed / pipeline / soil ρ / cable** → `STALE` banner ("Attenuation requires recalculation").
- **Missing chainage** → `INCOMPLETE` with `MISSING_STATION_CHAINAGE` guidance.
- **Missing soil ρ** → `INCOMPLETE` with `MISSING_SOIL_RESISTIVITY` guidance.
- **Missing TR voltage** → `INCOMPLETE` with `MISSING_TR_VOLTAGE` guidance.

### Test results

- **1218 unit tests pass** (16 skipped — pre-existing). 1 pre-existing Firebase-emulator test fails (env, not code).
- **ESLint: 0 errors.** 10 pre-existing warnings unchanged.
- New tests: 44 (`attenuationInputBuilder.test.js`: 36, `attenuationStateMachine.test.js`: 8).

---

## Pillar 2 — Platform Architecture Audit (design only)

Seven new documents at the repository root. **No code changes** — these are the contract for future refactors.

| File | Size | What it is |
|---|---|---|
| `MODULE_DEPENDENCY_MATRIX.md` | 34 KB | Per-module inputs/outputs/hard deps/soft deps/forbidden ops/hardcoded values. Hidden dependencies. 13 sections of hardcoded-value inventory. Change-authority rules. |
| `ENGINEERING_DATAFLOW_MAP.md` | 25 KB | Persistence tiers, 4 live-action flow sequences, 35-row consumer→producer table, 14 cache-lifetime rows, cross-engine data flow, mermaid diagram. |
| `BROKEN_LINK_ANALYSIS.md` | 26 KB | 30 broken-link findings (BL-01..BL-30) with severity. 16 hidden single-source-of-truth violations (HV-01..HV-16). 6 multi-station sync risks (MS-01..MS-06). Field-name contract risk table. |
| `STALE_DATA_ANALYSIS.md` | 20 KB | Per-module staleness detection table. 8 trace walk-throughs (Scenarios A–H). 3-kind staleness taxonomy. `dataVersion` design proposal. 36-row quantitative staleness surface. |
| `MODULE_VALIDATION_DESIGN.md` | 21 KB | State machine `NOT_STARTED/INCOMPLETE/VALID/WARNING/ERROR`. 13-module validation spec. `ValidationStateCard` UI mockup. Per-page mapping. |
| `DASHBOARD_RECOMMENDATIONS.md` | 9 KB | Recommended project-management-only scope. 15 components to move out. 8 action items. |
| `REPORT_SYNC_AUDIT.md` | 16 KB | 17 findings (RS-01..RS-17). 25-row engineering-content reachability matrix. Round-trip safety. |

### Key findings

- **30 broken links** between producer updates and consumer invalidations.
- **36 stale-data paths**, 18 invisible to user (silently show old numbers).
- **16 hidden single-source-of-truth violations** (soil classification, AC input, back EMF, TR efficiency, spare factor, anode spec, surface area, 100V TR ceiling, 70%/90% circuit limits, 25-year design life, utilization factor, soil ρ default, BOM categories, health weights, risk matrix, standard codes).
- **Attenuation, Digital Twin, Sensitivity, Compliance notes** do not reach the engineering report (Excel/PDF).
- **Dashboard doubles as engineering cockpit** with 15 components that should move to their respective modules.

### Recommended priority order

1. Add `dataVersion` to every station and every `lastCalcResult` (mechanical fix for object staleness).
2. Centralize invalidation: `markAllStale()` called from every write action.
3. In `updateDesignBasis`, also set `attenuationDirty = true`.
4. Add staleness banners to `PageGroundbed`, `PageCableResistance`, `PageValidation`, `PageCompliance`.
5. Auto-refresh digital twin on `station.dataVersion` change.
6. Replace all hardcoded fallbacks in `pdfGenerator` and `excelEngine` with live reads.
7. Add Attenuation + Digital Twin + Sensitivity sections to PDF/Excel reports.
8. Implement per-page `Validate Data` buttons per `MODULE_VALIDATION_DESIGN.md`.

---

## Compatibility

- **No formula changes.** `engine/modules/calculations.js`, `attenuationEngine.js`, `resistivityEngine.js` untouched.
- **No standards changes.** `engine/rules/rulesEngine.js`, `engine/modules/standardsValidationEngine.js` untouched.
- **No backend changes.** No Firestore migration, no IndexedDB migration.
- **Backward compatible.** All 27 existing `attenuationStore` tests still pass.

---

## Known issues (carried over from audit)

- Soil classification thresholds duplicated in 3 places.
- 100V TR ceiling duplicated in 3 places (`PageTRSizing`, `validation.js` Zod, `standardsValidationEngine`).
- Excel `anodeTailLengths` fixed at 20 (overflow risk for > 20 anodes).
- Excel export omits `coatingEfficiency`; import fills with `0.98`.
- `attenuationInput` write-on-render (useEffect) should become a selector.

See `BROKEN_LINK_ANALYSIS.md` and `STALE_DATA_ANALYSIS.md` for the complete list.

---

## Migration

None required for existing projects. The state machine in attenuation shows `STALE` for any project that hasn't been recalculated since the upgrade — this is the correct behavior and the user just needs to click `Run calculation`.
