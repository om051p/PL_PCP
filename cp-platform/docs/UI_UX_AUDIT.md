---
title: UI/UX Audit
---

# UI/UX AUDIT — CP Designer ICCP Platform

> **Review Date:** June 2026
> **Codebase:** `cp-platform/src/`
> **Cross-References:** [Architecture Review](ARCHITECTURE_REVIEW.md) · [Performance Report](PERFORMANCE_REPORT.md) · [Formula Inventory](engineering/FORMULA_INVENTORY.md) · [Calculation Flow](engineering/CALCULATION_FLOW.md)

---

## 1. UI/UX Score: **65/100**

| Category | Score | Notes |
|---|---|---|
| Navigation Clarity | 75/100 | Sidebar + tabs are clear |
| Data Entry | 70/100 | Forms are functional but basic |
| Validation Feedback | 60/100 | PASS/FAIL shown but not in nav |
| Mobile Responsiveness | 30/100 | No responsive breakpoints |
| Accessibility | 40/100 | Minimal ARIA, no keyboard nav |
| Error Handling | 45/100 | No error boundaries or calculation errors |
| Performance Perception | 70/100 | Loading states exist but are artificial |
| Visual Design | 75/100 | Clean, professional, consistent palette |

---

## 2. Screen Inventory

| Page | Route ID | Purpose | Lines \(1,517 total\) |
|---|---|---|---|
| PageProjectSetup | `project` | Client info, system config, station list | 82-165 |
| PagePipeline | `pipeline` | Pipeline geometry, soil, groundbed location | 167-278 |
| PageCurrentRequirement | `current` | Current calc per station, stat cards | 280-367 |
| PageGroundbed | `groundbed` | Groundbed design, resistance results | 369-494 |
| PageCableResistance | `cable` | Anode tails, pos/neg cables | 496-592 |
| PageTRSizing | `tr` | TR ratings, circuit analysis | 594-689 |
| PageValidation | `validation` | 6 engineering checks, PASS/FAIL | 691-771 |
| PageOptimizer | `optimizer` | 3 design alternatives comparison | 773-852 |
| PageBOM | `bom` | Bill of materials table | 854-912 |
| PageReport | `report` | Summary + PDF/Excel export | 914-1054 |
| PageImport | `import` | Excel file drop zone + import | 1056-1156 |

---

## 3. User Flow Analysis

### Primary Flow (Engineering Workflow)

```
Project Setup → Pipeline → Current Req → Groundbed → Cables → TR Sizing → Validation → Report
    ↑              ↑           ↑             ↑          ↑        ↑            ↑         ↑
    └──────────────┴───────────┴─────────────┴──────────┴────────┴────────────┴─────────┘
                                  Workflow Stepper (Draft → IFD)
```

### Issues Found

| # | Issue | Location | Severity | Evidence |
|---|---|---|---|---|
| **1** | **No loading indicator during calculation** | All pages | 🟡 Medium | `calculatingStationId` exists in store but is never displayed as a spinner/progress |
| **2** | **Destructive action has no confirmation** | PageProjectSetup | 🟡 Medium | `removeStation(st.id)` fires immediately with no confirmation dialog |
| **3** | **Validation status not shown in sidebar** | layout.jsx | 🟢 Low | Sidebar shows station names but not PASS/FAIL status |
| **4** | **PDF download loading state is fake** | PageReport | 🟢 Low | Uses `setTimeout(1000ms)` instead of actual progress tracking |
| **5** | **No mobile responsive layout** | index.css | 🟡 Medium | No `@media` queries in app CSS; fixed-width sidebar (220px) |
| **6** | **No keyboard navigation** | All pages | 🟡 Medium | No `onKeyDown`, no `tabIndex` management for custom components |
| **7** | **No ARIA labels** | All pages | 🟡 Medium | Buttons, icons, and interactive elements lack aria-labels |
| **8** | **BOM CSV Export button does nothing** | PageBOM | 🟢 Low | `onClick` is empty — button renders but has no handler |
| **9** | **No error boundary** | App.jsx | 🟡 Medium | No React error boundary — any component crash breaks the entire app |
| **10** | **Station name duplicates** | StationTabs | 🟢 Low | Adding stations creates "ICCP Station-1", "ICCP Station-2"... no uniqueness guarantee |
| **11** | **No form validation on required fields** | All pages | 🟡 Medium | Numeric fields accept zeros and negative values without warning |
| **12** | **Workflow stepper is passive** | ui.jsx | 🟢 Low | Shows current status but doesn't enforce or guide the workflow |

### Navigation Flow Diagram

