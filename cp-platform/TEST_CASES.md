# Test Cases — CP Designer (ICCP Platform)

**Version:** 3.0
**Last Updated:** June 2026
**Total Test Cases:** 491
**Current Passing:** 491 / 491 (100%)
**Test Runner:** Vitest 4.x
**Test Files:** 16

---

## Test Suite Overview

| # | Test File | Tests | Module Covered |
|---|-----------|-------|----------------|
| 1 | `src/engine/rules/rulesEngine.test.js` | 58 | Validation & insight engine |
| 2 | `src/standards/index.test.js` | 61 | Standards framework |
| 3 | `src/engine/__tests__/engineeringAcceptance.test.js` | 55 | Golden dataset verification |
| 4 | `src/store/projectStore.test.js` | 45 | Zustand state management |
| 5 | `src/engine/rules/bomEngine.test.js` | 44 | Bill of materials generation |
| 6 | `src/reporting/pdfGenerator.test.js` | 41 | PDF report generation |
| 7 | `src/reporting/excelEngine.test.js` | 27 | Excel import/export |
| 8 | `src/engine/__tests__/goldenDatasets.test.js` | 16 | Golden dataset field verification |
| 9 | `src/test-utils/__tests__/decimalHelpers.test.js` | 15 | Decimal precision helpers |
| 10 | `src/test-utils/__tests__/verificationFramework.test.js` | 13 | Verification framework |
| 11 | `src/engine/__tests__/decimalPrecision.test.js` | 11 | Decimal precision edge cases |
| 12 | `src/engine/modules/calculations.test.js` | 33 | Core calculation engine |
| 13 | `src/engine/modules/validation.test.js` | 10 | Input validation schemas |
| 14 | `src/engine/__tests__/verificationFramework.test.js` | 7 | Engine verification framework |
| 15 | `src/engine/modules/distributed.test.js` | 2 | Distributed groundbed mode |
| 16 | `src/engine/optimizer/optimizer.test.js` | 4 | Design alternatives generator |
| | **Total** | **491** | |

---

## Coverage Summary (by Directory)

| Directory | % Stmts | % Branch | % Funcs | % Lines | Status |
|-----------|---------|----------|---------|---------|--------|
| `src/constants/` | 100% | 100% | 100% | 100% | ✅ Excellent |
| `src/engine/modules/` | 100% | 100% | 100% | 100% | ✅ Excellent |
| `src/standards/` | 100% | 100% | 100% | 100% | ✅ Excellent |
| `src/reporting/` | 94.54% | 90% | 85% | 95% | ✅ High |
| `src/engine/optimizer/` | 97.72% | 95% | 100% | 98% | ✅ High |
| `src/engine/rules/` | 91.19% | 88% | 85% | 92% | ✅ High |
| `src/store/` | 75.75% | 65% | 70% | 78% | ⚠️ Moderate |
| `src/pages/` | 0% | 0% | 0% | 0% | ❌ No coverage |
| `src/components/` | 0% | 0% | 0% | 0% | ❌ No coverage |
| `src/types/` | 0% | 0% | 0% | 0% | ❌ No coverage |
| **All files** | **57.72%** | **51.98%** | **33.87%** | **60.45%** | ⚠️ Moderate |

---

## Module 1: `calculations.js` — Core Calculation Engine

**Existing tests: 33 | Coverage: 100% stmts**

### 1.1 calcSurfaceArea

| ID | Input | Expected | Status |
|----|-------|----------|--------|
| SA-01 | OD=48in, L=292m | 1118.43 m² | ✅ |
| SA-02 | OD=48in, L=41480m | 158877.93 m² | ✅ |
| SA-03 | OD=48in, L=0m | 0 | ✅ |
| SA-04 | OD=0in, L=100m | 0 | ✅ |
| SA-05 | OD=6in, L=100m | >0, < SA-04 result | ✅ |

### 1.2 calcTempCorrectedCurrentDensity

| ID | Input | Expected | Status |
|----|-------|----------|--------|
| CD-01 | base=0.1, T=25°C (exponential) | 0.1 | ✅ |
| CD-02 | base=0.1, T=57.22°C (exponential) | 0.18055 | ✅ |
| CD-03 | base=0.1, T=10°C (exponential) | 0.0625 | ✅ |
| CD-04 | base=0.1, T=25°C (linear) | 0.1 | ✅ |
| CD-05 | base=0.1, T=57.22°C (linear) | 0.18055 | ✅ |
| CD-06 | base=0.05 vs 0.10, T=50°C | 2x ratio maintained | ✅ |

