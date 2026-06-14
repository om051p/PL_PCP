# MODULE VALIDATION DESIGN

> **Purpose:** Define a uniform **per-page Validate Data** mechanism that every engineering page must implement. This is in addition to (not a replacement for) the global `calculateStation` / `calculateAllStations` actions.
> **No file modifications.** This document is the design.

---

## 1. Goals and non-goals

### Goals

1. Every engineering page has a **Validate Data** button that runs the page's specific validation function.
2. Validation returns one of `NOT_STARTED | INCOMPLETE | VALID | WARNING | ERROR` with engineering guidance.
3. Validation never throws; it returns a structured result.
4. Validation can be triggered without triggering a full calculation.
5. Validation results are surfaced in a per-page "Validation State Card".
6. The result is suitable for both human display and for the dashboard to surface in aggregate.

### Non-goals

1. **No changes to engineering formulas, standards, or equations.** Validation is about *data integrity* and *standard compliance*, not about recomputing the engineering.
2. **No replacement of `calculateStation` / `calculateAllStations`.** These are calculation actions, not validation actions.
3. **No new fields on the store.** Validation results are component state, not store state (with the exception of Compliance, which already stores `complianceStatus`).

---

## 2. Validation state machine

Every validation function MUST return:

```ts
type ValidationState = 'NOT_STARTED' | 'INCOMPLETE' | 'VALID' | 'WARNING' | 'ERROR'

type ValidationFinding = {
  severity: 'info' | 'warning' | 'error' | 'critical',
  code: string,        // stable, e.g. 'PIPE-OD-MISSING'
  message: string,     // human-readable
  field?: string,      // dotted path to the offending field
  standard?: string,   // e.g. 'SAES-X-400 §7.5.8'
  expected?: any,
  actual?: any,
  action?: string,     // suggested button label
  actionRoute?: string // deep link
}

type ValidationResult = {
  state: ValidationState,
  findings: ValidationFinding[],
  // Human-readable summary
  summary: string,
  // The validation time
  computedAt: string,
  // Optional: data version this validated against
  dataVersion?: number,
}
```

The mapping to UI:

| State | Color | Banner text | Default action |
|---|---|---|---|
| `NOT_STARTED` | gray | "Validation has not been run" | "Validate Data" |
| `INCOMPLETE` | amber | "Required data is missing" | "Go to missing field" |
| `VALID` | green | "All checks passed" | (none) |
| `WARNING` | amber | "Non-blocking issues found" | "Review findings" |
| `ERROR` | red | "Validation failed" | "View errors" |

---

## 3. Validation registry

Create `src/engine/validation/moduleValidationRegistry.js`:

```js
// Pseudo-shape — no code change in this document
export const MODULE_VALIDATORS = {
  'project-setup': {
    module: 'Project Setup',
    route: '/project-setup',
    inputs: ['projectNumber', 'clientName', 'designStandard', 'designBasis.*'],
    run: validateProjectSetup,   // returns ValidationResult
    requiredFields: [
      'projectNumber', 'clientName', 'projectName',
      'designBasis.designStandard', 'designBasis.systemDesignLifeYears',
    ],
  },
  'pipeline': { ... },
  'soil-resistivity': { ... },
  'current-requirement': { ... },
  'groundbed': { ... },
  'cable-resistance': { ... },
  'tr-sizing': { ... },
  'attenuation': { ... },
  'sensitivity': { ... },
  'compliance': { ... },
  'digital-twin': { ... },
}
```

Each page imports the registry entry by its key and calls `run(state, project)`. The function is pure; pages invoke it on demand.

---

## 4. Per-module validation specification

### 4.1 Design Basis (`project-setup`)

**Inputs validated:**

| Field | Rule | Severity |
|---|---|---|
| `projectNumber` | non-empty string, ≤ 32 chars | `error` if empty |
| `clientName` | non-empty | `error` if empty |
| `projectName` | non-empty | `error` if empty |
| `designStandard` | in `['saudiAramco', 'nace', 'iso', 'adnoc', 'pdo']` | `error` if missing |
| `designBasis.systemDesignLifeYears` | integer ∈ [5, 50] | `error` if missing; `warning` if < 15 |
| `designBasis.backEmfV` | > 0 | `error` |
| `designBasis.structureResistanceOhm` | > 0 | `error` |
| `designBasis.acInputVoltageV` | ∈ {220, 380, 400, 415, 480, 600} | `warning` if not in list |
| `designBasis.acInputPhase` | ∈ {1, 3} | `error` |
| `designBasis.trEfficiencyPct` | ∈ (0, 100] | `error` |
| `designBasis.trPowerFactor` | ∈ (0, 1] | `error` |
| `designBasis.cokeContingencyPct` | ∈ [0, 50] | `warning` if > 30 |
| `designBasis.minRemotenessDistanceM` | > 0 | `error` |
| `designBasis.actualRemotenessDistanceM` | ≥ `minRemotenessDistanceM` | `warning` if < |
| `designBasis.soilResistivityOhmCm` | > 0 | `error` |

