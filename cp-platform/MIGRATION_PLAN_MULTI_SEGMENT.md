# Migration Plan: Multi-Segment Pipeline Support

## Goal
Extend the existing architecture so that one ICCP station can protect multiple pipeline segments with different diameters, lengths, temperatures, and coating types — without breaking existing projects.

## Audit Results

### Already Multi-Segment Compatible ✅
| Location | Why |
|----------|-----|
| `types/index.js` — `Station.pipelineSegments` | Already typed as `PipelineSegment[]` |
| `calculations.js` — `calcCurrentRequirement` | Iterates all segments with `for (const seg of segments)` |
| `rulesEngine.js` — temperature insight | Uses `Math.max(...pipelineSegments.map(s => s.opTempC))` |
| `optimizer.js` | Segment-agnostic (works on anodes/TR) |
| `bomEngine.js` | Segment-agnostic (works on anodes/cables/TR) |

### Single-Segment Assumptions (Must Fix) ❌
| Location | Line(s) | Issue |
|----------|---------|-------|
| `pages/index.jsx` — `PagePipeline` | 217 | `const seg = station.pipelineSegments[0]` — only renders first segment |
| `calculations.js` — `runStationCalculations` | 367 | `perSegment[0]?.iTempMam2` — only reports first segment's temp CD |
| `pdfGenerator.js` — station page | 295 | `const seg = station.pipelineSegments[0]` — only shows first segment |
| `excelEngine.js` — export station sheet | 75 | `const seg = st.pipelineSegments[0]` — only exports first segment |
| `excelEngine.js` — import `parseStationSheet` | 289-300 | Creates exactly 1 segment on import |
| `excelEngine.js` — import `makeDefaultImportStation` | 411-422 | Creates exactly 1 segment |
| `projectStore.js` — actions | — | No `addSegment`/`removeSegment` actions exist |

## Migration Plan

### Phase 1: Store Actions
- Add `addSegment(stationId)` — creates new segment with defaults
- Add `removeSegment(stationId, segmentId)` — removes segment (min 1)
- Both invalidate `lastCalcResult` and set status to `input_complete`

### Phase 2: UI — Pipeline Parameters Page
- Replace single-segment rendering with segment selector
- Show segment tabs/dropdown to pick which segment to edit
- Add "Add Segment" / "Remove Segment" buttons
- Display per-segment surface area previews + total

### Phase 3: Calculations
- Change `tempCorrectedCurrentDensity` field to show the **maximum** temp-corrected CD across all segments (conservative design)
- Keep `perSegmentCurrents` as-is (already correct)

### Phase 4: PDF Report
- In station page, iterate all segments for pipeline parameters section
- Show summary table with all segments listed

### Phase 5: Excel Export
- In station sheet, show all segments as separate rows
- Add per-segment surface area and current columns

### Phase 6: Excel Import
- Import reads all segment rows and creates segments
- Export writes all segment data

### Phase 7: Tests
- Add multi-segment golden dataset (Dataset 8)
- Add multi-segment acceptance test
- Verify all 332 existing tests still pass

## Backward Compatibility
All existing projects serialize `pipelineSegments` as an array (already in persisted state). Adding more segments to the array is a non-breaking additive change. The store persists correctly. Old datasets with 1 segment continue to work identically.

## Risk Assessment
- LOW — core calc engine already iterates all segments
- LOW — data model already supports arrays
- MEDIUM — UI rendering needs rework but doesn't affect calculations
- LOW — all existing tests use single-segment datasets, continue to pass unchanged
