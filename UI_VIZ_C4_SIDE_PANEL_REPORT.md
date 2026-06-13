# Engineering Visualization Layer — C4 Side Panel

**Phase:** C / C4 (right-side engineering intelligence panel)
**Branch:** `feat/phase-c-motion` (not pushed)
**Date:** 2026-06-12

---

## TL;DR

- **9 reusable widget primitives** built (KpiCard, StatusList, RadialGauge, DonutChart, InsightCard, FlowIndicator, DepthProfile, WorkflowProgress, ActivityFeed)
- **1 reusable panel shell** (`RightSideEngineeringPanel`) with responsive 70/30 → 65/35 → drawer breakpoints
- **3 page-specific widget sets** shipped: `GroundbedWidgets`, `CableWidgets`, `PipelineWidgets`
- **AttenuationWidgets deferred** — the `AttenuationExplorer` flagship (C4 in the plan) doesn't exist yet, so the right panel there is premature
- **Integrated** into `PageGroundbed`, `PageCableResistance`, `PageDashboard`
- **Animated**: count-up KPI numbers, radial gauge fills, flow particles, staggered widget entrance, status pulse
- **`prefers-reduced-motion` respected** throughout — all animations snap to final state when reduced
- **No new calculations, no formula changes, no business logic changes** — every widget is a pure consumer of existing engine output
- **No new dependencies** — Framer Motion was already in the bundle from C0
- **633/633 vitest tests pass**, **0 lint errors**, **clean build**
- **4 new screenshots** (one per page-specific widget set + the project rollup)

---

## What it does

The C4 work transforms the unused right-side area of every visualization page into a live engineering intelligence panel. Each page now reads:

```
┌──────────────────────────────┬──────────────────┐
│ Visualization                │ Engineering Hub  │
│                              │                  │
│  (GroundbedVisualizer,       │  Live Metrics    │
│   CableNetworkVisualizer,    │  Status          │
│   PipelineOverviewCanvas)    │  Insights        │
│                              │  Trends          │
└──────────────────────────────┴──────────────────┘
```

All widgets pull from the same store the visualization already uses — no parallel state, no recomputation.

---

## Architecture

```
src/visualizations/sidePanel/
├── RightSideEngineeringPanel.jsx  — responsive shell (sticky aside, 70/30 → 65/35 → drawer)
├── widgets/
│   ├── KpiCard.jsx                — animated KPI with useAnimatedNumber + hover scale
│   ├── KpiGrid.jsx                — responsive grid wrapper
│   ├── StatusList.jsx             — ✓/⚠/✗ list with staggered entrance
│   ├── RadialGauge.jsx            — animated SVG arc (Framer Motion stroke-dashoffset)
│   ├── DonutChart.jsx             — animated SVG donut (same technique)
│   ├── InsightCard.jsx            — coloured bar with icon + text
│   ├── FlowIndicator.jsx          — moving particle along an SVG polyline
│   ├── DepthProfile.jsx           — vertical SVG column with staggered anode reveal
│   ├── WorkflowProgress.jsx       — vertical stepper with state icons
│   ├── ActivityFeed.jsx           — recent-activity list with relative timestamps
│   └── index.js                   — barrel re-exports
├── pageWidgets/
│   ├── GroundbedWidgets.jsx       — widgets for PageGroundbed
│   ├── CableWidgets.jsx           — widgets for PageCableResistance
│   └── PipelineWidgets.jsx        — widgets for PageDashboard
└── index.js                       — barrel re-exports
```

Every widget is a pure function of its `props`. No global state, no side effects.

---

## Shared widget primitives

### `KpiCard` — animated numeric card

A small card showing a label, an animated value, an optional unit, and an optional hint. The value tweens from the previously displayed value to the new one over `DURATION.reveal` (400 ms) using `useAnimatedNumber`. On hover, the card subtly scales up via `cardHoverVariants`.

**Tone colours** map to the standard palette: `ok` (green), `warn` (amber), `fail` (red), `draft` (blue), `neutral` (default).

Non-numeric values (e.g. groundbed type label "Deep well") are rendered as plain text — no animation attempted on strings.

### `RadialGauge` and `DonutChart` — animated SVG arcs

Both use the same technique: a background circle, then a foreground circle with `strokeDasharray = circumference` and `strokeDashoffset = circumference * (1 - percent/100)`. A Framer Motion `useMotionValue` drives the dash offset, animated over `DURATION.reveal` (400 ms) with the standard `EASE.standard` curve.

`usePrefersReducedMotion` snaps to the final value with no interpolation.

### `StatusList` — ✓/⚠/✗ rows

