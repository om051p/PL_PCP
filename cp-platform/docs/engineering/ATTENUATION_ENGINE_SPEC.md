# Attenuation Engine — Engineering Specification

**Reverse-engineered from:** `attenuation.xlsx` — *"Attenuation Calculation for 30″ BB-2 with 44 KM Approx. Length – Shore to Berri Section"*  
**Standard References:** NACE SP0169, BS EN 13509, ISO 15589-1  
**Version:** 1.0.0

---

## 1. Engineering Theory

### 1.1 What is CP Attenuation?

Cathodic protection (CP) current applied at a drain point (TR rectifier location) does not distribute uniformly along a pipeline. The protective potential *attenuates* — decays exponentially with distance — due to:

- **Pipe steel resistance** (longitudinal current path through the steel wall)
- **Coating leakage conductance** (current leaking through coating defects into soil)

This decay is governed by transmission-line theory, modelling the pipeline as a distributed-parameter electrical circuit: series resistance (steel) and shunt conductance (coating).

### 1.2 Transmission-Line Analogy

```
                RS (Ω/m)          RS (Ω/m)
  ──────────────/\/\/\/─────────────/\/\/\/──────────
  Drain Point │                              │      │
              │   GL (S/m)     GL (S/m)      │      │
  ────────────┤──┤ ├──────────────┤ ├────────┤      ┤
              │                                     │
         [Soil/Earth Return Path - zero resistance assumed]
```

Where:
- **RS** = unit pipe longitudinal resistance (Ω/m)
- **GL** = unit coating leakage conductance (S/m) = 1/RL

### 1.3 Attenuation Equation

For a **finite pipeline of length L** with a **single drain point** at one end, the potential at distance *x* from the drain point is:

```
E(x) = E_NAT + ΔE₀ · cosh[α(L - x)] / cosh(αL)
```

For a **semi-infinite pipeline** (or symmetrical drain point mid-pipe), simplified to:

```
E(x) = E_NAT + ΔE₀ / cosh(α · x)
```

Where the spreadsheet uses this **cosh form** per station:

```
V(x) = (PotNAT / 1000) + ΔE₀ / cosh(α · |x - x_station| · 1000)
```

The distance `|x - x_station|` is in **km** (converted to metres by ×1000 for α in /m).

### 1.4 Superposition for Multiple Stations

When multiple CP stations protect the same pipeline segment, the **combined potential** at any point is calculated by superposition of the individual potential shifts above natural:

```
V_combined(x) = E_NAT + Σᵢ [Vᵢ(x) - E_NAT]
              = E_NAT + Σᵢ [ΔE₀ / cosh(α · |x - xᵢ| · 1000)]
```

This assumes:
- All stations apply the same ΔE₀ (drain point swing)
- All stations share the same pipeline parameters (α, RS, RL)
- Soil return resistance is negligible (valid for well-earthed systems)

---

## 2. Variable Definitions and Units

### 2.1 Primary Inputs

| Symbol | Description | Unit | Typical Value |
|--------|-------------|------|---------------|
| Ø (D) | Pipe outside diameter | inches | 30 |
| t | Pipe wall thickness | inches | 1.27 |
| L_TOT | Total pipe length (longest path from drain point) | km | 44 |
| L_X | Max protection length from drain point to check point X | km | 25 |
| cd | Design current density (coating condition) | mA/m² | 0.175 |
| r | Steel resistivity | µΩ·cm | 18 |
| PotNAT | Natural (free corrosion) pipe potential | mV Cu/CuSO₄ | 550 |
| PotDP | Maximum drain point potential (On potential) | mV Cu/CuSO₄ | 1100 |
| PotMIN | Minimum required pipe potential (On) | mV Cu/CuSO₄ | 1000 |
| g | Coating conductivity at reference resistivity | µS/m² | 300 |
| ρ (p) | Average soil resistivity | Ω·cm | 1000 |

### 2.2 Derived / Intermediate Values

