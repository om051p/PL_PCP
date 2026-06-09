---
title: Engineering Assumptions
---

# ENGINEERING ASSUMPTIONS — ICCP Design Basis

> **Source:** `PCP Calculation sheet.xlsx` — Sheet: `Cal.(DW)`
> **Code Reference:** `src/constants/index.js`, `src/engine/modules/calculations.js`, `src/engine/__tests__/goldenDatasets.test.js`
> **Date of Analysis:** June 2026
> **Related Documents:**
>   - [Formula Inventory](FORMULA_INVENTORY.md) — all formulas
>   - [Calculation Flow](CALCULATION_FLOW.md) — sequence diagram
>   - [Dependency Map](DEPENDENCY_MAP.md) — variable graph

---

## 1. Design Standards Referenced

| Standard | Title | Application |
|---|---|---|
| **NACE SP0169-2013** | Control of External Corrosion on Underground Metallic Piping Systems | Current density basis, temperature correction |
| **17-SAMSS-003** | Transformer-Rectifier Units for Cathodic Protection | TR unit specification |
| **17-SAMSS-016** | Cast Iron Anodes for Impressed Current Systems | HSCI anode specifications |
| **17-SAMSS-008** | Junction Boxes for Cathodic Protection Systems | Junction box requirements |
| **17-SAMSS-020** | Cable Specification | Cable sizing and materials |
| **17-SAMSS-007** | CP Test Stations | Test station requirements |
| **17-855-011** | Calcined Petroleum Coke Backfill | Coke backfill specification |
| **SAES-X-400** | Cathodic Protection System Requirements | Remoteness requirements |
| **Dwight (1936)** | Electrical Resistivity of an Earth Electrode | Deepwell groundbed resistance formula |
| **Sunde (1968)** | Earth Conduction Effects | Shallow vertical mutual interference formula |
| **IEC 60287** | Cable Ampacity | Cable current-carrying capacity reference |
| **AWWA C213** | FBE Coating Standard | Coating efficiency for FBE |
| **DIN 30670** | 3LPE Coating Standard | Coating efficiency for 3LPE |

---

## 2. Core Engineering Assumptions

### 2.1 — Temperature Correction (NACE SP0169)

```
Assumption: Current density increases by 2.5% per °C above 25°C
Factor: k = 0.025 per °C
```

- **Basis:** NACE SP0169 empirical correction for elevated temperature operation
- **Range of validity:** 0°C to 100°C (linear extrapolation assumed)
- **Impact:** At 57.22°C, current density is **1.805×** the base value
- **Risk:** No upper bound applied. At very high temperatures (>100°C), the linear correction may overestimate demand.

### 2.2 — Spare Capacity Factor

```
Assumption: 30% spare capacity on design current
Factor: F_spare = 1.30
```

- **Basis:** Industry standard for ICCP design to accommodate:
  - Coating degradation over system life
  - Future operating condition changes
  - Measurement uncertainty
- **Applies to:** Section 1.12 — Design current = Required current × 1.30
- **Risk:** Some operators require 25% or 50% depending on specific standards

### 2.3 — Coating Efficiency

```
Assumption: Pipeline coating is intact at beginning of life
Values: FBE = 0.98, 3LPE = 0.99, CTE = 0.95, Bare = 0.0
```

- **Basis:** Manufacturer data for new coatings
- **Note:** The Excel calculation does NOT apply a coating efficiency factor, but the code does (`coatingEfficiency` in `calcCurrentRequirement`)
- **Risk:** Coating degrades over time — this is a beginning-of-life assumption only

### 2.4 — Anode Current Output (HSCI TA-4)

```
Assumption: Each TA-4 anode produces 3.56A continuously for 25 years
```

- **Basis:** Manufacturer specification per 17-SAMSS-016
- **Anode weight:** 38.6 kg per anode
- **Consumption rate:** 0.45 kg/A·year
- **Verification:** 38.6 / (0.45 × 3.56) = 24.1 years (close to 25-year target)

### 2.5 — Soil Resistivity Measurement

```
Assumption: Measured soil resistivity at anode depth is representative
```

- **Method:** Wenner 4-pin test (presumed, not specified in workbook)
- **Depth:** Resistivity at active zone depth is used
- **Limitation:** Single resistivity value — no vertical stratification considered
- **Risk:** If deeper strata have significantly different resistivity, actual R_G may differ

