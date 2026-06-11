# RAXA Platform — Implementation Roadmap

This document outlines the phased roadmap for the next evolution of the RAXA Platform, outlining tasks, risks, efforts, impacts, and dependencies for each phase.

---

## Roadmap Overview

```mermaid
gantt
    title RAXA Platform Evolution Timeline
    dateFormat  YYYY-MM-DD
    section Implementation Phases
    Phase 0: Calculation Dependency Matrix           :active, p0, 2026-06-12, 4d
    Phase 1: Duplicate Field Audit                 :p1, after p0, 4d
    Phase 2: Needs Recalculation                     :p2, after p1, 6d
    Phase 3: Design Basis                            :p3, after p2, 8d
    Phase 4: Access Control                          :p4, after p3, 10d
    Phase 5: Workspace Selector                      :p5, after p4, 5d
    Phase 6: Tank/Vessel Foundations                 :p6, after p5, 15d
```

---

## Detailed Phase Analysis

### Phase 0: Calculation Dependency Matrix
Maps all engineering formulas and input-to-output dependencies (NACE/Aramco calculations) to prepare the invalidation logic and state workflow.

*   **Risk**: **Low**. Documentation and analytical preparation phase. Results are documented in `CALCULATION_DEPENDENCY_MATRIX.md`.
*   **Effort**: **Low (3 Engineering Days)**.
*   **Impact**: **Critical**. Provides the baseline for the reactive recalculation engine.
*   **Dependencies**: None.

---

### Phase 1: Duplicate Field Audit
Audits and logs duplicate input fields across sub-pages (TR Sizing, Groundbed, Attenuation, etc.) to establish ownership and lock paths before code changes.

*   **Risk**: **Low**. Analysis-only phase. Results are documented in `DUPLICATE_FIELDS_AUDIT.md`.
*   **Effort**: **Low (3 Engineering Days)**.
*   **Impact**: **High**. Identifies redundant parameters and prepares inputs for central state binding.
*   **Dependencies**: **Phase 0** (requires the calculation formula dependencies to guide parameter audit).

---

### Phase 2: Needs Recalculation
Defines and implements the reactive **"Needs Recalculation"** workflow state machine. When inputs change, dependent station calculation statuses change to `'needs_recalculation'` to prevent stale caches, displaying clear visual alerts and requiring manual recalculation trigger.

*   **Risk**: **Low**. Focuses on state flags, sidebar badges, and warning banners.
*   **Effort**: **Low (4 Engineering Days)**.
*   **Impact**: **High**. Eliminates background calculation overhead and keeps report consistency visible.
*   **Dependencies**: **Phase 0** (mappings) and **Phase 1** (audited fields).

---

### Phase 3: Design Basis
Consolidates global constants into a single `designBasis` state object. Disables local input fields in downstream UIs, locks them to the central SSoT, and implements the store migrations to support legacy projects.

*   **Risk**: **Low/Medium**. Refactoring state structures requires updating state stores and introducing store migration helpers to load legacy project files cleanly.
*   **Effort**: **High (8 Engineering Days)**.
*   **Impact**: **High**. Eliminates the root cause of inconsistent configurations across downstream screens.
*   **Dependencies**: **Phase 2** (requires the recalculation invalidation flags to be wired to store updates).

---

### Phase 4: Access Control
Deploys the Firestore `/users` registry (UID-keyed), enforces Firebase Auth domain restrictions (`@ikkgroup.com`), email verification triggers, and dynamic RBAC checks using logical tenant isolation (`organizationId`).

*   **Risk**: **Medium**. Incorrectly configured security rules can lock users out of their project data or block legitimate design modifications.
*   **Effort**: **High (8 Engineering Days)**.
*   **Impact**: **Critical**. Enforces IKK Group security compliance, restricts access to approved accounts, and protects project configurations from unauthorized changes.
*   **Dependencies**: None.

---

### Phase 5: Workspace Selector
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