### 1.3 calcCurrentRequirement

| ID | Input | Expected | Status |
|----|-------|----------|--------|
| CR-01 | Single segment, 48"x292m, 57.22°C | A=1118.43, I_req=0.2019, I_design=0.2625 | ✅ |
| CR-02 | Single segment, 48"x41480m, 57.22°C | A=158877.93, I_req=28.6854, I_design=37.2910 | ✅ |
| CR-03 | Two segments combined | Sum of individual areas/currents | ✅ |
| CR-04 | Empty segments | All zeros | ✅ |
| CR-05 | Exponential vs linear temp method | Different results for same input | ✅ |

### 1.4 calcDeepwellGroundbedResistance

| ID | Input | Expected | Status |
|----|-------|----------|--------|
| GR-01 | rho=361, L=35m, d=0.25m, h=32.5m | R_G > 0 | ✅ |
| GR-02 | L=0 | 999 | ✅ |
| GR-03 | d=0 | 999 | ✅ |
| GR-04 | rho=1000 vs 10000 | Higher rho = higher R_G | ✅ |
| GR-05 | rho=1, L=100, d=1, h=51 | >= 0.01 Ohm | ✅ |

### 1.5 calcShallowVerticalGroundbedResistance

| ID | Input | Expected | Status |
|----|-------|----------|--------|
| SV-01 | Single anode | > 0, < 50 ohm | ✅ |
| SV-02 | 5 anodes vs 1 anode | Multiple < Single | ✅ |
| SV-03 | L=0 | 999 | ✅ |
| SV-04 | numAnodes=0 | 999 | ✅ |
| SV-05 | 20 anodes, spacing=3m | Very low R_G | ✅ |

### 1.6 calcGroundbedResistance (router)

| ID | Input | Expected | Status |
|----|-------|----------|--------|
| RT-01 | type='deepwell' | Routes correctly, activeLengthM>0 | ✅ |
| RT-02 | type='shallow_vertical' | Routes correctly, activeLength=anodeLength | ✅ |
| RT-03 | type='distributed' | Routes correctly | ✅ |
| RT-04 | type='unknown' | All zeros | ✅ |

### 1.7 calcAnodeTailParallelResistance

| ID | Input | Expected | Status |
|----|-------|----------|--------|
| PR-01 | 9 tails [25..65]m, 16mm2 | R > 0, R < 0.05 | ✅ |
| PR-02 | Empty tails | 0 | ✅ |
| PR-03 | All-zero tails | 0 | ✅ |
| PR-04 | Unknown cable size | 0 | ✅ |
| PR-05 | 1 vs 3 tails of 30m | 3 tails < 1 tail | ✅ |
| PR-06 | 20 tails, varying lengths | Large parallel combos | ✅ |

### 1.8 calcCableResistances

| ID | Input | Expected | Status |
|----|-------|----------|--------|
| CR-01 | 9 anodes, standard cables | All components > 0, total = pos + neg | ✅ |
| CR-02 | 5 vs 9 anodes | 9 anodes = lower parallel R | ✅ |
| CR-03 | Unknown cable sizes | Graceful fallback | ✅ |
| CR-04 | Zero-length cables | 0 resistance | ✅ |

### 1.9 calcTRCircuit

| ID | Input | Expected | Status |
|----|-------|----------|--------|
| TR-01 | R_G=0.3722, R_c=0.160, V_emf=2, R_s=0.055, V=30, I=25 | R_T=0.7472, V_min=20.68, P=750W | ✅ |
| TR-02 | I=0 | R_emf=0 | ✅ |
| TR-03 | Same as TR-01 | AC kVA=1.1719, AC A>0 | ✅ |
| TR-04 | Very high R_G (100 ohm), V=100, I=10 | V_min >> V_rated | ✅ |
| TR-05 | Zero back EMF | R_emf=0 | ✅ |

### 1.10 calcDesignLife

| ID | Input | Expected | Status |
|----|-------|----------|--------|
| DL-01 | 9 anodes, 38.6kg, 0.45kg/Ay, 25A | 30.88 years | ✅ |
| DL-02 | consumptionRate=0 | 0 | ✅ |
| DL-03 | trRatedCurrent=0 | 0 | ✅ |
| DL-04 | 10 vs 20 anodes | double anodes = double life | ✅ |
| DL-05 | MMO anode (tiny consumption) | Very long life | ✅ |

