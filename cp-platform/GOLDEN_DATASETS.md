# Golden Datasets — CP Designer ICCP Platform

**Version:** 2.0  
**Purpose:** Reference input/output pairs for regression testing and engineering verification.

---

## Dataset 1: Standard Deepwell — Tie-In Section

### Source
Excel reference: "PCP Calculation sheet.xlsx" — Station 1: Deepwell, Tie-In

### Input
```json
{
  "station": {
    "name": "ICCP Station-1 (Deepwell, Tie-In)",
    "pipelineSegments": [{
      "od": 48, "lengthM": 292, "opTempC": 57.22,
      "currentDensityBase": 0.1, "coatingEfficiency": 0.98
    }],
    "groundbed": {
      "type": "deepwell", "startDepthM": 15,
      "anodeLengthM": 2.13, "anodeSpacingM": 1.5,
      "boreholeDiaM": 0.25, "cokeCoverM": 2.5, "cementPlugM": 0.5
    },
    "anodeSpec": { "weightKg": 38.6, "consumptionRate": 0.45, "outputAmps": 3.56 },
    "proposedAnodes": 9,
    "cables": {
      "anodeTailLengths": [25,30,35,40,45,50,55,60,65],
      "anodeCableSizeMm2": 16, "posMainLengthM": 180, "posMainSizeMm2": 35,
      "negMainLengthM": 100, "negMainSizeMm2": 35, "negSecLengthM": 60, "negSecSizeMm2": 25
    },
    "tr": { "ratedVoltage": 30, "ratedCurrent": 25, "backEMF": 2, "structureResistance": 0.055 },
    "soilResistivityOhmCm": 361,
    "actualRemotenesM": 56, "requiredRemotenesM": 20,
    "designLifeYears": 25
  },
  "systemDesignLifeYears": 25
}
```

### Expected Output
```json
{
  "totalSurfaceAreaM2": 1118.43,
  "requiredCurrentA": 0.2019,
  "designCurrentA": 0.2625,
  "groundbedResistanceOhm": 0.1135,
  "activeLengthM": 31.17,
  "totalDrillDepthM": 49.17,
  "anodeTailParallelResOhm": 0.007627,
  "posMainCableResOhm": 0.1186,
  "negMainCableResOhm": 0.1291,
  "totalCableResOhm": 0.2553,
  "backEMFResistanceOhm": 0.16,
  "totalCircuitResistanceOhm": 0.5839,
  "minTRVoltage": 16.60,
  "designLifeYears": 30.88
}
```

### Verification Status: ✅ PASS
All values match within engineering tolerance (<0.5% error).

---

## Dataset 2: Standard Deepwell — Main Line

### Source
Excel reference: "PCP Calculation sheet.xlsx" — Station 1: Deepwell, Main Line

### Input
```json
{
  "station": {
    "pipelineSegments": [{
      "od": 48, "lengthM": 41480, "opTempC": 57.22,
      "currentDensityBase": 0.1, "coatingEfficiency": 0.98
    }],
    "groundbed": { "type": "deepwell", "startDepthM": 15, "anodeLengthM": 2.13, "anodeSpacingM": 1.5, "boreholeDiaM": 0.25, "cokeCoverM": 2.5, "cementPlugM": 0.5 },
    "anodeSpec": { "weightKg": 38.6, "consumptionRate": 0.45, "outputAmps": 3.56 },
    "proposedAnodes": 9,
    "cables": { "anodeTailLengths": [25,30,35,40,45,50,55,60,65], "anodeCableSizeMm2": 16, "posMainLengthM": 180, "posMainSizeMm2": 35, "negMainLengthM": 100, "negMainSizeMm2": 35, "negSecLengthM": 60, "negSecSizeMm2": 25 },
    "tr": { "ratedVoltage": 30, "ratedCurrent": 25, "backEMF": 2, "structureResistance": 0.055 },
    "soilResistivityOhmCm": 361, "actualRemotenesM": 56, "requiredRemotenesM": 20,
    "designLifeYears": 25
  },
  "systemDesignLifeYears": 25
}
```

