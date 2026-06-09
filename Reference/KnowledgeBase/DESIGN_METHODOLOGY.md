# Design Methodology

> **Purpose:** Document the complete ICCP system design workflow, decision trees, and engineering assumptions.
> **Source:** CP4 (Specialist), Excel Cal.(DW), Application implementation.

---

## 1. Design Workflow

### High-Level Process

```
┌──────────────────────────────────────────────────────┐
│                1. DATA COLLECTION                     │
│   Pipeline parameters, soil data, site constraints   │
└────────────────────────┬─────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────┐
│              2. CURRENT REQUIREMENT                   │
│   Surface area → Current density → Total current     │
└────────────────────────┬─────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────┐
│             3. GROUNDBED TYPE SELECTION               │
│   Deepwell / Shallow Vertical / Distributed          │
└────────────────────────┬─────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────┐
│             4. ANODE QUANTITY & CONFIGURATION          │
│   Current-based → TR-based → Physical arrangement    │
└────────────────────────┬─────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────┐
│              5. CIRCUIT ANALYSIS                      │
│   Groundbed R → Cable R → Back EMF → Total R        │
└────────────────────────┬─────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────┐
│              6. TR SIZING                             │
│   Voltage → Current → AC Power → Rating Selection   │
└────────────────────────┬─────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────┐
│              7. VALIDATION                            │
│   Resistance checks → Remoteness → Design life      │
└────────────────────────┬─────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────┐
│              8. BOM GENERATION                        │
│   Cables → Coke → TRUs → Accessories                │
└──────────────────────────────────────────────────────┘
```

---

## 2. Step-by-Step Design Sequence

### Step 1: Data Collection

**Required Input Parameters:**
| Parameter | Source | Unit | Example |
|-----------|--------|------|---------|
| Pipeline OD | Client | inches | 48" |
| Wall thickness | Client | inches | 0.875" |
| Section length | Client | m | 292m (Tie-In) + 640m (Main) |
| Operating temp | Client | °C | 57.22°C |
| Coating type | Client | — | FBE (0.98 efficiency) |
| Soil resistivity | Field survey | Ω·cm | 361 (deepwell depth) |
| Design life | Client | years | 25 |
| Right-of-way | Site survey | — | Available area for groundbed |

**Decision: Station Split**
```
If single pipeline > 30km:
    Split into multiple stations at ~50:50 or optimized split
Else:
    Single station
```
*Excel:* Cal.(DW) splits two sections 50:50 between Station-1 and Station-2.

---

### Step 2: Current Requirement Calculation

**Sub-steps:**
1. Calculate surface area per segment: `A = π × D × L`
2. Determine current density at operating temperature:
   - **Excel method:** `i_T = i_base × 1.25^((T-30)/10)`
   - **App method (NACE):** `i_T = i_base × [1 + (T-25) × 0.025]`
3. Compute segment current: `I_seg = A × i_T × coating_eff`
4. Sum all segments: `I_req = Σ I_seg`
5. Apply spare factor: `I_design = I_req × 1.3`
6. Split between stations (if multi-station): `I_station = I_design × split_ratio`

**Validation:** Design current must be less than available TR current rating.

---

### Step 3: Groundbed Type Selection

**Decision Tree:**
```
Available surface area?
├── Large (>50m²) → Consider shallow vertical or distributed
│   ├── Soil resistivity < 5000 Ω·cm? → Shallow vertical suitable
│   └── Soil resistivity ≥ 5000 Ω·cm? → Consider deepwell
└── Constrained (<50m²) → Deepwell preferred
    ├── Groundwater present? → Deepwell recommended
    └── No groundwater → Evaluate both options

Current requirement > 50A?
├── Yes → Deepwell or multiple shallow arrays
└── No → Either option feasible

Soil resistivity structure?
├── Low at depth → Deepwell beneficial
└── Uniform or increasing with depth → Shallow may be adequate
```

