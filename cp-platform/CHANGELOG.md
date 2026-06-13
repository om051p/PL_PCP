# Changelog

## [2.0.0] — 2026-06-13

### Fixed (BREAKING — formula audit)
- **Back-EMF resistance formula corrected** per SAES-X-600 §5.2.5. Was `R_emf = (2 × V_backEMF) / I_rated` (2× over-estimate). Now `R_emf = V_backEMF / I_rated`. Affects every project's `R_T`, `V_min`, and TR adequacy check. All 7 golden datasets updated and verified.
- **MMO / HSCI anode current density** corrected per SAES-X-400 Table 5. HSCI was 10.8 A/m² (was +54% over SAES); now 7.0 A/m². MMO_TUBULAR was 200 A/m² (was 2,757% over fresh-water limit); split into `MMO_TUBULAR_FRESH` (7.0) and `MMO_TUBULAR_SALT` (35.0).
- **Hand-calc verification script** (`scripts/verify_datasets.mjs`) now matches engine: exponential temperature correction with baseTemp=30, design life with U_f=0.85, no coatingEfficiency factor. All 7 datasets verify 100% (14 fields each).

### Added
- **InputLinkRegistry** — `src/engine/inputLinkRegistry.js`. Maps all 11 `designBasis` fields to 38 consumer links across 9 modules, in 5 groups (Environment, Project, Electrical, Material, Site). New "Input Dependencies" section in PageProjectSetup with dropdown selector.
- **InputLinkView** — `src/components/InputLinkView.jsx`. Three render modes (field/module/audit) with field metadata, consumer rows (module/path/purpose), and validation rule chips.
- **Sensitivity engine** — `src/engine/sensitivity/index.js`. Pure read-only functions: `computeTornado`, `computeSweep`, `computeScenarioComparison`. Plus 10 default perturble inputs and 6 default observable outputs.
- **Sensitivity visualizations** — `SensitivityTornado` (SVG bar chart), `SensitivitySweep` (Recharts LineChart), `SensitivityRadar` (Recharts RadarChart).
- **`/sensitivity` page** — new engineer-only page with Configuration + Tornado + Sweep + Scenario Comparison sections.
- **AttenuationExplorer flagship** — `src/visualizations/AttenuationExplorer.jsx`. Replaces the existing `ProfileChart` in AttenuationPage. Adds:
  - 4-scenario overlay (existing / +20% current / −20% current / alternate)
  - NACE protection band overlay (−850 mV)
  - Live cursor inspector (mousemove + ←/→/Home/End keyboard nav)
  - dV/dx local gradient display
  - Embedded sensitivity tornado for V_min
- **Three more visualizations** (built in Phase 6, wired in Phase 6d):
  - `ProtectionHeatMap` — 2D grid (stations × scenarios) on `PageValidation` "Spatial View" tab
  - `KPITrendWidget` — trend charts on `PageDashboard`, derived from `project.revisions[].snapshot`
  - `ProjectOverviewMap` — multi-project rollup on `PageDashboard` (geo or grid view)
- **Component test suite** — jsdom + @testing-library/react + jest-dom. 37 new component tests covering SensitivityTornado, KPITrendWidget, ProtectionHeatMap, ProjectOverviewMap, InputLinkView.

### Changed
- **Bundle split** — `recharts` and `icons` now separate chunks. Main bundle: 1238 kB → 854 kB (31% reduction, gzipped: 348 kB → 237 kB).
- All test, build, lint baselines preserved. 669/686 tests pass (2 pre-existing failures unchanged).

### Migration notes
- **Existing projects will recompute different R_T, V_min, and TR adequacy** after this release. Engineers should:
  1. Re-run calculations for all stations
  2. Review the "Project Health" KPI on the dashboard
  3. Re-validate before re-approving
- A "pre-fix" mode toggle for legacy data is **not** provided. If you need to keep old values, fork the project before upgrading.

### Docs
- `FORMULA_AUDIT_REPORT.md` v2 — documents the v1→v2 changes
- `INPUT_LINKING_AUDIT.md` — coverage summary for 11 fields, 38 links, 9 modules
- `SENSITIVITY_MODULE_REPORT.md` — engine API + visualization guide
- `ATTENUATION_EXPLORER_REPORT.md` — flagship features + usage

---

## [1.1.1] — 2026-06-10

### Fixed
- Fixed `SelectField` crash when `label` prop is `undefined` or `null`.
- Fixed hardcoded linear formula string in `PageCurrentRequirement` ResultRow; now reads formula dynamically from active standard config.
- Fixed hardcoded `"30% spare"` labels in `PageCurrentRequirement` to reflect actual `spareFactor` from standard.
- Added `useId()` fallback for unique `FieldInput` IDs when no label/ariaLabel provided, preventing duplicate DOM IDs.

### Changed
- `PageCurrentRequirement` now reads `spareFactor`, `temperatureCorrection.formula` from `getActiveStandard()` for accurate labeling.

## [1.1.0] — 2026-06-09

### Fixed
- Updated temperature correction to exponential formula (`i_base × 1.25^((T_op − 30) / 10)`) per Excel reference.
- Removed coating efficiency from current requirement calculation to match Saudi Aramco standards.
- Resolved hardcoded single-segment logic; full multi-segment pipeline support enabled.
- Fixed magic number `700 kg/m³` in coke calculation; now using engine-calculated results.
- Added input sanitization and `min={0}` constraints to all numeric engineering fields.
- Fixed revision description reset bug and redundant `@` string splitting in UI.

### Added
- Implemented **Distributed Anode Groundbed** design mode and BOM rules.
- Added **BOM CSV Export** functionality.
- Implemented **React Router 7** for deep linking and history support.
- Added **ErrorBoundary** component for UI crash protection.
- Achieved **100% statement coverage** for core engineering engines (Calculations, Rules, BOM, Optimizer).

### Changed
- Refactored design optimizer to use configurable TR step sizes from `THRESHOLDS`.
- Increased default station anode tail array to 50 for larger project support.
- Refactored navigation to use standard Link/NavLink instead of custom store state.

## [1.0.0] — 2026-06-09
...
