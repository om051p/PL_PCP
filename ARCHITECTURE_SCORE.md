# ARCHITECTURE SCORE

**Date:** June 10, 2026  
**Auditor:** Buffy — Principal Software Architect  
**Platform:** CP Designer — Permanent ICCP Engineering Platform  

---

## Overall Score: 7.2 / 10

---

## Scoring Dimensions

### 1. Separation of Concerns — 8.5 / 10

**What's excellent:**
- The calculation engine is **pure, stateless, side-effect-free**. Every function in `engine/modules/calculations.js` is independently unit-testable with zero external dependencies.
- The 8-layer DDMLA architecture (Constants → Types → Presentation → State → Rules → Calculations → Optimizer → Reporting) provides clear dependency direction.
- The `standards/` module is a clean configuration layer — each standard is a pure config object that parameterizes the same engine. No calculation code is duplicated between standards.
- The reporting layer is well-isolated from the calculation layer.

**What's risky:**
- The `store/projectStore.js` violates separation by **orchestrating business logic** (calling calculations, rules, BOM, optimizer) directly in store actions. This should be a service/use-case layer.
- `pages/index.jsx` (2,800 lines) contains both UI presentation AND business logic (BOM generation calls, validation orchestration).

**What should stay:**
- `engine/` as pure functions — this is the crown jewel of the architecture
- `constants/` as single source of truth
- `standards/` as config-driven design pattern
- `components/ui.jsx` as domain-agnostic UI primitives

---

### 2. Code Organization — 6.0 / 10

**What's excellent:**
- The `engine/` subdirectory structure is clean: `modules/`, `rules/`, `optimizer/`, `__tests__/`
- Standards are properly separated into their own module
- Constants are centralized in one file

**What's risky:**
- `pages/index.jsx` is a **critical god file** at 2,800+ lines with 11 components. This is the single biggest code organization problem.
- `attenuation/` (root level) duplicates `src/engine/modules/attenuationEngine.js` — creates confusion about the source of truth.
- `firebase/` config is buried inside `src/` with no clear separation from the core engineering platform.
- No `services/` or `use-cases/` layer for business logic orchestration.
- No `hooks/` directory for custom React hooks.

**What should change:**
- Split `pages/index.jsx` into 11 separate files in `pages/` directory
- Remove duplicate `attenuation/` folder (or make it a proper package)
- Create `src/services/` for business logic orchestration
- Create `src/hooks/` for custom hooks

---

### 3. Scalability — 7.5 / 10

**What's excellent:**
- Multi-project support is **fully implemented** with create, duplicate, archive, delete, switch
- Standards framework is **architecture-ready** — adding a new standard requires only a config file
- The engine accepts standard config as a parameter, not hardcoded values
- Design modes are extensible (6 modes defined, 3 active, 3 reserved)
- The store uses Zustand with Immer for efficient immutable updates

**What's risky:**
- `localStorage` as the only persistence layer limits to ~5MB. Projects with many stations and revisions will hit this limit.
- No backend means no multi-user collaboration, no cloud sync, no audit trails.
- Revision snapshots are deep clones — storage grows quadratically with revision count.
- The store's `partialize` function persists ALL projects in one localStorage key — no lazy loading.

**What should stay:**
- The multi-project data model (`projects[]` with `activeProjectId`)
- The standards configuration pattern
- The design mode extensibility

---

### 4. Standards Framework — 7.0 / 10

**What's excellent:**
- Each standard is a **pure config object** with consistent structure (protectionCriteria, currentRequirement, temperatureCorrection, groundbed, trSizing, designLife, cokeBackfill, cable, standardsReferences)
- The standards resolver (`getActiveStandard()`) cleanly parameterizes the calculation engine
- Two complete standards implemented (Saudi Aramco, NACE SP0169) with documented differences

**What's risky:**
- Only 2 of 6 declared standards are implemented (ISO 15589, PDO, ADNOC, Custom are missing)
- The `types/index.js` declares `DesignStandard` as `'saudiAramco' | 'nace' | 'iso15589' | 'pdo' | 'adnoc' | 'custom'` but 4 are phantom types
- The `constants/index.js` re-exports from `standards/index.js`, creating a subtle circular concern
- `calcCurrentRequirement` defaults to `THRESHOLDS.SPARE_FACTOR` instead of always requiring a standard config — partial standard parameterization

**What should change:**
- Implement ISO 15589, PDO, ADNOC standards (or remove from types if not planned)
- Ensure ALL calculation functions accept standard config (no THRESHOLDS fallbacks)
- Move standards re-export out of constants

---

### 5. Testability — 8.0 / 10

**What's excellent:**
- The engine is **perfectly testable** — pure functions with no dependencies
- 16+ test files covering calculations, rules, BOM, optimizer, standards, store, reporting
- Golden dataset tests for engineering verification
- Decimal precision tests (using `decimal.js`)
- Zod validation schemas for input validation
- Playwright E2E tests

