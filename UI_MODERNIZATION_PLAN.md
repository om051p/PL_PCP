# RAXA Platform — Enterprise UI/UX Modernization Plan

> **Status:** Planning only. No code changes proposed yet.
> **Scope:** 24 pages, 9 components, ~29.6k LoC across `cp-platform/src/`.
> **Working tree:** ⚠️ 45 modified files, 6 unpushed commits. Modernization must be staged behind a stable base.

---

## 0. Reality Check — What's Already There

A line-by-line rewrite would duplicate existing work. This audit is the baseline for everything that follows.

| Area | Current state | Source |
|---|---|---|
| Design tokens (light + dark) | Full palette, radii, shadows, fonts | `src/index.css:1-200` |
| Dark theme | `bg #09090b · surface #121214 · card #18181b · border #27272a` ✓ matches spec | `src/index.css:42-58` |
| Typography | IBM Plex Sans + JetBrains Mono loaded via Google Fonts | `index.html:10` |
| Status pipeline | 7 states: `draft → input-complete → calculated → engineering-review → approved → issued-for-construction` | `src/components/ui.jsx:StatusBadge` |
| KPI primitives | `ResultKPICard`, `StatCard` (label/value/unit/sub/color) | `src/components/ui.jsx:73-200` |
| Workflow stepper | `WorkflowStepper({ currentStatus })` | `src/components/ui.jsx` |
| Validation UI | `ValidationErrors`, `CheckRow`, `InfoBox` (4 variants), `ConfirmDialog` | `src/components/ui.jsx` |
| Layout shell | `Sidebar` (220px ↔ 52px) + `TopBar` (56px) + `ErrorBoundary` in `App.jsx:33-88` | `src/components/layout.jsx:1-604`, `src/App.jsx:33-88` |
| Page header pattern | `dashboard-header` pattern with h1 + subtitle + primary action | `src/pages/PageDashboard.jsx:204-216` |
| Dashboard cards | Engineering checklist, progress %, status badge, metadata row, action row | `src/pages/PageDashboard.jsx:84-180` |
| Table row component | `StationTabs` exists; per-page tables vary | `src/components/StationTabs.jsx` |
| Search/filter on workspace | Hub page with module registry | `src/pages/PageWorkspace.jsx` (133 LoC) |
| Approval workflow | Implemented at store level (Phase 4 in `IMPLEMENTATION_ROADMAP.md`) | `src/store/authStore.js` |
| Mobile/responsive | `html, body, #root { overflow: hidden }` — **app is currently desktop-locked** | `src/index.css:140-144` |
| Skeleton loaders | Not present | — |
| Column resize on tables | Not present | — |
| Sticky table headers | Partial (CSS only, no JS) | — |
| Sort/filter primitive | Not present as a reusable component | — |

**Implication:** Roughly 60–70 % of the requested system is *implemented but inconsistently applied* across the 24 pages. The biggest wins come from (a) **enforcement of the design tokens already defined**, (b) **one reference page done at production quality**, and (c) **closing the responsive + a11y gaps**.

---

## 1. Identified Gaps (By Category)

### 1.1 Design system layer

- **Token leakage.** Pages mix CSS variables (`var(--text-primary)`) with inline styles and hard-coded hex. Of 24 pages, 18 contain hard-coded hex like `#1a3a5c` or `#fafafa`. **Fix:** audit + replace with `var(--token)` or Tailwind utilities.
- **No `tokens.js` module.** All values live in CSS. JS code that needs colors (e.g. chart palettes) hardcodes them. **Fix:** add `src/design/tokens.js` exporting the same names for JS consumers.
- **Spacing scale not enforced.** 4/6/8/12/16/24 px is used ad-hoc; no `space-1`…`space-12` utility. **Fix:** add Tailwind theme extension in `tailwind.config` or CSS custom-property scale.
- **Tabular numbers not applied globally.** JetBrains Mono is loaded but `font-variant-numeric: tabular-nums` is set inconsistently. **Fix:** apply on `body` + override per `font-mono` class.
- **Status color contrast in dark mode.** Some `.dark .status-badge--*` use light text on light bg (e.g. `dark .status-badge--draft` text `#94a3b8` on `#1e293b` — fails AA for 13px). **Fix:** audit all status variants under dark.

### 1.2 Information hierarchy

