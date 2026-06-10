# attenuationTypes.md

# Attenuation Module — Type Definitions

All types are documented as plain JavaScript object shapes.  
TypeScript interfaces are provided in the appendix for typed projects.

---

## 1. Input Types

---

### `AttenuationInput`

Top-level input object passed to `runAttenuationAnalysis()`.

```js
{
  pipe:          PipeParameters,      // Required
  coating:       CoatingParameters,   // Required
  potentials:    PotentialCriteria,   // Required
  stations:      CPStation[],         // Required — min 1 station
  profileConfig: ProfileConfig,       // Optional — defaults applied if omitted
}
```

---

### `PipeParameters`

Physical and material properties of the pipeline.

| Field | Type | Unit | Required | Description |
|-------|------|------|----------|-------------|
| `diameterInches` | number | inches | ✅ | Pipe outside diameter |
| `wallThicknessInches` | number | inches | ✅ | Pipe wall thickness |
| `totalLengthKm` | number | km | ✅ | Total pipe length from drain point (longest path) |
| `maxProtectionLengthKm` | number | km | ✅ | Distance from drain point to check point X |
| `steelResistivityMicroOhmCm` | number | µΩ·cm | ✅ | Steel resistivity — default 18 for carbon steel |

```js
// Example
{
  diameterInches: 30,
  wallThicknessInches: 1.27,
  totalLengthKm: 44,
  maxProtectionLengthKm: 25,
  steelResistivityMicroOhmCm: 18
}
```

---

### `CoatingParameters`

Coating condition and soil environment properties.

| Field | Type | Unit | Required | Description |
|-------|------|------|----------|-------------|
| `conductivityMicroSiemensPerM2` | number | µS/m² | ✅ | Coating conductance at 1000 Ω·cm reference soil |
| `soilResistivityOhmCm` | number | Ω·cm | ✅ | Average soil resistivity along route |
| `currentDensityMaPerM2` | number | mA/m² | ✅ | Design current density (coating condition) |

```js
// Example — aged FBE, 1000 Ω·cm soil
{
  conductivityMicroSiemensPerM2: 300,
  soilResistivityOhmCm: 1000,
  currentDensityMaPerM2: 0.175
}
```

**Guidance for `conductivityMicroSiemensPerM2`:**

| Coating Condition | Typical g (µS/m²) |
|-------------------|--------------------|
| New FBE / PE | 30–100 |
| Fair (5–10 yr) | 100–200 |
| Aged / Fair (25 yr) | 300 (spreadsheet value) |
| Damaged / Bare | 1000–5000 |

---

### `PotentialCriteria`

Electrochemical potential thresholds.  
All values are **positive magnitudes** in millivolts vs Cu/CuSO₄.  
(−850 mV CSE → 850 in this convention)

| Field | Type | Unit | Required | Description |
|-------|------|------|----------|-------------|
| `naturalMv` | number | mV | ✅ | Free-corrosion (natural) pipe potential |
| `drainPointMv` | number | mV | ✅ | Maximum on-potential at the TR drain point |
| `minimumMv` | number | mV | ✅ | Minimum required on-potential for protection |

```js
// Example — NACE criterion
{
  naturalMv: 550,     // −550 mV CSE free corrosion
  drainPointMv: 1100, // −1100 mV CSE at TR
  minimumMv: 1000     // −1000 mV CSE minimum (NACE −850 mV or −1000 mV depending on standard)
}
```

---

### `CPStation`

A single cathodic protection drain point (TR location or groundbed).

| Field | Type | Unit | Required | Description |
|-------|------|------|----------|-------------|
| `id` | string \| number | — | ✅ | Unique station identifier |
| `positionKm` | number | km | ✅ | Chainage position of the drain point |
| `label` | string | — | ❌ | Human-readable name (e.g., "CP#3 KRT-122") |
| `drainPointMv` | number | mV | ❌ | Station-specific drain point potential (overrides global if set) |

```js
// Example — four stations from the BB-2 project
[
  { id: "CP3",  positionKm: 44,  label: "CP#3 @ KM 44+635" },
  { id: "CP4",  positionKm: 69,  label: "CP#4 KRT-122 @ KM 69+017" },
  { id: "CP5",  positionKm: 73,  label: "CP#5 KRT-122 @ KM 73+300" },
  { id: "CP6",  positionKm: 82,  label: "CP#6 KRT-131 @ KM 82+520" }
]
```

