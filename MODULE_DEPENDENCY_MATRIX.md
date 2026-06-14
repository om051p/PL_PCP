# MODULE DEPENDENCY MATRIX

> **Scope:** RAXA `cp-platform` (`/mnt/devssd/projects/raxa/cp-platform/src`)
> **Audit date:** 2026-06-14
> **Method:** Static read of every page, engine module, store slice, and reporting file. No files modified. Inputs/outputs/constants derived from signatures, JSDoc, and store actions.

This matrix is the **authoritative contract** for what each module must consume and what it must never fabricate. Every cell marked `↓` means a hard, synchronous dependency: the consuming module cannot start without the producer's output. Cells marked `(optional)` are tolerated by the module's defensive guards but still recommended.

---

## 1. Top-level dependency chain

```text
Project Setup (Metadata + Design Basis)
        ↓
Pipeline Parameters (segments)
        ↓
Soil Resistivity (ρ)
        ↓
Current Requirement (I_req, cd, T)
        ↓
Groundbed Design (R_G, N, anode spec)
        ↓
Cable Resistance (R_c, voltage drops)
        ↓
TR Sizing (R_T, V_min, kVA)
        ↓
Attenuation Analysis (α, profile, coverage)
        ↓
Validation (rules, standards, cross-checks)
        ↓
Optimizer (alternatives, cost)
        ↓
Sensitivity (tornado, sweep, scenarios)
        ↓
Compliance (SAES rules, status, notes)
        ↓
BOM (anode, cable, TR, coke, backfill)
        ↓
Digital Twin (assets, health, risk)
        ↓
Engineering Report (Excel, PDF)
```

The order in the chain **is the only correct order**. Every other path (e.g. TR → Attenuation, Compliance → Report) is a **read-only consumer** that does not feed back into the chain.

---

## 2. Per-module matrix

Legend:
- **Inputs** — store fields the module reads on every render or action.
- **Outputs** — store fields the module writes.
- **Hard dependencies** — modules that must have completed before this one can be meaningful.
- **Soft dependencies** — modules whose results are nice-to-have but not blocking.
- **Forbidden** — operations the module must never perform (synthetic data, defaults, side effects).
- **Hardcoded values** — engineering constants that live in code, not project data, with their origin.

### 2.1 Project Setup (`pages/PageProjectSetup.jsx`)

| | |
|---|---|
| **Inputs** | `project.projectNumber, clientName, endClient, projectName, designer`, `project.designBasis.*` |
| **Outputs** | `updateProject(...)`, `updateDesignBasis(...)`, `updateStation(...)`, `addStation()`, `removeStation(id)` |
| **Hard deps** | none (root of chain) |
| **Soft deps** | none |
| **Forbidden** | — |
| **Hardcoded** | `designStandard: 'saudiAramco'`, `systemDesignLifeYears: 25`, `soilResistivityOhmCm: 361`, `backEmfV: 2.0`, `structureResistanceOhm: 0.055`, `acInputVoltageV: 480`, `acInputPhase: 3`, `trEfficiencyPct: 80`, `trPowerFactor: 0.8`, `cokeContingencyPct: 10`, `minRemotenessDistanceM: 20`, `actualRemotenessDistanceM: 56`, default anode `HSCI_TA4` (all from `store/factories.js::makeDefaultProject`) |
| **Validate Data btn** | **No** |
| **Source** | `pages/PageProjectSetup.jsx`, `store/slices/designSlice.js`, `store/factories.js` |

### 2.2 Pipeline Parameters (`pages/PagePipeline.jsx`)

| | |
|---|---|
| **Inputs** | `station.pipelineSegments[]` (od, wallThk, lengthM, opTempC, currentDensityBase, coatingType, coatingEfficiency) |
| **Outputs** | `updateStation(...)`, `updateSegment(stationId, segId, patch)`, `addSegment(stationId)`, `removeSegment(stationId, segId)` |
| **Hard deps** | `project.stations` (a station must exist) |
| **Soft deps** | `project.designBasis.actualRemotenessDistanceM, minRemotenessDistanceM` (display only) |
| **Forbidden** | Recomputing `surfaceArea = π × D × L` for any calculation that feeds the engine (engine owns this). |
| **Hardcoded** | `totalLengthKm: 100` fallback inside `PipelineRouteMap.jsx` when no segments exist |
| **Validate Data btn** | **No** |
| **Source** | `pages/PagePipeline.jsx`, `components/analytics/...` |

### 2.3 Soil Resistivity (`pages/PageSoilResistivity.jsx`)

| | |
|---|---|
| **Inputs** | `project.designBasis.{soilResistivityOhmCm, soilResistivitySource, soilResistivityLayers, soilResistivitySurvey, seasonalCorrection, moistureCondition, seasonalCorrectionFactor}` |
| **Outputs** | `updateProject(p => { p.designBasis.* })` |
| **Hard deps** | none |
| **Soft deps** | none |
| **Forbidden** | Silently changing `soilResistivitySource` without invalidating downstream `lastCalcResult` — **this is a current bug**. |
| **Hardcoded** | New layer `depthToM = depthFromM + 5, resistivityOhmCm = 5000`; new survey point `distanceM = lastDist + 5, resistivityOhmCm = 5000`; thresholds `1000/5000/20000 Ω·cm` in `classifySoil()` |
| **Validate Data btn** | **No** |
| **Source** | `pages/PageSoilResistivity.jsx`, `engine/modules/resistivityEngine.js` |

