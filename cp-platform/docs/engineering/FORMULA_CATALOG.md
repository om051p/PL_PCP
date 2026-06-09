---
title: Formula Catalog
---

# FORMULA CATALOG — Complete Formula Inventory with Cell References

> **Source:** `PCP Calculation sheet.xlsx` > Sheet: `Cal.(DW)`
> **Cell Reference Convention:** Excel uses F column for Station 1 (Deepwell), I column for Station 2 (Shallow Vertical)

---

## Section 1: Pipeline Design Parameters & Current Requirements (Rows 9-24)

### Formula 1.2 — Diameter Conversion (inch → meter)

| Property | Value |
|---|---|
| **Cell** | F13, G13 |
| **Excel** | `=F12/39.37` |
| **Math** | \( D_m = \frac{D_{inch}}{39.37} \) |
| **Input** | F12: 48 inches |
| **Output** | F13: 1.2192 m |
| **Purpose** | Convert nominal pipe diameter from inches to meters |

### Formula 1.7 — Pipeline Section Length

| Property | Value |
|---|---|
| **Cell** | F19, G19 |
| **Excel** | `=F18-F17` |
| **Math** | \( L = L_{end} - L_{start} \) |
| **Input** | F18: 292 m, F17: 0 m |
| **Output** | F19: 292 m (Tie-In), G19: 41,480 m (Main) |
| **Purpose** | Calculate the protected pipeline section length |

### Formula 1.9 — Pipeline Surface Area

| Property | Value |
|---|---|
| **Cell** | F21, G21 |
| **Excel** | `=3.14*(F19*F13)` |
| **Math** | \( A = \pi \times L \times D \) |
| **Input** | F19: 292 m, F13: 1.2192 m |
| **Output** | F21: 1,117.86 m² (Tie-In) |
| **Purpose** | Calculate pipeline external surface area for current requirement |

### Formula 1.10 — Temperature-Corrected Current Density

| Property | Value |
|---|---|
| **Cell** | F22, G22 |
| **Excel** | `=F20*1.25^((F15-30)/10)` |
| **Math** | \( i_T = i_{base} \times 1.25^{(T-30)/10} \) |
| **Input** | F20: 0.1 mA/m² (base CD), F15: 57.22°C |
| **Output** | F22: 0.183565 mA/m² |
| **Purpose** | Adjust current density for elevated operating temperature. Uses Arrhenius-type doubling every 10°C above 30°C with factor 1.25 |

### Formula 1.11 — Total Current Required

| Property | Value |
|---|---|
| **Cell** | F23, G23 |
| **Excel** | `=F21*F22/1000` |
| **Math** | \( I_{req} = \frac{A \times i_T}{1000} \) |
| **Input** | F21: 1,117.86 m², F22: 0.183565 mA/m² |
| **Output** | F23: 0.2052 A |
| **Purpose** | Convert surface area × current density from mA to Amps |

### Formula 1.12 — Design Current (30% Spare)

| Property | Value |
|---|---|
| **Cell** | F24, G24 |
| **Excel** | `=F23*1.3` |
| **Math** | \( I_{design} = I_{req} \times 1.30 \) |
| **Output** | F24: 0.2668 A |
| **Purpose** | Apply 30% spare capacity factor for design margin |

---

## Section 2: Anode Requirements (Rows 26-34)

### Formula 2.2 — Station Total Current Demand

| Property | Value |
|---|---|
| **Cell** | F29, I29 |
| **Excel** | `=(F24+G24)*0.5` |
| **Math** | \( I_{station} = (I_{TieIn} + I_{Main}) \times 0.5 \) |
| **Output** | F29: 19.0806 A |
| **Purpose** | Average of two pipeline section currents for this station |

### Formula 2.3 — Anode Current Output

| Property | Value |
|---|---|
| **Cell** | F30, I30 |
| **Excel** | `3.56` (constant) |
| **Output** | 3.56 A per TA-4 anode |
| **Purpose** | HSCI TA-4 anode rated current output for 25-year design life |

### Formula 2.4 — Anodes Based on Current

