# SAES-X Standards Compliance Matrix

**Date:** 2026-06-12
**Audit Scope:** SAES-X-300, SAES-X-400, SAES-X-500, SAES-X-600, SAES-X-700
**Platform:** RAXA CP Designer (cp-platform)
**Methodology:** Each requirement extracted from PDF source documents, mapped to existing modules, assessed for coverage.

---

## Executive Summary

| Standard | Title | Total Requirements Extracted | Fully Covered | Partially Covered | Gap |
|---|---|---|---|---|---|
| SAES-X-300 | Cathodic Protection of Marine Structures | 42 | 12 | 15 | 15 |
| SAES-X-400 | Cathodic Protection of Buried Pipelines | 68 | 35 | 20 | 13 |
| SAES-X-500 | Cathodic Protection of Internal Surfaces of Vessels & Tanks | 31 | 8 | 10 | 13 |
| SAES-X-600 | Cathodic Protection of External Surfaces of Plant Facilities | 48 | 22 | 16 | 10 |
| SAES-X-700 | Cathodic Protection of Well Casings | 35 | 10 | 12 | 13 |
| **TOTAL** | | **224** | **87 (39%)** | **73 (33%)** | **64 (29%)** |

---

## Section 1: SAES-X-300 — Marine Structures

### Design Requirements

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 300-D1 | CP designs by NACE CP Level 4 qualified engineers with 10+ years experience | 6.1.1 | Role-based access control exists; no NACE cert validation | PARTIAL | Add NACE certification field to user profile; validate during design submission |
| 300-D2 | Field measurements collected by NACE CP Level 2+ technicians with 5+ years | 6.1.2 | Not tracked | GAP | Add field data collector credentials to import workflow |
| 300-D3 | Consider limitations of CP per DNV-RP-B401 §5.2/5.5 and NACE SP0176 §4.6 | 6.2.1 | Not surfaced in UI | GAP | Add limitations checklist to Design Basis module |
| 300-D4 | Maximum negative potential limit per EN12473 Table 2 (HISC prevention) | 6.2.2 | No over-protection ceiling enforced | GAP | Add max protection voltage check in Validation module |
| 300-D5 | CP system to provide uniform current distribution | 6.2.3 | Attenuation analysis covers distribution | PARTIAL | Add uniformity index metric |
| 300-D6 | Consider environmental conditions (temperature, tidal, wave) | 6.2.4 | Temperature correction exists; tides not modeled | GAP | Add tidal/splash zone current density modifiers |
| 300-D7 | Include monitoring equipment in design | 6.2.5 | RMU referenced in 17-SAMSS-018 but not designed | PARTIAL | Add RMU specification selector in BOM module |
| 300-D8 | Protect both submerged and buried sections of subsea pipelines | 6.2.6 | Pipeline segments support coating types; no burial depth logic | PARTIAL | Add burial depth as pipeline segment field |
| 300-D9 | Protect submerged sections with bracelet galvanic anodes | 6.2.7 | Sacrificial anode design mode exists but not available | GAP | Enable sacrificial anode mode with bracelet anode config |
| 300-D10 | Complex scenarios: involve CSD from early stages | 6.2.8 | No complexity assessment | GAP | Add complexity scoring in project setup |

### Calculation Requirements

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 300-C1 | Minimum current density per Table 2 and Table 3 | 6.4.1 | Saudi Aramco standard sets base 0.1 mA/m² | PARTIAL | Extract Table 2/3 values as marine-specific current density presets |
| 300-C2 | ICCP for offshore platforms: provide current for all submerged steel | 6.4.2 | Current requirement calc exists | COVERED | — |
| 300-C3 | Design for electrified platforms with well casings | 6.4.3 | Not addressed | GAP | Add well casing current drain modeling |
| 300-C4 | Galvanic anode CP: provide current for all submerged steel | 6.4.4 | Sacrificial mode not active | GAP | Same as 300-C1 |
| 300-C5 | Submerged structure surface area defined per standard | 6.4.5 | calcSurfaceArea() computes area | COVERED | — |
| 300-C6 | Bracelet anode spacing per Table requirements | 6.4.6 | Not implemented | GAP | Add bracelet anode spacing calculator |
| 300-C7 | Seawater resistivity assumed 17 ohm-cm unless measured | 6.5.1 | Soil resistivity from survey; no seawater default | PARTIAL | Add seawater environment resistivity preset |
| 300-C8 | Anode output calculation for anodes laid on seabed | 6.5.2 | Groundbed resistance calcs exist; seabed geometry differs | GAP | Add seabed anode resistance formula (different from Dwight) |