### 2.4 Current Requirement (`pages/PageCurrentRequirement.jsx`)

| | |
|---|---|
| **Inputs** | `station.pipelineSegments`, `station.anodeSpec`, `station.tr`, `station.lastCalcResult`, `project.designBasis.systemDesignLifeYears`, `getActiveStandard().currentRequirement.{spareFactor, temperatureCorrection.{method, formula, baseTempC}}` |
| **Outputs** | `calculateStation(stationId)` (read-mostly page; only writes via calculate) |
| **Hard deps** | Pipeline (segments must exist) |
| **Soft deps** | Soil resistivity (only the active standard's `getActiveStandard` reads it) |
| **Forbidden** | Recomputing `π × D × L` in `CalculationBreakdown`; if the engine result exists, the page should display engine numbers, not local recompute. |
| **Hardcoded** | `spareFactor: 1.3` fallback, `formula: 'i_T = i_base × 1.25^((T − 30) / 10)'` fallback, `baseTempC: 30` fallback, `targetDesignLifeYears: 25` fallback |
| **Validate Data btn** | **Yes** (`Calculate` per station) |
| **Source** | `pages/PageCurrentRequirement.jsx`, `engine/modules/calculations.js` |

### 2.5 Groundbed Design (`pages/PageGroundbed.jsx`)

| | |
|---|---|
| **Inputs** | `station.{groundbed, proposedAnodes, anodeSpec}`, `project.designBasis.{soilResistivityOhmCm, structureResistanceOhm, systemDesignLifeYears}`, `getActiveStandard()` |
| **Outputs** | `updateStation(...)` (groundbed, proposedAnodes, anodeSpec), `calculateStation(stationId)` |
| **Hard deps** | Pipeline (segments), Soil (ρ) |
| **Soft deps** | Current Requirement (consumed via `lastCalcResult` displayed) |
| **Forbidden** | Re-deriving active length (`N × L + (N-1) × S`) locally for any output that the engine computes. |
| **Hardcoded** | `numHoles = 1` when `type === 'deepwell'`, utilization factor `0.85` (in `FormulaCard` breakdown) |
| **Validate Data btn** | **Yes** (`Run Calculations`) |
| **Source** | `pages/PageGroundbed.jsx`, `engine/modules/calculations.js::calcGroundbedResistance*` |

### 2.6 Cable Resistance (`pages/PageCableResistance.jsx`)

| | |
|---|---|
| **Inputs** | `station.cables.*`, `station.proposedAnodes`, `station.lastCalcResult.{groundbedResistanceOhm, totalCableResOhm, totalCircuitResistanceOhm, anodeTailParallelResOhm, posMainCableResOhm, negMainCableResOhm, maxAllowableGroundbedRes}`, `project.designBasis.systemDesignLifeYears`, `CABLE_SPECS` |
| **Outputs** | `updateStation(...)` only — no `calculateStation` call |
| **Hard deps** | Groundbed (R_G used in display), TR (cable voltage drop is fed to TR) |
| **Soft deps** | Current Requirement (voltage drop is downstream of I_req) |
| **Forbidden** | Showing a result row when the engine has not been re-run after an edit. |
| **Hardcoded** | None in page (constants come from `CABLE_SPECS`) |
| **Validate Data btn** | **No** (must rely on `Calculate` in TR/Groundbed pages — **stale-data risk**) |
| **Source** | `pages/PageCableResistance.jsx`, `engine/modules/calculations.js::calcCableResistances` |

### 2.7 TR Sizing (`pages/PageTRSizing.jsx`)

| | |
|---|---|
| **Inputs** | `station.tr.{ratedVoltage, ratedCurrent, backEMF, structureResistance}`, `station.lastCalcResult.{groundbedResistanceOhm, totalCableResOhm, backEMFResistanceOhm, totalCircuitResistanceOhm, minTRVoltage, dcPowerW, acInputKVA, acInputCurrentA}`, `project.designBasis.{backEmfV, structureResistanceOhm, acInputVoltageV, acInputPhase, trEfficiencyPct, trPowerFactor, systemDesignLifeYears}`, `getActiveStandard()`, `THRESHOLDS` |
| **Outputs** | `updateStation(...)` (clamping `tr.ratedVoltage` ≤ 100 V), `calculateStation(stationId)` |
| **Hard deps** | Groundbed (R_G), Cable (R_c) |
| **Soft deps** | Current Requirement (I_req), Attenuation (V_min) |
| **Forbidden** | Hardcoding AC input label `"@ 480V/3Φ"` when `acInputVoltageV` and `acInputPhase` exist on the design basis. |
| **Hardcoded** | `tr.ratedVoltage = Math.min(100, v)` (SAES-X-500 §6.8.4 ceiling) |
| **Validate Data btn** | **Yes** (`Analyse Circuit`) |
| **Source** | `pages/PageTRSizing.jsx`, `engine/modules/calculations.js::calcTRCircuit` |

### 2.8 Attenuation Analysis (`pages/AttenuationPage.jsx`)

| | |
|---|---|
| **Inputs** | `project.stations[]`, `station.tr.ratedVoltage`, `station.groundbed`, `station.pipelineSegments`, `project.designBasis.{soilResistivityOhmCm, steelResistivityMicroOhmCm, coatingConductivityMicroSiemensPerM2, coatingCurrentDensityMaPerM2, naturalPotentialMv, drainPointMv, minimumProtectionMv}` — all via `services/attenuationInputBuilder.js` |
| **Outputs** | `replaceAttenuationInput(input)`, `runAttenuationCalculation()`, `addAttenuationStation`, `removeAttenuationStation`, `updateAttenuationStation` |
| **Hard deps** | Pipeline, Soil, TR, Groundbed |
| **Soft deps** | Current Requirement (for I_req cross-check) |
| **Forbidden** | Synthetic stations, default TRs, default groundbeds. Any time the input is incomplete the page must show a guidance card. **Implemented (M7)**. |
| **Hardcoded** | `minimumMv: 850` (NACE) as fallback inside visualizations; `naceMinProtectionMv` from engine constants |
| **Validate Data btn** | **Yes** (`Run calculation` / `Recalculate`) — also has formal `STALE` state machine |
| **Source** | `pages/AttenuationPage.jsx`, `services/attenuationInputBuilder.js`, `services/attenuationStateMachine.js`, `services/attenuationService.js`, `engine/modules/attenuationEngine.js` |

### 2.9 Validation (`pages/PageValidation.jsx`)

| | |
|---|---|
| **Inputs** | `station.lastCalcResult.checks`, `station.lastCalcResult.allChecksPassed`, `station.lastCalcResult.insights`, `station.status` |
| **Outputs** | `calculateStation(stationId)`, `advanceWorkflow(stationId, status, notes)`, `createRevision(title, email)` |
| **Hard deps** | All of Pipeline → Cable → TR (validation reads their `lastCalcResult.checks`) |
| **Soft deps** | Attenuation (read-only via advisor) |
| **Forbidden** | Re-running `runStationCalculations` per cell in `SpatialView` (it duplicates the validation engine output and risks drift). |
| **Hardcoded** | Scenario factors `1.0, 1.2, 0.8, 0.5`; pass/warn thresholds `{ pass: 1.0, warn: 0.7 }` |
| **Validate Data btn** | **Yes** (`Recalculate` per station) |
| **Source** | `pages/PageValidation.jsx`, `engine/rules/rulesEngine.js`, `engine/scenarios/scenarioRunner.js` |

### 2.10 Optimizer (`pages/PageOptimizer.jsx`)

| | |
|---|---|
| **Inputs** | `station.alternatives[]` (engine-generated) |
| **Outputs** | `updateStation(...)` (proposedAnodes, tr.*), `calculateStation(stationId)` |
| **Hard deps** | TR, Groundbed, Current Requirement (alternatives are recomputed for the current design) |
| **Soft deps** | Attenuation (V_min influences alternator) |
| **Forbidden** | Apply-Design action that touches only `proposedAnodes, tr.ratedVoltage, tr.ratedCurrent` and not the supporting groundbed/cable parameters. **Current bug.** |
| **Hardcoded** | None |
| **Validate Data btn** | Only `Calculate Station` if no alternatives present |
| **Source** | `pages/PageOptimizer.jsx`, `engine/optimizer/optimizer.js` |

### 2.11 Sensitivity (`pages/PageSensitivity.jsx`)

| | |
|---|---|
| **Inputs** | `project.stations`, `activeStation`, `projectDesignBasis`, `getAvailableInputs()`, `getAvailableOutputs()` |
| **Outputs** | Local component state only |
| **Hard deps** | Pipeline → TR (a calculated station must exist) |
| **Soft deps** | — |
| **Forbidden** | Scenario variants of `+3 / -3 anodes` and `×1.5 depth` that are not derived from any standard. |
| **Hardcoded** | `perturbationPct: 10`, `sweepMin: 100`, `sweepMax: 10000`, `sweepSamples: 15`, `life: 25` fallback |
| **Validate Data btn** | **No** (read-only) |
| **Source** | `pages/PageSensitivity.jsx`, `engine/sensitivity/index.js` |

### 2.12 Compliance (`pages/PageCompliance.jsx`)

| | |
|---|---|
| **Inputs** | `project.stations`, `currentStation.lastCalcResult`, `project.complianceNotes[stationId]`, `project.complianceStatus[stationId]`, `runStandardsValidation(currentStation, project)` |
| **Outputs** | `updateProject({ complianceNotes, complianceStatus })` |
| **Hard deps** | All engineering modules (each rule consumes a different slice of `lastCalcResult`) |
| **Soft deps** | — |
| **Forbidden** | Duplicating the 100V TR ceiling (SAES-500-6.8.4) — should reference a shared constant. |
| **Hardcoded** | `ALL_REQUIREMENTS` (24 hardcoded SAES rules), `STANDARD_GROUPS` (5 entries), default status `'pending'`, PDF colour palette |
| **Validate Data btn** | **No** (auto-validation in `useMemo`; manual rules are user-set) |
| **Source** | `pages/PageCompliance.jsx`, `engine/modules/standardsValidationEngine.js` |

### 2.13 BOM (`pages/PageBOM.jsx`)

| | |
|---|---|
| **Inputs** | `project.stations`, each station's `lastCalcResult`, `getActiveStandard(project)`, `BOM_ALLOWED_STATUSES` |
| **Outputs** | None (read-only) |
| **Hard deps** | All engineering modules (BOM is the union of all consumables) |
| **Soft deps** | — |
| **Forbidden** | Hardcoded category labels (`ANODE, CABLE, TR, COKE, BACKFILL, OTHER`) — should live in `bomEngine` for reuse. |
| **Hardcoded** | Category labels in page file |
| **Validate Data btn** | **No** |
| **Source** | `pages/PageBOM.jsx`, `engine/rules/bomEngine.js` |

### 2.14 Engineering Report (`pages/PageReport.jsx`)

| | |
|---|---|
| **Inputs** | `project`, `project.stations[]`, `project.tank`, `project.vessel`, `project.revisions`, each station's `lastCalcResult, pipelineSegments, tr, groundbed, proposedAnodes` |
| **Outputs** | `createRevision(revDesc)` |
| **Hard deps** | All engineering modules |
| **Soft deps** | Compliance (status echoed in cover page) |
| **Forbidden** | Hardcoded AC input literal `"@ 480V/3Φ"` — should be templated from `designBasis.acInputVoltageV/acInputPhase`. |
| **Hardcoded** | `currentRevision: 'A'` fallback, `designer: 'CP Engineer'` fallback, signature labels `'CP Specialist'` / `'Chief CP Engineer'`, AC input literal |
| **Validate Data btn** | **No** (gates exports on `allCalculated` and `!hasMismatch`) |
| **Source** | `pages/PageReport.jsx`, `reporting/excelEngine.js`, `reporting/pdfGenerator.js`, `reporting/bomExporter.js` |

### 2.15 Dashboard (`pages/PageDashboard.jsx`)

| | |
|---|---|
| **Inputs** | `projects`, `activeProject`, `activeProject.stations`, `activeProject.revisions`, `activeProject.designBasis.systemDesignLifeYears`, `digitalTwin.{healthScores, riskAssessments}`, activity log (Firestore subscription) |
| **Outputs** | `switchProject, createProject, duplicateProject, archiveProject, unarchiveProject, deleteProject, addStation, calculateAllStations, createRevision, setActiveWorkspace, setActiveStation` |
| **Hard deps** | none (entry point) |
| **Soft deps** | every module (for derived KPIs) |
| **Forbidden** | Showing engineering charts (`PipelineProfile`, `CableSchematic`, `GroundbedGeometry`, `AttenuationGraph`) — these belong in their modules. **Partially observed.** |
| **Hardcoded** | Project number template `` `ECP${year}-${String(n+1).padStart(3,'0')}` ``; hardcoded progress logic `20, +15, +15, +15, +5/15`; `workflowModules` field-name map (e.g. `'groundbedResistanceOhm' != null`); `workspaceRegistry` icon mapping |
| **Validate Data btn** | **Yes** (`Calculate All`) |
| **Source** | `pages/PageDashboard.jsx`, `engine/dashboard/*.js`, `engine/engineeringAdvisor/engineeringAdvisorEngine.js` |

### 2.16 Digital Twin (`digitalTwin/*`)

| | |
|---|---|
| **Inputs** | `project.stations`, `station.lastCalcResult`, `project.designBasis.systemDesignLifeYears` (only via `healthScoreEngine` and `riskEngine`); `assets/assetFactory.js` reads many more fields |
| **Outputs** | `state.digitalTwin.{registry, healthScores, riskAssessments, lastRefreshedAt}`; selectors `getActiveStationHealth, getActiveStationRisk, getActiveStationAssets` |
| **Hard deps** | Attenuation, Compliance, BOM (digital twin should reflect all final state) |
| **Soft deps** | Validation (insights may feed advisor → dashboard) |
| **Forbidden** | Freezing `designRef` at asset-creation time and not refreshing it (drift). **Currently masked because the slice discards and rebuilds the registry, but if any consumer preserves assets the snapshot will silently drift.** |
| **Hardcoded** | Health weights (`trVoltageMargine 0.25, designLifeFactor 0.25, groundbedResistanceMargine 0.20, rulePassRatio 0.20, cableDropMargine 0.10`); risk matrix `LOW 1–4, MEDIUM 5–9, HIGH 10–16, CRITICAL 17–25`; consequence breakpoints (currentA 20/8, lengthM 10000, life 30); likelihood breakpoints (TR ratio 1.25/1.5/2.0, ρ 1000/3000) |
| **Validate Data btn** | **No** (passive consumer; `commissionStationAssets` is triggered by page actions) |
| **Source** | `digitalTwin/assetSlice.js`, `digitalTwin/DigitalTwinModel.js`, `digitalTwin/healthScoreEngine.js`, `digitalTwin/riskEngine.js`, `digitalTwin/assets/assetFactory.js` |

### 2.17 Engineering Advisor (`engine/engineeringAdvisor/*`)

| | |
|---|---|
| **Inputs** | Flat input object (soilResistivityOhmCm, pipelineLengthKm, currentReqA, groundbedResistanceOhm, trMinVoltage, trRatedVoltage, cableDropV, attenuationCoveragePct, attenuationWorstPointMv, designLifeYears, targetDesignLifeYears, pendingApprovalDays) |
| **Outputs** | `recommendations[]`, `score`, `scoreLabel`, `summary`, `inputEcho` |
| **Hard deps** | All engineering modules (must be invoked from a context with full calc result) |
| **Soft deps** | — |
| **Forbidden** | Replacing a `severity: 'success'` with a literal default like `'ok'`; the registry must remain the only source of `RECOMMENDATION_CATEGORIES` and `RECOMMENDATION_PRIORITIES`. |
| **Hardcoded** | 28 rule thresholds; `SEVERITY` weights (`error:30, warn:15, info:5, success:-2`); `PRIORITY_ORDER` mapping; ID-prefix → trace step mapping; 32 rule IDs in registry |
| **Validate Data btn** | **No** (read-only) |
| **Source** | `engine/engineeringAdvisor/*.js` |

---

## 3. Cross-module dependency table

The following table maps every cross-module read so the impact of any one field change is fully visible.

| Consumer → | Reads from | Mandatory? |
|---|---|---|
| `PagePipeline` | `project.designBasis.{soilResistivityOhmCm, actualRemotenessDistanceM, minRemotenessDistanceM}`, `station.pipelineSegments` | mandatory |
| `PageSoilResistivity` | `project.designBasis` | self |
| `PageCurrentRequirement` | `station.pipelineSegments, anodeSpec, tr, lastCalcResult`, `project.designBasis.systemDesignLifeYears`, `getActiveStandard().currentRequirement` | mandatory |
| `PageGroundbed` | `station.{groundbed, proposedAnodes, anodeSpec}`, `project.designBasis.{soilResistivityOhmCm, structureResistanceOhm, systemDesignLifeYears}`, `getActiveStandard()` | mandatory |
| `PageCableResistance` | `station.cables.*, proposedAnodes, lastCalcResult.{groundbedResistanceOhm, ...}`, `CABLE_SPECS` | mandatory |
| `PageTRSizing` | `station.tr, lastCalcResult`, `project.designBasis.{backEmfV, structureResistanceOhm, acInputVoltageV, acInputPhase, trEfficiencyPct, trPowerFactor, systemDesignLifeYears}`, `getActiveStandard()` | mandatory |
| `AttenuationPage` | `project.stations, station.tr, station.groundbed, station.pipelineSegments`, `project.designBasis.{soilResistivityOhmCm, ...}`, `attenuationInput` (derived) | mandatory |
| `PageValidation` | `station.lastCalcResult.checks/insights/allChecksPassed`, `station.status` | mandatory |
| `PageOptimizer` | `station.alternatives[]` | mandatory |
| `PageSensitivity` | `project.stations, activeStation, projectDesignBasis` | mandatory |
| `PageCompliance` | `project.stations, currentStation.lastCalcResult, project.complianceNotes, project.complianceStatus` | mandatory |
| `PageBOM` | `project.stations`, each `lastCalcResult`, `getActiveStandard()` | mandatory |
| `PageReport` | `project, project.stations, project.tank, project.vessel, project.revisions`, each `lastCalcResult, pipelineSegments, tr, groundbed, proposedAnodes` | mandatory |
| `PageDashboard` | `projects, activeProject, stations, revisions, digitalTwin.{healthScores, riskAssessments}, activityLog` | mandatory |
| `digitalTwin.healthScoreEngine` | `station.lastCalcResult, project.designBasis.systemDesignLifeYears` | mandatory |
| `digitalTwin.riskEngine` | `station.lastCalcResult, project.designBasis.systemDesignLifeYears` | mandatory |
| `digitalTwin.assetFactory` | `station.lastCalcResult, station.{tr, groundbed, proposedAnodes, anodeSpec, pipelineSegments}`, `project.designBasis.soilResistivityOhmCm` | mandatory |
| `engine.sensitivity` | `runStationCalculations(station, life, project)` deep-cloned; reads `INPUT_LINKS` for labels | mandatory |
| `engine.optimizer` | `runStationCalculations(station, life, standardConfig)`, `runRules(station, result, standardConfig)`, `standardConfig.trSizing.step{Voltage,Current}`, `THRESHOLDS` | mandatory |
| `engine.scenarios.runScenario` | `runStationCalculations`, `runRules`, `getActiveStandard`, `project.designBasis.systemDesignLifeYears` | mandatory |
| `engine.trace.calculationTraceEngine` | `station, project.designBasis.designStandard, rawResult, inputAudit, FORMULA_REGISTRY` | mandatory |
| `engine.trace.inputAuditEngine` | `station, project.designBasis.designStandard` | mandatory |
| `engine.dashboard.workflowEngine` | `project.designBasis, project.status, stations, options.attenuationResult` | mandatory |
| `engine.dashboard.projectHealthEngine` | `stations, workflow, advisorRecs` | mandatory |
| `engine.standardsValidationEngine` | `station.lastCalcResult, station.tr, station.cables, station.proposedAnodes, station.pipelineSegments, station.anodeSpec, project.designBasis.soilResistivityOhmCm, getActiveStandard, ANODE_SPECS, THRESHOLDS` | mandatory |
| `engine.rules.rulesEngine` | `station, result, standardConfig, THRESHOLDS, getSoilClassification, calcRequiredRemotenessM` | mandatory |
| `engine.rules.bomEngine` | `station.{groundbed, proposedAnodes, cables, anodeSpec, tr}, result.{cokeBagsBase/WithContingency, activeLengthM, totalDrillDepthM, acInputKVA, acInputCurrentA}, standardConfig.{standardsReferences, cokeBackfill, trSizing}, STANDARDS` | mandatory |
| `services.calculationService.runFullCalculation` | `runStationCalculations, runRules, generateAlternatives, generateBOM, buildTraceRecord, captureInputAudit, validateStation, getActiveStandard` | mandatory |
| `services.attentionuationService.computeAttenuation` | `runAttenuationAnalysis(input)` | mandatory |
| `services.bomService.generateStationBOM` | `station.lastCalcResult, project.status, BOM_ALLOWED_STATUSES, getActiveStandard` | mandatory |
| `reporting.excelEngine` | `project.stations, lastCalcResult.* (designCurrentA, groundbedResistanceOhm, designLifeYears, minTRVoltage, allChecksPassed, checks, bom)`, `station.{tr, cables, groundbed, anodeSpec, pipelineSegments}` | mandatory |
| `reporting.pdfGenerator` | `project.stations, lastCalcResult.*, station.{tr, cables, groundbed, anodeSpec, pipelineSegments, groundbed.type, groundbed.{cokeCoverM, cementPlugM, anodeLengthM, anodeSpacingM, startDepthM, boreholeDiaM}}, designBasis.{acInputVoltageV, acInputPhase}, getActiveStandard().standardsReferences` | mandatory |
| `reporting.bomExporter` | `BOMItem[]` (read-only) | mandatory |

---

## 4. Hidden / undocumented dependencies

These connections exist in the code but are not represented in `engine/inputLinkRegistry.js`:

1. **`PageCableResistance` reads `lastCalcResult.groundbedResistanceOhm`** — the registry only lists `groundbedResistanceOhm` for Groundbed Design, TR Circuit, Attenuation, Validation, Optimizer, Reporting. It does **not** mention Cable as a consumer of R_G.
2. **`PageTRSizing` reads `r.backEMFResistanceOhm`** — only `backEmfV` is in the registry, not the engine's derived `backEMFResistanceOhm`.
3. **`AttenuationPage` consumes `station.pipelineSegments[0]` for OD/wall thickness** — no registry entry for `pipelineSegments` as an upstream input of Attenuation.
4. **`AttenuationPage` consumes `station.tr.ratedVoltage` for `drainPointMv`** — no registry entry for `tr.ratedVoltage`.
5. **`PageDashboard` reads `digitalTwin.healthScores[stationId].score`** — health scores are not in the registry, but Dashboard displays them.
6. **`AttenuationPage` reads `attenuationInput` (cached)** — registry mentions `attenuationInput.coating.soilResistivityOhmCm` only.
7. **`engine.optimizer` reads `THRESHOLDS.TR_STEP_VOLTAGE`/`TR_STEP_CURRENT`** — not in registry.
8. **`engine.optimizer` reads `standardConfig.trSizing.step{Voltage,Current}`** — not in registry.
9. **`PageOptimizer.Apply` writes `proposedAnodes, tr.ratedVoltage, tr.ratedCurrent` only** — does not write the groundbed/cable parameters that the alternative was evaluated against.
10. **`PageSoilResistivity` writes `designBasis.seasonalCorrectionFactor`** — never read by any consumer listed in the registry.
11. **`PageCurrentRequirement.analyze(combinedInput)` from advisor** — depends on advisor's expected flat input shape, not the engineering shape of `lastCalcResult`.

---

## 5. Hardcoded engineering values (full inventory)

The following values are **not** read from `project.designBasis` or any user input. They live in code and are engineering defaults that will silently override a real project:

### 5.1 In `store/factories.js::makeDefaultProject`

| Field | Value | Origin |
|---|---|---|
| `designStandard` | `'saudiAramco'` | factory |
| `systemDesignLifeYears` | `25` | factory |
| `soilResistivityOhmCm` | `361` | factory + projectRepository legacy |
| `backEmfV` | `2.0` | factory |
| `structureResistanceOhm` | `0.055` | factory |
| `acInputVoltageV` | `480` | factory |
| `acInputPhase` | `3` | factory |
| `trEfficiencyPct` | `80` | factory |
| `trPowerFactor` | `0.8` | factory |
| `cokeContingencyPct` | `10` | factory |
| `minRemotenessDistanceM` | `20` | factory |
| `actualRemotenessDistanceM` | `56` | factory |

### 5.2 In `engine/modules/resistivityEngine.js::RESISTIVITY_CONSTANTS`

| Field | Value |
|---|---|
| `REFERENCE_TEMP_C` | `15` |
| `BACK_EMF_V` | `2` |
| `TR_EFFICIENCY` | `0.7` |
| `DEFAULT_STRUCTURE_EARTH_RESISTANCE` | `0.055` |
| `DEFAULT_DESIGN_LIFE_YEARS` | `25` |
| `TA4_ANODE_CURRENT_OUTPUT_A` | `3.56` |
| `TA4_CONSUMPTION_RATE_KG_A_YEAR` | `0.45` |
| `TA4_ANODE_WEIGHT_KG` | `38.6` |
| `DEFAULT_BOREHOLE_DIAMETER_M` | `0.25` |

### 5.3 In `engine/modules/attenuationEngine.js::ATTENUATION_CONSTANTS`

| Field | Value |
|---|---|
| `INCH_TO_M` | `39.36` (spreadsheet legacy; not 39.37) |
| `NACE_MIN_PROTECTION_MV` | `850` |
| `DEFAULT_STEEL_RESISTIVITY` | `18` µΩ·cm |
| `DEFAULT_COATING_G_FBE_AGED` | `300` µS/m² |

### 5.4 In `engine/engineeringAdvisor/engineeringAdvisorEngine.js::THRESHOLDS`

28 hardcoded thresholds across 8 categories (soil, pipeline, current, groundbed, tr, cable, attenuation, design_life) — see `analyze(input)` documentation.

### 5.5 In `engine/dashboard/projectHealthEngine.js`

| Field | Value |
|---|---|
| `GROUNDBED_THRESHOLDS.{veryLow,low,nominal,high,veryHigh}` | `0.1, 0.3, 2.0, 5.0, 10.0` |
| `DEFAULT_RISK_WEIGHTS` | `{compliance:0.4, advisorErrors:0.3, validationErrors:0.3}` |
| Health thresholds | `75 / 50 / 0` (Healthy / Warning / Critical) |
| Risk levels | `>70 High, 40–70 Medium, <40 Low` |

### 5.6 In `digitalTwin/healthScoreEngine.js`

| Factor weight | Value |
|---|---|
| `trVoltageMargine` | `0.25` |
| `designLifeFactor` | `0.25` |
| `groundbedResistanceMargine` | `0.20` |
| `rulePassRatio` | `0.20` |
| `cableDropMargine` | `0.10` |

### 5.7 In `digitalTwin/riskEngine.js`

| Breakpoint | Value |
|---|---|
| Consequence `currentA` | `20 / 8` |
| Consequence `lengthM` | `10000` |
| Consequence `designLife` | `30` |
| Likelihood `trRatio` | `1.25 / 1.5 / 2.0` |
| Likelihood `resistivity` | `1000 / 3000` Ω·cm |

### 5.8 In `reporting/excelEngine.js::parseStationSheet` and `makeDefaultImportStation`

Real-looking values used as fallbacks (NOT placeholders flagged as such):

| Field | Value |
|---|---|
| `od` | `48` |
| `wallThk` | `0.875` |
| `lengthM` | `1000` |
| `opTempC` | `25` |
| `currentDensityBase` | `0.1` |
| `coatingType` | `'fusion_bonded_epoxy'` |
| `coatingEfficiency` | `0.98` |
| `startDepthM` | `15` |
| `anodeLengthM` | `2.13` |
| `anodeSpacingM` | `1.5` |
| `boreholeDiaM` | `0.25` |
| `cokeCoverM` | `2.5` |
| `cementPlugM` | `0.5` |
| `numHoles` | `1` |
| `anodeCount` | `9` |
| `tr.ratedVoltage` | `30` |
| `tr.ratedCurrent` | `25` |
| `tr.backEMF` | `2` |
| `tr.structureResistance` | `0.055` |
| `soilResistivity` | `500` |
| `actualRemotenesM` | `56` |
| `requiredRemotenesM` | `20` |
| `designLife` | `25` |
| `anodeTailLengths` | `Array(20).fill(30)` (fixed size — overflow risk) |

### 5.9 In `reporting/pdfGenerator.js`

| Field | Value |
|---|---|
| Page dimensions | `210 × 297 mm` (A4 portrait) |
| Page count estimate | `2 + stations.length * 2` (wrong when BOM empty) |
| Standard code fallbacks | `'17-SAMSS-003'`, `'17-SAMSS-016'`, `'17-SAMSS-008'`, `'17-SAMSS-020'`, `'17-855-011'`, `'17-SAMSS-007'` |
| Anode label fallback | `'HSCI Tubular TA-4'` |
| Date format | `en-GB` |
| AC input label | `"@ 480V/3Φ"` (hardcoded — does not read designBasis) |

### 5.10 In `engine/scenarios/scenarioRunner.js`

| Field | Value |
|---|---|
| Default `systemDesignLifeYears` | `25` (when project missing) |

### 5.11 In `engine/trace/calculationTraceEngine.js`

Hardcoded engineering values used to format the trace record:
- `in→m`: `0.0254`
- Spare factor: `1.30`
- Base temp: `30°C`
- Method switch: `'nace' → 'linear'`, else `'exponential'`
- Utilization factor: `0.85`
- Coke: `3.28 ft/m`, `39.2 lbs/ft annulus`, `50 lbs/bag`
- Groundbed validation target: `1.0 Ω` (Aramco)
- Default TR: `ratedVolts=30, ratedAmps=25, backEMF=2.0, structureResistance=0.055`
- Borehole fallback: `d=0.25 m`

### 5.12 In `constants/index.js`

The largest single hardcoded surface. Includes:
- `ANODE_SPECS` (5 types; `ZINC_RIBBON.outputAmps=0, weightKg=0` is a placeholder)
- `CABLE_SPECS` (6 sizes, 6 resistance values)
- `COATING_TYPES` (4 with efficiencies `0.98/0.99/0.95/0`)
- `SOIL_CLASSIFICATIONS` (4 bands)
- `THRESHOLDS` (spare factor, temp correction, base, TR efficiency, 70/90 % circuit limits, coke constants, anode utilization, 3-year design life margin, TR step)
- `DESIGN_MODES` (entries with `available: false`: `tank_bottom, plant_piping, sacrificial`)
- BOM standards (17-SAMSS-003/016/008/020, 17-855-011, 17-SAMSS-007)

### 5.13 In `engine/inputLinkRegistry.js`

`INPUT_LINKS` carries 10 declared inputs with their own defaults. These are *not* silent — they are surfaced as "Default" in the UI. The risk is only that consumers downstream may have their own local fallback (e.g. `PageTRSizing` falls back to `Math.min(100, v)`).

---

## 6. Forbidden operations — module contract

The following operations are **architectural violations** that will fail this audit:

| Module | Forbidden |
|---|---|
| Project Setup | Show pre-existing stations from a previous project on import; fabricate soil resistivity |
| Pipeline | Fabricate OD/wall/length values to "make the row visible" |
| Soil Resistivity | Auto-flip `source` to `wenner` or `layered` without user click |
| Current Requirement | Use a `spareFactor` other than the active standard's; compute `π × D × L` for any output that feeds downstream |
| Groundbed | Re-derive `activeLength`; use a soil resistivity not from designBasis |
| Cable Resistance | Display `totalCableResOhm` without first ensuring the engine was re-run |
| TR Sizing | Accept `tr.ratedVoltage > 100`; hardcode AC input label |
| Attenuation | Insert synthetic stations; accept a derived input without a state machine state |
| Validation | Re-run `runStationCalculations` per scenario cell (drift risk) |
| Optimizer | Apply an alternative that only updates 3 of 7 design parameters |
| Sensitivity | Hardcode scenario variants (`+3/-3 anodes`, `×1.5 depth`) — derive from standard |
| Compliance | Re-implement SAES rules that already exist in `standardsValidationEngine` |
| BOM | Recompute BOM quantities if `lastCalcResult` is stale |
| Report | Read from cache; print `Page X of Y` with a pre-computed total |
| Dashboard | Render engineering charts (`PipelineProfile`, `CableSchematic`, `GroundbedGeometry`, `AttenuationGraph`) |
| Digital Twin | Freeze `designRef` without a refresh trigger; produce health score > 0 when `lastCalcResult` is null |
| All | Catch errors silently in a way that leaves stale data on screen |
| All | Use a local copy of a constant that exists in `constants/index.js` |

---

## 7. Authority and pre-conditions for change

This matrix is the contract. Any change to:
- A field name in `lastCalcResult` → must update this matrix, `digitalTwin/*`, `reporting/*`, `engine/sensitivity`, `engine/optimizer`, `engine/trace`, `engine/rules`
- A field name in `station.*` → must update the same list plus `engine/standardsValidationEngine`
- A field name in `project.designBasis.*` → must update `engine/inputLinkRegistry.js` and `PageProjectSetup` defaults
- A constant in `constants/index.js::THRESHOLDS` → must update all slices that inline their own `* 1.3` or `* 0.85`

Until a corresponding entry is added to the matrix and validated, the change is a **silent drift**.