**Standard reference:** SAES-X-500 §6.x; NACE SP0169.

### 4.2 Pipeline Parameters (`pipeline`)

**Inputs validated per segment:**

| Field | Rule | Severity |
|---|---|---|
| `od` | > 0 and < 100 inches | `error` |
| `wallThk` | > 0 and < `od/2` | `error` |
| `lengthM` | > 0 | `error` |
| `opTempC` | within `[-40, 80]` | `warning` outside |
| `currentDensityBase` | > 0 | `error` |
| `coatingType` | in `COATING_TYPES` keys | `error` |
| `coatingEfficiency` | ∈ [0, 1] | `error` |
| `pipelineSegments` length | ≥ 1 per station | `error` |

**Per-station:**

| Field | Rule | Severity |
|---|---|---|
| `station.name` | non-empty | `error` |
| `station.location` | matches `KM \d+\+\d+` or plain km | `error` if unparsable |
| `station.designMode` | in `DESIGN_MODES` keys | `error` |

**Standard reference:** NACE SP0169 §6.2.4 (coating efficiency); SAES-X-400.

### 4.3 Soil Resistivity (`soil-resistivity`)

**Inputs validated:**

| Field | Rule | Severity |
|---|---|---|
| `soilResistivityOhmCm` | > 0 | `error` |
| `soilResistivitySource` | in `['standard', 'manual', 'wenner', 'layered', 'imported']` | `error` |
| Layers (if `source === 'layered'`) | at least 1, monotonic `depthFromM < depthToM`, no overlaps | `error` |
| Survey points (if `source === 'wenner'`) | at least 4 points, sorted, `distanceM > 0`, `resistanceOhm > 0` | `error` |
| Outliers (Wenner) | flag points deviating > 50 % from running median | `warning` |
| ASTM G57 / G187 compliance | if `source === 'wenner'`, check that `distanceM` values form a geometric progression | `warning` |
| Seasonal correction | `seasonalCorrectionFactor ∈ [0.5, 2.0]` if `seasonalCorrection === 'custom'` | `error` |
| Downstream sync | check that `designBasis.soilResistivityOhmCm` matches the displayed value (no hidden override) | `warning` |

**Standard reference:** IEEE 80 §11; ASTM G57; SAES-X-400 §5.2.

### 4.4 Current Requirement (`current-requirement`)

**Inputs validated:**

| Field | Rule | Severity |
|---|---|---|
| `currentDensity` (active standard) | > 0 and < 10 mA/m² | `error` if out of range; `warning` if > 5 |
| `spareFactor` | ≥ 1.0 and ≤ 2.0 | `error` if < 1 |
| `temperatureCorrection.method` | in `['exponential', 'linear', 'none']` | `error` |
| `temperatureCorrection.baseTempC` | ∈ [0, 50] | `warning` if > 35 |
| Station-level: `lastCalcResult.requiredCurrentA` | > 0 and < `anodeSpec.outputAmps * N` × 1.5 | `warning` if very small/large |
| Coating breakdown | `currentDensityBase` per segment matches the active standard | `error` if drifted |

**Stale check:** `lastCalcResult && r.dataVersion === station.dataVersion`.

**Standard reference:** NACE SP0169 §6.2.4; SAES-X-400 §5.2.

### 4.5 Groundbed (`groundbed`)

**Inputs validated:**

