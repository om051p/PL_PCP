# Known Issues & Technical Debt

**Version:** 1.0  
**Last Updated:** June 2026  

---

## Critical

| ID | Issue | Location | Impact | Workaround | Fix ETA |
|----|-------|----------|--------|------------|---------|
| C-001 | **No tests exist** — 345 lines of calculation code, 283 lines of rules, 309 lines of BOM engine have zero test coverage | Global | Calculation errors undetected | Manual cross-check with hand calculations | Sprint 1 |
| C-002 | **Coating efficiency factor computed but not applied** in current requirement calculation | `calculations.js:59-61` | Design current may be overly conservative | N/A (conservative is safe) | Sprint 1 |
| C-003 | **localStorage quota limit** — revisions with deep clones grow quadratically | `projectStore.js` | Project loss when quota exceeded (5MB) | Export projects regularly | Sprint 2 |

---

## High

| ID | Issue | Location | Impact | Workaround |
|----|-------|----------|--------|------------|
| H-001 | **Single pipeline segment hardcoded** — `pipelineSegments[0]` used throughout | `pages/`, `store/` | Cannot model multi-segment pipelines | Combine segments into one weighted average |
| H-002 | **Zod declared but unused** — validation library installed but never imported | `package.json` | Runtime validation not implemented | N/A |
| H-003 | **react-router-dom declared but unused** for main navigation | `package.json`, `App.jsx` | No deep linking, no shareable URLs | Manual routing via store |
| H-004 | **Revision deep clones** create full project copies on every save | `projectStore.js:243` | Quadratic storage growth | Limit revisions to N=20 |
| H-005 | **No error boundaries** — React crashes lose unsaved work | React tree | Data loss on component errors | Manually save before risky operations |
| H-006 | **No undo/redo** — Immer supports but not exposed | Store | Cannot revert accidental changes | Export before major edits |

---

## Medium

| ID | Issue | Location | Impact | Workaround |
|----|-------|----------|--------|------------|
| M-001 | **Magic number 700 kg/m³** hardcoded in coke calculation | `bomEngine.js:104` | Brittle if spec changes | Update hardcoded value |
| M-002 | **TR step sizes hardcoded** (next = voltage + 5/10 round, current + 10) | `optimizer.js:69-70` | May not match actual standard sizes | Manual TR selection |
| M-003 | **20-anode tail hardcoded** in CableConfig default | `store/projectStore.js:54` | UI has fixed grid of 20 inputs | Only use first N for proposed |
| M-004 | **No Input validation/sanitization** — user can enter negative values | All `FieldInput` | Negative pipe diameters possible | Enter sensible values |
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
| **Testing** | C-001 (no tests) | 5-7 days |
| **Code Quality** | H-001, H-002, H-003, H-005, L-005 | 3-5 days |
| **Performance** | H-004 (revision clones), C-003 (localStorage) | 2-3 days |
| **Hardcoding** | M-001, M-002, M-003 | 1-2 days |
| **UI/UX** | M-004, M-005, M-006 | 2-3 days |
| **Dependencies** | H-002, L-001, L-002 | 0.5 days |
| **Total** | **16 items** | **~14-20 days** |

---

## Known Bugs

| Bug | Steps to Reproduce | Status |
|-----|--------------------|--------|
| `PageCurrentRequirement` uses `st.name.split('@')[0].trim()` but station names don't contain `@` | No reproduction needed — cosmetic only | Cosmetic |
| `PageReport` creates revision on approve but `revDesc` state is not reset if input is empty | Click Approve without description — empty revision created | Low priority |

---

## Monitoring

- Run `npm audit` weekly for dependency vulnerabilities
- Check localStorage usage: `navigator.storage.estimate()` in browser console
- Review this document before every sprint planning session