| Property | Value |
|---|---|
| **Cell** | F31, I31 |
| **Excel** | `=ROUNDUP(F29/F30,0)` |
| **Math** | \( N_{current} = \lceil I_{station} / I_a \rceil \) |
| **Input** | F29: 19.0806 A, F30: 3.56 A |
| **Output** | F31: 6 anodes |
| **Purpose** | Minimum number of anodes to meet current demand |

### Formula 2.5 — Anodes Based on TR Rating

| Property | Value |
|---|---|
| **Cell** | F33, I33 |
| **Excel** | `=F32/F30` |
| **Math** | \( N_{TR} = I_{TR} / I_a \) |
| **Input** | F32: 25 A (TR rated current), F30: 3.56 A |
| **Output** | F33: 7.022 → 8 (rounded up implicitly) |
| **Purpose** | Anodes needed to utilize full TR current capacity |

### Formula 2.6 — Proposed Anode Count

| Property | Value |
|---|---|
| **Cell** | F34, I34 |
| **Excel** | `9` (Station 1), `12` (Station 2) — manually entered, based on max(N_current, N_TR) |
| **Purpose** | Final selected anode count, conservatively rounding up |

---

## Section 3: CP System Lifetime (Rows 36-43)

### Formula 3.5 — Design Life Calculation

| Property | Value |
|---|---|
| **Cell** | F42, I42 |
| **Excel** | `=(F38*F39*0.85)/(F41*F40)` |
| **Math** | \( Y = \frac{N \times W \times U}{I_r \times C} \) |
| **Inputs** | F38: 9 anodes, F39: 38.6 kg (anode weight), F41: 25 A (TR rated), F40: 0.45 kg/A-Y (consumption) |
| **Output** | F42: 26.248 years |
| **Note** | Uses **TR rated current** (25A) not design current (19.08A). The 0.85 utilization factor is applied. |

---

## Section 4: Anode Configuration (Rows 44-62)

### Formula 4.9 — Active Column Length (Deepwell)

| Property | Value |
|---|---|
| **Cell** | F55 |
| **Excel** | `=ROUND(F51+(F49*F50)+((F49-1)*F52)+F53,0)` |
| **Math** | \( L_a = L_{top} + (N \times L_{anode}) + ((N-1) \times S) + L_{bottom} \) |
| **Inputs** | F51: 1.5m (top spacing), F49: 9 anodes, F50: 2.13m (anode length), F52: 1.5m (inter-anode spacing), F53: 2.5m (bottom coke coverage) |
| **Output** | F55: 35 m |
| **Purpose** | Total active column length of deepwell groundbed |

### Formula 4.10 — End of Coke Column

| Property | Value |
|---|---|
| **Cell** | F56 |
| **Excel** | `=F57-F54` |
| **Input** | F57: 50.5m, F54: 0.5m |
| **Output** | F56: 50 m |

### Formula 4.11 — Total Drilling Depth

| Property | Value |
|---|---|
| **Cell** | F57 |
| **Excel** | `=F55+F48+F54` |
| **Input** | F55: 35m, F48: 15m, F54: 0.5m |
| **Output** | F57: 50.5 m |
| **Purpose** | Active column + inactive depth + bottom plug |

---

## Section 5: Anode Groundbed Resistance — Dwight Formula (Rows 63-75)

### Formula 5.9 — Deepwell Groundbed Resistance

| Property | Value |
|---|---|
| **Cell** | F75 |
| **Excel** | `=(F71/(2*PI()*F72))*(LN((8*F72/F73))-1)` |
| **Math** | \( R_G = \frac{\rho}{2\pi L_a} \left( \ln\left(\frac{8L_a}{d}\right) - 1 \right) \) |
| **Inputs** | F71: 361.01 Ω·cm (ρ), F72: 3500 cm (L_a), F73: 25 cm (d) |
| **Output** | F75: 0.0988 Ω |
| **Source** | Dwight (1936) formula for vertical anode resistance |
| **Purpose** | Calculate resistance of deepwell groundbed to remote earth |