> **Note:** The current engine uses a single global `drainPointMv` for all stations
> (matching the spreadsheet model). Per-station override is reserved for future extension.

---

### `ProfileConfig`

Controls the km range and resolution of the potential profile output.

| Field | Type | Unit | Required | Description |
|-------|------|------|----------|-------------|
| `startKm` | number | km | ✅ | Profile start chainage |
| `endKm` | number | km | ✅ | Profile end chainage |
| `stepKm` | number | km | ❌ | Evaluation step size (default: 1.0 km) |

```js
{
  startKm: 44,
  endKm: 89,
  stepKm: 1.0
}
```

---

## 2. Output Types

---

### `AttenuationResult`

Top-level result object returned by `runAttenuationAnalysis()`.

```js
{
  success:              boolean,               // Whether calculation succeeded
  errors:               string[],              // Validation errors (empty if success)
  warnings:             string[],              // Non-fatal warnings
  intermediates:        IntermediateValues,    // All derived calculation values
  checkPointAssessment: CheckPointResult,      // Assessment at point X
  profile:              PotentialProfilePoint[], // Full potential profile
  stationReachKm:       number | null,         // Max protection km from single station
  summary:              AnalysisSummary,       // High-level design summary
}
```

---

### `IntermediateValues`

All intermediate calculated values — useful for calculation reports and debugging.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `pipeSteelAreaM2` | number | m² | Cross-sectional area of pipe steel (Ax) |
| `unitSurfaceAreaM2PerM` | number | m²/m | Pipe circumference (A1) |
| `surfaceAreaToX_M2` | number | m² | Total surface area to check point X |
| `surfaceAreaTotal_M2` | number | m² | Total surface area full pipe length |
| `currentRequiredToX_A` | number | A | Current required to protect to check point X |
| `currentRequiredTotal_A` | number | A | Current required for full pipe length |
| `unitPipeResistance_OhmPerM` | number | Ω/m | Unit longitudinal pipe resistance (RS) |
| `coatingLeakageResistance_OhmM` | number | Ω·m | Coating leakage resistivity (RL) |
| `alpha` | number | /m | Attenuation constant (α) |
| `deltaE0_V` | number | V | Drain point potential swing |
| `deltaERequired_V` | number | V | Required potential swing at point X |

---

### `CheckPointResult`

Detailed assessment at the design check point X (distance `maxProtectionLengthKm` from drain point).

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `checkPointKm` | number | km | Distance to check point |
| `deltaE0Volts` | number | V | Applied potential swing at drain point |
| `deltaERequired_V` | number | V | Minimum required swing at X |
| `deltaECalculated_V` | number | V | Calculated actual swing at X |
| `potentialCalculated_V` | number | V | Resulting potential at X |
| `potentialCalculated_mV` | number | mV | Same, in millivolts |
| `criterionMet` | boolean | — | Whether protection criterion is met at X |
| `deficitVolts` | number | V | Shortfall if criterion not met (0 if met) |

---

### `PotentialProfilePoint`

A single point in the potential profile along the pipeline.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `km` | number | km | Pipeline chainage (position) |
| `combinedPotentialV` | number | V | Combined (superimposed) potential from all stations |
| `combinedPotentialMv` | number | mV | Same, in millivolts |
| `isProtected` | boolean | — | Whether combined potential meets minimumMv |
| `perStation` | PerStationPoint[] | — | Individual contribution from each station |

---

### `PerStationPoint`

Individual station contribution at a profile point.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `stationId` | string \| number | — | Station identifier |
| `stationPositionKm` | number | km | Station drain point position |
| `potentialV` | number | V | Potential at this km due to this station alone |

---

### `AnalysisSummary`