- **Inconsistent page-header pattern.** `PageDashboard` uses `dashboard-header`, `PagePipeline` uses `.page-header`, others use ad-hoc `<h1>`. **Fix:** introduce `<PageHeader title subtitle actions>` primitive, migrate.
- **KPI placement varies.** Some pages show outputs in `ResultKPICard` grid, others in raw `ResultRow`. **Fix:** standardize: **Primary Result = large KPI card; Secondary = dense table; Metadata = footer row**.
- **No global "needs recalculation" indicator on non-output pages.** The `warning-banner` exists in `App.jsx:165-182` but is one-size-fits-all. **Fix:** show recalc-required chips per-station inside the sidebar.

### 1.3 Dashboard

- No search, no filter chips, no sort, no bulk actions, no recent activity feed, no global KPIs.
- Cards are visually uniform — no density control, no list/grid toggle.
- **Fix:** introduce `<DashboardShell>` with toolbar (search, filter, view-mode toggle, bulk actions) + a global KPI strip + activity feed sidebar (collapsible).

### 1.4 Navigation (Sidebar)

- `Sidebar` groups: project, pipeline modules, design, output. No progress, no completion, no stale indicators.
- **Fix:** add per-route completion dot (using `WorkflowStepper` data) and a "needs recalc" warning icon.

### 1.5 Forms

- `FieldInput` exists, but pages wrap it inconsistently — some use `SectionCard`, some use raw `<div className="form-grid">`.
- **Fix:** introduce `<FormSection title description sticky>` primitive. Move action buttons into a sticky `<FormActions>` footer (cancel left, save right, recalc middle).

### 1.6 Tables

- No unified table primitive. Each page rolls its own.
- **Fix:** add `<DataTable columns rows stickyHeader resizable searchable exportable>` (lean, ~150 LoC, no new dep — uses native `<table>` for a11y). All numeric cells get `class="num"` → `tabular-nums`.

### 1.7 Validation workspace

- `ValidationErrors` exists but lacks severity grouping, search, and remediation CTAs.
- **Fix:** redesign as a 3-pane layout: filters (left) · grouped list (middle) · remediation detail (right). Severity uses icon + color (a11y: not color-only).

### 1.8 Workflow visibility

- Status badge exists. Recalc-required, lock, approval, review are partial.
- **Fix:** add a single `<WorkflowRibbon>` primitive used at the top of every calculation page. State machine defined once in `src/design/workflowStates.js`.

### 1.9 Accessibility

- No skip link, no focus-trap on dialogs (uses native `<dialog>`? — likely not), no keyboard shortcuts, no live-region for async results, no reduced-motion media query.
- `lucide-react` icons used without `aria-label` in some cases.
- **Fix:** add `src/hooks/useFocusTrap`, `<VisuallyHidden>`, `prefers-reduced-motion` overrides, audit all icon-only buttons.

### 1.10 Performance

- `useProjectStore` selectors pull whole `project` object in some pages (re-render storm risk).
- Inline arrow handlers in lists (`onClick={(e) => e.stopPropagation()}`).
- No memoization on large project cards.
- **Fix:** select narrow slices, memoize `ProjectCard`, virtualize any list > 100 rows (use `react-window` only if needed — currently nothing approaches 100 rows in a single view).

### 1.11 Responsive

- `html, body, #root { overflow: hidden }` blocks mobile.
- Sidebar is fixed 220px.
- Tables have no horizontal scroll container.
- **Fix:** introduce a `useBreakpoint()` hook (`sm < 768 < md < 1024 < lg < 1280 < xl < 1536`). Sidebar becomes off-canvas below `md`. Tables get a `overflow-x: auto` wrapper.

---

## 2. Phased Implementation Plan

Each phase ships behind a feature flag, with tests, before the next starts. **No phase modifies business logic, calculations, schemas, or API contracts.**

### Phase M0 — Foundation (≈ 1–2 days)
**Goal:** Make the modernization safe to roll out.

1. **Stabilize working tree.** Commit or stash the 45 modified files, push the 6 commits, resolve the `attenuationStoreSlice.js` deletion. Decision needed: keep deletion or restore.
2. **Add `src/design/tokens.js`** — JS export of every CSS variable (colors, spacing, radii, status palette). No behavior change.
3. **Add `vitest` snapshot tests** for `ui.jsx` primitives so any change is reviewed.
4. **Add ESLint rule** banning hard-coded hex in `src/pages/**` and `src/components/**` (warn, not error, initially).
5. **Add `prefers-reduced-motion` overrides** in `index.css`.
6. **Add skip-link + `<VisuallyHidden>` primitive** in `ui.jsx`.

