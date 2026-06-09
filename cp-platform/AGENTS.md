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