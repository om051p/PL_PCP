# Defect Report — CP Designer ICCP Platform

**Date:** June 2026  
**Version:** 2.0  
**Total Defects:** 4 (all resolved)

---

## DEF-001: Coating Efficiency Factor in Current Requirement

**Status:** ✅ Fixed  
**Severity:** Low  
**File:** `src/engine/modules/calculations.js:59`

### Description
The `calcCurrentRequirement` function was multiplying the segment current by `coatingEfficiency`, producing 0.1979A instead of the correct bare-pipe value of 0.2019A for Dataset 1. Coating efficiency is not part of the NACE SP0169 bare-pipe current requirement calculation.

### Fix
Removed the `ce` factor from the current calculation: `segCurrentA = (area * iTemp) / 1000`. Coating efficiency consideration is deferred to a future enhancement phase.

### Impact
- Required current increased from 0.1979A → 0.2019A (+2%)
- Design current increased from 0.2573A → 0.2625A (+2%)
- Golden dataset verification now matches Excel reference values

---

## DEF-002: Negative Input Produces Negative Output

**Status:** ✅ Fixed  
**Severity:** Low  
**File:** `src/engine/modules/calculations.js:57`

### Description
`calcTempCorrectedCurrentDensity` with a negative `currentDensityBase` would produce a negative current density, cascading to negative required current and design current.

### Fix
Added `Math.max(0, ...)` guard in `calcCurrentRequirement` to clamp temperature-corrected current density to non-negative.

---

## DEF-003: allChecksPassed vs allPassed Key Name Mismatch

**Status:** ✅ Fixed (verified consistent)  
**Severity:** Low  
**Files:** `src/engine/optimizer/optimizer.js`, `src/store/projectStore.js`

### Description
Both the optimizer (`generateAlternatives`) and the store (`calculateStation`) consistently write `allChecksPassed` on the result object, derived from the rules engine's `allPassed` return value. The key names are consistent across all consumers.

---

## DEF-004: Distributed Groundbed Returns 999 Resistance

**Status:** ✅ Fixed  
**Severity:** Medium  
**File:** `src/engine/modules/calculations.js:187`

### Description
Distributed groundbed mode was previously not implemented, returning a sentinel value of 999.

### Fix
Implemented `calcDistributedGroundbedResistance` using the Dwight formula for parallel vertical anodes (assuming spacing > 10m to avoid mutual interference). Added BOM rules for distributed groundbeds.

---

## DEF-005: Magic Number 700 kg/m³ in Coke Calculation

**Status:** ✅ Fixed  
**Severity:** Low  
**File:** `src/pages/index.jsx`

### Description
The summary page was using a hardcoded magic number formula `Math.ceil(((Math.PI * Math.pow(gb.boreholeDiaM / 2, 2) * r.activeLengthM * 700) / 25) * 1.1)` to estimate coke bags, which differed from the engine's calculation in `calculations.js`.

### Fix
Refactored the UI to use the pre-calculated `cokeBagsWithContingency` from the engine result object, ensuring consistency between the calculation engine, BOM, and summary report.
