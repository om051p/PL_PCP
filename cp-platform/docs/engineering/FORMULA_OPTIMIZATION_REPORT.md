---
title: Formula Optimization Report
---

# FORMULA OPTIMIZATION REPORT — Evaluation of All Engineering Formulas

> **Principle:** Only recommend optimization if output remains identical, engineering meaning is preserved, and readability/performance improves.

---

## Evaluation Methodology

Each formula is assessed against 5 criteria:

1. **Mathematical correctness** — Is the math right?
2. **Engineering correctness** — Is the approach valid for ICCP?
3. **Unnecessary complexity** — Could the formula be simplified?
4. **Optimization potential** — Would simplification change results?
5. **Readability** — Is the formula understandable?

---

## Section 1: Pipeline Current Requirement

### Formula 1.2 — Diameter Conversion

| Criterion | Assessment |
|---|---|
| Mathematically correct? | ✅ Yes |
| Engineering correct? | ✅ Yes |
| Unnecessarily complex? | ❌ No — trivial |
| Optimize? | No — 1 operation |

**Verdict:** No optimization needed.

### Formula 1.9 — Surface Area

| Criterion | Assessment |
|---|---|
| Mathematically correct? | ✅ Yes |
| Engineering correct? | ✅ Yes |
| Optimize? | **Excel uses 3.14, app uses Math.PI** |

**Recommendation:** The app's use of `Math.PI` (3.14159...) is superior to Excel's hardcoded 3.14. **No change** needed — app is already more precise.

### Formula 1.10 — Temperature Correction

| Criterion | Assessment |
|---|---|
| Mathematically correct? | ✅ Yes |
| Engineering correct? | ✅ Yes |
| Optimize? | No |

Exponential form is appropriate. No simplification possible without changing output.

### Formula 1.11 — Current Requirement with Coating Efficiency

| Criterion | Assessment |
|---|---|
| Mathematically correct? | ✅ Yes |
| Engineering correct? | ✅ **App is MORE correct** |
| Optimize? | **Suggestion: make coating efficiency optional** |

**Optimization Opportunity:**
- App: `(area * ce * iTemp) / 1000`
- **Suggestion:** Add a flag or validation to optionally skip coating efficiency to match Excel behavior for cross-verification. Do NOT remove — coating efficiency is correct engineering.

### Formula 1.12 — Design Current (30% Spare)

| Criterion | Assessment |
|---|---|
| Mathematically correct? | ✅ Yes |
| Optimize? | No — single multiplication |

---

## Section 2: Anode Requirements

### Formula 2.4 — Anodes Based on Current

| Criterion | Assessment |
|---|---|
| Optimize? | No — `Math.ceil` is optimal |

### Formula 2.5 — Anodes Based on TR Rating

| Criterion | Assessment |
|---|---|
| Optimize? | App's `Math.ceil` is better than Excel's raw division |

The app correctly rounds up (7.022 → 8). **No change**.

---

## Section 3: Design Life

### Formula 3.5 — Design Life

| Criterion | Assessment |
|---|---|
| Mathematically correct? | ✅ Yes |
| Engineering correct? | ✅ Yes |
| Optimize? | No |

```
Y = (N × W × U) / (I_rated × C)
```

All terms are necessary. No simplification possible.

---

## Section 5: Groundbed Resistance

### Formula 5.9 — Dwight Formula (Deepwell)

| Criterion | Assessment |
|---|---|
| Mathematically correct? | ⚠️ Both are correct but different forms |
| Engineering correct? | **App is MORE correct** — includes L/(4h) term |
| Optimize? | **Suggestion: document the difference** |

**Recommendation:** 
- The app's full Dwight formula is more accurate for engineering
- The Excel uses a simplified version (appropriate for deepwells where h >> L)
- **Do NOT change the app** — keep the full formula
- **Document** the discrepancy for traceability

### Shallow Vertical — Sunde's Formula

**No optimization needed.** The Excel and app both implement Sunde's formula correctly. The app handles the complex multi-anode parallel combination correctly.

---

## Section 6: Cable Resistances

### Formula 6.13-6.32 — Cable Resistance Calculation

| Criterion | Assessment |
|---|---|
| Simplify? | **Yes — both Excel and app can be simplified** |

**Optimization Opportunity:**
Excel pattern (20 times): `=IF(F79="", "", F79 * $D$101)`