| Symbol | Description | Formula | Unit |
|--------|-------------|---------|------|
| Ax | Cross-sectional area of pipe steel | π/4 · [(D/39.36)² − ((D/39.36) − 2·(t/39.36))²] | m² |
| A1 | Unit surface area (circumference) | π · (D/39.36) | m²/m |
| A_TOT | Pipe surface area to point X | A1 · L_X · 1000 | m² |
| I_REQ(X) | Current required one-way to X | A_TOT · cd / 1000 | A |
| I_REQ(TOT) | Current required total pipe | A1 · L_TOT · 1000 · cd / 1000 | A |
| RS | Unit pipe linear resistance | r·(1/Ax·10000) / 10⁶ × 100 → simplified: (r×10⁻⁶) / (Ax×10⁴) | Ω/m |
| RL | Coating leakage resistivity | 1 / (g×10⁻⁶ · A1) · (ρ/1000) | Ω·m |
| α | Attenuation constant | √(RS / RL) | /m |
| ΔE₀ | Potential swing at drain point | (PotDP − PotNAT) / 1000 | V |
| ΔE_X_REQ | Required potential swing at point X | (PotMIN − PotNAT) / 1000 | V |
| ΔE_X_CALC | Calculated potential swing at X | ΔE₀ / cosh(α · L_X · 1000) | V |
| PotCALC | Calculated potential at X | PotNAT/1000 + ΔE_X_CALC | V |

> **Note on unit conversion (39.36):** The factor 39.36 converts inches to metres  
> (1 m = 39.3701 inches; spreadsheet uses 39.36).

### 2.3 Outputs

| Symbol | Description | Unit |
|--------|-------------|------|
| V(x) per station | Pipe potential at km x from a single station | V (as positive magnitude, Cu/CuSO₄) |
| V_combined(x) | Combined potential from all stations at km x | V |
| protectionStatus(x) | Whether combined potential meets PotMIN | PASS / FAIL |
| protectionLength | Max km from station where PotMIN is met | km |

---

## 3. Formula Derivations

### 3.1 Pipe Cross-Section Area (Ax)

Converting from inches to metres using factor 39.36:

```
D_m = D_in / 39.36
t_m = t_in / 39.36
r_outer = D_m / 2
r_inner = r_outer - t_m

Ax = π/4 · (D_m² - (D_m - 2·t_m)²)
   = π/4 · ((D_in/39.36)² - ((D_in/39.36) - 2·(t_in/39.36))²)
```

### 3.2 Unit Surface Area (A1)

```
A1 = π · D_m = π · (D_in / 39.36)     [m²/m]
```

### 3.3 Unit Pipe Resistance (RS)

Steel resistivity r in µΩ·cm → convert to Ω·m: r × 10⁻⁸

```
RS = (r × 10⁻⁸) / Ax     [Ω/m]
```

Spreadsheet formula equivalent:
```
RS = ((r / 10⁶) / (Ax × 10000)) × 100
```

Both yield the same result in Ω/m. Verified: r=18 µΩ·cm, Ax=0.07399 m² → RS = 2.433×10⁻⁶ Ω/m ✓

### 3.4 Coating Leakage Resistivity (RL)

The coating conductance g is specified at a reference soil resistivity of 1000 Ω·cm. It is corrected for actual soil resistivity ρ:

```
g_corrected = g × (1000 / ρ)     [µS/m²]
```

Then:
```
RL = 1 / (g_corrected × 10⁻⁶ × A1)     [Ω·m]
```

Combined:
```
RL = 1 / ((g / 10⁶) × A1) × (ρ / 1000)
```

Spreadsheet formula: `=1/((I19/1000000)*Q10)*I20/1000`  
Verified: g=300 µS/m², A1=2.3945 m²/m, ρ=1000 Ω·cm → RL = 1392.1 Ω·m ✓

### 3.5 Attenuation Constant (α)

```
α = √(RS / RL)     [/m]
```

Verified: RS=2.433×10⁻⁶, RL=1392.1 → α = √(1.748×10⁻⁹) = 4.181×10⁻⁵ /m ✓

### 3.6 Potential at Distance x from a Single Station

```
V(x) = (PotNAT / 1000) + ΔE₀ / cosh(α · |x - x_station| · 1000)
```

Where:
- x and x_station are in km
- Multiply by 1000 to convert km → m (since α is in /m)
- ΔE₀ = (PotDP − PotNAT) / 1000 in volts

### 3.7 Combined Potential (Superposition)

```
V_combined(x) = (PotNAT / 1000) + Σᵢ [(Vᵢ(x) - PotNAT/1000)]
              = (PotNAT / 1000) + Σᵢ [ΔE₀ / cosh(α · |x - xᵢ| · 1000)]
```

Spreadsheet formula (for 4 stations at rows 9, 34, 38, 47):
```
AD9 = (AC9 - 0.55) + (Z9 - 0.55) + (AB9 - 0.55) + (AA9 - 0.55) + 0.55
```
Which expands to: `E_NAT + Σ(Vᵢ - E_NAT)` ✓

---

## 4. Calculation Sequence

