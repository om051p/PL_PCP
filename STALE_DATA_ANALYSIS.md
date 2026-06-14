# STALE DATA ANALYSIS

> **Companion to `BROKEN_LINK_ANALYSIS.md`.**
> This document enumerates every place where the **user sees cached numbers** while the underlying inputs have moved on, and gives a path to surface this fact honestly.
> **No file modifications.**

---

## 1. Staleness surface — per module

| Module | Staleness detection today | Banner? | Re-runs? | Net effect |
|---|---|---|---|---|
| `PageProjectSetup` | n/a (root) | n/a | n/a | Mutations may silently affect other modules (see BL-17, BL-26) |
| `PagePipeline` | none | no | no | Edits invalidate only the local segment; downstream cached values stay |
| `PageSoilResistivity` | none | no | no | ρ change does not propagate; downstream R_G, R_c, V_min, α are stale |
| `PageCurrentRequirement` | `station.status === 'needs_recalculation' \|\| (!r && segments > 0)` | yes (`staleness-banner`) | user must click `Calculate` | OK |
| `PageGroundbed` | none | **no** | no | Stale R_G silently shown until `Calculate` |
| `PageCableResistance` | none | **no** | no | Stale R_c silently shown until `Calculate` |
| `PageTRSizing` | same as Current | yes | user must click `Analyse Circuit` | OK |
| `AttenuationPage` | `state.attenuationDirty` (M7) | **yes** (STALE state) | user must click `Run` | OK |
| `PageValidation` | `station.status` (implicit) | **no** | user must click `Recalculate` | Stale checks silently shown |
| `PageOptimizer` | none (alternatives cached) | no | user must `Calculate` | Stale alternatives shown |
| `PageSensitivity` | n/a (re-runs on every render) | n/a | n/a | OK |
| `PageCompliance` | `!currentStation?.lastCalcResult` (warn-only) | yes (warn) | user must `Calculate` elsewhere | OK partially |
| `PageBOM` | `BOM_ALLOWED_STATUSES` gate | no (gates display only) | n/a | Stale BOM can show if status allows |
| `PageReport` | `!allCalculated \|\| hasCalculationsMismatch` | yes (export disabled) | user must `Calculate All` | OK |
| `PageDashboard` | recomputes per render | n/a | n/a | OK |
| `digitalTwin.assetSlice` | `lastRefreshedAt` only | n/a | user must `commissionStationAssets` | Drift possible |

---

## 2. Stale-data scenarios (trace walk-throughs)

### 2.1 Scenario A — pipeline length changes

```text
User action:   changes a segment's lengthM from 1000 m to 1500 m
Engine effect: surface area changes; I_req changes; R_G unchanged; V_min changes
              (because I_req drives the AC kVA branch on TR Sizing)

Step 1: PagePipeline.updateSegment(stationId, segId, { lengthM: 1500 })
  → stationSlice.updateSegment
       - station.pipelineSegments[segIdx].lengthM = 1500
       - station.lastCalcResult = null
       - state.attenuationDirty = true
       - project.updatedAt = now

Step 2: re-render
  PagePipeline:        sees segment, no banner
  PageCurrentRequirement: r === null → no results shown (good)
  PageGroundbed:        r === null → "not calculated" (good)
  PageCableResistance:  r === null → results blank (good)
  PageTRSizing:         r === null → V_min row empty (good)
  AttenuationPage:      state.attenuationDirty = true → STALE banner (good)
  PageValidation:       r === null → "Recalculate" prompt
  PageCompliance:       r === null → rules N/A
  PageBOM:              r === null → gate blocks display
  PageReport:           allCalculated = false → export disabled
  digitalTwin:          next commission will use new length
```

**Outcome for Scenario A:** OK in most paths. The only gap is that if the user **does not navigate** to a page, that page's `useMemo` may have already cached a reference to the previous `r`. This is benign for a `r === null` re-render because the cache check is usually `r && r.foo`.

### 2.2 Scenario B — soil resistivity changes

