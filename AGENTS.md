<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **PL_PCP** (4911 symbols, 7824 relationships, 253 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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

## Release 2.2.0 — M7 Attenuation Hardening & Architecture Audit (2026-06-14)

The repository now ships a **pure downstream-consumer** architecture for the Attenuation module and a **seven-document architecture audit** at the root.

### M7 contract (attenuation)

Attenuation must **consume actual project assets** — never synthetic defaults. The contract is enforced by:

- `cp-platform/src/services/attenuationInputBuilder.js` — pure function. No defaults. Returns `{ input, validation }`.
- `cp-platform/src/services/attenuationStateMachine.js` — `EMPTY | INCOMPLETE | READY | CALCULATED | STALE | ERROR`.
- `cp-platform/src/store/slices/attenuationSlice.js` — exposes `markAttenuationStale()`.
- `cp-platform/src/store/slices/stationSlice.js` — every station/TR/groundbed/segment mutation sets `attenuationDirty = true`.

**Forbidden:** adding `DEFAULT_INPUT` to the page, fabricating stations, accessing `station.km` without an optional chain. See `cp-platform/AGENTS.md` for the full contract.

### Architecture audit (read before any architectural change)

| File | Purpose |
|---|---|
| `MODULE_DEPENDENCY_MATRIX.md` | Per-module inputs/outputs/deps/forbidden ops/hardcoded values. 16 module entries, 13 hidden deps, 18 forbidden ops. |
| `ENGINEERING_DATAFLOW_MAP.md` | Persistence tiers, live-action flows, 35-row consumer→producer table, mermaid. |
| `BROKEN_LINK_ANALYSIS.md` | 30 broken-link findings (BL-01..BL-30) with severity. 16 single-source violations (HV-01..HV-16). |
| `STALE_DATA_ANALYSIS.md` | Per-module staleness detection. 8 walk-throughs. `dataVersion` design proposal. |
| `MODULE_VALIDATION_DESIGN.md` | Per-page `Validate Data` button spec for 13 modules. State machine: `NOT_STARTED | INCOMPLETE | VALID | WARNING | ERROR`. |
| `DASHBOARD_RECOMMENDATIONS.md` | Project-management-only Dashboard scope. 15 components to move out. |
| `REPORT_SYNC_AUDIT.md` | 17 findings (RS-01..RS-17). Engineering-content reachability matrix. |

Full release notes: `RELEASE_NOTES_2.2.md`.
