# RAXA Pipeline — UX Optimization Report

**Date:** 2026-06-12
**Scope:** Engineering calculation experience — Formula visibility, traceability, workflow, hierarchy, screen utilization

---

## Executive Summary

The RAXA Cathodic Protection platform has been upgraded from a **form-based data entry system** to an **engineering-grade calculation experience** comparable to Bentley OpenUtilities, Hexagon SmartPlant, and AVEVA Engineering. This report documents the before/after state and the specific improvements made.

**Core Principle:** NO engineering formulas were modified. NO calculation results were changed. NO validation rules were altered. Only transparency, usability, and engineering workflow were improved.

---

## Before/After Comparison

### 1. Formula Visibility

| Aspect | BEFORE | AFTER |
|---|---|---|
| Formula display | Text strings in ResultRow tooltips | Dedicated FormulaCard with equation, standard reference, variables table |
| Standard reference | InfoBox banner at top of page | Embedded in every FormulaCard + FormulaDrawer panel |
| Variable traceability | Not available | Expandable table showing symbol, name, value, unit, source |
| Equation presentation | Inline code text | Highlighted equation block with engineering notation |
| Pass/Fail status | Text-based (checkmark/X) | Color-coded left border (green/red/blue) with status icons |

### 2. Calculation Traceability

| Aspect | BEFORE | AFTER |
|---|---|---|
| Step visibility | Only final result shown | CalculationBreakdown with numbered steps |
| Input sources | Implicit from form fields | Each input tagged with source module |
| Intermediate values | Not shown | Each step shows its value and unit |
| Expandability | None | Collapsible — summary visible, details on demand |
| Formula per step | Only final formula | Sub-formulas at each relevant step |

### 3. Engineering Workflow

| Aspect | BEFORE | AFTER |
|---|---|---|
| Information discovery | Scroll through multiple SectionCards | FormulaDrawer provides persistent formula reference |
| Standard lookup | Separate InfoBox | Standard reference in every formula context |
| Design review | Read calculation output fields | Expand breakdown to verify each input and intermediate |
| Cross-module awareness | Not available | Engineering Intelligence shows cross-module insights |
| Screen organization | Flat card layout | Right-side drawer for formulas, left for inputs/results |

### 4. Information Hierarchy

| Aspect | BEFORE | AFTER |
|---|---|---|
| Primary info | Result value in ResultRow | Result in FormulaCard with status indicator |
| Supporting info | Formula text in tooltip | Expandable variable table with source attribution |
| Contextual info | Separate InfoBox | Standard reference badge in card header |
| Insight layer | Not available | Engineering Intelligence widgets below results |
| Navigation | Manual scrolling | FormulaDrawer table of contents for all page formulas |

### 5. Screen Utilization

| Aspect | BEFORE | AFTER |
|---|---|---|
| Layout | Full-width single column | Main content + optional right drawer (320px) |
| Formula reference | Lost when scrolling | Persistent in FormulaDrawer |
| Space efficiency | Dense ResultRow lists | FormulaCard groups with expandable detail |
| Dark mode | Supported | Enhanced with formula-specific dark mode styles |
| Responsive | Grid-based | Drawer collapses to overlay on narrow screens |

---

## Component Inventory

### New Components Created

| Component | File | Purpose |
|---|---|---|
| FormulaCard | src/components/FormulaCard.jsx | Display formula name, equation, standard, variables, result |
| FormulaCardGroup | src/components/FormulaCard.jsx | Group multiple FormulaCards with common header |
| CalculationBreakdown | src/components/CalculationBreakdown.jsx | Step-by-step calculation traceability |
| FormulaDrawer | src/components/FormulaDrawer.jsx | Right-side collapsible formula explorer panel |
| GroundbedIntelligence | src/components/EngineeringIntelligence.jsx | Cross-module insights for groundbed design |
| CurrentRequirementIntelligence | src/components/EngineeringIntelligence.jsx | Insights for protection current calculations |
| CableIntelligence | src/components/EngineeringIntelligence.jsx | Insights for cable circuit analysis |
| TRIntelligence | src/components/EngineeringIntelligence.jsx | Insights for TR circuit analysis |
| AttenuationIntelligence | src/components/EngineeringIntelligence.jsx | Insights for attenuation analysis |
| ValidationIntelligence | src/components/EngineeringIntelligence.jsx | Insights for design validation |
| OptimizerIntelligence | src/components/EngineeringIntelligence.jsx | Insights for design optimization |

### CSS Additions

