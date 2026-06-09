# AI Coding Agent Rules

**Version:** 1.0  
**Applies to:** opencode, Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot  

---

## Universal Rules (All Agents)

### Before Editing
- [ ] Read the file before editing it
- [ ] Run `impact()` if GitNexus is available
- [ ] Check `.gitignore` and `.graphifyignore` — never modify excluded files
- [ ] Verify the edit doesn't break existing functionality

### Coding Standards
- **Language:** JavaScript (ES modules), JSX for React
- **No TypeScript** — JSDoc typedefs used instead
- **No CSS-in-JS** — CSS custom properties + utility classes
- **Immer-style mutations** for state updates
- **Pure functions** only in `/src/engine/` — zero side effects, zero DOM access
- **No comments** unless explaining non-obvious logic

### File Conventions
| Rule | Example |
|------|---------|
| Keep files under 500 lines | Split large files into modules |
| One component per page function | `PageGroundbed`, `PagePipeline` |
| Engine functions in dedicated modules | `calculations.js`, `rulesEngine.js` |
| Constants in `constants/index.js` | Never hardcode magic numbers |
| Types in `types/index.js` | JSDoc `@typedef` |

### Commit Conventions
```bash
# Format
<type>: <description>

# Types
feat:     New feature
fix:      Bug fix
docs:     Documentation only
style:    Formatting, missing semicolons
refactor: Code change that neither fixes nor adds
test:     Adding or updating tests
chore:    Build process, dependencies
```

**No `Co-Authored-By` trailer** unless attribution is enabled in `.claude/settings.json`.

---

## Platform-Specific Rules

### opencode
- Use MCP tools when available (ruflo, gitnexus)
- Use `@agent` mentions for parallel task dispatch
- Read skill files before using commands

### Claude Code
- Follow `CLAUDE.md` rules
- Use `/graphify` for codebase knowledge graphs
- Use `/swarm` for multi-agent coordination
- Use `/memory` for persistent storage

### GitNexus (all agents)
- **MUST run** `impact()` before editing any symbol
- **MUST run** `detect_changes()` before committing
- **NEVER** ignore HIGH/CRITICAL risk warnings
- Use `gitnexus://repo/PL_PCP/context` for codebase overview

---

## Code Review Checklist

- [ ] All engine functions are pure (no side effects)
- [ ] No hardcoded magic numbers (use `constants/index.js`)
- [ ] No direct DOM manipulation in React components
- [ ] Zustand updates use Immer-style draft mutations
- [ ] JSDoc updated for new/modified functions
- [ ] Tests added for new engine functions
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

---

## AI Agent Hierarchy

When multiple AI agents are involved:

```
Lead Agent (you)
    ├── Architect — System design decisions
    ├── Engineer — Implementation
    ├── Reviewer — Code quality + security
    └── Tester — Test writing + execution
```

Agents communicate via `SendMessage`. The lead agent is responsible for coordination.

---

## Prohibited Actions

- ❌ Creating documentation files unless explicitly requested
- ❌ Saving files to project root (use `/src`, `/tests`, `/config`)
- ❌ Committing secrets, credentials, or `.env` files
- ❌ Using `eval()`, `new Function()`, or dynamic code execution
- ❌ Modifying `node_modules/`
- ❌ Deleting `.gitnexus/` or `.claude-flow/` without user confirmation

---

## Engineering Calculation Rules

**Critical: Never modify calculation formulas without explicit engineering approval.**

All formulas in `src/engine/modules/calculations.js` implement published engineering standards:
- NACE SP0169
- Dwight (1936)
- Sunde (1968)
- IEC 60287

If a formula change is requested:
1. Flag it as requiring engineering review
2. Document the proposed change with the standard reference
3. Add a test case with the known-input/known-output pair
4. Never change formulas silently
