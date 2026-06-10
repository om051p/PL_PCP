# Attenuation Module — Integration Guide

**Module:** `attenuation-module/`  
**Engine:** `attenuationEngine.js` v1.0.0  
**Standard:** NACE SP0169, ISO 15589-1  
**For:** Developers integrating this module into any application framework.

---

## 1. Overview

This module is a **self-contained CP attenuation calculation engine**. It takes pipeline, coating, soil, and CP station parameters as input and returns a complete potential profile along the pipeline, with per-station contributions, combined superposition, protection status at every km point, and design adequacy assessment.

The module has **zero runtime dependencies**. It can be integrated into:

- React / Vue / Angular SPA
- Node.js REST API
- Python application via subprocess
- Desktop application (Electron, Tauri)
- Mobile (React Native, with bundler)
- Serverless function (AWS Lambda, Vercel Edge)

---

## 2. File Integration Checklist

```
attenuation-module/
├── attenuationEngine.js      ← INTEGRATE THIS FILE
├── attenuationTypes.md       ← Reference for input/output shapes
├── ATTENUATION_ENGINE_SPEC.md← Engineering reference
├── attenuationDatasets.json  ← Sample data for dev/testing
├── attenuationVerification.md← Spot-check expected values
└── attenuationTests.js       ← Run in CI, not shipped to production
```

Only `attenuationEngine.js` is required at runtime. All other files are reference and test material.

---

## 3. Required Inputs

### 3.1 Mandatory Input Fields

The consuming application must collect and supply all of the following:

**Pipe Geometry and Material**

| Parameter | Field Name | Type | Unit | Typical Range |
|-----------|-----------|------|------|---------------|
| Outside diameter | `pipe.diameterInches` | number | inches | 4–60 |
| Wall thickness | `pipe.wallThicknessInches` | number | inches | 0.25–2.0 |
| Total pipe length | `pipe.totalLengthKm` | number | km | 0.1–500 |
| Protection length to X | `pipe.maxProtectionLengthKm` | number | km | 0.1–totalLengthKm |
| Steel resistivity | `pipe.steelResistivityMicroOhmCm` | number | µΩ·cm | 18 (default for carbon steel) |

**Coating and Soil**

| Parameter | Field Name | Type | Unit | Typical Range |
|-----------|-----------|------|------|---------------|
| Coating conductance | `coating.conductivityMicroSiemensPerM2` | number | µS/m² | 30–5000 |
| Soil resistivity | `coating.soilResistivityOhmCm` | number | Ω·cm | 100–50000 |
| Design current density | `coating.currentDensityMaPerM2` | number | mA/m² | 0.01–5.0 |

**Electrochemical Potentials**  
All as positive magnitudes vs Cu/CuSO₄ (e.g. −850 mV CSE → `850`)

| Parameter | Field Name | Type | Unit | Typical Range |
|-----------|-----------|------|------|---------------|
| Natural potential | `potentials.naturalMv` | number | mV | 400–700 |
| Drain point on-potential | `potentials.drainPointMv` | number | mV | 900–1500 |
| Minimum protection criterion | `potentials.minimumMv` | number | mV | 850–1000 |

**CP Stations** (array, min 1 entry)

| Field | Type | Required |
|-------|------|----------|
| `id` | string or number | Yes |
| `positionKm` | number (km chainage) | Yes |
| `label` | string (display name) | Optional |

**Profile Range** (optional — engine auto-infers if omitted)

| Field | Type | Description |
|-------|------|-------------|
| `profileConfig.startKm` | number | Start of km evaluation range |
| `profileConfig.endKm` | number | End of km evaluation range |
| `profileConfig.stepKm` | number | Evaluation interval (default 1.0 km) |

### 3.2 Input Construction

**Option A: Structured object (preferred)**
```js
import { runAttenuationAnalysis } from './attenuationEngine.js';

const input = {
  pipe: {
    diameterInches: 30,
    wallThicknessInches: 1.27,
    totalLengthKm: 44,
    maxProtectionLengthKm: 25,
    steelResistivityMicroOhmCm: 18,
  },
  coating: {
    conductivityMicroSiemensPerM2: 300,
    soilResistivityOhmCm: 1000,
    currentDensityMaPerM2: 0.175,
  },
  potentials: {
    naturalMv: 550,
    drainPointMv: 1100,
    minimumMv: 1000,
  },
  stations: [
    { id: 'CP3', positionKm: 44, label: 'CP#3 @ KM 44+635' },
    { id: 'CP4', positionKm: 69, label: 'CP#4 @ KM 69+017' },
  ],
  profileConfig: { startKm: 44, endKm: 89, stepKm: 1.0 },
};

const result = runAttenuationAnalysis(input);
```

