# Testing Strategy — CP Designer (ICCP Platform)

**Version:** 2.0  
**Last Updated:** June 2026  
**Classification:** QA & Verification Plan

---

## 1. Current Coverage Assessment

### Existing Tests: 1 file, 43 tests, ~396 lines
- **`calculations.test.js`** — 43 tests covering `calculations.js` only
- Coverage: 100% statements, 82.5% branches, 100% functions of `calculations.js`
- **Everything else: 0% coverage** — 3,214 lines of untested production code

### Coverage Gap (lines with zero tests)

| Module | Lines | Tested? | Risk |
|--------|-------|---------|------|
| `engine/modules/calculations.js` | 341 | ✅ 43 tests | LOW |
| `engine/rules/rulesEngine.js` | 283 | ❌ 0 tests | **HIGH** |
| `engine/rules/bomEngine.js` | 309 | ❌ 0 tests | **HIGH** |
| `engine/optimizer/optimizer.js` | 121 | ❌ 0 tests | **HIGH** |
| `store/projectStore.js` | 286 | ❌ 0 tests | **CRITICAL** |
| `reporting/pdfGenerator.js` | 430 | ❌ 0 tests | MEDIUM |
| `reporting/excelEngine.js` | 394 | ❌ 0 tests | MEDIUM |
| `pages/index.jsx` | 940 | ❌ 0 tests | MEDIUM |
| `components/ui.jsx` | 241 | ❌ 0 tests | LOW |
| `components/layout.jsx` | 135 | ❌ 0 tests | LOW |
| `constants/index.js` | 224 | ❌ 0 tests | MEDIUM |
| `App.jsx` | 75 | ❌ 0 tests | LOW |
| **Total** | **3,779** | **1.2% coverage** | |

### Risk Impact

A calculation error in the rules engine or store can produce an incorrect ICCP design that could be approved and constructed. The optimizer bug (confirmed) can silently produce invalid alternatives. The coating efficiency bug (confirmed) means every design is mis-calculated.

---

## 2. Test Pyramid

```
         ╱╲
        ╱ E2E ╲         5 critical user journeys (Playwright)
       ╱────────╲
      ╱Integration╲     10 flow tests (Vitest + Zustand)
     ╱──────────────╲
    ╱   Unit Tests    ╲  120+ tests (Vitest, priority: engine)
   ╱────────────────────╲
  ╱   Static Analysis    ╲  ESLint + manual code review
 ╱──────────────────────────╲
```

---

## 3. Test Execution Plan

### Phase 1: Engine Unit Tests (Week 1)

| Module | Priority | Tests | Key Focus |
|--------|----------|-------|-----------|
| `calculations.js` | Critical | 43 (existing) | Maintain + extend |
| `rulesEngine.js` | Critical | 24 | All 6 BR rules (PASS/FAIL/WARN), all 3 proactive insights, edge cases |
| `bomEngine.js` | High | 16 | Deepwell BOM, Shallow BOM, 0 anodes, 20+ anodes, all BOM sections |
| `optimizer.js` | High | 12 | 4 alternatives, parameter mutations, clone integrity, NaN prevention |

### Phase 2: Store Unit Tests (Week 2)

| Module | Tests | Key Focus |
|--------|-------|-----------|
| `projectStore.js` | 20 | Project CRUD, station CRUD, calculation flow, workflow, revisions, persistence, BOM gating |

### Phase 3: Reporting Unit Tests (Week 2-3)

| Module | Tests | Key Focus |
|--------|-------|-----------|
| `pdfGenerator.js` | 8 | PDF generation with valid/invalid data, page count, content correctness |
| `excelEngine.js` | 12 | Export/import roundtrip, own format detection, generic format, error handling |

### Phase 4: Integration Tests (Week 3)

| Test | Description |
|------|-------------|
| Input → Calculate → Validate → Export | Full pipeline data flow |
| Excel Import → Recalculate → Compare | Roundtrip fidelity |
| Multi-station calculation | Verify per-station isolation |
| Revision creation → Snapshot integrity | Deep clone correctness |

### Phase 5: E2E Tests (Week 4)

| Test | Tool |
|------|------|
| Complete design workflow (all 11 pages) | Playwright |
| Excel import with verification | Playwright |
| PDF download and content check | Playwright |
| Workflow progression with validation | Playwright |

---

## 4. Test Infrastructure

### Required Tools
```bash
# Already have:
vitest                    # Unit + integration tests
node --experimental-vm-modules  # ESM test execution

# Need to add:
npm install -D @vitest/coverage-v8   # Already installed
npm install -D @playwright/test       # E2E tests
npx playwright install                # Browser binaries
```

### Vitest Configuration (update `vitest.config.js`)
```javascript
export default defineConfig({
  test: {
    include: ['src/**/*.test.js'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: [
        'src/engine/**',
        'src/store/**',
        'src/reporting/**',
        'src/components/**',
        'src/constants/**',
      ],
      exclude: ['src/**/*.test.js'],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 85,
        lines: 80,
      },
    },
  },
})
```

---

## 5. Quality Gates

| Gate | Requirement | Blocking? |
|------|-------------|-----------|
| ESLint | 0 errors, 0 warnings | Yes |
| Unit Tests | 100% pass | Yes |
| Coverage | ≥80% statements, ≥70% branches | Yes |
| Integration Tests | 100% pass | Yes |
| E2E Tests | 5/5 critical journeys pass | Recommended |
| `npm audit` | 0 high/critical vulnerabilities | Yes |
| Build | `npm run build` succeeds | Yes |

---

## 6. Verification Methods

### Manual Verification
- Hand calculations for every formula (see `ENGINEERING_VERIFICATION.md`)
- Golden dataset comparison (see `GOLDEN_DATASETS.md`)
- Visual inspection of PDF/Excel output

### Automated Verification
- Vitest for unit + integration
- Playwright for E2E
- ESLint for static analysis
- `npm audit` for dependency security

### Engineering Verification
- NACE SP0169 compliance check
- Dwight (1936) formula verification
- Sunde (1968) formula verification
- 17-SAMSS standard compliance spot-check

---

## 7. Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Calculation error in engine | Low | **Critical** | Hand-calc verification + unit tests |
| Rules engine false PASS | Medium | **Critical** | Boundary tests + negative tests |
| Store data corruption | Low | **High** | Persist integration tests + revision tests |
| BOM incorrect quantities | Medium | **High** | Golden dataset comparison |
| Excel import data loss | Medium | **High** | Roundtrip tests |
| Optimizer generates invalid design | **High** | **High** | Clone integrity tests + parameter validation |
| Coating efficiency not applied | **Confirmed** | **Medium** | Fix in current sprint |
| Production sourcemap leak | **Confirmed** | **Critical** | Fix immediately |
