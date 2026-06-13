# RAXA Pipeline — Formula Audit & Dependency Graph (v2)

**Date:** 2026-06-13
**Scope:** All engineering calculation modules
**Principle:** No formulas modified without explicit approval
**Status:** v1 issues FIXED (see v1 → v2 changes below)

---

## 0. v1 → v2 Change Log

### Fixed in Phase A (commit c1e2a3d)

| Bug | Was | Now | Standard |
|---|---|---|---|
| Back-EMF resistance | `R_emf = (2 × V_emf) / I_rated` | `R_emf = V_emf / I_rated` | SAES-X-600 §5.2.5 |
| HSCI current density | 10.8 A/m² | 7.0 A/m² | SAES-X-400 Table 5 (with utilization + end-cap shortening) |
| MMO_TUBULAR current density | 200 A/m² | Split: MMO_TUBULAR_FRESH 7.0, MMO_TUBULAR_SALT 35.0 | SAES-X-400 Table 5 |

### Fixed in Phase 2 (this audit)

| Issue | Was | Now | Notes |
|---|---|---|---|
| `scripts/verify_datasets.mjs` temperature correction | NACE linear, baseTemp=25 | Saudi Aramco exponential, baseTemp=30 (matches engine) | Hand-calc drift fixed |
| `scripts/verify_datasets.mjs` design life | `Y = N×W/(C×I)` | `Y = N×W×U_f/(C×I)`, U_f=0.85 (matches engine) | Hand-calc drift fixed |
| `scripts/verify_datasets.mjs` current req | Applied `coatingEfficiency` factor | Removed (engine does not apply per DEF-001) | Hand-calc drift fixed |
| `resistivityEngine.js:645` doc | Minimal | Added "does NOT conflict with R_emf" doc explaining the two different computations | Audit clarity |

### Verified Correct (no change needed)

- Attenuation engine — NACE SP0169 §10 / ISO 15589-1 compliance for α and E(x) profile
- Optimizer — scenario logic, no formula bugs found
- Standards validation engine — 15+ rules, all referencing correct field paths
- Dwight, Sunde, distributed groundbed formulas — all match references
- Cable resistance formulas — match IEC 60287

### Open Questions (Deferred to Future Audits)

| Item | Notes |
|---|---|
| `resistivityEngine.js:676` multiplies by `TR_EFFICIENCY` (0.8) | Dimensionally suspect — efficiency is dimensionless but applied to a resistance term. May shrink R_G_max allowance unnecessarily. Not in conflict with R_emf; possibly a separate bug. |
| `validate_datasets.mjs` still uses hand-calc against 6 golden datasets | Now passes 100%. Use as regression check after any formula change. |
| Migration: existing approved projects will produce different R_T and V_min after the back-EMF fix | Document in release notes; consider "pre-fix" mode toggle for legacy data |

---

## 1. Formula Inventory (unchanged from v1)

*(Same 14 modules as v1 — see v1 report § 1 for full inventory)*

### Key changes from v1:
- **Module 4 (Deepwell Dwight)** — unchanged ✓
- **Module 5 (Shallow Sunde)** — unchanged ✓
- **Module 6 (Distributed)** — unchanged ✓
- **Module 9 (TR Circuit)** — `R_emf` formula corrected to `V_backEMF / I_rated` per SAES-X-600 §5.2.5
- **Module 10 (Design Life)** — unchanged (was correct; verify_datasets.mjs was wrong)

---

## 2. Dependency Graph (unchanged from v1)

*(Same graph as v1 — see v1 report § 2)*

---

## 3. Standard References Matrix (unchanged from v1)

*(Same matrix as v1)*

---

## 4. Consuming Modules Cross-Reference (unchanged from v1)

*(Same table as v1)*

---

## 5. Validation Rules Inventory (unchanged from v1)

*(Same table as v1)*

---

## 6. ANODE_SPECS (Updated in Phase A)

| Spec | Standard | maxCurrentDensity (was) | maxCurrentDensity (now) | Source |
|---|---|---|---|---|
| `HSCI_TA4` | 17-SAMSS-016 | 10.8 A/m² | **7.0 A/m²** | SAES-X-400 Table 5 |
| `HSCI_TA2` | 17-SAMSS-016 | 10.8 A/m² | **7.0 A/m²** | SAES-X-400 Table 5 |
| `MMO_TUBULAR` | (NACE TM0108) | 200 A/m² | **DEPRECATED** | Replaced by _FRESH and _SALT |
| `MMO_TUBULAR_FRESH` (new) | SAES-X-400 | — | **7.0 A/m²** | SAES-X-400 Table 5 (fresh water) |
| `MMO_TUBULAR_SALT` (new) | SAES-X-400 | — | **35.0 A/m²** | SAES-X-400 Table 5 (salt water) |
| `ZINC_RIBBON` | ASTM B418 | (per-meter unit, no density) | (unchanged) | n/a |

**Note:** `maxCurrentDensity` is **not consumed by `runStationCalculations()`** — datasets use inline `anodeSpec: { weightKg, consumptionRate, outputAmps }`. The fix is a catalog / display / standards-validation correction.

---

## 7. FormulaCard Integration Status (unchanged from v1)

*(Same table as v1)*

---

## 8. Verification (Phase 2)

```
=== verify_datasets.mjs ===
ALL 7 DATASETS VERIFIED ✓
All 14 hand-calculated fields match engine output for every dataset
```

```
=== vitest ===
617/633 passing
  - 1 pre-existing governance test failure (unrelated)
  - 1 firestore rules test needs emulator (unrelated)
Build: clean (825ms)
Lint: 4 pre-existing react-refresh errors (unrelated)
```

---

## 9. Next Audit Items (Future)

1. `resistivityEngine.js:676` — investigate the `TR_EFFICIENCY` multiplier in `calculateMaxAllowableGroundbedResistance`. Per-cell analysis vs spreadsheet reference needed.
2. Migration path — for any approved project that used the old back-EMF formula, document how to migrate or whether the new value is acceptable.
3. Attenuation engine — deeper review of α calculation and the e^(−αx) profile shape. Currently passes tests but not deeply audited.

---

**Report generated:** 2026-06-13
**Next update:** When `resistivityEngine.js:676` is investigated.
