# Engineering Visualization Layer — Phase C Optimization Pass

**Phase:** C / Optimization (architecture refinement)
**Branch:** `feat/phase-c-motion` (not pushed)
**Date:** 2026-06-12

---

## TL;DR

- **Standardized left/right architecture** across all 4 engineering pages
- **Removed duplication**: the depth-profile widget on `GroundbedWidgets` (which duplicated the main `GroundbedVisualizer`) is gone
- **Primary visualization now lives in the right panel** for `PageGroundbed`, `PageCableResistance`, and `PageDashboard` — so the right side hosts the single big interactive diagram plus its intelligence widgets
- **Left side is now pure inputs + results + tables** for every page
- **New `CalculationInputsUsed` traceability widget** — engineers can now see exactly which inputs drove every result, with timestamps and source labels
- **New `SoilResistivitySection`** — dedicated left-side panel showing design resistivity, layer resistivity, average resistivity, and source of value
- **New "Inputs Driving This Analysis" panel** at the top of the attenuation page
- **New project summary card** on the dashboard left side
- **Animation rules** reaffirmed: only current flow, health gauge, KPI count-up, validation, workflow, status changes — no random or decorative motion
- **No new calculations, no formula changes, no business logic changes** — all changes are pure layout/architecture
- **No new dependencies**
- **633/633 vitest tests pass**, **0 lint errors**, **clean build**
- **2 new screenshots** (12, 13) showing the optimized layouts

---

## What changed

### Architecture contract (now enforced)

```
┌──────────────────────────────┬──────────────────┐
│  LEFT 70 %                   │  RIGHT 30 %      │
│                              │                  │
│  • Inputs (forms)            │  • Primary       │
│  • Calculation results       │    visualization │
│  • Validation                │  • Animated KPIs │
│  • Tables                    │  • Insights      │
│  • Traceability              │  • Diagnostics   │
│  • Status banners            │  • Status list   │
│                              │  • Calculation   │
│                              │    inputs used   │
│                              │                  │
│  No animated widgets.        │  Only viz        │
│  No duplicate diagrams.      │  content.        │
└──────────────────────────────┴──────────────────┘
```

### Before / after per page

#### `PageGroundbed` — the duplication fix

| | BEFORE (C4) | AFTER (optimization) |
|---|---|---|
| LEFT (main) | Visualization + form + results | Soil resistivity section + form + results |
| RIGHT (panel) | KPI cards + status + gauge + insights + **depth profile (DUPLICATE)** | Visualization + KPI cards + status + gauge + insights + calc inputs |
| **Duplication?** | **YES** — depth profile duplicated the main viz | **No** — depth profile removed |

#### `PageCableResistance`

| | BEFORE | AFTER |
|---|---|---|
| LEFT | Visualization + form sections + total R | Form sections + total R + (new) calc inputs |
| RIGHT | KPI cards + gauge + flow + diagnostics + insights | Visualization + KPI cards + gauge + flow + diagnostics + insights |

#### `AttenuationPage`

| | BEFORE | AFTER |
|---|---|---|
| Top | Page header + Run button | Page header + Run button + **Inputs Driving This Analysis** |
| Tabs | Inputs / Results / Profile (viz on profile tab) | Unchanged tab structure; the new summary panel sits above |

#### `PageDashboard`

| | BEFORE | AFTER |
|---|---|---|
| LEFT | Visualization only | Project summary card (name, number, client, standard, status) |
| RIGHT | KPI cards + gauge + workflow + activity + status | Visualization + KPI cards + gauge + workflow + activity + status |

---

## New components

### `CalculationInputsUsed`

A reusable, small section that lists the key inputs that drove the most recent calculation. Each row shows:

- **label** (e.g. "Soil resistivity (ρ)")
- **value** + **unit** (e.g. "5,000 Ω·cm")
- **source** (e.g. "Central design settings", "NACE 850 mV", "Station input")

Plus a timestamp of when the calculation was run. Lives in the right panel for groundbed/cable, and at the top of the attenuation page.

**Helper builders** in `src/visualizations/sidePanel/inputSummaries.js`:
- `buildGroundbedInputsUsed(station, project)`
- `buildCableInputsUsed(station, project)`
- `buildAttenuationInputsUsed(input, project)`