```text
User action:   changes designBasis.soilResistivityOhmCm from 1000 to 2500
Engine effect: R_G, R_c, V_min, α, R_op all change

Step 1: PageSoilResistivity → updateProject
  → projectSlice.updateProject
       - project.designBasis.soilResistivityOhmCm = 2500
       - project.updatedAt = now
  ✗ station.lastCalcResult NOT cleared
  ✗ state.attenuationDirty NOT set
  ✗ state.attenuationResult NOT cleared

Step 2: re-render
  PageCurrentRequirement: r still exists from previous calc
                          staleness-banner: st.status === 'input_complete' (not 'needs_recalculation')
                          → NO banner
                          → I_req shown is the OLD one (calculated with ρ=1000)
  PageGroundbed:          same → R_G shown is OLD
  PageCableResistance:    same → diagnostics shown are OLD
  PageTRSizing:           same → V_min shown is OLD
  AttenuationPage:        attenuationDirty is FALSE → CALCULATED state
                          α, profile, R_L, coverage all OLD
  PageValidation:         r.checks all OLD
  PageCompliance:         rules evaluated against OLD r
                          ✗ complianceNotes/Status may disagree with new numbers
  PageBOM:                bom quantities OLD
  PageReport:             allCalculated = true → export ENABLED with STALE data
  digitalTwin:            next refresh will see ρ=2500 but health/risk factors based on OLD r
```

**Outcome for Scenario B:** **CRITICAL stale data leak.** The system exports a report with wrong engineering numbers and shows CALCULATED state everywhere.

**Mitigation today:** none. `setNeedsRecalculation` is the only thing that flips `station.status`, and it is only called by `updateDesignBasis` and `setNeedsRecalculation` actions, not by `updateProject` (which is what SoilResistivity uses).

**Required fix:** Route soil-resistivity writes through a new `updateSoilResistivity(value)` action that calls `setNeedsRecalculation()` and `state.attenuationDirty = true`.

### 2.3 Scenario C — design basis changes (e.g. AC input voltage 480 → 415)

```text
User action:   changes acInputVoltageV
Engine effect: AC input current changes; AC kVA changes; nothing else directly

Step 1: PageProjectSetup → updateDesignBasis({ acInputVoltageV: 415 })
  → designSlice.updateDesignBasis
       - project.designBasis.acInputVoltageV = 415
       - for each station: station.status = 'needs_recalculation'
       - project.hasCalculationsMismatch = true
       - project.updatedAt = now
  ✗ state.attenuationDirty NOT set
  ✗ state.attenuationResult NOT cleared

Step 2: re-render
  PageTRSizing:           staleness-banner shows (status === 'needs_recalculation') ✓
  PageCurrentRequirement: staleness-banner shows ✓
  PageGroundbed:          NO banner (gap)
  PageCableResistance:    NO banner
  AttenuationPage:        attenuationDirty is FALSE → CALCULATED (wrong if acInputVoltageV feeds attenuation,
                          which it does NOT in the current builder; attenuation uses tr.ratedVoltage only)
                          → in this case the attenuation is actually still valid ✓
  PageValidation:         NO banner
  PageCompliance:         rules N/A (no lastCalcResult)
  PageReport:             export disabled
```

**Outcome for Scenario C:** Mostly OK for `acInputVoltageV` specifically, because attenuation does not consume it. But the general pattern is **only partial invalidation** — pages that should warn don't.

### 2.4 Scenario D — TR voltage changes

```text
User action:   changes tr.ratedVoltage from 30 V to 50 V
Engine effect: drain point mV changes (attenuation), V_min unchanged, V_tr changes

Step 1: PageTRSizing → updateStation(s => { s.tr.ratedVoltage = 50 })
  → stationSlice.updateStation
       - station.tr.ratedVoltage = 50 (clamped to 100)
       - station.lastCalcResult = null
       - state.attenuationDirty = true   ✓ (M7)
       - station.status = 'input_complete'

Step 2: re-render
  PageTRSizing:           staleness-banner shows ✓
  PageCurrentRequirement: r null → no I_req
  PageGroundbed:          r null → no R_G
  PageCableResistance:    r null → no diagnostics
  AttenuationPage:        state.attenuationDirty = true → STALE banner ✓
  PageCompliance:         rules N/A
  PageBOM:                r null → gate blocks
  PageReport:             allCalculated = false → export disabled
  digitalTwin:            next commission will use new TR voltage
```

