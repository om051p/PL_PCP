# Feature Tickets & Roadmap

**Version:** 1.0  
**Last Updated:** June 2026  

---

## Status Legend

| Status | Meaning |
|--------|---------|
| ✅ Complete | Implemented, tested, and deployed |
| 🏗️ In Progress | Active development |
| 🔲 Planned | Approved, not started |
| 💡 Proposed | Under consideration |
| ❌ Cancelled | Will not implement |

---

## Design Modes

| Ticket | Feature | Status | Effort | Dependencies |
|--------|---------|--------|--------|--------------|
| DM-001 | Deepwell ICCP | ✅ Complete | — | — |
| DM-002 | Shallow Vertical Groundbed | ✅ Complete | — | — |
| DM-003 | Distributed Anode Groundbed | ✅ Complete | — | — |
| DM-004 | Multi-Segment Pipeline Support | ✅ Complete | — | — |
| DM-005 | Tank Bottom ICCP | 💡 Proposed | High | DM-004 |
| DM-006 | Plant Piping ICCP | 💡 Proposed | High | DM-004 |
| DM-007 | Sacrificial Anode Design | 💡 Proposed | Medium | — |

---

## Core Engineering

| Ticket | Feature | Status | Effort | Description |
|--------|---------|--------|--------|-------------|
| ENG-001 | Surface Area Calculation | ✅ Complete | — | A = π × D × L |
| ENG-002 | Current Density Temp Correction | ✅ Complete | — | NACE SP0169 |
| ENG-003 | Current Requirement | ✅ Complete | — | +30% spare factor |
| ENG-004 | Deepwell R_G (Dwight) | ✅ Complete | — | Dwight 1936 formula |
| ENG-005 | Shallow R_G (Sunde) | ✅ Complete | — | Sunde 1968 formula |
| ENG-006 | Cable Resistance | ✅ Complete | — | Parallel tails + series mains |
| ENG-007 | TR Circuit Analysis | ✅ Complete | — | R_T, V_min, power |
| ENG-008 | Design Life | ✅ Complete | — | Y = NW/CI |
| ENG-009 | Multi-Layer Soil Model | 💡 Proposed | High | Layer resistivity profiles |
| ENG-010 | Coating Degradation Over Time | 💡 Proposed | Medium | Time-dependent coating efficiency |

---

## Validation & Rules

| Ticket | Feature | Status | Effort |
|--------|---------|--------|--------|
| RUL-001 | BR-001: TR Voltage Adequate | ✅ Complete | — |
| RUL-002 | BR-002: Groundbed R Limit | ✅ Complete | — |
| RUL-003 | BR-003: Circuit R 70% Limit | ✅ Complete | — |
| RUL-004 | BR-004: Circuit R 90% Warning | ✅ Complete | — |
| RUL-005 | BR-005: Design Life Target | ✅ Complete | — |
| RUL-006 | BR-006: Remoteness Check | ✅ Complete | — |
| RUL-007 | Proactive Insights (3 rules) | ✅ Complete | — |
| RUL-008 | Temperature-based insight expansion | 💡 Proposed | Low |

---

## UI & Pages

| Ticket | Feature | Status | Effort |
|--------|---------|--------|--------|
| UI-001 | Page: Project Setup | ✅ Complete | — |
| UI-002 | Page: Pipeline Parameters | ✅ Complete | — |
| UI-003 | Page: Current Requirement | ✅ Complete | — |
| UI-004 | Page: Groundbed Design | ✅ Complete | — |
| UI-005 | Page: Cable Resistance | ✅ Complete | — |
| UI-006 | Page: TR Sizing | ✅ Complete | — |
| UI-007 | Page: Validation | ✅ Complete | — |
| UI-008 | Page: Design Optimizer | ✅ Complete | — |
| UI-009 | Page: Bill of Materials | ✅ Complete | — |
| UI-010 | Page: Summary Report | ✅ Complete | — |
| UI-011 | Page: Import | ✅ Complete | — |
| UI-012 | Dark Mode | 💡 Proposed | Low |
| UI-013 | Undo/Redo | 💡 Proposed | Low |
| UI-014 | Keyboard Shortcuts | 💡 Proposed | Low |
| UI-015 | Page: Settings/Preferences | 💡 Proposed | Low |

