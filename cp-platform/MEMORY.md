# AI Agent Memory & Persistence Strategy

**Version:** 1.0  
**Last Updated:** June 2026  

---

## Overview

This project uses three AI agent memory systems. Each serves a different purpose:

| System | Purpose | Location | Size Limit |
|--------|---------|----------|------------|
| **Ruflo Memory** | Agent conversation memory, learned patterns, task state | `.claude-flow/data/` | ~100MB |
| **GitNexus Graph** | Code knowledge graph (symbols, relationships, flows) | `.gitnexus/` | ~50MB |
| **Zustand Persist** | Application state (project data) | `localStorage` | ~5MB |

---

## 1. Ruflo Memory (`ruflo memory`)

### Storage
- **Backend:** Hybrid (vector + key-value)
- **Location:** `.claude-flow/data/`
- **Persistence:** Automatic on every agent interaction

### Memory Types
| Type | Example | TTL |
|------|---------|-----|
| Task Context | "Working on deepwell groundbed optimization" | Session |
| Learned Pattern | "User prefers HSCI TA-4 anodes for all designs" | Permanent |
| Code Insight | "calcDweellGroundbedResistance formula validated against Dwight 1936" | Permanent |
| Error Log | "TR circuit analysis failed — voltage deficit 2.3V" | 30 days |

### Commands
```bash
# Store a memory
ruflo memory store "key" "value"

# Search memory by meaning
ruflo memory search "groundbed resistance calculation"

# List all memories
ruflo memory list

# Export/backup
ruflo memory export memories.json

# Import/restore
ruflo memory import memories.json
```

### Reset Procedure
```bash
rm -rf .claude-flow/data/*
# Then restart opencode/Claude Code
```

---

## 2. GitNexus Graph Memory

### Storage
- **Backend:** LadybugDB native (persistent, queryable)
- **Location:** `.gitnexus/`
- **Content:** 346 symbols, 755 relationships, 29 execution flows

### Commands
```bash
# Check status
node .gitnexus/run.cjs status

# Re-analyze (stale graph)
node .gitnexus/run.cjs analyze

# Query symbol
node .gitnexus/run.cjs query "calcDweellGroundbedResistance"

# Generate wiki
node .gitnexus/run.cjs wiki
```

---

## 3. Application State (Zustand Persist)

### Storage
- **Backend:** Browser `localStorage`
- **Key:** `cp-platform-project`
- **Content:** Full project object + active station ID
- **Persistence:** Written on every state change

### Backup
```bash
# Export project as Excel
npm run dev → Page Report → Export to Excel

# Export as PDF
npm run dev → Page Report → Download PDF Report
```

### Restore
```bash
# Import from Excel
npm run dev → Page Import → Drop Excel file
```

---

## Memory Flow Diagram

```
AI Agent Session Start
    │
    ├──→ Ruflo loads memories from .claude-flow/data/
    │       └── Recovers task context, learned patterns
    │
    ├──→ GitNexus loads graph from .gitnexus/
    │       └── Provides code structure, relationships
    │
    ├──→ Zustand loads project from localStorage
    │       └── Restores full application state
    │
    ▼
Agent Works
    │
    ├──→ Writes state mutations → localStorage
    ├──→ Writes new memories → .claude-flow/data/
    └──→ (Re-index on code change) → .gitnexus/
```

---

## Backup Strategy

| What | How | Frequency |
|------|-----|-----------|
| Project data | Export to Excel (manual) | End of each design session |
| Agent memories | `ruflo memory export` | Weekly |
| Knowledge graph | Included in `.gitnexus/` | Per analysis run |
| Git commit | Push to remote | Per meaningful change |

---

## Caveats

- **localStorage is not backed up.** Export Excel/PDF for archival.
- **Ruflo memory is local-only.** No cross-machine sync.
- **GitNexus graph is per-repo.** Re-analyze if `.gitnexus/` is deleted.
- **Browser clear** destroys all localStorage data.
