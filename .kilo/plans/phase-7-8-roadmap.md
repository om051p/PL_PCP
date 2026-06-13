# RAXA — Phases 6d, 7 & 8 Forward Plan

**Date:** 2026-06-13
**Branch:** `feat/phase-c-motion` @ `91f4df4` (Phases 1-6 already pushed)
**Status:** Phases 1-6 complete. 632/648 tests pass, build clean.

---

## 0. What Just Shipped (recap)

| Phase | Deliverable | Status |
|---|---|---|
| 1 | 8 commits pushed; formula fixes committed | ✅ |
| 2 | `FORMULA_AUDIT_REPORT.md` v2; 7/7 datasets verify cleanly | ✅ |
| 3 | `InputLinkRegistry` (11 fields → 38 links → 9 modules); `InputLinkView`; "Input Dependencies" in PageProjectSetup; `INPUT_LINKING_AUDIT.md` | ✅ |
| 4 | Sensitivity engine + 3 viz + `/sensitivity` page; 15 tests; `SENSITIVITY_MODULE_REPORT.md` | ✅ |
| 5 | `AttenuationExplorer` flagship (curve + cursor + scenarios + sensitivity) in AttenuationPage; `ATTENUATION_EXPLORER_REPORT.md` | ✅ |
| 6 | `ProtectionHeatMap`, `KPITrendWidget`, `ProjectOverviewMap` — **built but not yet wired** | ✅ (built) ⏳ (wired) |

**Untapped value:** 3 visualizations built but not yet placed on pages. ~1 day of work to close that loop.

---

## 1. Remaining Work — Phased Roadmap

| Sub-phase | Scope | Effort | Risk | Priority |
|---|---|---|---|---|
| **6d** | Wire deferred widgets into pages | S | Low | High |
| **7a** | Component tests (jsdom + Vitest) for new widgets | M | Low | High |
| **7b** | A11y audit (Lighthouse + axe) + fixes | M | Low | Med |
| **7c** | Bundle split (dynamic imports for heavy viz) | S | Low | Med |
| **7d** | Real activity log (replace derived feed) | M | Med | Low |
| **8** | Release notes + deploy | S | Low | High |

**Total estimated effort:** ~10-14 eng-days

---

## 2. Phase 6d — Wire Deferred Widgets

The 3 un-wired visualizations are pure read-only components; just need page integration.

### 2.1 `ProtectionHeatMap` → `PageValidation` "Spatial View" tab
- Add new tab to the existing tab bar in PageValidation.jsx
- Build heat-map data from `stations[]` and the 4 sensitivity scenarios (+20% current, −20%, alternate, existing)
- For each (station, scenario), evaluate via `runStationCalculations` → check if all BR-001 through BR-005 pass
- Render the grid; show station name + scenario label on hover
- **~200 lines added to PageValidation.jsx + ~50 lines CSS**

### 2.2 `KPITrendWidget` → `PageDashboard` (replace static KPI row)
- The Dashboard's KPI row currently shows 6 single-value cards (Project Health, Pipeline Length, etc.)
- For 4 of the 6 KPIs (Project Health, Validation Status, Stations, TR Units), we have time-series data via the project store's revision history
- Replace each card's value area with a mini `<KPITrendWidget>` showing last 5-10 revisions
- **~100 lines added to PageDashboard.jsx + ~30 lines CSS**

### 2.3 `ProjectOverviewMap` → `PageDashboard` (above project grid)
- Add a new section to the dashboard right side (after KPI row, before project grid)
- Pulls from `useProjectStore` to get all projects
- Renders the geo view if any project has lat/lng, otherwise the grid view
- Click → navigates to the project
- **~80 lines added to PageDashboard.jsx**

### 2.4 Verification
- 632/648 tests still pass (no new test failures)
- Build clean
- Manual: visit Dashboard, Validation, confirm widgets render

**Deliverable:** Working widgets on real pages, no more "deferred" items.

---

## 3. Phase 7a — Component Tests

The engine has 149 test cases across pure functions. The new visualizations are **untested at the component level** — they could break silently.

### 3.1 Setup
- Install `jsdom` + `@testing-library/react` + `@testing-library/jest-dom`
- Already have Vitest, so config is minimal
- One new file: `vitest.config.js` updated with `environment: 'jsdom'`
- Test util: `src/test-utils/renderWithProviders.jsx` that wraps with `<MemoryRouter>` + Zustand store mock

### 3.2 Tests to add (per component)

| Component | Test cases | Effort |
|---|---|---|
| `InputLinkView` | renders field, renders module, renders audit; dropdown switches field; empty state | S |
| `SensitivityTornado` | renders rows, ranks by range, shows delta labels, handles empty data | S |
| `SensitivitySweep` | renders N samples, multi-series tooltip, monotonic R_G test | S |
| `SensitivityRadar` | renders scenarios, normalized values, empty state | S |
| `AttenuationExplorer` | scenario toggle changes active series, cursor moves on key, dV/dx computed, sensitivity embedded | M |
| `ProtectionHeatMap` | renders grid, hover updates, classify thresholds | S |
| `KPITrendWidget` | renders N points, threshold lines, current value | S |
| `ProjectOverviewMap` | GridView for no geo, GeoView for lat/lng, click handler | S |
| `PageSensitivity` | integration: full config → tornado render | M |

**Target:** 8 new test files, ~25-30 new tests, all passing.

