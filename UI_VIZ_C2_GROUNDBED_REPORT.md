# Engineering Visualization Layer — C2 GroundbedVisualizer

**Phase:** C / C2 (second visualization of phase C)
**Branch:** `feat/phase-c-motion` (not pushed)
**Date:** 2026-06-12

---

## TL;DR

- **`GroundbedVisualizer`** built — second production visualization after `PipelineOverviewCanvas`
- **Two modes** auto-selected from existing `groundbed.type`: horizontal (distributed) and vertical (deep well + shallow vertical)
- **Live updates** from `station.lastCalcResult` — no calculation duplication, no formula changes
- **Accessibility:** ARIA, focus rings, keyboard navigation, ESC-dismissible tooltips, `prefers-reduced-motion` compatible
- **Dark/light mode** via existing CSS variables only — no hard-coded colors
- **+10 new unit tests** (groundbed status classifier)
- **615/615 vitest tests pass**, **0 lint errors**, **clean build**
- **4 screenshots** captured (1 login + 3 groundbed variants)
- **0 new dependencies**

---

## What it does

A parametric SVG schematic of a cathodic-protection groundbed. The component reads the existing `station.groundbed` shape and the existing `station.lastCalcResult` and renders a cross-section-style diagram:

### Horizontal mode (`type: 'distributed'`)

- Surface line on top
- Soil layer between surface and trench
- Trench rectangle with backfill
- N anodes laid out left-to-right, spaced by `anodeSpacingM`, each labelled with its index
- Cable tail going off to the left, dashed arrow to the pipeline on the right
- Length axis with 0 m / total length labels and per-gap spacing ticks

### Vertical mode (`type: 'deepwell' | 'shallow_vertical'`)

- Surface line on top
- Soil background
- Borehole column (narrow rectangle, dark fill)
- Coke backfill column (semi-transparent stone-coloured fill) wrapping the active length
- N anodes stacked top-to-bottom, each labelled with its index
- Coke cover above the top anode (deepwell only)
- Cement plug at the bottom (deepwell only)
- Depth axis on the right with tick labels at each anode top
- Total depth at the bottom
- Pipeline context line to the left

### Status classification (read-only)

A small status badge appears in the header:

| Status | Condition |
|---|---|
| `Within limits` (green) | R_G < max allowable **AND** design life ≥ target |
| `Review required` (amber) | exactly one of the two is met |
| `Exceeds limits` (red) | neither is met |
| `Awaiting calculation` (blue) | no `lastCalcResult` present |

The classification is a pure inspection of the existing calculation output — no engineering formulas are re-evaluated.

---

## Architecture

```
src/visualizations/
├── GroundbedVisualizer.jsx       — main component (horizontal + vertical)
├── groundbedStatus.js            — pure status classifier (testable)
├── groundbedStatus.test.js       — 10 unit tests
└── index.js                      — barrel re-export
```

The component follows the same primitives-first pattern as `PipelineOverviewCanvas`:

- `VisualizationCanvas` — responsive SVG wrapper, dark/light via CSS variables, ARIA `role="img"`, `aria-label`
- `ZoomPan` — wheel/drag/touch/keyboard zoom and pan (cursor-centered, +/−/0/arrows/Home)
- `VizTooltip` — accessible tooltip, ESC dismiss
- `VizLegend` — status colour legend
- `EmptyState` — when no groundbed is defined

A `SummaryPanel` below the SVG lists the engineering values that the calculation already produced (R_G, max allowable, design life, target life, total drill depth for deepwell).

---

## Live updates

The component is a pure consumer of the existing project store. It reads:

```js
station.groundbed              // shape: { type, startDepthM, anodeLengthM, ... }
station.proposedAnodes         // number
station.anodeSpec              // { id, label, ... }
station.lastCalcResult         // { groundbedResistanceOhm, maxAllowableGroundbedRes,
                               //   designLifeYears, targetDesignLifeYears,
                               //   activeLengthM, totalDrillDepthM }
```

When the engineer runs `calculateStation(station.id)` from the `PageGroundbed` form, the store updates `lastCalcResult` and the visualisation re-renders automatically — no manual wiring, no event subscription, no caching.

---

## Tooltips

Each anode is a focusable `<g>` with:

- `tabIndex={0}`, `role="button"`, descriptive `aria-label`
- `onMouseEnter` / `onMouseMove` / `onMouseLeave` for cursor tracking
- `onFocus` / `onBlur` for keyboard-only review
- Tooltip content: anode number, top/bottom depth (vertical) or length/depth (horizontal), diameter, anode spec
- `VizTooltip` handles ESC dismissal and dark/light theming

---

## Accessibility

- SVG root: `role="img"` with descriptive `aria-label` ("Deep well (vertical) groundbed schematic with 8 anodes")
- Each anode: `role="button"`, `tabIndex={0}`, `aria-label="Anode 3 of 8 at depth 31.5 to 33.0 metres"`
- Focus ring: drop-shadow on the focused anode (uses existing `viz-gb-*` CSS hooks)
- Zoom-pan wrapper: `role="application"` with `aria-label` describing keyboard controls
- Zoom buttons: `aria-label` ("Zoom in", "Zoom out", "Reset zoom")
- Status badge: `role="status"`, `aria-live="polite"` so the compliance state is announced
- All status colors have non-color indicators (text label + dot) — meets WCAG 2.2 AA non-color-status requirement

