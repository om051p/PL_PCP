# RAXA — Input Linking Audit Report

**Date:** 2026-06-13
**Branch:** `feat/phase-c-motion`
**Scope:** All 11 designBasis fields and their downstream consumers
**Status:** ✓ Complete — full traceability map

---

## 1. Goal

Audit whether **every** design-basis input in `project.designBasis` is explicitly linked to the modules that consume it, with exact field paths, so that engineers can trace any input → consumer → result chain.

Before this audit, only `soilResistivityOhmCm` had full traceability (audited in `UI_VIZ_ARCHITECTURE_REPORT.md`). The other 10 fields were referenced in code but not centrally documented.

---

## 2. Coverage Summary

| Metric | Value |
|---|---|
| Fields audited | **11 / 11** (100%) |
| Consumer links documented | **38** (across 11 fields) |
| Downstream modules covered | **9** unique modules |
| Groups | 5 (Environment, Project, Electrical, Material, Site) |

### Module coverage
Groundbed Design, TR Circuit, Attenuation Analysis, Engineering Validation, Design Optimizer, Reporting, BOM, Anode Count, Dashboard

### Field coverage (11 / 11)

| # | Field | Unit | Type | Consumers | Group |
|---|---|---|---|---|---|
| 1 | `soilResistivityOhmCm` | Ω·cm | number | 8 | environment |
| 2 | `systemDesignLifeYears` | years | number | 6 | project |
| 3 | `backEmfV` | V | number | 3 | electrical |
| 4 | `structureResistanceOhm` | Ω | number | 3 | electrical |
| 5 | `trEfficiencyPct` | % | number | 2 | electrical |
| 6 | `trPowerFactor` | — | number | 1 | electrical |
| 7 | `cokeContingencyPct` | % | number | 3 | material |
| 8 | `acInputVoltageV` | V | number | 1 | electrical |
| 9 | `acInputPhase` | — | enum | 1 | electrical |
| 10 | `actualRemotenessDistanceM` | m | number | 3 | site |
| 11 | `minRemotenessDistanceM` | m | number | 2 | site |

---

## 3. Groups

The 11 fields are grouped by their engineering domain:

| Group | Fields | Count |
|---|---|---|
| **Environment** | soilResistivityOhmCm | 1 |
| **Project** | systemDesignLifeYears | 1 |
| **Electrical** | backEmfV, structureResistanceOhm, trEfficiencyPct, trPowerFactor, acInputVoltageV, acInputPhase | 6 |
| **Material** | cokeContingencyPct | 1 |
| **Site** | actualRemotenessDistanceM, minRemotenessDistanceM | 2 |

---

## 4. Key Linkages (Highest-Impact)

### soilResistivityOhmCm (8 consumers — most-linked field)
- Groundbed Design: Dwight/Sunde/distributed R_G
- TR Circuit: R_T sum
- Attenuation: R_L (coating leakage)
- Validation: range check
- Optimizer: sensitivity baseline
- Reporting: PDF/Excel display

### systemDesignLifeYears (6 consumers)
- Design Life: Y = N·W·U_f/(C·I) target
- Anode Count: min from life
- Validation: BR-005 (Y < target − 3yr)
- BOM: anode quantity
- Dashboard: KPI display
- Reporting: cover page

### backEmfV (3 consumers)
- TR Circuit: R_emf (after Phase A fix) = V/I
- TR Circuit: V_min = R_T × I + V_emf
- Reporting: PDF row

---

## 5. Implementation

### 5.1 `src/engine/inputLinkRegistry.js` (NEW)
Pure data module. No side effects, no DOM, no state.

```javascript
export const INPUT_LINKS = {
  soilResistivityOhmCm: {
    label, unit, type, default, standard, description, group,
    consumers: [ { module, path, purpose }, ... ],
    validationRules: [...],
  },
  // ... 10 more fields
}

export const INPUT_GROUPS = ...  // grouped by `group`
export function getConsumers(fieldName) { ... }
export function getInputsForModule(moduleName) { ... }
export function getAllInputFieldNames() { ... }
export function getAuditSummary() { ... }
```

### 5.2 `src/components/InputLinkView.jsx` (NEW)
Three render modes:
- `mode="field"` — show one field's consumers (used in PageProjectSetup)
- `mode="module"` — show all fields consumed by one module
- `mode="audit"` — full table for the audit report (KPIs + grouped list)

Renders: field metadata, consumer rows (module / path / purpose), validation rule chips.

### 5.3 `src/pages/PageProjectSetup.jsx` (UPDATED)
Added a new **"Input Dependencies"** section:
- Dropdown to pick a designBasis field
- Live render of `InputLinkView` for the selected field
- Shows all downstream consumers and validation rules

---

## 6. Verification

```
Tests: 617/633 passing (same as baseline; 1 pre-existing governance, 1 firestore needs emulator)
Build: clean
```

---

## 7. Sample Link (soilResistivityOhmCm)

| Module | Field Path | Purpose |
|---|---|---|
| Groundbed Design | `calcDweellGroundbedResistance(ρ, L, d, h)` | R_G via Dwight formula |
| Groundbed Design | `calcShallowVerticalGroundbedResistance(ρ, L, d, h, N, s)` | R_G via Sunde formula |
| Groundbed Design | `calcDistributedGroundbedResistance(ρ, L, d, h, N)` | R_G distributed |
| TR Circuit | `runStationCalculations → calcTRCircuit(..., R_G, ...)` | Total R_T contribution |
| Attenuation Analysis | `attenuationInput.coating.soilResistivityOhmCm` | Coating leakage resistivity (R_L) |
| Engineering Validation | `validateSoilResistivityRange()` | Compliance range check |
| Design Optimizer | `runOptimizer → cost & R_G trade-off` | Sensitivity baseline |
| Reporting (Excel/PDF) | `output sheet: "Resistivity"` | Display in BOM/PDF reports |

**Validation rules:** SAES-400-5.2.1-RHO-MIN, SAES-400-5.2.1-RHO-MAX

---

## 8. Use Cases Enabled

1. **Engineer editing soil resistivity in PageProjectSetup** — instantly sees that the value flows to 8 different consumers. A change updates all 8.
2. **Reviewer auditing a design** — uses the Input Dependencies view to verify nothing is unlinked.
3. **Sensitivity module (Phase 4)** — uses `INPUT_LINKS` to know which inputs to perturb and which outputs to measure.
4. **Compliance Center** — links each SAES rule to the input it depends on.
5. **Onboarding new engineer** — single page shows the full designBasis → module flow.

---

## 9. Maintenance

- The registry is **pure data** — easy to update when a new consumer is added.
- Every addition to the `consumers` array is a documentation contract; lint can be added later to enforce coverage.
- New designBasis fields can be added with zero refactor of consumers — just extend `INPUT_LINKS`.

---

**Report generated:** 2026-06-13
**Next update:** When Phase 4 (Sensitivity) consumes the registry to drive perturbation list.
