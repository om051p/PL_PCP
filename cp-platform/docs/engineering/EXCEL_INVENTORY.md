---
title: Excel Inventory
---

# EXCEL INVENTORY — Workbook Discovery

> **Audit Date:** June 2026
> **Source:** Reverse-engineered from `PCP Calculation sheet.xlsx`

---

## 1. Workbook Discovery

### Primary Calculation Workbook

| Property | Value |
|---|---|
| **Filename** | `PCP Calculation sheet.xlsx` |
| **Path** | Project root `/mnt/devssd/projects/PL PCP/` |
| **Format** | .xlsx (Office Open XML) |
| **Total Sheets** | 3 |
| **Total Cells (used)** | ~2,500 |
| **Total Formulas** | ~160 |
| **Hidden Sheets** | None detected |
| **Protected Sheets** | None |
| **External References** | None — self-contained |
| **Named Ranges** | None found in workbook XML |

### Supporting Workbooks

| Workbook | Status |
|---|---|
| Attenuation workbooks | ❌ Not found in repository |
| Reference sheets | ❌ Not found |
| Lookup tables | Embedded within Cal.(DW) as constants |

---

## 2. Sheet Inventory

### Sheet 1: `Cal.(DW)` — Deepwell Calculations

| Property | Value |
|---|---|
| **Range** | A1:M214 |
| **Rows** | 214 |
| **Columns** | 13 (A-M) |
| **Formulas** | ~120 |
| **Constants** | ~90 |
| **Merged Cells** | ~180 ranges (primarily result columns) |
| **Purpose** | Complete Deepwell ICCP engineering calculations |

**Column Layout:**

