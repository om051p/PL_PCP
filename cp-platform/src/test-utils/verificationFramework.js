import { runStationCalculations } from '../engine/modules/calculations.js'
import { verifyModule, formatVerificationResult } from './decimalHelpers.js'

export const VERIFICATION_TOLERANCES = {
  electrical: { relative: 0.005, absolute: 0.001 },
  dimensions: { relative: 0.001, absolute: 0.01 },
  life: { relative: 0.005, absolute: 0.1 },
  current: { relative: 0.005, absolute: 0.0001 },
}

export function getTolerance(fieldKey) {
  if (fieldKey.includes('Voltage') || fieldKey.includes('Resistance') || fieldKey.includes('Ohm')) {
    return VERIFICATION_TOLERANCES.electrical
  }
  if (fieldKey.includes('Area') || fieldKey.includes('Depth') || fieldKey.includes('Length')) {
    return VERIFICATION_TOLERANCES.dimensions
  }
  if (fieldKey.includes('Life')) {
    return VERIFICATION_TOLERANCES.life
  }
  if (fieldKey.includes('Current') || fieldKey.includes('Amp')) {
    return VERIFICATION_TOLERANCES.current
  }
  return VERIFICATION_TOLERANCES.electrical
}

export function verifyGoldenDataset(name, station, systemDesignLifeYears, expected) {
  const result = runStationCalculations(station, systemDesignLifeYears)

  const checks = Object.entries(expected).map(([key, expectedValue]) => {
    const actualValue = result[key]
    return formatVerificationResult(actualValue, expectedValue, key)
  })

  return verifyModule(name, checks)
}

