# RAXA Pipeline — Unit Consistency Audit

**Date:** 2026-06-12
**Scope:** All engineering calculation inputs, outputs, and display values

---

## Audit Summary

| Category | Status | Notes |
|---|---|---|
| Resistance units | PASS | All use ohm (with Greek Omega) consistently |
| Resistivity units | PASS | ohm-cm used uniformly throughout |
| Current units | PASS | Ampere (A) used consistently |
| Voltage units | PASS | Volt (V) used consistently |
| Length units | PASS | Meter (m) used; km only for pipeline distance |
| Cable size units | PASS | mm squared used consistently |
| Time units | PASS | Years (yrs) for design life |
| Power units | PASS | Watt (W), kVA used correctly |
| Weight units | PASS | kg for anode weight |
| Unitless values | PASS | Factors, efficiencies, percentages displayed correctly |

---

## 1. Detailed Unit Trace

### Resistance (R)
| Location | Field | Unit Displayed | Correct? |
|---|---|---|---|
| calculations.js | groundbedResistanceOhm | | PASS |
| calculations.js | anodeTailParallelOhm | | PASS |
| calculations.js | posMainOhm | | PASS |
| calculations.js | totalCableOhm | | PASS |
| calculations.js | totalCircuitResOhm | | PASS |
| calculations.js | backEMFResOhm | | PASS |
| calculations.js | maxGroundbedResAllowable | | PASS |
| PageGroundbed.jsx | ResultRow label | | PASS |
| PageTRSizing.jsx | ResultRow label | | PASS |
| PageCableResistance.jsx | ResultRow label | | PASS |

### Resistivity (rho)
| Location | Field | Unit Displayed | Correct? |
|---|---|---|---|
| calculations.js | soilResistivityOhmCm (input) | ohm-cm | PASS |
| calculations.js | Internal conversion / 100 | ohm-m (internal) | PASS |
| PageGroundbed.jsx | FieldInput | ohm-cm | PASS |
| PageSoilResistivity.jsx | ResultRow | ohm-cm | PASS |
| constants/index.js | SOIL_CLASSIFICATIONS | ohm-cm | PASS |

### Current (I)
| Location | Field | Unit Displayed | Correct? |
|---|---|---|---|
| calculations.js | requiredCurrentA | A | PASS |
| calculations.js | designCurrentA | A | PASS |
| calculations.js | trRatedCurrent | A DC | PASS |
| calculations.js | acInputCurrentA | A | PASS |
| calculations.js | currentDensityBase | mA/m squared | PASS |
| PageCurrentRequirement.jsx | ResultRow | A | PASS |
| PageTRSizing.jsx | FieldInput | A DC | PASS |

### Voltage (V)
| Location | Field | Unit Displayed | Correct? |
|---|---|---|---|
| calculations.js | trRatedVoltage | V DC | PASS |
| calculations.js | minTRVoltage | V | PASS |
| calculations.js | backEMFVolts | V | PASS |
| PageTRSizing.jsx | FieldInput | V DC | PASS |
| AttenuationPage.jsx | potential fields | mV | PASS |

### Length/Distance
| Location | Field | Unit Displayed | Correct? |
|---|---|---|---|
| calculations.js | activeLengthM | m | PASS |
| calculations.js | totalDrillDepthM | m | PASS |
| calculations.js | pipeline segment lengths | m | PASS |
| calculations.js | cable tail lengths | m | PASS |
| calculations.js | anodeSpacingM | m | PASS |
| calculations.js | startDepthM | m | PASS |
| calculations.js | boreholeDiaM | m | PASS |
| constants/index.js | REMOTENESS_TABLE distances | m | PASS |
| AttenuationPage.jsx | totalLengthKm | km | PASS |
| Pipeline segments | individual lengths | m | PASS |

