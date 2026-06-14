# REPORT SYNC AUDIT

> **Purpose:** Verify that the Excel and PDF report engines consume **actual project data**, not cached/duplicated/hardcoded data, and that all engineering content reaches the report.
> **No file modifications.** This document is the audit.

---

## 1. Report engines

| File | Purpose | Output |
|---|---|---|
| `reporting/excelEngine.js` | `exportProject(project)` → XLSX download | Multi-sheet XLSX |
| `reporting/pdfGenerator.js` | `downloadEngineeringReport(project)` → PDF | A4 portrait multi-page PDF |
| `reporting/bomExporter.js` | `exportBOMToCSV(stationName, bom)` → CSV | CSV download |

All three are **read-only** — they consume `project` (in memory) at export time.

---

## 2. Data flow

```text
PageReport "Download PDF"
  └─ pdfGenerator.downloadEngineeringReport(project)
       │
       ├── cover page: project metadata
       │     - projectNumber, clientName, projectName, designer (fallback 'CP Engineer')
       │     - designBasis.acInputVoltageV, acInputPhase (LIVE in label? — see §3)
       │     - revision label (fallback 'A')
       │
       ├── per-station page(s):
       │     - pipeline summary (segments[0] only — see §4)
       │     - groundbed: type, numHoles, depth, etc. (LIVE)
       │     - cables: sizes, lengths (LIVE)
       │     - TR: ratedVoltage, ratedCurrent (LIVE)
       │     - lastCalcResult: surface area, I_req, R_G, R_c, V_min, life, kVA, BOM, checks
       │     - allChecksPassed, checks[]
       │
       └── footer:
             - "Generated on: …" (LIVE)
             - page count (pre-computed — see §5)

PageReport "Export to Excel"
  └─ excelEngine.exportProject(project)
       │
       ├── Summary sheet
       │     - per-station row with key numbers from lastCalcResult
       │
       └── per-station sheet
             - pipeline details
             - lastCalcResult table
             - checks table
             - BOM table
```

---

## 3. Cached / duplicated / hardcoded data — findings

### 3.1 AC input label is hardcoded in PDF (BL-14)

| | |
|---|---|
| Location | `reporting/pdfGenerator.js` (literal `"@ 480V/3Φ"`) |
| Should be | `` `${acInputVoltageV}V/${acInputPhase}Φ` `` (already done correctly in `PageTRSizing`) |
| Severity | **HIGH** — the report will print the wrong value if the user changes `acInputVoltageV` from the default `480`. |
| Status | **NOT FIXED** |
| Detection in report | None — silent. |

### 3.2 Standard code references use fallback literals

| | |
|---|---|
| Location | `pdfGenerator` falls back to `'17-SAMSS-003'`, `'17-SAMSS-016'`, `'17-SAMSS-008'`, `'17-SAMSS-020'`, `'17-855-011'`, `'17-SAMSS-007'`. |
| Should be | From `getActiveStandard(project).standardsReferences.{tru, anode, junctionBox, ...}`. |
| Severity | **MEDIUM** — the report will print the Saudi Aramco standards even if the user chose NACE or ISO. |
| Status | **NOT FIXED** |
| Detection in report | None — silent. |

### 3.3 Anode label falls back to literal

| | |
|---|---|
| Location | `pdfGenerator` falls back to `'HSCI Tubular TA-4'`. |
| Should be | From `station.anodeSpec.label` (or `ANODE_SPECS[station.anodeSpec].label`). |
| Severity | **MEDIUM** — the report will print HSCI TA-4 even if the user chose MMO or zinc. |
| Status | **NOT FIXED** |
| Detection in report | None — silent. |

### 3.4 PDF page count is pre-computed (BL-19)

| | |
|---|---|
| Location | `pdfGenerator` writes `2 + project.stations.length * 2` to the header. |
| Should be | Use `doc.internal.getNumberOfPages()` after the document is built. |
| Severity | **LOW** — cosmetic. |
| Status | **NOT FIXED** |
| Detection in report | Visible to user (`Page X of Y` is wrong when a station has no BOM). |

### 3.5 Designer / signature labels fall back to literals

