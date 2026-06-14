# BROKEN LINK ANALYSIS

> **Companion to `MODULE_DEPENDENCY_MATRIX.md` and `STALE_DATA_ANALYSIS.md`.**
> This document enumerates every place where **a producer is updated but a dependent consumer is not invalidated** — i.e. silent cross-module drift.
> **No file modifications.** Every entry is sourced from a static read of the corresponding slice/page.

Each finding uses this severity rubric:

- **CRITICAL** — User sees wrong engineering numbers but the UI looks healthy.
- **HIGH** — User sees stale data with no warning, but data is recoverable with one click.
- **MEDIUM** — Stale data is partially visible, recovery requires visiting the right page.
- **LOW** — Cosmetic or recoverable by reload.

---

## 1. Cross-module stale data — full enumeration

### BL-01 — Soil resistivity edit does not invalidate current/groundbed/cable/TR/attenuation results

| | |
|---|---|
| **Producer** | `PageSoilResistivity` → `updateProject(p => { p.designBasis.soilResistivityOhmCm = ... })` |
| **Consumers affected** | `PageCurrentRequirement`, `PageGroundbed`, `PageCableResistance`, `PageTRSizing`, `AttenuationPage`, `PageBOM`, `PageReport`, `digitalTwin.healthScoreEngine`, `digitalTwin.riskEngine` |
| **What breaks** | I_req, R_G, R_c, V_min, attenuation α, BOM quantities, health score, risk level — all continue to use the previous ρ. |
| **Severity** | **CRITICAL** — soil ρ is the most invasive single input. |
| **Current mitigation** | None. `setNeedsRecalculation` is only called by `updateDesignBasis` (which goes through the design slice), not by `updateProject` (which is the slice used here). |
| **Recommended fix** | Route soil-resistivity writes through a new `updateSoilResistivity(value)` action that calls `setNeedsRecalculation()` after. |

### BL-02 — Pipeline segment edit does not invalidate downstream lastCalcResult

| | |
|---|---|
| **Producer** | `PagePipeline` → `updateSegment(stationId, segId, fields)` |
| **Consumers affected** | `PageCurrentRequirement` (I_req), `PageGroundbed` (activeLength, R_G), `PageCableResistance` (R_c), `PageTRSizing` (V_min), `AttenuationPage` (α, profile), BOM, Report, digitalTwin |
| **What breaks** | All numerical results stay at pre-edit values until the user re-runs `calculateStation`. |
| **Severity** | **CRITICAL** — this is the most frequent user action. |
| **Current mitigation** | `stationSlice.updateSegment` clears `station.lastCalcResult = null`. ✓ **but** no other slice notices. |
| **Net effect** | `lastCalcResult` is correctly nulled, but pages that re-render with `null` show "no data" — pages that re-render with **the previous computed value still in the `r` variable** show stale numbers. |
| **Recommended fix** | When `updateSegment` clears `lastCalcResult`, also flip `attenuationDirty = true` and emit a global "stale" event. All consumers must read `lastCalcResult` defensively (`r && r.computedAt > segmentUpdatedAt`). |

### BL-03 — Station-level edit (TR, groundbed, cables) does not invalidate attenuation

| | |
|---|---|
| **Producer** | `stationSlice.updateStation(stationId, updater)` |
| **Consumers affected** | Attenuation (M7 marks `attenuationDirty = true` ✓), but other pages — Cable, Groundbed, TR — read from `lastCalcResult` without re-render of the staleness banner. |
| **Severity** | HIGH |
| **Current mitigation** | `updateStation` sets `station.lastCalcResult = null` and `station.status = 'input_complete'`. |
| **Net effect** | Attenuation is now correctly marked stale. Pages without banners (Groundbed, Cable, Validation) still show the old numbers — but `lastCalcResult` is null on next navigation. |
| **Recommended fix** | Add a "module-level staleness" event so Groundbed and Cable can show their own banner. |