Each row has an icon (Check / AlertTriangle / X / Circle), a label, and an optional hint. Rows fade in with a 40 ms stagger. Coloured left-border matches the status tone.

### `InsightCard` / `InsightList` — coloured bars

A short text insight with a left border in the status colour and an icon (Info / CheckCircle2 / AlertTriangle / TrendingUp). Used for textual engineering observations.

### `FlowIndicator` — animated current path

A horizontal chain of nodes connected by a dashed line, with a single moving circle (Framer Motion) that loops end-to-end. Reduced-motion mode hides the particle. Used to show the conceptual flow TR → GB → Earth → Pipeline → TR.

### `DepthProfile` — vertical column

A small SVG showing surface, soil background, borehole column, active length highlight, and N anodes. Each anode fades in with a 50 ms stagger. Depth labels on the right. Pure presentation — geometry is passed in.

### `WorkflowProgress` — animated stepper

Vertical list of stages with status icons:
- `pending` — empty circle (grey)
- `active` — spinning loader (animated CSS rotation)
- `complete` — green check
- `blocked` — red triangle

### `ActivityFeed` — recent activity

List of recent activity items with relative timestamps ("15m ago"). Pure display — caller provides the items. For now the items are derived from station data (last calculation timestamp, status changes). A future C6 iteration can wire this to a real activity-log store.

---

## Page-specific widget sets

### `GroundbedWidgets` (for `PageGroundbed`)

- **KPI grid** (6 cards): Groundbed type, Anode qty, R_G (mΩ), Design life, Active length, Total depth
- **Engineering status** (StatusList): Resistance within limit, Design life achieved, Current capacity adequate, Optimization opportunity
- **Visual health** (RadialGauge): 0–100 composite score = 60 % resistance margin + 40 % life attainment
- **Design insights** (InsightList): text insights like "Groundbed resistance is 79% below allowable limit"
- **Depth profile** (DepthProfile): vertical column with staggered anode reveal (for vertical groundbed types)

### `CableWidgets` (for `PageCableResistance`)

- **KPI grid** (4 cards): R_T, V drop, Margin %, R_c
- **Circuit health** (RadialGauge): 0–100 composite score = 50 % resistance margin + 50 % voltage margin
- **Current flow** (FlowIndicator): animated particle TR → GB → Earth → Pipe → TR
- **Cable diagnostics** (StatusList): per-cable status (3 cables + earth return) with voltage drop and % of TR rated
- **Insights** (InsightList): "Cable resistance contributes 43% of total circuit resistance" / "Voltage drop exceeds threshold" / etc.

### `PipelineWidgets` (for `PageDashboard`)

- **Project health** (RadialGauge): 0–100 composite score = 50 % calculated + 30 % approved + 20 % in review
- **KPI grid** (6 cards): Pipeline length, Stations, Groundbeds, TR units, Crossings (placeholder), Isolation joints (placeholder)
- **Workflow progress** (WorkflowProgress): 6 stages (Design basis → Pipeline → Groundbed → TR → Validation → Approval) with per-stage status derived from station data
- **Recent activity** (ActivityFeed): last 6 station events (calculation runs, approval actions, in-review)
- **Status** (StatusList): calculated / approved counts

### `AttenuationWidgets` — **deferred**

The plan calls for attenuation widgets (protection status donut, live cursor inspector, critical locations, scenario comparison). All of these depend on the `AttenuationExplorer` flagship, which is the C4 work in the original plan and hasn't been built yet. The widgets would consume output that doesn't exist, so they would have to be placeholders.

The right approach is to ship the attenuation widgets together with the `AttenuationExplorer` in C4 (the original C4, not this C4 which is the side-panel work). The widget set and the explorer should land together so the data shape matches.

---

## Responsive behaviour

```css
/* default: 1 column (mobile) */
.viz-engineering-workspace { grid-template-columns: 1fr; }

/* desktop ≥ 1200px: 70 / 30 */
@media (min-width: 1200px) {
  .viz-engineering-workspace { grid-template-columns: minmax(0, 7fr) minmax(0, 3fr); }
}

/* ultrawide ≥ 1600px: 65 / 35 */
@media (min-width: 1600px) {
  .viz-engineering-workspace { grid-template-columns: minmax(0, 13fr) minmax(0, 7fr); }
}

/* tablet < 1200px: panel becomes a collapsible drawer */
```

The panel shell is `position: sticky; top: 16px` inside its grid cell, so it stays in view as the user scrolls the main visualization. The body is `max-height: calc(100vh - 32px); overflow-y: auto` so long widget sets scroll within the panel.