**What's risky:**
- No tests for `pages/` components (only E2E)
- No tests for `components/ui.jsx`
- `pages/index.jsx` god file is untestable as a monolith
- No integration tests for the full calculation pipeline
- Store tests exist but may not cover all multi-project edge cases

**What should stay:**
- The engine test strategy (pure function unit tests)
- Golden dataset verification approach
- Zod validation for inputs

---

### 6. Documentation — 8.0 / 10

**What's excellent:**
- Comprehensive `ARCHITECTURE.md` with Mermaid diagrams
- `DATABASE_SCHEMA.md` with entity schemas
- `SYNC_ARCHITECTURE.md` with data flow diagrams
- `MASTER.md` as central index
- Inline JSDoc comments throughout the codebase
- `Reference/KnowledgeBase/` with 8 AI-readable domain documents
- `AI_AGENT_RULES.md` for governance

**What's risky:**
- Documentation may drift from implementation (e.g., ARCHITECTURE.md references `src/engine/modules/attenuationEngine.js` but the attenuation module was added later)
- No API documentation for the engine functions (beyond JSDoc)
- The attenuation engine has extensive documentation but in a separate `attenuation/` folder

---

### 7. Engineering Correctness — 9.0 / 10

**What's excellent:**
- All formulas reference published standards (Dwight 1936, Sunde 1968, NACE SP0169, IEC 60287)
- The calculation engine matches the source Excel workbook
- Golden datasets verify calculation accuracy
- The standards framework correctly parameterizes formulas (exponential vs linear temp correction, different spare factors, etc.)
- The attenuation engine implements the transmission-line cosh model with linear superposition
- Decimal.js is used for precision-critical calculations

**What's risky:**
- Multi-segment calculation works but reporting only uses first segment
- The attenuation engine has a slightly different constant (`INCH_TO_M: 39.36` vs the standard `39.3701`) — matches the source spreadsheet but could confuse users
- No unit test coverage for some edge cases in groundbed resistance calculations

---

### 8. Maintainability — 6.5 / 10

**What's excellent:**
- Consistent coding style throughout
- Clean naming conventions (camelCase, descriptive function names)
- Constants are referenced by name, not magic numbers
- The engine functions have comprehensive JSDoc with formula references

**What's risky:**
- `pages/index.jsx` at 2,800 lines is a maintenance nightmare
- `projectStore.js` at 600+ lines with mixed concerns (state + business logic)
- No custom hooks for reusable stateful logic
- The `attenuation/` duplication creates maintenance burden
- Auth system is implemented but not integrated

---

## Score Summary

| Dimension | Score | Weight | Weighted |
|-----------|:-----:|:------:|:--------:|
| Separation of Concerns | 8.5 | 15% | 1.275 |
| Code Organization | 6.0 | 15% | 0.900 |
| Scalability | 7.5 | 15% | 1.125 |
| Standards Framework | 7.0 | 10% | 0.700 |
| Testability | 8.0 | 15% | 1.200 |
| Documentation | 8.0 | 10% | 0.800 |
| Engineering Correctness | 9.0 | 10% | 0.900 |
| Maintainability | 6.5 | 10% | 0.650 |
| **OVERALL** | | **100%** | **7.55** |

---

## Risk Assessment

| Risk | Severity | Likelihood | Impact |
|------|:--------:|:----------:|--------|
| `pages/index.jsx` collapse | 🔴 High | High | Merge conflicts, impossible to refactor |
| Store business logic bloat | 🟡 Medium | High | Hard to add new calculation types |
| localStorage limit hit | 🟡 Medium | Medium | Data loss for large projects |
| Missing standards create false UX | 🟡 Medium | Medium | Users expect ISO/PDO/ADNOC but find them missing |
| Attenuation code duplication | 🟡 Medium | High | Divergence between copies |
| Auth not connected | 🟢 Low | Low | No impact until auth is needed |

---

## Benchmark: How This Compares

| Metric | CP Designer | Industry Standard |
|--------|:-----------:|:-----------------:|
| Engine purity | ⭐⭐⭐⭐⭐ | Pure functions, zero side effects |
| Standards framework | ⭐⭐⭐⭐ | Config-driven, extensible |
| Multi-project support | ⭐⭐⭐⭐⭐ | Full CRUD with migration |
| Code organization | ⭐⭐⭐ | God files, missing layers |
| Test coverage | ⭐⭐⭐⭐ | Engine well-tested, UI untested |
| Documentation | ⭐⭐⭐⭐ | Comprehensive but may drift |
| Production readiness | ⭐⭐⭐ | Auth not wired, no backend |

**Bottom line:** The engineering calculation core is **world-class**. The application shell around it needs restructuring to match the quality of the engine.
