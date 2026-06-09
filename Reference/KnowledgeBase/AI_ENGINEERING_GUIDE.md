# AI Engineering Guide

> **Purpose:** Comprehensive reference document for AI coding agents working on the PCP Calculation Engine.
> **Users:** Future AI agents (Codebuff, Claude, etc.) and human engineers.
> **Priority:** Read this first when starting any new task.

---

## 1. Quick Start

### Project Overview
- **Project:** Permanent Cathodic Protection (PCP) Calculation Engine
- **Location:** `cp-platform/src/engine/`
- **Stack:** JavaScript (ES Modules), Vite, React, Zustand
- **Purpose:** Engineering design calculations for ICCP systems
- **Standard:** Saudi Aramco 17-SAMSS series, NACE SP0169

### Key Files to Read First
| File | Why |
|------|-----|
| `cp-platform/src/engine/modules/calculations.js` | All calculation formulas (12 exportable functions) |
| `cp-platform/src/constants/index.js` | All engineering constants and thresholds |
| `cp-platform/src/engine/modules/validation.js` | Zod validation schemas |
| `cp-platform/src/engine/rules/bomEngine.js` | Bill of materials generation |
| `cp-platform/src/engine/__tests__/engineeringAcceptance.test.js` | Golden dataset verification |

---

## 2. Project Terminology

### Engineering Terms

| Term | Definition | Unit |
|------|------------|------|
| **Cathodic Protection (CP)** | Electrochemical method to protect metal from corrosion | — |
| **Impressed Current CP (ICCP)** | CP using external DC power source (TR) | — |
| **Transformer-Rectifier (TR/Tru)** | AC-to-DC power supply for ICCP | V, A |
| **High-Silicon Cast Iron (HSCI)** | Common anode material (14.5% Si) | — |
| **Calcined Petroleum Coke (CPC)** | Carbon backfill material around anodes | — |
| **Groundbed** | Anode installation (deepwell, shallow, distributed) | — |
| **Active Column Length** | Vertical length of anode column in deepwell | m |
| **Back EMF** | Counter-electromotive force from electrochemical reaction | V (typically 2V) |
| **Coating Efficiency** | Fraction of pipe surface effectively insulated | 0-1 |
| **Spare Factor** | Multiplier for future current demand increase | 1.3 (30%) |
| **Remoteness** | Minimum distance from anode bed to other structures | m |
| **Attenuation** | Potential decay along pipeline with distance | 1/m |

### Code Terms

| Term | Definition |
|------|------------|
| **Station** | A complete CP system (TR + groundbed + cables) |
| **Pipeline Segment** | A section of pipeline with uniform properties |
| **Design Mode** | Type of groundbed (deepwell, shallow_vertical, etc.) |
| **Calculation Result** | Output object from `runStationCalculations()` |
| **BOM Item** | A line item in the bill of materials |

---

## 3. File Hierarchy

```
cp-platform/src/engine/
├── modules/
│   ├── calculations.js          ← 12 exported calc functions (do NOT hardcode values)
│   ├── calculations.test.js     ← Unit tests for calculations
│   ├── validation.js            ← Zod schemas for station input validation
│   └── validation.test.js       ← Tests for validation schemas
├── rules/
│   ├── bomEngine.js             ← BOM generation from calc results
│   ├── bomEngine.test.js        ← BOM tests
│   ├── rulesEngine.js           ← Design rule evaluation
│   └── rulesEngine.test.js      ← Rules tests
├── optimizer/
│   ├── optimizer.js             ← Design optimization algorithms
│   └── optimizer.test.js        ← Optimizer tests
├── __tests__/
│   ├── engineeringAcceptance.test.js  ← GOLDEN DATASET — Excel reference values
│   ├── goldenDatasets.test.js         ← End-to-end golden dataset tests
│   ├── decimalPrecision.test.js       ← Decimal precision verification
│   ├── verificationFramework.test.js  ← Verification framework
│   └── verificationFramework.test.js  ← (duplicated, check actual name)
└── types/
    └── index.js                 ← Type definitions

cp-platform/src/constants/
    └── index.js                 ← DO NOT HARDCODE — import from here
```

