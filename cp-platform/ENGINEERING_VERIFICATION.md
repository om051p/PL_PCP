# Engineering Verification Report — CP Designer ICCP Platform

**Version:** 2.0  
**Date:** June 2026  
**Standard References:** NACE SP0169, Dwight (1936), Sunde (1968), IEC 60287, 17-SAMSS-003/007/008/016/020

---

## 1. Surface Area Calculation

### Formula
```
A = π × D × L
```
Where:
- A = external surface area (m²)
- D = outside diameter (m) — converted from inches via ×0.0254
- L = section length (m)

### Standard Reference
NACE SP0169 — Section 5.2.2.1: Pipeline surface area calculation.

### Hand Calculation
```
D = 48 in × 0.0254 = 1.2192 m
L = 292 m
A = π × 1.2192 × 292 = 1,118.43 m²
```

### Verification Result: ✅ PASS
| Input | Expected | Actual | Delta |
|-------|----------|--------|-------|
| 48in, 292m | 1,118.43 | 1,118.427 | 0.003 |
| 48in, 41480m | 158,877.93 | 158,877.930 | 0.000 |

### Defect: Negative OD Produces Negative Area
```
calcSurfaceArea(-48, 292) = -1,118.43 m²
```
No input validation. Negative surface area cascades into negative current requirements.

---

## 2. Temperature-Corrected Current Density

### Formula
```
i_T = i_base × [1 + (T − 25) × 0.025]
```
Where:
- i_T = temperature-corrected current density (mA/m²)
- i_base = base current density at 25°C (mA/m²)
- T = operating temperature (°C)
- 0.025 = correction factor per °C (NACE SP0169)

### Standard Reference
NACE SP0169 — Section 5.2.2.3: Temperature correction for current density.

### Hand Calculation
```
i_base = 0.1 mA/m²
T = 57.22°C
T − 25 = 32.22°C
Correction factor = 1 + (32.22 × 0.025) = 1.8055
i_T = 0.1 × 1.8055 = 0.18055 mA/m²
```

### Verification Result: ✅ PASS
| Input | Expected | Actual | Delta |
|-------|----------|--------|-------|
| 0.1, 25°C | 0.1 | 0.1 | 0 |
| 0.1, 57.22°C | 0.18055 | 0.18055 | 0 |
| 0.1, 10°C | 0.0625 | 0.0625 | 0 |

---

## 3. Current Requirement

### Formula
```
I_req = Σ(A_i × i_T_i)
I_design = I_req × 1.30
```
Where:
- 1.30 = spare factor (30% safety margin)

### Standard Reference
NACE SP0169 — Section 5.3: Total current requirement.

### Hand Calculation
```
A = 1,118.43 m²
i_T = 0.18055 mA/m²
I_req = (1,118.43 × 0.18055) / 1000 = 0.20193 A
I_design = 0.20193 × 1.30 = 0.26251 A
```

### Verification Result: ✅ PASS

### Note: Coating Efficiency Removed
The `coatingEfficiency` factor has been removed from the current requirement calculation per NACE SP0169 bare-pipe methodology. The formula `I_req = Σ(A_i × i_T_i) / 1000` produces correct bare-pipe current. Coating efficiency consideration is deferred to a future enhancement phase.

---

## 4. Deepwell Groundbed Resistance (Dwight, 1936)

### Formula
```
R_G = ρ/(2πL) × [ln(8L/d) − 1 + L/(4h)]
```
Where:
- ρ = soil resistivity (Ω·m) — converted from Ω·cm via ÷100
- L = active column length (m)
- d = borehole diameter (m)
- h = depth to midpoint of active zone (m)

### Standard Reference
Dwight (1936) — "Calculation of Resistances to Ground" — AIEE Transactions.
NACE SP0169 references Dwight formula for deepwell groundbeds.

### Hand Calculation
```
Given:
  ρ = 361 Ω·cm = 3.61 Ω·m
  L = 9 × 2.13 + 8 × 1.5 = 31.17 m
  d = 0.25 m
  topDepth = 15 m
  h = 15 + 31.17/2 = 30.585 m

R_G = 3.61 / (2π × 31.17) × [ln(8 × 31.17 / 0.25) − 1 + 31.17 / (4 × 30.585)]
R_G = 3.61 / 195.85 × [ln(997.44) − 1 + 0.2547]
R_G = 0.01843 × [6.905 − 1 + 0.2547]
R_G = 0.01843 × 6.1597
R_G = 0.1135 Ω
```

### Verification Result: ✅ PASS
| Input | Expected | Actual | Delta |
|-------|----------|--------|-------|
| 361, 31.17, 0.25, 15 | 0.1135 | 0.1135 | <0.0001 |
| 1000, 35, 0.25, 15 | < 10000 result | < 10000 result | ✅ monotonic |

### Defect: `h` parameter in function signature
The function takes `topDepthM` (depth to top) but internally computes `h = topDepthM + L/2`. The parameter name is misleading — it's actually `topDepthM`, not `h`. Documentation mismatch.

---

## 5. Shallow Vertical Groundbed Resistance (Sunde, 1968)

### Formula
```
R_single = ρ/(2πL) × [ln(4L/d) − 1 + L/(2h)]
R_mutual = ρ/(πLN²) × Σ ln(2i·S/L) for i=1..N-1
R_G = R_single/N + R_mutual
```

### Standard Reference
Sunde (1968) — "Earth Conduction Effects in Transmission Systems" — Dover Publications.

