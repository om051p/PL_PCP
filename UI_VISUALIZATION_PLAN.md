# RAXA Platform — Engineering Visualization & Motion Design Plan (Phase C / M8)

> **Status:** Planning only. No code changes proposed yet.
> **Builds on:** `UI_MODERNIZATION_PLAN.md` (M0–M7). Phase C is M8.
> **Working tree:** clean. 14 unpushed commits from M0–M7 + previous phases.

---

## 0. Reality Check

| Area | Current state | Implication |
|---|---|---|
| `src/visualizations/` | Does not exist | Greenfield directory |
| Recharts usage | 1 file (`ProfileChart.jsx`, just added) | Viz-light |
| Framer Motion usage | 0 (installed, unused) | Motion-light |
| SVG/Canvas/d3 | 0 (only icons + small inline svg) | Custom render only |
| Engine output shape | `station.lastCalcResult`, `pipelineSegments[]`, `groundbed{}`, `tr{}` | Rich data available |
| Attenuation engine | Exists in `src/engine/modules/attenuationEngine.js` | Underused |
| Existing `AttenuationPage` | 593 LoC, already consumes `ProfileChart` | Best target for the flagship viz |

**Bottom line:** 1 chart, 0 motion, no dedicated viz dir. The prompt's 7 visualizations + motion system + empty states is greenfield. Plan accordingly.

---

## 1. The 7 Visualizations — What & Why

| # | Component | Engineer value | Complexity | Risk |
|---|---|---|---|---|
| 1 | `PipelineOverviewCanvas` | Project layout in 5 s vs reading 5 forms | High (SVG layout engine) | Med — geometry math |
| 2 | `GroundbedVisualizer` | Compliance status at a glance | Med (parametric SVG) | Low |
| 3 | `CableNetworkVisualizer` | Voltage drop / cable health | High (electrical graph) | Med — path tracing |
| 4 | `AttenuationExplorer` (flagship) | Multi-scenario compare + NACE band | **Very high** | High — flagship, easy to overscope |
| 5 | `ProtectionHeatMap` | Spatial protection state | Med (2D grid SVG) | Low |
| 6 | `ProjectOverviewMap` | Multi-project rollup | Low–Med (list/grid if no real geo) | Low |
| 7 | `KPITrendWidget` | Change over time / thresholds | Low (recharts + animation) | Low |

**Productivity gains (estimates):**
- 1 (Pipeline): 30-60 s/orientation → 3-5 s. Big for reviewers and clients.
- 2 (Groundbed): compliance review 5 min → 30 s.
- 3 (Cable): voltage drop diagnosis 10 min → 1 min.
- 4 (Attenuation): scenario compare 30 min → 5 min (the biggest win).
- 5 (Heat map): issue spotting 10 min → 30 s.
- 6 (Project map): manager rollup 5 min → 30 s.
- 7 (KPI): trust in numbers — no real time saving, but perceived quality ↑.

---

## 2. Dependencies Decision

| Library | Status | Verdict |
|---|---|---|
| `recharts` ^3.8 | Installed | **Use** for AttenuationExplorer, KPITrendWidget, HeatMap |
| `framer-motion` ^12.40 | Installed (unused) | **Use** for motion system |
| `lucide-react` ^1.17 | Installed | Continue using for icons |
| `d3` | Not installed | **Skip** — Recharts covers curve/axis needs |
| `react-flow` | Not installed | **Skip** — adds ~50 KB; custom SVG handles it |
| `three.js` | Not installed | **Skip** — overkill |
| `react-window` | Not installed | **Add only if** any viz list exceeds 100 rows. None expected. |

**Decision: zero new dependencies.** All visualizations built on SVG + Recharts + Framer Motion.

---

## 3. Phased Sub-Plan (Phase C / M8)

Total: **~18-25 eng-days**. Each phase ships behind a feature flag, tested, reviewed before next.

### Phase C0 — Motion Foundation (2-3 d)
**Goal:** Reusable motion primitives; one source of truth for timing and easing.

1. `src/motion/variants.js` — `pageVariants`, `cardHoverVariants`, `sidebarVariants`, `validationStepVariants`, `staggerContainer`.
2. `src/motion/timings.js` — constants: `instant 80`, `fast 150`, `base 200`, `slow 320`, `reveal 400`. Easing presets.
3. `src/hooks/useAnimatedNumber.js` — value interpolation over 200-400 ms (smooth KPI tween, no flashy bounce). `prefers-reduced-motion` aware.
4. `src/hooks/usePrefersReducedMotion.js`.
5. Apply to existing `ErrorBoundary` fallback, `Sidebar` active indicator, `WorkflowStepper` step transitions, KPI cards.
6. `@media (prefers-reduced-motion)` overrides in `index.css`.

**Risks:** Low. **Gate:** visual diff on Sidebar + Dashboard.

### Phase C1 — Visualization Primitives (2-3 d)
**Goal:** Shared building blocks for every viz.

