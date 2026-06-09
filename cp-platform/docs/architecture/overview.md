# Architecture Overview

The CP Platform uses an **8-Layer Domain-Driven Modular Layered Architecture (DDMLA)**:

```mermaid
graph TD
    L0["Layer 0: Foundation<br/>constants/, types/"]
    L1["Layer 1: Presentation<br/>components/, pages/"]
    L2["Layer 2: State Management<br/>store/"]
    L3["Layer 3: Business Rules<br/>engine/rules/"]
    L4["Layer 4: Pure Calculations<br/>engine/modules/"]
    L5["Layer 5: Optimization<br/>engine/optimizer/"]
    L8["Layer 8: Reporting<br/>reporting/"]

    L0 --> L1
    L0 --> L2
    L2 --> L3
    L2 --> L4
    L3 --> L1
    L4 --> L3
    L4 --> L5
    L2 --> L8
```

## Layer Responsibilities

| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| 0 | `constants/`, `types/` | Engineering constants, type definitions |
| 1 | `components/`, `pages/` | UI components and page views |
| 2 | `store/` | Zustand state management, persistence |
| 3 | `engine/rules/` | Business rules, BOM generation, insights |
| 4 | `engine/modules/` | Pure calculation functions (no side effects) |
| 5 | `engine/optimizer/` | Design alternatives, trade-off analysis |
| 8 | `reporting/` | PDF, Excel export/import |

## Key Design Decisions

- **Pure functions** for all calculations (testable, verifiable)
- **Unidirectional data flow** via Zustand store
- **Immutable state updates** via Immer
- **No backend** — fully client-side SPA
- **Zod schemas** for runtime validation