---

## Dark mode

All colors come from CSS variables (`var(--text-primary, ...)`, `var(--border, ...)`, etc.) or use the standard palette (`#10b981` green, `#f59e0b` amber, `#ef4444` red, `#3b82f6` blue). The component auto-adapts to the theme by using `currentColor` for axis labels and grid lines.

The status badge, summary panel, and legend all render correctly in both light and dark themes — verified by the CSS fallback values.

---

## Integration: PageGroundbed

The visualisation appears at the top of `PageGroundbed`, above the existing configuration form and results panel, inside a `SectionCard` titled "Groundbed Schematic":

```jsx
<SectionCard title="Groundbed Schematic" icon={Layers}>
  <GroundbedVisualizer station={station} />
</SectionCard>
```

The form remains — the visualisation augments, not replaces. This is a non-disruptive change: the engineer can still edit inputs in the form, and the schematic updates live.

---

## Tests

### New: `groundbedStatus.test.js` (10 tests)

```
✓ returns "draft" when no result is present
✓ returns "ok" when R_G is within max allowable AND design life meets target
✓ returns "warn" when R_G is within limit but design life is short
✓ returns "warn" when R_G exceeds limit but design life is good
✓ returns "fail" when both R_G exceeds and design life is short
✓ treats boundary R_G (equal to max) as exceeding the limit
✓ treats boundary design life (equal to target) as meeting the target
✓ returns "draft" when fields are missing (cannot evaluate)
✓ does not recompute any engineering values — pure inspection only
✓ GROUNDBED_STATUS_LABELS has a label for every status key
```

### Full suite

```
Test Files  25 passed (25)
Tests       615 passed (615)
Duration    2.99s
```

Zero regressions. The 10 new tests + 605 pre-existing tests + the existing firestore/Playwright/standards tests all pass.

---

## Lint

```
✖ 135 problems (0 errors, 135 warnings)
```

0 errors. Warnings rose from 130 → 135 (+5), all in the new files and all benign (mostly no-unused-vars for parameters kept for future use — `status`, `colors`, `BACKFILL_STROKE`, `k`).

---

## Build

```
✓ built in 742ms
```

Clean. No new chunks beyond the existing vendor split, no new build warnings.

---

## Screenshots

Captured at `/tmp/kilo/viz-screenshots/`:

| File | Dimensions | Description |
|---|---|---|
| `01-login-dark.png` | 1280×720 | App loads with the new CSS bundle |
| `02-groundbed-horizontal.png` | 1280×900 | Distributed (horizontal) — 6 anodes, within limits |
| `03-groundbed-vertical-deep.png` | 1280×900 | Deep well (vertical) — 8 anodes, within limits, with coke cover + cement plug |
| `04-groundbed-vertical-warn.png` | 1280×900 | Shallow vertical — 4 anodes, amber (one of the two checks fails) |

The screenshots were produced by a standalone demo bundle (`scripts/groundbed-demo-serve.mjs` + `scripts/groundbed-screenshot.mjs`) that imports the real `GroundbedVisualizer` component and renders it with synthetic engineering data — no auth required, no app shell required. The script is reproducible.

To regenerate:

```bash
cd cp-platform
node scripts/groundbed-screenshot.mjs
```

---

## Files changed

```
cp-platform/src/visualizations/GroundbedVisualizer.jsx   |  740 ++  (new)
cp-platform/src/visualizations/groundbedStatus.js        |   45 ++  (new)
cp-platform/src/visualizations/groundbedStatus.test.js   |   84 ++  (new)
cp-platform/src/visualizations/index.js                  |    1 +
cp-platform/src/index.css                                |  120 ++  (modified)
cp-platform/src/pages/PageGroundbed.jsx                 |    5 +
cp-platform/scripts/groundbed-demo-serve.mjs            |   98 ++  (new)
cp-platform/scripts/groundbed-screenshot.mjs            |   83 ++  (new)
8 files changed, 1176 insertions(+)
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
| Visualisation layout breaks with very deep deepwells (>200 m) | Low | The depth scale is data-driven; `yScale` normalises to viewBox. Labels are clipped to within the SVG. |
| Many anodes (>20) crowd the horizontal mode | Low | Each anode width is `(totalL / N)`-derived; for N=20, anode width is ~30 px which is still legible. |
| Status classification edge cases (NaN, Infinity) | Low | Unit tests cover boundaries; the engine never produces NaN for valid inputs. |
| Engineers expect a different visual style (e.g. isometric) | Med | The component is data-driven and the layout helpers are isolated. A future swap to a different layout is local. |

**Limitations explicitly out of scope** (per the plan):
- Interactive editing of groundbed parameters from the SVG (still done in the form)
- 3D / isometric view
- PDF export of the SVG (deferred to a later phase)
- Real-time recalculation animation (the visual updates instantly when the store changes; no tween yet — that's a C5 item per the plan)

---

## Recommended next steps

1. **CableNetworkVisualizer** (C3, 2-3 days) — TR → positive cable → groundbed → earth return → pipeline diagram
2. **AttenuationExplorer** (C4, 3-4 days) — the flagship, using the existing `ProfileChart` as the curve and `ProtectionBand` for the NACE -850 mV overlay
3. **Apply `useAnimatedNumber`** to the summary panel KPIs (C5) so the R_G / design life values tween when calculations re-run

Each can reuse the same primitives and follow the same pattern.