**Option B: Flat parameter factory**
```js
import { buildAttenuationInput, runAttenuationAnalysis } from './attenuationEngine.js';

const input = buildAttenuationInput({
  diameterInches: 30,
  wallThicknessInches: 1.27,
  totalLengthKm: 44,
  maxProtectionLengthKm: 25,
  currentDensityMaPerM2: 0.175,
  soilResistivityOhmCm: 1000,
  naturalPotentialMv: 550,
  drainPointPotentialMv: 1100,
  minimumPotentialMv: 1000,
  stations: [{ id: 'CP1', positionKm: 44 }],
  profileStartKm: 44,
  profileEndKm: 89,
});

const result = runAttenuationAnalysis(input);
```

---

## 4. Required Outputs

### 4.1 Result Structure

`runAttenuationAnalysis(input)` always returns an `AttenuationResult` object. It never throws.

```js
{
  success:              Boolean,   // Always present — check this first
  errors:               String[],  // Populated if success === false
  warnings:             String[],  // Non-fatal; show to user
  intermediates:        Object,    // All derived calculation steps
  checkPointAssessment: Object,    // Single-station assessment at max protection length X
  profile:              Array,     // Potential at each km point
  stationReachKm:       Number,    // Max protection reach of single station (km)
  summary:              Object,    // High-level design adequacy
}
```

### 4.2 Consuming the Result

```js
const result = runAttenuationAnalysis(input);

if (!result.success) {
  // Show errors to user — calculation blocked
  result.errors.forEach(e => console.error(e));
  return;
}

// Show warnings if any
result.warnings.forEach(w => console.warn(w));

// Design adequacy
if (result.summary.designAdequate) {
  console.log('Design is adequate — full protection achieved');
} else {
  console.log('GAPS FOUND:', result.summary.unprotectedSegments);
}

// Intermediate values (for calculation report)
const { alpha, unitPipeResistance_OhmPerM, coatingLeakageResistance_OhmM } = result.intermediates;

// Check point (single-station assessment)
const { criterionMet, potentialCalculated_mV, deficitVolts } = result.checkPointAssessment;

// Profile data for chart
result.profile.forEach(point => {
  console.log(`KM ${point.km}: ${point.combinedPotentialMv.toFixed(1)} mV — ${point.isProtected ? 'OK' : 'FAIL'}`);
});
```

---

## 5. State Requirements

The engine is **stateless**. The consuming application is responsible for managing state.

### Minimum recommended state shape

```js
// Application state — example using any state manager
{
  attenuationInput: AttenuationInput | null,       // Current input parameters
  attenuationResult: AttenuationResult | null,     // Current calculation result
  isCalculating: Boolean,                          // Loading flag (sync engine: always false)
  lastCalculatedAt: Timestamp | null,              // Audit trail
  isDirty: Boolean,                                // Input changed since last calc
}
```

### Recalculation trigger

The engine is synchronous and fast (< 5ms for typical inputs). Recalculate on every significant input change. Do not debounce excessively — immediate feedback is the expected UX.

```js
// Example React hook pattern
function useAttenuation(input) {
  return useMemo(() => {
    if (!input) return null;
    return runAttenuationAnalysis(input);
  }, [input]);
}
```

---

## 6. UI Requirements

The following UI elements are required for a complete implementation. The engine does not prescribe the UI framework or component library.

### 6.1 Input Form Fields

| Section | Field | Input Type | Constraint |
|---------|-------|-----------|------------|
| Pipe | Outside diameter (in) | Numeric | > 0 |
| Pipe | Wall thickness (in) | Numeric | > 0, < D/2 |
| Pipe | Total length (km) | Numeric | > 0 |
| Pipe | Max protection length L_X (km) | Numeric | > 0 |
| Pipe | Steel resistivity (µΩ·cm) | Numeric (default 18) | > 0 |
| Coating | Conductance (µS/m²) | Numeric | > 0 |
| Coating | Soil resistivity (Ω·cm) | Numeric | > 0 |
| Coating | Current density (mA/m²) | Numeric | > 0 |
| Potentials | Natural potential (mV) | Numeric | > 0 |
| Potentials | Drain point potential (mV) | Numeric | > natural |
| Potentials | Minimum potential (mV) | Numeric | > natural |
| Stations | Station table: id, KM position, label | Table + add/remove | ≥ 1 row |
| Profile | Start KM, End KM, Step KM | Numeric | startKm < endKm, step > 0 |

### 6.2 Validation Feedback

- Show `result.errors[]` as blocking error messages (prevent form submission or clear results)
- Show `result.warnings[]` as non-blocking info banners
- Highlight the specific field that caused each error (map VAL-xxx codes to field names)

### 6.3 Results Display — Calculation Summary Table

Display all `result.intermediates` values in a two-column table:

| Calculated Value | Result | Unit |
|-----------------|--------|------|
| Steel cross-section area (Ax) | `pipeSteelAreaM2` | m² |
| Unit surface area (A1) | `unitSurfaceAreaM2PerM` | m²/m |
| Surface area to X | `surfaceAreaToX_M2` | m² |
| Current required to X | `currentRequiredToX_A` | A |
| Current required total | `currentRequiredTotal_A` | A |
| Unit pipe resistance (RS) | `unitPipeResistance_OhmPerM` | Ω/m |
| Coating leakage resistivity (RL) | `coatingLeakageResistance_OhmM` | Ω·m |
| Attenuation constant (α) | `alpha` | /m |
| Drain point swing (ΔE₀) | `deltaE0_V` | V |
| Required swing at X | `deltaERequired_V` | V |

### 6.4 Results Display — Check Point Assessment

| Field | Source |
|-------|--------|
| Distance to check point X | `checkPointAssessment.checkPointKm` km |
| Calculated swing at X | `checkPointAssessment.deltaECalculated_V` V |
| Calculated potential at X | `checkPointAssessment.potentialCalculated_mV` mV |
| Criterion met | `checkPointAssessment.criterionMet` → PASS / FAIL badge |
| Deficit | `checkPointAssessment.deficitVolts` V (show if FAIL) |

### 6.5 Results Display — Design Summary

| Field | Source |
|-------|--------|
| Protection reach per station | `summary.stationReachKm` km |
| Min combined potential | `summary.minCombinedPotentialMv` mV |
| Max combined potential | `summary.maxCombinedPotentialMv` mV |
| Protection coverage | `summary.protectionPercentage` % |
| Design adequate | `summary.designAdequate` → PASS / FAIL |
| Unprotected segments | `summary.unprotectedSegments[]` → list table |

---

## 7. Chart Requirements

### 7.1 Primary Chart — Potential Profile

**Chart type:** Line chart (XY/scatter)  
**X axis:** Pipeline chainage (km)  
**Y axis:** Pipe potential (mV, positive magnitudes)

**Required series:**

| Series | Data Source | Style |
|--------|------------|-------|
| Combined Potential | `profile[].combinedPotentialMv` | Solid bold line (primary colour) |
| Station n individual | `profile[].perStation[n].potentialV × 1000` | Dashed lines (one per station) |
| Protection Criterion | Horizontal line at `potentials.minimumMv` | Red dashed horizontal |
| Natural Potential | Horizontal line at `potentials.naturalMv` | Grey dashed horizontal |

**Annotations:**
- Vertical marker at each station's `positionKm` with label
- Shade regions where `combinedPotentialMv < minimumMv` in red (unprotected zones)
- Shade regions where combined exceeds criterion in green

**Tooltip:** On hover show `km`, `combinedPotentialMv`, `isProtected`, and per-station contributions.

**Data preparation:**
```js
// X axis data
const xData = result.profile.map(p => p.km);

// Combined series
const combinedSeries = result.profile.map(p => p.combinedPotentialMv);

// Per-station series (one per station)
const stationSeries = result.profile[0].perStation.map((_, stationIdx) => ({
  label: `Station ${result.profile[0].perStation[stationIdx].stationId}`,
  data: result.profile.map(p => p.perStation[stationIdx].potentialV * 1000),
}));

// Reference lines
const criterionLine = new Array(xData.length).fill(input.potentials.minimumMv);
const naturalLine   = new Array(xData.length).fill(input.potentials.naturalMv);
```

### 7.2 Secondary Chart — Protection Status Bar

**Chart type:** Segmented horizontal bar or heat-map row  
**X axis:** Pipeline chainage (km)  
**Color encoding:** Green = protected, Red = unprotected  
**Data source:** `profile[].isProtected`

This is optional but strongly recommended for quick visual assessment of coverage.

### 7.3 Chart Library Recommendations

The engine is library-agnostic. Tested with:
- **Recharts** (React) — use `<ComposedChart>` with `<Line>` and `<ReferenceLine>`
- **Chart.js** — use `scatter` type with custom annotations plugin
- **D3.js** — full control for custom shading and annotations
- **Plotly.js** — good for engineering reports with PDF export

---

## 8. Reporting Requirements

### 8.1 Minimum Report Content

A generated report must include:

1. **Project header** — project name, pipeline ID, date, engineer
2. **Input parameters table** — all `AttenuationInput` fields with units
3. **Intermediate calculations table** — all `result.intermediates` values
4. **Check point assessment** — single-station result at L_X
5. **Station reach** — `summary.stationReachKm` km
6. **Design adequacy verdict** — PASS / FAIL with criterion value
7. **Unprotected segments** — table of `summary.unprotectedSegments` (if any)
8. **Potential profile chart** — embedded image (PNG or SVG)
9. **Profile data table** — km, combined mV, isProtected, per-station mV

### 8.2 Profile Table Format