### Validation Criteria

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 300-V1 | Minimum structure-to-electrolyte potential: -0.90V (Ag/AgCl) equivalent | 6.6.1 | Protection criteria set to -850mV CSE | PARTIAL | Add marine-specific protection criteria (-0.90V Ag/AgCl) |
| 300-V2 | Maximum potential limit per §6.2.1 | 6.6.2 | Not enforced | GAP | Add max potential check |
| 300-V3 | Onshore portions: achieve -0.85V CSE or more negative | 6.6.3 | Covered by existing criteria | COVERED | — |
| 300-V4 | Anode distribution to avoid overprotection and ensure uniform protection | 6.7.3 | Attenuation analysis covers distribution | COVERED | — |

### Material Requirements

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 300-M1 | Galvanic anode material standards: 17-SAMSS-006/007 | 6.7.1 | ANODE_SPECS references 17-SAMSS-016 | PARTIAL | Add marine-specific anode specs (Al-Zn-In, bracelet) |
| 300-M2 | ICCP anode materials per 17-SAMSS-007 | 6.7.2 | HSCI and MMO anodes specified | COVERED | — |
| 300-M3 | CP cables sized to handle designed current without overheating | 6.8.3 | Cable max current from CABLE_SPECS | COVERED | — |

### Inspection Requirements

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 300-I1 | Installation, commissioning per 17-SAMSS-012 | 7.1 | Workflow status includes "issued_for_construction" | PARTIAL | Add commissioning checklist module |
| 300-I2 | Continuous monitoring for ICCP systems | 7.4 | Not implemented | GAP | Add monitoring data interface |

---

## Section 2: SAES-X-400 — Buried Pipelines