Each takes existing store data and produces a flat array of `{label, value, unit, source}`. **Pure functions, no math.**

### `SoilResistivitySection`

A left-side section (or top of page) that shows:

- **Design resistivity** (the value used in calculations) — highlighted
- **Average resistivity** (if different from design) — secondary
- **Layer resistivity table** (when layers are available) — depth-bounded layers
- **Source of value** (Wenner 4-pin survey / User input / Imported / Central design settings)
- **Standard** (NACE / IEEE / Saudi Aramco DES-104 / etc.)

The current data shape doesn't carry resistivity layers in all cases, so the table renders when layers are present and is hidden otherwise. The "source of value" is always shown — engineers can always see where the number came from.

### `Project Summary card` (dashboard left)

A 5-row card on the dashboard left side: Project, Number, Client, Standard, Status. Uses monospace for the project number. Light visual treatment, no animation.

---

## Animation rules (enforced)

Per the prompt's spec, only these animations are allowed in the refactored UI:

| Allowed | Where used |
|---|---|
| Current flow (particles) | Cable widgets, groundbed future |
| Health gauge (arc fill) | All health/score gauges |
| KPI count-up (value tween) | All KpiCard values |
| Validation progress (sequential) | Existing pattern in variants.js |
| Workflow progress (state icons) | WorkflowProgress widget |
| Status changes (tone transition) | StatusList / badges |

| NOT allowed | Status |
|---|---|
| Random movement | none in current code |
| Constant pulsing | none — only the active step's spinner (1.4 s rotation) is constant; the rest are one-shot transitions |
| Decorative motion | none |

The C0 motion foundation (`DURATION`, `EASE`, `usePrefersReducedMotion`) remains the single source of truth. The refactor introduces no new motion primitives.

---

## Page-by-page detail

### `PageGroundbed` refactor

**LEFT side** (main content):
- `SoilResistivitySection` — new left-side section showing design resistivity, source, standard
- `Groundbed Configuration` form (unchanged)
- `Calculated Results` panel (unchanged)
- `InsightCard` items (unchanged)

**RIGHT side** (engineering panel):
- `Groundbed schematic` section — the **primary visualization** (GroundbedVisualizer) now lives here
- `Engineering status` list
- `Visual health` radial gauge
- `Design insights` list
- `Calculation Inputs Used` — new traceability section

**Removed**: the `DepthProfile` widget that was duplicating the main visualization.

### `PageCableResistance` refactor

**LEFT side**:
- Anode Tail Cables form
- Positive Main Cable form
- Negative Circuit Cables form
- Total Cable Circuit Resistance panel

**RIGHT side**:
- `Cable network schematic` section — the **primary visualization** (CableNetworkVisualizer) now lives here
- KPIs (R_T, V drop, margin, R_c)
- Circuit health gauge
- Current flow indicator
- Cable diagnostics status list
- Insights list

### `AttenuationPage` refactor

**TOP of page** (new):
- `Inputs Driving This Analysis` — full traceability panel using `CalculationInputsUsed` with the attenuation input summary

**Below the summary**, the existing tab structure remains (Inputs / Results / Profile). The `ProfileChart` is still rendered on the Profile tab, but engineers can now see the source parameters driving the analysis at a glance.