High-level design adequacy summary.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `totalProfilePoints` | number | — | Total number of evaluated km points |
| `protectedPoints` | number | — | Points meeting minimum potential criterion |
| `unprotectedPoints` | number | — | Points below minimum potential criterion |
| `protectionPercentage` | number | % | Percentage of profile that is protected |
| `minCombinedPotentialV` | number | V | Minimum combined potential along profile |
| `maxCombinedPotentialV` | number | V | Maximum combined potential along profile |
| `minCombinedPotentialMv` | number | mV | Same, in millivolts |
| `maxCombinedPotentialMv` | number | mV | Same, in millivolts |
| `criterionMv` | number | mV | Applied protection criterion |
| `stationReachKm` | number \| null | km | Calculated max reach of a single station |
| `unprotectedSegments` | UnprotectedSegment[] | — | List of unprotected km segments |
| `designAdequate` | boolean | — | True if no unprotected segments exist |

---

### `UnprotectedSegment`

A contiguous km range where combined potential is below minimum criterion.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `startKm` | number | km | Start of unprotected segment |
| `endKm` | number | km | End of unprotected segment |
| `minPotentialV` | number | V | Worst-case potential within segment |

---

### `ValidationResult`

Returned by `validateAttenuationInput()`.

| Field | Type | Description |
|-------|------|-------------|
| `valid` | boolean | True if no errors |
| `errors` | string[] | Fatal errors that prevent calculation |
| `warnings` | string[] | Non-fatal issues to flag to the user |

---

## 3. TypeScript Interface Appendix

For TypeScript projects, use the following interfaces:

```typescript
// ── Input Types ─────────────────────────────────────────────────────────────

interface PipeParameters {
  diameterInches: number;
  wallThicknessInches: number;
  totalLengthKm: number;
  maxProtectionLengthKm: number;
  steelResistivityMicroOhmCm: number;
}

interface CoatingParameters {
  conductivityMicroSiemensPerM2: number;
  soilResistivityOhmCm: number;
  currentDensityMaPerM2: number;
}

interface PotentialCriteria {
  naturalMv: number;
  drainPointMv: number;
  minimumMv: number;
}

interface CPStation {
  id: string | number;
  positionKm: number;
  label?: string;
  drainPointMv?: number;
}

interface ProfileConfig {
  startKm: number;
  endKm: number;
  stepKm?: number;
}

interface AttenuationInput {
  pipe: PipeParameters;
  coating: CoatingParameters;
  potentials: PotentialCriteria;
  stations: CPStation[];
  profileConfig?: ProfileConfig;
}

// ── Output Types ─────────────────────────────────────────────────────────────

interface IntermediateValues {
  pipeSteelAreaM2: number;
  unitSurfaceAreaM2PerM: number;
  surfaceAreaToX_M2: number;
  surfaceAreaTotal_M2: number;
  currentRequiredToX_A: number;
  currentRequiredTotal_A: number;
  unitPipeResistance_OhmPerM: number;
  coatingLeakageResistance_OhmM: number;
  alpha: number;
  deltaE0_V: number;
  deltaERequired_V: number;
}

interface CheckPointResult {
  checkPointKm: number;
  deltaE0Volts: number;
  deltaERequired_V: number;
  deltaECalculated_V: number;
  potentialCalculated_V: number;
  potentialCalculated_mV: number;
  criterionMet: boolean;
  deficitVolts: number;
}

interface PerStationPoint {
  stationId: string | number;
  stationPositionKm: number;
  potentialV: number;
}

interface PotentialProfilePoint {
  km: number;
  combinedPotentialV: number;
  combinedPotentialMv: number;
  isProtected: boolean;
  perStation: PerStationPoint[];
}

interface UnprotectedSegment {
  startKm: number;
  endKm: number;
  minPotentialV: number;
}

interface AnalysisSummary {
  totalProfilePoints: number;
  protectedPoints: number;
  unprotectedPoints: number;
  protectionPercentage: number;
  minCombinedPotentialV: number;
  maxCombinedPotentialV: number;
  minCombinedPotentialMv: number;
  maxCombinedPotentialMv: number;
  criterionMv: number;
  stationReachKm: number | null;
  unprotectedSegments: UnprotectedSegment[];
  designAdequate: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface AttenuationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  intermediates: IntermediateValues | null;
  checkPointAssessment: CheckPointResult | null;
  profile: PotentialProfilePoint[] | null;
  stationReachKm: number | null;
  summary: AnalysisSummary | null;
}
```
