# UI/UX Design Guidelines

**Version:** 1.0  
**Framework:** React 19 + CSS Custom Properties  

---

## Design Principles

1. **Engineering-first** — Precision over prettiness. Every number must be readable.
2. **Progressive disclosure** — Show defaults, hide complexity, reveal on demand.
3. **Consistent calculation display** — Every computed value shows: label, symbol, value, unit, formula.
4. **Instant feedback** — Calculations run synchronously, results appear immediately.
5. **Status visibility** — Every station's workflow status is always visible.

---

## Color System

### Palette (from `index.css` custom properties)
```css
:root {
  --brand: #1a3a5c;         /* Deep navy — headers, primary */
  --brand-mid: #2d6a9f;     /* Medium blue — section headings */
  --brand-light: #e8f0f7;   /* Light blue — info backgrounds */
  --accent: #c8860a;        /* Gold — highlights */
  
  --pass: #16603a;          /* Green — validation pass */
  --pass-bg: #eaf5ee;
  --fail: #9b1c1c;          /* Red — validation fail */
  --fail-bg: #fef2f2;
  --warn: #7a4f00;          /* Amber — validation warning */
  --warn-bg: #fefce8;
  
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-tertiary: #9ca3af;
  --border: #e5e7eb;
  --bg: #ffffff;
  --bg-alt: #f9fafb;
}
```

### Usage
| Element | Color | Example |
|---------|-------|---------|
| Page header | `--brand` | Top bar, sidebar |
| Section title | `--brand-mid` | SectionCard title |
| Section background | `--brand-light` | Info boxes |
| PASS status | `--pass` | CheckRow status |
| FAIL status | `--fail` | CheckRow status |
| WARNING | `--warn` | CheckRow status |

---

## Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page title | 18px | 700 | `--brand` |
| Section title | 14px | 600 | `--brand-mid` |
| Field label | 12px | 500 | `--text-secondary` |
| Field value | 14px | 400 | `--text-primary` |
| Result label | 13px | 400 | `--text-secondary` |
| Result value | 14px | 700 | `--text-primary` |
| Check status | 13px | 700 | per status |
| Hint text | 11px | 400 | `--text-tertiary` |

---

## Component Patterns

### FieldInput
```
Label: Pipeline Length
[ 292                ] m
^ hint: "Standard segment: 200-500m"
```
- Label on top, 12px, secondary color
- Input with unit suffix on right
- Optional hint below
- Numeric inputs: step=0.1 or 0.01 for engineering precision

### SelectField
```
Label: Groundbed Type
[ Deepwell ICCP      ▼ ]
```
- Same layout as FieldInput
- Dropdown with available options

### ResultRow
```
External Surface Area    A    1,234.56 m²    ← label + symbol + value + unit
```
- Left: label + symbol (gray, italic)
- Right: value (bold) + unit (gray)
- Alternating row backgrounds for tables
- Formula shown as tooltip or inline for key results

### CheckRow
```
✓ PASS  TR Voltage Adequate (BR-001)          30V ≥ 28.5V    ← green
✗ FAIL  Groundbed R < Max Allowable (BR-002)  0.45Ω > 0.38Ω  ← red
⚠ WARN  Design Life Margin Low (BR-005)       26.3y          ← amber
```
- Left: Icon + Status text
- Center: Rule name + ID
- Right: Computed value
- Full-width colored background

### SectionCard
```
┌─────────────────────────────────────────────┐
│ 🔧 Groundbed Configuration          [Action] │
│                                               │
│  [inputs / results / content]                │
└─────────────────────────────────────────────┘
```
- Icon + Title in header
- Optional action button top-right
- Internal 2-column grid for paired fields

### StatCard
```
┌──────────────┐
│ ICCP Station-1│
│    12.34 A   │ ← large value
│ +30% spare   │ ← unit/context
└──────────────┘
```
- Used on Current Requirement page
- One per station + total column

---

## Layout Structure

```
┌─────────────────────────────────────────────┐
│ Sidebar (collapsible)    │ TopBar             │
│ ┌─────────────────┐     │ Project: ECP25-0292│
│ │ 🏠 Project Setup│     │ Status: Draft     │
│ │ 🔧 Pipeline     │     └────────────────────│
│ │ ⚡ Current       │                          │
│ │ ⛰️ Groundbed    │  Page Content             │
│ │ 🔌 Cable        │  ┌──────────────────────│
│ │ 💻 TR Sizing    │  │ Grid2 / SectionCard   │
│ │ ✓ Validation    │  │  ┌────────┬─────────│
│ │ 🎯 Optimizer    │  │  │Left    │ Right   │
│ │ 📋 BOM          │  │  │ Card   │ Card    │
│ │ 📄 Report       │  │  └────────┴─────────│
│ │ 📥 Import       │  └──────────────────────│
│ └─────────────────┘                          │
└─────────────────────────────────────────────┘
```

### Grid System
| Class | Columns | Gap | Use |
|-------|---------|-----|-----|
| `Grid2` | 2 | 16px | Side-by-side section cards |
| `Grid3` | 3 | 12px | Stat cards, overview panels |

---

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Desktop | >1024px | Full sidebar + 2-column grid |
| Tablet | 768-1024px | Collapsed sidebar + 1-column grid |
| Mobile | <768px | Hidden sidebar (overlay) + stacked |

---

## Accessibility Guidelines

- All inputs have visible labels (no placeholder-only)
- Status badges use color + icon (not color alone)
- Tab order follows visual layout
- Interactive elements have hover + focus states
- Color contrast: all text meets WCAG AA (4.5:1)
- Error states: red border + error message text

---

## Engineering Display Conventions

| Quantity | Decimal Places | Example |
|----------|----------------|---------|
| Surface area | 2 | 1,234.56 m² |
| Current density | 5 | 0.12584 mA/m² |
| Required current | 5 | 12.34567 A |
| Design current | 4 | 16.0494 A |
| Resistance R_G | 4 | 0.3521 Ω |
| Design life | 1 | 32.4 years |
| AC power | 2 | 7.25 kVA |
| Cable resistance | 6 | 0.000352 Ω |