### Expected Output
```json
{
  "totalSurfaceAreaM2": 158877.93,
  "requiredCurrentA": 28.6854,
  "designCurrentA": 37.2910
}
```

### Verification Status: ✅ PASS

---

## Dataset 3: Shallow Vertical Groundbed

### Input
```json
{
  "station": {
    "pipelineSegments": [{ "od": 48, "lengthM": 292, "opTempC": 57.22, "currentDensityBase": 0.1, "coatingEfficiency": 0.98 }],
    "groundbed": { "type": "shallow_vertical", "startDepthM": 3, "anodeLengthM": 2.13, "anodeSpacingM": 1.5, "boreholeDiaM": 0.25, "cokeCoverM": 0, "cementPlugM": 0 },
    "anodeSpec": { "weightKg": 38.6, "consumptionRate": 0.45, "outputAmps": 3.56 },
    "proposedAnodes": 12,
    "cables": { "anodeTailLengths": Array(12).fill(30), "anodeCableSizeMm2": 16, "posMainLengthM": 180, "posMainSizeMm2": 35, "negMainLengthM": 100, "negMainSizeMm2": 35, "negSecLengthM": 60, "negSecSizeMm2": 25 },
    "tr": { "ratedVoltage": 50, "ratedCurrent": 40, "backEMF": 2, "structureResistance": 0.055 },
    "soilResistivityOhmCm": 5000, "actualRemotenesM": 56, "requiredRemotenesM": 20,
    "designLifeYears": 25
  },
  "systemDesignLifeYears": 25
}
```

### Expected Behavior
- Groundbed resistance > deepwell equivalent (higher resistivity, shorter active length)
- R_G ≈ Sunde formula result
- Design life: ~25.7 years (adequate but marginal)

---

## Dataset 4: Edge Case — High Soil Resistivity

### Input
```json
{
  "soilResistivityOhmCm": 80000,
  "proposedAnodes": 20
}
```

### Expected Behavior
- Groundbed resistance very high: ~200+ Ω
- BR-002: FAIL (R_G >> max allowable)
- BR-001: FAIL (V_min >> V_rated)
- Proactive insight "High Soil Resistivity Detected" with severity=error
- Recommendation: "Very high resistivity. Deepwell groundbed reaching ≥60m depth..."

---

## Dataset 5: Edge Case — Undersized TR

### Input
```json
{
  "tr": { "ratedVoltage": 10, "ratedCurrent": 5 },
  "proposedAnodes": 4
}
```

### Expected Behavior
- BR-001: FAIL (10V < V_min)
- BR-005: FAIL (design life < 25 years with 4 anodes)
- allPassed: false
- Insights: TR Voltage Insufficient, Design Life Insufficient

---

## Dataset 6: Edge Case — Zero Values

### Input
```json
{
  "proposedAnodes": 0,
  "pipelineSegments": []
}
```

### Expected Behavior
- All current results: 0
- Groundbed resistance: 999 (sentinel)
- Design life: 0
- No crash, controlled degradation

---

## Golden Dataset Comparison Methodology

For regression testing:
1. Pre-compute expected values with documented hand calculations
2. Run `runStationCalculations(station, life)` 
3. Compare each output field with tolerance:
   - Electrical: ±0.5% or ±0.001Ω (whichever is larger)
   - Dimensions: ±0.1% or ±0.01m²
   - Life: ±0.1 years
4. Mark PASS if all fields within tolerance
5. Mark FAIL if any field exceeds tolerance

## Regression Test Script Template

```javascript
import { runStationCalculations } from '../engine/modules/calculations.js'

const GOLDEN = [
  { name: 'Dataset 1: Deepwell Tie-In', station: {...}, life: 25, expected: {...} },
  { name: 'Dataset 2: Deepwell Main Line', station: {...}, life: 25, expected: {...} },
  // ... all 6 datasets
]

describe('Golden Dataset Regression', () => {
  GOLDEN.forEach(({ name, station, life, expected }) => {
    it(name, () => {
      const result = runStationCalculations(station, life)
      Object.entries(expected).forEach(([key, value]) => {
        expect(result[key]).toBeCloseTo(value, 2)
      })
    })
  })
})
```
