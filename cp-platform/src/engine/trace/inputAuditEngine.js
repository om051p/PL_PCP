/**
 * INPUT AUDIT ENGINE
 * Captures a frozen, immutable snapshot of all inputs used in the CP calculation pipeline.
 * Called immediately before calculations to guarantee audit traceability.
 */

/**
 * Deeply freeze an object recursively.
 * 
 * @param {object} obj - Object to deeply freeze
 * @returns {object} Fully frozen object
 */
function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  
  Object.freeze(obj)
  
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = obj[prop]
    if (
      value !== null &&
      (typeof value === 'object' || typeof value === 'function') &&
      !Object.isFrozen(value)
    ) {
      deepFreeze(value)
    }
  })
  
  return obj
}

/**
 * Produce an immutable record of every input used in this calculation run.
 * 
 * @param {object} station - Station input data
 * @param {object} project - Project context including designBasis
 * @returns {object} Frozen InputAuditRecord
 */
export function captureInputAudit(station, project) {
  if (!station) return null

  const auditRecord = {
    capturedAt: new Date().toISOString(),
    stationId: station.id,
    standardId: project?.designBasis?.designStandard ?? 'saudiAramco',
    inputs: {
      soilResistivityOhmCm: station.soilResistivityOhmCm,
      actualRemotenesM: station.actualRemotenesM,
      requiredRemotenesM: station.requiredRemotenesM,
      proposedAnodes: station.proposedAnodes,
      designLifeYears: station.designLifeYears,
      designMode: station.designMode,
      
      // Groundbed
      groundbed: station.groundbed ? { ...station.groundbed } : null,
      
      // Anode Spec
      anodeSpec: station.anodeSpec ? { ...station.anodeSpec } : null,
      
      // Cables
      cables: station.cables ? { ...station.cables } : null,
      
      // TR
      tr: station.tr ? { ...station.tr } : null,
      
      // Pipeline segments
      segments: Array.isArray(station.pipelineSegments)
        ? station.pipelineSegments.map(s => ({
            id: s.id,
            name: s.name,
            od: s.od,
            wallThk: s.wallThk,
            lengthM: s.lengthM,
            opTempC: s.opTempC,
            currentDensityBase: s.currentDensityBase,
            coatingType: s.coatingType,
            coatingEfficiency: s.coatingEfficiency,
          }))
        : [],
      
      // Design Basis
      designBasis: project?.designBasis ? { ...project.designBasis } : null,
    },
  }

  return deepFreeze(auditRecord)
}