| | |
|---|---|
| Location | `pdfGenerator` falls back to `'CP Engineer'`, `'CP Specialist'`, `'Chief CP Engineer'`. |
| Should be | From `project.designer` for the engineer name; signature labels should be configurable per project. |
| Severity | **MEDIUM** — every report will show the same name when designer is empty. |
| Status | **NOT FIXED** |
| Detection in report | Visible to user. |

### 3.6 `currentRevision` falls back to `'A'`

| | |
|---|---|
| Location | `PageReport` and `pdfGenerator` fall back to `'A'`. |
| Should be | From `project.currentRevision` (which is updated by `createRevision`). |
| Severity | **LOW** — only visible if the user creates revisions. |
| Status | **NOT FIXED** |

### 3.7 Per-station page assumes at least one segment

| | |
|---|---|
| Location | `pdfGenerator` reads `st.pipelineSegments[0]` without null-check. |
| Should be | Defensive: if `pipelineSegments.length === 0`, render "No pipeline defined" row. |
| Severity | **HIGH** if a station has no segments — undefined access crash. |
| Status | **NOT FIXED** |

### 3.8 Excel import `coatingEfficiency` mismatch (BL-22)

| | |
|---|---|
| Location | `excelEngine` export omits `coatingEfficiency`; import fills with `0.98`. |
| Effect | Round-trip (export → re-import) silently changes every segment's coating efficiency. |
| Severity | **HIGH** |
| Status | **NOT FIXED** |

### 3.9 Excel import `anodeTailLengths` fixed at 20 (BL-21)

| | |
|---|---|
| Location | `makeDefaultImportStation` hardcodes `Array(20).fill(30)`. |
| Effect | Stations with > 20 anodes get undefined tail lengths. |
| Severity | **HIGH** |
| Status | **NOT FIXED** |

### 3.10 BOM silently skipped for stations without one (existing behavior)

| | |
|---|---|
| Location | `pdfGenerator` silently skips a station if `bom.length === 0`. |
| Effect | The report's per-station section is shorter than expected; combined with BL-19 the page count is also wrong. |
| Severity | **MEDIUM** — user gets a shorter report with no warning. |
| Status | **NOT FIXED** |

### 3.11 Calculation results without `checks` print `'no validation results'`

| | |
|---|---|
| Location | `pdfGenerator` prints "Station not calculated — no validation results." |
| Severity | **LOW** — already handled with messaging. |
| Status | OK |

---

## 4. Engineering content reachability — does it reach the report?

The audit asks: **does every engineering input the user sees in a module show up in the report?**

| Engineering content | Module | Reaches PDF? | Reaches Excel? | Notes |
|---|---|---|---|---|
| Pipeline: OD, wall, length, segments | PagePipeline | partial (`segments[0]` only) | yes | multi-segment stations only show segment[0] in PDF |
| Pipeline: surface area per segment | PagePipeline | yes (`r.totalSurfaceAreaM2`) | yes | aggregate only |
| Soil resistivity ρ | PageSoilResistivity | yes (in inputs table) | yes | `r` value, not the per-source value |
| Soil layers / Wenner points | PageSoilResistivity | no | no | the input is only ρ, not the survey data |
| Current requirement I_req | PageCurrentRequirement | yes | yes | |
| Coating breakdown per segment | PageCurrentRequirement | no (aggregate only) | no | the user can edit per segment but the report shows the sum |
| Groundbed type, depth, anodes | PageGroundbed | yes | yes | |
| R_G | PageGroundbed | yes (`r.groundbedResistanceOhm`) | yes | |
| Cable sizes, lengths | PageCableResistance | yes | yes | |
| Cable voltage drops | PageCableResistance | yes | yes | |
| TR V/I rated | PageTRSizing | yes | yes | |
| V_min, kVA, AC input | PageTRSizing | yes | yes | |
| Attenuation profile (α, profile, coverage) | AttenuationPage | **no** | **no** | not in PDF; not in Excel |
| Critical KPs | AttenuationPage | **no** | **no** | |
| Station spacing recommendation | AttenuationPage | **no** | **no** | |
| Sensitivity tornado | PageSensitivity | **no** | **no** | |
| Scenarios | scenarios | **no** | **no** | |
| Validation checks (6 rules) | rulesEngine | yes (`r.checks[]`) | yes | |
| Standards validation (15 SAES rules) | standardsValidationEngine | **partial** | **partial** | PDF includes a Compliance table; the page-level `complianceStatus` overrides are not |
| Compliance notes (manual) | PageCompliance | **partial** | no | notes not in PDF/Excel |
| BOM quantities | bomEngine | yes | yes | |
| Digital Twin health | digitalTwin | **no** | **no** | no DT section in reports |
| Digital Twin risk | digitalTwin | **no** | **no** | |
| Activity log | activityLogger | **no** | no | activity log not in report |

