# cathodic protection platform — Visualization 2.0 Report (M2)

## Overview

In Milestone M2 (Visualization 2.0), the visualization suite has been hardened and enriched to show critical engineering metrics and relationships:

1. **TR Operating Point Chart** (`TROperatingPointChart.jsx`): A load-line plot displaying the TR voltage/current rated envelope against the load circuit line $V_{load} = V_{emf} + I \times R_T$.
2. **Cable Voltage Drop Waterfall Chart** (`CableWaterfallChart.jsx`): A sequential floating bar chart showing exactly how the total required voltage ($V_{min}$) accumulates from Back EMF offsets and individual cable/soil/earth segments.
3. **Enhanced Sensitivity Tooltips** (`SensitivityTornado.jsx`, `SensitivitySweep.jsx`, `SensitivityRadar.jsx`): Redesigned tooltips presenting both the relative % deviation and raw values with correct engineering units (V, A, Ω, m, years, etc.) on hover.

---

## Technical Details

### 1. TR Operating Point Chart
- Plotted on an absolute $(I, V)$ coordinate grid.
- Shows a shaded region representing the TR's rated capability envelope.
- Plotted curves:
  - **Load Line**: $V(I) = V_{emf} + I \times R_{circuit}$
  - **TR Rated Voltage limit** (Reference line)
  - **TR Rated Current limit** (Reference line)
  - **Required V_min** (Reference line)
  - **Actual Operating Point** (Intersection dot)
- Embedded KPI strip displays the operating point values, rated values, circuit resistance ($R_T$), and voltage safety margin.

### 2. Cable Voltage Drop Waterfall Chart
- Sequence of drops:
  - Back EMF offset
  - Negative main cable drop ($I \times R_{nc}$)
  - Structure return drop ($I \times R_s$)
  - Groundbed earth return drop ($I \times R_G$)
  - Positive main cable drop ($I \times R_{pc}$)
  - Anode tail parallel drop ($I \times R_{ac}$)
  - Back EMF equivalent resistance drop ($I \times R_{emf}$)
- Ending with a solid **Total Required** bar ($V_{min}$) compared against the TR Rated Voltage ceiling.
- Allows rapid, visual identification of which segment is causing excessive voltage drop (exceeding the standard 10% threshold).

### 3. Sensitivity Enhancements
- **Tornado Chart**: Converted to stateful interactive SVG. Hovering over any parameter row highlights the row and renders a tooltip showing the base input value, low perturbation input/output, and high perturbation input/output with units.
- **Sweep Chart**: Hovering over line points shows formatted values along with their units.
- **Radar Chart**: Hovering over axis points displays both the absolute computed output value and the percentage deviation from the baseline.

---

## Verification

- **Tests**: Recharts and helper functions verified via Vitest. All 892 tests pass.
- **Build**: Vite production bundles successfully.
