# RAXA — Sensitivity Module Report

**Date:** 2026-06-13
**Branch:** `feat/phase-c-motion`
**Phase:** 4 of forward roadmap (`.kilo/plans/forward-roadmap.md`)
**Status:** ✓ Complete — read-only sensitivity engine + 3 visualizations + dedicated page

---

## TL;DR

- **Read-only** — never modifies inputs, never mutates state
- **Three visualizations** — Tornado, Sweep, Radar
- **Three engine functions** — `computeTornado`, `computeSweep`, `computeScenarioComparison`
- **15 new tests** — all pass
- **617 → 632 tests** (+15 sensitivity tests, no regressions)
- **Build clean**
- **One new page** — `/sensitivity` (engineer role)
- **No formula changes** — sensitivity is a meta-analysis on top of existing engine
- **No new dependencies** — uses existing Recharts + Framer Motion + lucide-react

---

## 1. Architecture

```
┌──────────────────────────┐
│  PageSensitivity.jsx     │  ← UI host (config + layout)
└────────────┬─────────────┘
             │ calls
             ▼
┌──────────────────────────┐
│  engine/sensitivity/     │  ← Pure functions (read-only)
│   • computeTornado       │
│   • computeSweep         │
│   • computeScenarioComp. │
└────────────┬─────────────┘
             │ uses
             ▼
┌──────────────────────────┐
│  runStationCalculations  │  ← Existing engine (untouched)
└────────────┬─────────────┘
             │ reads
             ▼
┌──────────────────────────┐
│  inputLinkRegistry       │  ← Phase 3 — provides available inputs
└──────────────────────────┘
```

Visualizations consume the engine output:
- `SensitivityTornado` ← `computeTornado`
- `SensitivitySweep`  ← `computeSweep`
- `SensitivityRadar`  ← `computeScenarioComparison`

---

## 2. Engine API

### 2.1 `computeTornado(station, life, project, outputId, inputs?, pct?)`
Returns rank-ordered impact of each input on a chosen output.

**Returns:**
```javascript
{
  output: { id, label, unit },
  base: number,                  // base output value
  rows: [
    {
      id: 'soilResistivityOhmCm',
      label: 'Soil Resistivity (ρ)',
      base: 361,                 // base input value
      lowValue, highValue,       // perturbed input values
      low, high,                 // resulting output values
      deltaLowPct, deltaHighPct, // % change
      range,                     // |high - low|
    },
    ...
  ],
  perturbationPct: 10,
}
```

**Default inputs (10):** `soilResistivityOhmCm`, `backEmfV`, `structureResistanceOhm`, `trEfficiencyPct`, `cokeContingencyPct`, `systemDesignLifeYears`, `groundbed.anodeLengthM`, `groundbed.boreholeDiaM`, `groundbed.startDepthM`, `proposedAnodes`.

**Default outputs (6):** `groundbedResistanceOhm`, `totalCircuitResistanceOhm`, `minTRVoltage`, `designLifeYears`, `cokeBagsWithContingency`, `requiredCurrentA`.

### 2.2 `computeSweep(station, life, project, inputId, [min, max], samples, outputIds?)`
One-at-a-time sweep of a single input across a range.

**Returns:**
```javascript
{
  input: { id, label, unit },
  range: [min, max],
  samples: 15,
  data: [
    { x: 100, results: { groundbedResistanceOhm: ..., minTRVoltage: ... } },
    { x: 750, results: { ... } },
    ...
  ],
  outputs: [{ id, label, unit }, ...],
}
```

### 2.3 `computeScenarioComparison(scenarios, outputIds?)`
Compares a list of named scenarios on multiple outputs.

**Returns:**
```javascript
{
  scenarios: [
    { name: 'Current', results: { ... } },
    { name: '+3 anodes', results: { ... } },
    ...
  ],
  outputs: [{ id, label, unit }, ...],
}
```

### 2.4 Helpers
- `getAvailableInputs()` — list of perturble inputs
- `getAvailableOutputs()` — list of observable outputs

---

## 3. Visualizations