**Reachability gaps (high-impact):**

1. **Attenuation** is not in the report. The most critical engineering analysis of a CP system is missing.
2. **Digital Twin health/risk** is not in the report. The signature health-monitor of the platform is invisible in deliverables.
3. **Sensitivity analysis** is not in the report. The user cannot deliver a robustness audit.
4. **Manual compliance notes** are not in the report.
5. **Multi-segment pipeline** is summarized in PDF — only segment[0] is shown.

---

## 5. Per-section evaluation

### 5.1 Cover page (PDF)

| Element | Source | Live? |
|---|---|---|
| Project number | `project.projectNumber` | ✅ |
| Client name | `project.clientName` | ✅ |
| Project name | `project.projectName` | ✅ |
| Designer | `project.designer` (fallback `'CP Engineer'`) | ⚠️ |
| Revision | `project.currentRevision` (fallback `'A'`) | ⚠️ |
| AC input label | literal `"@ 480V/3Φ"` | ❌ hardcoded |
| Standard codes | fallback literals | ❌ hardcoded |
| Date | `Date.now()` | ✅ |

### 5.2 Per-station pages (PDF)

| Element | Source | Live? |
|---|---|---|
| Pipeline OD/wall/length | `st.pipelineSegments[0]` | ⚠️ first segment only |
| Pipeline total area | `r.totalSurfaceAreaM2` | ✅ |
| Per-segment current | `r.perSegmentCurrents` (if present) | partial |
| Groundbed type/depth/num | `st.groundbed` | ✅ |
| R_G | `r.groundbedResistanceOhm` | ✅ |
| Anode label | `st.anodeSpec.label` (fallback `'HSCI Tubular TA-4'`) | ⚠️ |
| Cables | `st.cables` | ✅ |
| Cable drops | `r.posMainCableResOhm`, `negMainCableResOhm`, `anodeTailParallelResOhm` | ✅ |
| TR V/I | `st.tr` | ✅ |
| V_min | `r.minTRVoltage` | ✅ |
| AC kVA | `r.acInputKVA` | ✅ |
| Checks | `r.checks` | ✅ |
| BOM | `r.bom` (skipped silently if empty) | ⚠️ |

### 5.3 Excel

| Element | Source | Live? |
|---|---|---|
| Per-station sheet | `st` + `r` | ✅ |
| Pipeline columns | `st.pipelineSegments` (loop) | ✅ |
| Result columns | `r` fields | ✅ |
| BOM tab | `r.bom` | ✅ |
| Checks tab | `r.checks` | ✅ |
| coatingEfficiency | **not exported** | ❌ |

---

## 6. Cached / duplicated data

The report engines do **not cache** — they re-read `project` on every export. This is the correct pattern.

However, they consume `lastCalcResult` which is **a cached result**. If `lastCalcResult` is stale, the report is stale. The `PageReport` gating logic (`allCalculated && !hasCalculationsMismatch`) does not detect `dataVersion` drift.

**Net effect:** Reports inherit all the staleness issues from `STALE_DATA_ANALYSIS.md` § 2.

---

## 7. Round-trip safety (export → import)

| | |
|---|---|
| Project schema | survives |
| Stations | survive with all current fields (per export code) |
| `coatingEfficiency` | silently reset to `0.98` on import (BL-22) |
| `anodeTailLengths` | silently truncated to 20 (BL-21) |
| `lastCalcResult` | correctly discarded |
| `attenuationInput/Result` | preserved (per `partialize` in store) |
| `digitalTwin` | discarded (not in partialize) |
| `complianceNotes/Status` | preserved |
| `scenarios` | preserved |
| `revisions` | preserved |
| Legacy snake_case fields | migrated correctly by `migrateLegacyState` |

The round-trip is **mostly safe** but introduces silent changes to two engineering fields. These are listed in BL-21 and BL-22.

---

## 8. Findings — comprehensive list

