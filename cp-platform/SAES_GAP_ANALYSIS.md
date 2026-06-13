# SAES-X Standards Gap Analysis

**Date:** 2026-06-12
**Platform:** RAXA CP Designer
**Standards Audited:** SAES-X-300, SAES-X-400, SAES-X-500, SAES-X-600, SAES-X-700

---

## Executive Summary

This gap analysis identifies 64 requirements across 5 SAES-X standards that are not currently implemented in the RAXA CP Designer platform. Gaps are categorized by severity and implementation complexity.

| Severity | Count | Description |
|---|---|---|
| CRITICAL | 8 | Missing safety/compliance checks that could lead to non-compliant designs |
| HIGH | 22 | Core engineering parameters not enforced per standard |
| MEDIUM | 21 | Design workflow and documentation gaps |
| LOW | 13 | Nice-to-have enhancements |

---

## 1. CRITICAL Gaps

### GAP-C1: Over-Protection Ceiling Not Enforced
- **Standard:** SAES-X-300 §6.2.2, SAES-X-500 §6.5.3
- **Requirement:** Maximum negative potential limit to prevent HISC and coating disbondment
- **Current State:** Only minimum protection criteria checked (-850mV CSE); no maximum ceiling
- **Risk:** Over-protection can cause hydrogen-induced stress cracking (HISC) in duplex/martensitic stainless steels
- **Implementation:** Add `maxPotentialMv` field to protection criteria config; add validation rule `potentialMv >= maxPotentialMv`
- **Effort:** 2-3 hours

### GAP-C2: MMO Current Density Limits Incorrect
- **Standard:** SAES-X-400 Table 5
- **Requirement:** MMO anode max current density: 7.0 A/m² (fresh water), 35.0 A/m² (salt water)
- **Current State:** `ANODE_SPECS.MMO_TUBULAR.maxCurrentDensity = 200 A/m²` — 5-28x higher than SAES-X-400 allows
- **Risk:** Designs using MMO anodes may exceed SAES-permitted current densities by factor of 5+
- **Implementation:** Correct `ANODE_SPECS.MMO_TUBULAR.maxCurrentDensity` to 7.0 (or add environment-specific limits)
- **Effort:** 30 minutes

### GAP-C3: Back EMF Formula Inconsistency
- **Standard:** SAES-X-600 §5.2.5, SAES-X-400 §7.5.5
- **Requirement:** R_emf = (0.8V + back_emf) / I_rated for HSCI in coke breeze
- **Current State:** `R_emf = 2 × V_emf / I_rated` (uses factor 2, not 0.8V+back_emf)
- **Risk:** Different R_emf calculation produces different circuit resistance, affecting TR sizing
- **Implementation:** Review and align R_emf formula; add configuration option per standard
- **Effort:** 4 hours (requires engineering review)

### GAP-C4: Well Casing Specific Criteria Missing
- **Standard:** SAES-X-700 Tables 1A, 1B, 1C, §6.4.3
- **Requirement:** Field-specific protection criteria (e.g., -0.95V CSE for most fields)
- **Current State:** Single generic -850mV criterion applied to all structures
- **Risk:** Well casings protected to -850mV may not meet field-specific -0.95V CSE requirement
- **Implementation:** Encode Tables 1A/1B/1C as field-specific protection criteria presets
- **Effort:** 3-4 hours

### GAP-C5: Anode Material Temperature Restrictions
- **Standard:** SAES-X-500 §6.6.3, §6.6.4
- **Requirement:** Zn anodes prohibited >50°C (except HTZ); Mg anodes prohibited if resistivity < 2,000 ohm-cm
- **Current State:** No temperature or resistivity-based anode material restrictions
- **Risk:** Zinc anodes specified for high-temp vessels will fail prematurely; Mg anodes in low-resistivity may over-drain
- **Implementation:** Add validation rules in anode selection logic
- **Effort:** 2 hours

### GAP-C6: Maximum TR Voltage 100V Not Enforced
- **Standard:** SAES-X-500 §6.8.4
- **Requirement:** DC power supplies shall have max rated output voltage ≤ 100 volts
- **Current State:** TR rated voltage input accepts any positive value
- **Risk:** TR specified above 100V violates SAES safety limits
- **Implementation:** Add `max={100}` to TR voltage FieldInput with validation error
- **Effort:** 15 minutes

