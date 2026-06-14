# RAXA Pipeline — Release 2.1.0 Notes

**Release date:** 2026-06-13
**Branch:** `feature/architecture-offline-digitaltwin`
**PRs:** 3 commits (`39b60f1`, `ae49fb7`, `d905c32`)

---

## What ships in 2.1

A decision-support platform release. Three phases, all behind feature flags, all backward compatible. **No formula changes, no engine-output changes, no backend migrations.**

### Phase 6 — Dashboard 3.0 (Engineering Command Center)

The dashboard now answers three questions: *What requires my attention? What blocks completion? What should I do next?*

- **10-stage workflow** — Design Basis → Pipeline → Soil → Current → Groundbed → Cable → TR → Attenuation → Validation → Report. 5 states (not_started, in_progress, complete, review_required, blocked). `Review Required` derives from station `status === 'engineering_review'`; `Blocked` fires when any upstream stage is not started and the user attempted the page.
- **7 executive KPIs** — Project Health, Compliance Score, Design Completion, Current Requirement, Groundbed Status, Validation Status, Engineering Risk (composite formula).
- **Current Project Focus card** — priority-ordered next-best-action suggestion: blocked → ERROR advisor → WARN advisor → review_required → first not_started. Returns null when complete.
- **Engineering Activity Feed** with filter chips (All / Review / Needs Attention). Reuses the existing Firestore subscription.
- **Feature flag** — `dashboardV3Enabled`. New projects: `true`. Legacy: `false`. Old sections remain (deprecated) for one release.

### Phase 7 — Engineering Intelligence System

Deterministic recommendation engine. No AI, no LLM. The existing `engineeringAdvisorEngine.js` is unchanged — the new `recommendationEngine.js` is a pure transformation layer.

- **4-category vocabulary** — `optimization`, `warning`, `compliance`, `cost_reduction`. Maps from the existing 9 advisor categories with ID-prefix overrides for "positive findings" (e.g., `groundbed.unusually_low` → `optimization`).
- **4-priority vocabulary** — `critical`, `high`, `medium`, `low` (from `error`, `warn`, `info`, `success`).
- **3 new cost-reduction rules** — TR oversized (utilization < 0.55), groundbed underutilized (R_G < 30% of max + design life factor > 1.5), excess anode count (specified > calculated × 1.5).
- **EngineeringAdvisorPanel** gets `enableV2` prop: filter chips, cost mode tab, V2 4-category summary.
- **Feature flag** — `intelligenceV2Enabled`. New projects: `true`. Legacy: `false`.

### Phase 8 — Learning Foundation

Structured data collection for a future AI training dataset. **No machine learning in this phase.**

- **`decisionHistoryStore`** — captures every design decision (input edits, calc re-runs, status changes, BOM generation, report exports, validation resolutions). Zustand+persist, localStorage key `raxa.decisionHistory` (version 1), capped at 5000 records. **Separate key from the existing `raxa.recommendationFeedback`** — no migration needed.
- **`feedbackCollector`** — 4 collect functions: `collectFromAdvisorPanel`, `collectFromValidation`, `collectFromCalculation`, `collectFromApproval`. Centralizes the auto-capture logic that was previously inline in `useFeedbackLogging`.
- **`learningStore`** — top-level aggregator. `getTrainingDataset(filters)` joins decision + feedback records on `(projectId, relatedRecommendationId)`. Export as JSON.
- **`useFeedbackLogging` rewired** — delegates to `feedbackCollector.collectFromAdvisorPanel`. Same `recId → recordId` ref contract, no behavior change.
- **`calculationSlice` wired** — auto-calls `feedbackCollector.collectFromCalculation` after each calc run.
- **Feature flag** — `learningV2Enabled`. New projects: `true`. Legacy: `false`.

---

## Hard rules preserved

1. ✅ No modifications to calculation formulas
2. ✅ No changes to engineering engine outputs
3. ✅ No backend migrations
4. ✅ No database schema breaking changes
5. ✅ Compatible with existing projects (all behind feature flags)
6. ✅ All new features optional and backward compatible

---

## Migration

