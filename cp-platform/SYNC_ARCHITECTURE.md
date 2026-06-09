# Sync & Data Flow Architecture

**Version:** 1.0  

---

## Data Flow Overview

Since this is a **client-only SPA with no backend**, "sync" refers to:
1. **localStorage persistence** — Survives tab close/refresh
2. **Import/Export pipeline** — Excel/PDF as data interchange
3. **AI agent memory** — Persistence across agent sessions

---

## Data Flow Diagram

```
┌──────────────┐     User Input      ┌──────────────┐
│   React UI   │ ←─────────────────  │   Browser    │
│  (11 pages)  │     onChange()      │   Events     │
└──────┬───────┘                     └──────────────┘
       │ store action
       ▼
┌──────────────┐     calculation     ┌──────────────┐
│  Zustand     │ ←─────────────────  │  Engine      │
│  Store       │     dispatch()      │  (pure JS)   │
│  (Immer)     │ ──────────────────→ │              │
└──────┬───────┘     results         └──────────────┘
       │
       ├─────────────────────────────────────┐
       │ persist middleware                  │
       ▼                                     ▼
┌──────────────┐                    ┌──────────────┐
│ localStorage │                    │  In-Memory   │
│ "cp-platform │                    │  UI State    │
│  -project"   │                    │ (not persisted)│
└──────────────┘                    └──────────────┘
```

---

## Persistence Cycle

### Write (every user action)
```
User types/selects → onChange handler → Zustand action → Immer draft
→ new state object → middleware serializes → localStorage.setItem()
```

### Read (on app load)
```
App mounts → Zustand persist middleware → localStorage.getItem()
→ parse JSON → hydrate store → UI renders
```

### Calculation Write
```
Click "Calculate" → runStationCalculations() → runRules() → generateAlternatives()
→ generateBOM() → Immer draft → state update → localStorage.setItem()
```

---

## Offline Strategy

| Scenario | Behavior | Data Loss Risk |
|----------|----------|----------------|
| Tab close/refresh | ✅ Full state restored from localStorage | None |
| Browser crash | ✅ Full state restored | None |
| localStorage clear | ❌ All projects lost | Total |
| Incognito/private mode | ⚠️ localStorage cleared on tab close | Total at close |
| Browser storage full | ❌ Writes fail (quota exceeded) | Current session |

### Mitigation
```javascript
// Auto-save warning at 80% capacity
if (navigator.storage?.estimate) {
  const { usage, quota } = await navigator.storage.estimate()
  if (usage / quota > 0.8) {
    showWarning("Storage nearly full. Export projects to avoid data loss.")
  }
}
```

---

## Import Pipeline

```
Excel File → FileReader → xlsx.read(arrayBuffer) → parseOwnFormat | parseGenericFormat
→ { project, errors } → updateProject() → newProject() → UI refreshes → localStorage persist
```

### Import Reliability
| Format | Reliability | Notes |
|--------|-------------|-------|
| Own export | 🟢 High | Full field mapping |
| Generic PCP | 🟡 Medium | Best-effort, defaults for missing |
| Malformed | 🔴 Low | Errors reported, partial data |

---

## Export Pipeline

### PDF
```
Project object → generateEngineeringReport(project) → jsPDF document
→ doc.save(filename.pdf) → Browser download
```

### Excel
```
Project object → exportToExcel(project) → XLSX workbook
→ XLSX.writeFile(wb, filename.xlsx) → Browser download
```

---

## AI Agent Memory Sync

| System | Write Trigger | Storage | Sync |
|--------|---------------|---------|------|
| Ruflo | Every agent interaction | `.claude-flow/data/` | Filesystem |
| GitNexus | Manual `analyze` | `.gitnexus/` | Filesystem |
| Graphify | Manual run | `graphify-out/` | Filesystem |

**No cross-machine sync.** These are local-only. To transfer:
1. Commit `.claude-flow/` and `.gitnexus/` to git (if appropriate)
2. Or re-run `analyze` on the target machine

---

## Future: Backend Sync

When adding a backend, the sync architecture should use:
```
Browser                    Backend                    Database
┌─────────┐   REST/WS    ┌──────────┐    SQL       ┌──────────┐
│ Zustand │ ←──────────→ │ API      │ ←──────────→ │PostgreSQL│
│ Store   │   CRUD +     │ Server   │    ORM       │ + Redis  │
│         │   Conflict   │ (Node/Go)│              │          │
│ + Immer │   Resolution │          │              │          │
└─────────┘              └──────────┘              └──────────┘
```
- **Conflict resolution:** Last-write-wins (simplest) or CRDT (Yjs/Automerge)
- **Offline queue:** IndexedDB for pending writes when offline
- **Auth:** OIDC tokens in Authorization header