| Field | Rule | Severity |
|---|---|---|
| `groundbed.type` | in `DESIGN_MODES` keys, `available: true` | `error` |
| `groundbed.startDepthM` | > 0 | `error` |
| `groundbed.anodeLengthM` | > 0 | `error` |
| `groundbed.boreholeDiaM` | > 0.10 and < 0.50 m | `warning` if < 0.15 |
| `groundbed.numHoles` | ≥ 1 if `type === 'deepwell'` | `error` |
| `groundbed.anodeSpacingM` | > 0 if `type === 'shallow_vertical'` | `error` |
| `groundbed.cokeCoverM` | ≥ 0.5 m | `warning` if < 1.0 |
| `groundbed.cementPlugM` | ≥ 0.25 m | `warning` if < 0.5 |
| `proposedAnodes` | ≥ 1 | `error` |
| `anodeSpec` | in `ANODE_SPECS` keys | `error` |
| Anode material vs soil | `validateAnodeMaterialRestrictions(anodeSpec, opTempC, soilResistivityOhmCm)` | `warning` |
| Material vs op-temp | `anodeSpec.maxOpTempC ≥ opTempC` | `error` |
| Material vs ρ | `anodeSpec.maxSoilResOhmCm ≥ soilResistivityOhmCm` | `error` |
| R_G vs R_G_max | `lastCalcResult.groundbedResistanceOhm ≤ lastCalcResult.maxAllowableGroundbedRes` | `error` if exceeded |

**Standard reference:** SAES-X-400 §5.2; NACE SP0169.

### 4.6 Cable Resistance (`cable-resistance`)

**Inputs validated:**

| Field | Rule | Severity |
|---|---|---|
| `cables.anodeCableSizeMm2` | in `CABLE_SPECS` keys | `error` |
| `cables.posMainSizeMm2` | in `CABLE_SPECS` keys | `error` |
| `cables.negMainSizeMm2` | in `CABLE_SPECS` keys | `error` |
| `cables.negSecSizeMm2` | in `CABLE_SPECS` keys | `error` |
| Cable lengths | all > 0 | `error` |
| `anodeTailLengths.length` | `=== proposedAnodes` | `error` if mismatched |
| Voltage drop | `positiveCableVoltageDrop ≤ 0.5 V` and `negativeCableVoltageDrop ≤ 0.3 V` | `error` |
| Loop resistance | `totalCableResOhm ≤ THRESHOLDS.MAX_CIRCUIT_RES_*` | `error` |
| Cross-check | `cableDiagnosticsInline(groundbedRes, maxAllowableGroundbedRes, ...)` not failing | `error` |
| Stale check | `r && r.dataVersion === station.dataVersion` | `warning` |

**Standard reference:** IEEE 80; SAES-X-500 §6.8.

### 4.7 TR Sizing (`tr-sizing`)

**Inputs validated:**

| Field | Rule | Severity |
|---|---|---|
| `tr.ratedVoltage` | > 0, ≤ 100 V (SAES-X-500 §6.8.4) | `error` if > 100 |
| `tr.ratedCurrent` | > 0, ≤ design basis | `error` if exceeded |
| `tr.backEMF` | > 0 | `error` |
| `tr.structureResistance` | > 0 | `error` |
| TR adequacy | `tr.ratedVoltage ≥ r.minTRVoltage` | `error` if not |
| TR current adequacy | `tr.ratedCurrent ≥ r.designCurrentA * 1.2` (headroom) | `warning` if headroom < 20 % |
| AC input | `acInputVoltageV * acInputPhase` matches the page literal | `warning` if mismatch |
| kVA sizing | `acInputKVA ≤ 50` (typical station limit) | `warning` if exceeded |
| Stale check | `r && r.dataVersion === station.dataVersion` | `warning` |

**Standard reference:** SAES-X-500 §6.8.4; IEEE 80.

### 4.8 Attenuation (`attenuation`)

This module already has a state machine (`EMPTY | INCOMPLETE | READY | CALCULATED | STALE | ERROR`). The `Validate Data` button must call `buildAttenuationInputFromProject` and `resolveAttenuationState` and surface the result.

**Validation result:**

| Check | Severity |
|---|---|
| `state === 'EMPTY'` | `INCOMPLETE` — no project |
| `state === 'INCOMPLETE'` with reason | `INCOMPLETE` — guidance returned |
| `state === 'STALE'` | `WARNING` — needs recalculation |
| `state === 'CALCULATED'` | `VALID` |
| `state === 'ERROR'` | `ERROR` |
| Each station has `positionKm` and chainage parseable | `error` |
| TR rated voltage > 0 | `error` |
| Groundbed exists | `error` |
| Pipeline segments exist | `error` |
| Soil ρ > 0 | `error` |
| No `station.km` undefined (programmatic check) | `error` |
| No undefined geometry (programmatic check) | `error` |

**Standard reference:** NACE SP0169 §6.2.5.