### Engineering Knowledge Base
```
Reference/KnowledgeBase/
├── DOCUMENT_INDEX.md              ← Source document inventory
├── FORMULA_LIBRARY.md             ← All formulas with Excel references
├── ENGINEERING_CONCEPTS.md        ← Concepts organized by module
├── DESIGN_METHODOLOGY.md          ← Design workflow and decision trees
├── EXCEL_TO_APPLICATION_MAPPING.md ← Trace formulas → code
├── ENGINEERING_ASSUMPTIONS.md     ← Constants, factors, margins
├── ATTENUATION_GUIDE.md           ← Attenuation theory and calculations
└── AI_ENGINEERING_GUIDE.md        ← THIS FILE — AI agent reference
```

---

## 4. Formula References

### Calculation Functions (alphabetical)

| Function | Inputs | Output | Status |
|----------|--------|--------|--------|
| `calcAnodeTailParallelResistance()` | tailLengths[], cableSizeMm2 | parallel Ω | ✅ Tested |
| `calcCableResistances()` | cables, numAnodes | all cable Ω components | ✅ Tested |
| `calcCokeRequirement()` | activeLengthM | bagsBase, bagsWithContingency | ✅ Tested |
| `calcCurrentRequirement()` | segments[] | area, requiredA, designA | ✅ Tested |
| `calcDesignLife()` | numAnodes, weight, consumption, current | years | ⚠️ Missing 0.85 factor |
| `calcDweellGroundbedResistance()` | ρ, L, d, h | Ω | ✅ Tested (<0.04%) |
| `calcGroundbedResistance()` | groundbed, ρ, numAnodes | Ω, activeLength, drillDepth | ✅ Tested |
| `calcShallowVerticalGroundbedResistance()` | ρ, L, d, h, N, S | Ω | ✅ Tested |
| `calcSurfaceArea()` | odInches, lengthM | m² | ✅ Tested |
| `calcTRCircuit()` | R_G, R_c, Vemf, R_s, V, I | all circuit parameters | ✅ Tested |
| `calcTempCorrectedCurrentDensity()` | baseCD, tempC | mA/m² | ⚠️ Differs from Excel |
| `runStationCalculations()` | station, designLifeYears | full CalcResult | ✅ Tested |

### Key Constants (`THRESHOLDS`)

```javascript
SPARE_FACTOR: 1.3,              // 30% current spare
TEMP_CORRECTION_FACTOR: 0.025,  // NACE linear correction per °C
BASE_TEMP_C: 25,                 // NACE reference temperature
TR_EFFICIENCY: 0.8,             // TR stage efficiency
RECTIFIER_EFFICIENCY: 0.8,      // Rectifier stage efficiency
CIRCUIT_RESISTANCE_OPERATING: 0.7,  // 70% of rated V/I
CIRCUIT_RESISTANCE_WARNING: 0.9,    // 90% of rated V/I
COKE_FT_PER_M: 3.28,            // Feet per meter
COKE_ANNULUS_FACTOR: 39.2,      // Annulus volume factor
COKE_BAG_LBS: 50,               // CPC bag weight
COKE_BACKFILL_CONTINGENCY: 1.15,// 15% site waste
MIN_DESIGN_LIFE_MARGIN_Y: 3,    // Design life warning threshold
```

---

## 5. Coding Guidance

### Golden Rules

1. **Never hardcode constants** — Import from `constants/index.js` (THRESHOLDS, CABLE_SPECS, COATING_TYPES, etc.)
2. **Every exported function must have a unit test** — Minimum: valid input returns correct result
3. **Never modify `calculations.js` without running impact analysis** — Use `AGENTS.md` instructions
4. **Run tests after any change to calculation logic** — `npm run test -- --run`
5. **Update engineering acceptance tests when adding new formulas**
6. **Document discrepancies** — If app differs from Excel, note it in the test and the knowledge base

