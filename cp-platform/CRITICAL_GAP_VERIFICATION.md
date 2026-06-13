# CRITICAL GAP VERIFICATION REPORT
## Standards-to-Code Traceability Review

**Date:** 2026-06-12
**Methodology:** Each reported critical gap traced to exact code location and exact standard clause.
**Principle:** No code modified. Verification only.

---

## Gap Classification Legend

| Classification | Meaning |
|---|---|
| **CONFIRMED GAP** | Gap is real — code does not implement the standard requirement |
| **PARTIAL GAP** | Requirement partially implemented — either incomplete or limited scope |
| **FALSE POSITIVE** | Requirement is already implemented via different mechanism |
| **NOT APPLICABLE** | Requirement does not apply to the RAXA platform scope |

---

## GAP-C1: Over-Protection Ceiling Not Enforced

| Field | Detail |
|---|---|
| **Standard** | SAES-X-300 Section 6.2.2; SAES-X-500 Section 6.5.3 |
| **Clause Text** | "To avoid overprotection and any risk of HISC... maximum negative potential mentioned in Table 2 of section 6.2 of EN12473 shall be applicable" (SAES-X-300 §6.2.2) |
| **Clause Text** | "The maximum steel-to-electrolyte potential for impressed current systems shall be equal or less negative than -1.20V" (SAES-X-500 §6.5.3) |
| **Code Location** | `src/standards/saudiAramco.js` line 26-36 (protectionCriteria) |
| **Current Implementation** | Saudi Aramco standard defines `basePotentialMvCSE: -850` and `polarizationShiftMv: 100` but has NO `overProtectionLimitMvCSE` field |
| **Existing Field in Other Standards** | ADNOC: `overProtectionLimitMvCSE: -1050` (`src/standards/adnoc.js` line 42); ISO 15589: `overProtectionLimitMvCSE: -1050` (`src/standards/iso15589.js` line 42) |
| **Enforcement Code** | NONE — `overProtectionLimitMvCSE` is never read by any validation, attenuation, or calculation module |
| **SAES-X-400 coverage** | SAES-X-400 (buried pipelines) does not specify an over-protection ceiling for pipelines; it only specifies minimum -0.85V CSE |
| **Required Implementation** | Add `overProtectionLimitMvCSE` to Saudi Aramco standard; add validation check in attenuation/validation modules |
| **Risk Level** | HIGH for marine/vessel (HISC risk); MEDIUM for buried pipelines (risk of coating disbondment) |
| **Confidence Level** | HIGH — gap confirmed by code audit |
| **Classification** | **PARTIAL GAP** — exists in ADNOC/ISO configs but unused; absent from Saudi Aramco config; buried pipeline standard (SAES-X-400) does not require it |
| **Recommendation** | Add `overProtectionLimitMvCSE: -1050` to Saudi Aramco config; wire into attenuation summary check; add vessel-specific -1.20V ceiling per SAES-X-500 |

---

## GAP-C2: MMO Current Density Limits Incorrect

| Field | Detail |
|---|---|
| **Standard** | SAES-X-400 Table 5 |
| **Clause Text** | "Maximum Current Density (mA/cm^2): High Silicon Cast Iron = 0.7; MMO = 7.0 (fresh water), 35.0 (salt water)" |
| **Code Location** | `src/constants/index.js` lines 134-175 (ANODE_SPECS) |
| **Current Implementation** | `HSCI_TA4.maxCurrentDensity: 10.8 A/m^2`; `HSCI_TA2.maxCurrentDensity: 10.8 A/m^2`; `MMO_TUBULAR.maxCurrentDensity: 200 A/m^2` |
| **SAES Required** | HSCI: 7.0 A/m^2 (0.7 mA/cm^2 * 10); MMO fresh: 7.0 A/m^2; MMO salt: 35.0 A/m^2 |
| **Difference** | HSCI: 10.8 vs 7.0 = +54% above SAES limit; MMO: 200 vs 7.0 = +2,757% above SAES fresh limit; MMO: 200 vs 35.0 = +471% above SAES salt limit |
| **Note** | SAES Table 5 notes: "includes utilization factor and effective anode shortening due to end caps." RAXA may be using bare manufacturer ratings without utilization factor applied |
| **Is maxCurrentDensity used?** | Yes — checked in `src/store/projectStore.js` line 558: `operatingCurrentDensity = (designCurrent / finalLength) * 1000` |
| **Risk Level** | CRITICAL — designs using MMO anodes could exceed SAES limits by 5-28x |
| **Confidence Level** | HIGH |
| **Classification** | **CONFIRMED GAP** — both HSCI and MMO limits exceed SAES-X-400 Table 5 values |
| **Recommendation** | Correct ANODE_SPECS values to Table 5 values; add environment-specific MMO limits (fresh/salt water selector) |

---

## GAP-C3: Back EMF Formula Inconsistency