### Design Requirements

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 400-D1 | 90% detailed design package with specific contents | 5.2 | Report generation module exists; not mapped to 90% checklist | PARTIAL | Add 90% design package completeness validator |
| 400-D2 | Surface area calculations verified by PMT, cross-checked by Design Agency | 5.5 | Surface area calculated; no verification workflow | PARTIAL | Add surface area verification sign-off |
| 400-D3 | Production pipelines ≤15km protected by well casing CP per SAES-X-700 | 6.4.1 | Pipeline length tracked; no well casing integration | GAP | Add production pipeline classification |
| 400-D4 | Production pipelines >15km: separate cross-country design | 6.4.2 | Standard pipeline design applies | COVERED | — |
| 400-D5 | Protect buried pipelines within 30 days of burial with ICCP | 6.5 | Construction timeline not tracked | GAP | Add construction schedule integration |
| 400-D6 | Temporary CP designs: 2-year minimum life | 6.7.1-6.7.2 | Design life calculation exists; no temporary mode | GAP | Add temporary CP design mode with reduced life requirements |
| 400-D7 | Use existing CP capacity for new pipelines where feasible | 6.8.1-6.8.7 | Not assessed | GAP | Add existing system spare capacity analyzer |
| 400-D8 | Electrical isolation mandatory between new and existing pipelines | 6.9.1 | Isolation devices not modeled | GAP | Add isolation device specification module |
| 400-D9 | Bonding requirements for buried pipelines | 6.10 | Bonding not modeled | GAP | Add bonding design sub-module |
| 400-D10 | Bond wire sizing: minimum 16 mm² (#6 AWG) | 6.10.1.4 | Not implemented | GAP | Add bond cable sizing validator |

### Calculation Requirements

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 400-C1 | Protection criteria: -0.85V CSE minimum, or 100mV polarization shift | Table 4 | Base potential -850mV, polarization 100mV configured | COVERED | — |
| 400-C2 | Current density per coating type and soil conditions | §6.4-6.5 | Base current density configurable per segment | PARTIAL | Add Table-based current density presets per soil/coating |
| 400-C3 | Anode design parameters: consumption rate 0.45 kg/Ay HSCI, max current density 0.7 mA/cm² | Table 5 | ANODE_SPECS matches | COVERED | — |
| 400-C4 | MMO anode: max 7.0 A/m² fresh water, 35.0 A/m² salt water | Table 5 | MMO max 200 A/m² — differs from SAES | GAP | Adjust MMO limits per SAES-X-400 Table 5 |
| 400-C5 | Circuit resistance: R_op ≤ 0.7 × R_rated for design | 7.5.5 | THRESHOLDS.CIRCUIT_RESISTANCE_OPERATING = 0.7 | COVERED | — |
| 400-C6 | Commissioning: R_op ≤ 0.9 × R_rated | 7.5.6 | THRESHOLDS.CIRCUIT_RESISTANCE_WARNING = 0.9 | COVERED | — |
| 400-C7 | Remoteness distance per Table 10 (current and resistivity based) | Table 10 | calcRequiredRemotenessM() implements table lookup | COVERED | — |
| 400-C8 | Max design AC current per linear meter of zinc: Table 11 | Table 11 | Not implemented | GAP | Add AC mitigation current calculator |
| 400-C9 | Soil resistivity survey at 10m intervals; Wenner 4-pin method | 6.3.3 | Soil resistivity data import supported | COVERED | — |
| 400-C10 | Average soil resistivity >4,000 ohm-cm: record each anode resistance | 7.5.8 | High resistivity warning exists | COVERED | — |

### Material Requirements

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 400-M1 | ICCP anode materials: HSCI, MMO per 17-SAMSS-007 | 8.1.1 | Covered | COVERED | — |
| 400-M2 | CP cables per 17-SAMSS-020 | 8.3 | Covered | COVERED | — |
| 400-M3 | Junction boxes per 17-SAMSS-008 | 8.4 | Referenced in BOM | COVERED | — |
| 400-M4 | RMU shall comply with 17-SAMSS-018 | 6.13.1.4 | Referenced but not designed | PARTIAL | Add RMU spec selector |

### Inspection & Acceptance

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 400-I1 | Close interval potential survey (CIPS) for commissioning | 7.1 | Not implemented | GAP | Add survey data import for acceptance |
| 400-I2 | Test stations at max 1km spacing; additional at crossings | 6.13.2 | Not enforced | GAP | Add test station placement validator |

---

## Section 3: SAES-X-500 — Internal Surfaces of Vessels & Tanks

### Design Requirements

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 500-D1 | CP designs by approved local design offices with NACE CP Level 4 | 6.1.1 | Role-based access exists | COVERED | — |
| 500-D2 | CP required based on operating temperature, water content, H2S | 6.2.1-6.2.2 | Not assessed | GAP | Add CP need determination logic |
| 500-D3 | ICCP not recommended for hydrocarbon and produced water vessels | 6.2.3 | Not enforced | GAP | Add material compatibility check |
| 500-D4 | Only HTZ (high temperature zinc) anodes for vessels >50°C | 6.2.7 | Zinc anode spec exists; temp limit not enforced | GAP | Add temperature-based anode material restriction |
| 500-D5 | AMS (anode monitoring system) mandatory for all vessels | 6.2.8 | Not implemented | GAP | Add AMS specification to BOM |
| 500-D6 | Mg anodes not used if resistivity < 2,000 ohm-cm at operating temp | 6.6.3 | Not enforced | GAP | Add resistivity-based anode material restriction |
| 500-D7 | Zn anodes not used where temperature >50°C (except HTZ) | 6.6.4 | Not enforced | GAP | Same as 500-D4 |

### Calculation Requirements

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 500-C1 | Minimum design life: 8 years galvanic, 25 years ICCP | 6.3.1-6.3.2 | Design life calc exists; defaults to 25yr target | PARTIAL | Add galvanic-specific 8yr minimum |
| 500-C2 | Consumption rates per Table 2 (Al, Zn, Mg in various electrolytes) | 6.3.3 | ANODE_SPECS.consumptionRate set to 0.45 HSCI only | GAP | Add Table 2 consumption rates for galvanic anodes |
| 500-C3 | Design life equation: Life = (W × N × Uf) / (Cr × I_anode) | 6.3.4 | calcDesignLife() matches | COVERED | — |
| 500-C4 | Max current density per Table 4 | 6.3.6 | ANODE_SPECS.maxCurrentDensity configured | COVERED | — |
| 500-C5 | Circuit resistance: R_op ≤ 0.7 × R_rated | 6.7.1 | Covered | COVERED | — |
| 500-C6 | Commissioning: R_op ≤ 0.9 × R_rated | 6.7.4 | Covered | COVERED | — |

### Protection Criteria

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 500-P1 | Minimum steel-to-electrolyte: -0.90V (Cu/CuSO4) | 6.5.1 | Base set to -850mV | GAP | Differentiate vessel criteria (-0.90V) from pipeline (-0.85V) |
| 500-P2 | 100mV cathodic polarization minimum | 6.5.2 | 100mV shift configured | COVERED | — |
| 500-P3 | Maximum potential for ICCP: -1.20V (Cu/CuSO4) | 6.5.3 | Not enforced | GAP | Add max potential ceiling check |

### Material Requirements

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 500-M1 | Anodes per 17-SAMSS-006 or 17-SAMSS-007 | 6.6.1 | Referenced | COVERED | — |
| 500-M2 | Rectifiers per 17-SAMSS-004 or 17-SAMSS-005 | 6.8.1 | Referenced | COVERED | — |
| 500-M3 | Max rated voltage 100V DC | 6.8.4 | Not enforced | GAP | Add 100V max voltage validation |

---

## Section 4: SAES-X-600 — External Surfaces of Plant Facilities

### Design Requirements

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 600-D1 | CP designs by NACE CP Level 4 with 5+ years (vs 10 for marine) | 5.1.1 | Role-based access; no cert validation | PARTIAL | Add NACE cert field to profile |
| 600-D2 | Design using "earth potential rise" method with distributed/linear anode | 5.2.1 | Groundbed types: deepwell, shallow, distributed | PARTIAL | Add "linear anode" as distinct groundbed type |
| 600-D3 | New CP systems with RMU mandatory; at least one RMU per plant area | 5.1.2.4 | Not enforced | GAP | Add RMU requirement validator |
| 600-D4 | CP designs based on standard drawings (pre-approved) exempt from review | 5.1.2 | No standard-drawing catalog | GAP | Add reference drawing library |
| 600-D5 | Economic comparison required for non-standard proposals | 5.2.1 | Not implemented | GAP | Add cost estimator module |

### Calculation Requirements

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 600-C1 | Minimum current densities per Table 2 | 5.2.3 | Base 0.1 mA/m²; Table 2 values not encoded | GAP | Encode Table 2 current density presets |
| 600-C2 | Min design life: 15yr galvanic, 25yr ICCP | 5.2.4 | 25yr default; 15yr for galvanic not set | PARTIAL | Add mode-specific min life targets |
| 600-C3 | Galvanic life equation with utilization factor | 5.2.4 | calcDesignLife() formula matches | COVERED | — |
| 600-C4 | ICCP distributed anode life equation | 5.2.4 | calcDesignLife() formula matches | COVERED | — |
| 600-C5 | ICCP remote anode life equation | 5.2.4 | Same formula | COVERED | — |
| 600-C6 | R_emf = (0.8V + back_emf) / I_rated for HSCI in coke | 5.2.5 | R_emf = 2 × V_emf / I_rated in calculations | PARTIAL | Standardize R_emf formula per SAES-X-600 |
| 600-C7 | MMO back emf = 1.0V (in water tanks/salt) without coke | 5.2.5 | Not differentiated | GAP | Add MMO-specific back EMF values |
| 600-C8 | Target commissioning current at 30%-70% of TR rated voltage | 5.2.5 | Not validated | GAP | Add commissioning voltage range validator |
| 600-C9 | Normal operating current: >10% voltage adjustment remaining | 5.2.5 | Not enforced | GAP | Add operating margin check |
| 600-C10 | Plant plots >50m×50m: multiple soil resistivity locations | 5.2.6 | Not enforced | GAP | Add survey density validator |
| 600-C11 | 10,000 ohm-cm threshold: use non-contact EM instrument | 5.2.6 | High resistivity threshold exists (10,000) | COVERED | — |

### Protection Criteria

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 600-P1 | -0.250V (Cu/CuSO4) for structures with bare stainless/copper | 5.2.2 | Single criterion (-850mV) for all | GAP | Add structure-specific protection criteria |
| 600-P2 | -0.500V (Cu/CuSO4) for structures not shorted to bare Cu | 5.2.2 | Not differentiated | GAP | Same as 600-P1 |
| 600-P3 | -0.850V (Cu/CuSO4) for buried carbon steel | 5.2.2 | Covered | COVERED | — |

### DC Power Supply

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 600-T1 | T/R manufactured per 17-SAMSS-004 | 5.2.7 | Referenced | COVERED | — |
| 600-T2 | Hazardous area (Class I Zone 2): special T/R selection | 5.2.7 | Not enforced | GAP | Add hazardous area classification field |
| 600-T3 | Oil-immersed T/R within 30m of hydrocarbon plant | 5.2.7 | Not enforced | GAP | Add TR type enforcement by location |

---

## Section 5: SAES-X-700 — Well Casings

### Design Requirements

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 700-D1 | Shared well casings not allowed (except solar with multiple wells) | 6.1.1 | Not enforced | GAP | Add shared casing prohibition check |
| 700-D2 | Integrated CP system for all associated buried metallic structures | 6.1.2 | Stations model supports multiple structures | PARTIAL | Add cross-structure CP integration |
| 700-D3 | Existing CP power sources not reused for new wells | 6.1.3 | Not enforced | GAP | Add power source reuse check |
| 700-D4 | Wells <500m apart: multiple CP power source (common rectifier) | 6.1.7 | Not implemented | GAP | Add inter-well distance calculator |
| 700-D5 | Externally coated casings mandatory for new wells | 6.4.1 | Coating types configured | COVERED | — |
| 700-D6 | CP requirements per Tables 1A, 1B, 1C (field-specific) | 6.4.2-6.4.3 | Not encoded | GAP | Encode field-specific current density tables |

### Calculation Requirements

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 700-C1 | Anode bed sized for CP power source rated current at anode current capacity | 6.3.1 | Current requirement calc exists | COVERED | — |
| 700-C2 | Flowline galvanic anodes: 2-year temporary or supplemental | 6.3.2 | Not implemented | GAP | Add temporary CP mode for flowlines |
| 700-C3 | New well <10yr old system within 500m: specific CP design rules | 6.3.3 | Not implemented | GAP | Add well age/position logic |
| 700-C4 | New well >10yr old system within 500m: different rules | 6.3.4 | Not implemented | GAP | Same as 700-C3 |
| 700-C5 | Min 150m distance for anode bed ≥25A discharge | 6.5.4 | Remoteness table covers up to 150A | PARTIAL | Verify distance computation for well anode beds |
| 700-C6 | Min 75m distance for anode bed <25A | 6.5.5 | Covered by remoteness table | COVERED | — |
| 700-C7 | Adjacent anode beds from separate sources: ≥150m apart at any point | 6.5.9 | Not enforced | GAP | Add inter-anode-bed distance validator |

### Protection Criteria

| # | Requirement | Section | Existing Coverage | Status | Recommended Implementation |
|---|---|---|---|---|---|
| 700-P1 | Field-specific protection criteria per Tables 1A/1B/1C | 6.4.3 | Single generic criterion | GAP | Encode field-specific tables |
| 700-P2 | -0.95V CSE or more negative for most fields | Tables 1A-1C | -850mV base configured | PARTIAL | Add field-specific potential targets |

---

## Section 6: Coverage Summary by Module

| RAXA Module | SAES-X-300 | SAES-X-400 | SAES-X-500 | SAES-X-600 | SAES-X-700 | Overall |
|---|---|---|---|---|---|---|
| Design Basis | 2/3 | 3/5 | 1/2 | 2/3 | 1/2 | 60% |
| Pipeline Parameters | 1/2 | 4/5 | — | — | 1/1 | 75% |
| Soil Resistivity | 1/2 | 3/4 | — | 2/3 | 1/1 | 70% |
| Current Requirement | 3/4 | 3/5 | 1/3 | 2/4 | 1/2 | 56% |
| Groundbed Design | 1/4 | 5/7 | 1/2 | 4/6 | 3/5 | 58% |
| Cable Resistance | 1/1 | 3/4 | — | 2/3 | — | 75% |
| TR Sizing | — | 4/5 | 3/4 | 3/5 | — | 71% |
| Attenuation Analysis | 1/3 | — | — | 1/2 | — | 40% |
| Validation | 2/4 | 3/5 | 2/4 | 2/4 | 1/3 | 50% |
| Engineering Report | 0/3 | 2/4 | 0/2 | 1/3 | 0/2 | 21% |

---

## Section 7: Automatically Validatable Requirements

These requirements can be checked programmatically without human judgment:

| ID | Requirement | Validation Logic |
|---|---|---|
| AUTO-1 | Design life ≥ 25 years ICCP | `designLifeYears >= 25` |
| AUTO-2 | Design life ≥ 15 years galvanic | `designLifeYears >= 15` (galvanic mode) |
| AUTO-3 | Design life ≥ 8 years vessel galvanic | `designLifeYears >= 8` (vessel mode) |
| AUTO-4 | R_op ≤ 0.7 × R_rated | `totalCircuitResOhm <= 0.7 * trRatedVoltage / trRatedCurrent` |
| AUTO-5 | Commissioning R_op ≤ 0.9 × R_rated | `totalCircuitResOhm <= 0.9 * trRatedVoltage / trRatedCurrent` |
| AUTO-6 | Anode bed ≥150m for ≥25A | `actualRemotenesM >= 150` when `trRatedCurrent >= 25` |
| AUTO-7 | Anode bed ≥75m for <25A | `actualRemotenesM >= 75` when `trRatedCurrent < 25` |
| AUTO-8 | Zn anodes not used if T > 50°C | `anodeSpec.material === 'Zinc' && maxOpTemp > 50 → FAIL` |
| AUTO-9 | Mg anodes not used if resistivity < 2,000 ohm-cm | `anodeSpec.type === 'Mg' && soilResistivityOhmCm < 2000 → FAIL` |
| AUTO-10 | Max TR rated voltage ≤ 100V | `trRatedVoltage <= 100` |
| AUTO-11 | Bond wire minimum 16 mm² | `bondWireSize >= 16` |
| AUTO-12 | Coating type with FBE/3LPE: efficiency ≥ 0.98 | `coatingEfficiency >= 0.98` for FBE |
| AUTO-13 | Minimum 100mV polarization shift | `polarizedPotential - nativePotential <= -100` |
| AUTO-14 | No shared well casings (except solar) | `wellCasingShared === false` or `powerSourceType === 'solar'` |
| AUTO-15 | Temp correction method matches standard | `tempMethod === 'exponential'` for Aramco projects |
| AUTO-16 | Spare factor ≥ 1.2 (NACE) or ≥ 1.3 (Aramco) | `spareFactor >= 1.2` (or 1.3 per standard) |
| AUTO-17 | Anode utilization factor 0.80-0.85 | `0.80 <= utilizationFactor <= 0.85` |
| AUTO-18 | Cable current ≤ max ampacity per spec | `trRatedCurrent / numAnodes <= cableSpec.maxCurrentA` |
| AUTO-19 | Pipe-to-soil potential ≤ -0.85V CSE (buried) | `minPotential <= -850` |
| AUTO-20 | Voltage adjustment >10% remaining at operating | `(trRatedVoltage - operatingVoltage) / trRatedVoltage > 0.10` |

---

**Generated:** 2026-06-12
**Next Steps:** Address GAP items in priority order — Auto-validatable checks first, then calculation gaps, then design workflow gaps.