### Code Style

```javascript
// ✅ DO: Good
export function calcSurfaceArea(odInches, lengthM) {
  if (odInches <= 0 || lengthM <= 0) return 0
  const odM = odInches * 0.0254  // Unit conversion (OK to hardcode)
  return Math.PI * odM * lengthM
}

// ✅ DO: Use THRESHOLDS
export function calcSomething(value) {
  return value * THRESHOLDS.SPARE_FACTOR
}

// ❌ DON'T: Hardcode engineering thresholds
export function calcSomething_wrong(value) {
  return value * 1.3  // Bad — what is 1.3? Is it spare factor?
}
```

### Unit Test Pattern

```javascript
// ✅ DO: Golden dataset test
it('standard deepwell — groundbed resistance matches Excel', () => {
  const result = calcDweellGroundbedResistance(361, 31.17, 0.25, 17.5)
  expect(result).toBeCloseTo(0.1135, 3)
})

// ✅ DO: Edge case tests
it('returns 0 for zero/negative inputs', () => {
  expect(calcSurfaceArea(0, 100)).toBe(0)
  expect(calcSurfaceArea(48, 0)).toBe(0)
})
```

---

## 6. Validation Requirements

### Excel-to-App Verification Protocol

When implementing a new formula or modifying an existing one:

1. **Identify the Excel formula** from `Cal.(DW)` or `BOM-(DW)` sheet
2. **Extract the mathematical equation** — note constants, inputs, outputs
3. **Implement in `calculations.js`** — import constants, no magic numbers
4. **Validate against golden dataset** — add test to `engineeringAcceptance.test.js`
5. **Check variance** — target <0.5% from Excel reference value
6. **Document the mapping** — add to `FORMULA_LIBRARY.md` and `EXCEL_TO_APPLICATION_MAPPING.md`

### Test Pass Criteria

- All tests pass: `npm run test -- --run`
- Build succeeds: `npm run build`
- Golden dataset: 14/14 parameters within ±0.5% tolerance
- No hardcoded magic numbers in calculation code

### Known Discrepancies (Documented)

| Issue | Location | Excel | App | Status |
|-------|----------|-------|-----|--------|
| Temperature base | calcTempCorrectedCD | 30°C (exponential) | 25°C (linear) | ⚠️ Known |
| Anode tails | calcCableResistances | Series sum | Parallel (correct) | ⚠️ Known |
| AC combined factor | calcTRCircuit | 0.6 | 0.64 | ⚠️ Known |
| Anode utilization | calcDesignLife | 0.85 factor | No factor | ⚠️ Known |
| Coke contingency label | F213 label | "10%" | 15% (correct) | ⚠️ Known |

---

## 7. Design Mode Status

| Mode | Status | Functions | BOM |
|------|--------|-----------|-----|
| Deepwell | ✅ Complete | All 12 calc functions | ✅ Full BOM |
| Shallow Vertical | ✅ Complete | All 12 calc functions | ✅ Full BOM |
| Distributed | ❌ Future | Partial | ❌ |
| Tank Bottom | ❌ Future | None | ❌ |
| Plant Piping | ❌ Future | None | ❌ |
| Sacrificial | ❌ Future | None | ❌ |

---

## 8. Engineering Standards Referenced

| Standard | Purpose | Key Requirements |
|----------|---------|-----------------|
| NACE SP0169 | Pipeline CP design | −850 mV CSE, 100 mV shift |
| 17-SAMSS-003 | TRU specification | Voltage, current, enclosure |
| 17-SAMSS-016 | Anode specification | HSCI TA-4: 38.6kg, 0.45 kg/A·yr |
| 17-SAMSS-008 | Junction box spec | Material, termination |
| 17-SAMSS-020 | Cable specification | 16/25/35mm² resistance |
| 17-855-011 | Coke backfill spec | CPC, bag size, quality |
| SAES-X-400 | CP system design | Remoteness distance table |
| Dwight (1936) | Groundbed resistance | Deepwell formula |
| Sunde (1968) | Mutual resistance | Shallow vertical formula |
| IEC 60287 | Cable ampacity | Current ratings |