### BL-04 — TR voltage/current edit does not re-validate attenuation

| | |
|---|---|
| **Producer** | `PageTRSizing` → `updateStation(...)` modifying `tr.{ratedVoltage, ratedCurrent, backEMF, structureResistance}` |
| **Consumers affected** | Attenuation (drain point mv = `tr.ratedVoltage × 1000`), Validation, Report |
| **What breaks** | Attenuation result uses old TR voltage (now M7-mitigated). Validation runs `validateTRSizing` (engine) which is the *real* source of truth; the page UI shows current values. |
| **Severity** | HIGH for attenuation (now mitigated); MEDIUM for the rest. |
| **Recommended fix** | Already partially done in M7. Extend the same `attenuationDirty` pattern to validation. |

### BL-05 — Design Basis edit invalidates some pages but not attenuation

| | |
|---|---|
| **Producer** | `designSlice.updateDesignBasis` |
| **Affected** | All station `status` → `'needs_recalculation'` (✓), tank, vessel, `hasCalculationsMismatch` (✓). |
| **What breaks** | `attenuationDirty` is **not** set by this action. The attenuation page would still show CALCULATED state. |
| **Severity** | HIGH — design basis contains soil ρ, TR voltage, AC input, etc., all of which feed attenuation. |
| **Recommended fix** | In `updateDesignBasis`, after the existing invalidation block, call `state.attenuationDirty = true`. |

### BL-06 — Tank / Vessel parameter edit does not invalidate anything except itself

| | |
|---|---|
| **Producer** | `designSlice.updateTankParameters`, `updateVesselParameters` |
| **Affected** | `tank.status = 'needs_recalculation'` / `vessel.status` (✓). BOM, Report, Dashboard — read tank/vessel `lastCalcResult` and can show stale numbers. |
| **What breaks** | BOM and Report show stale tank/vessel data; Report export may succeed with stale data. |
| **Severity** | MEDIUM — tank and vessel are not on the primary pipeline; partial staleness is acceptable. |
| **Recommended fix** | Same `hasCalculationsMismatch = true` is already set. Dashboard can surface this. |

### BL-07 — Optimizer "Apply This Design" writes only 3 of 7 parameters

| | |
|---|---|
| **Producer** | `PageOptimizer.Apply Alternative` → `updateStation` setting `proposedAnodes, tr.ratedVoltage, tr.ratedCurrent` |
| **Consumers affected** | Self — the alternative was evaluated with **all** parameters set; only 3 are applied, leaving the station in an inconsistent state. |
| **What breaks** | Next `calculateStation` re-runs with a partial application — may produce a *different* result than the alternative's snapshot. |
| **Severity** | CRITICAL for Optimizer — the user thinks they applied the alternative, but actually they only copied 3 numbers. |
| **Recommended fix** | The `applyAlternative` action must write all `parameters` of the alternative (`proposedAnodes, tr.ratedVoltage, tr.ratedCurrent, groundbed.{numHoles, startDepthM, ...}` etc.) and then call `calculateStation`. |

### BL-08 — Compliance manual notes persist across data changes

| | |
|---|---|
| **Producer** | `PageCompliance` → `updateProject({ complianceNotes: { [stationId]: { [ruleId]: 'compliant by exception' } } })` |
| **What breaks** | Notes written 6 months ago remain valid against current data even if the underlying data has changed. The Compliance page shows them as "compliant" without re-evaluation. |
| **Severity** | HIGH — compliance is a regulatory artifact. |
| **Recommended fix** | Stamp each note with `stationInputSnapshot` (inputAudit) at write time. On read, compare the current `inputAudit` with the stamped one; show a "Note may be stale" badge if they differ. |

### BL-09 — Scenario persists stale `result` when station changes