```
                     ┌──────────────┐
                     │  Sidebar     │
                     │  ────────    │
        ┌────────────┤ • Project    ├────────────┐
        │            │ • Pipeline   │            │
        │            │ • Current    │            │
        ▼            │ • Groundbed  │            ▼
  ┌──────────┐       │ • Cables     │      ┌──────────┐
  │ Project  │       │ • TR Sizing  │      │ Pipeline │
  │ Setup    │       │ • Validation │      │          │
  └──────────┘       │ • Optimizer  │      └──────────┘
        │            │ • BOM        │            │
        │            │ • Report     │            │
        │            │ • Import     │            │
        │            └──────────────┘            │
        │                                        │
        └──────────────────┬─────────────────────┘
                           ▼
              ┌──────────────────────┐
              │  Station Tabs        │
              │  [S1] [S2] [S3] [+]  │
              └──────────────────────┘
```

---

## 4. Visual Design Assessment

### Color Palette
```
Brand:    #1a3a5c (deep navy)    ✓ Professional, engineering-appropriate
BrandMid: #2d6a9f (medium blue)  ✓ Good contrast on white
Accent:   #c8860a (gold/amber)   ✓ Engineering standard highlight
Pass:     #16603a (green)        ✓ Clear positive feedback
Fail:     #9b1c1c (deep red)     ✓ Clear negative feedback
Warn:     #7a4f00 (amber)        ✓ Good warning color
```

### Typography
- Base: 13px (small but standard for engineering tools)
- Font: system sans-serif stack
- Mono: JetBrains Mono for code/numbers
- **Issue:** Line spacing is tight in dense tables (BOM, cable anode grid)

### Component Consistency
- ✅ All inputs use the same FieldInput component
- ✅ Cards use consistent SectionCard wrapper
- ✅ Results use consistent ResultRow pattern
- ⚠️ Insight cards have 4 severity variants (error, warning, info, success) but no deduplication logic

---

## 5. Interaction Design

| Interaction | Assessment |
|---|---|
| Tab switching | ✅ Smooth, active tab highlighted |
| Sidebar navigation | ✅ Clear active state |
| Drop zone (Excel import) | ✅ Visual feedback on drag-over |
| Click-to-expand insights | ✅ Accordion pattern works |
| Station creation | ✅ Add button always visible |
| Alt card selection | ✅ Click to expand details |
| **Missing: Sticky save indicator** | ❌ No "Saving..." or "Saved" indicator |
| **Missing: Auto-save** | ❌ No debounced auto-save |

### Workflow Status Progression
```
Draft → Input Complete → Calculated → Engineering Review → Optimized → Approved → IFD
```

Each station tracks its own workflow status independently. The system does **not** enforce sequential progression — a station can jump from draft directly to calculated, then back to draft on data change.

---

## 6. Accessibility Audit

### WCAG 2.1 Checklist

| Criterion | Status | Notes |
|---|---|---|
| 1.1.1 Non-text Content | ❌ | Icons (lucide-react) have no aria-labels |
| 1.4.3 Contrast | ✅ | All text meets 4.5:1 minimum |
| 2.1.1 Keyboard | ❌ | Custom components not keyboard-accessible |
| 2.4.4 Link Purpose | ❌ | Icon buttons need aria-label |
| 2.4.6 Headings | ⚠️ | Pages use divs, not semantic headings |
| 3.3.2 Labels | ✅ | All form fields have visible labels |
| 4.1.2 Name/Role | ❌ | Custom components missing ARIA roles |

---

## 7. UX Improvements Priority

### 🔴 High (Fix Now)

| # | Fix | Effort | Impact |
|---|---|---|---|
| 1 | Add confirmation dialog for station delete (use a modal or `window.confirm` as minimum) | 1h | Prevents accidental data loss |
| 2 | Add error boundary in App.jsx | 2h | Prevents full-app crashes |
| 3 | Add input validation before calculations (show inline errors) | 3h | Prevents invalid engineering results |
| 4 | BOM CSV export button should work | 1h | Feature gap |

### 🟡 Medium (Next Sprint)

| # | Fix | Effort | Impact |
|---|---|---|---|
| 5 | Show `calculatingStationId` as a spinner on the calculate button | 2h | Better UX feedback |
| 6 | Add responsive breakpoints for tablet (768px, 1024px) | 8h | Tablet usability |
| 7 | Add aria-labels to all icon buttons + keyboard nav | 6h | Accessibility compliance |
| 8 | Show validation PASS/FAIL badges in sidebar | 3h | Better navigation awareness |
| 9 | Replace setTimeout with real calculation tracking in PDF/Excel export | 2h | Accurate progress feedback |

### 🟢 Low (Backlog)

| # | Fix | Effort | Impact |
|---|---|---|---|
| 10 | Add auto-save indicator ("Saved" / "Unsaved changes") | 2h | User confidence |
| 11 | Implement proper form validation with inline error messages | 8h | Better data quality |
| 12 | Add dark mode support | 4h | User preference |
| 13 | Add print stylesheet | 2h | Better printed reports |
| 14 | Semantic HTML headings (h1-h6) for screen readers | 3h | Accessibility |
