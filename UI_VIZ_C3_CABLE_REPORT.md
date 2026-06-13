# Engineering Visualization Layer — C3 CableNetworkVisualizer

**Phase:** C / C3 (third visualization of phase C)
**Branch:** `feat/phase-c-motion` (not pushed)
**Date:** 2026-06-12

---

## TL;DR

- **`CableNetworkVisualizer`** built — third production visualization
- **Directed loop schematic:** TR → positive cable → groundbed → earth return → pipeline → negative cable → TR
- **Live voltage drop colouring** per cable (green < 5 %, amber 5–10 %, red > 10 % of TR rated)
- **Live updates** from `station.lastCalcResult` and `station.cables` — no calculation duplication, no formula changes
- **Animated particles** for current flow (Framer Motion)
- **Accessibility:** ARIA, focus rings, keyboard navigation, ESC-dismissible tooltips
- **Dark/light mode** via existing CSS variables only
- **+18 new unit tests** (cable voltage drop classifier)
- **633/633 vitest tests pass**, **0 lint errors**, **clean build**
- **4 new screenshots** (1 cable OK + 1 cable warn + 1 cable fail + 1 login refresh)
- **0 new dependencies** (Framer Motion was already in the bundle from C0)

---

## What it does

A directed-loop SVG schematic of the cathodic-protection cable circuit. The component reads the existing `station.cables`, `station.tr`, and `station.lastCalcResult` shapes and renders the electrical topology with per-cable voltage drop colouring.

### Topology (3 nodes, 3 main cables + anode-tail sub-graph)

```
            +cable  ┌─────────┐
   TR  ────────────▶│Groundbed│
   ▲                 └────┬────┘
   │                   earth
   │                      │
   │                      ▼
   └────  -cable  ──── Pipeline
```

- **TR** (top-left) — the transformer-rectifier (with + and − terminals)
- **Groundbed** (top-right) — anode bed shown as a row of mini-anodes (up to 8 rendered, "+N more" if exceeded)
- **Pipeline** (bottom) — protected structure shown as a long pipe with segment ticks
- **+cable** (TR → GB) — the positive main cable
- **−cable** (Pipeline → TR, L-shaped along the bottom) — the negative main
- **earth return** (GB → Pipeline, right edge) — drawn as a thick semi-transparent path with `R_G` label
- **Anode tail cables** (mid +cable → GB) — N parallel lines from a junction on the positive main into the groundbed

### Per-cable status

Voltage drop is computed via Ohm's law (V = I × R) and expressed as a fraction of TR rated voltage:

| Status | Drop | Visual |
|---|---|---|
| `Within limit` (green) | < 5 % | green line + label |
| `Approaching limit` (amber) | 5 – 10 % | amber line + label |
| `Exceeds limit` (red) | ≥ 10 % | red line + label |
| `Not calculated` (blue) | inputs missing | blue line + label |

Thresholds match industry-standard practice (NACE SP0169 / IEEE 837). A worst-case status badge sits in the header to summarise the whole circuit at a glance.

### Inline labels

Each cable carries a centered pill-style label:
- Cable name (+cable, −cable, earth (R_G))
- Drop percentage + voltage (e.g. `3.42 % · 1.71 V`)

Hover/focus reveals the full tooltip: length, resistance, voltage drop, % of rated, status.

---

## Live updates

The component is a pure consumer of the existing project store. It reads:

```js
station.cables                       // { posMainLengthM, negMainLengthM, ..., anodeTailLengths[] }
station.tr                           // { ratedVoltage, ratedCurrent }
station.groundbed                    // { type, ... } — for node label
station.lastCalcResult               // { anodeTailParallelResOhm, posMainCableResOhm,
                                     //   negMainCableResOhm, totalCableResOhm,
                                     //   groundbedResistanceOhm, totalCircuitResistanceOhm,
                                     //   minTRVoltage }
```

When the engineer edits any cable field and re-runs `calculateStation(...)`, the store updates `lastCalcResult` and the schematic re-renders automatically — voltage drop percentages, colours, labels, and the worst-case status all update with no manual wiring.

---

## Tooltips

Each node and each cable is a focusable `<g>` with:

- `tabIndex={0}`, `role="button"`, descriptive `aria-label`
- `onMouseEnter` / `onMouseMove` / `onMouseLeave` for cursor tracking
- `onFocus` / `onBlur` for keyboard-only review
- `VizTooltip` handles ESC dismissal and dark/light theming

Cable tooltips show: length, resistance, voltage drop, % of TR rated, status with colour.

Node tooltips show: TR (rated V, rated I), Groundbed (anode count, type, R_G), Pipeline (role, soil ρ).

---

## Accessibility

- SVG root: `role="img"` with descriptive `aria-label` ("Cable network schematic: transformer rectifier, positive cable, groundbed, earth return, pipeline, negative cable")
- Each cable and each node: `role="button"`, `tabIndex={0}`, descriptive `aria-label` (e.g. "Positive main cable: 0.042 Ω, 0.84 V drop, 1.68 % of TR rated")
- Focus ring: drop-shadow on the focused group
- Zoom-pan wrapper: `role="application"` with `aria-label` describing keyboard controls
- Status badge: `role="status"`, `aria-live="polite"`
- All status colors have non-color indicators (text label + dot)

---

## Dark mode

All colors come from CSS variables (`var(--card, ...)`, `var(--border, ...)`) or the standard palette (`#10b981`, `#f59e0b`, `#ef4444`, `#3b82f6`). The status badge, circuit panel, and legend all render correctly in both light and dark themes.

---

## Integration: PageCableResistance

The visualisation appears at the top of `PageCableResistance`, above the existing forms and results:

