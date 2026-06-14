# DIGITAL_TWIN_FOUNDATION.md
## M9 Learning Foundation + M10 Asset Registry + M11 Health Score Engine + M12 Risk Engine
### RAXA CP Platform — Digital Twin Foundation Deliverable

---

## Summary

Four milestones delivered in a single session, establishing the platform's Digital Twin foundation layer. All work is:
- **Non-invasive** — zero engine formula changes
- **Pure data** — all engines consume `lastCalcResult`, never modify it
- **Fully tested** — 42 new tests, total 1,175 passing

---

## M9 — Learning Foundation ✅

### What Was Built

| File | Purpose |
|---|---|
| `src/knowledge/engineeringKnowledge.js` | Static knowledge base — 7 engineering modules |
| `src/pages/PageKnowledge.jsx` | Searchable, categorized, two-level UI page |
| `src/knowledge/engineeringKnowledge.test.js` | 15 unit tests |

### Coverage

| Module | Standard | Worked Example | Mistakes Documented |
|---|---|---|---|
| Current Requirement | SAES-X-400 / ISO 15589-1 | ✅ | 3 |
| Groundbed Design | SAES-X-400 / NACE SP0572 | ✅ | 3 |
| Cable Resistance | IEC 60228 / SAES-X-400 | ✅ | 3 |
| TR Sizing | SAES-X-400 §9 / IEC 62395 | ✅ | 3 |
| Attenuation Analysis | NACE SP0169 / ISO 15589-1 | ✅ | 3 |
| Soil Resistivity | ASTM G57 / SAES-X-400 | ✅ | 3 |
| Design Basis | SAES-X-400 / ISO 15589-1 | ✅ | 2 |

### Architecture

```
engineeringKnowledge.js
  KNOWLEDGE_MODULES[]      ← Static array, no logic
  searchKnowledge(query)   ← Filters by title/summary/tags/standard
  getKnowledgeCategories() ← Unique category list
  getKnowledgeModule(id)   ← Single module lookup
```

### UI Features

- Full-page search (matches title, summary, tags, standards, content)
- Category filter pills (All / Engineering Analysis / Project Definition / Design Review)
- Collapsible two-level card: Summary always visible, details expand on click
- Per-module: What it Calculates / Why it Matters / Standard Reference / Typical Ranges / Common Mistakes (with FIX) / Worked Example with step table
- "Open [Page]" deep-link button on each card
- Stats bar: 7 modules / 5 standards / 20 mistakes / 7 worked examples
- Accessible via sidebar: TOOLS → Knowledge Base

---

## M10 — Asset Registry ✅

### What Was Built

| File | Purpose |
|---|---|
| `src/digitalTwin/assets/AssetTypes.js` | Asset type enum + display metadata |
| `src/digitalTwin/assets/assetFactory.js` | Design-linked factory functions |
| `src/digitalTwin/assets/assetRegistry.js` | Immutable CRUD operations |
| `src/digitalTwin/DigitalTwinModel.js` | Root model — links all DT components |
| `src/digitalTwin/assetSlice.js` | Zustand slice for DT state |

### Asset Types

| Type | Created From | Design Fields Captured |
|---|---|---|
| `pipeline` | station.pipelineSegments | totalLengthM, OD, coatingType, designCurrentA |
| `tr_unit` | station.tr + lastCalcResult | ratedV, ratedA, minRequiredV, voltageMargine |
| `groundbed` | station.groundbed + lastCalcResult | anodeCount, type, depth, resistanceOhm, designLifeYears |

### Design Principles

- **Design-linked**: Assets are created from station design data, not entered manually
- **Frozen designRef**: `Object.freeze()` on creation — the commissioning snapshot cannot be mutated
- **Telemetry-ready**: `telemetry: null` field on every asset — M15 placeholder, no implementation yet
- **Immutable registry**: All CRUD functions return new state, never mutate in place

### Store Integration

