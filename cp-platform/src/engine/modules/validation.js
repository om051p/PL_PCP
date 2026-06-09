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
  ratedVoltage: z.number().positive('TR voltage must be positive'),
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