1. `src/visualizations/VisualizationCanvas.jsx` — responsive SVG wrapper, dark mode, fixed aspect ratio, ARIA `role="img"`, fallback text.
2. `src/visualizations/VizTooltip.jsx` — accessible (focus, ESC, ARIA-describedby). Dark/light aware.
3. `src/visualizations/VizLegend.jsx`, `VizAxis.jsx`, `VizGrid.jsx`.
4. `src/visualizations/ZoomPan.jsx` — SVG `viewBox` zoom/pan with keyboard (`+/-`, `0` reset, arrows), touch pinch, mouse wheel. ~80 LoC.
5. `src/visualizations/ScenarioToggle.jsx` — multi-scenario overlay toggles.
6. `src/visualizations/ProtectionBand.jsx` — NACE -850 mV shaded band overlay.
7. `src/visualizations/EmptyState.jsx` (consolidates the existing ad-hoc ones).

**Risks:** Low. **Gate:** snapshot tests + a11y axe pass on each primitive.

### Phase C2 — Pipeline Overview + Groundbed (3-4 d)
**Goal:** First two engineering visualizations.

**`PipelineOverviewCanvas.jsx`**
- Layout: stations laid out along an X axis by `cumulativeLengthM`. Groundbeds and TRs as offset nodes.
- Color by status (draft / calculated / review / approved / issued) using existing status palette.
- Hover tooltip: station name, soil resistivity, design current, last calc timestamp.
- Click → navigate to that station's page.
- `ZoomPan` from C1.
- Lives on `PageDashboard` (top card) and a new "Project Map" tab on `PageProjectSetup`.
- ARIA: each station is a focusable `g` with `tabindex=0`, `role="button"`, `aria-label`.

**`GroundbedVisualizer.jsx`**
- Two modes: horizontal (anode string) and vertical (deep well).
- Parametric SVG: positions anodes by spacing, depth, length. Quantity, spacing, length, depth, total resistance, safety margin shown as inline labels.
- Status colors: green / amber / red mapped to thresholds (existing `classifySoilResistivity` from `resistivityEngine.js:6`).
- Lives on `PageGroundbed` (replaces the numeric form when status is `calculated`).

**Risks:** Medium — geometry math. **Gate:** Playwright snapshot for 3 cases (horizontal, vertical, deep well).

### Phase C3 — Cable Network + Project Overview (3-4 d)
**Goal:** Electrical path and project rollup.

**`CableNetworkVisualizer.jsx`**
- Node-graph: TR → positive cable → groundbed → earth return → pipeline → negative cable → TR.
- Cable colors by voltage drop: green < 5%, amber 5-10%, red > 10%.
- Hover: cable length, resistance, V drop, % of limit.
- Reuses `ZoomPan` + `VizTooltip`.
- Lives on `PageReport` (new section) and `PageCableResistance`.

**`ProjectOverviewMap.jsx`**
- If project has lat/lng: 2D scatter on a stylized grid (no real map tiles — keeps zero-dep).
- If no geo: high-density project grid (12-col) sorted by status, with mini `PipelineOverviewCanvas` per project.
- Lives on top of `PageDashboard`.

**Risks:** Medium. **Gate:** Playwright snapshot for 3 cases (with/without geo, 1/5/many projects).

### Phase C4 — Attenuation Explorer (Flagship) (4-5 d)
**Goal:** The biggest productivity win.

**`AttenuationExplorer.jsx`**
- Recharts `<LineChart>` with potential (mV) vs distance (km).
- `<ProtectionBand>` overlay (NACE -850 mV).
- Station markers (vertical lines + labels), groundbed markers, TR marker.
- `<ScenarioToggle>` for 4 scenarios: existing current, +20% current, -20% current, alternate groundbed.
- Live cursor: `onMouseMove` over chart, animated crosshair line + dot, hover panel shows distance / potential / protection state / local gradient (dV/dx computed from neighbours).
- `useAnimatedNumber` for value panel updates.
- `prefers-reduced-motion`: crosshair snaps, no animation.
- Lives on `AttenuationPage` (replaces current 593 LoC implementation in stages — keep existing page working, add viz as new section first).

**Risks:** High. **Gate:**
- Visual regression on existing attenuation outputs.
- A11y: keyboard cursor control (`←/→` moves crosshair, `Home/End` jump to ends).
- Performance: 60 fps cursor tracking with up to 1000 data points.

### Phase C5 — Protection Heat Map + KPI Animations (2-3 d)
**Goal:** Spatial heatmap and animated KPIs.

**`ProtectionHeatMap.jsx`**
- 2D grid (stations × scenarios or stations × time).
- Cell color: green/amber/red by protection status.
- Hover: scenario name, station name, mV value, status.
- Reuses `VizTooltip` + `VizLegend`.
- Lives on `PageValidation` (new "Spatial View" tab).

**KPI animations**
- `useAnimatedNumber` applied to all existing `ResultKPICard` and `StatCard` instances.
- Page-wide: when calculation re-runs, all KPI numbers tween (200-400 ms) to new values.
- Lives on every page that shows KPIs.

**Risks:** Low–Med. **Gate:** no jank on rapid recalculation.