| Field | Detail |
|---|---|
| **Standard** | SAES-X-600 Section 5.2.5; SAES-X-400 Section 7.5.5 |
| **Clause Text** | "Effective resistance caused by +0.8 volts anode bed back emf (for HSCI in coke breeze) plus the structure back emf of -1.2 volts = 2.0 volts total... Remf=(0.8v + back emf) / Irated" (SAES-X-600 §5.2.5) |
| **Clause Text** | "When using Remf to calculate the maximum allowable anode bed resistance to provide 70% of Rrated, the value of Remf must be multiplied by 0.7" (SAES-X-400 §7.5.5) |
| **Code Location (Primary)** | `src/engine/modules/calculations.js` line 353: `const R_emf = trRatedCurrent > 0 ? (2 * backEMFVolts) / trRatedCurrent : 0` |
| **Code Location (Alternate)** | `src/engine/modules/resistivityEngine.js` line 665: `(RESISTIVITY_CONSTANTS.TR_EFFICIENCY * ((trVoltageRatingV - backEmfV) / trCurrentRatingA))` |
| **Default backEMF value** | `src/store/projectStore.js` line 79: `backEMF: 2` (represents total 0.8V+1.2V=2.0V) |
| **RAXA computation** | R_emf = 2 * 2.0 / I_rated = **4.0 / I_rated** |
| **SAES computation** | R_emf = (0.8 + 1.2) / I_rated = **2.0 / I_rated** |
| **Difference** | RAXA formula produces R_emf value **2x higher** than SAES formula when backEMFVolts=2.0 |
| **Note on alternate formula** | `resistivityEngine.js` uses `(V_rated - backEMF) / I_rated * efficiency` — this is a completely different approach (not the R_emf formula) |
| **Risk Level** | HIGH — 2x R_emf overestimation affects total circuit resistance, TR voltage sizing |
| **Confidence Level** | HIGH — both formulas verified, discrepancy confirmed |
| **Classification** | **CONFIRMED GAP** — RAXA uses `2*V_emf/I_rated` vs SAES `(0.8+back_emf)/I_rated` |
| **Recommendation** | Align with SAES-X-600: `R_emf = (0.8 + structureBackEmf) / I_rated` where structureBackEmf defaults to 1.2V for buried pipelines |

---

## GAP-C4: Well Casing Field-Specific Criteria Missing

| Field | Detail |
|---|---|
| **Standard** | SAES-X-700 Tables 1A, 1B, 1C; Section 6.4.3 |
| **Clause Text** | "The protection criteria for commissioning and monitoring are detailed in Tables 1A, 1B, and 1C" (SAES-X-700 §6.4.3) |
| **Code Location** | NONE — no well casing module exists |
| **Current Implementation** | The RAXA platform has NO well casing CP design module. Well casings appear only as BOM item "Wellhead Completion Assembly" in `src/engine/rules/bomEngine.js` line 146 |
| **Existing Related Code** | Protection criteria only for buried pipelines (-850mV CSE) in all standards; no field-specific criteria |
| **Risk Level** | CRITICAL — well casing designs cannot be verified against SAES-X-700 |
| **Confidence Level** | HIGH |
| **Classification** | **CONFIRMED GAP** — well casing CP design is completely absent from the platform |
| **Recommendation** | Add well casing module only if RAXA scope includes well casing CP (per SAES-X-700 scope). If not in scope, mark as NOT APPLICABLE |

---

## GAP-C5: Anode Material Temperature Restrictions

| Field | Detail |
|---|---|
| **Standard** | SAES-X-500 Sections 6.6.3, 6.6.4 |
| **Clause Text** | "Magnesium anodes shall not be used if the electrolyte resistivity at normal operating temperature is less than 2,000 ohm-cm" (§6.6.3) |
| **Clause Text** | "Zinc anodes shall not be used in environments where temperature exceeds 50C, except for HTZ" (§6.6.4) |
| **Code Location** | NO temperature-based anode restriction code exists |
| **Current Implementation** | Anode selection is manual via SelectField in PageGroundbed — no automatic restrictions based on temperature or resistivity |
| **Existing Validation** | `src/engine/modules/validation.js` validates anode specs (weight, consumption rate) but NOT temperature/resistivity restrictions |
| **Is it applicable?** | SAES-X-500 applies to internal surfaces of vessels/tanks. RAXA has tank/vessel workspace mode but anode restrictions are not checked |
| **Risk Level** | HIGH for tank/vessel CP — Zn anodes at >50C will fail prematurely |
| **Confidence Level** | HIGH |
| **Classification** | **CONFIRMED GAP** — applicable when tank/vessel mode is active |
| **Recommendation** | Add validation rules: (1) forbid Zn anodes when max operating temp > 50C (unless HTZ), (2) forbid Mg anodes when soil resistivity < 2,000 ohm-cm |

---

## GAP-C6: Maximum TR Voltage 100V Not Enforced

