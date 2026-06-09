# Known Issues & Technical Debt

**Version:** 1.0  
**Last Updated:** June 2026  

---

## Critical

| ID | Issue | Location | Impact | Workaround | Fix ETA |
|----|-------|----------|--------|------------|---------|
| C-001 | **100% Core Engine Coverage** — Comprehensive unit tests verified for calculation, rules, and BOM engines | Global | Resolved | N/A | Resolved |
| C-002 | **Coating efficiency factor removed** from current requirement calculation | `calculations.js` | Fixed | N/A | Resolved |
| C-003 | **localStorage quota limit** — revisions with deep clones grow quadratically | `projectStore.js` | Project loss when quota exceeded (5MB) | Export projects regularly | Sprint 2 |

---

## High

| ID | Issue | Location | Impact | Workaround |
|----|-------|----------|--------|------------|
| H-001 | **Multi-segment Support Enabled** — UI now correctly handles and displays multiple pipeline segments per station | `pages/` | Resolved | N/A | Resolved |
| H-002 | **Zod usage verified** — active in `validation.js` and `projectStore.js` | `validation.js` | Resolved | N/A | Resolved |
| H-003 | **Client-side routing active** — using `react-router-dom` for deep linking and history | Global | Resolved | N/A | Resolved |
| H-004 | **Revision deep clones** create full project copies on every save | `projectStore.js:243` | Quadratic storage growth | Limit revisions to N=20 |
| H-005 | **Error boundaries implemented** — React tree protected from UI crashes | `App.jsx` | Resolved | N/A | Resolved |
| H-006 | **No undo/redo** — Immer supports but not exposed | Store | Cannot revert accidental changes | Export before major edits |

---

## Medium

| ID | Issue | Location | Impact | Workaround |
|----|-------|----------|--------|------------|
| M-001 | **Magic number 700 kg/m³ removed** — using calculated results in UI | `pages/index.jsx` | Resolved | N/A | Resolved |
| M-002 | **TR step sizes configurable** — using `THRESHOLDS` constants | `optimizer.js` | Resolved | N/A | Resolved |
| M-003 | **50-anode tail support** — default station array increased to 50 | `projectStore.js` | Resolved | N/A | Resolved |
| M-004 | **Input validation active** — numeric fields now sanitize inputs to respect min/max constraints | `ui.jsx`, `pages/` | Resolved | N/A | Resolved |
| M-005 | **CSS is ad-hoc** — no design system, some inline styles | `pages/index.jsx` | Inconsistency across 11 pages | N/A |
| M-006 | **No loading states** for calculation | Store | Brief UI freeze during calc | (Calculation is <100ms) |
| M-007 | **No manual in ARCHITECTURE.md** C4 diagrams need renderer | `ARCHITECTURE.md` | Diagrams won't render on GitHub | Use Mermaid Live Editor |

---

## Low

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| L-001 | `date-fns` imported but only used for `format` | `package.json` | Could be replaced with native `Intl` |
| L-002 | `recharts` imported but minimal chart usage | `package.json` | Bundle size increase |
| L-003 | No `.env.example` or environment variables | Root | Not needed (client-only) but absent |
| L-004 | No `.nvmrc` for Node version pinning | Root | Use Node 20+ |
| L-005 | `App.jsx` uses `useState` for sidebar + redundant Store state | `App.jsx:26` | Inconsistent state source |

---

## Technical Debt Register

| Category | Items | Estimated Days to Fix |
|----------|-------|----------------------|
| **Testing** | C-001 (100% engine coverage) | Resolved |
| **Code Quality** | H-001, H-002, H-003, H-005, L-005 | 3-5 days |
| **Performance** | H-004 (revision clones), C-003 (localStorage) | 2-3 days |
| **Hardcoding** | M-001, M-002, M-003 | Resolved |
| **UI/UX** | M-004, M-005, M-006 | 2-3 days |
| **Dependencies** | H-002, L-001, L-002 | 0.5 days |
| **Total** | **16 items** | **~10-15 days** |

---

## Known Bugs

| Bug | Steps to Reproduce | Status |
|-----|--------------------|--------|
| `PageCurrentRequirement` redundant `@` split removed | Cosmetic | Resolved |
| `PageReport` revision description resets correctly | Functional | Resolved |
| `PageReport` station summary layout upgraded to Grid3 for multi-segment | UI | Resolved |

---

## Monitoring

- Run `npm audit` weekly for dependency vulnerabilities
- Check localStorage usage: `navigator.storage.estimate()` in browser console
- Review this document before every sprint planning session
