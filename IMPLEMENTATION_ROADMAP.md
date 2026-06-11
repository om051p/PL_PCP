# RAXA Platform — Implementation Roadmap

This document outlines the phased roadmap for the next evolution of the RAXA Platform, outlining tasks, risks, efforts, impacts, and dependencies for each phase.

---

## Roadmap Overview

```mermaid
gantt
    title RAXA Platform Evolution Timeline
    dateFormat  YYYY-MM-DD
    section Implementation Phases
    Phase 1: Duplicate Field Audit                 :active, p1, 2026-06-15, 4d
    Phase 2: Calculation Dependency Matrix           :p2, after p1, 8d
    Phase 3: Design Basis Architecture               :p3, after p2, 8d
    Phase 4: Access Control & Roles                  :p4, after p3, 10d
    Phase 5: Workspace Selector (RAXA)               :p5, after p4, 5d
    Phase 6: Tank/Vessel Foundations                 :p6, after p5, 15d
```

---

## Detailed Phase Analysis

### Phase 1: Duplicate Field Audit
Audits and logs duplicate input fields across sub-pages (TR Sizing, Groundbed, Attenuation, etc.) to establish ownership and lock paths before code changes.

*   **Risk**: **Low**. Analysis-only phase. Results are documented in `DUPLICATE_FIELDS_AUDIT.md`.
*   **Effort**: **Low (3 Engineering Days)**.
*   **Impact**: **High**. Identifies redundant parameters and prepares inputs for central state binding.
*   **Dependencies**: None.

---

### Phase 2: Calculation Dependency Matrix
Defines the reactive **"Needs Recalculation"** workflow state machine. Maps all NACE/Aramco engineering formulas and invalidation rules to prevent stale caches when inputs change.

*   **Risk**: **Low**. Documentation and architectural prep phase. Results are saved in `CALCULATION_DEPENDENCY_MATRIX.md`.
*   **Effort**: **Low (3 Engineering Days)**.
*   **Impact**: **Critical**. Prevents UI stutter and database write overhead by transitioning from auto-triggering background execution to manual user action.
*   **Dependencies**: **Phase 1** (requires the list of audited duplicate fields).

---

### Phase 3: Design Basis Architecture
Consolidates global constants into a single `designBasis` state object. Disables local input fields in downstream UIs, locks them to the central SSoT, and implements the "Needs Recalculation" flags and warning alerts.

*   **Risk**: **Low/Medium**. Refactoring state structures requires updating state stores and introducing store migration helpers to load legacy project files cleanly.
*   **Effort**: **High (8 Engineering Days)**.
*   **Impact**: **High**. Eliminates the root cause of inconsistent configurations across downstream screens.
*   **Dependencies**: **Phase 1** (audit list) and **Phase 2** (dependency mappings).

---

### Phase 4: Access Control & Roles
Deploys the Firestore `/users` registry (UID-keyed), enforces Firebase Auth domain restrictions (`@ikkgroup.com`), email verification triggers, and dynamic RBAC checks using logical tenant isolation (`organizationId`).

*   **Risk**: **Medium**. Incorrectly configured security rules can lock users out of their project data or block legitimate design modifications.
*   **Effort**: **High (8 Engineering Days)**.
*   **Impact**: **Critical**. Enforces IKK Group security compliance, restricts access to approved accounts, and protects project configurations from unauthorized changes.
*   **Dependencies**: None.

---

### Phase 5: Workspace Selector (RAXA)
Implements the central workspace selection hub (`/workspace`) as the user's landing screen. The dashboard dynamically renders modules (available vs. coming soon) from the central Workspace Registry config (`workspaceRegistry.js`).

*   **Risk**: **Low**. Dynamic registry configuration prevents future code rewrites as new modules are activated.
*   **Effort**: **Low (3 Engineering Days)**.
*   **Impact**: **High**. Transitions the application from a single cathodic protection calculator into a multi-discipline engineering platform.
*   **Dependencies**: **Phase 4** (requires authentication flow and role mapping to determine workspace permissions).

---

### Phase 6: Tank/Vessel Foundations
Structures the database collections, schemas, and UI layout frames to support the introduction of *Raxa Tank* and *Raxa Vessel* modules.

*   **Risk**: **Low**. Creating empty container pages, mock calculators, and schema structures has zero impact on the active *Raxa Pipeline* calculations.
*   **Effort**: **High (10 Engineering Days)**.
*   **Impact**: **High**. Lays the groundwork for secondary modules, allowing rapid development of tank and vessel calculations.
*   **Dependencies**: **Phase 5** (requires the workspace selector shell to guide navigation to the new modules).

