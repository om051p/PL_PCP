# FORMULA CORRECTION ANALYSIS
## Side-by-Side Comparison: SAES vs RAXA Implementation

**Date:** 2026-06-12
**Principle:** No formulas modified until this review is approved. Analysis only.

---

## 1. GAP-C2: MMO/HSCI Current Density Limits

### 1.1 SAES-X-400 Table 5 (Exact Values)

| Anode Material | Max Current Density (mA/cm^2) | Max Current Density (A/m^2) | Notes |
|---|---|---|---|
| High Silicon Cast Iron (HSCI) | 0.7 | 7.0 | Includes utilization factor and end cap shortening |
| MMO (fresh water) | 7.0 | 7.0 | See manufacturer's spec for 25yr life |
| MMO (salt water) | 35.0 | 35.0 | High-salinity applications |

### 1.2 RAXA ANODE_SPECS (Current Values)

| Anode | maxCurrentDensity | SAES Limit | Difference | % Above |
|---|---|---|---|---|
| HSCI_TA4 | 10.8 A/m^2 | 7.0 A/m^2 | +3.8 A/m^2 | +54% |
| HSCI_TA2 | 10.8 A/m^2 | 7.0 A/m^2 | +3.8 A/m^2 | +54% |
| MMO_TUBULAR | 200 A/m^2 | 7.0 A/m^2 (fresh) | +193 A/m^2 | +2,757% |
| MMO_TUBULAR | 200 A/m^2 | 35.0 A/m^2 (salt) | +165 A/m^2 | +471% |

### 1.3 Root Cause Analysis

The RAXA MMO_TUBULAR value (200 A/m^2) appears to come from manufacturer maximum current density ratings
for Mixed Metal Oxide coated titanium anodes (NACE TM0108). These are bare anode ratings WITHOUT the
utilization factor and end-cap shortening that SAES-X-400 Table 5 applies.

SAES Table 5 note: "The consumption rates detailed in Table 5 include utilization factor and effective
anode shortening due to end caps." This means SAES values are DESIGN values, not bare ratings.

### 1.4 Impact on Results

- **HSCI:** Designs using 10.8 A/m^2 instead of 7.0 could specify fewer anodes than SAES allows
- **MMO in fresh water:** Designs using 200 A/m^2 instead of 7.0 are dangerously non-compliant (28x above limit)
- **MMO in salt water:** Designs using 200 A/m^2 instead of 35.0 are 5.7x above limit

### 1.5 Recommended Correction

```javascript
// BEFORE (src/constants/index.js)
MMO_TUBULAR: {
  maxCurrentDensity: 200,  // NACE TM0108 bare rating
}

// AFTER
MMO_TUBULAR_FRESH: {
  maxCurrentDensity: 7.0,  // SAES-X-400 Table 5 — fresh water
}
MMO_TUBULAR_SALT: {
  maxCurrentDensity: 35.0, // SAES-X-400 Table 5 — salt water
}

HSCI_TA4: {
  maxCurrentDensity: 7.0,  // Was 10.8; SAES Table 5 = 0.7 mA/cm^2 = 7.0 A/m^2
}
```

### 1.6 Regression Risk
- **MEDIUM:** Existing projects using HSCI with lower anode counts may show validation failures after correction
- **HIGH for MMO:** Any MMO design will show dramatic change; requires project migration strategy

---

## 2. GAP-C3: Back EMF Formula

### 2.1 Current RAXA Formula

**File:** `src/engine/modules/calculations.js` line 353

```javascript
const R_emf = trRatedCurrent > 0 ? (2 * backEMFVolts) / trRatedCurrent : 0
```

With default `backEMFVolts = 2.0`:
```
R_emf = 2 * 2.0 / I_rated = 4.0 / I_rated
```

### 2.2 SAES-X-600 Section 5.2.5 Formula

```
Effective resistance caused by +0.8 volts anode bed back emf (for HSCI in coke breeze)
plus the structure back emf of -1.2 volts = 2.0 volts total between the anode with
coke breeze backfill, and a coated buried piping.

Remf = (0.8v + back emf) / Irated
```

With `back_emf = 1.2V` (structure):
```
R_emf = (0.8 + 1.2) / I_rated = 2.0 / I_rated
```

### 2.3 Side-by-Side Comparison

| Parameter | RAXA Formula | SAES Formula | Ratio |
|---|---|---|---|
| R_emf | 4.0 / I_rated | 2.0 / I_rated | **2.0x** |
| For I_rated=25A | 0.160 ohm | 0.080 ohm | 2.0x |
| For I_rated=10A | 0.400 ohm | 0.200 ohm | 2.0x |

### 2.4 Alternative: resistivityEngine.js Formula

**File:** `src/engine/modules/resistivityEngine.js` line 665

```javascript
(RESISTIVITY_CONSTANTS.TR_EFFICIENCY * ((trVoltageRatingV - backEmfV) / trCurrentRatingA))
```

This uses `(V_rated - backEMF) / I_rated` — a different approach entirely.
It is NOT the R_emf computation but rather a maximum allowable groundbed resistance calculation.
This formula is NOT in conflict — it serves a different purpose.

### 2.5 Impact on Results

The 2x overestimation of R_emf in `calcTRCircuit()` causes:
1. **R_T (total circuit resistance) is inflated** → V_min is higher than necessary
2. **TR voltage sizing may specify a higher voltage TR** than actually required
3. **Max allowable groundbed resistance** (R_G_max_allowable) is computed differently in two code paths

### 2.6 Recommended Correction

```javascript
// BEFORE (src/engine/modules/calculations.js line 353)
const R_emf = trRatedCurrent > 0 ? (2 * backEMFVolts) / trRatedCurrent : 0

// AFTER — Per SAES-X-600 §5.2.5
// Anode back EMF: 0.8V for HSCI in coke breeze, 1.0V for MMO in water/salt
// Structure back EMF: from design basis (default 1.2V for coated buried piping)
const anodeBackEmf = 0.8  // HSCI default; override per anode type
const structureBackEmf = backEMFVolts  // From design basis
const R_emf = trRatedCurrent > 0 ? (anodeBackEmf + structureBackEmf) / trRatedCurrent : 0
```

### 2.7 Regression Risk
- **HIGH:** All existing projects will produce different R_emf values, affecting:
  - Total circuit resistance
  - Minimum TR voltage
  - Max allowable groundbed resistance
  - TR adequacy checks
- **Mitigation:** Require recalculation of all projects after correction
- **Note:** The resistivityEngine.js formula `(V_rated - backEMF) / I_rated` is a different computation and does NOT need correction

---

## Summary

| Correction | Impact | Regression Risk | Priority |
|---|---|---|---|
| MMO current density: 200 -> 7.0/35.0 | Dramatic for MMO designs | HIGH — requires migration | Phase 2 |
| HSCI current density: 10.8 -> 7.0 | Moderate | MEDIUM | Phase 2 |
| Back EMF formula: 2*V/I -> (0.8+V)/I | All TR circuits affected | HIGH — all projects must recalculate | Phase 2 |

---

**Generated:** 2026-06-12
**Status:** AWAITING APPROVAL — no formula modifications made