**Note:** This is the simplified Dwight formula without the `L/(4h)` correction term for burial depth. The formula assumes the anode column is a single cylindrical conductor.

### Shallow Vertical Resistance (Station 2, Cell I75)

| Property | Value |
|---|---|
| **Cell** | I75 |
| **Excel** | `=(I71/(2*PI()*I69*I72))*((LN((8*I72)/I73)-1)+((2*I69*I72)/I70)*(LN((4*I70+I72)/(4*I70-I72))))` |
| **Math** | Sunde's formula for multiple vertical anodes |
| **Purpose** | Calculate resistance of multiple shallow vertical anodes in parallel |

---

## Section 6: Cable Resistance (Rows 76-143)

### Formula 6.1-6.12 — Anode Tail Cable Lengths

| Property | Value |
|---|---|
| **Cell** | F79 |
| **Excel** | `=F48+10` (first anode) |
| **Cells** | F80-F98 |
| **Formula** | `=IF(ROW()-ROW($F$79)+1 > $F$49, "", CEILING(F79 + $F$52 + $F$50, 5))` |
| **Purpose** | Calculate anode tail cable lengths incrementing by (inter-anode spacing + anode length) each row, rounded up to 5m multiples |
| **Output** | F79: 25m, F80: 30m, ... F87: 65m, F88+: "" (beyond 9 anodes) |

### Formula 6.13-6.32 — Anode Cable Resistances

| Property | Value |
|---|---|
| **Cell** | F101 |
| **Excel** | `=IF(F79="", "", F79 * $D$101)` |
| **Resistance** | D101: 0.001673 Ω/m (16mm² cable) |
| **Output** | F101: 25 × 0.001673 = 0.0418 Ω |
| **Purpose** | Calculate resistance of each anode tail cable |

### Formula 6.25 — Total Anode Cable Resistance (Parallel)

| Property | Value |
|---|---|
| **Cell** | F121 |
| **Excel** | `=1/SUMPRODUCT(IF((F101:F120<>0)*(ISNUMBER(F101:F120)), 1/(F101:F120), 0))` |
| **Math** | \( R_{ac} = \frac{1}{\sum_{i=1}^{n} 1/R_i} \) (parallel resistance) |
| **Output** | F121: 0.00763 Ω |
| **Purpose** | Calculate total parallel resistance of all anode tail cables |

### Formula 6.29 — Main Positive Cable Resistance

| Property | Value |
|---|---|
| **Cell** | F134 |
| **Excel** | `=F133*$D$134` |
| **Input** | F133: 180m (length), D134: 0.000659 Ω/m (35mm²) |
| **Output** | F134: 0.1186 Ω |

### Formula 6.31 — Main Negative Cable Resistance

| Property | Value |
|---|---|
| **Cell** | F138 |
| **Excel** | `=F137*$D$138` |
| **Input** | F137: 100m, D138: 0.000659 Ω/m (35mm²) |
| **Output** | F138: 0.0659 Ω |

### Formula 6.33 — Negative Cable (25mm²) Resistance

| Property | Value |
|---|---|
| **Cell** | F140 |
| **Excel** | `=F139*$D$140` |
| **Input** | F139: 60m, D140: 0.001053 Ω/m (25mm²) |
| **Output** | F140: 0.06318 Ω |

### Formula 6.34 — Total Negative Resistance

| Property | Value |
|---|---|
| **Cell** | F141 |
| **Excel** | `=F140+F138` |
| **Output** | F141: 0.12908 Ω |

### Formula 6.35 — Total Cable Circuit Resistance

| Property | Value |
|---|---|
| **Cell** | F143 |
| **Excel** | `=F121+F134+F141` |
| **Output** | F143: 0.2553 Ω |
| **Purpose** | Sum of all cable resistances (anode tails + positive + negative) |

---

## Section 7: Back EMF Resistance (Rows 144-149)

### Formula 7.3 — Back EMF Resistance