| Column | Header | Content |
|---|---|---|
| A | S.No. | Section/sub-section numbering |
| B | Description | Engineering parameter name |
| C | Symbols | Engineering notation (ρ, R_G, L_a, etc.) |
| D | *Notations/Constants* | Unit conversions, cable resistances |
| E | Unit | Measurement unit |
| F | *Pipeline Tie-In* | Pipeline 1 calculations (48" Tie-In) |
| G | *Pipeline Main* | Pipeline 2 calculations (48" Main) |
| H | | Spacer column |
| I | *Station 2* | Station 2 calculations (48" Main, Shallow Vertical) |
| J | | Spacer column |
| K | | Spacer column |
| L | | Spacer column |
| M | | Last column — notes/continuation |

**Section Breakdown:**

| Section | Rows | Title | Status |
|---|---|---|---|
| Header | 1-7 | Project info, pipeline names | Static text |
| Section 1 | 9-24 | Pipeline Design Parameters & Current Requirements | ✅ 12 formulas |
| Section 2 | 26-34 | Anode Requirements (HSCI TA-4) | ✅ 6 formulas |
| Section 3 | 36-43 | CP System Lifetime (Design Life) | ✅ 5 formulas |
| Section 4 | 44-62 | Anode Configuration | ✅ 15 formulas |
| Section 5 | 63-75 | Anode Groundbed Resistance (Deepwell) — Dwight Formula | ✅ 9 formulas |
| Section 6 | 76-143 | Cable Resistance Calculations | ✅ 50+ formulas |
| Section 7 | 144-149 | Back EMF Resistance | ✅ 3 formulas |
| Section 8 | 150-156 | Total Circuit Resistance | ✅ 5 formulas |
| Section 9 | 157-162 | Minimum TR Voltage Required | ✅ 4 formulas |
| Section 10 | 163-187 | Maximum Allowable Groundbed/Circuit Resistance | ✅ 18 formulas |
| Section 11 | 188-195 | Anode Groundbed Remoteness (SAES-X-400) | ✅ 5 formulas |
| Section 12 | 196-206 | AC Power Consumption | ✅ 9 formulas |
| Section 13 | 207-213 | Calcined Petroleum Coke Requirement | ✅ 4 formulas |
| Footer | 214 | Notes | Text |

**Pipeline Station Columns:**
- **Column F** (Cells F9-F213): Station 1 — "ICCP Station-1 @KM 00+000 (Launcher)" — 48" Gas Sales P/L -Tie In, Deepwell design
- **Column G** (Cells G9-G26): Station 1 pipeline 2 — "48" Gas Sales P/L-Main" — shares same current requirement calculation
- **Column I** (Cells I9-I213): Station 2 — "ICCP Station-2 @KM 41+488 (At Scraper Receiver)" — 48" Gas Sales P/L-Main, Shallow Vertical design

### Sheet 2: `BOM-(DW)` — Deepwell Bill of Materials

| Property | Value |
|---|---|
| **Range** | A1:I64 |
| **Rows** | 64 |
| **Columns** | 9 (A-I) |
| **Formulas** | ~50 |
| **Purpose** | BOM generation for Deepwell anode configuration |

**Column Layout:**

| Column | Header | Content |
|---|---|---|
| A | ITEM | Auto-numbered item sequence |
| B | DESCRIPTION | Material description text |
| C | SAMS NUMBER | Saudi Aramco standard reference |
| D | UNIT | Unit of measure (Each, M, Drum, etc.) |
| E | Total | Quantity calculation |
| F | *empty* | Reserved |
| G | Qty | Quantity lookup from Cal.(DW) |
| H | *empty* | Reserved |
| I | Remarks | Yes/No availability indicator |

**Key Formula References to Cal.(DW):**
- G1: `=Cal.(DW)'!F167` — Proposed Voltage Rating of TR (30V)
- G2: `=Cal.(DW)'!F168` — Proposed Current Rating of TR (25A)
- G5: `=Cal.(DW)'!F34:G34` — Number of anodes (9)
- G6: `=Cal.(DW)'!F48` — Active length start (15m)
- G7: `=Cal.(DW)'!F55` — Active column length (35m)
- G9: `=Cal.(DW)'!F27` — Station name

### Sheet 3: `BOM-(HA)` — Horizontal/Shallow Anode BOM

| Property | Value |
|---|---|
| **Range** | A1:H51 |
| **Rows** | 51 |
| **Columns** | 8 (A-H) |
| **Formulas** | ~40 |
| **Purpose** | BOM generation for Shallow Vertical/HA anode configuration |

**Structure:** Identical to BOM-(DW) but for shallow vertical design with fewer cable entries (12 anodes instead of 20).

---

## 3. Dependencies Between Sheets

```
Cal.(DW) ──┬── Formulas F9:F213 ──► Self-contained calculations
           │
           ├── F27 → BOM-(DW)!G9       (Station name)
           ├── F34 → BOM-(DW)!G5:G5    (Number of anodes)
           ├── F48 → BOM-(DW)!G6       (Active length start)
           ├── F55 → BOM-(DW)!G7       (Active column length)
           ├── F79:F90 → BOM-(DW)!C21:C32  (Anode cable lengths → BOM descriptions)
           ├── F101:F120 → BOM-(DW)!F21:F32 (Cable resistances → BOM quantities)
           ├── F167 → BOM-(DW)!G1      (TR voltage → TR BOM selection)
           ├── F168 → BOM-(DW)!G2      (TR current → TR BOM selection)
           ├── F213 → BOM-(DW)!G49     (Coke bags)
           │
           ├── I34 → BOM-(HA) anode count
           ├── I48 → BOM-(HA) active length start
           └── I55 → BOM-(HA) active column length
```

**Direction:** Cal.(DW) → BOM-(DW), BOM-(HA). No reverse dependencies.

---

## 4. Named Ranges & Hidden Structures

| Feature | Status |
|---|---|
| Named ranges | None detected |
| Hidden rows/columns | None |
| Data validation | None |
| Conditional formatting | None |
| Pivot tables | None |
| Charts | None |
| Macros/VBA | None |

The workbook is purely formula-based with no advanced Excel features.

---

## 5. Key Engineering Constants Embedded in Workbook

| Constant | Value | Cell | Purpose |
|---|---|---|---|
| 16mm² cable resistance | 0.001673 Ω/m | D101-D120 | Anode tail cable |
| 35mm² cable resistance | 0.000659 Ω/m | D124, D134, D138 | Main positive/negative cable |
| 25mm² cable resistance | 0.001053 Ω/m | D140 | Negative cable |
| Back EMF | 2 V | F148, I148 | TR circuit |
| Structure-to-earth R | 0.055 Ω | F155, I155 | Rs |
| Current density base | 0.1 mA/m² | F20, G20 | Pipeline design density |
| Spare capacity factor | 30% | F24, G24 | Design current spare |
| Conversion factor | 39.37 in/m | F13, G13 | Inch-to-meter |
| Anode output (TA-4) | 3.56 A | F30, I30 | Per anode current output |
| Anode weight (TA-4) | 38.6 kg | F39, I39 | Single anode weight |
| Consumption rate | 0.45 kg/A-Y | F40, I40 | HSCI consumption |
| Utilization factor | 0.85 | F42, I42 | Anode utilization (applied to design life) |
| Efficiency | 80% (0.6 denominator) | F200, F205 | TR efficiency |
| Power factor | 0.8 | F201 | AC power factor |
| Coke calculation factor | 3.28 × 39.2 / 50 | F212 | ft³ conversion to bags |
| Coke contingency | 1.15 (15%) | F213 | Safety factor |