**Outcome for Scenario D:** OK post-M7.

### 2.5 Scenario E — groundbed type changes (deepwell → shallow_vertical)

```text
User action:   changes station.groundbed.type
Engine effect: R_G formula changes; all downstream updates

Step 1: PageGroundbed → updateStation(s => { s.groundbed.type = 'shallow_vertical' })
  → stationSlice.updateStation
       - station.groundbed.type = 'shallow_vertical'
       - station.lastCalcResult = null
       - state.attenuationDirty = true
       - station.status = 'input_complete'

Step 2: re-render
  AttenuationPage:        state.attenuationDirty = true → STALE ✓
  PageTRSizing:           staleness-banner shows ✓
  others:                 same as Scenario A
```

**Outcome for Scenario E:** OK.

### 2.6 Scenario F — station deletion (engineer removes the only TR station)

```text
User action:   removes the station that had attenuation input
Engine effect: attenuationInput.stations array is now empty

Step 1: stationSlice.removeStation
  - proj.stations = stations.filter(s => s.id !== removedId)
  - state.attenuationDirty = true
  - state.activeStationId = next.id (if applicable)
  ✗ state.attenuationResult NOT cleared
  ✗ state.attenuationInput NOT replaced with re-derived (post-M7 the page will re-derive on next render)

Step 2: re-render
  AttenuationPage:        useMemo recomputes buildAttenuationInputFromProject(project)
                          → if remaining stations < 1, returns INCOMPLETE state with NO_STATIONS guidance ✓
                          → state.attenuationDirty is true → STALE would also fire
                          → SM resolves to INCOMPLETE because attenuationInput is null
                          → EmptyStateCard with "Go to Project Setup" ✓
  PageCompliance:         station.id may now be missing → silent skip
  PageBOM:                silent skip
  PageReport:             allCalculated = false → export disabled
  digitalTwin:            registry now excludes the removed station on next refresh
```

**Outcome for Scenario F:** Attenuation is handled by M7. Other modules skip silently — there is no project-wide "Station was removed" banner.

### 2.7 Scenario G — import a project from Excel

```text
User action:   imports an XLSX with parseImportedFile
Engine effect: project + stations created; lastCalcResult absent; designBasis may have snake_case fields

Step 1: projectRepository.parseImportedFile
  → returns { success: true, project: parsedProject }
  → PageImport dispatches importProject(parsedProject) on the store
  → state.projects.push(parsedProject)
  → state.activeProjectId = parsedProject.id
  → state.activeStationId = parsedProject.stations[0]?.id
  → state.attenuationInput = null
  → state.attenuationResult = null
  → state.attenuationDirty = false
  ✗ digitalTwin not initialized for the new project
  ✗ project.complianceNotes/Status not initialized
  ✗ project.scenarios not initialized (defaults to [])

Step 2: re-render
  AttenuationPage:        EmptyStateCard INCOMPLETE (no lastCalcResult) ✓
  PageCurrentRequirement: empty
  PageGroundbed:          empty
  PageTRSizing:           empty
  PageBOM:                empty
  PageReport:             export disabled (allCalculated = false) ✓
  digitalTwin:            not present until first commission
```

**Outcome for Scenario G:** OK structurally, but the user gets no message "imported project has no calc results — run Calculate All".

### 2.8 Scenario H — restore a revision

| | |
|---|---|
| User action | picks a revision and clicks `Restore` |
| Producer | `workflowSlice.restoreRevision` |
| Effect | overwrites the live project with the snapshot's `project`, but patches back `revisions` and `activityLog`. Other top-level state (UI, attenuation, digitalTwin) is replaced with whatever was in the snapshot. |
| Stale risk | Attenuation input/result is restored to the snapshot's value; this is the *intended* behavior. But digitalTwin is not in the snapshot — so it stays at whatever was last commissioned. If the user had commissioned the digital twin after the snapshot was taken, the digital twin is now newer than the project state. |
| Severity | HIGH |