| ID | Severity | File | Description |
|---|---|---|---|
| RS-01 | HIGH | `pdfGenerator` | AC input label hardcoded `"@ 480V/3Φ"` |
| RS-02 | MED | `pdfGenerator` | Standard code references use literal fallbacks |
| RS-03 | MED | `pdfGenerator` | Anode label fallback `'HSCI Tubular TA-4'` |
| RS-04 | LOW | `pdfGenerator` | Page count is pre-computed and wrong when BOM empty |
| RS-05 | MED | `pdfGenerator` | Designer/signature labels fall back to literals |
| RS-06 | HIGH | `pdfGenerator` | Reads `st.pipelineSegments[0]` without null-check — crash if no segments |
| RS-07 | MED | `pdfGenerator` | BOM silently skipped if empty (no message) |
| RS-08 | HIGH | `excelEngine` | Export omits `coatingEfficiency`; import fills with `0.98` |
| RS-09 | HIGH | `excelEngine` | `anodeTailLengths` fixed-size `Array(20).fill(30)` |
| RS-10 | HIGH | (gap) | Attenuation profile/results not in PDF/Excel |
| RS-11 | HIGH | (gap) | Digital Twin health/risk not in PDF/Excel |
| RS-12 | MED | (gap) | Sensitivity analysis not in PDF/Excel |
| RS-13 | MED | (gap) | Manual compliance notes not in PDF/Excel |
| RS-14 | MED | `excelEngine` | `Summary` sheet detection only — generic imports fail |
| RS-15 | MED | `pdfGenerator` | Station without `lastCalcResult` shows "not calculated" but no diff against cached values |
| RS-16 | MED | `pdfGenerator` | No "data version" stamp on the report (no traceability of which calc snapshot) |
| RS-17 | LOW | `PageReport` | `currentRevision` fallback `'A'` |

---

## 9. Recommendations

1. **Replace all literal fallbacks in `pdfGenerator` with live `getActiveStandard(project)` and `st.anodeSpec.label` reads.** (RS-01, RS-02, RS-03, RS-05)
2. **Add `dataVersion` stamp to the report cover** ("Calculated against project dataVersion N at …"). (RS-16)
3. **Compute page count after document is built.** (RS-04)
4. **Add Attenuation section to PDF and Excel.** Surface the profile, coverage %, critical KPs, station spacing recommendation. (RS-10)
5. **Add Digital Twin section to PDF and Excel.** Surface health/risk per station. (RS-11)
6. **Add Sensitivity snapshot to PDF and Excel** (opt-in, since the user may not want every tornado). (RS-12)
7. **Add Compliance notes section to PDF and Excel** — these are regulatory text. (RS-13)
8. **Defensive null check for `pipelineSegments[0]`** in `pdfGenerator`. (RS-06)
9. **Excel: export `coatingEfficiency` and re-import it.** (RS-08)
10. **Excel: size `anodeTailLengths` to `proposedAnodes`.** (RS-09)
11. **Excel: when no `Summary` sheet, show a wizard to pick a sheet, or improve detection.** (RS-14)
12. **PDF: when BOM is empty, render an explicit "No BOM produced" line** instead of silently skipping. (RS-07)
13. **PDF: when `lastCalcResult` is missing, render a "Run Calculate" call-to-action with a deep link.** (RS-15)

---

## 10. Acceptance criteria

The reports pass this audit when:

1. ✅ No hardcoded engineering values appear in the rendered output (RS-01 to RS-05).
2. ✅ Every engineering input the user can edit is reflected in the report (RS-10 to RS-13).
3. ✅ Round-trip export → import is byte-identical (RS-08, RS-09).
4. ✅ Page count matches actual page count (RS-04).
5. ✅ No undefined accesses; missing data produces visible messaging, not silent omission (RS-06, RS-07, RS-15).
6. ✅ Report carries a `dataVersion` stamp and warns if the project has since changed (RS-16).

---

## 11. Pre-existing report inventory (for reference)

Both engines consume the same `project` shape and `lastCalcResult` contract. The contract is implicit and not tested. The recommended fix is a Zod schema for `lastCalcResult` (analogous to the existing `StationSchema` in `engine/modules/validation.js`).

The two engines are **siblings, not coupled** — they read the same input but produce different outputs. There is no shared "formatting" module. Refactoring to extract a shared `ReportFormatter` would be a future improvement but is **not** required by this audit.