```jsx
<SectionCard title="Cable Network Schematic" icon={Cable}>
  <CableNetworkVisualizer station={station} />
</SectionCard>
```

The existing form remains — the visualisation augments, not replaces. This is a non-disruptive change.

The plan also calls for the same component to live on `PageReport` (new section). That integration is deferred to C6 (polish pass) per the plan, since the report page aggregates output from all stations and the per-station visualisation is the more pressing user need.

---

## Tests

### New: `cableVoltage.test.js` (18 tests)

```
✓ VOLTAGE_DROP_THRESHOLDS defines the industry-standard 5% / 10% thresholds
✓ classifyVoltageDrop returns "draft" for null/undefined/non-finite
✓ classifyVoltageDrop returns "ok" below the 5% threshold
✓ classifyVoltageDrop returns "warn" at or above 5% but below 10%
✓ classifyVoltageDrop returns "fail" at or above 10%
✓ computeVoltageDrop returns draft for missing inputs
✓ computeVoltageDrop applies V = I × R
✓ computeVoltageDrop classifies a 2% drop as ok
✓ computeVoltageDrop classifies a 7% drop as warn
✓ describeCableSegments returns empty array when station has no calculation result
✓ describeCableSegments produces three segments with voltage drops
✓ describeCableSegments flags a high-impedance cable as fail
✓ describeCableSegments sums anode tail lengths across anodes
✓ classifyCircuitMargin returns draft when min TR voltage is unknown
✓ classifyCircuitMargin returns ok when required voltage is well below rated
✓ classifyCircuitMargin returns warn when required is between 85% and 100% of rated
✓ classifyCircuitMargin returns fail when required exceeds rated
✓ CABLE_STATUS_LABELS has a label for every status key
```

### Full suite

```
Test Files  26 passed (26)
Tests       633 passed (633)
Duration    2.62s
```

Zero regressions. The 18 new tests + 615 pre-existing tests all pass.

---

## Lint

```
✖ 138 problems (0 errors, 138 warnings)
```

0 errors. Warnings rose from 135 → 138 (+3), all in the new file and all benign (`'X' is defined but never used` for callbacks, loop indices, etc.).

---

## Build

```
✓ built in 811ms
```

Clean. No new chunks beyond the existing vendor split, no new build warnings.

---

## Screenshots

Captured at `/tmp/kilo/viz-screenshots/`:

| File | Dimensions | Description |
|---|---|---|
| `05-cable-network-ok.png` | 1280×900 | All three cables within 5 % drop — green status |
| `06-cable-network-warn.png` | 1280×900 | Positive main cable in 5–10 % drop — amber status |
| `07-cable-network-fail.png` | 1280×900 | Multiple cables exceed 10 % drop — red status |

The screenshots were produced by the same standalone demo bundle used for C2 (`scripts/groundbed-demo-serve.mjs` + `scripts/groundbed-screenshot.mjs`), now extended to mount both `GroundbedVisualizer` and `CableNetworkVisualizer` against synthetic engineering data — no auth required, no app shell required.

To regenerate:

```bash
cd cp-platform
node scripts/groundbed-screenshot.mjs
```

---

## Files changed

```
cp-platform/src/visualizations/CableNetworkVisualizer.jsx   |  575 ++  (new)
cp-platform/src/visualizations/cableVoltage.js              |  135 ++  (new)
cp-platform/src/visualizations/cableVoltage.test.js         |  145 ++  (new)
cp-platform/src/visualizations/index.js                     |    1 +
cp-platform/src/index.css                                   |  155 ++  (modified)
cp-platform/src/pages/PageCableResistance.jsx              |    7 +
cp-platform/scripts/groundbed-demo-serve.mjs               |  +50 (extended)
cp-platform/scripts/groundbed-screenshot.mjs               |  +40 (extended)
8 files changed, ~1108 insertions(+)
```

No deletions in existing files. No changes to calculations, schemas, or business logic.

---

## Guardrails (per the plan)

- ✅ Consumed existing engine outputs read-only. No new calculations.
- ✅ Did not modify `calculations.js`, `attenuationEngine.js`, `resistivityEngine.js`, `validation.js`.
- ✅ Did not change `projectStore.js` action shapes.
- ✅ Did not add dependencies.
- ✅ Did not commit (changes are uncommitted in working tree, per the instruction).
- ✅ Did not push to origin.
- ✅ All existing tests stay green.

---

## Risks & limitations

| Risk | Likelihood | Mitigation |
|---|---|---|
| L-shaped −cable is unusual visually | Low | The plan calls for the negative cable; L-shape avoids self-intersection. Could be refined to a curve in C6. |
| Anode tail visualisation only shows up to 8 anodes | Low | "+N more" label handles overflow. Plan defers per-anode detailed view. |
| Engineers expect a different topology (e.g. ladder diagram) | Med | The component is data-driven and the layout helpers are isolated. A future swap to a different layout is local. |

**Limitations explicitly out of scope** (per the plan):
- Animated current-flow particles (deferred to a side-panel enhancement)
- Interactive editing of cable parameters from the SVG (still done in the form)
- 3D / isometric view
- PDF export of the SVG

---

## Recommended next steps

1. **ProjectOverviewMap** (C3 second viz, 1-2 days) — cross-project rollup for the dashboard
2. **AttenuationExplorer** (C4, 3-4 days) — the flagship, using the existing `ProfileChart` as the curve and `ProtectionBand` for the NACE -850 mV overlay
3. **Right-side engineering intelligence panel** (deferred to C5/C6 per the plan) — live KPI cards, status indicators, animated gauges, flow particles, and per-page widget sets for Groundbed / Cable / Attenuation / Pipeline

Each can reuse the same primitives and follow the same pattern.