**Risks:** Low. No visual or behavior change. **Gate:** build + existing test suite pass.

### Phase M1 — Design System Hardening (≈ 3–4 days)
**Goal:** Existing primitives work everywhere; new primitives for table, form, header.

1. **New primitives in `src/components/ui.jsx`:**
   - `<PageHeader title subtitle icon actions breadcrumbs>` — replace all ad-hoc headers.
   - `<FormSection title description sticky>` + `<FormActions>` — sticky footer.
   - `<DataTable>` — sortable headers, sticky header, optional search/pagination, cell-level `class="num"`. ~150 LoC, native `<table>`, no dep.
   - `<KPIBlock value unit status threshold trend margin>` — enterprise KPI with all required fields per spec.
   - `<WorkflowRibbon>` — top-of-page workflow state strip.
   - `<EmptyState icon title description action>` — unify 5 existing empty states.
2. **Token enforcement.** Sweep `src/pages/**` + `src/components/**`, replace hard-coded hex with `var(--…)` or Tailwind classes. Allow inline styles only for dynamic values.
3. **Tabular numbers globally** on `body` and `.num` class.
4. **Dark-mode contrast audit** — fix any failing status badge combinations.

**Risks:** Medium. Visual regressions possible. **Gate:** visual diff on 5 key pages, `npm run verify` (lint + test + format).

### Phase M2 — Reference Page: Dashboard (≈ 2–3 days)
**Goal:** One page done at the new quality bar. Becomes the template.

Redesign `PageDashboard`:
- Toolbar: search, status filter chips, view-mode toggle (grid/list), sort, bulk actions (archive/delete).
- Global KPI strip: Active projects, In Review, Approved, Needs Recalc, Total Stations.
- High-density project cards in a 12-col CSS grid.
- Activity feed sidebar (collapsible, "recent 20 events" from store).
- Empty state uses new `<EmptyState>`.

Document the patterns in `docs/ui/dashboard-reference.md` with screenshots.

**Risks:** Medium. **Gate:** Playwright snapshot of dashboard states (empty, 1, many, archived).

### Phase M3 — Page Migration Wave 1 (≈ 4–5 days)
**Goal:** Apply M1 primitives to the 5 highest-traffic pages.

Order (by user impact + complexity):
1. `PageProjectSetup` (272 LoC) — design basis form.
2. `PageValidation` (267 LoC) — 3-pane layout.
3. `PageReport` (323 LoC) — printable + screen.
4. `PagePipeline` (214 LoC) — form-heavy.
5. `PageDashboard` already done in M2.

Each page: replace header, migrate to `FormSection`/`FormActions`, swap ad-hoc tables for `<DataTable>`, wrap KPIs in `<KPIBlock>`, add `<WorkflowRibbon>`.

**Risks:** High. Per-page manual review. **Gate:** per-page Playwright snapshot, manual sign-off, screenshot before/after.