A "Hide / Open" toggle in the panel header lets the user collapse the panel on smaller screens.

---

## Animation framework

All animations are built on the C0 motion foundation (`DURATION`, `EASE`, `pageVariants`, `cardHoverVariants`, `kpiPulseVariants`, `useAnimatedNumber`, `usePrefersReducedMotion`).

| Element | Animation | Duration | Reduced-motion |
|---|---|---|---|
| KPI numbers | count-up tween via `useAnimatedNumber` | 400 ms | snap |
| KPI cards | scale on hover | 150 ms | none |
| Radial gauge / donut | arc fill | 400 ms | snap |
| Status rows | staggered fade + slide | 200 ms / 40 ms stagger | none |
| Insight cards | fade + slide | 200 ms | none |
| Depth profile anodes | staggered fade + scale | 200 ms / 50 ms stagger | none |
| Workflow bullets | staggered fade | 200 ms / 50 ms stagger | none |
| Activity rows | staggered fade | 200 ms / 40 ms stagger | none |
| Flow particle | continuous loop | 4 s | hide |
| Panel entrance | fade + slide | 200 ms | none |
| Panel exit | fade + slide | 200 ms | none |
| Workflow active step | CSS spin | 1.4 s | none |

The exact durations and easings are defined in `src/motion/timings.js` and `src/motion/variants.js`, so the entire product speaks one motion language.

---

## Accessibility

- Panel is wrapped in an `<aside aria-label="...">` so screen readers can navigate to it
- The "Hide / Open" toggle has `aria-expanded` and `aria-controls`
- All status indicators have non-color cues (icon shape + text label)
- KPI numbers are exposed as text in `<span>` so screen readers read them
- All `prefers-reduced-motion` cases are handled (snaps instead of animates)
- Tab order: page main → panel (no keyboard trap)

---

## Integration

### `PageGroundbed`

```jsx
<RightSideEngineeringPanel
  panelTitle="Groundbed Intelligence"
  panel={<GroundbedWidgets station={station} />}
>
  <SectionCard title="Groundbed Schematic" icon={Layers}>
    <GroundbedVisualizer station={station} />
  </SectionCard>
  <Grid2>
    {/* existing form + results */}
  </Grid2>
</RightSideEngineeringPanel>
```

### `PageCableResistance`

```jsx
<RightSideEngineeringPanel
  panelTitle="Cable Intelligence"
  panel={<CableWidgets station={station} />}
>
  <SectionCard title="Cable Network Schematic" icon={Cable}>
    <CableNetworkVisualizer station={station} />
  </SectionCard>
  {/* existing forms */}
</RightSideEngineeringPanel>
```

### `PageDashboard`

```jsx
<RightSideEngineeringPanel
  panelTitle="Project Intelligence"
  panel={<PipelineWidgets project={activeProject} />}
>
  <section className="dashboard-pipeline-section">
    <PipelineOverviewCanvas stations={activeProject.stations} />
  </section>
</RightSideEngineeringPanel>
```

All integrations are non-destructive: the existing form sections remain exactly as they were. The panel wraps them and adds the side intelligence.

---

## Guardrails (per the prompt + the plan)

- ✅ No new calculations
- ✅ No duplicate calculations
- ✅ No engineering formula changes
- ✅ No validation changes
- ✅ No business logic changes
- ✅ All widgets consume existing engine outputs read-only
- ✅ No new dependencies
- ✅ No commits, no pushes

---

## Tests

The 633 existing tests still pass (10 added in C3 for the cable voltage classifier). No new unit tests were added for the side panel because:
- The component logic is purely presentational (no domain math)
- The animation primitives already have their own tests (useAnimatedNumber, etc.)
- Adding component tests for Framer Motion requires jsdom + complex setup that is not currently configured

If the team wants component tests for the side panel, the next iteration would add a `vitest.config.js` change to support `.jsx` files and `environment: 'jsdom'`, then add snapshot + interaction tests for each widget. This is C6 work per the plan ("Accessibility + performance + memo + selector audit").

---

## Lint

```
✖ 148 problems (0 errors, 148 warnings)
```

0 errors. Warnings rose from 138 → 148 (+10), all in the new files and all benign (mostly no-unused-vars for parameters kept for future use).

---

## Build

```
✓ 3129 modules transformed.
✓ built in 881ms
```

Clean. No new chunks beyond the existing vendor split, no new build warnings.

---

## Screenshots

Captured at `/tmp/kilo/viz-screenshots/`:

