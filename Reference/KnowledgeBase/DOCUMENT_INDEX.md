# Document Index — Engineering Knowledge Base

> **Purpose:** Inventory of all reference documents used to build the PCP calculation engine.
> **Priority of Truth:** Excel Workbook > PDF Standards > Text References

---

## 1. PCP Calculation sheet.xlsx

| Property | Value |
|----------|-------|
| **File** | `Reference/PCP Calculation sheet.xlsx` |
| **Format** | Microsoft Excel 2007+ (.xlsx) |
| **Project** | ECP25-0292-ICCP HAJAR IPP |
| **Client** | HAJAR IPP |
| **Sheets** | 3 (Cal.(DW), BOM-(DW), BOM-(HA)) |
| **Confidence** | **★★★★★ — Primary Source of Truth** |
| **Priority** | **Priority 1** |

### Purpose

Comprehensive engineering calculation workbook for Impressed Current Cathodic Protection (ICCP) system design across two stations. Contains all formulas, design parameters, and bill of materials generation.

### Topics Covered

- Pipeline surface area calculation (Row 21)
- Current density temperature correction (Row 22)
- Current requirement with 30% spare factor (Row 24)
- Anode quantity determination (current-based and TR-based) (Rows 31-33)
- Design life calculation with 0.85 utilization factor (Row 42)
- Deepwell groundbed resistance — Dwight formula (Row 75)
- Shallow vertical groundbed resistance — modified Sunde (Row 75)
- Individual anode tail cable length generation (Rows 79-98)
- Cable resistance calculation per segment (Rows 101-120)
- Anode tail parallel resistance + positive circuit (Row 126)
- Main positive cable resistance (Row 134)
- Main and secondary negative cable resistance (Rows 138-140)
- Total circuit resistance — series sum (Row 156)
- Minimum TR voltage at 70% utilization (Row 161)
- Maximum allowable groundbed resistance validation (Row 171)
- Circuit resistance validation at 70% and 90% (Rows 178, 185)
- SAES-X-400 remoteness distance table lookup (Row 193)
- AC power consumption with efficiency/power factor (Rows 204-206)
- CPC backfill bag count with 15% contingency (Rows 212-213)

### Sheets

| Sheet | Rows | Purpose |
|-------|------|---------|
| `Cal.(DW)` | 1-214 | Primary calculations for two ICCP stations |
| `BOM-(DW)` | 1-64 | Bill of Materials for Station-1 (Deepwell) |
| `BOM-(HA)` | 1-51 | Bill of Materials for Station-2 (Shallow Vertical) |

---

## 2. CP2.pdf — Cathodic Protection Technician Course Manual

| Property | Value |
|----------|-------|
| **File** | `Reference/CP2.pdf` |
| **Source** | AMPP (Association for Materials Protection and Performance) |
| **Level** | CP 2 — Technician |
| **Lines** | ~34,291 |
| **Confidence** | **★★★★☆ — Theory Reference** |
| **Priority** | **Priority 2** |

### Purpose

Foundational training manual covering corrosion theory, field measurements, and basic CP system design. Used for theoretical background and protection criteria.

### Topics Covered

- **Chapter 1:** Corrosion Theory (electrochemical cells, anodic/cathodic reactions)
- **Chapter 2:** Concept of Cathodic Protection (criteria, polarization)
- **Chapter 3:** Field Measurements (potential surveys, current measurements)
- **Chapter 4:** Road & Railroad Casings (casings, isolation)
- **Chapter 5:** Stray Current (DC interference, mitigation)
- **Chapter 6:** Pipeline Survey Methods (CIS, DCVG)
- **Chapter 7:** Cathodic Protection Systems (galvanic vs. impressed current)
- **Chapter 8:** DC Power Sources (TRUs, solar, thermoelectric)
- **Chapter 9:** Monitoring and Records
- **Chapter 10:** Safety

### Engineering Relevance

- -850 mV CSE protection criterion
- 100 mV polarization shift criterion
- Basic circuit resistance calculations
- Field measurement techniques

---

## 3. CP3.pdf — Cathodic Protection Technologist Course Manual

| Property | Value |
|----------|-------|
| **File** | `Reference/CP3.pdf` |
| **Source** | NACE International (now AMPP) |
| **Level** | CP 3 — Technologist |
| **Lines** | ~46,480 |
| **Confidence** | **★★★★★ — Formula & Theory Reference** |
| **Priority** | **Priority 2** |

### Purpose

Advanced training manual covering electrochemical theory, polarization mechanisms, and CP system design calculations. Most relevant for formula derivation and engineering assumptions.

### Topics Covered

- **Chapter 1:** Mechanisms of Corrosion
  - Nernst Equation
  - Electrode potentials and reference cells
  - Polarization (activation, concentration, resistance)
  - Faraday's Law
  - Tafel equation
- **Chapter 2:** Cathodic Protection Theory
  - Protection criteria (-850 mV CSE, 100 mV shift)
  - Polarization curves
  - Galvanic vs. impressed current systems
- **Chapter 3:** CP System Design
  - Current requirement determination
  - Groundbed resistance (Dwight, Sunde formulas)
  - Multiple vertical anodes
  - Cable resistance calculations
  - Pipeline attenuation
- **Chapter 4:** Design Examples

### Key Formulas