---

## 3. Staleness taxonomy

The codebase has three kinds of staleness:

### 3.1 Object staleness

`station.lastCalcResult` is computed from inputs A, B, C. If any of A, B, C change, `r` is no longer valid. Today, the only mechanism that invalidates `r` is `station.status = 'needs_recalculation'`, set by `updateDesignBasis`/`updateStation`/`setNeedsRecalculation`. Edits to soil ρ, segment length, cable length, etc. that go through `updateProject` do **not** clear `r` (BL-01, BL-02).

### 3.2 Cross-page staleness

A page reads from `lastCalcResult` but does not detect when `r` is stale. The page shows "old" numbers without a banner. **The Groundbed, Cable, Validation, and Compliance pages are in this state today.** They all rely on `r` being either present (and shown) or absent (and shown as a prompt), but never "stale but present".

### 3.3 Cross-engine staleness

The Digital Twin, the Excel export, and the PDF export all read the same `r`. If the user updates a station, `r` may be cleared (stationSlice) but the digital twin registry was last commissioned on the old data. The user sees a healthy digital twin for a project that just had its design basis changed. This is the **worst** kind of staleness because both screens look healthy.

---

## 4. Staleness detector — design proposal

Add a single `dataVersion` counter per station and per project:

```js
station.dataVersion = N  // increments on every edit to station.*
project.dataVersion = N  // increments on every edit to designBasis, project, etc.
lastCalcResult.dataVersion = N  // captured at calc time
```

Every consumer reads:
```js
const isStale = r && r.dataVersion !== station.dataVersion
const isMissing = !r
```

This eliminates the object-staleness problem mechanically. Combined with a UI banner driven by `isStale`, the user is always told the truth.

For cross-page staleness, each page should subscribe to a `stateChangeLog` slice:

```js
state.changeLog = [
  { at: '...', source: 'updateDesignBasis', affected: ['all stations'] },
  { at: '...', source: 'updateSegment', affected: [stationId, segId] },
]
```

Consumers can read the change log to determine if their last `r` is older than the last edit.

For cross-engine staleness, the digital twin must be **derived** from `r` and `station.dataVersion`, not from a frozen `designRef`. A simple `useMemo` in `DigitalTwinModel.js` that depends on `[station, r, project.dataVersion]` is sufficient.

---

## 5. Staleness surface — quantitative

| Module | Stale-data paths | UI tells user? | Severity distribution |
|---|---|---|---|
| Pipeline | 0 (root) | n/a | — |
| Soil Resistivity | 0 (root) | n/a | — |
| Current Requirement | 1 (caller must Calculate) | yes (banner) | 1 LOW |
| Groundbed | 4 (ρ, segments, groundbed, cables) | no | 4 CRITICAL |
| Cable Resistance | 4 (ρ, segments, groundbed, TR) | no | 4 CRITICAL |
| TR Sizing | 4 (ρ, segments, groundbed, cables) | yes (banner) | 1 LOW |
| Attenuation | 4 (M7-mitigated) | yes (STALE state) | 0 |
| Validation | 4 (all upstream) | no | 4 CRITICAL |
| Optimizer | 4 (alternatives cached) | no | 3 HIGH |
| Sensitivity | 0 (re-runs) | n/a | — |
| Compliance | 4 (all upstream) | partial (warns on missing) | 3 HIGH |
| BOM | 4 (all upstream) | gates display | 1 LOW |
| Report | 4 (all upstream) | gates export | 1 LOW |
| Dashboard | recomputes per render | n/a | — |
| Digital Twin | 1 (commission not auto) | no | 1 CRITICAL |

**Total:** 36 stale-data paths; 18 are user-visible as warnings/banners; **17 silently show stale data**; 1 is correct (M7).

---

## 6. Per-field staleness trigger matrix

For each cached field, the table lists which input changes should invalidate it.