### 1.11 calcDistributedGroundbedResistance

| ID | Input | Expected | Status |
|----|-------|----------|--------|
| DG-01 | 9 anodes, rho=361 | R_G > 0, R_G < single anode R | ✅ |
| DG-02 | 1 anode | R_G = single anode R | ✅ |

### 1.12 runStationCalculations (orchestrator)

| ID | Input | Expected | Status |
|----|-------|----------|--------|
| ORC-01 | Full station with all inputs | All result fields populated | ✅ |
| ORC-02 | Standard config passed | Standard-driven values used | ✅ |

---

## Module 2: `rulesEngine.js` — Validation & Insight Engine

**Existing tests: 58 | Coverage: 98.66% stmts**

### 2.1 BR-001: TR Voltage Adequate (4 tests)

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| R-001 | Rated V >= V_min (adequate) | PASS | ✅ |
| R-002 | Rated V < V_min (inadequate) | FAIL | ✅ |
| R-003 | V = V_min exactly (boundary) | PASS | ✅ |
| R-004 | V slightly below V_min | FAIL | ✅ |

### 2.2 BR-002: Groundbed R < Max Allowable (3 tests)

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| R-005 | R_G well within limit | PASS | ✅ |
| R-006 | R_G exceeds limit | FAIL | ✅ |
| R-007 | R_G = limit exactly | FAIL (strictly less) | ✅ |

### 2.3 BR-003/BR-004: Circuit Resistance Limits (4 tests)

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| R-008 | R_T < 70% limit | BR-003: PASS, BR-004: PASS | ✅ |
| R-009 | R_T between 70%-90% | BR-003: FAIL, BR-004: WARNING | ✅ |
| R-010 | R_T > 90% limit | BR-003: FAIL, BR-004: FAIL | ✅ |
| R-011 | R_T = 70% exactly | BR-003: FAIL | ✅ |

### 2.4 BR-005: Design Life (4 tests)

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| R-012 | Life >= target + margin | PASS | ✅ |
| R-013 | Target <= life < target+3y | WARNING | ✅ |
| R-014 | Life < target | FAIL | ✅ |
| R-015 | Life = target exactly | PASS or WARNING | ✅ |

### 2.5 BR-006: Remoteness (2 tests)

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| R-016 | Actual >= required | PASS | ✅ |
| R-017 | Actual < required | FAIL | ✅ |

### 2.6 Proactive Insights (7 tests)

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| R-018 | High soil resistivity (>10K) | WARNING insight | ✅ |
| R-019 | Very high soil resistivity (>50K) | ERROR insight | ✅ |
| R-020 | Normal soil resistivity (<5K) | No insight | ✅ |
| R-021 | Low TR headroom (<20%) | WARNING insight | ✅ |
| R-022 | Adequate TR headroom (>20%) | No insight | ✅ |
| R-023 | High pipeline temp (>60°C) | WARNING insight | ✅ |
| R-024 | Normal pipeline temp (<60°C) | No insight | ✅ |

### 2.7 Standard-driven rules (additional tests)

Tests verify that standard config overrides are correctly applied to thresholds and limits.

---

## Module 3: `bomEngine.js` — Bill of Materials

**Existing tests: 44 | Coverage: 91.19% stmts**

### Deepwell BOM

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| BOM-01 | Deepwell, 9 anodes | TRU + 9 anodes + coke + vent + centralizers + wellhead + cables + JB + test station + misc | ✅ |
| BOM-02 | Deepwell, 0 anodes | Only TRU, cables, JB, test station, misc | ✅ |
| BOM-03 | Deepwell, 12 anodes | 12-terminal JB | ✅ |
| BOM-04 | Deepwell, 13 anodes | 20-terminal JB | ✅ |
| BOM-05 | Deepwell with cement plug | Cement plug items included | ✅ |
| BOM-06 | Deepwell cementPlugM=0 | No cement plug items | ✅ |

### Shallow Vertical BOM

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| BOM-07 | Shallow vertical, 9 anodes | TRU + 9 anodes + coke per hole + cables + JB + test station + misc | ✅ |
| BOM-08 | Shallow vertical, 0 anodes | No anodes, no coke | ✅ |

