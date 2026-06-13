# Dashboard 3.0 — Engineering Command Center

**Phase:** 6
**Date:** 2026-06-13
**Status:** In Progress
**Branch:** `feat/dashboard-v3`

## 1. Mission

Reframe the RAXA dashboard from "show pipeline info" to **answer three questions**:

1. **What requires my attention?**
2. **What blocks completion?**
3. **What should I do next?**

The existing Dashboard 2.0 shows static pipeline data. Dashboard 3.0 surfaces actionable
intelligence derived from the project's calculation state, workflow progress, and
advisor recommendations.

## 2. Hard Rules (inherited from the master plan)

- No modifications to calculation formulas.
- No changes to engineering engine outputs.
- No backend migrations.
- No database schema breaking changes.
- Must remain compatible with existing projects.
- All new features must be optional and backward compatible.

## 3. Architecture

```
DashboardCommandCenter (React component)
├── ExecutiveKpiRow          → 7 KPI cards (KpiCard widget)
├── WorkflowProgressPanel    → 10-stage workflow (WorkflowProgress widget)
├── CurrentProjectFocus      → nextBestAction() suggestion card
└── EngineeringActivityFeed  → existing Firestore subscription (reused)

Pure engines (no React, no Zustand, no DOM):
├── workflowEngine.js         → computeWorkflow(project, stations, options)
├── projectHealthEngine.js    → computeProjectHealth(project, stations, advisorRecs)
└── dashboardStatusEngine.js  → nextBestAction(workflow, health, stations, advisorRecs)
```

## 4. The 10-Stage Workflow

```
Design Basis → Pipeline Parameters → Soil Resistivity → Current Requirement
→ Groundbed Design → Cable Resistance → TR Sizing → Attenuation
→ Validation → Engineering Report
```

### 4.1 States (5)

| State | Meaning |
|---|---|
| `not_started` | No data entered for this stage |
| `in_progress` | Partial data entered |
| `complete` | Stage fully populated |
| `review_required` | Data present but station status is `engineering_review` |
| `blocked` | Downstream stage attempted before upstream is complete |

### 4.2 Stage Derivation Rules

> **Note on field names:** The original spec referenced fields like `totalCurrentAmps`,
> `trRatedVoltage`, and `attenuationPercent` on `lastCalcResult`. The actual `lastCalcResult`
> shape (see `src/engine/modules/calculations.js`) uses `requiredCurrentA`, `minTRVoltage`,
> and computes attenuation via a separate service. The engine uses the real field names.

| # | Stage | Complete When | Notes |
|---|---|---|---|
| 1 | Design Basis | `project.designBasis` has ≥1 numeric field | |
| 2 | Pipeline Parameters | Any station has `pipelineSegments.length > 0` | `in_progress` if some stations have segments |
| 3 | Soil Resistivity | `station.soilResistivityOhmCm` OR `project.designBasis.soilResistivityOhmCm` is set | |
| 4 | Current Requirement | Any station has `lastCalcResult.requiredCurrentA` | |
| 5 | Groundbed Design | Any station has `lastCalcResult.groundbedResistanceOhm` | |
| 6 | Cable Resistance | Any station has `lastCalcResult.totalCableResOhm` | |
| 7 | TR Sizing | Any station has `lastCalcResult.minTRVoltage` | |
| 8 | Attenuation | `attenuationResult?.summary?.designAdequate === true` | Passed in via `options.attenuationResult` |
| 9 | Validation | All stations have `lastCalcResult` AND no `validationErrors` | |
| 10 | Engineering Report | `project.status` is `approved` or `issued_for_construction` | `review_required` if `engineering_review` |

### 4.3 Review Required Override

Any stage whose data is present but whose station `status === 'engineering_review'`
transitions to `review_required` instead of `complete`. This applies to stages 2–9
(stages 1 and 10 are project-level, not station-level).

### 4.4 Blocked Detection

A stage is `blocked` if the immediately preceding stage is `not_started` AND the
user has visited the page for that stage. Blocked detection is conservative: it
only fires for the first downstream stage after a `not_started` upstream.

## 5. Executive KPI Row (7 cards)

| KPI | Formula | Source |
|---|---|---|
| **Project Health** | `50% calculated + 30% approved + 20% in review` (0–100) | Promoted from `PipelineWidgets.projectHealth()` |
| **Compliance Score** | `100 - (fail_checks / total_checks) * 100` across all stations' `lastCalcResult.checks` | `projectHealthEngine` |
| **Design Completion** | `completeStages / 10 * 100` from `workflowEngine` | `projectHealthEngine` (uses workflow) |
| **Current Requirement** | Largest `requiredCurrentA` across stations (A) | `projectHealthEngine` |
| **Groundbed Status** | Pass / Warn / Fail aggregate of `groundbedResistanceOhm` vs standard threshold | `projectHealthEngine` |
| **Validation Status** | Count of stations with `validationErrors` and `checks` failures | `projectHealthEngine` |
| **Engineering Risk** | `0.4 × (100 - ComplianceScore) + 0.3 × (ERROR advisor recs) + 0.3 × (stations with validation errors)` → Low < 40, Medium 40–70, High > 70 | `projectHealthEngine` |

## 6. Current Project Focus

`nextBestAction(workflow, health, stations, advisorRecs) → { title, body, link, priority }`

Priority order:
1. **Blocked stage** — downstream of a `not_started` upstream
2. **ERROR advisor rec** — highest severity advisor recommendation
3. **WARN advisor rec** — medium severity
4. **Review-required stage** — stage in `review_required` state
5. **First `not_started` stage** — first workflow stage without data

Returns `null` when the project is fully complete (all 10 stages `complete`).

## 7. Component Composition

The new `DashboardCommandCenter` component is mounted **above** the existing
KPI row and workflow grid in `PageDashboard.jsx`. The old 6-card KPI row and
7-card workflow grid remain visible (deprecated) for one release, then removed
in a follow-up cleanup PR.

## 8. Backward Compatibility

- New section lives above the existing dashboard sections.
- Feature flag `dashboardV3Enabled` in `projectStore`:
  - `true` for new projects (created after `PHASE_6_RELEASE_DATE`)
  - `false` for legacy projects (created before `PHASE_6_RELEASE_DATE`)
- The existing dashboard sections (KPI row, workflow grid, activity feed,
  project map, project cards) remain unchanged.

## 9. Test Strategy

| File | Cases | Scope |
|---|---|---|
| `workflowEngine.test.js` | ≥50 | All 10 stages × 5 states + edge cases |
| `projectHealthEngine.test.js` | ≥20 | All 7 KPI formulas |
| `dashboardStatusEngine.test.js` | ≥30 | Priority ordering, null returns, deep-links |
| `DashboardCommandCenter.test.jsx` | ≥5 | Renders 7 KPIs + 10 stages + focus + feed |

## 10. Files Touched

### New
- `docs/DASHBOARD_3_SPEC.md` (this file)
- `src/engine/dashboard/workflowEngine.js`
- `src/engine/dashboard/projectHealthEngine.js`
- `src/engine/dashboard/dashboardStatusEngine.js`
- `src/engine/dashboard/workflowEngine.test.js`
- `src/engine/dashboard/projectHealthEngine.test.js`
- `src/engine/dashboard/dashboardStatusEngine.test.js`
- `src/components/DashboardCommandCenter.jsx`

### Modified
- `src/pages/PageDashboard.jsx` — mount `<DashboardCommandCenter>` above existing sections
- `src/store/projectStore.js` — add `dashboardV3Enabled` flag and `PHASE_6_RELEASE_DATE` constant

## 11. Effort

M (4–6 eng-days)