| Property | Value |
|---|---|
| **Cell** | F149 |
| **Excel** | `=F148/F147` |
| **Math** | \( R_{EMF} = E_{emf} / I_{rated} \) |
| **Input** | F148: 2V, F147: 25A |
| **Output** | F149: 0.08 Ω |
| **Purpose** | Equivalent resistance of 2V back EMF at rated current |

---

## Section 8: Total Circuit Resistance (Rows 150-156)

### Formula 8.1 — Positive Circuit Resistance

| Property | Value |
|---|---|
| **Cell** | F152 |
| **Excel** | `=F134+F129` |
| **Math** | \( R_{pos} = R_{main\_pos} + R_{groundbed} \) |
| **Output** | F152: 0.2175 Ω |

### Formula 8.5 — Total Circuit Resistance

| Property | Value |
|---|---|
| **Cell** | F156 |
| **Excel** | `=F153+F152+F154+F155` |
| **Math** | \( R_T = R_{neg} + R_{pos} + R_{EMF} + R_{structure} \) |
| **Output** | F156: 0.4815 Ω |

---

## Section 9: Minimum TR Voltage (Rows 157-162)

### Formula 9.3 — Minimum TR Voltage

| Property | Value |
|---|---|
| **Cell** | F161 |
| **Excel** | `=(F159*F160)/0.7` |
| **Math** | \( V_{min} = \frac{R_T \times I_{rated}}{0.7} \) |
| **Input** | F159: 0.4815 Ω, F160: 25 A |
| **Output** | F161: 17.20 V |
| **Purpose** | Minimum voltage required to drive rated current at 70% utilization. The 0.7 factor means TR operates at max 70% of rated voltage under load. |

---

## Section 10: Maximum Allowable Resistances (Rows 163-187)

### Formula 10.6 — Maximum Allowable Groundbed Resistance

| Property | Value |
|---|---|
| **Cell** | F171 |
| **Excel** | `=(0.7*((F167-F169)/F168))-F166-F170` |
| **Math** | \( R_{Gmax} = 0.7 \times \frac{V_r - EMF}{I} - R_c - R_s \) |
| **Input** | F167: 30V, F169: 2V, F168: 25A, F166: 0.2553Ω, F170: 0.055Ω |
| **Output** | F171: 0.4737 Ω |
| **Purpose** | Maximum resistance groundbed can have while still maintaining 70% voltage margin |

### Formula 10.11 — Maximum Allowable Circuit Resistance

| Property | Value |
|---|---|
| **Cell** | F178 |
| **Excel** | `=(F177/F176)*0.7` |
| **Math** | \( R_{Tmax} = (V_{rated} / I_{rated}) \times 0.7 \) |
| **Output** | F178: 0.84 Ω |

### Formula 10.16 — 90% Rated Circuit Resistance

| Property | Value |
|---|---|
| **Cell** | F185 |
| **Excel** | `=(F184/F183)*0.9` |
| **Math** | \( R_{Tmax90} = (V_{rated} / I_{rated}) \times 0.9 \) |
| **Output** | F185: 1.08 Ω |

---

## Section 11: Anode Groundbed Remoteness (Rows 188-195)

### Formula 11.3 — Required Remoteness Distance (SAES-X-400)

| Property | Value |
|---|---|
| **Cell** | F193 |
| **Excel** | `=IF(F191<=35, IF(F192<500, 20, IF(F192<=1000, 25, IF(F192<=3000, 50, 75))), IF(F191<=50, IF(F192<500, 30, IF(F192<=1000, 35, IF(F192<=3000, 75, 150))), IF(F191<=100, IF(F192<500, 65, IF(F192<=1000, 75, IF(F192<=3000, 150, 250))), IF(F191<=150, IF(F192<500, 100, IF(F192<=1000, 125, IF(F192<=3000, 225, 350))), "Invalid"))))` |
| **Purpose** | Determine minimum distance from anode bed to buried structures per SAES-X-400 based on TR current rating and soil resistivity |
| **Output** | F193: 20 m (for 25A TR, ρ=361 Ω·cm) |

### Formula 11.5 — Remoteness Validation

