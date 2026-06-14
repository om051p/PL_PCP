# Engineering Traceability Layer Report — M5a

## Overview

A mathematical traceability and provenance auditing system has been implemented in the RAXA Cathodic Protection (CP) platform. 

Every engineered output displayed in the user interface or generated in reports can now be traced back to its underlying equations, standards references (e.g., SAES-X-400, NACE SP0169), and the exact set of inputs used at the moment of calculation. 

This is achieved **non-invasively** with **zero modifications** to the core calculation engines or equations.

---

## Architectural Layout

The traceability system is structured as a separate module under [src/engine/trace/](file:///home/rworld_pop/projects/raxa/cp-platform/src/engine/trace/):

1. **[formulaRegistry.js](file:///home/rworld_pop/projects/raxa/cp-platform/src/engine/trace/formulaRegistry.js)**: A static metadata registry mapping every calculation component to its formal mathematical equation (standard notation & LaTeX), standard reference (SAES/NACE/ISO), clause reference, variables registry, and engineering assumptions.
2. **[inputAuditEngine.js](file:///home/rworld_pop/projects/raxa/cp-platform/src/engine/trace/inputAuditEngine.js)**: A capture utility that deep-freezes a complete snapshot of all design inputs (resistivity, anode spec, cabling, TR ratings, pipeline dimensions) immediately before calculation execution.
3. **[calculationTraceEngine.js](file:///home/rworld_pop/projects/raxa/cp-platform/src/engine/trace/calculationTraceEngine.js)**: Enriches raw engine results with step-by-step substitution strings, intermediate calculations, and validation checks.

---

## Technical Details

### 1. Frozen Input Snapshots

To prevent downstream mutations or inputs changing out from under a historical calculation, `inputAuditEngine.js` performs a recursive `deepFreeze` on all relevant properties of the active station and project design basis:

```javascript
export function captureInputAudit(station, project) {
  return deepFreeze({
    capturedAt: new Date().toISOString(),
    stationId: station.id,
    standardId: project?.designBasis?.designStandard ?? 'saudiAramco',
    inputs: {
      soilResistivityOhmCm: station.soilResistivityOhmCm,
      proposedAnodes: station.proposedAnodes,
      // ... deep-copied and frozen specs, cables, and pipeline segments
    }
  });
}
```

### 2. Trace Step Schema

For each of the main engineering steps, a `TraceStep` object is compiled dynamically:

* **Level 1 (Summary)**: Represents the immediate result, the standard reference, and the key inputs used.
* **Level 2 (Detail)**: Contains the exact mathematical expression with substituted values, a list of intermediate values (e.g., single-anode resistance before parallel reduction), assumptions, references, and engineering notes.

```json
{
  "stepId": "GROUNDBED_RESISTANCE",
  "label": "Groundbed Resistance",
  "formulaId": "DWIGHT_DEEPWELL",
  "summary": {
    "output": { "name": "groundbedResistanceOhm", "value": 0.1101, "unit": "Ω" },
    "formulaName": "Dwight Equation — Deepwell Groundbed",
    "standard": "SAES-X-400 Section 7.3",
    "keyInputs": [
      { "symbol": "ρ", "label": "Soil Resistivity", "value": 350, "unit": "Ω·cm" },
      { "symbol": "n", "label": "Number of Anodes", "value": 9, "unit": "" }
    ],
    "validation": { "criterion": "< 5.0 Ω", "status": "pass" }
  },
  "detail": {
    "substitution": "R_g = (350 / (2π · 31.17)) · (ln(8 · 31.17 / 0.25) - 1 + 31.17 / (4 · 25.5))",
    "intermediates": [
      { "label": "Soil resistivity (SI)", "value": 3.5, "unit": "Ω·m" },
      { "label": "Active length", "value": 31.17, "unit": "m" }
    ]
  }
}
```

---

## User Interface Integration

The UI utilizes a **Two-Level Accordion Panel** implemented in `TracePanel.jsx`. This component keeps the visual display clean and uncluttered by default, but allows full mathematical inspection on demand:

* **Level 1 (Always Visible)**: Shows the engineering metric, the formula name, standard references, critical parameters, and compliance status.
* **Level 2 (Expand Details)**: Discloses intermediate values, complete variable substitution equations, assumptions, and footnotes.

This panel has been successfully integrated into the following calculation view pages:
* **[PageGroundbed.jsx](file:///home/rworld_pop/projects/raxa/cp-platform/src/pages/PageGroundbed.jsx)** (Resistance & Anode Design Life)
* **[PageCurrentRequirement.jsx](file:///home/rworld_pop/projects/raxa/cp-platform/src/pages/PageCurrentRequirement.jsx)** (Surface Area & Temp-Corrected Current Demand)
* **[PageCableResistance.jsx](file:///home/rworld_pop/projects/raxa/cp-platform/src/pages/PageCableResistance.jsx)** (Anode Tails & Series Conductor Resistance)
* **[PageTRSizing.jsx](file:///home/rworld_pop/projects/raxa/cp-platform/src/pages/PageTRSizing.jsx)** (Circuit Loop Resistance & Minimum Rectifier Voltage)

---

## Verification

* **Unit Tests**: Coverage has been verified in [calculationTraceEngine.test.js](file:///home/rworld_pop/projects/raxa/cp-platform/src/engine/trace/calculationTraceEngine.test.js) (testing registry mappings, deep-freezing helpers, and tracing step enrichment).
* **Compliance**: Preserves existing attenuation formulas and calculations with 100% precision.