| | |
|---|---|
| **Producer** | `scenarioSlice.saveScenario` stores `result` (CalcResult + checks + insights) at scenario-creation time. |
| **What breaks** | If the engineer changes a station input, the scenario's cached result is now stale — but the UI shows the scenario "as computed" with the old numbers. |
| **Severity** | MEDIUM — scenarios are explicitly snapshots, so this may be intentional. **But the UI does not flag them as snapshots vs. live.** |
| **Recommended fix** | Add a `resultComputedAt` timestamp on each scenario; show "computed N days ago" badge; provide "Recompute" action. |

### BL-10 — Digital Twin `designRef` frozen at commission time

| | |
|---|---|
| **Producer** | `assetFactory.makeStationAssets` captures a `designRef` at asset creation. |
| **What breaks** | If any code path preserves the asset (rather than discarding-and-rebuilding the registry on each `refreshDigitalTwinForProject`), the asset's `designRef` will silently drift from current engineering reality. |
| **Severity** | MEDIUM (currently masked) → CRITICAL if a future refactor preserves assets. |
| **Recommended fix** | Add a `dataVersion` counter to assets; `commissionStationAssets` must overwrite (not merge) any existing entry. |

### BL-11 — Health / Risk scores silently zero on missing fields

| | |
|---|---|
| **Producer** | `healthScoreEngine` and `riskEngine` |
| **What breaks** | If a calc-engine rename renames `groundbedResistanceOhm` to `groundbedResOhm`, the health engine returns score=0 with label "R_G unavailable" — no error, no warning. The dashboard then shows a "Critical" station that is actually fine. |
| **Severity** | HIGH — silent failure of a critical monitoring function. |
| **Recommended fix** | Add a `fieldNameContract` check: if a known-required field is `undefined` and the calculation supposedly succeeded, log a warning and surface a "Digital Twin: contract violation" alert. |

### BL-12 — Anode spec duplication between `constants/ANODE_SPECS` and inline vessel table

| | |
|---|---|
| **Producer A** | `constants/index.js::ANODE_SPECS` (5 types) |
| **Producer B** | `store/slices/calculationSlice.js` (inline vessel `ANODE_SPECS` for `al_zn_in, zinc_high_pure, magnesium_h1`) |
| **What breaks** | Adding a new anode type to the global `ANODE_SPECS` does not add it to the vessel calculation; conversely editing the inline table does not update BOM/Reporting. |
| **Severity** | HIGH — two sources of truth. |
| **Recommended fix** | Remove the inline vessel table; import from `constants/ANODE_SPECS`. |

### BL-13 — Soil classification thresholds duplicated in two places

| | |
|---|---|
| **Producer A** | `constants/index.js::getSoilClassification` (uses `THRESHOLDS.HIGH_SOIL_RESISTIVITY, VERY_HIGH_SOIL_RESISTIVITY`) |
| **Producer B** | `PageSoilResistivity.classifySoil()` (hardcoded `1000/5000/20000 Ω·cm`) |
| **Producer C** | `PagePipeline.getSoilClassification()` (also hardcoded) |
| **What breaks** | Editing the global thresholds does not update the page-level soil badges. The user sees one classification in Soil page, another in Pipeline. |
| **Severity** | MEDIUM — visually inconsistent. |
| **Recommended fix** | Use a single `getSoilClassification(ρ)` from `constants/` everywhere. |

### BL-14 — AC input label hardcoded in TR Sizing and Report

| | |
|---|---|
| **Producer A** | `project.designBasis.{acInputVoltageV, acInputPhase}` |
| **Producer B** | `PageTRSizing` displays `"@ ${acInputVoltageV}V/${acInputPhase}Φ"` (live) — OK |
| **Producer C** | `PageReport` displays literal `"@ 480V/3Φ"` — WRONG if acInputVoltageV was changed |
| **Severity** | HIGH — report will lie. |
| **Recommended fix** | Replace literal in `pdfGenerator` and `excelEngine` with a templated label fed from `project.designBasis`. |

### BL-15 — Back EMF source: `designBasis.backEmfV` vs `station.tr.backEMF`