| Topic | Formula | Reference |
|-------|---------|-----------|
| Nernst Equation | E = E° + (RT/nF) ln(a_red/a_ox) | Sec 1.3.2 |
| Temperature Correction | E_T = E_25 + k_t(T - 25) | Sec 1.3 |
| Tafel Equation | η = β log(i/i_0) | Sec 1.4 |
| Faraday's Law | w = (I × t × M) / (n × F) | Sec 1.4 |
| Activation Polarization | η = β log(i/i_0) | Sec 1.4 |
| Concentration Polarization | η = (RT/nF) ln(1 - i/i_L) | Sec 1.4 |
| Single Vertical Anode | R = ρ/(2πL) × [ln(8L/d) - 1] | Dwight |
| Multiple Vertical Anodes | R_n = R_single/N + ρ/(πLN²) × Σln(2iS/L) | Sunde |
| Horizontal Anode | R = ρ/(2πL) × [ln(4L/d) + ln(L/h) - 2 + 2h/L] | Dwight |
| Cable Resistance | R = ρ_c × L / A | Ohm's Law |
| Attenuation | V_x = V_0 × e^(-αx) | Sec 3.x |
| Design Life | Y = (N × W) / (C × I) | Sec 3.x |

---

## 4. CP4.pdf — Cathodic Protection Specialist Course Manual

| Property | Value |
|----------|-------|
| **File** | `Reference/CP4.pdf` |
| **Source** | AMPP |
| **Level** | CP 4 — Specialist |
| **Lines** | ~52,404 |
| **Confidence** | **★★★★★ — Design Methodology Reference** |
| **Priority** | **Priority 2** |

### Purpose

Advanced design manual for engineering complete CP systems across all structure types. Most relevant for design methodology, decision criteria, and system optimization.

### Topics Covered

- **Chapter 1:** Concept of Cathodic Protection
- **Chapter 2:** Factors Influencing CP Design
- **Chapter 3:** Cathodic Protection Systems
  - Galvanic anode systems
  - Impressed current systems
  - Deepwell groundbeds
  - Distributed groundbeds
- **Chapter 4:** Design Factors & Calculations
  - Current density selection
  - Coating efficiency
  - Groundbed design
  - Cable sizing (IEC 60287 / NEC)
  - TR sizing
  - Design life
- **Chapter 5:** System Design Examples — Pipelines
- **Chapter 6:** Marine & Offshore Applications
- **Chapter 7:** Tanks & Well Casings
- **Chapter 8:** Water Tanks, Condensers, Thickeners
- **Chapter 9:** Reinforced Concrete Structures

### Engineering Relevance

- Comprehensive design workflows
- Decision trees for groundbed type selection
- Coating degradation modeling
- Current distribution analysis
- Groundbed resistance calculation methods
- TR selection criteria
- Economic analysis / optimization

---

## 5. attenuation.xlsx (Expected — Not Yet Available)

| Property | Value |
|----------|-------|
| **File** | `Reference/attenuation.xlsx` |
| **Format** | Microsoft Excel 2007+ (.xlsx) |
| **Priority** | **Priority 1** (when available) |
| **Status** | ⏳ Expected — not present in repository

### Purpose

Attenuation calculations for pipeline CP current distribution analysis. Would contain the attenuation constant (α) derivation, multiple drain point analysis, and station spacing optimization.

### Topics Expected

- Pipeline resistance per unit length
- Coating resistance calculations
- Attenuation constant (α = √(R/r))
- Potential profile along pipeline
- Multiple drain point current distribution
- Station spacing optimization

### Cross-Reference

See `ATTENUATION_GUIDE.md` for current theoretical coverage until this workbook becomes available.

---

## 6. Application Codebase (cp-platform/src/engine/)

| Property | Value |
|----------|-------|
| **Location** | `cp-platform/src/engine/` |
| **Language** | JavaScript (ES Modules) |
| **Module Count** | 14 files |
| **Confidence** | **★★★★★ — Implementation Reference** |

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Calculations | `modules/calculations.js` | 12 exported functions for all engineering formulas |
| Validation | `modules/validation.js` | Zod schema validation for station inputs |
| BOM Engine | `rules/bomEngine.js` | Bill of materials generation from calculation results |
| Rules Engine | `rules/rulesEngine.js` | Design rule evaluation |
| Optimizer | `optimizer/optimizer.js` | Design optimization algorithms |
| Constants | `constants/index.js` | All engineering constants, thresholds, and standards |

### Test Coverage

| Test File | Tests | Purpose |
|-----------|-------|---------|
| `calculations.test.js` | — | Unit tests for calculation functions |
| `engineeringAcceptance.test.js` | **35** (golden dataset) | Excel reference value validation |
| `bomEngine.test.js` | — | BOM generation tests |
| `goldenDatasets.test.js` | — | End-to-end golden dataset tests |
| `decimalPrecision.test.js` | — | Decimal precision verification |
| `verificationFramework.test.js` | — | Verification framework tests |
| `optimizer.test.js` | — | Optimizer tests |

**Total test suite: 347 tests across 14 test files** (run with `npm run test -- --run`)

---

## Document Hierarchy

```
Priority 1 (Source of Truth)
├── PCP Calculation sheet.xlsx  ← All formulas, constants, validation criteria
└── attenuation.xlsx            ← Attenuation calculations (if available)

Priority 2 (Theory & Methodology)
├── CP4.pdf  ← Specialist design, decision trees, complete methodology
├── CP3.pdf  ← Formula derivations, polarization theory, protection criteria
└── CP2.pdf  ← Basic theory, field measurements, protection criteria

Priority 3 (Implementation)
└── cp-platform/src/engine/  ← Verified application of all formulas
```

## Confidence Legend

| Rating | Meaning |
|--------|---------|
| ★★★★★ | Verified against multiple sources, tested in application |
| ★★★★☆ | Documented in authoritative source, implementation may vary |
| ★★★☆☆ | Partial coverage, needs verification |
| ★★☆☆☆ | Limited coverage, needs further research |
| ★☆☆☆☆ | Unverified, theoretical only |