### Cable Size
| Location | Field | Unit Displayed | Correct? |
|---|---|---|---|
| constants/index.js | CABLE_SPECS.sizeMm2 | mm squared | PASS |
| PageCableResistance.jsx | SelectField | mm squared options | PASS |

### Time
| Location | Field | Unit Displayed | Correct? |
|---|---|---|---|
| calculations.js | designLifeYears | years | PASS |
| calculations.js | targetDesignLifeYears | years | PASS |
| PageGroundbed.jsx | FieldInput target | yrs | PASS |
| PageGroundbed.jsx | ResultRow Design Life | years | PASS |

### Power
| Location | Field | Unit Displayed | Correct? |
|---|---|---|---|
| calculations.js | dcPowerW | W | PASS |
| calculations.js | acInputKVA | kVA | PASS |
| PageTRSizing.jsx | ResultRow DC Power | W | PASS |
| PageTRSizing.jsx | ResultRow AC Input | kVA | PASS |

### Weight/Mass
| Location | Field | Unit Displayed | Correct? |
|---|---|---|---|
| constants/index.js | ANODE_SPECS.weightKg | kg | PASS |
| PageGroundbed.jsx | FormulaCard variable | kg | PASS |

---

## 2. Unit Conversion Audit

| Conversion | Source | Target | Factor | Location | Correct? |
|---|---|---|---|---|---|
| inches to meters | odInches | odM | 0.0254 | calcSurfaceArea() | PASS |
| ohm-cm to ohm-m | soilResistivityOhmCm | rhoOhmM | /100 | All groundbed functions | PASS |
| mA to A | iTemp (mA/m squared) | currentA | /1000 | calcCurrentRequirement() | PASS |
| feet per meter | ftPerM constant | 3.28 | 3.28084 | calcCokeRequirement() | PASS (acceptable) |
| mV to V | potentials in mV | V | /1000 | attenuationEngine.js | PASS |

---

## 3. Display Consistency Issues Found

### ISSUE-1: Unit abbreviations
- **Status:** MINOR
- **Finding:** "yrs" used in some FieldInput labels, "years" in ResultRow labels
- **Recommendation:** Standardize on "years" for display, "yrs" acceptable for compact labels
- **Files:** PageGroundbed.jsx (both forms present)

### ISSUE-2: Ohm symbol rendering
- **Status:** PASS (after enhancement)
- **Finding:** Previously used "Ohm" text in some places; FormulaCard now uses proper symbol
- **Resolution:** All new components use proper symbols

### ISSUE-3: Cable resistance units
- **Status:** PASS
- **Finding:** Cable resistances displayed in ohms but actual values may be milliohm range
- **Note:** Display precision (5-6 decimal places) provides clarity

---

## 4. International System (SI) Compliance

| SI Base/Deerived | Usage | Compliant? |
|---|---|---|
| Meter (m) | Length | Yes |
| Kilogram (kg) | Mass | Yes |
| Ampere (A) | Current | Yes |
| Volt (V) | Potential | Yes |
| Ohm | Resistance | Yes |
| Watt (W) | Power | Yes |
| Square meter (m squared) | Area | Yes |
| Ohm-meter (ohm-m) | Resistivity | Yes (internal) |
| Ohm-centimeter (ohm-cm) | Resistivity | Yes (display, industry convention) |
| mm squared | Cable cross-section | Yes (industry convention) |
| Year | Time | Yes (non-SI but universal in CP) |

---

## 5. Recommendations

1. **Standardize on "years"** over "yrs" for design life display consistency
2. **Add unit tooltips** to FieldInput components explaining unit conversions where applicable
3. **Consider adding unit conversion display** in FormulaCard expandable view (e.g., "5000 ohm-cm = 50 ohm-m")
4. **Maintain current precision levels** — they properly convey the engineering significance

---

**Audit Date:** 2026-06-12
**Auditor:** RAXA Engineering Formula Visibility Project
**Status:** ALL CHECKS PASSED — No critical unit inconsistencies found
