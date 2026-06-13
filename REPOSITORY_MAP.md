# REPOSITORY MAP

**Date:** June 10, 2026  
**Repository:** raxa — CP Designer Platform  

---

## Visual Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         raxa REPOSITORY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    cp-platform/ (React SPA)                         │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│  │  │  constants/   │  │   types/     │  │     standards/           │  │   │
│  │  │  (Layer 0)    │  │  (Layer 0)   │  │     (Layer 0)           │  │   │
│  │  │  Pure data    │  │  JSDoc defs  │  │  Config objects         │  │   │
│  │  └──────┬───────┘  └──────────────┘  └──────────┬───────────────┘  │   │
│  │         │                                        │                  │   │
│  │  ┌──────▼────────────────────────────────────────▼───────────────┐  │   │
│  │  │                    engine/ (Layers 3-5)                       │  │   │
│  │  │                                                               │  │   │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │  │   │
│  │  │  │ modules/   │  │  rules/    │  │     optimizer/         │  │  │   │
│  │  │  │ calculations│  │ rulesEngine│  │   optimizer.js         │  │  │   │
│  │  │  │ validation │  │ bomEngine  │  │                        │  │  │   │
│  │  │  │ attenuation│  └────────────┘  └────────────────────────┘  │  │   │
│  │  │  └────────────┘                                               │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │                              │                                      │   │
│  │  ┌───────────────────────────▼──────────────────────────────────┐  │   │
│  │  │                    store/ (Layer 2)                           │  │   │
│  │  │  projectStore.js  ←── state + orchestration                  │  │   │
│  │  │  authStore.js     ←── Firebase auth                          │  │   │
│  │  │  attenuationStoreSlice.js ←── migration guide                │  │   │
│  │  └───────────────────────────┬──────────────────────────────────┘  │   │
│  │                              │                                      │   │
│  │  ┌───────────────────────────▼──────────────────────────────────┐  │   │
│  │  │              pages/ + components/ (Layer 1)                   │  │   │
│  │  │                                                               │  │   │
│  │  │  pages/index.jsx      ←── 11 pages (GOD FILE)                │  │   │
│  │  │  pages/PageDashboard  ←── Multi-project dashboard            │  │   │
│  │  │  pages/LoginPage      ←── Auth login                         │  │   │
│  │  │  pages/AttenuationPage←── Attenuation analysis               │  │   │
│  │  │  components/ui.jsx    ←── 15+ UI primitives                  │  │   │
│  │  │  components/layout.jsx←── Sidebar, TopBar                    │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │                                                                     │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │              reporting/ (Layer 8)                              │  │   │
│  │  │  pdfGenerator.js  ←── jsPDF A4 engineering report             │  │   │
│  │  │  excelEngine.js   ←── xlsx import/export                     │  │   │
│  │  │  bomExporter.js   ←── CSV BOM export                         │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │                                                                     │   │
│  │  ┌──────────────────────┐  ┌──────────────────────────────────┐    │   │
│  │  │  firebase/           │  │  test-utils/ + e2e/ + __tests__/  │    │   │
│  │  │  config.js           │  │  Testing infrastructure           │    │   │
│  │  └──────────────────────┘  └──────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │  attenuation/          │  │  Reference/                              │  │
│  │  (Standalone module)   │  │  ├── CP{2,3,4}.pdf                       │  │
│  │  ├── attenuationEngine │  │  ├── PCP Calculation sheet.xlsx          │  │
│  │  ├── attenuationTests  │  │  └── KnowledgeBase/ (8 .md files)       │  │
│  │  └── ATTENUATION_SPEC  │  │                                          │  │
│  └────────────────────────┘  └──────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Config & Tooling                                                     │  │
│  │  .gitnexus/  .claude/  .claude-flow/  .hive-mind/  graphify-out/    │  │
│  │  docker-compose.yml  Dockerfile  nginx.conf  vite.config.js          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File-by-File Map

### Application Source (`cp-platform/src/`)

