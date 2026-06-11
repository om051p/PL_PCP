# RAXA Platform — Implementation Roadmap

This document outlines the phased roadmap for the next evolution of the RAXA Platform, outlining tasks, risks, efforts, impacts, and dependencies for each phase.

---

## Roadmap Overview

```mermaid
gantt
    title RAXA Platform Evolution Timeline
    dateFormat  YYYY-MM-DD
    section Implementation Phases
    Phase 1: Duplicate Field Audit & UI Locking      :active, p1, 2026-06-15, 6d
    Phase 2: Design Basis State Architecture         :p2, after p1, 8d
    Phase 3: Calculation Dependency Matrix           :p3, after p2, 8d
    Phase 4: Access Control & Roles                  :p4, after p3, 10d
    Phase 5: Workspace Selector & Registry           :p5, after p4, 5d
    Phase 6: Tank/Vessel Foundations                 :p6, after p5, 15d
```

---

## Detailed Phase Analysis

### Phase 1: Duplicate Field Audit & UI Locking
Audits and locks duplicate input fields across sub-pages (TR Sizing, Groundbed, Attenuation, etc.) to prepare the codebase for a single source of truth. 

*   **Risk**: **Low**. Purely visual and input-handling changes. UI wrappers must disable duplicate inputs and display clear hints explaining *why* fields are disabled (e.g. "Locked to Central Design Settings").
*   **Effort**: **Medium (4 Engineering Days)**.
*   **Impact**: **High**. Enhances UI/UX by reducing cognitive load and preventing users from modifying values in multiple inconsistent places.
*   **Dependencies**: None.

---

### Phase 2: Design Basis State Architecture
Consolidates global project constants (Design Life, OD, Soil Resistivity, Back EMF, etc.) into a central `designBasis` state object. Implements central forms in `PageProjectSetup.jsx` and maps legacy state properties using store migration helpers.

*   **Risk**: **Low**. Refactoring state structures is clean but requires updating migration helpers to handle legacy project files without loss of data.
*   **Effort**: **Medium (5 Engineering Days)**.
*   **Impact**: **High**. Eliminates the root cause of inconsistent configurations across downstream screens.
*   **Dependencies**: **Phase 1** (requires duplicate fields to have been audited and readied for central binding).

---

### Phase 3: Calculation Dependency Matrix
Integrates the calculation cascade using a **"Needs Recalculation"** workflow. Updates [calculations.js](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/engine/modules/calculations.js) and the rules engine to mark stations as `needs_recalculation` when design basis parameters change, requiring manual trigger instead of automatic instant updates.

*   **Risk**: **Low/Medium**. Mitigates performance issues and database write stutters by shifting calculation execution to a deliberate user action ("Recalculate All").
*   **Effort**: **High (6 Engineering Days)**.
*   **Impact**: **Critical**. Ensures that calculation outputs, report summaries, and bills of materials are always verified against fresh inputs.
*   **Dependencies**: **Phase 2** (requires inputs to be linked to Design Basis state).

---

### Phase 4: Access Control & Roles
Deploys the Firestore `/users` registry, secures endpoints via Firestore Security Rules, and integrates role-based state checks (Admin, Manager, Engineer, Reviewer) utilizing logical tenant isolation (`organizationId`).

*   **Risk**: **Medium**. Incorrectly configured security rules can lock users out of their project data or block legitimate design modifications.
*   **Effort**: **High (8 Engineering Days)**.
*   **Impact**: **Critical**. Enforces IKK Group security compliance, restricts access to approved accounts, and protects project configurations from unauthorized changes.
*   **Dependencies**: None (can run in parallel with Phase 1-3).

---

### Phase 5: Workspace Selector & Registry
Implements the Workspace Registry config (`workspaceRegistry.js`) and creates the central workspace selection hub (`/workspace`) as the user's post-login landing screen. The dashboard dynamically renders modules (available vs. coming soon) from the registry.

*   **Risk**: **Low**. Dynamic loading eliminates the need for future code rewrites as new modules are released.
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

