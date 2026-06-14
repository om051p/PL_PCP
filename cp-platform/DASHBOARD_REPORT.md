# cathodic protection platform — Dashboard 3.0 Report (M3)

## Overview

In Milestone M3 (Dashboard 3.0), the dashboard has been transformed from a static metadata card-list into a dynamic **Engineering Command Center** designed to answer three key questions:
1. **What requires my attention?**
2. **What blocks completion?**
3. **What should I do next?**

This is achieved via a 10-stage workflow tracker, 7 executive KPIs, a priority-driven Next-Best-Action suggesting focus areas, and a real-time activity feed.

---

## Architectural Components

The new command center is built on a clean separation of concerns, utilizing three pure, unit-tested engine modules:

1. **`workflowEngine.js`**:
   - Manages a 10-stage cathodic protection workflow (from *Design Basis* to *Engineering Report*).
   - Dynamically derives 5 states per stage: `not_started`, `in_progress`, `complete`, `review_required` (triggered by station status), and `blocked` (triggered by downstream attempts before upstream is complete).

2. **`projectHealthEngine.js`**:
   - Aggregates metrics across all stations to calculate 7 executive KPIs.
   - Computes overall **Project Health** (composite of calculated, approved, and review states).
   - Computes **Compliance Score** (based on validation checklist checks).
   - Computes **Engineering Risk** (composite of compliance, validation errors, and critical advisor recommendations).

3. **`dashboardStatusEngine.js`**:
   - Implements `nextBestAction` logic to rank tasks and direct the user to the most critical next step.
   - Priority hierarchy: Blocked Stage > ERROR Advisor Recommendation > WARN Advisor Recommendation > Review Required Stage > First Not Started Stage.

4. **`DashboardCommandCenter.jsx`**:
   - The React UI wrapper presenting the Executive KPI Row, interactive 10-stage workflow stepper, next-best-action suggestion card, and activity feed.

---

## Verification & Testing

- **Engine Tests**: Comprehensive Vitest suites for `workflowEngine`, `projectHealthEngine`, and `dashboardStatusEngine` (102 assertions).
- **Build Status**: Verified via production Vite build.
- **Linter**: Clean, zero warnings or errors.
