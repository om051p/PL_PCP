# Engineering Concepts

> **Purpose:** Organized reference of all engineering concepts used in PCP design, cross-referenced to source documents and application code.
> **Organization:** By design module, corresponding to calculation sequence.

---

## 1. Current Requirement

### Concept
The total current required to achieve cathodic protection of a pipeline is the sum of currents needed for each pipeline segment, computed from surface area and temperature-corrected current density.

### Governing Equation
```
I_req = Σ(A_i × i_T_i)
I_design = I_req × 1.3 (30% spare)
```

### Key Factors
- **Surface Area (A):** π × D × L for cylindrical pipe
- **Current Density (i):** Function of environment (coating type, soil resistivity, temperature)
- **Temperature Effect:** Higher temperatures increase corrosion rate → higher CD requirement
- **Spare Capacity:** 30% added for future degradation and coating holidays

### Source References
| Source | Section |
|--------|---------|
| Excel Cal.(DW) | 1.9–1.12 |
| CP3 (Technologist) | Chapter 3 — Determining Current Requirements |
| CP4 (Specialist) | Chapter 4 — Design Factors & Calculations |
| NACE SP0169 | Section 5 — Current Requirements |

### Application Implementation
- **Module:** `calculations.js`
- **Functions:** `calcSurfaceArea()`, `calcTempCorrectedCurrentDensity()`, `calcCurrentRequirement()`
- **Test:** `engineeringAcceptance.test.js`

### Design Considerations
- For coated pipelines: current density is typically 0.05–0.20 mA/m²
- For bare or poorly coated structures: 10–50 mA/m²
- Temperature correction: Excel uses exponential (1.25^((T-30)/10)); App uses NACE linear method
- Segments with different diameters, temperatures, or coating efficiencies are summed individually

---

## 2. Surface Area

### Concept
The external surface area of a buried pipeline that requires protection. The coating efficiency factor reduces the effective bare area.

### Formula
```
A = π × D_od × L
```
Where D_od is the outside diameter converted from inches to meters (÷39.37).

### Source References
| Source | Section | Notes |
|--------|---------|-------|
| Excel Cal.(DW) | 1.9 | Uses 3.14 approximation for π |
| CP3 | Chapter 3 | Identical formula |

### Implementation
- `calcSurfaceArea(odInches, lengthM)` → returns m²

---

## 3. Coating Efficiency

### Concept
The effectiveness of pipeline coating in reducing current demand. Coating efficiency is expressed as a fraction (0–1), where:
- 1.0 = perfect coating (100% effective)
- 0.98 = FBE new (2% bare area)
- 0.95 = coal tar enamel (5% bare area)
- 0.0 = bare steel

### Coating Degradation
Coating efficiency degrades over time. Typical degradation rates:
| Coating Type | Initial Efficiency | Annual Degradation |
|-------------|------------------|-------------------|
| FBE (Fusion Bonded Epoxy) | 0.98 | 0.002/yr |
| 3LPE (3-Layer Polyethylene) | 0.99 | 0.001/yr |
| Coal Tar Enamel | 0.95 | 0.005/yr |

### Source References
| Source | Section |
|--------|---------|
| Excel Cal.(DW) | Implicit in current calculation |
| CP4 | Chapter 4 — Coating resistance and degradation |
| COATING_TYPES | `constants/index.js` |

### Application Implementation
- **Module:** `constants/index.js` — `COATING_TYPES` object
- Coating efficiency is included in the current calculation as a multiplier

---

## 4. Groundbed Resistance

### Concept
The resistance-to-earth of the anode groundbed system. This is the dominant resistance component in the CP circuit and the primary determinant of TR voltage requirements.

### Deepwell Groundbed (Dwight Formula)
```
R_G = ρ / (2πL) × [ln(8L/d) − 1 + L/(4h)]
```

**Applicable when:** Single deep borehole with multiple anodes in a vertical column.

**Parameters:**
- ρ: Soil resistivity (Ω·m)
- L: Active column length (m) — N anodes × length + (N−1) spacers
- d: Borehole diameter (m)
- h: Depth to midpoint of active zone

### Shallow Vertical Groundbed (Sunde Formula)
```
R_G = R_single/N + ρ/(πLN²) × Σ[ln(2iS/L)]
```

**Applicable when:** Multiple individual vertical anode holes connected in parallel.

### Design Implications
- Lower soil resistivity → lower groundbed resistance
- Longer active column → lower resistance (diminishing returns after ~50m)
- Larger borehole diameter → lower resistance (logarithmic effect)
- Multiple shallow holes → N× reduction with mutual interference penalty