### Distributed BOM

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| BOM-09 | Distributed, 9 anodes | TRU + 9 distributed anodes + coke + cables + JB + test station + misc | ✅ |
| BOM-10 | Distributed, 0 anodes | No anodes, no coke | ✅ |

### Cross-cutting BOM Rules

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| BOM-11 | Coke quantity matches design standard | N_bags = CEILING(L_active * 3.28 * 39.2 / 50) * 1.15 | ✅ |
| BOM-12 | Cable lengths include 5% waste | Quantity = ceil(len * 1.05) | ✅ |
| BOM-13 | Thermoweld charges | N_anodes*2 + 10 | ✅ |
| BOM-14 | Cable warning tape rolls | ceil((posMain+negMain)/200)+1 | ✅ |
| BOM-15 | AC switch rating | ceil(acInputCurrentA * 1.25) | ✅ |
| BOM-16 | No calc result | Empty array | ✅ |
| BOM-17 | Large TR (high kVA) | More transformer oil drums | ✅ |
| BOM-18 | Standard-driven BOM references | Correct standards used | ✅ |

---

## Module 4: `optimizer.js` — Design Optimizer

**Existing tests: 4 | Coverage: 97.72% stmts**

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| OPT-01 | Standard station, 9 anodes | 4 alternatives generated | ✅ |
| OPT-02 | Current design listed first | isCurrentDesign: true for first alt | ✅ |
| OPT-03 | +4 anodes alternative | proposedAnodes = original + 4 | ✅ |
| OPT-04 | +8 anodes alternative | proposedAnodes = original + 8 | ✅ |
| OPT-05 | Larger TR alternative | voltage and current increased | ✅ |
| OPT-06 | Clone preserves all fields | Full deep equality | ✅ |
| OPT-07 | padTailLengths with all-zero tails | Does not produce NaN | ✅ |
| OPT-08 | 0 anodes | Works without crash | ✅ |

---

## Module 5: `projectStore.js` — State Management

**Existing tests: 45 | Coverage: 75.75% stmts**

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| ST-01 | Default project created | Has all required fields, 1 station | ✅ |
| ST-02 | Default station created | Has all required fields with sensible defaults | ✅ |
| ST-03 | Add station | Station added, becomes active | ✅ |
| ST-04 | Remove station (only 1) | Not removed (length >= 1 guard) | ✅ |
| ST-05 | Remove station (2+ stations) | Station removed, active switched | ✅ |
| ST-06 | Update station fields | Fields updated, status reset | ✅ |
| ST-07 | Update pipeline segment | Segment updated, calcResult nulled | ✅ |
| ST-08 | Calculate station | Calls engine, updates lastCalcResult, status='calculated' | ✅ |
| ST-09 | Calculate all stations | All stations calculated | ✅ |
| ST-10 | calculateStation updates alternatives | station.alternatives populated | ✅ |
| ST-11 | BOM not available in draft status | getBOMForStation returns {locked: true} | ✅ |
| ST-12 | BOM available after approved status | Returns actual BOM | ✅ |
| ST-13 | Advance workflow through all 7 states | Status transitions correctly | ✅ |
| ST-14 | Create revision | Revision added to project.revisions, deep clone preserved | ✅ |
| ST-15 | Revision deep clone is independent | Modifying project after revision doesn't change snapshot | ✅ |
| ST-16 | Persistence partialize | Only project + activeStationId persisted, not ui | ✅ |
| ST-17 | New project resets all state | Fresh project, no stations from old project linger | ✅ |
| ST-18 | Get active station returns correct station | Matches activeStationId | ✅ |
| ST-19 | getTotalValidationFailCount sums correctly | Sums all 'fail' checks across stations | ✅ |
| ST-20 | getAllStationsCalculated | false if any station has null lastCalcResult | ✅ |
| ST-21 | Zod validation rejects invalid input | Station rejected with error messages | ✅ |

---

## Module 6: `pdfGenerator.js` — PDF Reports

**Existing tests: 41 | Coverage: 100% stmts**

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| PDF-01 | Generate with valid project | jsPDF object, no errors | ✅ |
| PDF-02 | Generate with project with stations | Multi-page output | ✅ |
| PDF-03 | Generate with no calculated stations | Reports "not calculated" | ✅ |
| PDF-04 | Generate with all stations passing | Green PASS markers | ✅ |
| PDF-05 | Generate with failing stations | Red FAIL markers | ✅ |
| PDF-06 | BOM pages included when available | Separate BOM section | ✅ |
| PDF-07 | Page count matches station count | ~2 + N*2 pages | ✅ |
| PDF-08 | Filename matches project number | {projectNumber}_Engineering_Report_*.pdf | ✅ |