### 3.1 `SensitivityTornado` (SVG)
- Bar chart, rows rank-ordered by range
- Each row shows the impact of −X% (left, blue) and +X% (right, amber) perturbation
- Color-coded: green = output decreases, red = output increases
- Click row to drill down (future enhancement)

### 3.2 `SensitivitySweep` (Recharts LineChart)
- X-axis: input value (e.g., ρ 100-10000 Ω·cm)
- Y-axis: output value
- Multi-series: show multiple outputs simultaneously
- Tooltips + legend

### 3.3 `SensitivityRadar` (Recharts RadarChart)
- Spider chart with one axis per output
- Each scenario is a colored polygon
- Values are % deviation from the first (baseline) scenario
- Easy visual comparison of trade-offs

---

## 4. UI: `PageSensitivity`

**Route:** `/sensitivity` (engineer role required)
**Navigation:** Sidebar → DESIGN REVIEW → Sensitivity Analysis

Layout:
1. **Configuration** — station picker, output selector, perturbation %
2. **Tornado Diagram** — large card with the SVG chart
3. **One-At-A-Time Sweep** — config + line chart + output checkboxes
4. **Scenario Comparison** — radar chart

**Default scenarios** for the radar:
- Current (baseline)
- +3 anodes
- −3 anodes
- +50% depth

---

## 5. Use Cases

1. **Engineer asks "which inputs most affect TR voltage?"** — opens Tornado, selects `minTRVoltage`, sees `structureResistanceOhm` and `backEmfV` at the top.
2. **Engineer asks "what happens if soil resistivity doubles?"** — opens Sweep, sets `soilResistivityOhmCm` to [361, 7220], sees R_G and V_min evolve.
3. **Reviewer wants to compare "+3 anodes" vs "−3 anodes"** — opens Radar, sees all 4 scenarios on one chart, picks the one with the best trade-off.

---

## 6. Tests

```
src/engine/sensitivity/index.test.js (15 tests)  ✓
  • API shape (3 tests)
  • computeTornado (5 tests) — shape, sort, base, monotonicity, subset
  • computeSweep (4 tests) — sample count, output recording, monotonicity, error
  • computeScenarioComparison (1 test)
  • getAvailable* (2 tests)
```

---

## 7. Files Changed / Added

```
NEW  src/engine/sensitivity/index.js              (engine — 200 lines)
NEW  src/engine/sensitivity/index.test.js         (15 tests)
NEW  src/visualizations/SensitivityTornado.jsx    (SVG bar chart — 130 lines)
NEW  src/visualizations/SensitivitySweep.jsx     (Recharts line — 75 lines)
NEW  src/visualizations/SensitivityRadar.jsx     (Recharts radar — 80 lines)
NEW  src/pages/PageSensitivity.jsx               (page — 180 lines)
MOD  src/pages/index.jsx                          (+1 export)
MOD  src/App.jsx                                  (+1 import +1 route)
MOD  src/components/layout.jsx                    (+nav item +icon +meta)
```

---

## 8. Integration with Future Phases

- **Phase 5 (AttenuationExplorer):** The sensitivity tornado can be embedded in the AttenuationPage side panel. Clicking a bar reruns the explorer with the perturbed current.
- **Phase 6 (KPITrendWidget):** The SensitivitySweep can be reused for "what if I change X over time" views.
- **Future:** A "What-If" mode that lets the user adjust a slider and see live results.

---

## 9. Performance

- Each Tornado row runs `runStationCalculations` 2 times (low + high perturbation). With 10 inputs → 20 calls. The engine is O(N) where N = pipeline segments; for typical stations (<10 segments) this completes in <50ms.
- Sweep is O(samples × cost-per-call). 15 samples × <5ms = <75ms.
- Scenario comparison is O(scenarios × outputs). 4 scenarios × 6 outputs = 24 calls, <50ms.

Total page load: <200ms for a typical station. Sufficient for interactive use.

---

**Report generated:** 2026-06-13
**Next update:** When sensitivity is embedded in AttenuationPage (Phase 5).