### 2.6 — Groundbed Remoteness (SAES-X-400)

```
Assumption: 20m minimum distance from groundbed to pipeline
```

- **Basis:** SAES-X-400 requirement
- **Verified against:** Actual distance measured on site layout
- **Risk:** If other buried structures exist (parallel pipelines, earthing grids), 20m may be insufficient

### 2.7 — TR Efficiency and Power Factor

```
Assumption: Oil-cooled TR has 80% efficiency and 0.8 power factor
Constants: Eff = 0.80, PF = 0.80
```

- **Basis:** Typical values for conventional oil-cooled thyristor-controlled TR units
- **Code uses:** `0.8 * 0.8 = 0.64` combined factor
- **Note:** Modern switched-mode TR units achieve 92-95% efficiency
- **Risk:** Oversized AC supply if actual efficiency is higher

### 2.8 — Back EMF

```
Assumption: Back EMF = 2V for ICCP systems
```

- **Basis:** Typical value for HSCI anode systems in coke backfill
- **Range:** Typically 1.5V to 3V depending on anode material and environment
- **Impact:** Higher back EMF increases minimum TR voltage requirement

### 2.9 — Structure-to-Earth Resistance

```
Assumption: Structure resistance = 0.055 Ω (typical for coated pipeline)
```

- **Basis:** Rule of thumb for well-coated large-diameter pipelines
- **Range:** 0.01 Ω (bare, large diameter) to 0.5 Ω (small diameter, well-coated)
- **Impact:** Significant contributor to total circuit resistance at this value

### 2.10 — Circuit Resistance Operating Limit

```
Assumption: TR should operate at ≤70% of rated V/I ratio
Warning at: ≤90% of rated V/I ratio
```

- **Basis:** Engineering practice for TR sizing (allows voltage headroom for polarization + coating degradation)
- **70% operating limit:** Ensures TR is not continuously at maximum output
- **90% warning limit:** Triggers re-evaluation before approaching saturation

---

## 3. Material Properties

### 3.1 — High-Silicon Cast Iron TA-4 Anode

| Property | Value | Notes |
|---|---|---|
| Material | HSCI (14.5% Si) | Standard 17-SAMSS-016 |
| Shape | Tubular | Enhanced surface area |
| Weight | 38.6 kg | Per anode |
| Active length | 2.13 m | Per anode |
| Diameter | 64 mm | Body diameter |
| Max current density | 10.8 A/m² | Surface area limit |
| Consumption rate | 0.45 kg/A·year | In coke backfill |
| Output per anode | 3.56 A | For 25-year design life |

### 3.2 — Cable Resistances at 20°C

| Size (mm²) | Resistance (Ω/m) | Application |
|---|---|---|
| 16 mm² | 1.673 × 10⁻³ | Anode tail cables |
| 25 mm² | 1.053 × 10⁻³ | Negative secondary |
| 35 mm² | 6.59 × 10⁻⁴ | Main positive/negative |
| 50 mm² | 4.95 × 10⁻⁴ | Heavy duty main |
| 70 mm² | 3.43 × 10⁻⁴ | Large TR |
| 95 mm² | 2.54 × 10⁻⁴ | Very large TR |

**Note:** Resistance is temperature-dependent. At 60°C, multiply by ~1.16.

### 3.3 — Coke Backfill

| Property | Value | Notes |
|---|---|---|
| Type | Calcined Petroleum Coke | High carbon content |
| Specification | 17-855-011 | Aramco standard |
| Bulk density | ~700 kg/m³ | Loose fill (Reference only; engine uses empirical Aramco annulus factor) |
| Bag size | 50 lb (22.7 kg) | Standard packaging (per Aramco Std) |
| Contingency | +15% | Site wastage allowance (matches Excel workbook) |

---

## 4. Design Life Basis

### 4.1 — System Design Life

```
Target: 25 years (user-configurable: 15-40 years)
```

- The target design life is a project-level parameter
- The actual achieved life is calculated as: `Y = N × W / (C × I_rated)`
- **Minimum margin:** 3 years above target before warning is triggered

### 4.2 — Anode Utilization Factor