### Phase C6 — Empty States + A11y + Performance (2-3 d)
**Goal:** Production polish.

1. Modern empty states (example diagrams, quick-start CTAs, "Import Excel", "New Project Wizard").
2. Lighthouse CI: a11y ≥ 95, perf ≥ 85.
3. axe-core run on every visualization page.
4. Keyboard audit: every viz navigable without mouse.
5. Screen reader smoke test (VoiceOver / NVDA).
6. Memo + selector audit for the new viz components.
7. Bundle size check (Recharts + Framer Motion already paid; no new deps).
8. `docs/ui/visualization-guide.md` — when to use which viz, do/don't.
9. Modernization report + screenshots (per deliverable #8).

**Risks:** Low. **Gate:** Lighthouse + axe green.

---

## 4. Effort & Sequencing

| Phase | Effort (eng-days) | Output | Gate |
|---|---|---|---|
| C0 Motion foundation | 2-3 | variants, timings, animated number hook | visual diff |
| C1 Viz primitives | 2-3 | 7 primitives | snapshot + a11y |
| C2 Pipeline + Groundbed | 3-4 | 2 production viz | Playwright snapshot |
| C3 Cable + Project map | 3-4 | 2 production viz | Playwright snapshot |
| C4 Attenuation Explorer (flagship) | 4-5 | flagship viz | visual + perf |
| C5 Heat map + KPI anim | 2-3 | 2 viz + KPI tween | no jank |
| C6 Empty states + a11y + perf | 2-3 | polish | Lighthouse + axe |
| **Total** | **~18-25 d** | | |

---

## 5. Integration with M0–M7

- Phase C is **M8** in the existing plan. It depends on M1 (primitives like `<PageHeader>`, `<FormSection>`) and M3 (page migration).
- All new primitives (PageHeader, DataTable, KPIBlock, WorkflowRibbon) from M1 will be **used by** the visualization pages — e.g. `AttenuationExplorer` will live inside a `<SectionCard>` with a `<KPIBlock>` strip above it.
- The existing `ProfileChart` from `analytics/ProfileChart.jsx` becomes the basis for the attenuation curve; we extend, not replace.

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Flaghip AttenuationExplorer overscopes | High | High | Build in vertical slices: curve → protection band → scenarios → crosshair. Stop after crosshair if needed. |
| SVG perf on large datasets | Med | Med | Cap data points to 500; use `requestAnimationFrame` for cursor tracking; memoize. |
| Accidentally modifying calc outputs in viz | Med | **Critical** | All viz consume read-only snapshots. Snapshot tests on engine output hash before/after each phase. |
| A11y misses on SVG charts | High | Med | a11y primitives (`VizTooltip`, `role="img"`, `aria-label`) baked into C1. axe in C6. |
| Framer Motion bundle bloat | Low | Low | Tree-shake; only import used variants. |
| User "no functional change" perception | Med | Low | Side-by-side screenshots in C2/C3/C4 sign-off. |
| Conflict with the 14 unpushed commits | Low | Low | Phase C branch (`feat/visualization-layer`) off main after push or commit. |

---

## 7. Guardrails (per prompt)

I will:
- ✅ Consume existing engine outputs read-only. No new calculations.
- ✅ Not modify `calculations.js`, `attenuationEngine.js`, `resistivityEngine.js`, `validation.js`.
- ✅ Not change `projectStore.js` action shapes (only add `useMemo`-friendly selectors if needed).
- ✅ Not add dependencies without explicit approval.
- ✅ Not commit without explicit approval.
- ✅ Not push to origin.
- ✅ Keep all existing tests green (`npm run test:coverage` + `npm run test:e2e`).

---

## 8. Open Questions (Need User Input)

1. **Sequence:** Append as M8 after M0–M7? Or start C0-C6 immediately, in parallel with M0–M7? My recommendation: **M8 after M0–M1 land** (need design-system primitives first).
2. **Push the 14 commits first?** The 14 unpushed commits (6 pre-existing + 8 from M0–M7 stabilization) are a prerequisite to branching cleanly. Recommendation: **push them before starting C0**.
3. **Flagship scope cap:** If C4 (Attenuation Explorer) is the only thing shipped, is that acceptable? It's the biggest productivity win by far.
4. **Empty states:** "Modern empty states" can be 1-day quick wins OR a full design pass. My recommendation: 1-day version now, polish in C6.
5. **No new dependencies confirmed?** I propose zero new deps. If you want `react-flow` for cable network, add ~50 KB and a different visual feel.
6. **Mockup or implementation first?** Some teams want wireframes signed off before code. Others prefer code + screenshots. My recommendation: **small implementation (C0 + C1) → review → continue**.

---

## 9. Next Step

Awaiting your decision on:
- Section 8 questions (1-6)
- Whether to push the 14 unpushed commits first
- Which phase to start with

Once approved, I will:
1. (If you confirm) `git push origin main` for the 14 unpushed commits.
2. Create branch `feat/visualization-layer` off main.
3. Implement C0 in one PR. Tests must pass. No visual change to existing pages.
4. Pause for your review before C1.
