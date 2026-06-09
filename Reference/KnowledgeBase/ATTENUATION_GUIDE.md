# Attenuation Guide

> **Purpose:** Comprehensive reference for pipeline cathodic protection attenuation theory, calculations, and design implications.
> **Sources:** CP3 Chapter 3 (Attenuation), CP4 Chapter 5 (Design Examples)

---

## 1. Theory

### What is Attenuation?

Attenuation in cathodic protection refers to the gradual decrease in protective potential along a pipeline as distance from the current drain point (CP station) increases. This occurs because:

1. **Pipeline resistance:** The steel pipe has finite electrical resistance (typically 10-100 μΩ/m)
2. **Coating resistance:** The coating-to-earth path has finite resistance (typically 10³-10⁶ Ω·m²)
3. **Current demand:** CP current is continuously discharged through coating holidays and defects

The result is an exponential decay of potential with distance:
- Near the drain point: potential is most negative (best protection)
- Far from drain point: potential approaches native (unprotected) potential

### Physical Model

```
CP Station ←─────── Pipeline ─────────────────────→ Remote End
                  (Line resistance R)
                         
    ↑                  │  │  │  │  │  │  │  │  │  │
   Drain              ╨  ╨  ╨  ╨  ╨  ╨  ╨  ╨  ╨  ╨
 Current              Coating leakage current (r)
```

The pipeline can be modeled as a distributed parameter network (transmission line analogy):
- **Series resistance:** Pipe steel resistance per unit length (R)
- **Shunt conductance:** Coating conductance to earth per unit length (G = 1/r)

---

## 2. Fundamental Equations

### 2.1 Attenuation Constant

```
α = √(R / r)
```

Where:
| Symbol | Description | Unit | Typical Range |
|--------|-------------|------|---------------|
| α | Attenuation constant | 1/m | 10⁻⁴ — 10⁻² |
| R | Pipeline lineal resistance | Ω/m | 10⁻⁵ — 10⁻⁴ |
| r | Coating-to-earth resistance | Ω·m | 10² — 10⁶ |

### 2.2 Pipeline Resistance

```
R_pipe = ρ_steel / A_cross
```

Where:
| Symbol | Description | Unit |
|--------|-------------|------|
| ρ_steel | Resistivity of steel | Ω·m (≈ 1.7×10⁻⁷ at 20°C) |
| A_cross | Cross-sectional area of pipe wall | m² |

For standard pipe dimensions:
```
A_cross = π × (OD² − (OD − 2×t)²) / 4
```
Where t = wall thickness.

### 2.3 Coating Resistance

```
r = R_coat × Area_factor
```

Coating resistance is the resistance-to-earth of the coated pipe per unit length. It depends on:
- Coating type and quality
- Coating age and degradation
- Soil resistivity
- Holiday density

