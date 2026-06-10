# Changelog

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
