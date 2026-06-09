# Engineering Verification

## Methodology

Each calculation module is verified against:

1. **Hand calculations** — Independent manual computation
2. **Industry standards** — NACE SP0169, Dwight (1936), Sunde (1968), IEC 60287
3. **Excel reference** — "PCP Calculation sheet.xlsx" values
4. **Golden datasets** — Pre-computed input/output pairs for regression testing

## Verification Framework

The `src/test-utils/verificationFramework.js` module provides:

- `verifyGoldenDataset(name, station, life, expected)` — Compare actual vs expected
- `getTolerance(fieldKey)` — Field-specific tolerances
- `withinTolerance(actual, expected, rel, abs)` — Configurable tolerance checking

## Current Status

| Module | Status | Coverage |
|--------|--------|----------|
| Surface Area | ✅ | 100% |
| Temp Corrected Current Density | ✅ | 100% |
| Current Requirement | ✅ (defect: coating efficiency not applied) | 100% |
| Deepwell Groundbed Resistance | ✅ | 100% |
| Shallow Vertical Groundbed Resistance | ✅ | 88% |
| Cable Resistance | ✅ | 100% |
| TR Circuit | ✅ | 100% |
| Design Life | ✅ | 100% |

## Known Defects

1. **Coating efficiency not applied** — `calculations.js:49-68`
2. **Negative input produces negative output** — `calculations.js:24-27`
3. **allPassed vs allChecksPassed** — key name mismatch
4. **Groundbed type 'distributed' returns 0 resistance** — silent default
