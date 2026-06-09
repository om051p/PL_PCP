---
title: Missing Logic Report
---

# MISSING LOGIC AUDIT — Excel Formulas vs Application Implementation

> **Complete inventory of what's missing, different, or added between the Excel workbook and the application code.**

---

## 1. Excel Formulas Missing from Application

### 🔴 Critical Missing

| # | Section | Cell | Formula | Purpose | Impact |
|---|---|---|---|---|---|
| **M-1** | **13.3-13.4** | F212-F213 | Coke bag requirement | Determines calcined petroleum coke backfill quantity | BOM quantity will be wrong — coke bags default to 0 or missing in generated BOM |

**Details:**
- Excel: `=ROUNDUP((F210*3.28*39.2)/50,0)` then `ROUNDUP(F212*1.15,0)`
- App: No equivalent function exists
- Impact: The BOM will not include coke backfill quantity, requiring manual calculation

### 🟡 Missing — Minor

| # | Section | Cell | Formula | Purpose | Impact |
|---|---|---|---|---|---|
| M-2 | **4.9** | F55 | Active column length | `ROUND(F51+(F49*F50)+((F49-1)*F52)+F53,0)` | Used by coke calc and drilling depth |
| M-3 | **4.10** | F56 | End of coke column | `F57-F54` | Reference value |
| M-4 | **4.11** | F57 | Total drilling depth | `F55+F48+F54` | Verifies against max depth |
| M-5 | **4.14** | F61 | Max drilling depth check | Text comparison | Safety check omitted |

---

## 2. Application Features Missing from Excel

### 🟢 Enhancement (not required for parity)

| # | Feature | App Location | Benefit |
|---|---|---|---|
| A-1 | **Multi-segment pipeline support** | `stations[].segments[]` | Excel only supports 2 pipeline sections per station. App supports N segments per station |
| A-2 | **Coating efficiency factor** | `calcCurrentRequirement` | Excel doesn't model coating. App applies coating efficiency per segment |
| A-3 | **Multiple anode types** | `ANODE_SPECS` (4 types) | Excel only models HSCI TA-4. App supports HSCI TA-4, TA-2, MMO Tubular, Zinc Ribbon |
| A-4 | **Multiple cable sizes** | Constants (6 sizes) | Excel only uses 16mm², 25mm², 35mm² |
| A-5 | **Design alternatives (optimizer)** | `optimizer.js` (3 alts) | Excel is single-solution only |
| A-6 | **Per-station independent workflow** | Workflow stepper | Excel computes both stations simultaneously |
| A-7 | **PDF/Excel report generation** | `reporting/` | Excel workbook is the only output format |

---

## 3. Formula Discrepancies

### 🔴 Critical Discrepancies

| # | Formula | Excel | App | Assessment |
|---|---|---|---|---|
| D-1 | **1.11: Current requirement** | `A × i_T / 1000` | `area × ce × iTemp / 1000` | **App is correct.** Coating efficiency is standard engineering practice. Excel is simplified. |
| D-2 | **5.9: Dwight formula** | `ρ/(2πL) × (ln(8L/d) - 1)` | Full formula with L/(4h) | **App is more accurate.** The L/(4h) term accounts for surface proximity. Excel is simplified for deepwells. |

### 🟡 Minor Discrepancies

| # | Formula | Excel | App | Assessment | Priority |
|---|---|---|---|---|---|
| D-3 | 1.9: π precision | 3.14 (hardcoded) | Math.PI | Negligible (< 0.01%) | 🟢 Low |
| D-4 | 2.2: Station current averaging | `(F24+G24)×0.5` | Per-station sum | Architecture difference | 🟡 Medium |
| D-5 | 2.5: TR anode rounding | Raw division (7.022) | Math.ceil (8) | App is conservative | 🟢 Low |
| D-6 | Anode count selection | Manual entry | Auto-calculated | App automates it | 🟢 Low |

---

## 4. Hidden Assumptions in Excel (Not Explicitly Documented)

| # | Assumption | Location | Implication |
|---|---|---|---|
| H-1 | Coating condition is implicitly "bare steel" | All calcs | Excel assumes 0% coating efficiency (bare pipe) |
| H-2 | Only 2 pipeline sections per station | F vs G columns | Cannot model 3+ segments at one station |
| H-3 | 85% utilization factor for design life | Formula 3.5 (hardcoded 0.85) | Not adjustable |
| H-4 | Back EMF always 2V | F148, I148 | Fixed — doesn't account for different TR types |
| H-5 | Structure-to-earth R always 0.055Ω | F155, I155 | Fixed — not adjustable per station |
| H-6 | Cable lengths hardcoded (180m, 100m, 60m) | F133, F137, F139 | Assumes specific site layout |
| H-7 | Anode spacing fixed at 1.5m (DW) / 2.0m (SV) | F52, I52 | Not adjustable |
| H-8 | Top gap fixed at 1.5m | F51 | Not adjustable |
| H-9 | Coke annulus factor 39.2 | Formula 13.3 | Fixed — doesn't account for different borehole sizes |
| H-10 | Efficiency × power factor = 0.6 | Formula 12.8 | Combined constant |

---

## 5. Application Constants Not in Excel

| Constant | App Value | Source |
|---|---|---|
| `THRESHOLDS.SPARE_FACTOR` | 1.30 | Excel (implicit) |
| `THRESHOLDS.UTILIZATION_FACTOR` | 0.70 | Excel (implicit) |
| `THRESHOLDS.WARNING_LIMIT` | 0.90 | Excel (implicit) |
| `THRESHOLDS.COATING_EFFICIENCY` | Various | **New — not in Excel** |
| `ANODE_SPECS.HSCI_TA4.outputAmps` | 3.56 | Excel F30 |
| `ANODE_SPECS.HSCI_TA4.weightKg` | 38.6 | Excel F39 |
| `ANODE_SPECS.HSCI_TA4.consumptionRateKgAY` | 0.45 | Excel F40 |
| `CABLE_SPECS.*` | 6 cable sizes | Excel only has 3 |

---

## 6. Migration Priority Matrix

| Item | Priority | Effort | Impact | Risk |
|---|---|---|---|---|
| M-1: Coke requirement | **🔴 HIGH** | 2h | BOM completeness | Low — pure addition |
| D-1: Coating efficiency | 🟡 MEDIUM | Document only | Documentation | None — app is correct |
| D-2: Dwight formula | 🟡 MEDIUM | Document only | Documentation | None — app is correct |
| M-2 to M-5: Config calcs | 🟢 LOW | 4h | Reference values | Low |
| A-1 to A-7: App extras | 🟢 LOW | N/A | Enhancement | None — existing features |

**Primary action item:** Implement Section 13 (coke requirement) in the application to ensure BOM accuracy for field material ordering.