---

## Reporting & Export

| Ticket | Feature | Status | Effort |
|--------|---------|--------|--------|
| RPT-001 | PDF Engineering Report | ✅ Complete | — | — |
| RPT-002 | Excel Export (multi-sheet) | ✅ Complete | — | — |
| RPT-003 | Excel Import (own format) | ✅ Complete | — | — |
| RPT-004 | Excel Import (generic PCP) | ✅ Complete | — | — |
| RPT-005 | CSV BOM Export | ✅ Complete | — | — |
| RPT-006 | CAD Export (DXF) | 💡 Proposed | High |

---

## Quality & DevOps

| Ticket | Feature | Status | Effort |
|--------|---------|--------|--------|
| QA-001 | Unit Tests: Calculations | ✅ Complete | — | — |
| QA-002 | Unit Tests: Rules Engine | ✅ Complete | — | — |
| QA-003 | Unit Tests: BOM Engine | ✅ Complete | — | — |
| QA-004 | Unit Tests: Store | ✅ Complete | — | — |
| QA-005 | Integration Tests | ✅ Complete | — | — |
| QA-006 | E2E Tests (Playwright) | 🏗️ In Progress | High | — |
| QA-007 | CI Pipeline (GitHub Actions) | ✅ Complete | — | — |
| QA-008 | Coverage Thresholds | ✅ Complete | — | — |
| QA-009 | Accessibility Audit | 💡 Proposed | Low |
| QA-010 | Performance Benchmark | 💡 Proposed | Low |

---

## Enterprise

| Ticket | Feature | Status | Effort | Description |
|--------|---------|--------|--------|-------------|
| ENT-001 | TypeScript Migration | 💡 Proposed | Medium | JSDoc → full TS |
| ENT-002 | Backend API Server | 💡 Proposed | High | Multi-user, cloud sync |
| ENT-003 | Authentication (OIDC) | 💡 Proposed | High | Auth0/Azure AD |
| ENT-004 | RBAC | 💡 Proposed | Medium | Engineer/Reviewer/Approver |
| ENT-005 | IndexedDB Storage | 💡 Proposed | Medium | Replace localStorage |
| ENT-006 | Multi-Tenancy | 💡 Proposed | High | Multiple projects |
| ENT-007 | Real-Time Collaboration | 💡 Proposed | High | Yjs/Automerge |
| ENT-008 | PWA Support | 💡 Proposed | Medium | Offline capability |

---

## AI Agent Integration

| Ticket | Feature | Status | Effort |
|--------|---------|--------|--------|
| AI-001 | GitNexus Knowledge Graph | ✅ Complete | — |
| AI-002 | Ruflo MCP Server | ✅ Complete | — |
| AI-003 | Graphify Knowledge Graph | ✅ Complete | — |
| AI-004 | opencode Skills | ✅ Complete | — |
| AI-005 | Automated PR Review Agent | 🔲 Planned | Medium |
| AI-006 | Automated Test Generation Agent | 🔲 Planned | Medium |

---

## Release Roadmap

```
Sprint 1 (Current)     → Testing Strategy + Core Tests + Missing Docs
Sprint 2               → Phase 1 Engine Tests + Multi-Segment Pipeline
Sprint 3               → Distributed Anode Mode + CI Pipeline
Sprint 4               → Phase 2-3 Tests + Performance Optimization
Q3 2026                → Tank Bottom ICCP + Sacrificial Anode
Q4 2026                → Backend API + Auth + IndexedDB Migration
2027                   → Enterprise Features + Real-Time Collaboration
```