### Phase M4 — Page Migration Wave 2 (≈ 4–5 days)
Remaining 17 pages. Group by pattern:
- Form pages: `PageGroundbed`, `PageCableResistance`, `PageTRSizing`, `PageCurrentRequirement`, `PageBOM`, `PageOptimizer`, `PageImport`, `AttenuationPage`, `PageTank`, `PageVessel`. All use the same `FormSection` + `FieldInput` pattern.
- Auth pages: `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `UserManagementPage`. Already styled, minor consistency pass.
- Reference pages: `PageHistory`, `SettingsPage`, `PageWorkspace`. Mostly read.

**Risks:** Medium. **Gate:** same per-page.

### Phase M5 — Accessibility & Performance (≈ 2–3 days)
- `useFocusTrap` on all dialogs (`ConfirmDialog`, `RevisionCompareDialog`, `SessionTimeoutDialog`).
- Audit all icon-only buttons for `aria-label`.
- Add `role="status"` live regions for async calculations.
- Memoize `ProjectCard` and large table rows.
- Selector audit: replace `useProjectStore((s) => s)` with narrow selectors.
- Lighthouse CI in GitHub Actions (target: a11y ≥ 95, perf ≥ 85).

**Risks:** Low. **Gate:** Lighthouse report, axe-core run, no new test failures.

### Phase M6 — Responsive & Polish (≈ 2–3 days)
- `useBreakpoint()` hook.
- Sidebar off-canvas below `md`.
- Tables get horizontal scroll.
- Print stylesheet for `PageReport` + `PageBOM`.
- Reduced-motion smoke test.

**Risks:** Medium. Some pages will need real layout work. **Gate:** Playwright at 4 viewports (375 / 768 / 1280 / 1920).

### Phase M7 — Documentation & Sign-off (≈ 1 day)
- `docs/ui/design-system.md` — every primitive, props, do/don't.
- `docs/ui/migration-guide.md` — how to apply M1 primitives to a new page.
- Modernization report (per deliverable #8 in the prompt).
- Changelog entry.

---

## 3. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Working tree conflicts during multi-day refactor | High | High | Complete M0 first; cut a `chore/ui-modernization` branch |
| Visual regressions on legacy pages | High | Medium | Per-page Playwright snapshots before/after; manual review |
| Hard-coded hex in calculations/test fixtures breaks token replacement | Medium | Low | Restrict ESLint rule to `src/pages/**` + `src/components/**` |
| `font-variant-numeric: tabular-nums` shifts column widths | Medium | Low | Apply only to `.num` class, not `body` |
| Responsive changes break desktop layout | Medium | Medium | Ship behind `useBreakpoint()` defaulting to current behavior |
| A11y audit reveals deep issues (focus order, ARIA) | Medium | Medium | M5 is dedicated to a11y; budget for rework |
| Users perceive "no functional change" as low value | Medium | Low | Show before/after screenshots in M2 sign-off |

---

## 4. Effort & Sequencing

| Phase | Effort (eng-days) | Output | Gate |
|---|---|---|---|
| M0 Foundation | 1–2 | tokens.js, lint rule, skip-link, reduce-motion | tests pass |
| M1 Design system | 3–4 | 6 new primitives, token sweep | lint + snapshot |
| M2 Dashboard reference | 2–3 | one production page + docs | visual sign-off |
| M3 Wave 1 (5 pages) | 4–5 | 5 migrated pages | per-page snapshot |
| M4 Wave 2 (17 pages) | 4–5 | all pages migrated | per-page snapshot |
| M5 A11y + perf | 2–3 | focus traps, memo, Lighthouse CI | axe + Lighthouse |
| M6 Responsive + polish | 2–3 | breakpoint hook, off-canvas, print | 4-viewport test |
| M7 Docs + report | 1 | design-system.md, report, changelog | sign-off |
| **Total** | **~19–26 days** | | |

---

## 5. Open Questions (Need User Input)

1. **Working tree:** commit/stash 45 modified files first, or modernize on the current dirty tree? (Recommended: commit/stash.)
2. **`attenuationStoreSlice.js` deletion:** confirm the deletion is intentional; nothing imports it now, but I want explicit sign-off.
3. **Phase priority:** if budget caps us, which phase is non-negotiable? (My recommendation: M0 + M1 + M2 + M5 ship minimum-viable modernized platform; M3/M4 can be done incrementally page-by-page after.)
4. **Charts:** the spec mentions trend. `recharts` is installed. Do we standardize on Recharts for all KPI trends? (I would, yes.)
5. **Headless component library:** spec mentions patterns from shadcn/Radix, but no such lib is installed. Stay custom (current approach), or add `@radix-ui/react-*` primitives? (Current custom approach is fine; adding Radix would inflate bundle ~30 KB.)
6. **Brand color:** existing `--brand: #1a3a5c` (navy) differs from the spec's primary `#2563eb` (blue). Keep brand navy + adopt `#2563eb` as the new `--primary`? Or replace brand entirely? (I'd keep brand and add `--primary` as a separate accent.)

---

## 6. What I Will NOT Do

- Modify `src/store/projectStore.js`, `src/store/authStore.js`, or any calculation module.
- Touch `src/engine/**` or `resistivityEngine.js`.
- Change Firestore schema, Firebase config, or `firestore.rules`.
- Add dependencies without explicit approval.
- Commit on your behalf.
- Push to `origin`.
- Make any change that alters a calculation's output.

---

## 7. Next Step

Awaiting your decision on **Section 5 (Open Questions)** and your choice of starting phase. Once approved, I will:

1. Create a feature branch `chore/ui-modernization` (off main, after the working tree is stabilized).
2. Implement M0 in one PR. Tests must pass. No visual change.
3. Pause for your review before M1.

If you want to skip the plan and have me jump straight to a smaller scoped task (e.g. "make the dashboard match the spec"), say the word and I'll narrow scope first.
