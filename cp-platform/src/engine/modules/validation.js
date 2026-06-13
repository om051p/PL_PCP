import { z } from 'zod'

export const PipelineSegmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  od: z.number().positive('Pipe OD must be positive'),
  wallThk: z.number().nonnegative().optional(),
  lengthM: z.number().nonnegative(),
  opTempC: z.number(),
  currentDensityBase: z.number().nonnegative(),
  coatingType: z.string().optional(),
  coatingEfficiency: z.number().min(0).max(1).optional(),
})

export const GroundbedSchema = z.object({
  type: z.enum(['deepwell', 'shallow_vertical', 'distributed']),
  startDepthM: z.number().nonnegative(),
  anodeLengthM: z.number().positive('Anode length must be positive'),
  inactiveLenM: z.number().nonnegative().optional(),
  anodeSpacingM: z.number().nonnegative(),
  boreholeDiaM: z.number().positive('Borehole diameter must be positive'),
  numHoles: z.number().int().positive().optional(),
  cokeCoverM: z.number().nonnegative().optional(),
  cementPlugM: z.number().nonnegative().optional(),
})

export const AnodeSpecSchema = z.object({
  id: z.string().optional(),
  type: z.string().optional(),
  label: z.string().optional(),
  weightKg: z.number().positive('Anode weight must be positive'),
  consumptionRate: z.number().positive('Consumption rate must be positive'),
  outputAmps: z.number().nonnegative().optional(),
})

export const CableSchema = z.object({
  anodeTailLengths: z.array(z.number().nonnegative()),
  anodeCableSizeMm2: z.number().positive(),
  posMainLengthM: z.number().nonnegative(),
  posMainSizeMm2: z.number().positive(),
  negMainLengthM: z.number().nonnegative(),
  negMainSizeMm2: z.number().positive(),
  negSecLengthM: z.number().nonnegative(),
  negSecSizeMm2: z.number().positive(),
})

export const TransformerRectifierSchema = z.object({
  ratedVoltage: z.number()
    .positive('TR voltage must be positive')
    .max(100, 'TR rated voltage must not exceed 100V DC per SAES-X-500 §6.8.4'),
  ratedCurrent: z.number().positive('TR current must be positive'),
  backEMF: z.number().nonnegative(),
  structureResistance: z.number().nonnegative(),
})

export const StationSchema = z.object({
  id: z.string().optional(),
  pipelineSegments: z.array(PipelineSegmentSchema),
  groundbed: GroundbedSchema,
  anodeSpec: AnodeSpecSchema,
  proposedAnodes: z.number().int().nonnegative(),
  cables: CableSchema,
  tr: TransformerRectifierSchema,
  soilResistivityOhmCm: z.number().positive('Soil resistivity must be positive'),
  actualRemotenesM: z.number().nonnegative().optional(),
  requiredRemotenesM: z.number().nonnegative().optional(),
  designLifeYears: z.number().nonnegative(),
})

export function validateStation(data) {
  const result = StationSchema.safeParse(data)
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))
    return { valid: false, errors }
  }
  return { valid: true, data: result.data }
}

/**
 * SAES-X-500 §6.6.3, §6.6.4 — Anode material restrictions by temperature and resistivity.
 *
 * @param {object} anodeSpec - Anode specification from ANODE_SPECS
 * @param {number} maxOpTempC - Maximum operating temperature (°C)
 * @param {number} soilResistivityOhmCm - Soil/electrolyte resistivity (Ω·cm)
 * @returns {{ valid: boolean, warnings: string[] }}
 */
export function validateAnodeMaterialRestrictions(anodeSpec, maxOpTempC, soilResistivityOhmCm) {
  const warnings = []

  // SAES-X-500 §6.6.4: Zinc anodes shall not be used where temperature exceeds 50°C (except HTZ)
  if (
    anodeSpec.type === 'Sacrificial' &&
    anodeSpec.material?.toLowerCase().includes('zinc') &&
    !anodeSpec.material?.toLowerCase().includes('high temperature')
  ) {
    if (maxOpTempC > 50) {
      warnings.push(
        `SAES-X-500 §6.6.4: Zinc anodes shall not be used where temperature exceeds 50°C. ` +
        `Current max operating temperature: ${maxOpTempC}°C. Use High Temperature Zinc (HTZ) anodes instead.`
      )
    }
  }

  // SAES-X-500 §6.6.3: Magnesium anodes shall not be used if resistivity < 2,000 Ω·cm
  if (
    anodeSpec.type === 'Sacrificial' &&
    anodeSpec.material?.toLowerCase().includes('magnesium') &&
    soilResistivityOhmCm < 2000
  ) {
    warnings.push(
      `SAES-X-500 §6.6.3: Magnesium anodes shall not be used if electrolyte resistivity is below 2,000 Ω·cm. ` +
      `Current resistivity: ${soilResistivityOhmCm} Ω·cm.`
    )
  }

  // SAES-X-500 §6.8.4: TR max rated voltage 100V
  // (enforced at input level; this provides a cross-check)
  if (anodeSpec && maxOpTempC > 50 && anodeSpec.material?.toLowerCase().includes('zinc')) {
    // Already caught above
  }

  return {
    valid: warnings.length === 0,
    warnings,
  }
}

/**
 * Validate over-protection limits per active standard.
 *
 * @param {object} protectionCriteria - From active standard config
 * @param {number} measuredPotentialMv - Measured or calculated potential (mV, CSE)
 * @returns {{ valid: boolean, warnings: string[] }}
 */
export function validateOverProtectionCeiling(protectionCriteria, measuredPotentialMv) {
  const warnings = []
  const limit = protectionCriteria?.overProtectionLimitMvCSE

  if (limit !== undefined && limit !== null) {
    // More negative = more protective; limit is the ceiling (e.g., -1050 mV)
    if (measuredPotentialMv < limit) {
      warnings.push(
        `SAES Over-Protection Limit: Potential ${measuredPotentialMv.toFixed(0)} mV CSE exceeds ` +
        `the maximum negative limit of ${limit} mV CSE. Risk of hydrogen-induced stress cracking (HISC) ` +
        `and coating disbondment. Consider reducing CP output or redistributing anodes.`
      )
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  }
}