Typical values:
| Coating Condition | r (Ω·m²) | α (for 48" pipe) |
|------------------|-----------|------------------|
| New FBE / 3LPE | 10⁵ — 10⁶ | ~10⁻⁴ |
| 10-year FBE | 10⁴ — 10⁵ | ~3×10⁻⁴ |
| 25-year FBE | 10³ — 10⁴ | ~10⁻³ |
| Poor/aged coating | 10² — 10³ | ~10⁻² |

### 2.4 Potential Attenuation (Single Drain)

```
V_x = V_0 × e^(−αx)
```

Where:
| Symbol | Description | Unit |
|--------|-------------|------|
| V_x | Polarized potential at distance x | V vs CSE |
| V_0 | Polarized potential at drain point | V vs CSE |
| α | Attenuation constant | 1/m |
| x | Distance from drain point | m |

### 2.5 Attenuation with Current Input

```
V_x = I_0 × √(R×r) × e^(−αx)
V_0 = I_0 × √(R×r)
```

Where I_0 is the current input at the drain point.

### 2.6 Maximum Protected Length (Single Drain)

For a given minimum protection potential (V_min, typically −850 mV CSE):

```
L_max = (1/α) × ln(V_0 / V_min)
```

### 2.7 Attenuation Rate (dB)

```
Attenuation (dB) = 20 × log(V_x / V_0) = −8.686 × α × x
```

---

## 3. Multiple Drain Points (Stations)

### 3.1 Two Stations — Symmetrical

For two identical stations at each end of a pipeline section:

```
V_mid = V_0 / cosh(α × L/2)
```

Where:
| Symbol | Description |
|--------|-------------|
| V_mid | Potential at midpoint between stations |
| V_0 | Potential at each drain point |
| L | Distance between stations |
| cosh | Hyperbolic cosine |

### 3.2 Current Distribution (Two Stations)

```
I(x) = I_0 × sinh(α(L/2 − x)) / sinh(αL/2)
```

Where sinh is the hyperbolic sine.

### 3.3 Three or More Stations

For multiple stations, Kirchhoff's current law is applied at each node:
- At each drain point: I_injected = I_downstream + I_upstream
- Between drain points: Standard attenuation applies
- Solve system of equations iteratively

---

## 4. Calculation Flow

### Step 1: Determine Pipeline Parameters
```
OD = 48 inches → OD_m = 1.2192 m
t = 0.875 inches → t_m = 0.0222 m
L = 10,000 m (section length)
A_steel = π × (OD_m² − (OD_m − 2t_m)²) / 4
R_pipe = ρ_steel / A_steel
```

### Step 2: Determine Coating Resistance
```
For new FBE: r_coat = 500,000 Ω·m²
For 1m pipe segment: r = r_coat / (π × OD_m)
```

### Step 3: Calculate Attenuation Constant
```
α = √(R_pipe / r)
```

### Step 4: Calculate Potential Profile
```
At each distance x from drain:
    V_x = V_0 × e^(−αx)
```

### Step 5: Check Minimum Protection
```
Find x where V_x ≤ −850 mV CSE (with IR compensation)
If x < required protection length:
    → Need additional drain points (more stations)
    → Or increase drain current
    → Or improve coating
```

---

## 5. Sample Calculation

### Given:
- Pipeline: 48" OD × 0.875" wall, 20 km long
- Coating: New 3LPE (r ≈ 10⁶ Ω·m²)
- CP Station: 50V / 25A at one end
- Target: −850 mV CSE minimum

### Calculation:
```
1. Steel cross-section:
   A = π × (1.2192² − (1.2192 − 0.0445)²) / 4
   A = π × (1.486 − 1.383) / 4 = 0.0809 m²

2. Pipeline resistance:
   R = 1.7×10⁻⁷ / 0.0809 = 2.1×10⁻⁶ Ω/m

3. Coating resistance per meter:
   r = 10⁶ / (π × 1.2192) = 261,000 Ω·m

4. Attenuation constant:
   α = √(2.1×10⁻⁶ / 261,000) = √(8.05×10⁻¹²) = 2.84×10⁻⁶ /m

5. Maximum protected distance from one end:
   Assume V_0 = −1.10 V CSE at drain (25A output)
   L_max = (1/2.84×10⁻⁶) × ln(1.10 / 0.85) = 352,000 × 0.258 = 90.8 km
   
   → Single station can protect >20 km section
```

### With Aged Coating (25 years, r ≈ 10³ Ω·m²):
```
1. r = 10³ / (π × 1.2192) = 261 Ω·m
2. α = √(2.1×10⁻⁶ / 261) = √(8.05×10⁻⁹) = 8.97×10⁻⁵ /m
3. L_max = (1/8.97×10⁻⁵) × ln(1.10/0.85) = 11,148 × 0.258 = 2.87 km

   → With degraded coating, station spacing of ~5.7 km needed
```

---

## 6. Design Limitations

### 6.1 Coating Degradation
Coating resistance decreases over time, increasing the attenuation constant:
| Time | Coating Resistance | Protected Length |
|------|-------------------|------------------|
| Year 0 | 10⁶ Ω·m² | 90+ km |
| Year 10 | 10⁵ Ω·m² | 28 km |
| Year 25 | 10⁴ Ω·m² | 9 km |
| Year 40 | 10³ Ω·m² | 2.9 km |

**Design must account for end-of-life coating condition.**

### 6.2 IR Drop
Measured potentials include IR drop through the soil. True polarized potentials require:
- Instant-off measurements
- Or IR compensation calculations

Typical IR errors: 50-300 mV depending on soil resistivity and current density.

### 6.3 Multiple Stations
For pipelines >30 km with realistic coating degradation:
- Station spacing of 10-30 km typical
- Each station sized for its zone
- Midpoint potentials must be verified

### 6.4 Environmental Factors
- **Seasonal soil drying:** Increases soil resistivity, reduces current spread
- **Water crossings:** Lower resistivity, can cause localized potential drops
- **Cased crossings:** Electrical shielding at road/rail crossings
- **High-temperature sections:** Increased current demand

---

## 7. Application Status

| Feature | Status | Notes |
|---------|--------|-------|
| Attenuation constant calculation | ❌ Not implemented | Future enhancement |
| Potential profile generation | ❌ Not implemented | Future enhancement |
| Station spacing optimization | ❌ Not implemented | Future enhancement |
| Coating aging model | ❌ Not implemented | Constants defined in COATING_TYPES |
| Multiple drain point solver | ❌ Not implemented | Requires iterative solver |

### Future Implementation Path

```
1. Implement single-station attenuation:
   Input: R_pipe, r_coat, I_0, L
   Output: V(x) profile

2. Implement two-station attenuation:
   Input: station parameters, spacing
   Output: Midpoint potential, current distribution

3. Implement multi-station optimizer:
   Input: pipeline parameters, target protection
   Output: Optimal station count, locations, and ratings
```

---

## 8. Cross-References

| Topic | Document | Section |
|-------|----------|---------|
| Attenuation Theory | CP3 | Chapter 3 — Attenuation |
| Design Examples | CP4 | Chapter 5 — Pipelines |
| Coating Types | `constants/index.js` | COATING_TYPES |
| Station Design | `DESIGN_METHODOLOGY.md` | Step 2 — Current Requirement |
| Circuit Resistance | `FORMULA_LIBRARY.md` | Formulas 15-18 |
| Protection Criteria | `ENGINEERING_CONCEPTS.md` | Section 13 |
