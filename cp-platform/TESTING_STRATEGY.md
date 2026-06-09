# Testing Strategy

**Version:** 1.0  
**Last Updated:** June 2026  

---

## Current State

| Category | Status | Coverage |
|----------|--------|----------|
| Unit Tests | ❌ None | 0% |
| Integration Tests | ❌ None | 0% |
| E2E Tests | ❌ None | 0% |
| CI Pipeline | ❌ Not configured | — |

**Risk:** 345 lines of engineering calculation code, 283 lines of rules engine, and 309 lines of BOM engine have **zero tests**. A formula error could produce incorrect ICCP designs.

---

## Test Pyramid

```
        ╱╲
       ╱ E2E ╲         3-5 critical user journeys
      ╱────────╲
     ╱Integration╲     10-15 data flow tests
    ╱──────────────╲
   ╱   Unit Tests    ╲  50-80+ tests (priority: engine)
  ╱────────────────────╲
 ╱   Static Analysis    ╲  ESLint + Type checking (JSDoc)
╱──────────────────────────╲
```

---

## Test Infrastructure

### Framework Choice
| Tool | Purpose | Why |
|------|---------|-----|
| **Vitest** | Unit + Integration tests | Already in ecosystem (Vite), fast, ESM-native |
| **Playwright** | E2E tests | Industry standard, supports headless CI |
| **ESLint** | Static analysis | Already configured |

### Installation
```bash
npm install -D vitest @vitest/coverage-v8
npm install -D @playwright/test
npx playwright install
```

### Configuration
```javascript
// vitest.config.js
import { defineConfig } from 'vite'
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',    // Engine is pure JS, no DOM needed
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/store/**', 'src/reporting/**'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 85,
        lines: 80,
      },
    },
  },
})
```

---

## Test Plan

### Phase 1 — Engine Unit Tests (Priority: Critical)

| Module | File | Test Count | Key Tests |
|--------|------|------------|-----------|
| **Surface Area** | `calculations.js` | 3 | Standard pipe (48"), small pipe (12"), edge case (0") |
| **Current Density** | `calculations.js` | 5 | Base temp (25°C), elevated (57°C), high (100°C), negative (0°C), threshold boundary |
| **Current Requirement** | `calculations.js` | 5 | Single segment, multi-segment, empty segments, spare factor verification, segment composition |
| **Deepwell R_G (Dwight)** | `calculations.js` | 5 | Standard config, shallow, deep, high resistivity, edge case (zero length) |
| **Shallow R_G (Sunde)** | `calculations.js` | 5 | 3 anodes, 9 anodes, 1 anode (degenerate), spacing variations, error handling |
| **Cable Resistance** | `calculations.js` | 6 | Single tail, 9 tails parallel, main cables, negative circuit, mixed sizes, empty tails |
| **TR Circuit** | `calculations.js` | 6 | Standard circuit, oversized TR, undersized TR, zero back EMF, high resistance, power calc |
| **Design Life** | `calculations.js` | 4 | Standard, short life, infinite (MMO), zero current |
| **Master Orchestrator** | `calculations.js` | 3 | Full pipeline, default station, edge values |
| **Rules Engine** | `rulesEngine.js` | 12 | All 6 BR rules (pass/fail), 3 proactive insights, edge cases, allPassed logic |
| **BOM Engine** | `bomEngine.js` | 8 | Deepwell BOM, shallow BOM, TRU rules, cable rules, junction box rules, 0 anodes, large N, status gating |
| **Optimizer** | `optimizer.js` | 4 | 4 alternatives generated, parameter mutations, result structure, helper functions |
| **Total Phase 1** | | **~66 tests** | |

### Phase 2 — Store Unit Tests

| Module | File | Test Count | Key Tests |
|--------|------|------------|-----------|
| **Project CRUD** | `projectStore.js` | 6 | Create, read, update, delete project; new project; revision creation |
| **Station CRUD** | `projectStore.js` | 8 | Add, remove, update station; set active; segment updates; edge cases (last station removal) |
| **Calculation Flow** | `projectStore.js` | 5 | Calculate station, calculate all, BOM gating, status transitions, error handling |
| **Workflow** | `projectStore.js` | 4 | Advance through all 7 states, invalid transitions, notes tracking, revision history |
| **Total Phase 2** | | **~23 tests** | |

### Phase 3 — Integration Tests

| Test | Description | Tools |
|------|-------------|-------|
| Input → Calculate → Results | Full pipeline from UI input to calc results | Vitest + Zustand |
| Calculate → Validate → Insights | Verify rules run correctly after calculation | Vitest |
| Export → Import Roundtrip | Export project to Excel, import back, verify equality | Vitest + xlsx |
| PDF Generation | Verify PDF renders without errors for valid/invalid projects | Vitest + jsPDF |
| **Total Phase 3** | **4 tests** | |

### Phase 4 — E2E Tests (Playwright)

| Test | Description |
|------|-------------|
| Complete Design Workflow | Enter pipeline params → configure groundbed → calculate → validate → export PDF |
| Import Workflow | Upload Excel → verify data mapped → recalculate → verify results match |
| Multi-Station | Add 3 stations → configure differently → calculate all → verify each |
| Error Recovery | Enter invalid values → verify validation messages → recover |

---

## CI Pipeline

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npx vitest run --coverage
      - run: npx playwright install
      - run: npx playwright test
```

---

## Coverage Targets

| Phase | Lines | Branches | Functions | Deadline |
|-------|-------|----------|-----------|----------|
| Phase 1 (Engine) | 90% | 85% | 95% | Sprint 1 |
| Phase 2 (Store) | 80% | 75% | 85% | Sprint 2 |
| Phase 3 (Integration) | 70% | 65% | 80% | Sprint 3 |
| Phase 4 (E2E) | — | — | — | Sprint 4 |
| **Final Target** | **85%** | **80%** | **90%** | **Sprint 4** |

---

## Test Data Strategy

### Fixture Categories
```javascript
// fixtures/stations.js
export const deepwellStation = { ... }         // Standard deepwell config
export const shallowStation = { ... }           // Standard shallow vertical config
export const edgeCaseStation = { ... }          // Boundary values
export const defaultProject = { ... }           // makeDefaultProject()
```

### Golden Reference Data
- Known-input/known-output pairs for every calculation formula
- Engineering handbook examples as test cases
- NACE SP0169 reference cases

---

## Non-Functional Testing

| Type | How | Frequency |
|------|-----|-----------|
| Performance | Measure calculation pipeline time (<500ms for N=20 stations) | Per commit |
| Memory | Heap snapshot on large projects (50 stations + 10 revisions) | Per release |
| Accessibility | Playwright axe-core integration | Per page change |
| Security | Dependency audit (`npm audit`) | Per commit |