| | |
|---|---|
| **Producer A** | `designBasis.backEmfV` |
| **Producer B** | `station.tr.backEMF` (per-station) |
| **What breaks** | `PageTRSizing` uses `designBasis.backEmfV || tr.backEMF` — picks whichever is truthy. Engine `calcTRCircuit` uses `backEMFVolts` passed in. The two can disagree. |
| **Severity** | MEDIUM — usually they agree, but inconsistent override paths create ambiguity. |
| **Recommended fix** | Establish a single source of truth: per-station `tr.backEMF` is the engineering fact; `designBasis.backEmfV` is the *default* used at station creation. Use `tr.backEMF` everywhere once a station exists. |

### BL-16 — TR efficiency not used in AC kVA computation on TR Sizing page

| | |
|---|---|
| **Producer A** | `project.designBasis.trEfficiencyPct` (80% per default) |
| **Producer B** | `THRESHOLDS.TR_EFFICIENCY` (0.8 in the engine) |
| **What breaks** | `PageTRSizing` computes AC kVA but appears to use the engine default rather than the design basis value. Editing `trEfficiencyPct` in Project Setup may have no effect on the displayed kVA. |
| **Severity** | HIGH — user-facing data does not respond to a documented design basis field. |
| **Recommended fix** | Verify in the page; if confirmed, route through `getActiveStandard().trSizing.efficiency` (which already exists). |

### BL-17 — Default anode type cascades to all stations without warning

| | |
|---|---|
| **Producer** | `PageProjectSetup` "Default Anode Type" control → mutates `anodeSpec` on every station |
| **What breaks** | No confirmation, no dirty flag, no recompute. If the user changes the default from HSCI_TA4 to HSCI_TA3, every existing station now has TA3 specs, but their `lastCalcResult` is still based on TA4. |
| **Severity** | CRITICAL — silently invalidates every cached calc result. |
| **Recommended fix** | Add a confirmation dialog: "This will update the anode spec on N stations and invalidate all cached results. Continue?" |

### BL-18 — Revision label array capped at G

| | |
|---|---|
| **Producer** | `workflowSlice.createRevision` uses `['A','B','C','D','E','F','G']` then falls through to `String(proj.revisions.length)`. |
| **What breaks** | The 8th revision is labelled `Revision 8` instead of `H`; sort order is broken (`9, 10, 11` < `A, B`). |
| **Severity** | LOW (cosmetic). |
| **Recommended fix** | Use a generator or compute the next letter from the existing count. |

### BL-19 — PDF page count is pre-computed

| | |
|---|---|
| **Producer** | `pdfGenerator` writes `2 + project.stations.length * 2` pages. |
| **What breaks** | If a station has no BOM, or `!r`, the actual number of pages is fewer. The header shows `Page X of Y` where Y is wrong. |
| **Severity** | LOW (cosmetic). |
| **Recommended fix** | Use a real `doc.internal.getNumberOfPages()` after the document is built. |

### BL-20 — Excel `Summary` sheet detection only

| | |
|---|---|
| **Producer** | `excelEngine.importFromExcel` only matches a sheet literally named `Summary`; anything else falls through to `parseGenericFormat` which always errors. |
| **What breaks** | A user importing a project from a third-party tool that calls the sheet `Overview` or `Index` gets an error. |
| **Severity** | MEDIUM. |
| **Recommended fix** | Broaden the sheet-name detection or make the user pick a sheet in a wizard. |

### BL-21 — Excel import `anodeTailLengths` is fixed-size `Array(20).fill(30)`

| | |
|---|---|
| **Producer** | `makeDefaultImportStation` hardcodes 20 anodes' worth of tail lengths at 30 m each. |
| **What breaks** | A station with 25 anodes will read `undefined` for indices 20–24, or `30` if the runtime fills — silent wrong calculation. |
| **Severity** | HIGH. |
| **Recommended fix** | Size the array to `proposedAnodes` and let the user fill in real lengths. |

