# Database Schema Reference

**Version:** 1.0  
**Storage Engine:** Browser localStorage + Zustand Persist  

---

## Architecture

This project has **no traditional database**. All data is stored in:

| Layer | Technology | Scope | Capacity |
|-------|------------|-------|----------|
| **Persistent** | `localStorage` | Project + station data | ~5-10MB |
| **Transient** | In-memory (React state) | UI state, active page, sidebar | ~1MB |
| **AI Memory** | Filesystem (`.claude-flow/data/`) | Agent memories | ~100MB |
| **Code Graph** | Filesystem (`.gitnexus/`) | Knowledge graph | ~50MB |

---

## Entity Relationship Diagram

```
Project (1) ──────< (N) Station
Station (1) ──────< (N) PipelineSegment
Station (1) ──────< (1) CalcResult          (embedded)
Station (1) ──────< (N) EngineeringInsight  (embedded)
Station (1) ──────< (N) DesignAlternative   (embedded)
Project (1) ──────< (N) Revision            (embedded, deep clones)
Revision (1) ──────< (1) Project            (snapshot clone)
```

---

## Entity Schemas

### Project
```javascript
{
  id: string,                    // uuid
  projectNumber: string,         // e.g., "ECP25-0292"
  clientName: string,
  endClient: string,
  projectName: string,
  designer: string,
  createdAt: string,             // ISO 8601
  updatedAt: string,             // ISO 8601
  status: WorkflowStatus,        // "draft" | "input_complete" | ... | "issued_for_construction"
  systemDesignLifeYears: number, // 15-40
  stations: Station[],           // Array of Station objects
  revisions: Revision[],         // Array of Revision objects
  currentRevision: string|null   // e.g., "REV-2"
}
```

### Station
```javascript
{
  id: string,                        // uuid
  name: string,                      // "ICCP Station-1"
  location: string,                  // "KM 00+000"
  designMode: DesignMode,            // "deepwell" | "shallow_vertical"
  pipelineSegments: PipelineSegment[],
  groundbed: GroundbedConfig,
  anodeSpec: AnodeSpec,
  proposedAnodes: number,            // 1-20
  cables: CableConfig,
  tr: TRSpec,
  soilResistivityOhmCm: number,      // 0-100000
  actualRemotenesM: number,
  requiredRemotenesM: number,        // default 20
  designLifeYears: number,           // target
  status: WorkflowStatus,
  lastCalcResult: CalcResult|null,
  insights: EngineeringInsight[],
  alternatives: DesignAlternative[]
}
```

### PipelineSegment
```javascript
{
  id: string,
  name: string,                    // "48\" Gas Sales Pipeline"
  od: number,                      // outside diameter (inches)
  wallThk: number,                 // wall thickness (inches)
  lengthM: number,                 // length (meters)
  opTempC: number,                 // operating temperature (°C)
  currentDensityBase: number,      // base current density at 25°C (mA/m²)
  coatingType: string,             // "fusion_bonded_epoxy" | "three_layer_polyethylene" | "coal_tar_enamel" | "bare"
  coatingEfficiency: number        // 0-1
}
```

### GroundbedConfig
```javascript
{
  type: DesignMode,          // "deepwell" | "shallow_vertical"
  startDepthM: number,       // depth to active zone top
  anodeLengthM: number,      // individual anode length
  inactiveLenM: number,      // inactive top section
  anodeSpacingM: number,     // end-to-end spacing
  boreholeDiaM: number,      // borehole diameter
  numHoles: number,          // number of boreholes (1 for deepwell)
  cokeCoverM: number,        // coke backfill above top anode
  cementPlugM: number        // cement plug at bottom
}
```

### AnodeSpec
```javascript
{
  id: string,                // "HSCI_TA4" | "HSCI_TA2" | "MMO_TUBULAR" | "ZINC_RIBBON"
  type: string,              // "HSCI" | "MMO" | "Sacrificial"
  label: string,
  standard: string,          // "17-SAMSS-016" etc.
  weightKg: number,
  outputAmps: number,
  consumptionRate: number,   // kg/A·year
  lengthM: number,
  diameterM: number,
  maxCurrentDensity: number, // A/m²
  material: string
}
```

### CableConfig
```javascript
{
  anodeTailLengths: number[],       // per-anode tail cable lengths (m), max 20
  anodeCableSizeMm2: number,       // 16 | 25 | 35 | 50 | 70 | 95
  posMainLengthM: number,
  posMainSizeMm2: number,
  negMainLengthM: number,
  negMainSizeMm2: number,
  negSecLengthM: number,
  negSecSizeMm2: number
}
```

### TRSpec
```javascript
{
  ratedVoltage: number,        // V DC
  ratedCurrent: number,        // A DC
  backEMF: number,             // V
  structureResistance: number, // Ω
  model: string?,
  standard: string?
}
```

### CalcResult (38 computed fields)
```javascript
{
  stationId: string,
  calculatedAt: string,                  // ISO 8601
  // Current requirement
  totalSurfaceAreaM2: number,
  tempCorrectedCurrentDensity: number,   // mA/m²
  requiredCurrentA: number,
  designCurrentA: number,                // ×1.30 spare
  // Groundbed
  groundbedResistanceOhm: number,
  activeLengthM: number,
  totalDrillDepthM: number,
  // Cable
  anodeTailParallelResOhm: number,
  posMainCableResOhm: number,
  negMainCableResOhm: number,
  totalCableResOhm: number,
  // TR circuit
  backEMFResistanceOhm: number,
  totalCircuitResistanceOhm: number,
  minTRVoltage: number,
  maxAllowableGroundbedRes: number,
  maxCircuitRes70pct: number,
  maxCircuitRes90pct: number,
  dcPowerW: number,
  acInputKVA: number,
  acInputCurrentA: number,
  // Design life
  designLifeYears: number,
  targetDesignLifeYears: number,
  // Sub-results
  perSegmentCurrents: Array<{segmentId, areaM2, iTempMam2, currentA}>,
  // Validation
  checks: ValidationCheck[],
  allChecksPassed: boolean,
  insights: EngineeringInsight[],
  // BOM (computed on demand)
  bom: BOMItem[]
}
```

### Revision
```javascript
{
  id: string,
  revNumber: string,             // "REV-0", "REV-1"
  description: string,
  createdAt: string,             // ISO 8601
  createdBy: string,             // "Engineer"
  status: WorkflowStatus,
  snapshot: Project              // Deep clone of entire project state
}
```

---

## Storage Details

### localStorage Key
```
Name: "cp-platform-project"
Version: 1
Contents: { project: Project, activeStationId: string }
```

### Migration
```javascript
// Version 1 (current)
// Initial schema
```

### Limitations
| Factor | Limit | Impact |
|--------|-------|--------|
| Max projects | 1 per browser | Single-project mode |
| Max stations | ~50 (storage dependent) | Each station ~50KB |
| Max revisions | ~10-20 (storage dependent) | Deep clones grow fast |
| Data survival | Until browser clear | No backup |

---

## Future: IndexedDB Migration

For production enterprise use, migrate from localStorage to IndexedDB:
```javascript
// Snippet: Zustand + IndexedDB persist
import { idbStorage } from 'zustand/middleware'
// Benefits: async, 500MB+, structured queries, no 5MB cap
```
