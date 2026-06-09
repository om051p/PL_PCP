# Product Requirements Document (PRD)

**Product:** CP Designer — Permanent ICCP Engineering Platform  
**Version:** 1.0  
**Status:** Draft  

---

## 1. Product Overview

### 1.1 Vision
Replace spreadsheets and manual calculation sheets with a professional, standards-compliant engineering design tool for Impressed Current Cathodic Protection (ICCP) systems.

### 1.2 Target Users
| Persona | Title | Needs |
|---------|-------|-------|
| **Safi** | Senior CP Engineer | Design ICCP systems, generate professional reports, comply with NACE/Aramco standards |
| **Ahmed** | Engineering Reviewer | Validate designs, run checks, approve/reject, audit trail |
| **Fahad** | Procurement Engineer | Extract BOM for purchasing, export to Excel |
| **Hassan** | Project Manager | Track design status, revision history, project portfolio |

### 1.3 User Stories

**Must Have (MVP)**
```
As a CP Engineer, I want to enter pipeline parameters so that I can model the protected structure.
As a CP Engineer, I want to configure deepwell and shallow vertical groundbeds so that I can design both common ICCP types.
As a CP Engineer, I want to run engineering calculations so that I can verify my design meets standards.
As a CP Engineer, I want to see validation checks so that I know my design passes all rules.
As a CP Engineer, I want to generate a professional PDF report so that I can submit it to the client.
As a CP Engineer, I want to export/import from Excel so that I can work with existing data.
```

**Should Have**
```
As a CP Engineer, I want to compare design alternatives so that I can optimize cost vs. performance.
As a CP Engineer, I want to generate a BOM so that procurement can order materials.
As a Reviewer, I want to advance designs through workflow states so that I can control the approval process.
As a CP Engineer, I want to create revision snapshots so that I have an audit trail.
```

**Could Have (Future)**
```
As a CP Engineer, I want to design distributed anode systems so that I can handle pipeline corridors.
As a CP Engineer, I want to design tank bottom ICCP so that I can protect storage tanks.
As a CP Engineer, I want to design sacrificial anode systems so that I have a galvanic option.
As a PM, I want multi-user collaboration so that my team can work simultaneously.
```

---

## 2. Functional Requirements

### FR-1: Project Management
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | User can create a new project with client info, project number, name | P0 |
| FR-1.2 | User can set system design life (15-40 years) | P0 |
| FR-1.3 | User can add/remove ICCP stations (1-N) | P0 |
| FR-1.4 | Project state persists in browser storage across sessions | P0 |

### FR-2: Pipeline Configuration
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | User can enter outside diameter (inches), wall thickness, length | P0 |
| FR-2.2 | User can set operating temperature (°C) and base current density | P0 |
| FR-2.3 | User can select coating system (FBE, 3LPE, Coal Tar, Bare) | P0 |
| FR-2.4 | User can enter soil resistivity and remoteness distances | P0 |

### FR-3: Engineering Calculations
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | System calculates external surface area (A = πDL) | P0 |
| FR-3.2 | System applies NACE SP0169 temperature correction | P0 |
| FR-3.3 | System calculates total current requirement with 30% spare factor | P0 |
| FR-3.4 | System calculates deepwell groundbed resistance (Dwight 1936) | P0 |
| FR-3.5 | System calculates shallow vertical groundbed resistance (Sunde 1968) | P0 |
| FR-3.6 | System calculates all cable resistances (anode tails, main cables) | P0 |
| FR-3.7 | System calculates TR circuit analysis (R_T, V_min, power) | P0 |
| FR-3.8 | System calculates anode bed design life (Y = NW/CI) | P0 |

### FR-4: Validation & Rules
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | System validates TR voltage adequacy (BR-001) | P0 |
| FR-4.2 | System validates groundbed resistance limit (BR-002) | P0 |
| FR-4.3 | System validates circuit resistance at 70% and 90% limits (BR-003, BR-004) | P0 |
| FR-4.4 | System validates design life meets target (BR-005) | P0 |
| FR-4.5 | System validates groundbed remoteness (BR-006) | P0 |
| FR-4.6 | System generates proactive engineering insights | P0 |

### FR-5: BOM Generation
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | System generates BOM from rules per design mode | P1 |
| FR-5.2 | BOM includes TRU, anodes, backfill, cables, junction boxes, test stations | P1 |
| FR-5.3 | BOM is locked until design reaches Approved status | P1 |

### FR-6: Reporting & Export
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6.1 | System generates professional A4 PDF engineering report | P0 |
| FR-6.2 | System exports multi-sheet Excel workbook (Summary, Inputs, Results, BOM) | P0 |
| FR-6.3 | System imports Excel projects (own format + generic PCP workbook) | P1 |

### FR-7: Workflow & Revision
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-7.1 | Stations progress through 7 workflow states | P0 |
| FR-7.2 | User can create revision snapshots at any point | P1 |
| FR-7.3 | Revision history is preserved and viewable | P1 |

---

## 3. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Calculation pipeline completes in <1s for N=20 stations | Performance |
| NFR-2 | Application loads in <3s on 4G connection | Performance |
| NFR-3 | PDF report generates in <5s for 10 stations | Performance |
| NFR-4 | Data persists in browser storage; survives tab close/refresh | Reliability |
| NFR-5 | Supports latest Chrome, Firefox, Edge, Safari (2 most recent versions) | Compatibility |
| NFR-6 | No user data leaves the browser (except PDF/Excel downloads) | Privacy |
| NFR-7 | All calculation formulas documented with standards references | Maintainability |
| NFR-8 | Zero external API calls required for core functionality | Independence |

---

## 4. Out of Scope

| Feature | Rationale |
|---------|-----------|
| User authentication | Client-only SPA; no backend planned for MVP |
| Multi-user collaboration | Requires server infrastructure |
| Real-time sync | Requires server + WebSocket |
| Mobile native app | Desktop-first engineering tool |
| 3D visualization | Not required for engineering calculations |
| GIS/mapping integration | Future enhancement |
| ERP/procurement integration | Future enhancement |

---

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| Calculation accuracy vs. hand calculations | ±0.1% |
| User completes a full design in | <30 min (experienced) |
| PDF report generation success rate | >99% |
| Zero calculation engine bugs | P0 target |