```
KM    | Protection | Combined (mV) | CP3 (mV) | CP4 (mV) | CP5 (mV) | CP6 (mV)
------|-----------|---------------|----------|----------|----------|----------
44    | ✅        | 1960.6        | 1100.0   | 894.3    | 850.6    | 765.7
45    | ✅        | 1990.4        | 1099.5   | 905.5    | 861.3    | 774.1
...
```

### 8.3 Report Generation Notes

- The engine does not generate reports — this is the application's responsibility
- `result.intermediates` contains all values needed for a calculation sheet
- Profile data can be exported to CSV: `profile.map(p => [p.km, p.combinedPotentialMv, p.isProtected, ...p.perStation.map(s => s.potentialV * 1000)])`
- For PDF generation: render the chart to canvas, export as base64, embed in PDF

---

## 9. Error Handling Strategy

```js
const result = runAttenuationAnalysis(input);

// Strategy 1: Block on errors
if (!result.success) {
  showErrorBanner(result.errors);
  clearResults();
  return;
}

// Strategy 2: Show warnings but continue
if (result.warnings.length > 0) {
  showWarningBanner(result.warnings);
}

// Strategy 3: Show design fail prominently
if (!result.summary.designAdequate) {
  showDesignFailAlert(result.summary.unprotectedSegments);
}

// Render results regardless of design adequacy
renderResults(result);
```

---

## 10. Performance Considerations

| Scenario | Typical Execution Time |
|----------|----------------------|
| 50-point profile, 4 stations | < 1 ms |
| 500-point profile, 10 stations | < 5 ms |
| 5000-point profile, 20 stations | < 50 ms |

The engine is synchronous. For very high-resolution profiles (step < 0.1 km, long pipelines), consider:
- Running in a Web Worker (browser) to avoid blocking the UI thread
- Running in a worker thread (Node.js)
- Reducing step size only for final report output

```js
// Web Worker example
// worker.js
self.onmessage = (e) => {
  const { runAttenuationAnalysis } = require('./attenuationEngine.js');
  const result = runAttenuationAnalysis(e.data);
  self.postMessage(result);
};

// main.js
const worker = new Worker('./worker.js');
worker.postMessage(input);
worker.onmessage = (e) => renderResults(e.data);
```

---

## 11. Module Import Patterns

**CommonJS (Node.js, Electron)**
```js
const engine = require('./attenuationEngine.js');
const result = engine.runAttenuationAnalysis(input);
```

**ES Module (bundler with Vite/Webpack)**  
Add `export` statements to the engine file or use a thin ESM wrapper:
```js
// attenuationEngine.esm.js
export * from './attenuationEngine.js';
```

**Python subprocess (Django, Flask)**
```python
import subprocess, json

result = subprocess.run(
    ['node', 'run_attenuation.js'],
    input=json.dumps(input_data),
    capture_output=True, text=True
)
output = json.loads(result.stdout)
```

```js
// run_attenuation.js (thin CLI wrapper)
const engine = require('./attenuationEngine.js');
const input = JSON.parse(process.stdin.read());
process.stdout.write(JSON.stringify(engine.runAttenuationAnalysis(input)));
```

**REST API endpoint (Express)**
```js
const engine = require('./attenuationEngine.js');

app.post('/api/attenuation/calculate', (req, res) => {
  const result = engine.runAttenuationAnalysis(req.body);
  res.json(result);
});
```

---

## 12. Integration Verification Checklist

Before deploying, verify the following against `attenuationVerification.md`:

- [ ] Run `node attenuationTests.js` → 184 tests pass
- [ ] Feed DS-001 (BB-2 reference dataset) and verify `intermediates.alpha` = 4.1804×10⁻⁵ /m
- [ ] Verify combined potential at KM 44 = 1960.6 mV
- [ ] Verify `summary.designAdequate = true` for DS-001
- [ ] Verify `checkPointAssessment.criterionMet = false` for DS-001 (single-station only)
- [ ] Chart renders profile from KM 44 to KM 89 with correct bell-curve shape
- [ ] Protection criterion line renders at 1000 mV (DS-001)
- [ ] All 46 profile points show `isProtected = true` for DS-001

---

## 13. Not Included (Future Extension Points)

The following are outside this module's scope but the engine is designed to accommodate:

| Feature | Extension Point |
|---------|----------------|
| Per-station drain point potential | `CPStation.drainPointMv` (currently ignored; global used) |
| Pipe segments with different coating | Split pipeline into segments, run engine per segment |
| Temperature correction of coating conductance | Pre-correct `conductivityMicroSiemensPerM2` before passing in |
| AC interference modelling | Post-process profile — add AC contribution to each point |
| Casing sections | Mask `isProtected` for known-cased km ranges |
| Seasonal resistivity variation | Run engine twice (wet/dry) and overlay profiles |