### BL-22 — Excel export omits `coatingEfficiency`; import fills it with `0.98`

| | |
|---|---|
| **Producer** | `excelEngine.exportProject` does not write `coatingEfficiency`; `parseStationSheet` sets it to `0.98` on import. |
| **What breaks** | Round-trip (export → re-import) silently changes every segment's `coatingEfficiency` to `0.98`, even if the original was `0.99` or `0.95`. |
| **Severity** | HIGH. |
| **Recommended fix** | Add `coatingEfficiency` to the export columns. |

### BL-23 — Excel export/import drift on `groundbed.type` values

| | |
|---|---|
| **Producer A** | `constants.DESIGN_MODES` keys: `'shallow_vertical'`, `'distributed'`, `'deepwell'`, etc. |
| **Producer B** | `excelEngine.parseStationSheet.detectGroundbedType` returns `'deepwell' | 'shallow_vertical' | 'distributed'` |
| **What breaks** | If `constants.DESIGN_MODES` adds a new mode (e.g. `'horizontal'`), neither the importer nor the exporter knows about it. |
| **Severity** | MEDIUM. |
| **Recommended fix** | Drive `detectGroundbedType` from `DESIGN_MODES` keys. |

### BL-24 — `attenuationInput` write is write-on-render, not on input-change

| | |
|---|---|
| **Producer** | `AttenuationPage` useEffect: every time the derived `input` differs from stored, push to store. |
| **What breaks** | Other subscribers to `attenuationInput` re-render on every project change, even when they did not request attenuation data. Risk of feedback loops if a subscriber also writes `attenuationInput`. |
| **Severity** | LOW (currently safe because no other writer exists). |
| **Recommended fix** | Move derivation to a selector (`getAttenuationInput(project)`) instead of a write. |

### BL-25 — PageValidation `SpatialView` re-runs `runStationCalculations` per cell

| | |
|---|---|
| **Producer** | `PageValidation` clones the station, perturbs, calls `runStationCalculations` per scenario cell. |
| **What breaks** | Each cell uses the **current** station values, not the values at the time of the last `calculateStation`. If the user edits a station field in another tab, the SpatialView results change without warning. |
| **Severity** | MEDIUM. |
| **Recommended fix** | Either cache SpatialView results or stamp them with a "live" badge. |

### BL-26 — `PageProjectSetup` writes cascade to **all** stations silently

| | |
|---|---|
| **Producer** | `PageProjectSetup` "Default Anode Type" → iterates every station. |
| **What breaks** | Same as BL-17. |
| **Severity** | CRITICAL. |
| **Recommended fix** | Same as BL-17. |

### BL-27 — Attenuation state is project-level; per-station attenuation is not modeled

| | |
|---|---|
| **Producer** | `attenuationSlice` is a single global object, not per-station. |
| **What breaks** | If a project has 3 stations, the attenuation page treats them as a single network; there is no way to run attenuation for "station 2 only". |
| **Severity** | MEDIUM — feature gap, not a bug. |
| **Recommended fix** | Either make attenuation project-wide (and document) or split per station. |

### BL-28 — `PageCompliance` shows `complianceStatus` persisted from prior session without timestamp

| | |
|---|---|
| **Producer** | `project.complianceStatus` is a plain `{stationId: {ruleId: status}}` object. |
| **What breaks** | A status set 12 months ago shows the same way as one set today. |
| **Severity** | MEDIUM. |
| **Recommended fix** | Store `{status, setAt, setBy, inputSnapshotId}` and warn on stale. |

### BL-29 — Excel import does not preserve `lastCalcResult`

| | |
|---|---|
| **Producer** | `parseImportedFile` discards `lastCalcResult` (correctly — calc results are tied to the engine version) but does not warn the user. |
| **What breaks** | Imported project looks "empty" until the user runs `Calculate All`. |
| **Severity** | MEDIUM. |
| **Recommended fix** | Show a banner on import: "Imported project has no cached results. Run Calculate All to populate." |