**Application Status:**
| Groundbed Type | Available | Notes |
|---------------|-----------|-------|
| Deepwell | ✅ Yes | Fully implemented with Dwight formula |
| Shallow Vertical | ✅ Yes | Fully implemented with Sunde formula |
| Distributed | ❌ No | Future module (requires attenuation analysis) |
| Tank Bottom | ❌ No | Future module |
| Plant Piping | ❌ No | Future module |
| Sacrificial | ❌ No | Future module |

---

### Step 4: Anode Quantity & Configuration

**4a. Current-Based Anode Count**
```
N_current = CEILING(I_design / I_anode_output)
```

**4b. TR-Based Anode Count**
```
N_TR = I_TR_rated / I_anode_output
```

**4c. Proposed Quantity**
```
N_proposed = MAX(N_current, N_TR)  (or user-selected)
```

**4d. Physical Configuration**

*Deepwell Configuration:*
```
Active Length = N × anodeLength + (N-1) × spacerLength
Drill Depth = startDepth + cokeCover + activeLength + cementPlug
```

*Shallow Vertical Configuration:*
```
Total holes = N (1 anode per hole)
Each hole = startDepth + anodeLength
Spacing = anodeLength + inter-anode spacing (center-to-center)
```

**Excel Method (Deepwell):**
- Anode length (F50): 2.13m (7ft)
- Anode spacing (F52): 1.5m (5ft)
- Coke cover (F53): 2.5m
- Cement plug: 0.5m
- 9 anodes → active length = 31.17m

---

### Step 5: Circuit Analysis

**5a. Groundbed Resistance**

*Deepwell (Dwight):*
```
R_G = ρ/(2πL) × [ln(8L/d) - 1 + L/(4h)]
```

*Shallow Vertical (Sunde):*
```
R_G = R_single/N + ρ/(πLN²) × Σ[ln(2iS/L)]
```

**5b. Cable Resistances**

*Anode Tail Parallel:*
```
R_tails = 1 / Σ(1/(L_i × r))
```

*Main Cables:*
```
R_pos = L_pos × r_35mm2
R_neg_main = L_neg_main × r_35mm2
R_neg_sec = L_neg_sec × r_25mm2
```

*Total Cable:*
```
R_c = R_tails + R_pos + R_neg_main + R_neg_sec
```

**5c. Back EMF Resistance**
```
R_emf = (2 × V_emf) / I_rated    (typically 2V)
```

**5d. Total Circuit Resistance**
```
R_T = R_G + R_c + R_emf + R_s
```

---

### Step 6: TR Sizing

**6a. Minimum Voltage Requirement**
```
V_min = R_T × I_rated + V_emf    (App method)
V_min = (R_T × I_rated) / 0.7    (Excel method)
```

**6b. Proposed TR Rating Selection**

Select standard TR ratings that exceed V_min:
| Standard Rating | Typical Use |
|----------------|-------------|
| 24V / 15A | Small shallow groundbeds |
| 30V / 25A | Single deepwell (Station-1) |
| 50V / 25A | Higher resistance circuits (Station-2) |
| 60V / 40A | Large systems |
| 100V / 100A | Multiple station feeds |

**6c. AC Power Requirement**
```
P_DC = V_rated × I_rated
AC_KVA = P_DC / (Eff × PF) / 1000
AC_I = AC_KVA × 1000 / (V_supply × √3)
```

---

### Step 7: Validation

**7a. Groundbed Resistance Check**
```
R_G < R_G_max = [0.7 × (V_r - V_emf) / I] - R_c - R_s
```
→ If FAIL: Increase anodes, increase borehole diameter, or select higher TR voltage.

**7b. Circuit Resistance Check (70%)**
```
R_T < (V_rated / I_rated) × 0.7
```
→ If FAIL: Redesign groundbed or select higher-rated TR.

**7c. Circuit Resistance Check (90%)**
```
R_T < (V_rated / I_rated) × 0.9
```
→ If FAIL: Warning — circuit is at 90%+ of TR capacity.

**7d. Remoteness Distance Check (SAES-X-400)**
```
Required distance based on I_rated × ρ_lookup
Actual distance ≥ Required distance
```
→ If FAIL: Relocate groundbed or redesign.

