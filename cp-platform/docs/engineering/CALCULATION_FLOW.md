---
title: Calculation Flow
---

# CALCULATION FLOW — ICCP Engineering Calculation Sequence

> **Source:** `PCP Calculation sheet.xlsx` — Sheet: `Cal.(DW)`
> **Code Reference:** `src/engine/modules/calculations.js` → `runStationCalculations()`
> **Related Documents:**
>   - [Formula Inventory](FORMULA_INVENTORY.md) — all formulas
>   - [Engineering Assumptions](ENGINEERING_ASSUMPTIONS.md) — design basis
>   - [Dependency Map](DEPENDENCY_MAP.md) — variable graph

## Overview

The ICCP calculation flow follows a strict sequential dependency chain. Each step consumes outputs from previous steps. The sequence is designed to match the engineering workflow: pipeline geometry → current demand → groundbed design → cable sizing → TR circuit → life assessment → validation.

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        INPUT PARAMETERS                                │
│  Pipeline OD, Length, Temp, Current Density                             │
│  Soil Resistivity, Anode Spec, Cable Config, TR Ratings                │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 1: SURFACE AREA & CURRENT REQUIREMENT                            │
│  ┌─────────────────┐    ┌────────────────────┐    ┌─────────────────┐  │
│  │ 1a. OD (inch→m) │───→│ 1b. Surface Area   │───→│ 1c. Current     │  │
│  │ D = OD × 0.0254 │    │ A = π × D × L      │    │ Density i_T     │  │
│  └─────────────────┘    └────────────────────┘    │ i_T = i_base ×  │  │
│                                                    │ [1+(T-25)×0.025]│  │
│                                                    └────────┬────────┘  │
│                                                             │           │
│                                                             ▼           │
│                                              ┌──────────────────────┐   │
│                                              │ 1d. Required Current │   │
│                                              │ I_req = A × i_T     │   │
│                                              │ (× coating eff.)    │   │
│                                              └──────────┬───────────┘   │
│                                                         │               │
│                                                         ▼               │
│                                              ┌──────────────────────┐   │
│                                              │ 1e. Design Current   │   │
│                                              │ I_design = I_req     │   │
│                                              │        × 1.30       │   │
│                                              └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 2: ANODE REQUIREMENT                                            │
│                                                                         │
│  ┌─────────────────────────┐    ┌──────────────────────────┐           │
│  │ 2a. Anodes by Current   │    │ 2b. Anodes by TR Rating  │           │
│  │ N_cur = ceil(I_design   │    │ N_tr = ceil(I_rated      │           │
│  │         / I_anode)      │    │         / I_anode)       │           │
│  └─────────────────────────┘    └──────────────────────────┘           │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 2c. Proposed Anodes = max(N_cur, N_tr, user_input)              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 3: GROUNDBED CONFIGURATION & RESISTANCE                          │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Inputs: Type (deepwell/shallow), Anode length, Spacing, Depth,  │   │
│  │         Borehole diameter, Soil resistivity, Number of anodes   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                 │                                       │
│                 ┌───────────────┴───────────────┐                       │
│                 ▼                               ▼                       │
│  ┌─────────────────────────┐    ┌─────────────────────────┐             │
│  │ Deepwell                │    │ Shallow Vertical        │             │
│  │ L_active = N×L_a        │    │ R_single = ρ/(2πL) ×   │             │
│  │      + (N-1)×S          │    │ [ln(4L/d) - 1 + L/(2h)]│             │
│  │                         │    │                         │             │
│  │ R_G = ρ/(2πL) ×         │    │ R_mutual = ρ/(π×L×N²)  │             │
│  │ [ln(8L/d) - 1 + L/(4h)] │    │ × Σ[ln(2i×S/L)]        │             │
│  │   (Dwight, 1936)        │    │                         │             │
│  │                         │    │ R_G = R_single/N        │             │
│  │                         │    │      + R_mutual         │             │
│  │                         │    │   (Sunde, 1968)         │             │
│  └───────────┬─────────────┘    └───────────┬─────────────┘             │
│              │                              │                           │
│              └──────────────┬───────────────┘                           │
│                             ▼                                           │
│              ┌─────────────────────────────┐                            │
│              │ Outputs: R_G, L_active,     │                            │
│              │ Total drill depth           │                            │
│              └─────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 4: CABLE RESISTANCE                                              │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 4a. Anode Tail Cables (Parallel)                                │   │
│  │ R_i = L_i × r_16mm²    for each anode i                         │   │
│  │ R_ac = 1 / Σ(1/R_i)    (parallel combination)                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 4b. Main Positive Cable                                         │   │
│  │ R_pc = L_pos × r_35mm²                                          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 4c. Negative Circuit                                             │   │
│  │ R_nc = L_neg_main × r_35mm² + L_neg_sec × r_25mm²              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 4d. Total Cable Resistance = R_ac + R_pc + R_nc                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 5: BACK EMF RESISTANCE                                           │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ R_emf = 2 × V_emf / I_rated                                     │   │
│  │ Typically: 2 × 2V / I_rated = 4 / I_rated                       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 6: TOTAL CIRCUIT RESISTANCE                                      │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ R_T = R_G + R_c + R_emf + R_s                                   │   │
│  │                                                                   │   │
│  │ where: R_s = Structure-to-earth resistance (user input)          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 7: TR VOLTAGE REQUIREMENT                                       │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ V_min = R_T × I_rated + V_emf                                   │   │
│  │ Check: V_rated ≥ V_min ?                                         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 8: MAXIMUM ALLOWABLE RESISTANCE                                  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ R_Tmax_70 = 0.70 × V_rated / I_rated   (operating limit)        │   │
│  │ R_Tmax_90 = 0.90 × V_rated / I_rated   (warning limit)          │   │
│  │ R_Gmax = 0.70 × (V_rated - EMF) / I - R_c - R_s                │   │
│  │                                                                   │   │
│  │ Checks:                                                          │   │
│  │  ✓ R_T < R_Tmax_70 ?                                              │   │
│  │  ✓ R_T < R_Tmax_90 ?                                              │   │
│  │  ✓ R_G < R_Gmax ?                                                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 9: DESIGN LIFE                                                  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Y = N × W / (C × I_rated)                                       │   │
│  │                                                                   │   │
│  │ Check: Y ≥ Target (25 years) ?                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 10: AC POWER CONSUMPTION                                        │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ P_DC = V_rated × I_rated                                        │   │
│  │ AC_kVA = P_DC / (Eff × PF × 1000)                               │   │
│  │ I_ac = AC_kVA × 1000 / (480 × √3)                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 11: REMOTENESS CHECK                                            │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Check: Actual distance ≥ 20m (per SAES-X-400)                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 12: VALIDATION RULES (rulesEngine.js)                           │
│                                                                         │
│  BR-001: V_rated ≥ V_min                     ─── TR Voltage           │
│  BR-002: R_G < R_Gmax                         ─── Groundbed R         │
│  BR-003: R_T < R_Tmax_70                      ─── Circuit R (70%)    │
│  BR-004: R_T < R_Tmax_90                      ─── Circuit R (90%)    │
│  BR-005: Y ≥ Target Years                     ─── Design Life        │
│  BR-006: Actual Remoteness ≥ Required         ─── Remoteness        │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 13: DESIGN OPTIMIZATION (optimizer.js)                           │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ Current      │  │ Alt A:       │  │ Alt B:       │                   │
│  │ Design       │  │ +4 Anodes    │  │ +8 Anodes    │                   │
│  │ (Baseline)   │  │              │  │              │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│  ┌──────────────┐                                                       │
│  │ Alt C:       │                                                       │
│  │ Larger TR    │                                                       │
│  └──────────────┘                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  OUTPUTS                                                               │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ PDF Report   │  │ Excel Export │  │ BOM          │                   │
│  │ (jspdf)      │  │ (xlsx)       │  │ (rules-based)│                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Calculation Sequence (Topological Order)

