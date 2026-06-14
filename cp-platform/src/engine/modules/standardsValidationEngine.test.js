import { describe, it, expect } from 'vitest'
import { runStandardsValidation } from './standardsValidationEngine.js'

describe('StandardsValidationEngine', () => {
  const mockProject = {
    id: 'p1',
    systemDesignLifeYears: 25,
    designBasis: {
      designStandard: 'saudiAramco',
      systemDesignLifeYears: 25,
    },
  }

  const baseStation = {
    id: 'st1',
    name: 'Test Station',
    designMode: 'deepwell',
    pipelineSegments: [
      {
        id: 'seg1',
        od: 48,
        lengthM: 292,
        opTempC: 57.2,
        currentDensityBase: 0.1,
        coatingType: 'fusion_bonded_epoxy',
        coatingEfficiency: 0.98,
      },
    ],
    groundbed: {
      type: 'deepwell',
      startDepthM: 15,
      anodeLengthM: 2.13,
      anodeSpacingM: 1.5,
      boreholeDiaM: 0.25,
    },
    anodeSpec: {
      id: 'HSCI_TA4',
      type: 'HSCI',
      weightKg: 38.6,
      consumptionRate: 0.45,
      lengthM: 2.13,
      diameterM: 0.064,
      maxCurrentDensity: 7.0,
      material: 'High-Silicon Cast Iron (14.5% Si)',
    },
    proposedAnodes: 9,
    cables: {
      anodeTailLengths: [25, 30, 35],
      anodeCableSizeMm2: 16,
      posMainLengthM: 180,
      posMainSizeMm2: 35,
      negMainLengthM: 100,
      negMainSizeMm2: 35,
      negSecLengthM: 60,
      negSecSizeMm2: 25,
    },
    tr: {
      ratedVoltage: 30,
      ratedCurrent: 25,
      backEMF: 2,
      structureResistance: 0.055,
      coolingType: 'air_cooled',
      wellCasingShared: false,
      powerSourceType: 'ac_grid',
      hasRMU: true,
      hazardousAreaClass: 'non_hazardous',
    },
    soilResistivityOhmCm: 361,
    actualRemotenesM: 160,
    requiredRemotenesM: 20,
    designLifeYears: 25,
    lastCalcResult: {
      minTRVoltage: 15.0,
      totalCircuitResistanceOhm: 0.5,
      designLifeYears: 27.5,
      actualRemotenesM: 160,
      requiredRemotenesM: 20,
    },
  }

  it('passes all standard checks for a fully compliant station design', () => {
    const report = runStandardsValidation(baseStation, mockProject)
    expect(report.complianceScore).toBe(100)
    expect(report.violations.length).toBe(0)
    expect(report.criticalFailCount).toBe(0)
  })

  it('detects TR rated voltage exceeding 100V DC limit', () => {
    const badStation = {
      ...baseStation,
      tr: {
        ...baseStation.tr,
        ratedVoltage: 110,
      },
    }
    const report = runStandardsValidation(badStation, mockProject)
    expect(report.complianceScore).toBeLessThan(100)
    const v = report.violations.find((v) => v.ruleId === 'SAES-500-6.8.4')
    expect(v).toBeDefined()
    expect(v.severity).toBe('CRITICAL')
  })

  it('detects undersized bond cables', () => {
    const badStation = {
      ...baseStation,
      cables: {
        ...baseStation.cables,
        posMainSizeMm2: 10, // Under 16mm²
      },
    }
    const report = runStandardsValidation(badStation, mockProject)
    expect(report.complianceScore).toBeLessThan(100)
    const v = report.violations.find((v) => v.ruleId === 'SAES-400-6.10.1.4-BOND')
    expect(v).toBeDefined()
    expect(v.severity).toBe('HIGH')
  })

  it('validates MMO anode current density limit', () => {
    const mmoStation = {
      ...baseStation,
      anodeSpec: {
        id: 'MMO_TUBULAR_FRESH',
        type: 'MMO',
        maxCurrentDensity: 7.0,
        diameterM: 0.025,
        lengthM: 1.0,
      },
      proposedAnodes: 2, // Low number increases density
      tr: {
        ...baseStation.tr,
        ratedCurrent: 50, // 25A per anode
      },
    }
    const report = runStandardsValidation(mmoStation, mockProject)
    const v = report.violations.find((v) => v.ruleId === 'SAES-400-Table5-CD')
    expect(v).toBeDefined()
    expect(v.severity).toBe('CRITICAL')
  })

  it('detects shared well casing violation on non-solar system', () => {
    const badStation = {
      ...baseStation,
      tr: {
        ...baseStation.tr,
        wellCasingShared: true,
        powerSourceType: 'ac_grid',
      },
    }
    const report = runStandardsValidation(badStation, mockProject)
    const v = report.violations.find((v) => v.ruleId === 'SAES-700-6.1.1-SHARED')
    expect(v).toBeDefined()
    expect(v.severity).toBe('CRITICAL')
  })

  it('permits shared well casing on solar power source', () => {
    const solarStation = {
      ...baseStation,
      tr: {
        ...baseStation.tr,
        wellCasingShared: true,
        powerSourceType: 'solar',
      },
    }
    const report = runStandardsValidation(solarStation, mockProject)
    const v = report.violations.find((v) => v.ruleId === 'SAES-700-6.1.1-SHARED')
    expect(v).toBeUndefined()
  })

  it('detects insufficient remoteness distance', () => {
    const badStation = {
      ...baseStation,
      actualRemotenesM: 50,
      tr: {
        ...baseStation.tr,
        ratedCurrent: 30, // Limit is 150m for >=25A
      },
    }
    const report = runStandardsValidation(badStation, mockProject)
    const v = report.violations.find((v) => v.ruleId === 'SAES-700-6.5.4-DIST')
    expect(v).toBeDefined()
  })

  it('detects missing RMU unit', () => {
    const badStation = {
      ...baseStation,
      tr: {
        ...baseStation.tr,
        hasRMU: false,
      },
    }
    const report = runStandardsValidation(badStation, mockProject)
    const v = report.violations.find((v) => v.ruleId === 'SAES-600-5.1.2.4-RMU')
    expect(v).toBeDefined()
  })

  it('detects air-cooled TR in hazardous area classification', () => {
    const badStation = {
      ...baseStation,
      tr: {
        ...baseStation.tr,
        coolingType: 'air_cooled',
        hazardousAreaClass: 'Class I Zone 2',
      },
    }
    const report = runStandardsValidation(badStation, mockProject)
    const v = report.violations.find((v) => v.ruleId === 'SAES-600-5.2.7-HAZ')
    expect(v).toBeDefined()
  })
})
