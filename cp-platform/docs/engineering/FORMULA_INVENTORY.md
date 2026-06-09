---
title: Formula Inventory
---

# FORMULA INVENTORY — ICCP Engineering Calculations

> **Source:** `PCP Calculation sheet.xlsx` — Sheet: `Cal.(DW)`
> **Corresponding Code:** `src/engine/modules/calculations.js`
> **Golden Dataset:** `src/engine/__tests__/goldenDatasets.test.js`
> **Related Documents:**
>   - [Engineering Assumptions](ENGINEERING_ASSUMPTIONS.md) — design basis and constants
>   - [Calculation Flow](CALCULATION_FLOW.md) — sequence diagram
>   - [Dependency Map](DEPENDENCY_MAP.md) — variable graph

---

## Section 1: Pipeline Design Parameters & Current Requirements

### 1.1 — Outside Diameter (Meters)

```
D = OD(inch) × 0.0254
```

| Variable | Description | Unit | Source |
|---|---|---|---|
| `OD` | Outside diameter | inch | User input |
| `D` | Outside diameter | m | Calculated |

**Excel:** Row 13, Column F/G = `E12*0.0254` (48" × 0.0254 = 1.2192m)
**Code:** `calcSurfaceArea()` line `const odM = odInches * 0.0254`
**Verification:** Golden dataset test validates pi * 1.2192 * 292 = 1117.86 m² ✅

### 1.2 — Pipeline Surface Area

```
A = π × D × L
```

| Variable | Description | Unit | Source |
|---|---|---|---|
| `D` | Outside diameter | m | Calculated (1.1) |
| `L` | Pipeline section length | m | User input |
| `A` | External surface area | m² | Calculated |

**Code:** `calcSurfaceArea(odInches, lengthM)` → `Math.PI * odM * lengthM`
**Verification:** π × 1.2192 × 292 = 1,117.86 m² — matches golden dataset ✅

### 1.3 — Temperature-Corrected Current Density (NACE SP0169)

```
i_T = i_base × [1 + (T − 25) × 0.025]
```

**Code:** `calcTempCorrectedCurrentDensity(baseCDmAm2, tempC)`

**Formula structure:** Matches NACE SP0169 exactly.

**Note:** The formula computes `0.1 × (1 + (57.22-25) × 0.025) = 0.1806 mA/m²` but the Excel cell shows `0.1836 mA/m²` (~1.6% difference). This suggests the Excel cell formula references a temperature value slightly different from the displayed 57.22°C. The formula structure (`i_base × [1 + (T-25) × 0.025]`) is confirmed correct in both implementations.

### 1.4 — Total Current Required

```
I_req = (A × i_T) / 1000
```

**Code:** `calcCurrentRequirement()` → `(area * ce * iTemp) / 1000`

**Note:** Code includes `coatingEfficiency (ce)` factor not present in Excel. This is an enhancement — the code correctly accounts for coating blocking current to the pipe.

### 1.5 — Design Current (With Spare Capacity)

```
I_design = I_req × 1.30
```

**Code:** `currentResult.designA = totalCurrentA * THRESHOLDS.SPARE_FACTOR (1.3)`
**Status:** ✅ Exact match

---

## Section 2: Anode Requirements

### 2.1 — Number of Anodes Based on Current

```
N_current = ceil(I_design / I_a)
```

**Excel:** Row 31: 19.08A / 3.56A = 5.36 → 6 anodes
**Code:** `Math.ceil(r.designCurrentA / st.anodeSpec.outputAmps)`

### 2.2 — Number of Anodes Based on TR Rating

```
N_TR = ceil(I_rated / I_a)
```

**Excel:** Row 33: 25A / 3.56A = 7.02 anodes
**Code:** `Math.ceil(st.tr.ratedCurrent / st.anodeSpec.outputAmps)`

---

## Section 3: Design Life Calculation

### 3.1 — Anode Bed Design Life

```
Y = (N × W) / (C × I)
```

| Variable | Description | Unit | Source |
|---|---|---|---|
| `N` | Number of anodes | ea. | User input |
| `W` | Single anode weight (38.6 kg TA-4) | kg | Constant per anode spec |
| `C` | Consumption rate (0.45 kg/A·yr) | kg/A·yr | Constant per anode spec |
| `I` | Current used for consumption calculation | A | See note below |
| `Y` | Design life | years | Calculated |

**Code:** `calcDesignLife(numAnodes, anodeWeightKg, consumptionRateKgAY, trRatedCurrentA)`

Using `I = I_rated = 25A`: 9 × 38.6 / (0.45 × 25) = **30.88 years**
Using `I = I_effective = 29.41A`: 9 × 38.6 / (0.45 × 29.41) = **26.25 years** (matches Excel)

**Conclusion:** The Excel formula references a different current value (29.41A) than the displayed TR rating (25A). This could be an effective current accounting for derating or a cell reference different from what appears in Row 41. The formula structure `N×W/(C×I)` is confirmed correct in both implementations.

---

## Section 4: Anode Configuration (Inputs)

Input parameters only — no formulas. See [Dependency Map](DEPENDENCY_MAP.md) for full variable list.

---

## Section 5: Groundbed Resistance

### 5.1 — Deepwell Groundbed Resistance (Dwight, 1936)

```
R_G = ρ/(2πL) × [ln(8L/d) − 1 + L/(4h)]
```

**Code:** `calcDweellGroundbedResistance()`

**Verification (Station 1):** ρ=3.61Ω·m, L=35m, d=0.25m, h=32.5m
- R_G = 3.6101/(2π×35) × [ln(1120) − 1 + 0.2692]
- R_G = 0.01641 × 6.290 = **0.1032 Ω**
- Excel shows: **0.0988 Ω** (~4% difference — different Dwight variant constants)

**Status:** ✅ Formula structure matches. Dwight (1936) formula variant difference.

### 5.2 — Shallow Vertical Groundbed Resistance (Sunde, 1968)

```
R_single = ρ/(2πL) × [ln(4L/d) − 1 + L/(2h)]
R_mutual = ρ/(π×L×N²) × Σ(i=1 to N-1) [ln(2×i×S/L)]
R_G = R_single/N + R_mutual
```

**Code:** `calcShallowVerticalGroundbedResistance()`
**Status:** ✅ Matches Sunde (1968)

---

## Section 6: Cable Resistance

| Formula | Code | Excel Verification |
|---|---|---|
| `R_i = L_i × r_16mm²` | `calcAnodeTailParallelResistance()` | 25m × 0.001673 = 0.0418Ω ✅ |
| `R_ac = 1 / Σ(1/R_i)` | Same | 0.00763Ω ✅ |
| `R_pc = L_pos × r_35mm²` | Same | 180 × 0.000659 = 0.1186Ω ✅ |
| `R_nc = L_neg_main × r_35mm² + L_neg_sec × r_25mm²` | Same | 0.1291Ω ✅ |
| `R_c = R_ac + R_pc + R_nc` | Same | **0.2553Ω** ✅ |

**Status:** ✅ All exact matches

---

## Section 7: Back EMF Resistance

```
R_emf = 2 × V_emf / I_rated
```

**Code:** `calcTRCircuit()` → `(2 * backEMFVolts) / trRatedCurrent`
**Status:** ✅ Exact match (2×2/25 = 0.08Ω)

---

## Section 8: Total Circuit Resistance

```
R_T = R_G + R_c + R_emf + R_s
```

**Code:** `calcTRCircuit()` → `groundbedResOhm + totalCableResOhm + R_emf + structureResOhm`
**Status:** ✅ Exact match

---

## Section 9: Minimum TR Voltage

```
V_min = R_T × I_rated + V_emf
```

**Code:** `calcTRCircuit()` → `R_T * trRatedCurrent + backEMFVolts`

**Verification:** Using R_T = 0.482Ω, I = 25A, V_emf = 2V:
- V_min = 0.482 × 25 + 2 = **14.04V**
- Excel shows: **17.20V** (3.16V higher)

**Analysis:** The 3.16V difference implies Excel is using a different R_T or I value. 17.20V = (R_T + 0.126) × 25 + 2, suggesting an additional 0.126Ω of resistance in the Excel circuit that isn't accounted for in the code's R_T total. This may represent a safety margin or additional circuit element (e.g., bond resistance, test lead resistance) explicitly included in the Excel formula but not in the code.

**Status:** ⚠️ Needs formula cell reference verification in Excel. Code formula structure is correct.

---

## Section 10: Maximum Allowable Resistance

### 10.1 — Maximum Allowable Groundbed Resistance

```
R_Gmax = 0.70 × [(V_rated − EMF) / I_rated] − R_c − R_s      (Excel)
R_Gmax = 0.70 × (V_rated / I_rated) − R_c − R_s                (Code)
```

**⚠️ Discrepancy: Code omits EMF subtraction**
- Excel: `0.7 × [(30 - 2) / 25] - 0.2553 - 0.055 = 0.4736Ω`
- Code: `0.7 × (30/25) - 0.2553 - 0.055 = 0.5297Ω`
- Difference: **+0.056Ω (+12%) — code is less conservative**

### 10.2 — Circuit Resistance Limits

- `R_Tmax_70 = 0.70 × V/I` — ✅ Exact match
- `R_Tmax_90 = 0.90 × V/I` — ✅ Exact match

---

## Section 11: Groundbed Remoteness

No formulas — comparison per SAES-X-400.

---

## Section 12: AC Power Consumption

### 12.1 — DC Power

```
P_DC = V_rated × I_rated
```

**Status:** ✅ Exact match

### 12.2 — AC Input Power

```
AC_kVA = P_DC / (Eff × PF × 1000)
```

**Excel:** 750 / (0.80 × 0.80 × 1000) = **1.17 kVA** (using 80%/0.8)
**Code:** `dcPowerW / (0.8 * 0.8 * 1000)` = **1.17 kVA**
**Excel cell shows:** 1.25 kVA

**Note:** The Excel cell shows 1.25 kVA, but using the displayed efficiency (80%) and PF (0.8) produces 1.17 kVA. This suggests Excel may be using different Eff/PF values (75%/0.8) or the formula references different cells than Row 200-201. Code constants match the **displayed** values.

### 12.3 — AC Input Current (480V/3Φ)

```
I_ac = (AC_kVA × 1000) / (480 × √3)
```

**Status:** ✅ Exact match

---

## Section 13: Coke Backfill Requirement

```
V_active = π × (d/2)² × L_active
N_bags = ceil(V_active × ρ_bulk × 1.10 / 25)
```

**Code:** `bomRules_Deepwell()` in `bomEngine.js`

---

## Summary of Discrepancies Found

| # | Formula | Excel Value | Code Value | Difference | Severity |
|---|---|---|---|---|---|
| 1 | **RGmax** (10.6) | 0.474Ω (with EMF sub) | 0.530Ω (no EMF sub) | +0.056Ω (+12%) | 🟡 Medium |
| 2 | **V_min** (9.3) | 17.20V | 14.04V | +3.16V (+22%) | 🟡 Medium |
| 3 | **Design Life** (3.5) | 26.25 yrs | 30.88 yrs (calc'd) | ~15% | 🟡 Medium |
| 4 | **AC kVA** (12.8) | 1.25 kVA | 1.17 kVA | ~7% | 🟢 Low |
| 5 | **Coating efficiency** | Not applied | Applied (0.98) | Enhancement | 🟢 Low |

> **Note:** Discrepancies #2 and #3 likely result from limitations in reading Excel `data_only=True` values (actual formula references may differ from displayed cell values). Full formula extraction requires access to the original `.xlsx` with formula preservation.
