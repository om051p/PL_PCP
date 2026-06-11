# RAXA Platform — Implementation Roadmap

This document outlines the phased roadmap for the next evolution of the RAXA Platform, outlining tasks, risks, efforts, impacts, and dependencies for each phase.

---

## Roadmap Overview

```mermaid
gantt
    title RAXA Platform Evolution Timeline
    dateFormat  YYYY-MM-DD
    section Implementation Phases
    Phase 1: Design Basis Architecture           :active, p1, 2026-06-15, 10d
    Phase 2: Duplicate Field Removal             :p2, after p1, 7d
    Phase 3: Calculation Dependency Matrix       :p3, after p2, 8d
    Phase 4: Access Control & Roles              :p4, after p3, 10d
    Phase 5: Workspace Selector                  :p5, after p4, 5d
    Phase 6: Tank/Vessel Foundations             :p6, after p5, 15d
```

---

## Detailed Phase Analysis

### Phase 1: Design Basis Architecture
Consolidates global project constants (Design Life, OD, Soil Resistivity, Back EMF, etc.) into a central state object and updates state stores to serve as the Single Source of Truth (SSoT).

*   **Risk**: **Low**. Refactoring state structures is clean but requires updating migration helpers to handle legacy project files without loss of data.
*   **Effort**: **Medium (5 Engineering Days)**.
*   **Impact**: **High**. Eliminates the root cause of inconsistent configurations across downstream screens.
*   **Dependencies**: None.

---

### Phase 2: Duplicate Field Removal
Cleans up the user interface by disabling redundant inputs on sub-pages (TR Sizing, Groundbed, Attenuation, etc.) and locking them to the central Design Basis values.

*   **Risk**: **Low**. Purely visual and input-handling changes. UI wrappers must display clear hints explaining *why* fields are disabled (e.g. "Locked to Design Basis").
*   **Effort**: **Medium (4 Engineering Days)**.
*   **Impact**: **High**. Enhances UI/UX by reducing cognitive load and preventing users from modifying values in the wrong place.
*   **Dependencies**: **Phase 1** (requires the central data model to be present).

---

### Phase 3: Calculation Dependency Matrix
Integrates the auto-refresh calculation cascade. Updates [calculations.js](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/engine/modules/calculations.js) and the rules engine to reactively re-trigger calculations or reset validation flags when central Design Basis parameters change.

*   **Risk**: **Medium**. Auto-triggering math cascades can cause performance stutters if many stations are re-run simultaneously. Mitigated by debounce timers or "Needs Recalculation" flags.
*   **Effort**: **High (6 Engineering Days)**.
*   **Impact**: **Critical**. Ensures that calculation outputs, report summaries, and bills of materials are always calculated against fresh inputs.
*   **Dependencies**: **Phase 2** (requires inputs to be linked to SSoT).

---

### Phase 4: Access Control & Roles
Deploys the Firestore `/users` registry, secures endpoints via Firestore Security Rules, and integrates role-based state checks (Admin, Manager, Engineer, Reviewer) across pages and action buttons.

*   **Risk**: **Medium**. Incorrectly configured security rules can lock users out of their project data or block legitimate design modifications.
*   **Effort**: **High (8 Engineering Days)**.
*   **Impact**: **Critical**. Enforces IKK Group security compliance, restricts access to approved accounts, and protects project configurations from unauthorized changes.
*   **Dependencies**: None (can run in parallel with Phase 1-3).

---

### Phase 5: Workspace Selector
Implements the central workspace selection hub (`/workspace`) as the user's post-login landing screen, wrapping routing shells so that active workspaces render custom sidebars.

*   **Risk**: **Low**. Involves standard React routing refactors and UI container design.
*   **Effort**: **Low (3 Engineering Days)**.
*   **Impact**: **High**. Transitions the application from a single cathodic protection calculator into a multi-discipline engineering platform.
*   **Dependencies**: **Phase 4** (requires authentication flow and role mapping to determine workspace permissions).

---

### Phase 6: Tank/Vessel Foundations
Structures the database collections, schemas, and UI layout frames to support the introduction of *Raxa Tank* and *Raxa Vessel* modules.

*   **Risk**: **Low**. Creating empty container pages, mock calculators, and schema structures has zero impact on the active *Raxa Pipeline* calculations.
*   **Effort**: **High (10 Engineering Days)**.
*   **Impact**: **High**. Lays the groundwork for secondary revenue-generating modules, allowing rapid development of tank and vessel calculations.
*   **Dependencies**: **Phase 5** (requires the workspace selector shell to guide navigation to the new modules).
