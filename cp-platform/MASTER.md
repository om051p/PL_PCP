# CP Designer — Project Master Index

**Version:** 1.0  
**Last Updated:** June 2026  
**Maintainer:** Engineering Team  

---

## Project Identity

| Field | Value |
|-------|-------|
| Name | CP Designer |
| Repository | `/workspaces/PL_PCP/cp-platform` |
| Stack | React 19 + Vite 8 (SPA, client-only) |
| Domain | Impressed Current Cathodic Protection (ICCP) Engineering |
| License | Proprietary |

---

## Document Map

### Core Documentation
| Document | Purpose | Priority |
|----------|---------|----------|
| `README.md` | Quick start, stack overview, deploy instructions | Onboarding |
| `ARCHITECTURE.md` | Full system architecture, diagrams, data flow, recommendations | Reference |
| `PRODUCT_REQUIREMENTS.md` | Product vision, user stories, acceptance criteria | Planning |
| `MASTER.md` | **This file** — central index | Navigation |

### Development & Quality
| Document | Purpose | Priority |
|----------|---------|----------|
| `TESTING_STRATEGY.md` | Test framework, coverage targets, CI pipeline | Engineering |
| `UI_UX_GUIDELINES.md` | Design system, component patterns, accessibility | Consistency |
| `SECURITY.md` | Security policy, vulnerability management | Compliance |
| `KNOWN_ISSUES.md` | Bug tracker, technical debt, workarounds | Risk Mgmt |
| `FEATURE_TICKETS.md` | Roadmap, feature backlog, implementation status | Planning |

### Data & Architecture
| Document | Purpose | Priority |
|----------|---------|----------|
| `DATABASE_SCHEMA.md` | State shape, entity relationships, localStorage schema | Reference |
| `SYNC_ARCHITECTURE.md` | Data flow, persistence cycle, import/export pipeline | Ops |
| `ARCHITECTURE.md` | System architecture, component diagrams, decision records | Reference |

### AI Agent
| Document | Purpose | Priority |
|----------|---------|----------|
| `AI_AGENT_RULES.md` | Governing rules for AI coding agents | Governance |
| `AGENTS.md` | GitNexus code intelligence agent instructions | Tooling |
| `MEMORY.md` | AI agent memory/persistence strategy | Tooling |
| `CLAUDE.md` | Claude Code-specific rules and agent comms | Tooling |

### Reference Documents
| Document | Purpose | Priority |
|----------|---------|----------|
| `../PCP Calculation sheet.xlsx` | Source engineering workbook — original spreadsheet the app was built to match | Reference |

---

## Directory Map

```
cp-platform/
├── src/                    # Application source code
│   ├── components/         # Reusable UI primitives
│   ├── constants/          # Engineering constants registry
│   ├── engine/             # Domain logic (pure functions)
│   │   ├── modules/        # Calculation modules
│   │   ├── rules/          # Rules + BOM engine
│   │   └── optimizer/      # Design alternatives
│   ├── pages/              # 11 page components
│   ├── reporting/          # PDF/Excel export engines
│   ├── store/              # Zustand state management
│   └── types/              # JSDoc type definitions
├── dist/                   # Production build output
├── public/                 # Static assets
├── tests/                  # Test suite (planned)
├── .claude/                # Ruflo AI agent config
├── .claude-flow/           # Ruflo runtime data
├── .gitnexus/              # GitNexus knowledge graph
├── graphify-out/           # Graphify knowledge graph (when run)
├── ../PCP Calculation sheet.xlsx   # Source engineering workbook (parent dir)
```

---

## Key Architecture Decisions

| ID | Decision | Rationale | Date |
|----|----------|-----------|------|
| ADR-001 | Client-only SPA, no backend | Calculations are pure/deterministic; localStorage suffices | 2026-01 |
| ADR-002 | Zustand + Immer for state | Mutable-style API with immutable persistence | 2026-01 |
| ADR-003 | JSDoc over TypeScript | Avoid compilation step; IDE support via doc comments | 2026-01 |
| ADR-004 | DDMLA 8-layer architecture | Domain-driven separation; calculation purity | 2026-01 |
| ADR-005 | Rule-based BOM generation | Per-design-mode rules instead of fixed lookup tables | 2026-01 |

---

## Quick Links

| Resource | Link |
|----------|------|
| Dev Server | `http://localhost:3000` |
| Production Build | `npm run build` |
| Run Tests | `npm test` (requires setup) |
| Lint | `npm run lint` |
| GitNexus Graph | `node .gitnexus/run.cjs status` |
| GitNexus Wiki | `node .gitnexus/run.cjs wiki` |

---

## Onboarding Checklist

- [ ] Read `README.md` — project overview
- [ ] Read `ARCHITECTURE.md` — system understanding
- [ ] Read `AI_AGENT_RULES.md` — AI agent governance
- [ ] Run `npm install && npm run dev` — local setup
- [ ] Run `node .gitnexus/run.cjs analyze` — knowledge graph
- [ ] Review `PRODUCT_REQUIREMENTS.md` — what we build
- [ ] Review `FEATURE_TICKETS.md` — what's coming
- [ ] Review `KNOWN_ISSUES.md` — what's broken
- [ ] Open `../PCP Calculation sheet.xlsx` — source engineering workbook the app was built from

---

## Glossary

| Term | Definition |
|------|------------|
| ICCP | Impressed Current Cathodic Protection |
| TR | Transformer-Rectifier unit |
| BOM | Bill of Materials |
| R_G | Groundbed resistance |
| R_c | Cable circuit resistance |
| R_T | Total circuit resistance |
| V_min | Minimum TR voltage required |
| Design Life | Anode bed operational lifetime (years) |
| Remoteness | Distance between groundbed and pipeline |
| Deepwell | Single deep borehole groundbed design |
| Shallow Vertical | Multiple parallel shallow anode holes |
| DDMLA | Domain-Driven Modular Layered Architecture |
