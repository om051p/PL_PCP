# ARCHITECTURE SCORECARD — RAXA CP Designer Platform

**Version:** 1.0
**Date:** 2026-06-12
**Audit:** Technical Debt & Scalability
**Method:** Static analysis of 91 production + 30 test files (~34,000 LOC)

---

## 1. Overall Scores

| Dimension | Score | Grade | Weight |
|-----------|-------|-------|--------|
| **Maintainability** | 5.0 / 10 | C | 25% |
| **Portability** | 6.5 / 10 | B- | 15% |
| **Scalability** | 4.5 / 10 | D+ | 20% |
| **Testability** | 5.0 / 10 | C | 15% |
| **Enterprise Readiness** | 3.5 / 10 | D | 15% |
| **Standards Compliance Readiness** | 7.5 / 10 | B+ | 10% |
| **Weighted Total** | **5.2 / 10** | **C+** | 100% |

---

## 2. Maintainability Score: 5.0 / 10

### Strengths
- Clean separation: UI never imports Firebase or engine directly (+2)
- Consistent naming: repositories, services, engine follow predictable patterns (+1)
- JSDoc coverage: 447 annotations across codebase, especially strong in engine (+1)
- Standards system: well-isolated, each standard is a single file, resolver pattern clean (+1)

### Weaknesses
- **projectStore.js at 1,134 lines** — 30+ actions in one file; any change risks merge conflicts (-3)
- **ui.jsx at 532 lines** — 20 components co-located; should be 20 files (-2)
- **index.css at 5,406 lines** — monolithic, no component scoping (-2)
- **No PropTypes/TypeScript** — all type checking is JSDoc only, no runtime validation (-1)
- **Duplicate root files** — `resistivityEngine.js` exists at both root and src/ (-1)

---

## 3. Portability Score: 6.5 / 10

### Strengths
- Engineering engine: 100% pure functions, no platform dependencies (+2)
- localStorageApi: abstracted browser storage with in-memory fallback (+1)
- Reporting: pure jsPDF/xlsx, no server needed (+1)
- No backend: fully client-side SPA, deploys to any static host (+1)
- Standards: JS modules, can move to remote loading without engine changes (+1)

### Weaknesses
- Firebase SDK imported directly in 3 files (but isolated to api/ layer) (-1)
- No Provider interface abstraction yet (-1)
- E2E tests depend on Firebase Auth REST API directly (-0.5)
- Seed scripts use firebase-admin SDK (-0.5)

---

## 4. Scalability Score: 4.5 / 10

### Strengths
- Zustand: lightweight, supports slices and middleware (+1)
- localStorage persistence: no server round-trips for reads (+0.5)
- Calculation engine: pure functions, theoretically parallelizable (+0.5)

### Weaknesses
- **No code splitting** — all 20+ pages bundled eagerly into single chunk (-2)
- **No lazy loading** — no React.lazy for any route (-1)
- **Synchronous calculations** — UI freezes during station calc; no Web Worker (-2)
- **No memoization** — identical inputs recalculated every time (-1)
- **Monolithic single-org** — hardcoded `organizationId: 'ikk'` in 8+ locations (-1)
- **localStorage 5MB limit** — no migration path for large datasets (-1)

---

## 5. Testability Score: 5.0 / 10

### Strengths
- Test infrastructure: Vitest + Playwright configured and running (+1)
- Store tests with vi.mock: authStore.test.js correctly mocks Firebase SDK (+1)
- Firestore rules tests: 19 rule test cases (+1)
- Golden dataset tests: engineeringAcceptance.test.js (+1)
- Test helpers: decimalHelpers, verificationFramework (+0.5)

### Weaknesses
- **Coverage thresholds: 30/20/25/30** — very low, indicates known gaps (-2)
- **Commented-out tests** — `attenuationEngine.test.js` has 20+ test stubs (T101-T120) as comments, never implemented (-2)
- **distributed.test.js at 24 lines** — one function tested, rest of engine untested (-1)
- **No visual regression tests** for 13 visualization components (-0.5)
- **No property-based testing** — deterministic calculations ideal for fast-check (-0.5)

