# Project Conventions — Read Before Coding

This project already has working infrastructure. Do NOT reinstall, replace, or redesign existing systems unless a defect is proven.

## Existing Infrastructure

| System | Purpose |
|--------|---------|
| **Docker** | Containerized dev environment |
| **DevContainer** | VS Code remote dev |
| **CI/CD** | GitHub Actions pipeline |
| **Vitest** | Unit/integration test runner (342 tests, 14 files) |
| **Playwright** | E2E browser testing |
| **Zod** | Runtime validation schemas |
| **Zustand** | State management |
| **Golden Datasets** | 7 hand-verified regression datasets |
| **Engineering Verification Framework** | Tolerance-based field comparison |
| **Documentation system** | Existing doc pipeline |
| **PDF/Excel engines** | Report generation |
| **Acceptance tests** | Engineering acceptance suite |
| **Regression tests** | Golden dataset regression |
| **Ruflo** | Agent memory system |
| **GitNexus** | Code knowledge graph |

## Rules

- **Audit first** — before changing anything, check if the existing system already handles it
- **Reuse existing architecture** — extend modules, don't create parallel ones
- **Preserve backward compatibility** — existing tests and datasets must keep passing
- **Focus only on the requested feature** — no scope creep
- **Run `detect_changes()` before committing**

## M7 — Attenuation is a pure downstream consumer (2026-06-14)

Since release 2.2.0, **attenuation must consume actual project assets** — never synthetic defaults. The contract:

- `src/services/attenuationInputBuilder.js` — pure function: `buildAttenuationInputFromProject(project, activeStationId)` derives the engine input from `project.stations`, station `tr`, station `groundbed`, station `pipelineSegments`, and `project.designBasis`. **No defaults, no synthetic assets.** If required assets are missing, returns `{ input: null, validation: { isReady: false, reasons, guidance } }`.
- `src/services/attenuationStateMachine.js` — `resolveAttenuationState({...})` returns one of `EMPTY | INCOMPLETE | READY | CALCULATED | STALE | ERROR`. UI must render accordingly.
- `src/store/slices/attenuationSlice.js` — exposes `attenuationState`, `attenuationGuidance`, `markAttenuationStale()`.
- `src/store/slices/stationSlice.js` — every station/TR/groundbed/segment mutation sets `attenuationDirty = true`.

**Never** add a `DEFAULT_INPUT` constant back to the attenuation page. **Never** fabricate stations/TRs/groundbeds to "make the page render". **Never** access `station.km` or `r.km` without an `?` guard.

## Architecture audit deliverables (2026-06-14)

Seven documents at the repository root define the platform contract. Read these **before** any architectural change:

| File | What it is |
|---|---|
| `../MODULE_DEPENDENCY_MATRIX.md` | Per-module inputs, outputs, hard deps, soft deps, forbidden ops, hardcoded values. |
| `../ENGINEERING_DATAFLOW_MAP.md` | Persistence tiers, live-action flows, consumer→producer table, mermaid. |
| `../BROKEN_LINK_ANALYSIS.md` | 30 broken-link findings (BL-01..BL-30), 16 single-source violations (HV-01..HV-16). |
| `../STALE_DATA_ANALYSIS.md` | Per-module staleness detection, 8 walk-throughs, `dataVersion` design. |
| `../MODULE_VALIDATION_DESIGN.md` | Per-page `Validate Data` button spec for 13 modules. |
| `../DASHBOARD_RECOMMENDATIONS.md` | Project-management-only Dashboard scope. 15 components to move out. |
| `../REPORT_SYNC_AUDIT.md` | 17 findings on Excel/PDF report sync. |

**Before editing any module, scan the relevant audit document for the broken-link and stale-data findings.**

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **PL_PCP** (346 symbols, 755 relationships, 29 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/PL_PCP/context` | Codebase overview, check index freshness |
| `gitnexus://repo/PL_PCP/clusters` | All functional areas |
| `gitnexus://repo/PL_PCP/processes` | All execution flows |
| `gitnexus://repo/PL_PCP/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->