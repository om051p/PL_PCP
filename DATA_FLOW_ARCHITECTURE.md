# Project-Wide Data Synchronization & Flow Architecture

This document outlines the data binding architecture for the **CP Designer** platform. It defines the central state store, identifies duplicate and hardcoded parameters that have been consolidated, and maps the flow of data from inputs to calculations, verifications, and bills of materials.

---

## 1. Data Binding Architecture: Single Source of Truth

To ensure consistency across the application, duplicate inputs are eliminated. All modules (Current Requirement, Groundbed Design, Cable Resistance, TR Sizing, and BOM) consume parameters from a centralized project store.

```
       [ Central Project / Pipeline State Store ]
           │          │             │         │
           ▼          ▼             ▼         ▼
    ┌──────────┐ ┌──────────┐  ┌──────────┐ ┌─────┐
    │ Sections │ │ Stations │  │ Settings │ │ LUTS│
    └──────────┘ └──────────┘  └──────────┘ └─────┘
           │          │             │         │
           ▼          ▼             ▼         ▼
     [ calculateAllStationOutputs() Core Engine ]
                      │
                      ▼
           [ CalculationOutputs Object ]
           ├── Intermediate Calculations (Category C)
           ├── Verification Checks (Category D)
           └── Live-Generated BOM (Category E)
```

---

## 2. Consolidated Field Inventory (The Single Source of Truth)

Previously, several parameters were hardcoded in calculations or duplicated across UI inputs. They are now consolidated at either the **Project**, **Pipeline**, or **Station** level:

| Parameter Name | Legacy State | Refactored State | Scope | SAMS / Standard |
| :--- | :--- | :--- | :--- | :--- |
| **Pipeline Diameter** | Station & Section previews | Centrally in `Pipeline` | Pipeline | UI-004 |
| **Coating Type** | Duplicated in Station views | Centrally in `Pipeline` | Pipeline | - |
| **Coating Resistance** | Duplicated in Station views | Centrally in `Pipeline` | Pipeline | - |
| **Soil Resistivity** | Duplicate station inputs | Station-specific with default | Station / Pipeline | UI-023 |
| **Design Life Target** | Hardcoded to 25 years in checks | Configurable in `Project` | Project | UI-034 |
| **Back EMF Voltage** | Hardcoded to 2.0V in code | Configurable in `Project` | Project | UI-032 / 17-SAMSS-003 |
| **Structure Resistance**| Hardcoded to 0.055Ω in code | Configurable in `Project` | Project | UI-033 / 17-SAMSS-003 |
| **AC Input Voltage** | Hardcoded to 480V in code | Configurable in `Project` | Project | UI-035 / 17-SAMSS-004 |
| **AC Input Phase** | Hardcoded to 3-phase in code | Configurable in `Project` | Project | UI-036 / 17-SAMSS-004 |
| **TR Efficiency** | Hardcoded to 80% in code | Configurable in `Project` | Project | UI-037 / 17-SAMSS-004 |
| **Power Factor** | Hardcoded to 0.8 in code | Configurable in `Project` | Project | UI-038 / 17-SAMSS-004 |
| **Coke Bulk Density** | Hardcoded to 880 kg/m³ in code| Loaded from LUT-004 | Project | 17-855-011 |
| **Coke Contingency** | Hardcoded to 10% in code | Configurable in `Project` | Project | UI-041 |
| **Min Remoteness Dist.**| Hardcoded to 20m in checks | Configurable in `Project` | Project | UI-040 / SAES-X-400 |
| **Actual Remoteness Dist.**| Hardcoded to 56m in checks | Configurable in `Project` | Project | UI-039 / SAES-X-400 |

---

## 3. Data Flow and Calculations Cascade

When a user updates a centrally stored parameter in the UI, React's state triggers a synchronous re-rendering cycle that re-calculates all outputs. The cascade propagates as follows:

```
[ User Changes Pipeline Diameter (OD) or Coating Resistance ]
  │
  ▼
[ Pipeline surface area recalculated for all sections ]
  │
  ▼
[ Design Current requirement recalculated for all sections ]
  │
  ▼
[ Station Current required recalculated (sum of assigned sections) ]
  ├──► [ Number of anodes required by current updates ]
  ├──► [ Target design life of groundbed updates ]
  └──► [ Sized TR Current requirement updates ]
         │
         ▼
       [ Minimum TR Voltage required updates (RT × I_rated) ]
         │
         ▼
       [ Compliance checks execute (TR Voltage Check, Resistance check) ]
         │
         ▼
       [ BOM items updated (anode cables, TR rating item, costs) ]
```

---

## 4. Attenuation Sizing Data Flow (NACE/ISO linear temp correction)

The temperature-corrected current density ($i_T$) flows through standard calculations:
$$\Delta T = T_{\text{operating}} - T_{\text{base}}$$
$$i_T = i_{\text{base}} \times (1 + \Delta T \times \text{temp\_factor})$$
$$I_{\text{req}} = \pi \times D \times L \times \frac{i_T}{1000}$$
$$I_{\text{design}} = I_{\text{req}} \times \text{spare\_factor}$$

This flows directly into the **Current Sizing Module**, which feeds the **Groundbed Design** and **TR Sizing** modules in real-time.