### 4.9 Sensitivity (`sensitivity`)

**Inputs validated:**

| Field | Rule | Severity |
|---|---|---|
| `selectedStationId` | exists in `project.stations` | `error` if not |
| `selectedOutput` | in `getAvailableOutputs()` | `error` |
| `perturbationPct` | ∈ (0, 50] | `warning` if > 30 |
| `sweepMin` < `sweepMax` | boolean | `error` |
| `sweepSamples` | ∈ [5, 100] | `warning` if < 10 |
| Scenario variants | warn that `+3/-3 anodes` and `×1.5 depth` are not derived from a standard | `warning` |

**Standard reference:** none (analytical tool); risk: arbitrary scenarios not validated against any standard.

### 4.10 Compliance (`compliance`)

**Inputs validated:**

| Field | Rule | Severity |
|---|---|---|
| Each auto-validatable rule in `STANDARDS_RULES` ran | `error` if not |
| Manual rules have a status set | `error` if empty |
| Manual rules have a `setAt` timestamp | `warning` if missing |
| Compliance notes have not drifted against current `lastCalcResult` | `warning` if drift |
| SAES-500-6.8.4 (100V TR ceiling) — duplicated check from `tr-sizing` | `error` if violated |

**Standard reference:** SAES-X-300/400/500/600/700.

### 4.11 Digital Twin (`digital-twin`)

**Inputs validated:**

| Check | Severity |
|---|---|
| `digitalTwin.registry` is not null | `error` |
| Every `project.stations[i]` has a `healthScores[stationId]` entry | `error` if missing |
| Every `project.stations[i]` has a `riskAssessments[stationId]` entry | `error` if missing |
| `healthScores[i].computedAt > station.lastCalcResult.calculatedAt` | `warning` |
| `riskAssessments[i].computedAt > station.lastCalcResult.calculatedAt` | `warning` |
| `assets.length > 0` for each station | `error` |
| No asset has frozen `designRef` older than 24 h | `warning` |
| No orphan assets (asset.stationId not in project.stations) | `error` |
| `BOND, TEST_STATION, JUNCTION_BOX` declared but not produced | `warning` (dead enum) |

**Standard reference:** none (analytical layer).

### 4.12 BOM (covered by `bom-service` validation)

**Inputs validated:**

| Check | Severity |
|---|---|
| `BOM_ALLOWED_STATUSES.includes(station.status)` | `INCOMPLETE` if not |
| `lastCalcResult.bom` exists | `error` if missing |
| Each `BOMItem.quantity` > 0 | `error` |
| Anode BOM matches `proposedAnodes` | `error` if mismatch |
| TR BOM matches `tr.{ratedVoltage, ratedCurrent}` | `error` if mismatch |

**Standard reference:** SAES-X-500.

### 4.13 Report (covered by `excel/pdf` validation)

**Inputs validated:**

| Check | Severity |
|---|---|
| Every station has `lastCalcResult` | `INCOMPLETE` if not |
| `!hasCalculationsMismatch` | `ERROR` if mismatch |
| `acInputVoltageV` and `acInputPhase` resolved (no hardcoded fallback) | `warning` |
| Page count vs `doc.internal.getNumberOfPages()` | `warning` |
| Standard code references resolved from `getActiveStandard()` | `error` if fallback used |

---

## 5. UI — `ValidationStateCard` component

A single shared component that every page uses:

```text
┌──────────────────────────────────────────────────┐
│  ⚙ Validation State  [VALIDATE DATA]            │
│  ─────────────────────────────────────────────── │
│  Status: VALID                                   │
│  Last run: 2026-06-14 12:34 (12 minutes ago)    │
│                                                  │
│  ✓ No issues found                               │
└──────────────────────────────────────────────────┘
```

For `INCOMPLETE`:
```text
┌──────────────────────────────────────────────────┐
│  ⚙ Validation State  [VALIDATE DATA]            │
│  ─────────────────────────────────────────────── │
│  Status: INCOMPLETE                              │
│  Last run: ...                                   │
│                                                  │
│  ⚠ No pipeline segments defined                  │
│    → Go to Pipeline                              │
│  ⚠ Soil resistivity not set                      │
│    → Go to Soil Resistivity                      │
└──────────────────────────────────────────────────┘
```