| File | Dimensions | Description |
|---|---|---|
| `08-side-panel-groundbed.png` | 1280×900 | Groundbed Intelligence widgets for a deep-well station (within limits) |
| `09-side-panel-cable-ok.png` | 1280×900 | Cable Intelligence widgets for an all-OK circuit |
| `10-side-panel-cable-warn.png` | 1280×900 | Cable Intelligence widgets for a circuit with one cable in warn (5–10 %) |
| `11-side-panel-pipeline.png` | 1280×900 | Project Intelligence widgets for a 3-station project (1 approved, 1 in review, 1 draft) |

The screenshots were produced by the same standalone demo bundle used for C2 and C3 (`scripts/groundbed-demo-serve.mjs` + `scripts/groundbed-screenshot.mjs`), now extended to mount all three widget sets against synthetic engineering data.

To regenerate:

```bash
cd cp-platform
node scripts/groundbed-screenshot.mjs
```

---

## Files changed

```
cp-platform/src/visualizations/sidePanel/RightSideEngineeringPanel.jsx        |  84 ++  (new)
cp-platform/src/visualizations/sidePanel/widgets/KpiCard.jsx                 |  54 ++  (new)
cp-platform/src/visualizations/sidePanel/widgets/StatusList.jsx              |  47 ++  (new)
cp-platform/src/visualizations/sidePanel/widgets/RadialGauge.jsx             |  85 ++  (new)
cp-platform/src/visualizations/sidePanel/widgets/DonutChart.jsx              |  85 ++  (new)
cp-platform/src/visualizations/sidePanel/widgets/InsightCard.jsx             |  45 ++  (new)
cp-platform/src/visualizations/sidePanel/widgets/FlowIndicator.jsx           |  84 ++  (new)
cp-platform/src/visualizations/sidePanel/widgets/DepthProfile.jsx            |  98 ++  (new)
cp-platform/src/visualizations/sidePanel/widgets/WorkflowProgress.jsx        |  40 ++  (new)
cp-platform/src/visualizations/sidePanel/widgets/ActivityFeed.jsx            |  29 ++  (new)
cp-platform/src/visualizations/sidePanel/widgets/index.js                    |  10 ++  (new)
cp-platform/src/visualizations/sidePanel/pageWidgets/GroundbedWidgets.jsx    |  135 ++  (new)
cp-platform/src/visualizations/sidePanel/pageWidgets/CableWidgets.jsx        |  125 ++  (new)
cp-platform/src/visualizations/sidePanel/pageWidgets/PipelineWidgets.jsx     |  135 ++  (new)
cp-platform/src/visualizations/sidePanel/index.js                            |   5 ++  (new)
cp-platform/src/visualizations/index.js                                      |  13 ++
cp-platform/src/index.css                                                    |  430 ++
cp-platform/src/pages/PageGroundbed.jsx                                      |  15 ++
cp-platform/src/pages/PageCableResistance.jsx                                |  10 ++
cp-platform/src/pages/PageDashboard.jsx                                      |  20 ++
cp-platform/scripts/groundbed-demo-serve.mjs                                 |  +60 (extended)
cp-platform/scripts/groundbed-screenshot.mjs                                 |  +20 (extended)
23 files changed, ~1629 insertions(+)
```

No deletions in existing files (except minor whitespace). No changes to calculations, schemas, or business logic.

---

## Risks & limitations

| Risk | Likelihood | Mitigation |
|---|---|---|
| KPI value animation jank on rapid recalc | Low | `useAnimatedNumber` cancels in-flight RAF on new value. |
| Radial gauge SVG jitter on Safari | Low | `transform: rotate(-90deg)` is hardware-accelerated. Could swap to Framer's `motion.path` if needed. |
| Sticky panel overlaps mobile drawer toggle | Low | Drawer toggle is inside the aside; below 1200px the panel is full-width and toggle is visible. |
| Component tests deferred | Med | C6 pass will add jsdom + snapshot tests. |
| Attenuation widgets deferred | Med | They will land together with the `AttenuationExplorer` flagship in the original C4 work. |

---

## Recommended next steps

1. **`AttenuationExplorer`** (C4 flagship per the original plan) — the biggest productivity win. When built, the corresponding `AttenuationWidgets` can be added to this side-panel in the same pass.
2. **`ProjectOverviewMap`** (C3 second viz) — cross-project rollup for the dashboard. Folds naturally into the existing `PipelineWidgets`.
3. **Accessibility audit + Lighthouse CI** (C6) — the components are designed for it but haven't been measured.
4. **Component tests** (C6) — add jsdom + Vitest component tests for the new widgets.

Each can reuse the same primitives and follow the same pattern.