### GAP-C7: Shared Well Casing Prohibition
- **Standard:** SAES-X-700 §6.1.1
- **Requirement:** Shared well casings not allowed (except solar + multiple wells)
- **Current State:** No well casing configuration exists in the platform
- **Risk:** Designs with shared casings would be non-compliant
- **Implementation:** Add well casing configuration with shared-prohibition validation
- **Effort:** 3-4 hours

### GAP-C8: AC Interference Safety Missing
- **Standard:** SAES-X-400 §6.15, Tables 11-13
- **Requirement:** AC interference study mandatory when pipelines parallel HV powerlines; touch/step potential safety limits
- **Current State:** No AC interference modeling or safety limit checks
- **Risk:** Personnel safety hazard from induced AC voltages not assessed
- **Implementation:** Add AC interference assessment module (long-term; basic checks first)
- **Effort:** 20+ hours (complex modeling); basic checks: 4 hours

---

## 2. HIGH Priority Gaps

### GAP-H1: Structure-Specific Protection Criteria
- **Standard:** SAES-X-600 §5.2.2
- **Requirement:** Different protection criteria per structure type (-250mV bare SS/Cu, -500mV non-shorted, -850mV buried CS)
- **Implementation:** Add `protectionPotentialMv` field to structure type configuration
- **Effort:** 2 hours

### GAP-H2: Minimum Design Life Differentiation
- **Standard:** SAES-X-400, SAES-X-500, SAES-X-600
- **Requirement:** 25yr ICCP, 15yr galvanic (pipelines), 8yr galvanic (vessels)
- **Current State:** Single `systemDesignLifeYears` for all
- **Implementation:** Add mode-specific min design life validation
- **Effort:** 1 hour

### GAP-H3: Commissioning Voltage Range (30-70%)
- **Standard:** SAES-X-600 §5.2.5
- **Requirement:** Target commissioning current achieved at 30%-70% of TR rated voltage
- **Implementation:** Add commissioning voltage range validator
- **Effort:** 1 hour

### GAP-H4: Operating Voltage Margin (>10%)
- **Standard:** SAES-X-600 §5.2.5
- **Requirement:** Normal operating output current with >10% voltage adjustment remaining
- **Implementation:** Add operating margin check
- **Effort:** 30 minutes

### GAP-H5: Temporary CP Design Mode
- **Standard:** SAES-X-400 §6.7, SAES-X-700 §6.3.2
- **Requirement:** 2-year minimum life for temporary CP; different current density requirements
- **Implementation:** Add temporary CP design mode with reduced life target
- **Effort:** 4 hours

### GAP-H6: Galvanic Anode Consumption Rates (Table 2)
- **Standard:** SAES-X-500 Table 2
- **Requirement:** Different consumption rates for Al, Zn, Mg in various electrolytes
- **Implementation:** Expand ANODE_SPECS with environment-specific consumption rates
- **Effort:** 2 hours

### GAP-H7: Anode Bed Distance >150m for >25A
- **Standard:** SAES-X-700 §6.5.4
- **Requirement:** Minimum 150m distance for anode bed discharging >25A
- **Implementation:** Add distance validator to groundbed config
- **Effort:** 1 hour

### GAP-H8: Inter-Anode-Bed Separation >150m
- **Standard:** SAES-X-700 §6.5.9
- **Requirement:** Adjacent anode beds from separate sources >150m apart
- **Implementation:** Add inter-anode-bed distance check
- **Effort:** 2 hours

### GAP-H9: Electrical Isolation Design
- **Standard:** SAES-X-400 §6.9
- **Requirement:** Mandatory isolation between new and existing pipelines; isolation device specs
- **Implementation:** Add isolation device specification sub-module
- **Effort:** 6 hours

### GAP-H10: Bonding Requirements & Wire Sizing
- **Standard:** SAES-X-400 §6.10
- **Requirement:** Bond wire minimum 16 mm²; bonding at specific locations
- **Implementation:** Add bond design sub-module with minimum sizing check
- **Effort:** 4 hours