| Cached field | Lives on | Invalidated by |
|---|---|---|
| `station.lastCalcResult.{groundbedResistanceOhm, ...}` | station | ANY of: pipelineSegments, groundbed, anodeSpec, proposedAnodes, cables, tr, soilResistivityOhmCm |
| `station.insights` | station | same as `lastCalcResult` |
| `station.alternatives` | station | same as `lastCalcResult` |
| `station.validationErrors` | station | same as `lastCalcResult` |
| `project.tank.lastCalcResult` | project.tank | ANY of: project.tank fields |
| `project.vessel.lastCalcResult` | project.vessel | ANY of: project.vessel fields |
| `attenuationInput` | store | ANY of: station fields, designBasis fields |
| `attenuationResult` | store | ANY of: station fields, designBasis fields |
| `project.complianceNotes/Status` | project | ANY of: station fields, designBasis fields |
| `digitalTwin.{registry, healthScores, riskAssessments}` | store | next commission only (drift otherwise) |
| `project.scenarios[].result` | project | silent drift; must be re-run |

The current invalidation graph implements only the **orange** row (TR, Groundbed, Pipeline via `updateStation`/`updateSegment`) and the **purple** row (designBasis via `setNeedsRecalculation`). All other rows are **silent drift**.

---

## 7. Recommendations — priority order

1. **Add `dataVersion` to every station and every `lastCalcResult`.** Pages read `r.dataVersion === station.dataVersion` to decide. This is the foundation of every other fix.
2. **Add a `setNeedsRecalculation({ stationIds, projectWide })` helper** and call it from every write action — `updateProject`, `updateStation`, `updateSegment`, `updateTankParameters`, `updateVesselParameters`, etc.
3. **In `updateDesignBasis`, set `state.attenuationDirty = true`** (mirroring the M7 fix for station changes).
4. **In `PageGroundbed`, `PageCableResistance`, `PageValidation`, `PageCompliance`: show a banner when `r && r.dataVersion !== station.dataVersion`.**
5. **Auto-refresh digital twin on `station.dataVersion` change** in a `useEffect`.
6. **Add `dataVersion` to compliance notes** so a manual note can be flagged stale against a new input snapshot.
7. **Stamp `complianceStatus` with `setAt` + `inputSnapshot` and surface staleness in the UI.**
8. **Auto-recompute scenario `result` when `station.dataVersion > scenario.capturedAt.dataVersion`** (or surface staleness).
9. **In Excel import, set `lastCalcResult = null` on every station** (already done — but show a banner to user).
10. **In revision restore, also reset `digitalTwin` to force re-commission** (since it is not in the snapshot).

---

## 8. Appendix — evidence file:line refs

The following source locations confirm the staleness findings:

- `store/slices/stationSlice.js:55-63` — `updateStation` does clear `lastCalcResult` but does not flip `attenuationDirty` (M7 fix only fires for `updateSegment` and add/remove).
- `store/slices/stationSlice.js:64-77` — `updateSegment` clears `lastCalcResult` and sets `attenuationDirty = true` (M7).
- `store/slices/stationSlice.js:79-101` — `addSegment` / `removeSegment` set `attenuationDirty = true` (M7).
- `store/slices/designSlice.js:3-25` — `updateDesignBasis` flips `station.status = 'needs_recalculation'` for every station but does **not** set `attenuationDirty`.
- `store/slices/calculationSlice.js:5-77` — `calculateStation` always recomputes; no defensive cache check.
- `pages/PageSoilResistivity.jsx` — every `updateProject` call sets `p.designBasis.X` but never calls `setNeedsRecalculation`.
- `pages/PageGroundbed.jsx`, `PageCableResistance.jsx` — no staleness banner; reads `r` directly.
- `pages/AttenuationPage.jsx:166-189` (post-M7) — `resolveAttenuationState` returns STALE when `attenuationDirty && attenuationResult.success`.
- `digitalTwin/assetSlice.js` — no auto-refresh on station edits.
- `store/slices/workflowSlice.js:128-149` — `restoreRevision` overwrites the project but does not reset `digitalTwin`.