**7e. Design Life Check**
```
Y_calc ≥ Y_target
Y_calc = (N × W × U_f) / (C × I)
```
→ If FAIL: Increase number of anodes or select more durable anode type.

**7f. Coke Backfill**
```
Bags = CEILING(L_active × 3.28 × 39.2 / 50)
Bags_final = CEILING(Bags × 1.15)
```

---

### Step 8: BOM Generation

**BOM for Deepwell Station:**
| Item | Material | Standard | Qty Basis |
|------|----------|----------|-----------|
| TRU | Transformer Rectifier | 17-SAMSS-003 | Per design |
| Anodes | HSCI TA-4 | 17-SAMSS-016 | N_proposed |
| Anode tail cable | 16mm² PVDF/HMWPE | 17-SAMSS-020 | Per anode length |
| Main positive cable | 35mm² HMWPE | 17-SAMSS-020 | Length |
| Main negative cable | 35mm² HMWPE | 17-SAMSS-020 | Length |
| Neg secondary cable | 25mm² HMWPE | 17-SAMSS-020 | Length |
| Junction box | — | 17-SAMSS-008 | 1 |
| Test station | — | 17-SAMSS-007 | 1 |
| Coke backfill | CPC | 17-855-011 | Bags |
| Cement plug | Cement | — | Per design |
| Vent pipe | PVC | — | Per design |
| Thermoweld | — | — | Per connection |

---

## 3. Selection Criteria

### Deepwell vs. Shallow Vertical

| Criterion | Deepwell | Shallow Vertical |
|-----------|----------|------------------|
| Surface area required | Small (~10m²) | Large (50-200m²) |
| Soil resistivity | Effective at high ρ | Requires lower ρ |
| Installation cost | Higher (drilling) | Lower |
| Maintenance | Less accessible | Accessible |
| Remoteness | Self-contained | Needs larger buffer |
| Groundbed resistance | Lower per unit depth | Higher with mutual coupling |
| Typical anode count | 5-20 in one hole | 3-20 individual holes |

### TR Selection Criteria

| Criterion | Priority | Description |
|-----------|----------|-------------|
| Voltage rating | High | Must exceed V_min by ≥30% |
| Current rating | High | Must exceed I_design |
| Tap range | Medium | ±5% adjustable output |
| Efficiency | Low | >80% at rated load |
| Power factor | Low | >0.8 at rated load |
| Enclosure | Medium | NEMA 4X for outdoor |

---

## 4. Engineering Assumptions by Design Phase

### Assumption Table

| Phase | Assumption | Basis | Impact if Wrong |
|-------|------------|-------|-----------------|
| Current Req. | Current density from coating data | NACE SP0169 | Under/over-protection |
| Current Req. | Temperature coefficient linear | NACE | Inaccurate CD at extreme temps |
| Groundbed | Soil resistivity uniform at depth | Field survey | Higher/lower resistance |
| Groundbed | Dwight formula applies to coke column | Dwigh 1936 | ~10% error possible |
| Cable | Cable at 20°C operating temp | Standard | <5% resistance variation |
| TR | 80% efficiency at all loads | Manufacturer | Underestimated AC draw |
| TR | Power factor 0.8 | Standard assumption | <10% AC variation |
| Design Life | Utilization factor 0.85 | Excel standard | Conservative (longer life) |
| Coke | Annulus factor 39.2 empirical | Aramco practice | Bag count may vary |
| Remoteness | SAES-X-400 table applicable | Saudi standard | Sites outside KSA may differ |

---

## 5. Decision Matrices

### Groundbed Type Decision Matrix

```
              Low ρ (<2000)  Med ρ (2000-5000)  High ρ (>5000)
Small area    Shallow (if OK)  Deepwell          Deepwell
Large area    Shallow           Either            Deepwell or Distributed
Constrained   Deepwell          Deepwell          Deepwell
No ROW        Deepwell          Deepwell          Deepwell
```

### TR Voltage Selection
```
V_min < 20V  → 24V rated TR
20V < 40V    → 30-50V rated TR
40V < 60V    → 50-60V rated TR
>60V         → 100V rated TR (or split station)
```