```
Assumption: 100% of anode weight is available for consumption
```

- **Reality:** Typically 80-85% utilization (anode consumed to core)
- **Risk:** Actual life may be 15-20% less than calculated
- **Recommendation:** Apply utilization factor of 0.85 for conservative design

---

## 5. Groundbed Design Assumptions

### 5.1 — Deepwell Groundbed

| Assumption | Value | Notes |
|---|---|---|
| Single borehole | Yes | All anodes in one hole |
| Anode spacing | 1.5m (end-to-end) | Centre-to-centre = length + end-to-end |
| Coke cover above top anode | 2.5m | Ensures uniform current distribution |
| Cement plug at bottom | 0.5m | Seals borehole bottom |
| Active column length | N × L_a + (N-1) × S | Total energized zone |
| Dwight formula applies | Yes | Valid for L/d > 4 |

### 5.2 — Shallow Vertical Groundbed

| Assumption | Value | Notes |
|---|---|---|
| Multiple individual holes | Yes | One anode per hole |
| Centre-to-centre spacing | Anode length + end-to-end | Total span |
| Sunde formula applies | Yes | With mutual interference correction |
| Parallel anode assumption | Yes | All anodes connected in parallel |

### 5.3 — Distributed Groundbed

**Status:** Not implemented (`available: false`)
**Future capability:** Distributed anodes along pipeline route

---

## 6. Limitations and Known Issues

| # | Limitation | Impact | Resolution |
|---|---|---|---|
| 1 | Single-layer soil resistivity model | R_G may be incorrect if strata vary | Implement multi-layer soil model |
| 2 | No coating degradation over time | Current demand underestimated at mid-life | Add time-dependent coating degradation |
| 3 | No attenuation analysis | Current distribution along pipeline unknown | Add attenuation calculation per NACE |
| 4 | No stray current interference | Adjacent structures not considered | Add interference analysis module |
| 5 | Anode utilization not factored | Design life overestimated by 15-20% | Apply 0.85 utilization factor |
| 6 | No temperature derating for cables | Cable resistance at temperature higher than 20°C | Add temperature correction to cable R |
| 7 | Single TR per station | Only one TR considered | Add multi-TR station support |

---

## 7. Excel-Specific Assumptions

### 7.1 — Hardcoded vs. Referenced Values

The Excel workbook uses some **hardcoded values** that should be formula-driven:

| Cell | Value | Should Reference |
|---|---|---|
| Row 13: D (m) | `=E12*0.0254` | ✅ Formula (good) |
| Row 29: I_design (station) | `19.08` | ❌ Hardcoded — should reference 1.12 sum |
| Row 32: TR current rating | `25` / `35` | ❌ Hardcoded — user input |
| Row 42: Design life result | `=F38*F39/(F40*F41)` | ✅ Formula (good) |

### 7.2 — Missing Calculations

The Excel does NOT calculate:
- Coke backfill volume formula (Row 212: `91` appears to be a hardcoded value)
- Cable sizing based on voltage drop
- AC power with temperature-corrected cable resistance

---

## 8. Verification Against Golden Datasets

The project includes **15 pre-computed golden dataset tests** in `src/engine/__tests__/goldenDatasets.test.js` that validate calculation outputs against reference values derived from the Excel workbook. All 15 tests currently pass.

## 9. Verification Against Code Implementation

| Assumption | Excel | Code | Match |
|---|---|---|---|
| Spare factor | 1.30 | 1.30 | ✅ |
| Temp correction factor | 0.025 | 0.025 | ✅ |
| Base temperature | 25°C | 25°C | ✅ |
| Back EMF | 2V | 2V | ✅ |
| 70% operating limit | Yes | Yes | ✅ |
| 90% warning limit | Yes | Yes | ✅ |
| Coating efficiency | Not used | Used (0.98 FBE) | ⚠️ Enhancement |
| RGmax formula | V_EMF subtracted | EMF omitted from RGmax | ❌ Discrepancy |
| AC Eff/PF | 80%/0.8 (possibly different) | 0.8/0.8 | ⚠️ Needs verification |
| Minimum remoteness | 20m | 20m | ✅ |
| High resistivity threshold | Not defined | 10,000 Ω·cm | ✅ Code enhancement |