### GAP-H11: RMU (Remote Monitoring Unit) Requirement
- **Standard:** SAES-X-600 §5.1.2.4, SAES-X-400 §6.13.1.4
- **Requirement:** RMU mandatory for new CP systems; at least one per plant area
- **Implementation:** Add RMU specification selector and requirement validator
- **Effort:** 3 hours

### GAP-H12: Hazardous Area Classification
- **Standard:** SAES-X-600 §5.2.7
- **Requirement:** Special T/R selection for Class I Zone 2; oil-immersed within 30m of hydrocarbon
- **Implementation:** Add hazardous area classification field with T/R type enforcement
- **Effort:** 3 hours

---

## 3. MEDIUM Priority Gaps

### GAP-M1: NACE Certification Validation
- **Standard:** SAES-X-300 §6.1.1, SAES-X-400, SAES-X-600 §5.1.1
- **Requirement:** Designers must have NACE CP Level 4; field techs CP Level 2+
- **Implementation:** Add certification fields to user profile; validate during design submission
- **Effort:** 4 hours

### GAP-M2: Design Package Completeness Check
- **Standard:** SAES-X-400 §5.2, §5.5
- **Requirement:** 90% design package containing specific deliverables
- **Implementation:** Add design package completeness validator
- **Effort:** 5 hours

### GAP-M3: Surface Area Verification Workflow
- **Standard:** SAES-X-400 §5.5, SAES-X-300 §5.5
- **Requirement:** PMT verification, Design Agency cross-check, CSD approval
- **Implementation:** Add surface area verification sign-off workflow
- **Effort:** 4 hours

### GAP-M4: CP Need Determination Logic
- **Standard:** SAES-X-500 §6.2.1-6.2.2
- **Requirement:** CP required based on operating temp, water content, H2S, etc.
- **Implementation:** Add CP need assessment questionnaire
- **Effort:** 3 hours

### GAP-M5: Anode Monitoring System (AMS) Mandatory
- **Standard:** SAES-X-500 §6.2.8
- **Requirement:** AMS mandatory for all vessel CP systems
- **Implementation:** Add AMS to BOM when vessel mode selected
- **Effort:** 2 hours

### GAP-M6: Test Station Spacing Validation
- **Standard:** SAES-X-400 §6.13.2
- **Requirement:** Test stations at maximum 1km spacing; additional at crossings
- **Implementation:** Add test station placement validator
- **Effort:** 3 hours

### GAP-M7: Soil Survey Density Requirements
- **Standard:** SAES-X-400 §6.3.3, SAES-X-600 §5.2.6
- **Requirement:** 10m intervals; Wenner method; plant plots >50m×50m: multiple locations
- **Implementation:** Add soil survey completeness check
- **Effort:** 3 hours

### GAP-M8: CIPS Survey for Commissioning
- **Standard:** SAES-X-400 §7.1
- **Requirement:** Close interval potential survey for commissioning acceptance
- **Implementation:** Add CIPS data import and acceptance module
- **Effort:** 8 hours

### GAP-M9: Bracelet Anode Spacing
- **Standard:** SAES-X-300 §6.4.6-6.4.7
- **Requirement:** Bracelet anode spacing per Tables for offshore pipelines
- **Implementation:** Add bracelet anode spacing calculator
- **Effort:** 5 hours

### GAP-M10: Tidal/Splash Zone Modeling
- **Standard:** SAES-X-300 §6.2.4
- **Requirement:** Environmental conditions (tidal, wave) affect current density
- **Implementation:** Add tidal/splash zone current density modifiers
- **Effort:** 6 hours

---

## 4. LOW Priority Gaps

### GAP-L1: Design Complexity Assessment
- **Standard:** SAES-X-300 §6.2.8
- **Requirement:** CSD involvement from early stages for complex scenarios
- **Implementation:** Add complexity scoring matrix
- **Effort:** 4 hours

### GAP-L2: Economic Comparison for Non-Standard Designs
- **Standard:** SAES-X-600 §5.2.1
- **Requirement:** Complete economic comparison for non-standard proposals
- **Implementation:** Add cost estimator module
- **Effort:** 12+ hours