```
Step 1:  INPUTS — Read all user parameters
Step 2:  Ax        = pipe cross-section area (m²)
Step 3:  A1        = unit surface area (m²/m)
Step 4:  A_TOT     = total surface area to point X (m²)
Step 5:  I_REQ(X)  = current required to point X (A)
Step 6:  I_REQ(TOT)= current required total pipe (A)
Step 7:  RS        = unit pipe resistance (Ω/m)
Step 8:  RL        = coating leakage resistivity (Ω·m)
Step 9:  α         = attenuation constant (√RS/RL) (/m)
Step 10: ΔE₀       = drain point potential swing (V)
Step 11: ΔE_X_REQ  = required potential swing at X (V)
Step 12: ΔE_X_CALC = calculated potential swing at X (V)
Step 13: PotCALC   = calculated potential at X (V)
Step 14: FOR each km point in pipeline range:
           FOR each station:
             V_station(km) = E_NAT + ΔE₀/cosh(α·|km-x_station|·1000)
           V_combined(km) = E_NAT + Σ(V_station - E_NAT)
           protectionFlag = V_combined >= PotMIN/1000
Step 15: OUTPUT profile array + summary
```

---

## 5. Validation Rules

| Rule ID | Check | Limit | Action |
|---------|-------|-------|--------|
| VAL-001 | Pipe diameter > 0 | D > 0 inches | Error |
| VAL-002 | Wall thickness < OD/2 | t < D/2 | Error |
| VAL-003 | Attenuation constant > 0 | α > 0 | Error if RS or RL ≤ 0 |
| VAL-004 | Drain point potential > natural | PotDP > PotNAT | Error |
| VAL-005 | Min potential > natural | PotMIN > PotNAT | Error |
| VAL-006 | Min potential ≤ drain point potential | PotMIN ≤ PotDP | Warning |
| VAL-007 | Current density > 0 | cd > 0 mA/m² | Error |
| VAL-008 | Soil resistivity > 0 | ρ > 0 Ω·cm | Error |
| VAL-009 | Coating conductivity > 0 | g > 0 µS/m² | Error |
| VAL-010 | At least one CP station defined | stations.length ≥ 1 | Error |
| VAL-011 | Pipeline start ≤ station ≤ pipeline end | — | Warning |
| VAL-012 | cosh argument overflow protection | α·x·1000 < 700 | Clamp at min potential |

---

## 6. Engineering Assumptions

1. **Uniform coating condition** — a single average current density applies to the whole pipeline.
2. **Uniform soil resistivity** — a single average soil resistivity applies along the route.
3. **Negligible soil return resistance** — the earth return path resistance is zero (conservative assumption for design).
4. **Semi-infinite pipe model** — each station is modelled as a mid-pipe drain point; no end-effects are modelled for individual stations.
5. **Linear superposition** — multiple station effects add linearly (valid for small ΔE relative to natural).
6. **Steel resistivity** — standard value of 18 µΩ·cm is used for carbon steel pipelines.
7. **Coating conductivity reference** — coating conductance g is specified at 1000 Ω·cm soil resistivity and corrected proportionally.
8. **Potentials as positive magnitudes** — all potentials are expressed as positive millivolt magnitudes relative to Cu/CuSO₄ reference (e.g., −850 mV CSE = 850 in this convention).
9. **Profile resolution** — the spreadsheet evaluates at 1 km intervals; the engine supports configurable step size.
10. **Coating type FBE** — fusion bonded epoxy is the reference coating. The g=300 µS/m² value represents a 25-year aged FBE coating condition per the spreadsheet note.

---

## 7. Constants

| Constant | Value | Description |
|----------|-------|-------------|
| INCH_TO_M_FACTOR | 39.36 | Inches to metres conversion (spreadsheet uses 39.36, not 39.3701) |
| PROTECTION_CRITERION_CSE | −850 mV | NACE SP0169 minimum protection criterion (Cu/CuSO₄) |
| DEFAULT_STEEL_RESISTIVITY | 18 µΩ·cm | Typical carbon steel |
| DEFAULT_COATING_G_FBE_25YR | 300 µS/m² | Aged FBE @ 1000 Ω·cm soil |
| DEFAULT_NATURAL_POTENTIAL | 550 mV | Typical resting potential, passive steel |
| KM_TO_M | 1000 | Conversion factor |

---

## 8. Known Limitations

- No modelling of pipe casing/shielding sections
- No stray current interference modelling  
- No AC interference modelling
- No holiday (coating defect) localisation
- Assumes all stations operate simultaneously at design ΔE₀
- No soil stratification or seasonally varying resistivity
