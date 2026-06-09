# CP Designer — Permanent ICCP Engineering Platform

**A professional-grade engineering calculation platform for Impressed Current Cathodic Protection (ICCP) design.**

## Architecture Overview

```mermaid
graph TB
    subgraph "Presentation Layer"
        P1[React Components]
        P2[Pages]
        P3[UI Primitives]
    end
    subgraph "State Layer"
        S1[Zustand Store]
        S2[Immer]
        S3[Persistence]
    end
    subgraph "Engine Layer"
        E1[Calculation Modules]
        E2[Rules Engine]
        E3[BOM Engine]
        E4[Optimizer]
    end
    subgraph "Reporting Layer"
        R1[PDF Generator]
        R2[Excel Engine]
    end
    P1 --> S1
    P2 --> S1
    S1 --> E1
    S1 --> E2
    E1 --> E2
    E1 --> E4
    E2 --> E3
    S1 --> R1
    S1 --> R2
```

## Key Features

- **7 Calculation Modules** — NACE SP0169, Dwight, Sunde, IEC 60287 compliant
- **Validation Rules Engine** — 6 business rules + proactive insights
- **Design Optimizer** — 4 alternatives compared automatically
- **Professional Reporting** — PDF and Excel export
- **8-Layer Architecture** — Domain-Driven Modular Layered Architecture (DDMLA)

## Quick Start

```bash
npm install
npm run dev        # Development server on port 3000
npm run build      # Production build
npm test           # Run tests
npm run docs:serve # Documentation site
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build | Vite 8 |
| State | Zustand 5 + Immer 11 |
| Testing | Vitest 4 + Playwright |
| Validation | Zod 4 |
| Precision | Decimal.js + MathJS |
| Linting | ESLint 10 + Prettier |
| Docs | MkDocs Material |
| CI/CD | GitHub Actions |
