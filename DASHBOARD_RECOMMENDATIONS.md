# DASHBOARD RECOMMENDATIONS

> **Purpose:** Re-scope the Dashboard to be a project-management surface, removing engineering content that belongs in its respective module.
> **No file modifications.** This document is the recommendation.

---

## 1. What the Dashboard is today

`pages/PageDashboard.jsx` (1,042 lines) currently contains:

- A project picker / project creation form
- A digital twin summary widget
- An "Engineering Intelligence" panel with charts (pipeline profile, cable schematic, groundbed geometry, attenuation graph)
- A workflow / next-best-action card
- A "Calculate All" quick action
- Recent changes activity feed
- KPI tiles (project health, completion %, groundbed status, validation status, engineering risk)
- Compliance summary
- An "Open Project" CTA per project

The problem: the Dashboard doubles as an **engineering cockpit**. Users naturally go there for the most-recent number; instead, the Dashboard is becoming a stale-data risk surface (see `STALE_DATA_ANALYSIS.md` § 2) because every chart reads from `lastCalcResult` which is the same cache the engineering pages read.

---

## 2. Recommended scope (project-management only)

The Dashboard should display only:

| Widget | Source | Refresh |
|---|---|---|
| **Current Project Stage** | `workflowEngine.computeWorkflow` → `firstPendingStage` | every render |
| **Current User Action** | `dashboardStatusEngine.nextBestAction` | every render |
| **Pending Tasks** | per-module validation results (from `MODULE_VALIDATORS`, see `MODULE_VALIDATION_DESIGN.md`) | every render |
| **Warnings** | `engineeringAdvisor.recommendationEngine` filtered to `severity: 'error'` | every render |
| **Validation Status** | aggregate across `MODULE_VALIDATORS` | every render |
| **Engineering Progress** | `countCompleteStages / WORKFLOW_STAGES.length` × 100 | every render |
| **Recent Changes** | `proj.activityLog` + Firestore `activity` (existing) | live |
| **Digital Twin Health** | aggregate `healthScores` summary (min / max / mean) | every render |
| **Project Completion %** | `(calculated + approved + in-review weighted) / total × 100` (existing) | every render |

Everything else belongs in its own module:

| What | Goes to |
|---|---|
| Pipeline profile | `PagePipeline` |
| Cable schematic | `PageCableResistance` |
| Groundbed geometry | `PageGroundbed` |
| Attenuation graph | `AttenuationPage` |
| TR operating point | `PageTRSizing` |
| Soil column | `PageSoilResistivity` |
| Per-station breakdown | each engineering page |

---

## 3. What to keep (with rationale)

| Today | Keep? | Reason |
|---|---|---|
| Project picker | ✅ | Entry point |
| "Open Project" CTA | ✅ | Workflow anchor |
| "Calculate All" | ✅ | Bulk action, dashboard-level |
| Workflow progress | ✅ | Project-level |
| Digital Twin summary (1–2 KPI tiles) | ✅ | Health at a glance |
| Compliance summary (count of pass/fail) | ✅ | Project-level |
| Activity log | ✅ | Audit trail |
| Engineering charts | ❌ | Belong in modules |
| Per-station drill-down cards | ❌ | Belong in modules |

---

## 4. New tiles to add (per `MODULE_VALIDATION_DESIGN.md`)

A single tile that aggregates module-level validation state:

```text
┌──────────────────────────────────────────────────────┐
│  Module Validation                                   │
│  ──────────────────────────────────────────────────  │
│  ✓ Project Setup      VALID                          │
│  ⚠ Soil Resistivity   WARNING (1 finding)            │
│  ✗ Groundbed          ERROR (2 findings)              │
│  ✓ TR Sizing          VALID                          │
│  ⓘ Attenuation        INCOMPLETE (no TR)             │
│  ──────────────────────────────────────────────────  │
│  1 ERROR · 1 WARNING · 1 INCOMPLETE                  │
└──────────────────────────────────────────────────────┘
```

Clicking a row deep-links to the page.

---

## 5. Tile sizes (visual layout proposal)

| Row | Widget | Approx. size |
|---|---|---|
| 1 | "Open Project" CTA (large) | 2×1 |
| 1 | Workflow progress (3 stages left) | 1×1 |
| 1 | Current user action ("Recalculate station CP1") | 1×1 |
| 2 | Module validation (full width) | 2×1 |
| 2 | Digital Twin summary (2 tiles) | 1×1 + 1×1 |
| 3 | Aggregate engineering risk | 1×1 |
| 3 | Compliance summary (1 tile) | 1×1 |
| 4 | Recent changes (full width) | 2×1 |

No more 6-tile rows of detailed numbers. Detailed numbers live in the modules.

---

## 6. What to remove from the Dashboard

The following components are visible today and should be **moved out** of the Dashboard:

