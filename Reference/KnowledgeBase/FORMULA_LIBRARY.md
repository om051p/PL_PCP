# Formula Library

> **Purpose:** Complete inventory of all engineering formulas used in PCP design.
> **Source Key:** [Excel] = Cal.(DW) sheet · [CP3] = CP Technologist · [CP4] = CP Specialist
> **Note on CP2:** Formulas from CP2 (Technician level) cover basic field measurement theory (Ohm's law, pipe-to-earth resistance, current requirement estimation methods). These are documented at a conceptual level in `ENGINEERING_CONCEPTS.md` under relevant sections rather than as standalone formula entries here, as the Excel workbook and CP3/CP4 provide the specific engineering formulas used in the application.

---

## 1. Pipeline Surface Area

### Formula
```
A = π × D × L
```

### Excel Reference
- **Cal.(DW) F21:** `=3.14*(F19*F13)`
- App: `calcSurfaceArea(odInches, lengthM)`

### Variables
| Symbol | Description | Unit | Source |
|--------|-------------|------|--------|
| A | Pipe external surface area | m² | Calculated |
| D | Outside diameter (converted) | m | F13 = F12/39.37 |
| L | Section length | m | F19 = F18−F17 |
| π | Pi | — | 3.14 (Excel approximation) |

### Units
- Input: OD in inches, length in meters
- Output: m²

### Source
Excel Cal.(DW) Section 1.9, CP3 Chapter 3

---

## 2. Temperature-Corrected Current Density

### Formula
```
i_T = i_base × 1.25^((T_op − 30) / 10)
```

### Excel Reference
- **Cal.(DW) F22:** `=F20*1.25^((F15-30)/10)`
- App: `calcTempCorrectedCurrentDensity(baseCDmAm2, tempC)`

### Variables
| Symbol | Description | Unit | Source |
|--------|-------------|------|--------|
| i_T | Current density at operating temp | mA/m² | Calculated |
| i_base | Base current density at 30°C | mA/m² | F20 |
| T_op | Operating temperature | °C | F15 |
| 1.25 | Temperature coefficient multiplier | — | Empirical |
| 30 | Reference base temperature | °C | Excel constant |

### Notes
- Uses 1.25^((T-30)/10) exponential growth per 10°C rise
- App uses NACE SP0169 linear correction: `1 + (T − 25) × 0.025` — **differs from Excel**

### Source
Excel Cal.(DW) Section 1.10

---

## 3. Total Protection Current Requirement

### Formula
```
I_req = Σ(A_i × i_T_i) / 1000
I_design = I_req × 1.3
```

### Excel Reference
- **Cal.(DW) F23:** `=F21*F22/1000`
- **Cal.(DW) F24:** `=F23*1.3`
- **Cal.(DW) I29:** `=(F24+G24)*0.5` (dual station split)
- App: `calcCurrentRequirement(segments)`

### Variables
| Symbol | Description | Unit | Source |
|--------|-------------|------|--------|
| I_req | Required protection current | A | Calculated |
| A_i | Surface area of segment i | m² | From section 1 |
| i_T_i | Temperature-corrected CD | mA/m² | From section 2 |
| /1000 | mA to A conversion | — | Unit conversion |
| 1.3 | 30% spare factor | — | THRESHOLDS.SPARE_FACTOR |

### Source
Excel Cal.(DW) Sections 1.11–1.12, CP3 Chapter 3, NACE SP0169

---

## 4. Anode Quantity — Current-Based

### Formula
```
N_current = CEILING(I_design / I_anode_output)
```

### Excel Reference
- **Cal.(DW) F31:** `=ROUNDUP(F29/F30,0)`
- App: Not directly implemented — part of design workflow

### Variables
| Symbol | Description | Unit |
|--------|-------------|------|
| N_current | Number of anodes based on current | — |
| I_design | Design current (with spare) | A |
| I_anode_output | Current output per anode | A/anode |

### Source
Excel Cal.(DW) Section 2.4

---

## 5. Anode Quantity — TR-Based

### Formula
```
N_TR = I_TR_rated / I_anode_output
```

### Excel Reference
- **Cal.(DW) F33:** `=F32/F30`

### Variables
| Symbol | Description | Unit |
|--------|-------------|------|
| N_TR | Number of anodes based on TR rating | — |
| I_TR_rated | TR rated current | A |
| I_anode_output | Current output per anode | A/anode |

### Source
Excel Cal.(DW) Section 2.5

---

## 6. Design Life

### Formula
```
Y = (N × W × U_f) / (C × I)
```

### Excel Reference
- **Cal.(DW) F42:** `=(F38*F39*0.85)/(F41*F40)`
- App: `calcDesignLife(numAnodes, anodeWeightKg, consumptionRateKgAY, trRatedCurrentA)`

### Variables
| Symbol | Description | Unit | Source |
|--------|-------------|------|--------|
| Y | Design life | years | Calculated |
| N | Number of anodes | — | F38 |
| W | Weight per anode | kg | F39 (38.6 for TA-4) |
| U_f | Utilization factor | — | 0.85 (Excel) |
| C | Consumption rate | kg/A·yr | F40 (0.45 for HSCI) |
| I | TR rated current | A | F41 |

### Notes
- Excel uses 0.85 utilization factor (85% of anode mass consumed)
- App does NOT apply the 0.85 factor — **potential discrepancy with Excel**

### Source
Excel Cal.(DW) Section 3.5

---

## 7. Deepwell Groundbed Resistance — Dwight Formula

### Formula
```
R_G = ρ / (2πL) × [ln(8L/d) − 1]
```

### Excel Reference
- **Cal.(DW) F75:** `=(F71/(2*PI()*F72))*(LN((8*F72/F73))-1)`
- App: `calcDweellGroundbedResistance(soilResistivityOhmCm, activeLengthM, boreholeDiaM, topDepthM)`
- App adds term: `+ L/(4h)` (midpoint depth correction)

### Variables
| Symbol | Description | Unit | Source |
|--------|-------------|------|--------|
| R_G | Groundbed resistance | Ω | Calculated |
| ρ | Soil resistivity | Ω·cm → Ω·m | F71 (÷100) |
| L | Active column length | cm | F72 (×100) |
| d | Borehole diameter | cm | F73 (×100) |
| h | Depth to midpoint of active zone | m | F48 + L/2 |

### Notes
- Excel formula: R_G = ρ/(2πL) × [ln(8L/d) − 1]
- **App formula adds L/(4h) term:** R_G = ρ/(2πL) × [ln(8L/d) − 1 + L/(4h)]
- The Excel version omits the L/(4h) depth correction — this is a known formula variant. Both Dwight (1936) and Sunde (1968) include this term for finite-length electrodes.
- Despite the formula difference, **actual results match within 0.04%** for the standard deepwell case (see engineeringAcceptance tests).

### Source
Excel Cal.(DW) Section 5.9, CP3 Section 3.3.1, Dwight (1936)

---

## 8. Shallow Vertical Groundbed Resistance — Sunde Formula

### Formula
```
R_G = 1/N × ρ/(2πL) × [ln(4L/d) − 1 + L/(2h)]
       + ρ/(πLN²) × Σ[ln(2iS/L)]
```

### Excel Reference
- **Cal.(DW) I75:** `=(I71/(2*PI()*I69*I72))*((LN((8*I72)/I73)-1)+((2*I72)/I70)*LN(0.656*I69))`
- App: `calcShallowVerticalGroundbedResistance(...)`

### Variables
| Symbol | Description | Unit |
|--------|-------------|------|
| R_G | Parallel groundbed resistance | Ω |
| ρ | Soil resistivity | Ω·cm → Ω·m |
| L | Anode length per hole | cm |
| d | Borehole diameter | cm |
| h | Depth to anode midpoint | cm |
| N | Number of anode holes | — |
| S | Anode spacing | cm |

### Excel vs App Formula Structure

| Aspect | Excel (Cal.(DW) I75) | Application |
|--------|---------------------|-------------|
| Single anode | R_single = ρ/(2πN×L) × [ln(8L/d) − 1] | R_single = ρ/(2πL) × [ln(4L/d) − 1 + L/(2h)] |
| Mutual coupling | (2L/S) × ln(0.656N) | ρ/(πLN²) × Σ[ln(2iS/L)] |
| Approach | Simplified Sunde with closed-form mutual | Full Sunde summation |

### Notes
- Excel uses a simplified approximation: `(2L/S) × ln(0.656N)` for mutual resistance
- App uses full Sunde series summation
- The Excel formula divides by N in the first term giving `R_G = ρ/(2πNL) × [ln(8L/d) − 1]`, which is slightly different from the standard Dwight/Sunde

### Source
Excel Cal.(DW) Section 5.9, CP3 Section 3.3.2, Sunde (1968)

---

## 9. Active Column Length (Deepwell)

### Formula
```
L_active = startDepth + (N × anodeLength) + ((N−1) × spacing) + cokeCover + cementPlug
```

### Excel Reference
- **Cal.(DW) F55:** `=ROUND(51+(F49*F50)+((F49-1)*F52)+F53,0)`

### Variables
| Symbol | Description | Unit |
|--------|-------------|------|
| L_active | Active column length | m |
| startDepth | Coke cover start depth | m |
| N | Number of anodes | — |
| anodeLength | Length per anode | m |
| spacing | Inter-anode spacing | m |
| cokeCover | Coke cover above top anode | m |
| cementPlug | Cement plug at bottom | m |

### Source
Excel Cal.(DW) Section 4.9

---

## 10. Anode Tail Cable Length Generation

### Formula
```
L_n = CEILING(L_{n−1} + spacing + anodeLength, 5)
```

### Excel Reference
- **Cal.(DW) F80:** `=IF(ROW()-ROW($F$79)+1 > $F$49, "", CEILING(F79 + $F$52 + $F$50, 5))`
- App: Hardcoded input per station (not auto-generated)

### Variables
| Symbol | Description | Unit |
|--------|-------------|------|
| L_n | Cable length for anode n | m |
| L_{n-1} | Cable length for previous anode | m |
| spacing | Inter-anode spacing | m |
| anodeLength | Anode length | m |
| CEILING(..., 5) | Round up to nearest 5m | m |

### Source
Excel Cal.(DW) Section 6.1–6.12

---

## 11. Anode Tail Cable Resistance

### Formula
```
R_tail = L × r
```

### Excel Reference
- **Cal.(DW) F101:** `=IF(F79="", "", F79 * $D$101)` where $D$101 = 1.673×10⁻³ Ω/m (16mm² cable)
- App: `calcAnodeTailParallelResistance(tailLengths, cableSizeMm2)`

### Variables
| Symbol | Description | Unit |
|--------|-------------|------|
| R_tail | Single anode tail resistance | Ω |
| L | Cable length | m |
| r | Resistance per meter | Ω/m |

### Parallel Combination (App Only)
```
R_parallel = 1 / Σ(1 / R_i)
```
The app computes the parallel resistance of all anode tail cables. The Excel workbook computes individual resistances and sums them linearly — another known formula variant.

### Source
Excel Cal.(DW) Section 6.13–6.32

---

## 12. Main Positive and Negative Cable Resistance

### Formula
```
R = L × r
```

### Excel References
- **Cal.(DW) F134:** `=F133*$D$134` (Main Positive, 35mm², 6.59×10⁻⁴ Ω/m)
- **Cal.(DW) F138:** `=F137*$D$138` (Main Negative, 35mm², 6.59×10⁻⁴ Ω/m)
- **Cal.(DW) F140:** `=F139*$D$140` (Neg Secondary, 25mm², 1.053×10⁻³ Ω/m)
- App: `calcCableResistances(cables, numAnodes)`

### Variables
| Symbol | Description | Unit |
|--------|-------------|------|
| R | Cable resistance | Ω |
| L | Cable length | m |
| r | Resistance per meter (from CABLE_SPECS) | Ω/m |

### Cable Spec Reference
| Size | Resistance | Max Current |
|------|-----------|-------------|
| 16mm² | 1.673×10⁻³ Ω/m | 76 A |
| 25mm² | 1.053×10⁻³ Ω/m | 98 A |
| 35mm² | 6.59×10⁻⁴ Ω/m | 118 A |
| 50mm² | 4.95×10⁻⁴ Ω/m | 140 A |
| 70mm² | 3.43×10⁻⁴ Ω/m | 172 A |
| 95mm² | 2.54×10⁻⁴ Ω/m | 205 A |

### Source
Excel Cal.(DW) Sections 6.29–6.35

---

## 13. Total Cable Resistance

### Formula
```
R_c = R_tails_parallel + R_main_pos + R_main_neg + R_sec_neg
```

### Excel Reference
- **Cal.(DW) F143:** `=F121+F134+F141`

### Source
Excel Cal.(DW) Section 6.35

---

## 14. Back EMF Resistance

### Formula
```
R_emf = (2 × V_emf) / I_rated
```

### Excel Reference
- **Cal.(DW) F149:** `=F148/F147` where V_emf = 2V
- App: Calculated in `calcTRCircuit()` with `(2 * backEMFVolts) / trRatedCurrent`

### Variables
| Symbol | Description | Unit |
|--------|-------------|------|
| R_emf | Back EMF equivalent resistance | Ω |
| V_emf | Back EMF voltage | V (2V constant) |
| I_rated | TR rated current | A |

### Source
Excel Cal.(DW) Section 7.3

---

## 15. Total Circuit Resistance

### Formula
```
R_T = R_G + R_c + R_emf + R_s
```

### Excel Reference
- **Cal.(DW) F156:** `=F153+F152+F154+F155`
- App: `calcTRCircuit()` computes internally

### Variables
| Symbol | Description | Unit |
|--------|-------------|------|
| R_T | Total circuit resistance | Ω |
| R_G | Groundbed resistance | Ω |
| R_c | Total cable resistance | Ω |
| R_emf | Back EMF resistance | Ω |
| R_s | Structure-to-earth resistance | Ω |

### Source
Excel Cal.(DW) Section 8.5, CP3 Chapter 3, CP4 Chapter 4

---

## 16. Minimum TR Voltage

### Formula
```
V_min = (R_T × I_rated) / 0.7
```

### Excel Reference
- **Cal.(DW) F161:** `=(F159*F160)/0.7`
- App: `calcTRCircuit()` computes `V_min = R_T × I_rated + V_emf`

### Variables
| Symbol | Description | Unit |
|--------|-------------|------|
| V_min | Minimum TR voltage required | V |
| R_T | Total circuit resistance | Ω |
| I_rated | TR rated current | A |
| 0.7 | 70% utilization factor | — |

### Notes
- Excel: V_min = (R_T × I_rated) / 0.7
- App: V_min = R_T × I_rated + V_emf
- These are algebraically equivalent only when V_emf is negligible relative to R_T×I_rated
- For Station-1 (30V, 25A): Excel ≈ 15.76V, App ≈ 16.60V — **minor discrepancy from V_emf handling**

### Source
Excel Cal.(DW) Section 9.3

---

## 17. Maximum Allowable Groundbed Resistance

### Formula
```
R_G_max = [0.7 × (V_r − V_emf) / I] − R_c − R_s
```

### Excel Reference
- **Cal.(DW) F171:** `=(0.7*((F167-F169)/F168))-F166-F170`
- App: `calcTRCircuit()` computes `maxGroundbedResAllowable`

### Variables
| Symbol | Description | Unit |
|--------|-------------|------|
| R_G_max | Max allowable groundbed resistance | Ω |
| 0.7 | 70% utilization factor | — |
| V_r | TR rated voltage | V |
| V_emf | Back EMF (2V) | V |
| I | TR rated current | A |
| R_c | Total cable resistance | Ω |
| R_s | Structure-to-earth resistance | Ω |

### Source
Excel Cal.(DW) Section 10.6

---

## 18. Maximum Allowable Circuit Resistance

### Formula (70% check)
```
R_T_max_70 = (V_rated / I_rated) × 0.7
```

### Formula (90% check)
```
R_T_max_90 = (V_rated / I_rated) × 0.9
```

### Excel References
- **Cal.(DW) F178:** `=(F177/F176)*0.7`
- **Cal.(DW) F185:** `=(F184/F183)*0.9`
- App: `calcTRCircuit()` with `CIRCUIT_RESISTANCE_OPERATING` (0.7) and `CIRCUIT_RESISTANCE_WARNING` (0.9)

### Validation Checks
- F180: IF(R_T < R_T_max_70, "YES", "NO")
- F187: IF(R_T < R_T_max_90, "Yes", "NO")

### Source
Excel Cal.(DW) Sections 10.11–10.18

---

## 19. SAES-X-400 Remoteness Distance

### Formula (Decision Table)

```
IF(I ≤ 35,
    IF(ρ < 500, 20, IF(ρ ≤ 1000, 25, IF(ρ ≤ 3000, 50, 75))),
  IF(I ≤ 50,
    IF(ρ < 500, 30, IF(ρ ≤ 1000, 35, IF(ρ ≤ 3000, 75, 150))),
  IF(I ≤ 100,
    IF(ρ < 500, 65, IF(ρ ≤ 1000, 75, IF(ρ ≤ 3000, 150, 250))),
  IF(I ≤ 150,
    IF(ρ < 500, 100, IF(ρ ≤ 1000, 125, IF(ρ ≤ 3000, 225, 350))),
    "Invalid"))))
```

### Excel Reference
- **Cal.(DW) F193:** (multi-level nested IF — see spreadsheet)
- App: Not directly implemented (imported as user input)

### Variables
| Symbol | Description | Unit |
|--------|-------------|------|
| I | TR rated current | A |
| ρ | Soil resistivity | Ω·cm |
| Distance | Min separation from buried structures | m |

### Source
Excel Cal.(DW) Section 11.3, SAES-X-400

---

## 20. AC Power Consumption

### DC Power
```
P_DC = V_rated × I_rated
```

### AC Input KVA
```
KVA_AC = P_DC / (Eff × PF) / 1000
```

### AC Input Current
```
I_AC = (KVA_AC × 1000) / (V_AC × √3)
```

### Excel References
- **Cal.(DW) F204:** `=F202*F203` (DC Power)
- **Cal.(DW) F205:** `=(F203*F202)/(0.6)/1000` (AC KVA)
- **Cal.(DW) F206:** `=F205*1000/(F198*SQRT(F199))` (AC Current)
- App: `calcTRCircuit()` with THRESHOLDS.TR_EFFICIENCY and THRESHOLDS.RECTIFIER_EFFICIENCY

### Variables
| Symbol | Description | Unit | Source |
|--------|-------------|------|--------|
| P_DC | DC power | W | F204 |
| V_rated | TR rated voltage | V | F162 |
| I_rated | TR rated current | A | F32 |
| Eff | Efficiency | — | 80% (F200 → 0.8) |
| PF | Power factor | — | 0.8 (F201) |
| V_AC | AC supply voltage | V | 480 (F198) |
| √3 | 3-phase factor | — | SQRT(3) (F199) |

### Notes
- Excel: Eff × PF = 0.8 × 0.8 = 0.64, but formula uses `/0.6` not `/0.64`
- App: `0.8 × 0.8 = 0.64` — **numerical discrepancy with Excel's 0.6**
- This causes a ~6.7% difference in AC KVA calculation

### Source
Excel Cal.(DW) Sections 12.5–12.9

---

## 21. Calcined Petroleum Coke Backfill Requirement

### Base Bags
```
N_base = CEILING(L_active × 3.28 × 39.2 / 50, 0)
```

### With Contingency
```
N_final = CEILING(N_base × 1.15, 0)
```

### Excel References
- **Cal.(DW) F212:** `=ROUNDUP((F210*3.28*39.2)/50,0)` (Deepwell)
- **Cal.(DW) I212:** `=ROUNDUP((I210*I34*3.28*39.2)/50,0)` (Shallow — multiplies by hole count)
- **Cal.(DW) F213:** `=ROUNDUP(F212*1.15,0)`
- App: `calcCokeRequirement(activeLengthM)`

### Constants
| Constant | Value | Description | Source |
|----------|-------|-------------|--------|
| 3.28 | ft/m | Feet per meter | THRESHOLDS.COKE_FT_PER_M |
| 39.2 | — | Annulus volume factor | THRESHOLDS.COKE_ANNULUS_FACTOR |
| 50 | lb | Pounds per bag | THRESHOLDS.COKE_BAG_LBS |
| 1.15 | — | 15% site contingency | THRESHOLDS.COKE_BACKFILL_CONTINGENCY |

### Notes
- **Excel label says "10% contingency" (row 213) but uses 1.15 (15%)**
- Deepwell (F212): uses active length directly
- Shallow (I212): uses active length × number of anode holes

### Source
Excel Cal.(DW) Sections 13.3–13.4

---

## 22. Activation Polarization — Tafel Equation

### Formula
```
η = β × log(i / i_0)
```

### Where
| Symbol | Description | Unit |
|--------|-------------|------|
| η | Activation overpotential | V |
| β | Tafel slope (constant) | V/decade |
| i | Current density at electrode surface | A/m² |
| i_0 | Exchange current density | A/m² |

### Source
CP3 Section 1.4.2, CP4 Chapter 1

---

## 23. Concentration Polarization

### Formula
```
η_conc = (RT / nF) × ln(1 − i / i_L)
```

### Where
| Symbol | Description | Unit |
|--------|-------------|------|
| η_conc | Concentration overpotential | V |
| R | Universal gas constant | 8.314 J/(mol·K) |
| T | Absolute temperature | K |
| n | Number of electrons transferred | — |
| F | Faraday constant | 96,485 C/mol |
| i | Current density | A/cm² |
| i_L | Limiting diffusion current density | A/cm² |

### Source
CP3 Section 1.4.2

---

## 24. Faraday's Law (Weight Loss)

### Formula
```
w = (I × t × M) / (n × F)
```

### Where
| Symbol | Description | Unit |
|--------|-------------|------|
| w | Weight of metal consumed | g |
| I | Current | A |
| t | Time | s |
| M | Molar mass | g/mol |
| n | Number of electrons | — |
| F | Faraday constant | 96,485 C/mol |

### Source
CP3 Section 1.4, CP4 Chapter 1

---

## 25. Attenuation (Pipeline)

### Formula
```
V_x = V_0 × e^(−αx)
```

### Where
| Symbol | Description | Unit |
|--------|-------------|------|
| V_x | Potential at distance x from drain point | V |
| V_0 | Potential at drain point | V |
| α | Attenuation constant (√(R/r)) | 1/m |
| x | Distance from drain point | m |
| R | Pipe lineal resistance | Ω/m |
| r | Coating resistance | Ω·m |

### Source
CP3 Chapter 3 (Attenuation), CP4 Chapter 5

---

## 26. Current Distribution / Multiple Drain Points

### Formula
```
I_x = I_0 × e^(−αx)
```

### Iterative Solution
For multiple drain points on a pipeline, Kirchhoff's current law is applied at each node and solved iteratively:

```
At each node: ΣI_in = ΣI_out
```

### Source
CP4 Chapter 5, CP3 Section 3.6

---

## 27. Pipe-to-Earth Resistance

### Formula
```
R_pipe = (ρ / π²D) × ln(4L / d)
```

### Where
| Symbol | Description | Unit |
|--------|-------------|------|
| R_pipe | Pipe-to-earth resistance | Ω |
| ρ | Soil resistivity | Ω·cm |
| D | Pipe diameter | cm |
| L | Pipe length | cm |
| d | Distance to remote earth | cm |

### Source
CP3 Section 3.3.5

---

## Formula Cross-Reference Index

| # | Formula Name | Excel Cell | App Function | Tests |
|---|-------------|-----------|-------------|-------|
| 1 | Surface Area | F21 | `calcSurfaceArea()` | ✅ Verified |
| 2 | Temp-Corrected CD | F22 | `calcTempCorrectedCurrentDensity()` | ✅ (differs from Excel) |
| 3 | Current Requirement | F23–F24 | `calcCurrentRequirement()` | ✅ Verified |
| 6 | Design Life | F42 | `calcDesignLife()` | ✅ (no U_f in app) |
| 7 | Deepwell Groundbed | F75 | `calcDweellGroundbedResistance()` | ✅ <0.04% variance |
| 8 | Shallow Groundbed | I75 | `calcShallowVerticalGroundbedResistance()` | ⚠️ Formula variant |
| 11 | Anode Tail Cable | F101–F120 | `calcAnodeTailParallelResistance()` | ⚠️ Series vs parallel |
| 14 | Back EMF Resistance | F149 | `calcTRCircuit()` | ✅ Verified |
| 15 | Total Circuit R | F156 | `calcTRCircuit()` | ✅ Verified |
| 16 | Min TR Voltage | F161 | `calcTRCircuit()` | ⚠️ V_emf handling |
| 17 | Max Allowable RG | F171 | `calcTRCircuit()` | ✅ Verified |
| 18 | Max Circuit R 70%/90% | F178/F185 | `calcTRCircuit()` | ✅ Verified |
| 20 | AC Power | F204–F206 | `calcTRCircuit()` | ⚠️ Eff×PF discrepancy |
| 21 | Coke Backfill | F212–F213 | `calcCokeRequirement()` | ✅ Verified |
| 19 | SAES-X-400 Distance | F193 | Not implemented | ❌ Missing |