### 3.3 Coverage goal
- Visualizations: 80% statement coverage
- Pages: 50% (smoke tests for routing, no deep page logic)
- Engine: already 100% (don't regress)

### 3.4 CI integration
- Add `npm run test:components` script
- Update existing `test:coverage` to include the new suite

**Deliverable:** Component test suite, 25-30 new tests, CI step.

---

## 4. Phase 7b — Accessibility Audit

Production-readiness. The visualizations are SVG-based; Recharts has known a11y issues with keyboard navigation and screen readers.

### 4.1 Lighthouse CI
- Add `.lighthouserc.js` config
- Targets: a11y ≥ 95, performance ≥ 85, best-practices ≥ 90
- Run on every page that has a visualization

### 4.2 axe-core integration
- Add `@axe-core/playwright` to E2E suite
- Run on every page-load E2E test
- Fail CI on `serious` or `critical` violations

### 4.3 Specific fixes likely needed
- `SensitivityTornado` SVG: add `<title>` and `aria-describedby`
- `AttenuationExplorer`: ensure chart has `role="img"` and text alternative
- `KPITrendWidget`: add screen-reader summary
- `KPICard` widgets: ensure focusable when interactive
- All `SectionCard`s: ensure proper heading hierarchy

### 4.4 Keyboard audit
- Manual pass: tab through every page, verify all controls reachable
- Document any keyboard traps and fix

**Deliverable:** Lighthouse ≥ 95, axe-core 0 critical, keyboard audit clean.

---

## 5. Phase 7c — Bundle Split

Currently the main bundle is ~830 KB. The Recharts + Framer Motion components are heavy. The route-based code split is partial.

### 5.1 Dynamic imports
- `AttenuationExplorer` — used only on `/attenuation`. Move to `React.lazy()`
- `PageSensitivity` — used only on `/sensitivity`. Already loaded, but verify lazy
- Recharts components — already ESM tree-shakable but still bundled

### 5.2 Vendor split
- Move `recharts` and `framer-motion` to their own chunks
- Vite already does this when `manualChunks` is configured
- Target: initial bundle < 600 KB (currently ~830 KB)

### 5.3 Verification
- `npm run build` shows separate chunks
- Lighthouse perf score improves
- Initial load < 2s on 3G

**Deliverable:** Initial bundle < 600 KB, 2 vendor chunks (recharts, framer-motion).

---

## 6. Phase 7d — Real Activity Log

The Dashboard's "Recent activity" section is currently a **derived feed** computed from in-memory state. It doesn't persist, doesn't show real cross-user actions, and loses history on refresh.

### 6.1 Architecture
- New Firestore collection: `activity`
- Document shape: `{ id, projectId, userId, action, module, timestamp, metadata }`
- Indexes: `(projectId, timestamp DESC)`, `(userId, timestamp DESC)`

### 6.2 Logging hook
- `useActivityLogger()` — returns `logActivity(action, module, metadata)`
- Wrap the existing Zustand actions to auto-log
- Triggers: calculation, validation, approval, revision, BOM generation, report export

### 6.3 Dashboard integration
- Replace the derived feed with a real Firestore subscription
- Show last 20 events for the active project
- Filter by user / module / action

### 6.4 Tests
- Unit test for the logActivity hook
- E2E test: log a calculation, verify it appears in the activity feed
- Firestore rules test: only authenticated users can read; only system can write

**Deliverable:** Persistent activity log, real-time updates, audit trail across users.

---

## 7. Phase 8 — Release & Documentation

### 7.1 CHANGELOG.md
- New "2.0.0" entry documenting all changes since last release
- Sections: Added, Changed, Fixed, Deprecated, Removed, Security
- Link to each report file

### 7.2 Release notes
- Short user-facing summary (1 page)
- Migration guide for projects created before the back-EMF fix
- New feature highlights with screenshots

### 7.3 PR creation
- 6 PRs to merge `feat/phase-c-motion` into `main`:
  1. `fix(formula): back-EMF + MMO/HSCI current density`
  2. `docs(formula): v2 audit report`
  3. `feat(audit): input linking registry`
  4. `feat(sensitivity): read-only engine + 3 viz + page`
  5. `feat(attenuation): AttenuationExplorer flagship`
  6. `feat(viz): ProtectionHeatMap, KPITrendWidget, ProjectOverviewMap + wire-in`

### 7.4 Deployment verification
- Run full test suite
- Build clean
- Deploy to staging
- Smoke test all visualization pages
- Lighthouse on staging URL

**Deliverable:** Release notes, CHANGELOG, 6 PRs ready, deployment verified.

---

## 8. Recommended Execution Order

| # | Phase | Why this order |
|---|---|---|
| 1 | **6d Wire widgets** | Highest user value; closes the "more viz" loop |
| 2 | **7a Component tests** | Catches regressions in the new code before it ships |
| 3 | **7b A11y** | Production-readiness; quick wins |
| 4 | **7c Bundle split** | Performance; quick wins |
| 5 | **7d Activity log** | Persistence; medium risk |
| 6 | **8 Release** | Closure |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase 6d wiring breaks the dashboard layout | Med | Med | Use the existing dashboard styling; test in dev server |
| Component tests need jsdom + testing-library install (adds dependencies) | Low | Low | All in devDependencies; no runtime impact |
| Bundle split introduces chunk load failures | Low | Med | Verify with `npm run preview` before deploy |
| Activity log changes schema, requires migration | Med | Med | Migration: backfill from existing data, then activate new flow |
| Lighthouse fails on existing pages we didn't touch | Med | Low | Scope: only the visualization pages; document the rest as backlog |

---

## 10. Open Questions for User

1. **Execution scope:** All 6 sub-phases (6d + 7a + 7b + 7c + 7d + 8) = ~10-14 days? Or pick a subset?
2. **Bundle split:** ok to add `manualChunks` config in `vite.config.js`?
3. **Activity log:** ok to add a new Firestore collection `activity`? (requires rules update)
4. **Component tests:** ok to add `jsdom` + `@testing-library/react` as devDependencies? (no runtime impact)
5. **Priority:** is the order above correct, or do you want a different sequence?