| File | Lines | Purpose | Dependencies |
|------|:-----:|---------|-------------|
| **App.jsx** | 148 | Root component, routing, theme, error boundary | react-router, store, pages, components |
| **main.jsx** | 13 | Entry point, React 19 createRoot | react-dom, BrowserRouter |
| **index.css** | 1000+ | Global styles, CSS custom properties, dark mode | — |
| | | | |
| **components/ui.jsx** | 650 | 15+ reusable UI components | lucide-react, store (theme) |
| **components/layout.jsx** | 350 | Sidebar, TopBar, ProjectSelector | react-router, store, lucide-react |
| **components/ProtectedRoute.jsx** | 40 | Auth route guard | authStore |
| | | | |
| **constants/index.js** | 400 | Engineering constants (DESIGN_MODES, ANODE_SPECS, CABLE_SPECS, THRESHOLDS, STANDARDS) | standards/index |
| **types/index.js** | 150 | 18 JSDoc typedefs | — |
| | | | |
| **engine/modules/calculations.js** | 345 | 7 calculation modules + orchestrator | constants |
| **engine/modules/validation.js** | 60 | Zod schemas for input validation | zod |
| **engine/modules/attenuationEngine.js** | 450 | Attenuation cosh model analysis | — (zero deps) |
| **engine/rules/rulesEngine.js** | 283 | 6 validation rules + 3 proactive insights | constants |
| **engine/rules/bomEngine.js** | 309 | Rule-based BOM generation | constants |
| **engine/optimizer/optimizer.js** | 121 | Design alternatives generator | calculations, rules, constants |
| | | | |
| **store/projectStore.js** | 600 | Zustand store: multi-project, stations, calculations, attenuation, workflow, revisions | ALL engine modules, constants, standards |
| **store/authStore.js** | 100 | Firebase auth (login, logout, initialize) | firebase/auth |
| **store/attenuationStoreSlice.js** | 180 | Migration guide for attenuation state | — (documentation only) |
| | | | |
| **standards/index.js** | 60 | Standards resolver (getStandard, getActiveStandard) | saudiAramco, naceSP0169 |
| **standards/saudiAramco.js** | 120 | Saudi Aramco config (SAES-X-400, 17-SAMSS) | — |
| **standards/naceSP0169.js** | 120 | NACE SP0169 config | — |
| | | | |
| **reporting/pdfGenerator.js** | 432 | Professional A4 PDF engineering report | jspdf, constants |
| **reporting/excelEngine.js** | 394 | Multi-sheet XLSX export/import | xlsx, uuid, constants |
| **reporting/bomExporter.js** | 50 | CSV BOM export | — |
| | | | |
| **firebase/config.js** | 25 | Firebase initialization | firebase/app, firebase/auth |
| | | | |
| **pages/index.jsx** | 2,800 | **11 pages in ONE file** ⚠️ | store, components, engine, reporting, lucide-react |
| **pages/PageDashboard.jsx** | 160 | Multi-project dashboard | store, ui, lucide-react |
| **pages/LoginPage.jsx** | 120 | Firebase login page | authStore, lucide-react |
| **pages/AttenuationPage.jsx** | 320 | Attenuation analysis with Recharts | store, components, recharts |

### Test Files

| File | Purpose |
|------|---------|
| `engine/__tests__/goldenDatasets.test.js` | Golden dataset verification tests |
| `engine/__tests__/verificationFramework.test.js` | Engineering verification framework |
| `engine/__tests__/engineeringAcceptance.test.js` | Engineering acceptance tests |
| `engine/__tests__/decimalPrecision.test.js` | Decimal precision tests |
| `engine/modules/calculations.test.js` | Calculation module unit tests |
| `engine/modules/validation.test.js` | Validation schema tests |
| `engine/modules/distributed.test.js` | Distributed groundbed tests |
| `engine/modules/attenuationEngine.test.js` | Attenuation engine tests |
| `engine/rules/rulesEngine.test.js` | Rules engine tests |
| `engine/rules/bomEngine.test.js` | BOM engine tests |
| `engine/optimizer/optimizer.test.js` | Optimizer tests |
| `engine/standards/index.test.js` | Standards resolver tests |
| `store/projectStore.test.js` | Store tests |
| `test-utils/decimalHelpers.test.js` | Decimal helper tests |
| `test-utils/__tests__/verificationFramework.test.js` | Verification framework tests |
| `reporting/pdfGenerator.test.js` | PDF generator tests |
| `reporting/excelEngine.test.js` | Excel engine tests |
| `e2e/naceWorkflow.spec.js` | NACE workflow E2E test |
| `e2e/app.spec.js` | App-level E2E test |
| `e2e/fullWorkflow.spec.js` | Full workflow E2E test |