### Source References
| Source | Section | Notes |
|--------|---------|-------|
| Excel Cal.(DW) | 5.9 | Both Dwight and simplified Sunde |
| CP3 | 3.3.1–3.3.3 | Full formula derivations |
| CP4 | Chapter 4 | Design methodology |
| Dwight (1936) | — | Original formula |
| Sunde (1968) | — | Mutual coupling theory |

### Application Implementation
- `calcDweellGroundbedResistance()` — Deepwell with L/(4h) term
- `calcShallowVerticalGroundbedResistance()` — Full Sunde summation
- `calcGroundbedResistance()` — Router function

### Known Formula Variants
| Source | Deepwell Formula | Notes |
|--------|-----------------|-------|
| Excel | ρ/(2πL) × [ln(8L/d) − 1] | Omits L/(4h) |
| CP3 | ρ/(2πL) × [ln(8L/d) − 1 + L/(4h)] | Includes depth correction |
| App | ρ/(2πL) × [ln(8L/d) − 1 + L/(4h)] | Matches CP3 |

| Source | Shallow Formula | Notes |
|--------|----------------|-------|
| Excel | ρ/(2πNL) × [ln(8L/d) − 1 + (2L/S) × ln(0.656N)] | Simplified mutual |
| App | R_single/N + ρ/(πLN²) × Σ ln(2iS/L) | Full Sunde summation |

---

## 5. Deepwell Design

### Concept
A single vertical borehole containing multiple anodes in a coke column. Provides low groundbed resistance and is suitable for high soil resistivity or constrained surface areas.

### Physical Configuration
```
Ground surface
    │
    ├── Cement plug (0.5m)          ← Top of coke column
    ├── Coke cover (2.5m)
    ├── Anode 1 (2.13m) + cable
    ├── Spacer (1.5m)
    ├── Anode 2 (2.13m) + cable
    ├── Spacer (1.5m)
    ├── ...                          ← Number of anodes = N
    ├── Anode N (2.13m) + cable
    └── Coke column bottom
```

### Key Calculations
- **Active Length:** Depth from start of coke column to bottom of last anode
- **Active Column:** N × anodeLength + (N−1) × spacing
- **Drill Depth:** startDepth + cokeCover + activeLength + cementPlug
- **Coke Volume:** Annular volume around anode column, converted to bag count

### Application Implementation
- `calcGroundbedResistance(groundbed, ...)` with type='deepwell'
- `calcCokeRequirement(activeLengthM)`

---

## 6. Shallow Vertical Design

### Concept
Multiple individual vertical anode holes distributed over an area. Each hole contains one anode in a coke column. Connected in parallel via a header cable.