| Property | Value |
|---|---|
| **Cell** | F195 |
| **Excel** | `=IF(F193<=F194,"Yes","NO")` |
| **Output** | F195: "Yes" (20 ≤ 56) |

---

## Section 12: AC Power Consumption (Rows 196-206)

### Formula 12.7 — DC Power

| Property | Value |
|---|---|
| **Cell** | F204 |
| **Excel** | `=F202*F203` |
| **Output** | F204: 750 W |

### Formula 12.8 — AC Input VA

| Property | Value |
|---|---|
| **Cell** | F205 |
| **Excel** | `=(F203*F202)/(0.6)/1000` |
| **Math** | \( VA_{AC} = \frac{V_{DC} \times I_{DC}}{0.6 \times 1000} \) |
| **Output** | F205: 1.25 kVA |

### Formula 12.9 — AC Input Current

| Property | Value |
|---|---|
| **Cell** | F206 |
| **Excel** | `=F205*1000/(F198*SQRT(F199))` |
| **Math** | \( I_{AC} = \frac{VA_{AC} \times 1000}{V_{AC} \times \sqrt{3}} \) |
| **Output** | F206: 1.50 A |

---

## Section 13: Calcined Petroleum Coke Requirement (Rows 207-213)

### Formula 13.3 — Coke Bag Quantity

| Property | Value |
|---|---|
| **Cell** | F212 |
| **Excel** | `=ROUNDUP((F210*3.28*39.2)/50,0)` |
| **Math** | \( N_{bags} = \lceil (L_a \times 3.28 \times 39.2) / 50 \rceil \) |
| **Input** | F210: 35m (active column length) |
| **Output** | F212: 91 bags |
| **Note** | Converts meters to feet (×3.28), multiplies by annulus factor (39.2), divides by 50 lbs/bag |

### Formula 13.4 — Coke with Contingency

| Property | Value |
|---|---|
| **Cell** | F213 |
| **Excel** | `=ROUNDUP(F212*1.15,0)` |
| **Output** | F213: 105 bags (15% contingency) |

---

## Appendix A: BOM Sheet Formulas

### BOM-(DW) Formulas

The BOM-(DW) sheet contains ~50 formulas across 64 rows. These are **passive consumers** of Cal.(DW) calculation results — no independent engineering logic.

**Auto-numbering (Column A):**
```excel
=IF(OR(G33="-", G19<=0), "", MAX($A$11:A32)+1)
```
Conditional sequential numbering — only numbers items with valid quantities.

**Cross-sheet quantity references (Columns G-H):**
```excel
='Cal.(DW)'!F167     → TR voltage (30V)  → used to select TRU description
='Cal.(DW)'!F168     → TR current (25A)
='Cal.(DW)'!F34:G34  → Number of anodes (9)
='Cal.(DW)'!F48      → Active depth start (15m)
='Cal.(DW)'!F55      → Active column length (35m)
='Cal.(DW)'!F27      → Station name for BOM header
='Cal.(DW)'!F213     → Coke bags (105)
```

**Quantity aggregation (Column F = SUM of G):**
```excel
=SUM(G11:G11)    → Each item qty (most 1)
=SUM(G11:G16)    → Sum of selected TRU variants
=SUM(G11:G16)*2  → Multiplied for TRU ancillaries
```

**Availability indicators (Column I):**
```excel
=IF(ISNUMBER(G11)*(G11>0), "Yes", "No")
```

**Dynamic descriptions (Column C):**
```excel
="Anode-1, HSCI, Tubular, TA-4 c/w -" & 'Cal.(DW)'!F79 & " M 16mm² PVDF/HMWPE Cable"
```
Pulls cable lengths from Cal.(DW) to build BOM item descriptions. Rows C21-C32 build one entry per anode.

### BOM-(HA) Formulas

Same pattern as BOM-(DW) with ~40 formulas across 51 rows. Key differences:
- References Cal.(DW) **column I** (Station 2 — Shallow Vertical) instead of column F
- `E38: ='Cal.(DW)'!I213:J213` → Coke bags (107 for HA configuration)
- `E50: =CEILING(G6/6,1)*G4` → Pipe lengths from active length