export function getGoldenDatasets() {
  const datasetsInput = {
    dataset1: {
      name: 'Dataset 1: Deepwell Tie-In',
      station: {
        pipelineSegments: [
          {
            id: 'seg-1',
            od: 48,
            lengthM: 292,
            opTempC: 57.22,
            currentDensityBase: 0.1,
            coatingEfficiency: 0.98,
          },
        ],
        groundbed: {
          type: 'deepwell',
          startDepthM: 15,
          anodeLengthM: 2.13,
          anodeSpacingM: 1.5,
          boreholeDiaM: 0.25,
          cokeCoverM: 2.5,
          cementPlugM: 0.5,
        },
        anodeSpec: { weightKg: 38.6, consumptionRate: 0.45, outputAmps: 3.56 },
        proposedAnodes: 9,
        cables: {
          anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65],
          anodeCableSizeMm2: 16,
          posMainLengthM: 180,
          posMainSizeMm2: 35,
          negMainLengthM: 100,
          negMainSizeMm2: 35,
          negSecLengthM: 60,
          negSecSizeMm2: 25,
        },
        tr: { ratedVoltage: 30, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
        soilResistivityOhmCm: 361,
        actualRemotenesM: 56,
        requiredRemotenesM: 20,
        designLifeYears: 25,
      },
      life: 25,
      expected: {
        totalSurfaceAreaM2: 1118.43,
        requiredCurrentA: 0.2053,
        designCurrentA: 0.2669,
        groundbedResistanceOhm: 0.1135,
        activeLengthM: 31.17,
        totalDrillDepthM: 49.17,
        anodeTailParallelResOhm: 0.007627,
        posMainCableResOhm: 0.1186,
        negMainCableResOhm: 0.1291,
        totalCableResOhm: 0.2553,
        backEMFResistanceOhm: 0.16,
        totalCircuitResistanceOhm: 0.5839,
        minTRVoltage: 16.6,
        designLifeYears: 26.25,
      },
    },
    dataset2: {
      name: 'Dataset 2: Deepwell Main Line',
      station: {
        pipelineSegments: [
          {
            id: 'seg-2',
            od: 48,
            lengthM: 41480,
            opTempC: 57.22,
            currentDensityBase: 0.1,
            coatingEfficiency: 0.98,
          },
        ],
        groundbed: {
          type: 'deepwell',
          startDepthM: 15,
          anodeLengthM: 2.13,
          anodeSpacingM: 1.5,
          boreholeDiaM: 0.25,
          cokeCoverM: 2.5,
          cementPlugM: 0.5,
        },
        anodeSpec: { weightKg: 38.6, consumptionRate: 0.45, outputAmps: 3.56 },
        proposedAnodes: 9,
        cables: {
          anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65],
          anodeCableSizeMm2: 16,
          posMainLengthM: 180,
          posMainSizeMm2: 35,
          negMainLengthM: 100,
          negMainSizeMm2: 35,
          negSecLengthM: 60,
          negSecSizeMm2: 25,
        },
        tr: { ratedVoltage: 30, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
        soilResistivityOhmCm: 361,
        actualRemotenesM: 56,
        requiredRemotenesM: 20,
        designLifeYears: 25,
      },
      life: 25,
      expected: {
        totalSurfaceAreaM2: 158877.93,
        requiredCurrentA: 29.1643,
        designCurrentA: 37.9136,
      },
    },
    dataset3: {
      name: 'Dataset 3: High Resistivity Deepwell (ρ=50k)',
      station: {
        pipelineSegments: [
          {
            id: 'seg-3',
            od: 48,
            lengthM: 292,
            opTempC: 57.22,
            currentDensityBase: 0.1,
            coatingEfficiency: 0.98,
          },
        ],
        groundbed: {
          type: 'deepwell',
          startDepthM: 60,
          anodeLengthM: 2.13,
          anodeSpacingM: 1.5,
          boreholeDiaM: 0.25,
          cokeCoverM: 2.5,
          cementPlugM: 0.5,
        },
        anodeSpec: { weightKg: 38.6, consumptionRate: 0.45, outputAmps: 3.56 },
        proposedAnodes: 20,
        cables: {
          anodeTailLengths: [
            25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120,
          ],
          anodeCableSizeMm2: 16,
          posMainLengthM: 180,
          posMainSizeMm2: 35,
          negMainLengthM: 100,
          negMainSizeMm2: 35,
          negSecLengthM: 60,
          negSecSizeMm2: 25,
        },
        tr: { ratedVoltage: 50, ratedCurrent: 40, backEMF: 2, structureResistance: 0.055 },
        soilResistivityOhmCm: 50000,
        actualRemotenesM: 80,
        requiredRemotenesM: 20,
        designLifeYears: 20,
      },
      life: 20,
      expected: {
        totalSurfaceAreaM2: 1118.43,
        requiredCurrentA: 0.2053,
        designCurrentA: 0.2669,
        groundbedResistanceOhm: 7.74,
        activeLengthM: 71.1,
        totalDrillDepthM: 134.1,
        anodeTailParallelResOhm: 0.004942,
        posMainCableResOhm: 0.1186,
        negMainCableResOhm: 0.1291,
        totalCableResOhm: 0.2526,
        backEMFResistanceOhm: 0.1,
        totalCircuitResistanceOhm: 8.148,
        minTRVoltage: 327.9,
        designLifeYears: 36.46,
      },
    },
    dataset4: {
      name: 'Dataset 4: Low Resistivity Shallow Vertical (ρ=500)',
      station: {
        pipelineSegments: [
          {
            id: 'seg-4',
            od: 36,
            lengthM: 500,
            opTempC: 40,
            currentDensityBase: 0.05,
            coatingEfficiency: 0.95,
          },
        ],
        groundbed: {
          type: 'shallow_vertical',
          startDepthM: 2,
          anodeLengthM: 1.5,
          anodeSpacingM: 3,
          boreholeDiaM: 0.3,
        },
        anodeSpec: { weightKg: 22, consumptionRate: 0.45, outputAmps: 2 },
        proposedAnodes: 4,
        cables: {
          anodeTailLengths: [15, 20, 25, 30],
          anodeCableSizeMm2: 16,
          posMainLengthM: 80,
          posMainSizeMm2: 25,
          negMainLengthM: 50,
          negMainSizeMm2: 25,
          negSecLengthM: 30,
          negSecSizeMm2: 16,
        },
        tr: { ratedVoltage: 24, ratedCurrent: 10, backEMF: 1, structureResistance: 0.05 },
        soilResistivityOhmCm: 500,
        actualRemotenesM: 30,
        requiredRemotenesM: 15,
        designLifeYears: 20,
      },
      life: 20,
      expected: {
        totalSurfaceAreaM2: 1436.34,
        requiredCurrentA: 0.08977,
        designCurrentA: 0.1167,
        groundbedResistanceOhm: 0.7761,
        activeLengthM: 1.5,
        totalDrillDepthM: 3.5,
        anodeTailParallelResOhm: 0.008805,
        posMainCableResOhm: 0.08424,
        negMainCableResOhm: 0.1028,
        totalCableResOhm: 0.1959,
        backEMFResistanceOhm: 0.2,
        totalCircuitResistanceOhm: 1.222,
        minTRVoltage: 13.22,
        designLifeYears: 16.63,
      },
    },
    dataset5: {
      name: 'Dataset 5: Undersized TR (BR-001 trigger)',
      station: {
        pipelineSegments: [
          {
            id: 'seg-5',
            od: 48,
            lengthM: 41480,
            opTempC: 57.22,
            currentDensityBase: 0.1,
            coatingEfficiency: 0.98,
          },
        ],
        groundbed: {
          type: 'deepwell',
          startDepthM: 15,
          anodeLengthM: 2.13,
          anodeSpacingM: 1.5,
          boreholeDiaM: 0.25,
          cokeCoverM: 2.5,
          cementPlugM: 0.5,
        },
        anodeSpec: { weightKg: 38.6, consumptionRate: 0.45, outputAmps: 3.56 },
        proposedAnodes: 9,
        cables: {
          anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65],
          anodeCableSizeMm2: 16,
          posMainLengthM: 180,
          posMainSizeMm2: 35,
          negMainLengthM: 100,
          negMainSizeMm2: 35,
          negSecLengthM: 60,
          negSecSizeMm2: 25,
        },
        tr: { ratedVoltage: 10, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
        soilResistivityOhmCm: 361,
        actualRemotenesM: 56,
        requiredRemotenesM: 20,
        designLifeYears: 25,
      },
      life: 25,
      expected: {
        totalSurfaceAreaM2: 158877.93,
        requiredCurrentA: 29.1643,
        designCurrentA: 37.9136,
        groundbedResistanceOhm: 0.1135,
        activeLengthM: 31.17,
        totalDrillDepthM: 49.17,
        anodeTailParallelResOhm: 0.007627,
        posMainCableResOhm: 0.1186,
        negMainCableResOhm: 0.1291,
        totalCableResOhm: 0.2553,
        backEMFResistanceOhm: 0.16,
        totalCircuitResistanceOhm: 0.5839,
        minTRVoltage: 16.6,
        designLifeYears: 26.25,
      },
    },
    dataset6: {
      name: 'Dataset 6: Oversized TR (High Headroom)',
      station: {
        pipelineSegments: [
          {
            id: 'seg-6',
            od: 48,
            lengthM: 292,
            opTempC: 57.22,
            currentDensityBase: 0.1,
            coatingEfficiency: 0.98,
          },
        ],
        groundbed: {
          type: 'deepwell',
          startDepthM: 15,
          anodeLengthM: 2.13,
          anodeSpacingM: 1.5,
          boreholeDiaM: 0.25,
          cokeCoverM: 2.5,
          cementPlugM: 0.5,
        },
        anodeSpec: { weightKg: 38.6, consumptionRate: 0.45, outputAmps: 3.56 },
        proposedAnodes: 9,
        cables: {
          anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65],
          anodeCableSizeMm2: 16,
          posMainLengthM: 180,
          posMainSizeMm2: 35,
          negMainLengthM: 100,
          negMainSizeMm2: 35,
          negSecLengthM: 60,
          negSecSizeMm2: 25,
        },
        tr: { ratedVoltage: 60, ratedCurrent: 50, backEMF: 2, structureResistance: 0.055 },
        soilResistivityOhmCm: 361,
        actualRemotenesM: 56,
        requiredRemotenesM: 20,
        designLifeYears: 25,
      },
      life: 25,
      expected: {
        totalSurfaceAreaM2: 1118.43,
        requiredCurrentA: 0.2053,
        designCurrentA: 0.2669,
        groundbedResistanceOhm: 0.1135,
        activeLengthM: 31.17,
        totalDrillDepthM: 49.17,
        anodeTailParallelResOhm: 0.007627,
        posMainCableResOhm: 0.1186,
        negMainCableResOhm: 0.1291,
        totalCableResOhm: 0.2553,
        backEMFResistanceOhm: 0.08,
        totalCircuitResistanceOhm: 0.5039,
        minTRVoltage: 27.19,
        designLifeYears: 13.12,
      },
    },
    dataset7: {
      name: 'Dataset 7: Shallow Small Diameter (6")',
      station: {
        pipelineSegments: [
          {
            id: 'seg-7',
            od: 6,
            lengthM: 200,
            opTempC: 30,
            currentDensityBase: 0.1,
            coatingEfficiency: 0.97,
          },
        ],
        groundbed: {
          type: 'shallow_vertical',
          startDepthM: 1.5,
          anodeLengthM: 1.2,
          anodeSpacingM: 2,
          boreholeDiaM: 0.2,
        },
        anodeSpec: { weightKg: 14, consumptionRate: 0.45, outputAmps: 1.5 },
        proposedAnodes: 3,
        cables: {
          anodeTailLengths: [10, 15, 20],
          anodeCableSizeMm2: 16,
          posMainLengthM: 50,
          posMainSizeMm2: 16,
          negMainLengthM: 30,
          negMainSizeMm2: 16,
          negSecLengthM: 20,
          negSecSizeMm2: 16,
        },
        tr: { ratedVoltage: 12, ratedCurrent: 5, backEMF: 1, structureResistance: 0.03 },
        soilResistivityOhmCm: 2000,
        actualRemotenesM: 15,
        requiredRemotenesM: 10,
        designLifeYears: 15,
      },
      life: 15,
      expected: {
        totalSurfaceAreaM2: 95.76,
        requiredCurrentA: 0.009576,
        designCurrentA: 0.01245,
        groundbedResistanceOhm: 4.561,
        activeLengthM: 1.2,
        totalDrillDepthM: 2.7,
        anodeTailParallelResOhm: 0.007722,
        posMainCableResOhm: 0.08365,
        negMainCableResOhm: 0.08365,
        totalCableResOhm: 0.175,
        backEMFResistanceOhm: 0.4,
        totalCircuitResistanceOhm: 5.166,
        minTRVoltage: 26.83,
        designLifeYears: 15.87,
      },
    },
  }
  return datasetsInput
}