### Configuration
| Parameter | Typical Value |
|-----------|---------------|
| Hole depth | 7–15m |
| Anode length | 2.13m (TA-4) |
| Borehole diameter | 0.25m (10") |
| Hole spacing | 3–6m (center-to-center) |
| Typical count | 3–20 per station |

### Key Calculations
- **Single anode resistance:** Standard vertical anode formula
- **Parallel combination:** N anodes with mutual interference
- **Mutual interference:** Reduces effective resistance savings of multiple anodes
- **Coke per hole:** L_active × 3.28 × 39.2 / 50 per hole × N holes

### Application Implementation
- `calcGroundbedResistance(groundbed, ...)` with type='shallow_vertical'
- `calcShallowVerticalGroundbedResistance()` — Full Sunde summation

---

## 7. Distributed Groundbeds

### Concept
Anodes distributed along the pipeline at regular intervals. Each anode (or anode string) provides local protection. Used when:
- High soil resistivity makes concentrated groundbeds impractical
- Right-of-way constraints prevent centralized groundbeds
- Existing CP system needs reinforcement

### Status
- **Not yet implemented** in application (`available: false` in DESIGN_MODES)
- Requires iterative current distribution analysis
- Attenuation calculations needed for proper spacing determination

### Source References
| Source | Section |
|--------|---------|
| CP4 | Chapter 5 — Design Examples |
| CP3 | Chapter 3 — Attenuation |

---

## 8. Cable Sizing

### Concept
Cables must be sized to carry the required current with acceptable voltage drop. Cable resistance is a significant component of the total circuit resistance.

### Cable Selection Criteria
| Cable Component | Typical Size | Application |
|----------------|-------------|-------------|
| Anode tail cable | 16mm² | Per anode, in borehole |
| Positive main | 35mm² | From TR to junction box |
| Negative main | 35mm² | From structure to TR |
| Negative secondary | 25mm² | From test station to TR |

### Resistance Calculation
```
R = L × r
```
Where r is the unit resistance from CABLE_SPECS (Ω/m at 20°C).

### Parallel Anode Tails
The app calculates parallel resistance of all anode tail cables:
```
R_parallel = 1 / Σ(1/R_i)
```
This is physically correct — anode tail cables are connected in parallel at the junction box.

### Source References
| Source | Section |
|--------|---------|
| Excel Cal.(DW) | 6.13–6.35 |
| CP3 | 3.3.6 — Cable lineal resistance |
| CABLE_SPECS | `constants/index.js` |

---

## 9. Voltage Drop

### Concept
The total voltage drop in the CP circuit determines the minimum TR voltage requirement. The circuit consists of:
- Groundbed-to-earth resistance (R_G)
- Cable resistance (R_c)
- Back EMF resistance (R_emf)
- Structure-to-earth resistance (R_s)

### Total Circuit Resistance
```
R_T = R_G + R_c + R_emf + R_s
```

### Minimum TR Voltage (Excel Method)
```
V_min = (R_T × I_rated) / 0.7
```
The division by 0.7 ensures the TR operates at ≤70% of rated capacity, providing margin for future current increase due to coating degradation.

### Minimum TR Voltage (App Method)
```
V_min = R_T × I_rated + V_emf
```
The app adds back EMF voltage directly rather than modeling it as a resistance.

### Validation Checks
| Check | Criteria | Formula | Pass/Fail |
|-------|----------|---------|-----------|
| R_G max | R_G < R_G_max | 70% × (V_r−V_emf)/I − R_c − R_s | YES/NO |
| R_T max (70%) | R_T < V_rated/I_rated × 0.7 | Operating margin | YES/NO |
| R_T max (90%) | R_T < V_rated/I_rated × 0.9 | Warning threshold | YES/NO |

### Source References
| Source | Section |
|--------|---------|
| Excel Cal.(DW) | 7–10 |
| CP4 | Chapter 4 — TR Sizing |
| CP3 | Chapter 3 — Circuit resistance |

---

## 10. TR Sizing

### Concept
Transformer-Rectifier (TR) unit selection is based on:
1. **Voltage:** Must exceed minimum required voltage (V_min) with margin
2. **Current:** Must supply the design current (I_design)
3. **AC Power:** AC supply sizing based on DC power / (efficiency × power factor)

### Standard TR Ratings
| Parameter | Station-1 (Deepwell) | Station-2 (Shallow) |
|-----------|---------------------|---------------------|
| Voltage | 30V | 50V |
| Current | 25A | 25A |
| AC Input | 480V 3-Phase | 480V 3-Phase |

### AC Power Calculation
```
P_DC = V_rated × I_rated
KVA_AC = P_DC / (Eff × PF) / 1000
I_AC = KVA_AC × 1000 / (V_AC × √3)
```

### Efficiency and Power Factor
| Parameter | Excel Value | App Value (THRESHOLDS) |
|-----------|-------------|----------------------|
| Efficiency | 80% (0.8) | 0.8 |
| Power Factor | 80% (0.8) | — |
| Combined factor | **0.6** (0.8×0.8≈0.64 but uses 0.6) | **0.64** (TR_EFFICIENCY × RECTIFIER_EFFICIENCY) |

### Source References
| Source | Section |
|--------|---------|
| Excel Cal.(DW) | 12.5–12.9 |
| CP4 | Chapter 4 — TR Specification |

---

## 11. Design Life

### Concept
The expected operational life of the anode bed before the anodes are consumed. Based on anode weight, consumption rate, and operating current.

### Formula
```
Y = (N × W × U_f) / (C × I)
```

### Consumption Rates
| Anode Material | Consumption Rate | Standard |
|---------------|-----------------|----------|
| HSCI (TA-4) | 0.45 kg/A·year | 17-SAMSS-016 |
| MMO Tubular | 0.001 kg/A·year | NACE TM0108 |
| Zinc Ribbon | 11.2 kg/A·year | ASTM B418 |

### Utilization Factor
- Excel uses 0.85 (85% of anode mass is usable)
- App does not apply utilization factor (uses 100%)
- This is a **known discrepancy**: Excel calculates ~25.2 years (at full utilization) vs app calculation without factor

### Source References
| Source | Section |
|--------|---------|
| Excel Cal.(DW) | 3.5 |
| CP3 | Chapter 3 |
| CP4 | Chapter 4 |
| NACE SP0169 | Section 6 |

---

## 12. Coke Backfill (Calcined Petroleum Coke)

### Concept
CPC backfill in the annular space between anodes and borehole wall reduces groundbed resistance and provides a stable environment for anode operation.

### Formula
```
Bags_base = CEILING(L_active × 3.28 × 39.2 / 50)
Bags_final = CEILING(Bags_base × 1.15)
```

### Constants
| Constant | Value | Meaning |
|----------|-------|---------|
| 3.28 | ft/m | Conversion from meters to feet |
| 39.2 | — | Empirical annulus volume factor |
| 50 | lb/bag | Standard CPC bag weight |
| 1.15 | — | 15% site handling contingency |

### Source References
| Source | Section |
|--------|---------|
| Excel Cal.(DW) | 13.3–13.4 |
| THRESHOLDS | `constants/index.js` |

---

## 13. Protection Criteria

### -850 mV CSE Criterion
- 850 mV (CSE) is the most negative polarized potential for carbon steel
- Provides standard protection for buried or submerged structures
- Measured with reference electrode at structure surface (IR-free)

### 100 mV Polarization Shift
- 100 mV cathodic polarization from the native (free-corrosion) potential
- Alternative criterion for coatings that may disbond at very negative potentials
- Requires measurement of instant-off potentials

### Source References
| Source | Section |
|--------|---------|
| CP2 | Chapter 2 — CP Concepts |
| CP3 | Chapter 2 — Protection Criteria |
| CP4 | Chapter 2 |
| NACE SP0169 | Section 5 — Criteria |

---

## 14. Interference

### Concept
Stray current interference occurs when CP current from one system affects neighboring structures. Can cause accelerated corrosion at current discharge points.

### SAES-X-400 Remoteness Distance
Minimum distance from anode bed to nearest buried metallic structure, based on TR current and soil resistivity:

| TR Current | ρ < 500 | 500 < ρ ≤ 1000 | 1000 < ρ ≤ 3000 | ρ > 3000 |
|-----------|---------|---------------|----------------|---------|
| I ≤ 35A | 20m | 25m | 50m | 75m |
| 35A < I ≤ 50A | 30m | 35m | 75m | 150m |
| 50A < I ≤ 100A | 65m | 75m | 150m | 250m |
| 100A < I ≤ 150A | 100m | 125m | 225m | 350m |
| I > 150A | Invalid | Invalid | Invalid | Invalid |

### Source References
| Source | Section |
|--------|---------|
| Excel Cal.(DW) | 11.3 |
| SAES-X-400 | — |
| CP2 | Chapter 5 — Stray Current |
| CP4 | Chapter 4 — Interference |

---

## 15. Attenuation (Pipeline)

### Concept
As CP current travels along a pipeline, the protective potential attenuates (decreases) with distance from the drain point due to pipeline resistance and coating resistance.

### Governing Equation
```
V_x = V_0 × e^(−αx)
```
where α = √(R_pipeline / R_coating)

### Design Implication
For long pipelines (>20–30 km), multiple CP stations may be needed to maintain protection at the mid-point. Attenuation analysis determines station spacing.

### Complete Reference
**See `ATTENUATION_GUIDE.md`** for the complete treatment including:
- Full derivation of the attenuation constant α = √(R/r) with pipe resistance and coating resistance calculations
- Multiple drain point analysis (2-station and 3+ station configurations)
- Detailed sample calculation for 48" pipeline with new and aged coating
- Design limitations covering coating degradation, IR drop, and environmental factors
- Application status and future implementation path

### Source References
| Source | Section |
|--------|---------|
| CP3 | Chapter 3 — Attenuation |
| CP4 | Chapter 5 — Design Examples |
| Full guide | `ATTENUATION_GUIDE.md` |

---

## Concept Dependency Graph

```
Surface Area ──→ Current Requirement ──→ Anode Quantity ──→ Design Life
                                                     │
                                                     ↓
                                              Groundbed Design
                                                     │
                                              ├── Deepwell Resistance
                                              └── Shallow Resistance
                                                     │
                                              Cable Sizing & Resistance
                                                     │
                                              └── Parallel Anode Tails
                                                     │
                                              Total Circuit Resistance
                                                     │
                                              └── TR Voltage Requirement
                                                     │
                                              TR Sizing ←── AC Power
                                                     │
                                              Design Life ←── Anode Consumption
                                                     │
                                              BOM Generation ←── Coke, Cables, TRs
```