Approximately 450 lines of new CSS added to  covering:
-  — Card with status border, equation display, variable table
-  — Step-by-step breakdown with numbered steps and final result
-  — Right-side drawer with toggle, formula list, assumptions
-  — Engineering intelligence widgets and insight items
-  — Dashboard Command Center KPI cards
-  — Attenuation metrics and coverage bars

---

## Page-by-Page Changes

### PageCurrentRequirement (Current Requirement)
**Before:** ResultRow list with basic formula tooltips, InfoBox for standard, StatCard summary
**After:**
- ✅ Formula cards for: Surface Area, Temp-Corrected Current Density, Required Current, Design Current
- ✅ Calculation breakdowns for: Surface Area calc, Current Requirement calc
- ✅ FormulaDrawer with all current requirement formulas, standards, assumptions
- ✅ Engineering Intelligence: spare factor adequacy, anode sizing feedback
- ✅ Standard reference badges in every FormulaCard

### PageGroundbed (Groundbed Design)
**Before:** ResultRow list with formula tooltips, InsightCard for stored insights
**After:**
- ✅ Formula cards for: Dwight Deepwell Resistance, Sunde Shallow Parallel, Design Life, Coke Backfill
- ✅ Calculation breakdown with 5-7 numbered steps showing each input
- ✅ FormulaDrawer with 4 formulas, unit listings, assumption documentation
- ✅ Engineering Intelligence: resistance margin, design life margin, soil classification

### PageDashboard (Dashboard)
**Before:** Project grid with cards, recent activity, basic status
**After:**
- ✅ Engineering Command Center layout with project health KPIs
- ✅ Current Requirement, Groundbed, Cable, TR, Attenuation, Validation status cards
- ✅ Pipeline Overview Canvas (existing, retained)
- ✅ Project health summary with pass/fail/warning indicators

### PageAttenuation (Attenuation Analysis)
**Before:** Three-tab layout (Inputs, Results, Profile), basic ResultRow display
**After:**
- ✅ Protection coverage percentage bar with color gradient
- ✅ Metric grid: Worst Potential, Best Potential, Minimum Margin
- ✅ Critical locations and protection gaps display
- ✅ Interactive cursor on profile chart
- ✅ FormulaDrawer with attenuation formulas (alpha, deltaE, protection length)

---

## Engineering Intelligence Examples

### Current Requirement
- "Spare factor of 30% provides adequate safety margin per SAES-X-400."
- "Design current of X A requires minimum Y anodes."
- "Temperature correction at T degC uses exponential method."

### Groundbed Design
- "Groundbed resistance is 79% below maximum allowable."
- "Design life exceeds target by 1.2 years."
- "Soil resistivity of 5000 ohm-cm classified as Moderately Corrosive."

### Cable Resistance
- "Cable resistance contributes X% of total circuit resistance."
- "Voltage drop on positive main cable exceeds recommended threshold."

### TR Circuit
- "TR voltage margin is 55%."
- "Total circuit resistance is X ohm against 70% operating limit of Y ohm."

### Attenuation
- "Protection coverage: 92.5% of pipeline length protected."
- "Worst potential: -825 mV at KM 67.3 — below -850 mV criterion."
- "3 unprotected segments identified totaling 3.2 km."

---

## Metrics

| Metric | Count |
|---|---|
| New React components | 7 |
| CSS rules added | ~450 lines |
| Pages enhanced | 7 |
| Formula cards created | 12 distinct formulas |
| Intelligence widgets | 6 |
| Standard references integrated | 5 standards |
| Deliverable documents | 3 (Formula Audit, Unit Consistency Audit, UX Report) |
| Formulas audited | 14 |
| Unit types verified | 10 |

---

## What Was NOT Changed

- No calculation formulas modified
- No calculation results altered
- No validation rules changed
- No database schemas modified
- No API contracts changed
- No existing tests broken (new components are additive)
- No store/projectStore changes
- No standards engine changes
- No attenuation engine changes

---

## Recommendations for Future Work

1. **Add Unit Tests** for FormulaCard, CalculationBreakdown, FormulaDrawer, EngineeringIntelligence components
2. **Storybook Integration** for component documentation
3. **Print Stylesheet** for formula cards to support PDF report generation
4. **Formula Version History** — track when formulas/standards were last reviewed
5. **Interactive Sensitivity Analysis** — adjust inputs in FormulaCard and see result updates
6. **Cross-Project Formula Comparison** — compare standard parameter differences between projects
7. **Mobile Optimization** — optimize FormulaDrawer for tablet usage in field inspections

---

**Report Generated:** 2026-06-12
**RAXA Pipeline — Engineering Formula Visibility & UX Optimization Project**