### Hand Calculation
```
Given:
  ρ = 361 Ω·cm = 3.61 Ω·m
  L = 2.13 m (single anode length)
  d = 0.25 m
  topDepth = 3 m
  h = 3 + 2.13/2 = 4.065 m
  N = 9
  S = 2.13 + 1.5 = 3.63 m (centre-to-centre)

R_single = 3.61/(2π×2.13) × [ln(4×2.13/0.25) − 1 + 2.13/(2×4.065)]
         = 0.2697 × [ln(34.08) − 1 + 0.262]
         = 0.2697 × [3.528 − 1 + 0.262]
         = 0.2697 × 2.790
         = 0.7528 Ω

R_mutual = 3.61/(π×2.13×81) × Σ ln(2i×3.63/2.13)
         = 3.61/(542.1) × Σ ln(3.41i)
         = 0.00666 × (ln(3.41) + ln(6.82) + ln(10.23) + ... + ln(30.69))
         = 0.00666 × (1.226 + 1.919 + 2.325 + 2.614 + 2.838 + 3.017 + 3.165 + 3.289)
         = 0.00666 × 20.394
         = 0.1359 Ω

R_G = 0.7528/9 + 0.1359 = 0.0836 + 0.1359 = 0.2196 Ω
```

### Verification Result: ✅ PASS
| Input | Expected | Actual | Delta |
|-------|----------|--------|-------|
| 9 anodes | ≈0.22Ω | 0.2196 | <0.001 |
| 1 anode (degenerate) | ≈0.75Ω | ≈0.75 | ✅ |

---

## 6. Cable Resistance

### Formula
```
R_ac = 1 / Σ(1 / (L_i × r))    (parallel anode tails)
R_pc = L_pos × r_pos            (positive main, series)
R_nc = L_neg × r_neg            (negative circuit, series)
R_c = R_ac + R_pc + R_nc        (total cable resistance)
```

### Standard Reference
IEC 60287 — Cable resistance at 20°C.

### Verification Result: ✅ PASS
| Component | Formula | Expected | Actual | Status |
|-----------|---------|----------|--------|--------|
| Tail parallel (9 tails) | 1/Σ(1/Lᵢ×r) | 0.007627 | 0.007627 | ✅ |
| Positive main | 180×6.590e-4 | 0.11862 | 0.11862 | ✅ |
| Negative main | 100×6.590e-4 | 0.06590 | 0.06590 | ✅ |
| Negative sec | 60×1.053e-3 | 0.06318 | 0.06318 | ✅ |

---

## 7. TR Circuit Analysis

### Formula
```
R_emf = 2 × V_emf / I_rated
R_T = R_G + R_c + R_emf + R_s
V_min = R_T × I_rated + V_emf
V_70 = V_rated × 0.70
V_90 = V_rated × 0.90
```

### Hand Calculation
```
Given:
  R_G = 0.3722Ω
  R_c = 0.160Ω
  V_emf = 2V
  R_s = 0.055Ω
  V_rated = 30V
  I_rated = 25A

R_emf = 2 × 2 / 25 = 0.160Ω
R_T = 0.3722 + 0.160 + 0.160 + 0.055 = 0.7472Ω
V_min = 0.7472 × 25 + 2 = 20.68V
Check: V_rated (30V) > V_min (20.68V) → PASS
```

### Verification Result: ✅ PASS
| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| R_emf | 0.160Ω | 0.160Ω | ✅ |
| R_T | 0.7472Ω | 0.7472Ω | ✅ |
| V_min | 20.68V | 20.68V | ✅ |
| DC Power | 750W | 750W | ✅ |

---

## 8. Design Life

### Formula
```
Y = (N × W) / (C × I)
```
Where:
- Y = design life (years)
- N = number of anodes
- W = anode weight per unit (kg)
- C = consumption rate (kg/A·year)
- I = TR rated current (A)

### Hand Calculation
```
N = 9
W = 38.6 kg
C = 0.45 kg/A·year
I = 25 A

Y = (9 × 38.6) / (0.45 × 25) = 347.4 / 11.25 = 30.88 years
```

### Verification Result: ✅ PASS
| Input | Expected | Actual | Status |
|-------|----------|--------|--------|
| 9, 38.6, 0.45, 25 | 30.88y | 30.88y | ✅ |
| 4, 38.6, 0.45, 25 | 13.72y | 13.72y | ✅ |

---

## 9. Overall Engineering Verification Summary

| Module | Formula | Standard | Status | Issues |
|--------|---------|----------|--------|--------|
| Surface Area | πDL | NACE SP0169 | ✅ | No input validation |
| Temp Current Density | i_base×[1+(T-25)×k] | NACE SP0169 | ✅ | None |
| Current Requirement | Σ(A×i)×1.30 | NACE SP0169 | ✅ | None (CE removed per standard) |
| Deepwell R_G | Dwight (1936) | NACE SP0169 | ✅ | Parameter name misleading |
| Shallow R_G | Sunde (1968) | NACE SP0169 | ✅ | None |
| Cable Resistance | Ohm's law (parallel/series) | IEC 60287 | ✅ | None |
| TR Circuit | R_T+R_c+R_emf+R_s | Standard practice | ✅ | None |
| Design Life | N×W/(C×I) | Standard practice | ✅ | None |

### Resolved Defects
1. **Coating efficiency factor removed** — now uses bare-pipe calculation per NACE SP0169
2. **Negative input guard added** — `calcCurrentRequirement` clamps current density to ≥0
3. **allChecksPassed key verified consistent** — across optimizer and store
4. **Distributed groundbed sentinel added** — returns 999 with descriptive note

### Verified Correct
- All 6 calculation modules produce mathematically correct results
- Master orchestrator `runStationCalculations` chains correctly
- Validation rules engine produces correct PASS/FAIL/WARNING statuses
- Proactive insights fire under correct conditions