**Future-ready sections** (per the prompt's "highest priority" spec):
- Cursor inspector — not built yet; the ProfileChart is unchanged
- Sensitivity analysis — not built yet; would consume attenuation engine output (needs a future C4 pass)

### `PageDashboard` refactor

**LEFT side** (new):
- Project summary card — name, number, client, standard, status

**RIGHT side**:
- `Pipeline overview` section — the **primary visualization** (PipelineOverviewCanvas) now lives here
- Project Intelligence widgets (gauge, KPIs, workflow, activity, status)

---

## Responsive behaviour (unchanged from C4)

- Desktop ≥ 1200px: 70 / 30
- Ultrawide ≥ 1600px: 65 / 35
- Tablet < 1200px: drawer

The new sections (`SoilResistivitySection`, `CalculationInputsUsed`, `Project Summary`) all work in any of these layouts.

---

## Tests

The 633 existing tests still pass. No new unit tests were added because the changes are purely architectural (no new domain math). Existing unit tests for `cableVoltage.js` and `groundbedStatus.js` continue to verify the data-shape consumers.

---

## Lint

```
✖ 150 problems (0 errors, 150 warnings)
```

0 errors. Warnings rose from 148 → 150 (+2), all benign (no-unused-vars in new files).

---

## Build

```
✓ 3131 modules transformed.
✓ built in 841ms
```

Clean. No new chunks, no new warnings.

---

## Screenshots

### Before (C4 — has duplication)

Captured during the C4 pass, kept for comparison:

| File | Description |
|---|---|
| `08-side-panel-groundbed.png` | C4 groundbed panel — visualization on LEFT, depth profile widget on RIGHT (DUPLICATE) |
| `09-side-panel-cable-ok.png` | C4 cable panel — visualization on LEFT |
| `10-side-panel-cable-warn.png` | C4 cable panel (warn) |
| `11-side-panel-pipeline.png` | C4 dashboard panel — visualization on LEFT |

### After (optimization)

| File | Description |
|---|---|
| `12-optimized-groundbed.png` | **Optimized** groundbed page — soil resistivity section on LEFT, visualization + KPIs + inputs on RIGHT (no duplication) |
| `13-optimized-cable.png` | **Optimized** cable page — form on LEFT, visualization + KPIs + diagnostics on RIGHT |

To regenerate:

```bash
cd cp-platform
node scripts/optimized-screenshot.mjs
```

---

## Files changed (this pass)

```
cp-platform/src/index.css                                                        |  165 ++
cp-platform/src/pages/PageGroundbed.jsx                                          |   20 +-
cp-platform/src/pages/PageCableResistance.jsx                                    |   12 +-
cp-platform/src/pages/PageDashboard.jsx                                          |   20 ++
cp-platform/src/pages/AttenuationPage.jsx                                        |   10 ++
cp-platform/src/visualizations/index.js                                          |   10 ++
cp-platform/src/visualizations/sidePanel/widgets/CalculationInputsUsed.jsx       |  46 ++  (new)
cp-platform/src/visualizations/sidePanel/widgets/SoilResistivitySection.jsx      |  88 ++  (new)
cp-platform/src/visualizations/sidePanel/widgets/index.js                        |    2 +
cp-platform/src/visualizations/sidePanel/inputSummaries.js                       |  133 ++  (new)
cp-platform/src/visualizations/sidePanel/pageWidgets/GroundbedWidgets.jsx       |   20 +-
cp-platform/scripts/groundbed-demo-serve.mjs                                     |   20 +-
cp-platform/scripts/optimized-screenshot.mjs                                     |  65 ++  (new)
13 files changed, ~611 insertions(+), ~50 modified
```

No deletions in existing files (except a small removal of the depth-profile widget inside `GroundbedWidgets` and the duplicate visualization slot from each page). No changes to calculations, schemas, or business logic.

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

## What was NOT done (future work)

| Item | Reason |
|---|---|
| Attenuation page full right-panel refactor (cursor inspector, sensitivity) | The `AttenuationExplorer` flagship (original C4) doesn't exist yet. The current `AttenuationPage` is a tabbed form. The cursor inspector + sensitivity are part of the flagship, not the page. |
| Component tests for new widgets | C6 pass per the plan (jsdom + Vitest). |
| "Cursor Inspector" widget | Needs the attenuation curve. Defer to flagship build. |
| "Sensitivity Analysis" widget | Needs sensitivity calc output. Defer to flagship build. |
| Real activity log (replace derived activity) | C6 polish pass per the plan. |

---

## Recommended next steps

1. **`AttenuationExplorer` flagship** (original C4) — the biggest remaining productivity win. When built, the cursor inspector and sensitivity widgets can land in the attenuation side panel.
2. **C6 polish pass** — accessibility audit, Lighthouse, component tests, real activity log, bundle split.
3. **`ProjectOverviewMap`** (original C3 second viz) — cross-project rollup for the dashboard.
4. **PDF export of the SVG visualisations** — each visualization is pure SVG and exportable.

Each can reuse the same primitives and follow the same pattern.
