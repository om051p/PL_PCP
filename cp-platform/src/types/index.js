/**
 * CORE TYPE DEFINITIONS
 * Single source of truth for all platform data structures.
 * No TypeScript — pure JSDoc for IDE support without compilation overhead.
 */

/**
 * @typedef {'deepwell' | 'shallow_vertical' | 'distributed' | 'tank_bottom' | 'plant_piping' | 'sacrificial'} DesignMode
 */

/**
 * @typedef {'saudiAramco' | 'nace' | 'iso15589' | 'pdo' | 'adnoc' | 'custom'} DesignStandard
 */

/**
 * @typedef {'draft' | 'input_complete' | 'calculated' | 'engineering_review' | 'optimized' | 'approved' | 'issued_for_construction'} WorkflowStatus
 */

/**
 * @typedef {'pass' | 'fail' | 'warning' | 'info'} CheckStatus
 */

/**
 * @typedef {'error' | 'warning' | 'info' | 'success'} Severity
 */

/**
 * @typedef {Object} ValidationCheck
 * @property {string} id
 * @property {string} label
 * @property {CheckStatus} status
 * @property {string} computed   - Human-readable computed value
 * @property {string} [limit]    - Limit or threshold tested against
 * @property {string} [recommendation]
 */

/**
 * @typedef {Object} EngineeringInsight
 * @property {Severity} severity
 * @property {string} title
 * @property {string} message
 * @property {string[]} recommendations
 * @property {string} [calculationRef]  - Which calc module triggered this
 */

/**
 * @typedef {Object} BOMItem
 * @property {string} tag          - Category tag
 * @property {string} description
 * @property {string} unit
 * @property {number} quantity
 * @property {string} [standard]   - Applicable standard (17-SAMSS-xxx)
 * @property {string} [notes]
 */

/**
 * @typedef {Object} DesignAlternative
 * @property {string} id
 * @property {string} label
 * @property {Record<string, any>} parameters  - What changed
 * @property {CalcResult} result
 * @property {string[]} advantages
 * @property {string[]} disadvantages
 * @property {boolean} isCurrentDesign
 */

/**
 * @typedef {Object} Revision
 * @property {string} id
 * @property {string} revNumber   - REV-0, REV-1, etc.
 * @property {string} description
 * @property {string} createdAt
 * @property {string} createdBy
 * @property {string} status
 * @property {Project} snapshot   - Deep copy of the project at this revision
 */

/**
 * @typedef {Object} PipelineSegment
 * @property {string} id
 * @property {string} name
 * @property {number} od              - Outside diameter (inches)
 * @property {number} wallThk         - Wall thickness (inches)
 * @property {number} lengthM         - Length (meters)
 * @property {number} opTempC         - Operating temperature (°C)
 * @property {number} currentDensityBase  - Base current density at 25°C (mA/m²)
 * @property {string} coatingType     - Coating system identifier
 * @property {number} coatingEfficiency  - Coating efficiency factor (0-1)
 */

/**
 * @typedef {Object} GroundbedConfig
 * @property {DesignMode} type
 * @property {number} startDepthM    - Depth to top of active zone (m)
 * @property {number} anodeLengthM   - Individual anode length (m)
 * @property {number} inactiveLenM   - Inactive top section (m)
 * @property {number} anodeSpacingM  - End-to-end spacing between anodes (m)
 * @property {number} boreholeDiaM   - Borehole diameter (m)
 * @property {number} numHoles       - Number of boreholes (1 for deepwell)
 * @property {number} cokeCoverM     - Coke backfill above top anode (m)
 * @property {number} cementPlugM    - Cement plug at bottom (m)
 */

/**
 * @typedef {Object} AnodeSpec
 * @property {string} id
 * @property {string} type           - 'HSCI_TA4' | 'MMO' | 'Zinc' | 'Aluminum' | 'Magnesium'
 * @property {number} weightKg
 * @property {number} outputAmps     - Current output per anode (A)
 * @property {number} consumptionRate  - kg/A·year
 * @property {string} standard
 */

/**
 * @typedef {Object} CableConfig
 * @property {number[]} anodeTailLengths   - Per-anode tail cable lengths (m)
 * @property {number} anodeCableSizeMm2    - Anode tail cable cross-section
 * @property {number} posMainLengthM
 * @property {number} posMainSizeMm2
 * @property {number} negMainLengthM
 * @property {number} negMainSizeMm2
 * @property {number} negSecLengthM
 * @property {number} negSecSizeMm2
 */

/**
 * @typedef {Object} TRSpec
 * @property {number} ratedVoltage
 * @property {number} ratedCurrent
 * @property {number} backEMF
 * @property {number} structureResistance
 * @property {string} [model]
 * @property {string} [standard]
 */

/**
 * @typedef {Object} Station
 * @property {string} id
 * @property {string} name
 * @property {string} location        - KM marker or description
 * @property {DesignMode} designMode
 * @property {PipelineSegment[]} pipelineSegments
 * @property {GroundbedConfig} groundbed
 * @property {AnodeSpec} anodeSpec
 * @property {number} proposedAnodes
 * @property {CableConfig} cables
 * @property {TRSpec} tr
 * @property {number} soilResistivityOhmCm
 * @property {number} actualRemotenesM    - Actual groundbed-to-pipeline distance
 * @property {number} requiredRemotenesM  - Minimum required (typically 20m)
 * @property {number} designLifeYears
 * @property {WorkflowStatus} status
 * @property {CalcResult | null} lastCalcResult
 * @property {EngineeringInsight[]} insights
 * @property {DesignAlternative[]} alternatives
 */

/**
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} projectNumber
 * @property {string} clientName
 * @property {string} endClient
 * @property {string} projectName
 * @property {string} designer
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {WorkflowStatus} status
 * @property {number} systemDesignLifeYears
 * @property {DesignStandard} designStandard   - Active engineering standard
 * @property {Station[]} stations
 * @property {Revision[]} revisions
 * @property {string} currentRevision
 */

/**
 * @typedef {Object} CalcResult
 * @property {string} stationId
 * @property {string} calculatedAt
 * // Current requirement
 * @property {number} totalSurfaceAreaM2
 * @property {number} tempCorrectedCurrentDensity   - mA/m²
 * @property {number} requiredCurrentA
 * @property {number} designCurrentA                - with spare factor
 * // Groundbed
 * @property {number} groundbedResistanceOhm
 * @property {number} activeLengthM
 * @property {number} totalDrillDepthM
 * // Cable
 * @property {number} anodeTailParallelResOhm
 * @property {number} posMainCableResOhm
 * @property {number} negMainCableResOhm
 * @property {number} totalCableResOhm
 * // TR circuit
 * @property {number} backEMFResistanceOhm
 * @property {number} totalCircuitResistanceOhm
 * @property {number} minTRVoltage
 * @property {number} maxAllowableGroundbedRes
 * @property {number} maxCircuitRes70pct
 * @property {number} maxCircuitRes90pct
 * // Design life
 * @property {number} designLifeYears
 * // AC power
 * @property {number} dcPowerW
 * @property {number} acInputKVA
 * @property {number} acInputCurrentA
 * // BOM
 * @property {BOMItem[]} bom
 * // Validation
 * @property {ValidationCheck[]} checks
 * @property {boolean} allChecksPassed
 * @property {EngineeringInsight[]} insights
 */

export default {}