This is repetitive. Both Excel and app could lift the resistance constant to a single place. However, this is a **documentation improvement**, not a calculation change.

### Formula 6.25 — Parallel Anode Cable Resistance

| Criterion | Assessment |
|---|---|
| Excel formula | `=1/SUMPRODUCT(IF((F101:F120<>0)*(ISNUMBER(F101:F120)), 1/(F101:F120), 0))` |
| Alternative | `=1/SUM(IFERROR(1/(F101:F120), 0))` (array formula) |
| Simplify? | ⚠️ Yes — but with care |

**Recommendation:** Excel's `SUMPRODUCT` pattern is robust (handles blanks). App's implementation is cleaner. **No change needed** — keep app implementation.

---

## Section 7-8: Back EMF & Total Circuit R

These are simple additive formulas. **No optimization possible.**

---

## Section 10: Remoteness (SAES-X-400)

### Formula 11.3 — Nested IF Table

| Criterion | Assessment |
|---|---|
| Simplify? | **Yes — significant improvement available** |

**Optimization Opportunity:**
Excel uses a deeply nested IF (16 conditions):
```excel
=IF(F191<=35, IF(F192<500, 20, IF(F192<=1000, 25, IF(F192<=3000, 50, 75))),
 IF(F191<=50, IF(F192<500, 30, IF(F192<=1000, 35, IF(F192<=3000, 75, 150))),
 ...))
```

**Better approach** (both Excel and app): Implement as a 4×4 lookup matrix:

```
Required Distance (m) based on SAES-X-400:
                     Soil Resistivity (Ω·cm)
TR Current    <500    500-1000  1000-3000  >3000
< 35A         20       25        50         75
35-50A        30       35        75        150
50-100A       65       75       150        250
100-150A     100      125       225        350
```

**Verdict:** The app should implement this as a table lookup rather than replicating the nested IF chain. **Result unchanged**, readability improved.

---

## Section 12: AC Power

### Formula 12.8 — AC kVA

| Criterion | Assessment |
|---|---|
| Excel formula | `=(F203*F202)/(0.6)/1000` |
| App formula | `(voltage * current) / (efficiency * powerFactor) / 1000` |
| Optimize? | App is better — uses separate constants |

**Verdict:** App's approach is more maintainable. Keep as-is.

---

## Section 13: Coke Requirement

### Formula 13.3-13.4 — Coke Bags

| Criterion | Assessment |
|---|---|
| Missing from app? | ✅ Yes — **needs implementation** |
| Simplify? | Formula is already minimal |

```
N = CEILING(L_active × 3.28 × 39.2 / 50)        (base)
N_final = CEILING(N × 1.15)                      (15% contingency)
```

Where:
- 3.28 = feet per meter conversion
- 39.2 = annulus volume factor (converts annular volume around column)
- 50 = lbs per bag

**Recommendation:** Implement with named constants for clarity.

---

## Optimization Summary

| # | Formula | Current | Recommendation | Impact |
|---|---|---|---|---|
| O-1 | Coating efficiency (1.11) | Excel missing, app has it | **App is correct** — document the difference | ✓ Correct |
| O-2 | Dwight formula (5.9) | Excel simplified, app full | **App is correct** — keep full formula | ✓ Correct |
| O-3 | SAES-X-400 lookup (11.3) | Nested IF chain | Implement as 4×4 lookup table | Readability |
| O-4 | Coke requirement (13.3-13.4) | **Missing from app** | Implement with named constants | Feature gap |
| O-5 | π precision (1.9) | Excel: 3.14 | **Already using Math.PI** — no change | ✅ Done |
| O-6 | Cable R constants | Hardcoded in Excel | **Already using constants** — no change | ✅ Done |

### Formulas NOT to Optimize

| Formula | Reason |
|---|---|
| 1.10 Temperature correction | Exponential — must remain |
| 2.4-2.5 Anode count | Conditional logic — must remain |
| 3.5 Design life | All terms necessary |
| 6.25 Parallel cable R | Complex due to blank handling |
| 10.6-10.18 Max R checks | Conditional — must remain |
| 12.8-12.9 AC power | Multiple divisions needed |

**Net total:** Only **1 optimization** (O-3: SAES-X-400 table) and **1 feature gap** (O-4: coke requirement) identified.