---

## 9. Testing Commands

```bash
# Run all tests
cd cp-platform && npm run test -- --run

# Run specific test file
cd cp-platform && npx vitest run src/engine/__tests__/engineeringAcceptance.test.js

# Run single test by name
cd cp-platform && npx vitest run -t "standard deepwell"

# Build
cd cp-platform && npm run build

# Verify Coke calculation manually
cd cp-platform && node -e "
  const { calcCokeRequirement } = require('./src/engine/modules/calculations.js');
  console.log(calcCokeRequirement(35));
"
```

---

## 10. Quick Reference Tables

### Anode Specifications

| Type | Weight | Output | Consumption | Length |
|------|--------|--------|-------------|--------|
| HSCI TA-4 | 38.6 kg | 3.56 A | 0.45 kg/A·yr | 2.13 m |
| HSCI TA-2 | 23.5 kg | 2.1 A | 0.45 kg/A·yr | 1.52 m |
| MMO Tubular | 8.5 kg | 15.0 A | 0.001 kg/A·yr | 1.0 m |

### Cable Resistance

| Size (mm²) | Resistance (Ω/m) | Max Current (A) |
|------------|-----------------|-----------------|
| 16 | 1.673×10⁻³ | 76 |
| 25 | 1.053×10⁻³ | 98 |
| 35 | 6.59×10⁻⁴ | 118 |
| 50 | 4.95×10⁻⁴ | 140 |
| 70 | 3.43×10⁻⁴ | 172 |
| 95 | 2.54×10⁻⁴ | 205 |

### Coating Efficiency

| Type | Initial Eff. | Degradation/yr |
|------|-------------|---------------|
| FBE | 0.98 | 0.002 |
| 3LPE | 0.99 | 0.001 |
| Coal Tar Enamel | 0.95 | 0.005 |
| Bare | 0.00 | 0 |

### Golden Dataset — Standard Deepwell

| Parameter | Value | Tolerance |
|-----------|-------|-----------|
| OD | 48 in | — |
| Length | 292 m | — |
| Op Temp | 57.22 °C | — |
| Soil Resistivity | 361 Ω·cm | — |
| Anodes | 9 TA-4 | — |
| TR | 30V / 25A | — |
| Surface Area | 1118.43 m² | ±0.5% |
| Required Current | 0.198 A | ±0.5% |
| Groundbed Resistance | 0.114 Ω | ±0.5% |
| Total Circuit R | 0.584 Ω | ±0.5% |
| Min TR Voltage | 16.60 V | ±0.5% |
| Design Life | 30.88 years | ±0.5% |
| Coke Bags (base) | 91 bags | ±0% (integer) |
| Coke Bags (final) | 105 bags | ±0% (integer) |

---

## 11. Common Tasks

### Adding a New Calculation Module
1. Add function to `calculations.js` — import constants only
2. Add unit test in `calculations.test.js`
3. Add golden dataset test in `engineeringAcceptance.test.js`
4. Add constant to `constants/index.js` if needed
5. Update `EXCEL_TO_APPLICATION_MAPPING.md`
6. Update `FORMULA_LIBRARY.md`
7. Run all tests — verify 347+ pass

### Adding a New Groundbed Type
1. Add entry to `DESIGN_MODES` in `constants/index.js`
2. Add groundbed calculation function in `calculations.js`
3. Add case to `calcGroundbedResistance()` router
4. Add BOM rule in `bomEngine.js`
5. Update all knowledge base documents

### Fixing a Discrepancy with Excel
1. Verify the Excel formula is what we think (check raw workbook)
2. Determine which formula is correct (engineering judgment)
3. If app is wrong: fix and update golden dataset test
4. If Excel is wrong: document in `ENGINEERING_ASSUMPTIONS.md` and keep app correct
5. Update variance in `EXCEL_TO_APPLICATION_MAPPING.md`