| Order | Step | Function | Dependencies | Outputs |
|---|---|---|---|---|
| 1 | 1a-1b | `calcSurfaceArea()` | OD (inch), Length | Surface area (m²) |
| 2 | 1c | `calcTempCorrectedCurrentDensity()` | Base CD, Temp | Temp-corrected CD |
| 3 | 1d-1e | `calcCurrentRequirement()` | Area, i_T, CE | I_req, I_design |
| 4 | 2a-2c | *(in UI)* `calcCurrentRequirement()` | I_design, I_anode | Proposed N_anodes |
| 5 | 3 | `calcGroundbedResistance()` | ρ, dims, config type | R_G, L_active |
| 6 | 4 | `calcCableResistances()` | Lengths, cable specs | R_ac, R_pc, R_nc, R_c |
| 7 | 5 | `calcTRCircuit()` | I_rated, V_emf | R_emf |
| 8 | 6-7 | `calcTRCircuit()` | R_G, R_c, R_emf, R_s | R_T, V_min |
| 9 | 8 | `calcTRCircuit()` | V_rated, I_rated, R_c, R_s | R_Tmax, R_Gmax |
| 10 | 9 | `calcDesignLife()` | N, W, C, I_rated | Years |
| 11 | 10 | `calcTRCircuit()` | V_rated, I_rated | AC power, DC power |
| 12 | 11 | *(inline check)* | Actual, Required distance | PASS/FAIL |
| 13 | 12 | `runRules()` | Station + Result | 6 checks, insights |
| 14 | 13 | `generateAlternatives()` | Station + Result | 3 design alts |

---

## Orchestration (Single Entry Point)

```
runStationCalculations(station, systemDesignLifeYears)
├── calcCurrentRequirement()          → currentResult
├── calcGroundbedResistance()         → gbResult
├── calcCableResistances()            → cableResult
├── calcTRCircuit()                   → trResult
├── calcDesignLife()                  → designLife
├── runRules()                        → ValidationChecks + Insights
├── generateAlternatives()            → DesignAlternatives
└── calcStation() → returns CalcResult (35+ fields)
```

## Excel Tab Structure Correspondence

| Excel Section | Code Function | Lines |
|---|---|---|
| 1) Pipeline Parameters & Current | `calcSurfaceArea`, `calcCurrentRequirement` | 17-52 |
| 2) Anode Requirement | *(UI-level calculation)* | — |
| 3) Design Life | `calcDesignLife` | 168-179 |
| 4) Anode Configuration | *(inputs only)* | — |
| 5) Groundbed Resistance | `calcGroundbedResistance` | 55-131 |
| 6) Cable Resistance | `calcCableResistances` | 133-165 |
| 7) Back EMF | `calcTRCircuit` | 167-170 |
| 8) Total Circuit Resistance | `calcTRCircuit` | 172-174 |
| 9) Min TR Voltage | `calcTRCircuit` | 176-178 |
| 10) Max Allowable Resistance | `calcTRCircuit` | 180-186 |
| 11) Remoteness | *(inline)* | — |
| 12) AC Power | `calcTRCircuit` | 190-196 |
| 13) Coke Requirement | `bomEngine.js` | — |