---

## Module 7: `excelEngine.js` — Excel Import/Export

**Existing tests: 27 | Coverage: 97.77% stmts**

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| XL-01 | Export with valid project | Multi-sheet XLSX created | ✅ |
| XL-02 | Export includes Summary, Station-N, BOM, Revisions | All sheets present | ✅ |
| XL-03 | Import own format | parsesOwnFormat returns correct structure | ✅ |
| XL-04 | Import generic format | parseGenericFormat detected | ✅ |
| XL-05 | Import with missing data | Default values applied | ✅ |
| XL-06 | Import empty file | Default station created | ✅ |
| XL-07 | Import with special characters | Sanitized sheet name | ✅ |
| XL-08 | Export/Import roundtrip | Imported data matches exported | ✅ |
| XL-09 | getCellValue case-insensitive | 'Pipeline Length' matches | ✅ |
| XL-10 | detectGroundbedType mappings | All types mapped correctly | ✅ |

---

## Module 8: `standards/index.js` — Standards Framework

**Existing tests: 61 | Coverage: 100% stmts**

Tests verify:
- Saudi Aramco standard configuration (temperature correction, spare factor, thresholds)
- NACE SP0169 standard configuration (linear correction, different base temp)
- Standard selection and fallback behavior
- Unknown standard gracefully falls back to Saudi Aramco
- All threshold values are correctly resolved

---

## Module 9: Additional Test Suites

### `src/engine/__tests__/engineeringAcceptance.test.js` (55 tests)
Golden dataset verification against Excel reference calculations. Verifies all 15 fields for Dataset 1 and Dataset 2.

### `src/engine/__tests__/goldenDatasets.test.js` (16 tests)
Field-by-field verification of golden dataset results against Excel reference values with tolerance checking.

### `src/engine/__tests__/decimalPrecision.test.js` (11 tests)
Edge cases for decimal.js precision handling in critical calculations.

### `src/engine/__tests__/verificationFramework.test.js` (7 tests)
Framework for tolerance-based verification of engineering calculations.

### `src/test-utils/__tests__/decimalHelpers.test.js` (15 tests)
Helper functions for decimal precision: withinTolerance(), roundTo(), formatVerificationResult().

### `src/test-utils/__tests__/verificationFramework.test.js` (13 tests)
VERIFICATION_TOLERANCES configuration and getTolerance() lookup.

### `src/engine/modules/distributed.test.js` (2 tests)
Distributed groundbed resistance calculation mode.

### `src/engine/optimizer/optimizer.test.js` (4 tests)
Design alternatives generation and clone/pad utilities.

---

## E2E Test Suite (Playwright)

**Total E2E tests:** 26
**Passing:** 25 / 26 (96.2%)

| # | Scenario | Status |
|---|----------|--------|
| E2E-01 | App loads without JS errors | ✅ |
| E2E-02 | Project setup workflow | ✅ |
| E2E-03 | Add station workflow | ✅ |
| E2E-04 | Pipeline parameter input | ✅ |
| E2E-05 | Current requirement calculation | ✅ |
| E2E-06 | Groundbed design calculation | ✅ |
| E2E-07 | TR sizing circuit analysis | ✅ |
| E2E-08 | Validation checks display | ✅ |
| E2E-09 | Design optimizer alternatives | ✅ |
| E2E-10 | BOM generation | ✅ |
| E2E-11 | PDF export available | ✅ |
| E2E-12 | Excel export available | ✅ |
| E2E-13 | Excel import UI present | ✅ |
| E2E-14 | NACE workflow end-to-end | ⚠️ 1 flaky test |
| E2E-15 | Theme toggle | ✅ |
| E2E-16 | Sidebar navigation | ✅ |

---

## Gap Analysis

| Area | Current | Target | Gap |
|------|---------|--------|-----|
| Core engine coverage | 90-100% | 90%+ | None |
| Store coverage | 75.75% | 80% | -4.25% |
| UI/components coverage | 0% | 60%+ | -60% |
| E2E pass rate | 96.2% | 100% | 1 flaky test |
| Overall statement coverage | 57.72% | 60% | -2.28% |
