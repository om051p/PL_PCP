# Acceptance Test Report — CP Designer ICCP Platform v2.0

**Date:** June 2026  
**RC:** RC-1  
**Test Suite:** `engineeringAcceptance.test.js` (30 tests)

---

## 1. Hand Calculation Verification

Every module-level function verified against independent hand calculations.

| Function | Input | Expected | Actual | Variance | Tolerance | Status |
|----------|-------|----------|--------|----------|-----------|--------|
| `calcSurfaceArea` | 48in, 292m | 1118.43 m² | 1118.43 m² | ±0.01% | ±0.1% | ✅ |
| `calcTempCorrectedCurrentDensity` | 0.1, 57.22°C | 0.18055 mA/m² | 0.18055 mA/m² | ±0.01% | ±0.1% | ✅ |
| `calcCurrentRequirement` (bare) | — | 0.2019 A | 0.2019 A | ±0.01% | ±0.5% | ✅ |
| `calcCurrentRequirement` (design) | — | 0.2625 A | 0.2625 A | ±0.01% | ±0.5% | ✅ |
| `calcDeepwellGroundbedResistance` | Dwight params | 0.1135 Ω | 0.1135 Ω | ±0.01% | ±0.1% | ✅ |
| `calcAnodeTailParallelResistance` | 9 tails | 0.007627 Ω | 0.007627 Ω | ±0.01% | ±0.1% | ✅ |
| `calcMainCableResistance` | pos. cable | 0.1186 Ω | 0.1186 Ω | ±0.01% | ±0.1% | ✅ |
| `calcDesignLife` | 9 anodes | 30.88 yrs | 30.88 yrs | ±0.01% | ±0.1% | ✅ |

**Result: 8/8 module-level functions match independent hand calculations.**

---

## 2. Golden Dataset Regression

Six golden datasets verified against Excel reference values.

| Dataset | Type | Fields | Max Variance | Status |
|---------|------|--------|-------------|--------|
| 1 | Deepwell Tie-In | 15 | <0.5% | ✅ |
| 2 | Deepwell Main Line | 6 | <0.5% | ✅ |
| 3 | Shallow Vertical | 4 | <0.5% | ✅ |
| 4 | High Resistivity | 4 | <0.5% | ✅ |
| 5 | Small TR | 4 | <0.5% | ✅ |
| 6 | Zero Values | 3 | No crash | ✅ |

**Result: 6/6 datasets pass. No regressions from Excel reference.**

---

## 3. Variance Analysis

Parameter-level accuracy measured across all datasets.

| Metric | Result | Threshold | Status |
|--------|--------|-----------|--------|
| Max variance across all parameters | <0.5% | <0.5% | ✅ |
| Surface area accuracy | ±0.01% | ±0.1% | ✅ |
| Groundbed resistance accuracy | ±0.1% | ±0.5% | ✅ |
| Design life accuracy | ±0.1% | ±0.5% | ✅ |

**Result: All parameters within engineering tolerance.**

---

## 4. Formula Correctness

| Property | Status |
|----------|--------|
| Surface area scales linearly with length | ✅ |
| Surface area scales linearly with diameter | ✅ |
| Temperature correction is linear with T | ✅ |
| Design current = required × 1.3 | ✅ |
| Dwight resistance increases with soil resistivity | ✅ |
| Dwight resistance decreases with active length | ✅ |
| Anode tail parallel resistance < any single tail | ✅ |
| Total circuit resistance = sum of all components | ✅ |
| Min TR voltage = R_T × I_rated + V_emf | ✅ |
| Design life halves when current doubles | ✅ |
| Design life scales linearly with anode count | ✅ |

**Result: 11/11 formula correctness properties verified.**

---

## 5. Edge Cases

| Case | Behavior | Status |
|------|----------|--------|
| High resistivity (100,000 Ω·cm) | Groundbed resistance elevated, no crash | ✅ |
| Undersized TR (V_min > V_rated) | Flagged in validation checks | ✅ |
| Zero values (0 OD, 0 length) | Controlled degradation, no crash | ✅ |
| Negative temperature | `Math.max(0, ...)` guard applied | ✅ |
| Zero anode count | Guarded in `generateAlternatives` | ✅ |

**Result: All edge cases handled gracefully.**

---

## 6. Summary

| Category | Pass | Fail | Coverage |
|----------|------|------|----------|
| Hand calc verification | 8 | 0 | 100% |
| Golden dataset regression | 6 | 0 | 100% |
| Formula correctness | 11 | 0 | 100% |
| Variance analysis | 5 | 0 | 100% |
| **Total** | **30** | **0** | **100%** |

**✅ ACCEPTED — All acceptance tests pass.**