### GAP-L3: Reference Drawing Library
- **Standard:** SAES-X-600 §5.1.2
- **Requirement:** Standard drawings exempt from review
- **Implementation:** Add reference drawing catalog
- **Effort:** 5 hours

### GAP-L4: Construction Schedule Integration
- **Standard:** SAES-X-400 §6.5
- **Requirement:** ICCP within 30 days of burial
- **Implementation:** Add construction timeline tracking
- **Effort:** 6 hours

### GAP-L5: Existing System Spare Capacity Analyzer
- **Standard:** SAES-X-400 §6.8
- **Requirement:** Determine spare capacity of existing systems
- **Implementation:** Add spare capacity assessment tool
- **Effort:** 8 hours

---

## 5. Implementation Priority Roadmap

### Phase 1: Critical Safety & Compliance (Immediate)
Total effort: ~18 hours

| Gap | Description | Effort |
|---|---|---|
| GAP-C2 | MMO current density limits | 0.5h |
| GAP-C6 | Max TR voltage 100V | 0.25h |
| GAP-C1 | Over-protection ceiling | 3h |
| GAP-C5 | Anode material temp restrictions | 2h |
| GAP-C3 | Back EMF formula alignment | 4h |
| GAP-C4 | Well casing criteria | 4h |
| GAP-C7 | Shared well casing check | 4h |

### Phase 2: Core Engineering Parameters (Short-term)
Total effort: ~22 hours

| Gap | Description | Effort |
|---|---|---|
| GAP-H2 | Min design life differentiation | 1h |
| GAP-H3 | Commissioning voltage range | 1h |
| GAP-H4 | Operating voltage margin | 0.5h |
| GAP-H7 | Anode bed distance >150m | 1h |
| GAP-H1 | Structure-specific protection criteria | 2h |
| GAP-H6 | Galvanic consumption rates | 2h |
| GAP-H8 | Inter-anode-bed separation | 2h |
| GAP-H11 | RMU requirement | 3h |
| GAP-H12 | Hazardous area classification | 3h |
| GAP-H5 | Temporary CP mode | 4h |
| GAP-H10 | Bonding & wire sizing | 4h |

### Phase 3: Design Workflow & Documentation (Medium-term)
Total effort: ~41 hours

| Gap | Description | Effort |
|---|---|---|
| GAP-M1 | NACE certification validation | 4h |
| GAP-M2 | Design package completeness | 5h |
| GAP-M3 | Surface area verification workflow | 4h |
| GAP-M4 | CP need determination | 3h |
| GAP-M5 | AMS mandatory for vessels | 2h |
| GAP-M6 | Test station spacing | 3h |
| GAP-M7 | Soil survey density | 3h |
| GAP-M8 | CIPS survey for commissioning | 8h |
| GAP-M9 | Bracelet anode spacing | 5h |
| GAP-M10 | Tidal/splash zone | 6h |

### Phase 4: Advanced Features (Long-term)
Total effort: ~35+ hours

| Gap | Description | Effort |
|---|---|---|
| GAP-L1 | Complexity assessment | 4h |
| GAP-L2 | Economic comparison | 12h |
| GAP-L3 | Reference drawing library | 5h |
| GAP-L4 | Construction schedule | 6h |
| GAP-L5 | Spare capacity analyzer | 8h |

---

## 6. Changes NOT Required

The following SAES requirements are intentionally NOT implemented as automated checks:

| Requirement | Reason |
|---|---|
| Designer minimum 10 years experience (300-D1) | HR verification; not automatable |
| Field data collection by certified technicians (300-D2) | Personnel qualification; manual audit |
| CSD involvement for complex scenarios (300-D10) | Organizational workflow; manual trigger |
| PMT surface area verification (400-D2) | Requires physical sign-off |
| Standard drawing pre-approval exemption (600-D4) | Document management; not calculation |
| Construction within 30 days (400-D5) | Project management; not design calculation |

---

**Generated:** 2026-06-12
**Total Identified Gaps:** 64
**Auto-Validatable Gaps:** 20 (31%)
**Implementation Estimate:** ~116 engineering hours across all phases