```
projectStore
  ├── ...createAssetSlice(set, get)   ← NEW
  │     ├── digitalTwin.registry      ← Asset CRUD state
  │     ├── digitalTwin.healthScores  ← Per-station health
  │     ├── digitalTwin.riskAssessments ← Per-station risk
  │     ├── commissionStationAssets(stationId)
  │     ├── decommissionStationAssets(stationId)
  │     ├── refreshDigitalTwinForProject()
  │     ├── getActiveStationHealth()
  │     ├── getActiveStationRisk()
  │     └── getActiveStationAssets()
```

---

## M11 — Health Score Engine ✅

### What Was Built

| File | Purpose |
|---|---|
| `src/digitalTwin/healthScoreEngine.js` | Deterministic 0–100 score from design data |

### Scoring Model

| Factor | Weight | Scoring Logic |
|---|---|---|
| TR Voltage Margin | 25% | `rated/required` ratio, 0 if < 1.25×, 100 at ≥ 2.5× |
| Design Life Factor | 25% | Anode life vs project life ratio, 0 if shortfall |
| Groundbed Resistance Margin | 20% | 0 if > 2.0 Ω, 100 at < 0 Ω |
| Rule Pass Ratio | 20% | Pass + 0.5 × Warn / Total rules |
| Cable Drop Margin | 10% | Headroom to 0.5V/0.3V limits |

### Thresholds

| Range | Status | Color |
|---|---|---|
| ≥ 75 | 🟢 Healthy | `var(--pass)` |
| 50–74 | 🟡 Warning | `var(--warn)` |
| < 50 | 🔴 Critical | `var(--fail)` |

---

## M12 — Risk Engine ✅

### What Was Built

| File | Purpose |
|---|---|
| `src/digitalTwin/riskEngine.js` | Consequence × Likelihood risk matrix |

### Risk Matrix: Consequence (1–5)

| Factor | Trigger |
|---|---|
| High current (> 20A) | +2 |
| Medium current (> 8A) | +1 |
| Long pipeline (> 10km) | +1 |
| Extended design life (> 30y) | +1 |

### Risk Matrix: Likelihood (1–5)

| Factor | Trigger |
|---|---|
| TR below 1.25× margin | +3 |
| TR below 1.5× margin | +2 |
| TR below 2.0× margin | +1 |
| Highly aggressive soil (ρ < 1,000) | +2 |
| Aggressive soil (ρ < 3,000) | +1 |
| Any validation failures | +2 |
| Multiple validation warnings | +1 |
| Anode life shortfall | +2 |

### Risk Level Grid

| Score | Level | Color |
|---|---|---|
| 1–4 | 🟢 Low | `var(--pass)` |
| 5–9 | 🟡 Medium | `var(--warn)` |
| 10–16 | 🟠 High | orange |
| 17–25 | 🔴 Critical | `var(--fail)` |

### Future Hook (M15/M16)
When live telemetry is available, the likelihood score will be updated dynamically from measured TR output deviation, measured pipe-to-soil potential, and alarm history. The `telemetry: null` field on assets is the designated hook point.

---

## Test Results

| Suite | Tests | Status |
|---|---|---|
| `engineeringKnowledge.test.js` | 15 | ✅ All pass |
| `digitalTwin.test.js` | 27 | ✅ All pass |
| All prior tests (M1–M8) | 1,133 | ✅ No regressions |
| **Total** | **1,175** | **✅ 1 pre-existing infrastructure skip (Firestore emulator)** |

---

## Non-Negotiable Constraints — Verified

- ✅ Zero engine formula changes
- ✅ Zero modifications to `src/engine/` files
- ✅ `calculations.js` untouched
- ✅ `rulesEngine.js` untouched
- ✅ `attenuationEngine.js` untouched
- ✅ All new code wraps or consumes engine output, never replaces it

---

## Remaining Milestones

| Milestone | Status |
|---|---|
| M13 — Login Redesign | ⏳ Next |
| M14 — Brand Refresh | ⏳ Queued |
| M15 — Full Digital Twin (Telemetry) | 🔒 Deferred (hardware not yet defined) |