### BL-30 — `getInputsForModule` in registry is read but not used by consumers

| | |
|---|---|
| **Producer** | `engine/inputLinkRegistry.js` exports `getInputsForModule(moduleName)`. |
| **What breaks** | The function exists but no page renders "This page consumes X inputs". The dependency metadata is unused. |
| **Severity** | LOW. |
| **Recommended fix** | Add an "Inputs consumed" card to each page that uses this helper. |

---

## 2. Hidden single-source-of-truth violations

| ID | Field | Duplicated in | Risk |
|---|---|---|---|
| HV-01 | Soil classification thresholds | `constants.getSoilClassification`, `PageSoilResistivity.classifySoil`, `PagePipeline.getSoilClassification` | Visual inconsistency |
| HV-02 | AC input voltage/phase | `factory defaults`, `pdfGenerator` literal | Wrong header |
| HV-03 | Back EMF | `designBasis.backEmfV`, `station.tr.backEMF`, `RESISTIVITY_CONSTANTS.BACK_EMF_V` | Inconsistent source |
| HV-04 | TR efficiency | `designBasis.trEfficiencyPct`, `THRESHOLDS.TR_EFFICIENCY` | User change ignored |
| HV-05 | Spare factor | `THRESHOLDS.SPARE_FACTOR = 1.3`, `calculationSlice` inline `* 1.3`, `PageCurrentRequirement` fallback `1.3` | Drift on change |
| HV-06 | Anode spec table | `constants.ANODE_SPECS`, `calculationSlice` inline vessel table | New type not in vessel |
| HV-07 | Surface area π×D×L | `PagePipeline` preview, `PageCurrentRequirement` breakdown, `calculations.calcSurfaceArea` | UI shows different number than engine |
| HV-08 | 100V TR ceiling | `PageTRSizing` `Math.min(100, v)`, `validation.js` Zod max 100, `standardsValidationEngine` rule SAES-500-6.8.4 | Three places to keep in sync |
| HV-09 | 70%/90% circuit limits | `THRESHOLDS`, `calculationTraceEngine` defaults | Drift |
| HV-10 | 25-year design life default | `factory`, `RESISTIVITY_CONSTANTS`, `scenarioRunner` fallback, `PageCurrentRequirement` fallback, `PageSensitivity` fallback | Five places |
| HV-11 | 0.85 utilization factor | `bomEngine`, `calculationTraceEngine`, `PageGroundbed` breakdown | Drift |
| HV-12 | Soil resistivity 1000 Ω·cm default | `factory` 361, `inputLinkRegistry` default 1000, `THRESHOLDS` `0.7/0.9` circuitRes, attenuation reference 1000 | Inconsistent default |
| HV-13 | BOM category labels | `PageBOM` hardcoded `ANODE/CABLE/TR/COKE/BACKFILL/OTHER` | Not in `bomEngine` |
| HV-14 | Health factor weights | `healthScoreEngine` only | Should be in `constants` |
| HV-15 | Risk matrix breakpoints | `riskEngine` only | Should be in `constants` |
| HV-16 | Standard code fallbacks | `pdfGenerator` literals | Should be from `getActiveStandard().standardsReferences` |

---

## 3. Multi-station sync risks

| ID | Description | Severity |
|---|---|---|
| MS-01 | "Calculate All" runs `calculateAllStations` but only sets `attenuationDirty` if a station is edited later, not when bulk-calc completes | MEDIUM |
| MS-02 | Adding a station via `addStation` does not call `calculateAllStations`; new station starts in `draft` with no result | LOW (expected) |
| MS-03 | `removeStation` keeps a single project invariant (`projects.length >= 1`) but does not cleanup the corresponding attenuation station entry if it was added via `addAttenuationStation` | HIGH (drift) |
| MS-04 | `duplicateProject` clears `lastCalcResult` on every duplicated station but not on `attenuationInput/Result` of the duplicate | MEDIUM |
| MS-05 | `switchProject` clears `attenuationInput/Result` correctly (✓) but does not reset `digitalTwin` (not persisted, so it just regenerates) | LOW |
| MS-06 | `restoreRevision` reverts `attenuationInput/Result` to the snapshot's state (✓) but the `digitalTwin` is not in the snapshot, so it stays at whatever was last commissioned | HIGH (drift) |