| Component | Reason | New location |
|---|---|---|
| `PipelineOverviewCanvas` | Engineering content | `PagePipeline` |
| `PipelineRouteMap` | Engineering content | `PagePipeline` |
| `CableNetworkVisualizer` | Engineering content | `PageCableResistance` |
| `GroundbedVisualizer` | Engineering content | `PageGroundbed` |
| `AttenuationExplorer` | Engineering content | `AttenuationPage` |
| `KPITrendWidget` (per-station trend) | Engineering content | `PageReport` or `PageHistory` |
| `SoilColumnVisualization` | Engineering content | `PageSoilResistivity` |
| `TROperatingPointChart` | Engineering content | `PageTRSizing` |
| `CriticalKPDetector`, `StationSpacingRecommendation` | Attenuation content | `AttenuationPage` (already) |
| `ScenarioToggle` | Engineering content | `AttenuationPage` or `PageSensitivity` |
| `SensitivitySliders`, `SensitivityRadar`, `SensitivitySweep`, `SensitivityTornado` | Engineering content | `PageSensitivity` (already) |
| `ProtectionBand`, `ProtectionHeatMap` | Engineering content | `AttenuationPage` or `PageReport` |
| `ProjectStatusDashboard` | Overlaps with PageDashboard itself | deprecate |
| `ProjectOverviewMap` | Engineering content | `PageReport` cover page |

---

## 7. Hardcoded values to remove from the Dashboard

| Constant | File | Reason |
|---|---|---|
| `progress = 20; if (isCalculated) progress += 15; ...` | `PageDashboard.jsx` | hardcoded progress weighting |
| `projectNumber = ECP${year}-${n+1}` | `PageDashboard.jsx` | should be a project factory concern |
| `workspaceRegistry` icon mapping | `PageDashboard.jsx` | OK to keep (display) |
| `workflowModules` field-name map (`'groundbedResistanceOhm' != null` etc.) | `PageDashboard.jsx` | should live in `constants/THRESHOLDS` |

---

## 8. Action items (no code in this document)

| # | Action | Effort |
|---|---|---|
| 1 | Remove engineering charts from `PageDashboard.jsx` | 1 PR |
| 2 | Add the Module Validation tile | 1 PR |
| 3 | Move `KPITrendWidget` per-station to `PageReport` | 1 PR |
| 4 | Move `ProjectOverviewMap` to `PageReport` cover | 1 PR |
| 5 | Centralize the workflow-stage → required-field map in `constants` | 1 PR |
| 6 | Add a "Last validated" timestamp per project | 1 PR |
| 7 | Replace `progress = 20; if (...) += 15;` with `countCompleteStages(workflow)` | 1 line |
| 8 | Replace `projectNumber = ECP...` template with `factory` invocation | 1 line |

---

## 9. Acceptance criteria

The Dashboard passes this audit when:

1. ✅ It does not render engineering charts (Pipeline profile, Cable schematic, Groundbed geometry, Attenuation graph, TR operating point, Soil column).
2. ✅ It does not derive engineering numbers (surface area, R_G, V_min, α, cable drop). These live in modules.
3. ✅ It surfaces a Module Validation tile that aggregates per-module validation state.
4. ✅ It deep-links to the module page when the user clicks a module validation row.
5. ✅ The "Calculate All" action is still present.
6. ✅ Recent changes (activity log) is preserved.
7. ✅ Workflow progress, next-best-action, digital twin health summary, and project completion are preserved.
8. ✅ No hardcoded progress weighting — driven by `workflowEngine`.

---

## 10. Pre-existing Dashboard inventory (for reference)

The Dashboard currently consumes from these engine modules:

- `engine/dashboard/workflowEngine` → `WORKFLOW_STAGES`, `computeWorkflow`, `countCompleteStages`, `firstPendingStage`
- `engine/dashboard/dashboardStatusEngine` → `nextBestAction`, `hasPendingWork`, `STAGE_PATHS`, `CATEGORY_PATHS`
- `engine/dashboard/projectHealthEngine` → `computeProjectHealth`, `computeComplianceScore`, `computeDesignCompletion`, `computeCurrentRequirement`, `computeGroundbedStatus`, `computeValidationStatus`, `computeEngineeringRisk`
- `engine/engineeringAdvisor/engineeringAdvisorEngine` → `analyze`, `analyzeAsync`
- `engine/engineeringAdvisor/recommendationEngine` → `analyze`, `byCategory`, `byPriority`
- `engine/inputLinkRegistry` (indirectly) → labels for advisor recommendations
- `services/activityLogger` → `subscribeToActivity`
- `digitalTwin/assetSlice` → `healthScores`, `riskAssessments`, `lastRefreshedAt`

None of these need to change. The Dashboard keeps these and **drops** the engineering chart imports.