---

## 6. Enterprise Readiness Score: 3.5 / 10

### Strengths
- Role-based access control: admin/manager/engineer/viewer roles with permissions (+1)
- Audit logging: user management actions logged with retry + offline queue (+1)
- Session timeout: 12-hour max session enforced (+0.5)
- Firestore rules: RLS with org-scoped access patterns (+0.5)
- Error boundaries: React error boundary in AppShell (+0.5)

### Weaknesses
- **E2E auth bypass in production code** — `localStorage.getItem('e2e-mock-auth')` creates mock user, no PROD guard (-3)
- **Single organization only** — hardcoded `'ikk'` org; no multi-tenant isolation (-2)
- **No audit trail for engineering data** — station/project changes not logged (-2)
- **No RBAC granularity** — no project-level or station-level permissions (-1)
- **No offline capability** — app requires internet for auth and data sync (-1)
- **No monitoring/telemetry** — no Sentry, analytics, or performance tracking (-1)
- **No i18n** — all strings hardcoded English (-1)
- **No versioned standards** — projects can't pin to specific standard version (-0.5)
- **No data export API** — manual download only; no automated backup (-0.5)

---

## 7. Standards Compliance Readiness Score: 7.5 / 10

### Strengths
- Clean standards architecture: resolver pattern, single-file-per-standard (+2)
- 5 standards implemented: Saudi Aramco, NACE SP0169, ISO 15589, PDO, ADNOC (+1)
- Standards include: protection criteria, current requirement, groundbed, anode specs, cable constants (+1)
- Standards index test: 96 test cases validating structure and defaults (+1)
- Standards validation engine: validates station config against standard rules (+1)
- BOM references standards: generates compliant BOM per standard (+0.5)
- Calculation engine uses standard values: spare factor, anode utilization, etc. (+0.5)
- Design basis includes standard selection with migration support (+0.5)

### Weaknesses
- Standards are hardcoded JS — can't be updated without deploy (-1)
- No standard version pinning — always uses latest (-0.5)
- Saudi Aramco is default fallback — NACE/ISO users must explicitly select (-0.5)
- No standard diffing tool — can't compare what changed between versions (-0.5)

---

## 8. Dimension Detail: Calculation Engine

| Criterion | Score | Notes |
|-----------|-------|-------|
| Purity (no side effects) | 10/10 | All functions are deterministic |
| Test coverage | 4/10 | ~30% estimated; many empty test files |
| Documentation | 8/10 | JSDoc on all exported functions |
| Input validation | 6/10 | validateStation covers 10 fields; missing edge cases |
| Error handling | 5/10 | Returns sentinel values (999, null); no structured errors |
| Performance | 5/10 | Synchronous, no memoization, no Web Worker |
| **Engine Score** | **6.3 / 10** | |

---

## 9. Dimension Detail: State Management

| Criterion | Score | Notes |
|-----------|-------|-------|
| Single source of truth | 7/10 | Zustand store is central; some duplication with localStorage |
| Separation of concerns | 2/10 | 30+ actions in one file; auth + project in separate stores |
| Immutability | 8/10 | Immer middleware enforces immutability |
| Persistence | 6/10 | Zustand persist middleware; no migration framework |
| Debugging | 5/10 | No Redux DevTools; Zustand has basic devtools |
| **State Score** | **5.6 / 10** | |

---

## 10. Dimension Detail: Visualization Layer

| Criterion | Score | Notes |
|-----------|-------|-------|
| Reusability | 4/10 | VizAxis, VizGrid, VizLegend shared; but DonutChart, RadialGauge not reused |
| Performance | 5/10 | framer-motion animations; no virtualization for large datasets |
| Separation from store | 8/10 | Visualizations don't import projectStore directly |
| Accessibility | 1/10 | No ARIA labels on SVG elements |
| Testing | 2/10 | Only cableVoltage and groundbedStatus have unit tests |
| **Visualization Score** | **4.0 / 10** | |

---

## 11. Dimension Detail: Testing Architecture

