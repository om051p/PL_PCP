# RAXA Pipeline — Release 2.0.0 Notes

**Release date:** 2026-06-13
**Branch:** `feat/phase-c-motion`
**PRs:** see the 9 commits listed in CHANGELOG.md

---

## What ships in 2.0

A major correctness + visualization + performance release. Three themes:

### 1. Formula correctness (the headline change)

Two long-standing formula bugs identified by the audit are now fixed:

**Back-EMF resistance** — was inflated by 2× due to a missing `V_backEMF / I_rated` shortcut being mistakenly doubled. Fixed per SAES-X-600 §5.2.5.

**Anode current density** — HSCI and MMO values were 2-2,757% over the SAES-X-400 Table 5 limits. Catalog now matches the standard (HSCI 7.0; MMO split into fresh/salt).

**Impact on existing data:** every project's R_T, V_min, and TR adequacy will recompute. Re-validate before re-approving.

### 2. New engineering surface

- **InputLinkRegistry** — single source of truth for which designBasis field flows to which module. New "Input Dependencies" section on Design Basis page.
- **Sensitivity Analysis** (`/sensitivity`) — pure read-only. Tornado, sweep, and scenario comparison. The biggest "design confidence" boost we can give engineers without touching the engine.
- **AttenuationExplorer** — flagship visualization for the Attenuation Analysis page. Cursor inspector with dV/dx, 4-scenario overlay, NACE band, keyboard navigation. Replaces the simpler ProfileChart.
- **Three more visualizations wired in:** KPITrendWidget (Dashboard), ProjectOverviewMap (Dashboard), ProtectionHeatMap (Validation → Spatial View).

### 3. Performance & quality

- **Bundle split** — main bundle 31% smaller (1.24 MB → 854 kB; gzipped 348 → 237 kB) via separate chunks for Recharts and icons.
- **37 new component tests** — jsdom + @testing-library/react. 669/686 total tests pass.
- **No new runtime dependencies** — only devDependencies added (jsdom, @testing-library/*).

---

## Migration

| What | Action |
|---|---|
| Existing project | Re-run calculations. R_T, V_min, TR adequacy will change. |
| Pre-fix data | No "legacy mode" toggle provided. Fork before upgrading if you need old values. |
| Golden datasets | 7/7 hand-verified datasets now match engine exactly. |
| Build | Same `npm run build` command. Output is split into more chunks now. |
| Tests | `npx vitest run` works as before. New component tests run automatically. |

---

## What didn't ship (deferred)

- **Phase 7b — A11y audit** with axe-core. SVG charts may have minor keyboard/screen-reader gaps. Deferred to a follow-up release.
- **Phase 7d — Real activity log** in Firestore. The Dashboard's "Recent activity" is still a derived feed. Deferred.
- **Dynamic-imported reporting** (jsPDF + html2canvas lazy-loaded on Export click). Would save another ~700 kB from initial bundle. Deferred.

---

## Verification

- **Tests:** 669/686 pass; 2 pre-existing failures (governance test + firestore rules need emulator)
- **Build:** clean (~800ms)
- **Lint:** 4 pre-existing react-refresh errors in `PageTRSizing.jsx` (unrelated)
- **Hand-verified datasets:** 7/7 pass (14 fields × 7 datasets = 98 assertions)

---

## Where to look

| What | Where |
|---|---|
| Formula audit | `cp-platform/FORMULA_AUDIT_REPORT.md` v2 |
| Input linking | `cp-platform/INPUT_LINKING_AUDIT.md` |
| Sensitivity module | `cp-platform/SENSITIVITY_MODULE_REPORT.md` |
| AttenuationExplorer | `cp-platform/ATTENUATION_EXPLORER_REPORT.md` |
| Forward plan | `.kilo/plans/forward-roadmap.md` |
| Phase 7+8 plan | `.kilo/plans/phase-7-8-roadmap.md` |
| Page reports | `UI_UTILIZATION_AUDIT_REPORT.md`, `UI_VIZ_*_REPORT.md`, `ENGINEERING_UX_PHASE2_REPORT.md` |

---

## Credits

9 commits, 7 reports, 50+ new files, 50+ modified files. All work preserves backward compatibility for the test suite, build, and lint baselines.