For `ERROR`:
```text
┌──────────────────────────────────────────────────┐
│  ⚙ Validation State  [VALIDATE DATA]            │
│  ─────────────────────────────────────────────── │
│  Status: ERROR                                   │
│  Last run: ...                                   │
│                                                  │
│  ✗ Pipeline OD must be > 0                       │
│    field: station.pipelineSegments[0].od         │
│  ✗ TR voltage 120 V exceeds 100 V ceiling        │
│    standard: SAES-X-500 §6.8.4                   │
└──────────────────────────────────────────────────┘
```

---

## 6. Implementation plan (no code changes in this audit)

| Step | Description | Effort |
|---|---|---|
| 1 | Create `src/engine/validation/moduleValidationRegistry.js` with the spec above | 1 file |
| 2 | Implement each validator as a pure function returning `ValidationResult` | 11 files |
| 3 | Add `<ValidationStateCard moduleKey="…" />` to each engineering page | 11 pages |
| 4 | Wire the card's "Validate Data" button to `MODULE_VALIDATORS[key].run(state, project)` | — |
| 5 | Expose aggregate state on the dashboard (count of WARNING/ERROR by module) | 1 file |
| 6 | Optional: persist `lastValidation` per module on the project for export | 1 file |

---

## 7. State persistence

By default, validation results are component state. For pages that already have a store field for results (Compliance), the existing `complianceStatus` is reused.

For pages that do not, the card is the only place the result is shown. No store write.

For the **Dashboard** to surface aggregate state, a small projection is needed:

```js
// inside Dashboard useMemo
const moduleStates = [
  validateProjectSetup(project),
  validatePipeline(stations, designBasis),
  validateSoilResistivity(project.designBasis),
  // ...
]
const errorCount = moduleStates.filter(s => s.state === 'ERROR').length
const warningCount = moduleStates.filter(s => s.state === 'WARNING').length
```

---

## 8. Acceptance criteria

A page passes the **Module Validation Design** audit when:

1. ✅ It has a **Validate Data** button.
2. ✅ The button calls a pure `validate*(...)` function and renders the result in a `ValidationStateCard`.
3. ✅ The card shows one of `NOT_STARTED | INCOMPLETE | VALID | WARNING | ERROR`.
4. ✅ Each finding has a `severity`, `code`, `message`, and (where applicable) `field` and `standard`.
5. ✅ The validator never throws; on internal error it returns `state: 'ERROR'` with a single finding.
6. ✅ The page does not show engineering data when the validator returns `INCOMPLETE` for a blocking field.
7. ✅ The validator is independent of the calculation engine — it does not require `lastCalcResult` to run (only to do *some* checks).

---

## 9. Mapping to existing pages

| Page | Validate Data button today? | Validator function | Action required |
|---|---|---|---|
| Project Setup | no | `validateProjectSetup(project)` | add card + button |
| Pipeline | no | `validatePipeline(stations)` | add card + button |
| Soil Resistivity | no | `validateSoilResistivity(designBasis)` | add card + button |
| Current Requirement | partial (Calculate) | `validateCurrentRequirement(station, project)` | add card; keep Calculate for `runStationCalculations` |
| Groundbed | partial (Run Calculations) | `validateGroundbed(station, designBasis)` | add card |
| Cable Resistance | no | `validateCableResistance(station, designBasis)` | add card + button |
| TR Sizing | partial (Analyse Circuit) | `validateTRSizing(station, designBasis)` | add card |
| Attenuation | yes (Run) | existing `resolveAttenuationState` | wrap in `ValidationStateCard` |
| Sensitivity | no | `validateSensitivity(localState, project)` | add card + button |
| Compliance | partial (rules auto-run) | `validateCompliance(station, project, complianceNotes)` | add card |
| BOM | no | `validateBOM(station, status)` | add card + button |
| Report | no | `validateReport(project)` | add card + button; gate export |
| Digital Twin | no | `validateDigitalTwin(project, digitalTwin)` | add card + button |
| Dashboard | n/a | aggregate across all | read-only summary |

---

## 10. Conformance check

This design is **architectural-only**. It does not propose changes to:

- Engineering formulas (in `engine/modules/calculations.js`, `attenuationEngine.js`, `resistivityEngine.js`).
- Standards rules (in `engine/modules/standardsValidationEngine.js`, `engine/rules/rulesEngine.js`).
- Validation equations (in `engine/rules/rulesEngine.js`, `engine/modules/validation.js`).
- Report formulas (in `reporting/excelEngine.js`, `reporting/pdfGenerator.js`).

It only proposes a uniform **data integrity** layer that runs alongside, not inside, the existing engines.