| Field | Detail |
|---|---|
| **Standard** | SAES-X-500 Section 6.8.4 |
| **Clause Text** | "DC power supplies shall have a maximum rated output voltage of no greater than 100 volts" |
| **Code Location** | `src/pages/PageTRSizing.jsx` lines 140-148 (FieldInput for Rated DC Voltage) |
| **Current Implementation** | `<FieldInput label="Rated DC Voltage" value={tr.ratedVoltage} unit="V DC" min={0} ... />` — has `min={0}` but **NO max={100}** |
| **Validation** | `src/engine/modules/validation.js` exports `TransformerRectifierSchema` with `ratedVoltage: z.number().positive('TR voltage must be positive')` — positive constraint only, no 100V max |
| **Is it applicable?** | SAES-X-500 applies to vessels/tanks. SAES-X-400 (pipelines) and SAES-X-600 (plant) do NOT specify a 100V maximum. However, this is a common safety limit |
| **Risk Level** | MEDIUM — only applicable in vessel/tank context per SAES-X-500; not in pipeline ICCP |
| **Confidence Level** | HIGH |
| **Classification** | **CONFIRMED GAP** — only applicable in tank/vessel/well mode (SAES-X-500/700 scope) |
| **Recommendation** | Add `max={100}` to FieldInput when workspace mode is tank/vessel; add Zod validation `ratedVoltage.max(100)` conditionally |

---

## GAP-C7: Shared Well Casing Prohibition

| Field | Detail |
|---|---|
| **Standard** | SAES-X-700 Section 6.1.1 |
| **Clause Text** | "Shared well casings are not allowed except for solar systems especially bare and for multiple wells..." |
| **Code Location** | NONE — no well casing design module exists |
| **Current Implementation** | RAXA has NO well casing module at all. No shared casing prohibition check exists |
| **Risk Level** | HIGH if well casing design is in scope; NOT APPLICABLE if well casing CP is out of scope |
| **Confidence Level** | HIGH |
| **Classification** | **CONFIRMED GAP** — but only if well casing CP is in scope |
| **Recommendation** | Add shared casing prohibition check IF well casing module is built; otherwise mark as NOT APPLICABLE to current platform scope |

---

## GAP-C8: Bond Wire Minimum 16 mm^2

| Field | Detail |
|---|---|
| **Standard** | SAES-X-400 Section 6.10.1.4; SAES-X-600 Section 5.2.12 |
| **Clause Text** | "The minimum bond conductor size shall be 16 mm^2 (#6 AWG). Bond wire size should be based on the bond current and attenuation." (SAES-X-400 §6.10.1.4) |
| **Code Location** | NONE — no bonding design module exists |
| **Current Implementation** | RAXA has NO bonding or bond wire sizing code at all |
| **Cable Specs** | `CABLE_SPECS` starts at 16mm^2 which is the minimum bond size, but there is no validation rule that checks bonding cable sizing |
| **Risk Level** | MEDIUM — bonding is an installation detail often handled outside design software |
| **Confidence Level** | HIGH |
| **Classification** | **CONFIRMED GAP** — bonding design module absent |
| **Recommendation** | Add bonding design sub-module with minimum 16mm^2 validator; extend cable specs to support bond cable designation |

---

## Summary Table

| Gap ID | Description | Classification | Risk | Confidence | Action Priority |
|---|---|---|---|---|---|
| GAP-C1 | Over-protection ceiling | PARTIAL GAP | HIGH (marine) / MEDIUM (pipeline) | HIGH | Phase 1 |
| GAP-C2 | MMO/HSCI current density limits | CONFIRMED GAP | CRITICAL | HIGH | Phase 1 |
| GAP-C3 | Back EMF formula | CONFIRMED GAP | HIGH | HIGH | Phase 2 |
| GAP-C4 | Well casing criteria | CONFIRMED GAP (scope-dependent) | CRITICAL (if in scope) | HIGH | Phase 1 (if in scope) |
| GAP-C5 | Anode material temp restrictions | CONFIRMED GAP | HIGH (tank/vessel) | HIGH | Phase 1 |
| GAP-C6 | TR max voltage 100V | CONFIRMED GAP (scope-dependent) | MEDIUM | HIGH | Phase 1 |
| GAP-C7 | Shared well casing prohibition | CONFIRMED GAP (scope-dependent) | HIGH (if in scope) | HIGH | Phase 1 (if in scope) |
| GAP-C8 | Bond wire minimum 16mm^2 | CONFIRMED GAP | MEDIUM | HIGH | Phase 1 |

---

## False Positive Check: All 8 gaps verified

| Gap | False Positive? | Reason |
|---|---|---|
| GAP-C1 | No | Field exists in configs but is NEVER read by any validation code |
| GAP-C2 | No | ANODE_SPECS values demonstrably differ from SAES-X-400 Table 5 |
| GAP-C3 | No | Formula mismatch confirmed: 2*V_emf vs (0.8+back_emf) |
| GAP-C4 | No | No well casing module exists in platform |
| GAP-C5 | No | No temperature-based anode restriction logic exists |
| GAP-C6 | No | No 100V max constraint in FieldInput or Zod schema |
| GAP-C7 | No | No shared casing check exists |
| GAP-C8 | No | No bonding design module exists |

**Verdict: Zero false positives. All 8 gaps are either CONFIRMED or PARTIAL.**

---

**Generated:** 2026-06-12
**Reviewer:** RAXA Standards-to-Code Verification
**Status:** COMPLETE — all critical gaps verified against exact code and standard clauses