| Criterion | Score | Notes |
|-----------|-------|-------|
| Unit test presence | 5/10 | 30 test files covering stores, engine, reporting |
| Integration test presence | 3/10 | E2E specs exist; no component integration tests |
| Test quality | 4/10 | Many commented-out tests; some files have <5 tests |
| Mock strategy | 7/10 | Firebase SDK mocked cleanly in vi.mock |
| CI readiness | 4/10 | npm test runs vitest; no CI config in repo |
| **Testing Score** | **4.6 / 10** | |

---

## 12. Radar Chart Data

```
            Maintainability (5.0)
                   /\
                  /  \
                 /    \
    Testability  /      \  Portability
       (5.0)    /________\  (6.5)
               /          \
              /            \
             /              \
    Scalability             Enterprise
       (4.5)                (3.5)
                     \
                      \
                       Standards (7.5)
```

---

## 13. Comparison: Current vs Target Scores

| Dimension | Current | Target (Post-Phase 0+1) | Target (Post-Phase 2+3) |
|-----------|---------|-------------------------|-------------------------|
| Maintainability | 5.0 → | 7.0 | 8.5 |
| Portability | 6.5 → | 7.5 | 9.0 |
| Scalability | 4.5 → | 6.5 | 8.0 |
| Testability | 5.0 → | 6.5 | 8.0 |
| Enterprise | 3.5 → | 5.5 | 8.0 |
| Standards | 7.5 → | 8.0 | 9.0 |
| **Overall** | **5.2 →** | **6.8** | **8.4** |

---

## 14. Top 5 Actions for Immediate Score Improvement

| Action | Dimensions Improved | Effort | Score Gain |
|--------|-------------------|--------|------------|
| Split projectStore (1,134 → 8 slices) | Maintainability (+1.5), Scalability (+0.5) | 3-4 days | +2.0 |
| Remove E2E auth bypass + add PROD guard | Enterprise (+1.5), Security | 2 hours | +1.5 |
| React.lazy code splitting for all pages | Scalability (+1.5), Performance | 2-3 days | +1.5 |
| Complete attenuationEngine tests (T101-T120) | Testability (+1.0) | 2 days | +1.0 |
| CSS modules or Tailwind @apply extraction | Maintainability (+1.0) | 5-10 days | +1.0 |
| **Total value** | | 13-20 days | **+7.0 points** |

---

## 15. Maturity Model

| Level | Name | Current? | Criteria |
|-------|------|----------|----------|
| L1 | Initial | | Ad-hoc, no patterns |
| L2 | Repeatable | ✅ | Consistent patterns, basic testing |
| L3 | Defined | ⚠️ | Documented architecture, code review |
| L4 | Managed | | Metrics-driven, CI/CD, monitoring |
| L5 | Optimizing | | Continuous improvement, A/B testing |

**Current maturity: L2 (Repeatable) → Target: L3 (Defined)**

Gap to L3:
- [ ] Architecture decision records (ADRs)
- [ ] Code review checklist
- [ ] Coverage gates in CI
- [ ] Style guide enforcement (ESLint already configured ✓)
- [ ] Component documentation (Storybook)

---

## 16. Final Verdict

| Attribute | Rating |
|-----------|--------|
| **Engineering core** | ⭐⭐⭐⭐⭐ Excellent — pure, testable, well-documented |
| **Standards system** | ⭐⭐⭐⭐ Good — clean pattern, needs versioning |
| **UI architecture** | ⭐⭐⭐ Adequate — needs store splitting, code splitting |
| **Test suite** | ⭐⭐⭐ Adequate — infrastructure good, coverage low |
| **Enterprise security** | ⭐⭐ Poor — E2E bypass, single-org, no audit trail |
| **Scalability** | ⭐⭐ Poor — no code splitting, synchronous calc, no multi-org |

**The platform has a diamond core (engineering) wrapped in clay (infrastructure).** The engineering calculations, standards, and rules are production-quality. The presentation layer, state management, and enterprise features need investment.

**Recommendation:** Invest in Phase 0 (store splitting + code splitting) immediately. The engineering engine is ready for enterprise use today — the infrastructure around it needs hardening.