| What | Action |
|---|---|
| Existing project | No action required. All three new flags default to `false` for legacy projects. |
| New project | Automatically gets `dashboardV3Enabled`, `intelligenceV2Enabled`, `learningV2Enabled` all set to `true`. |
| `raxa.recommendationFeedback` localStorage | Untouched. Version 1 key, version 1 schema. |
| `raxa.decisionHistory` localStorage | New key, version 1. Populated automatically as decisions are made. |
| Toggling flags | Set on the project in localStorage, or via future UI. |
| Build | Same `npm run build` command. No new runtime dependencies. |
| Tests | `npx vitest run`. 202 new tests run automatically. |

---

## Test results

- **1094 passing** (up from 892 at 2.0.0)
- 16 skipped (unchanged)
- 1 pre-existing `firestore.rules.test.js` failure (needs Firestore emulator on :8080)
- **0 regressions** — all existing 892 tests still pass

| Phase | New tests |
|---|---|
| P6 (Dashboard 3.0) | 102 |
| P7 (Intelligence v2) | 65 |
| P8 (Learning v2) | 35 |
| **Total** | **202** |

---

## Files

### New (19 files)

```
docs/DASHBOARD_3_SPEC.md
src/engine/dashboard/workflowEngine.js + .test.js
src/engine/dashboard/projectHealthEngine.js + .test.js
src/engine/dashboard/dashboardStatusEngine.js + .test.js
src/engine/engineeringAdvisor/costReductionRules.js + .test.js
src/engine/engineeringAdvisor/recommendationRegistry.js + .test.js
src/engine/engineeringAdvisor/recommendationEngine.js + .test.js
src/components/DashboardCommandCenter.jsx
src/store/decisionHistoryStore.js + .test.js
src/store/feedbackCollector.js + .test.js
src/store/learningStore.js + .test.js
```

### Modified (6 files)

```
src/pages/PageDashboard.jsx          (mount DashboardCommandCenter)
src/components/EngineeringAdvisorPanel.jsx  (enableV2 prop, filter chips, cost mode)
src/store/factories.js               (3 release dates + 3 default-flag functions)
src/store/projectStore.js            (re-exports + 3 flag migrations)
src/store/slices/calculationSlice.js (auto-call feedbackCollector on calc run)
DASHBOARD_2.0_SPEC.md (deleted, replaced by docs/DASHBOARD_3_SPEC.md)
```

---

## What didn't ship (deferred to follow-up)

- **Removal of deprecated Dashboard 2.0 sections** (KPI row, workflow grid) — planned for one release after 2.1.0 ships. The `dashboardV3Enabled` flag controls visibility.
- **UI for toggling the three feature flags** — currently set per-project in localStorage. A settings UI could be added later.
- **Migration of `raxa.recommendationFeedback` or `raxa.decisionHistory` to Firestore** — future "no backend migrations" hard rule lifted.
- **ML training pipeline** — explicitly out of scope for P8. Data is collected; no model is trained.

---

## Verification

- **Tests:** 1094/1110 pass; 1 pre-existing firestore rules failure
- **Build:** clean
- **Lint:** 0 new errors introduced (8 pre-existing errors unchanged)
- **Dev server:** runs on `http://localhost:3000/` (Vite 8)
- **All engines are pure** — no DOM, no React, no Zustand, no side effects. Fully unit-testable.

---

## Where to look

| What | Where |
|---|---|
| Dashboard 3.0 spec | `docs/DASHBOARD_3_SPEC.md` |
| P6+P7+P8 plan (source of truth) | `.kilo/plans/phase-6-7-8-decision-platform.md` |
| Workflow engine | `src/engine/dashboard/workflowEngine.js` |
| Health engine | `src/engine/dashboard/projectHealthEngine.js` |
| Status engine | `src/engine/dashboard/dashboardStatusEngine.js` |
| Recommendation engine | `src/engine/engineeringAdvisor/recommendationEngine.js` |
| Cost-reduction rules | `src/engine/engineeringAdvisor/costReductionRules.js` |
| Recommendation registry | `src/engine/engineeringAdvisor/recommendationRegistry.js` |
| Decision history | `src/store/decisionHistoryStore.js` |
| Feedback collector | `src/store/feedbackCollector.js` |
| Learning aggregator | `src/store/learningStore.js` |
| Dashboard command center | `src/components/DashboardCommandCenter.jsx` |
| Feature flags | `src/store/factories.js` + `src/store/projectStore.js` |

---

## Credits

3 commits, 19 new files, 6 modified files, 202 new test cases. All work preserves backward compatibility for the test suite, build, and lint baselines.