---

## 4. Calculation-engine-to-store contracts at risk

| Field name | Consumers | Renamed impact |
|---|---|---|
| `groundbedResistanceOhm` | `healthScoreEngine`, `riskEngine`, `PageTRSizing`, `PageCableResistance`, `pdfGenerator`, `excelEngine`, `inputLinkRegistry` | Silent zero everywhere |
| `trMinVoltage` | `healthScoreEngine`, `riskEngine`, `engineeringAdvisor`, `pdfGenerator`, `excelEngine` | Silent zero |
| `designLifeYears` | `healthScoreEngine`, `riskEngine`, `pdfGenerator`, `excelEngine` | Silent zero |
| `totalCableResOhm` | `PageCableResistance`, `PageTRSizing`, `pdfGenerator`, `excelEngine` | Stale cable diagnostics |
| `backEMFResistanceOhm` | `PageTRSizing`, `pdfGenerator` | Stale TR row |
| `positiveCableVoltageDrop` / `negativeCableVoltageDrop` | `healthScoreEngine`, `pdfGenerator` | Stale health + report |
| `totalCurrentRequired` | `assetFactory`, `riskEngine` | Stale asset + risk |
| `allChecksPassed` | `PageValidation`, `excelEngine`, `pdfGenerator` | Stale validation summary |
| `bom` | `PageBOM`, `pdfGenerator`, `excelEngine` | Stale BOM |
| `cokeBagsBase` / `cokeBagsWithContingency` | `pdfGenerator`, `excelEngine`, `bomEngine` | Stale BOM |
| `acInputKVA` / `acInputCurrentA` | `pdfGenerator`, `excelEngine` | Stale TR section |
| `maxAllowableGroundbedRes` | `PageCableResistance` diagnostics, `pdfGenerator` | Stale diagnostics |
| `pipelineSegments[0].coatingEfficiency` | `assetFactory` | Stale asset |
| `pipelineSegments[0].opTempC` | `assetFactory`, `newAdvisorRules` | Stale asset + advisor |
| `station.tr.{ratedVoltage, ratedCurrent, backEMF, structureResistance}` | `standardsValidationEngine`, `pdfGenerator`, `excelEngine`, `assetFactory` | Stale everywhere |

These field-name contracts have no automated check. A type system (Zod) is present for **input** validation but not for **output** consistency.

---

## 5. Recommendations summary

The following changes would close the broken-link surface:

1. **Centralize all staleness:** Replace ad-hoc `station.status = 'needs_recalculation'` with a project-wide `dataVersion` counter on every station. Every read path checks `r.dataVersion === station.dataVersion` to decide whether to show stale data.
2. **Route all writes through a single coordinator:** `updateDesignBasis`, `updateSoilResistivity`, `updateStation`, `updateSegment` should all call a `markAllStale()` helper that flips every dependent flag (including `attenuationDirty`).
3. **Apply all alternative parameters in Optimizer** (not just 3 of 7).
4. **Eliminate `attenuationInput` write-on-render** in favor of a selector.
5. **Single source of truth for every duplicated constant** (Section 2).
6. **Timestamped compliance notes** (BL-08).
7. **Templated AC input label** in PDF/Excel (BL-14).
8. **Excel export includes `coatingEfficiency`** (BL-22).
9. **`anodeTailLengths` sized to `proposedAnodes`** (BL-21).
10. **Field-name contract test** for `lastCalcResult` (Section 4).