### Documentation Files (`cp-platform/`)

| File | Purpose |
|------|---------|
| ARCHITECTURE.md | Full system architecture document |
| DATABASE_SCHEMA.md | Entity schemas and storage reference |
| SYNC_ARCHITECTURE.md | Data flow and persistence architecture |
| MASTER.md | Central index and navigation |
| PRODUCT_REQUIREMENTS.md | Product vision and user stories |
| TESTING_STRATEGY.md | Test framework and coverage targets |
| UI_UX_GUIDELINES.md | Design system and component patterns |
| SECURITY.md | Security policy |
| KNOWN_ISSUES.md | Bug tracker and technical debt |
| FEATURE_TICKETS.md | Roadmap and feature backlog |
| AI_AGENT_RULES.md | AI agent governance rules |
| AGENTS.md | GitNexus code intelligence config |
| CLAUDE.md | Claude Code-specific rules |
| MEMORY.md | AI agent memory strategy |
| RELEASE_READINESS.md | Release checklist |
| CHANGELOG.md | Version history |
| DEVELOPMENT.md | Development guide |
| ENGINEERING_VERIFICATION.md | Engineering verification protocol |
| GOLDEN_DATASETS.md | Golden dataset documentation |
| DEFECT_REPORT.md | Defect tracking |
| BETA_RELEASE_REPORT.md | Beta release report |
| ACCEPTANCE_TEST_REPORT.md | Acceptance test results |
| TEST_COVERAGE_REPORT.md | Test coverage analysis |
| VARIANCE_ANALYSIS_REPORT.md | Variance analysis |
| DOCUMENTATION_AUDIT.md | Documentation audit |
| RELEASE_CANDIDATE_CHECKLIST.md | Release candidate checklist |
| MIGRATION_PLAN_MULTI_SEGMENT.md | Multi-segment migration plan |

### Reference Documents

| File | Purpose |
|------|---------|
| `Reference/PCP Calculation sheet.xlsx` | Source engineering workbook |
| `Reference/CP2.pdf` | CP calculation sheet #2 |
| `Reference/CP3.pdf` | CP calculation sheet #3 |
| `Reference/CP4.pdf` | CP calculation sheet #4 |
| `Reference/KnowledgeBase/DESIGN_METHODOLOGY.md` | Design methodology reference |
| `Reference/KnowledgeBase/DOCUMENT_INDEX.md` | Document index |
| `Reference/KnowledgeBase/EXCEL_TO_APPLICATION_MAPPING.md` | Excel-to-app mapping |
| `Reference/KnowledgeBase/ATTENUATION_GUIDE.md` | Attenuation analysis guide |
| `Reference/KnowledgeBase/AI_ENGINEERING_GUIDE.md` | AI engineering guide |
| `Reference/KnowledgeBase/ENGINEERING_ASSUMPTIONS.md` | Engineering assumptions |
| `Reference/KnowledgeBase/FORMULA_LIBRARY.md` | Formula library |
| `Reference/KnowledgeBase/ENGINEERING_CONCEPTS.md` | Engineering concepts |

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `vite.config.js` | Vite build config |
| `eslint.config.js` | ESLint flat config |
| `vitest.config.js` | Vitest test config |
| `playwright.config.js` | Playwright E2E config |
| `tsconfig.json` | TypeScript config (for IDE only) |
| `.prettierrc` | Prettier formatting |
| `vercel.json` | Vercel deployment |
| `netlify.toml` | Netlify deployment |
| `nginx.conf` | Nginx reverse proxy |
| `Dockerfile` | Production container |
| `Dockerfile.dev` | Development container |
| `docker-compose.yml` | Docker compose |
| `mkdocs.yml` | Documentation site |
