/**
 * STANDARDS RESOLVER — Smoke Tests
 *
 * Covers:
 *   - Resolver function: getStandard(id), getActiveStandard(project)
 *   - UI options: STANDARD_OPTIONS
 *   - Saudi Aramco config: shape, key values, sections\n *   - NACE SP0169 config: shape, key values, sections\n *   - Contract: all standards expose the same required section structure\n *   - Differing values: verify key differences between Aramco and NACE\n */

import { describe, it, expect } from 'vitest'
import {
  getStandard,
  getActiveStandard,
  STANDARD_OPTIONS,
} from './index.js'
import SAUDI_ARAMCO from './saudiAramco.js'
import NACE_SP0169 from './naceSP0169.js'

// ─── getStandard() ───────────────────────────────────────────────────────────

describe('getStandard()', () => {
  it('returns Saudi Aramco config for id "saudiAramco"', () => {
    const std = getStandard('saudiAramco')
    expect(std).toBe(SAUDI_ARAMCO)
    expect(std.id).toBe('saudiAramco')
    expect(std.label).toBe('Saudi Aramco')
  })

  it('returns NACE config for id "nace"', () => {
    const std = getStandard('nace')
    expect(std).toBe(NACE_SP0169)
    expect(std.id).toBe('nace')
    expect(std.label).toBe('NACE SP0169')
  })

  it('falls back to Saudi Aramco for unknown standard ID', () => {
    const std = getStandard('unknown_standard_xyz')
    expect(std).toBe(SAUDI_ARAMCO)
    expect(std.id).toBe('saudiAramco')
  })

  it('falls back to Saudi Aramco for empty string ID', () => {
    const std = getStandard('')
    expect(std).toBe(SAUDI_ARAMCO)
  })

  it('falls back to Saudi Aramco for null/undefined ID', () => {
    expect(getStandard(null)).toBe(SAUDI_ARAMCO)
    expect(getStandard(undefined)).toBe(SAUDI_ARAMCO)
  })
})

// ─── getActiveStandard() ─────────────────────────────────────────────────────

describe('getActiveStandard()', () => {
  it('returns Saudi Aramco when project is null', () => {
    expect(getActiveStandard(null)).toBe(SAUDI_ARAMCO)
  })

  it('returns Saudi Aramco when project is undefined', () => {
    expect(getActiveStandard(undefined)).toBe(SAUDI_ARAMCO)
  })

  it('returns Saudi Aramco when project has no designStandard field', () => {
    expect(getActiveStandard({})).toBe(SAUDI_ARAMCO)
  })

  it('returns Saudi Aramco when designStandard is null', () => {
    expect(getActiveStandard({ designStandard: null })).toBe(SAUDI_ARAMCO)
  })

  it('returns Saudi Aramco for "saudiAramco" designStandard', () => {
    const project = { designStandard: 'saudiAramco' }
    expect(getActiveStandard(project)).toBe(SAUDI_ARAMCO)
  })

  it('returns NACE for "nace" designStandard', () => {
    const project = { designStandard: 'nace' }
    expect(getActiveStandard(project)).toBe(NACE_SP0169)
  })

  it('falls back to Saudi Aramco for unknown designStandard', () => {
    const project = { designStandard: 'iso' }
    expect(getActiveStandard(project)).toBe(SAUDI_ARAMCO)
  })
})

// ─── STANDARD_OPTIONS ────────────────────────────────────────────────────────

describe('STANDARD_OPTIONS', () => {
  it('is an array with 2 entries', () => {
    expect(Array.isArray(STANDARD_OPTIONS)).toBe(true)
    expect(STANDARD_OPTIONS).toHaveLength(2)
  })

  it('each option has value, label, and description', () => {
    STANDARD_OPTIONS.forEach((opt) => {
      expect(opt).toHaveProperty('value')
      expect(opt).toHaveProperty('label')
      expect(opt).toHaveProperty('description')
      expect(typeof opt.value).toBe('string')
      expect(typeof opt.label).toBe('string')
      expect(typeof opt.description).toBe('string')
    })
  })

  it('includes Saudi Aramco as first option', () => {
    expect(STANDARD_OPTIONS[0].value).toBe('saudiAramco')
    expect(STANDARD_OPTIONS[0].label).toBe('Saudi Aramco')
  })

  it('includes NACE as second option', () => {
    expect(STANDARD_OPTIONS[1].value).toBe('nace')
    expect(STANDARD_OPTIONS[1].label).toBe('NACE SP0169')
  })

  it('values match the STANDARD_REGISTRY keys', () => {
    const ids = STANDARD_OPTIONS.map((o) => o.value)
    expect(ids).toEqual(['saudiAramco', 'nace'])
  })
})

// ─── Required Sections Contract ──────────────────────────────────────────────

describe('Standard config contract (both standards)', () => {
  const REQUIRED_SECTIONS = [
    'id',
    'label',
    'shortLabel',
    'version',
    'description',
    'metadata',
    'protectionCriteria',
    'currentRequirement',
    'temperatureCorrection',
    'groundbed',
    'trSizing',
    'designLife',
    'cokeBackfill',
    'cable',
    'standardsReferences',
    'currentDensityBasis',
  ]

  it.each(REQUIRED_SECTIONS)('Saudi Aramco has required section: %s', (section) => {
    expect(SAUDI_ARAMCO).toHaveProperty(section)
  })

  it.each(REQUIRED_SECTIONS)('NACE SP0169 has required section: %s', (section) => {
    expect(NACE_SP0169).toHaveProperty(section)
  })

  it('both standards have unique IDs', () => {
    expect(SAUDI_ARAMCO.id).not.toBe(NACE_SP0169.id)
  })

  it('both standards have non-empty labels', () => {
    expect(SAUDI_ARAMCO.label.length).toBeGreaterThan(0)
    expect(NACE_SP0169.label.length).toBeGreaterThan(0)
  })

  it('both standards have non-empty versions', () => {
    expect(SAUDI_ARAMCO.version.length).toBeGreaterThan(0)
    expect(NACE_SP0169.version.length).toBeGreaterThan(0)
  })
})

// ─── Saudi Aramco — Key Values ──────────────────────────────────────────────

describe('Saudi Aramco — key values', () => {
  it('uses exponential temperature correction', () => {
    expect(SAUDI_ARAMCO.temperatureCorrection.method).toBe('exponential')
    expect(SAUDI_ARAMCO.temperatureCorrection.baseTempC).toBe(30)
  })

  it('spare factor is 1.30', () => {
    expect(SAUDI_ARAMCO.currentRequirement.spareFactor).toBe(1.3)
  })

  it('anode utilization factor is 0.85', () => {
    expect(SAUDI_ARAMCO.designLife.anodeUtilizationFactor).toBe(0.85)
  })

  it('default target design life is 25 years', () => {
    expect(SAUDI_ARAMCO.designLife.defaultTargetYears).toBe(25)
  })

  it('min design life margin is 3 years', () => {
    expect(SAUDI_ARAMCO.designLife.minMarginYears).toBe(3)
  })

  it('coke backfill contingency is 1.15 (+15%)', () => {
    expect(SAUDI_ARAMCO.cokeBackfill.contingency).toBe(1.15)
  })

  it('coke backfill annulus factor is 39.2', () => {
    expect(SAUDI_ARAMCO.cokeBackfill.annulusFactor).toBe(39.2)
  })

  it('min remoteness is 20m', () => {
    expect(SAUDI_ARAMCO.groundbed.minRemotenessM).toBe(20)
  })

  it('TR efficiency is 0.8', () => {
    expect(SAUDI_ARAMCO.trSizing.efficiency).toBe(0.8)
  })

  it('TR input voltage is 480V/3Φ', () => {
    expect(SAUDI_ARAMCO.trSizing.inputVoltage).toBe(480)
    expect(SAUDI_ARAMCO.trSizing.inputPhases).toBe(3)
  })

  it('TR step is 10V/10A', () => {
    expect(SAUDI_ARAMCO.trSizing.stepVoltage).toBe(10)
    expect(SAUDI_ARAMCO.trSizing.stepCurrent).toBe(10)
  })

  it('uses SAES-X-400 remoteness table', () => {
    expect(SAUDI_ARAMCO.groundbed.SAES_X_400_remotenessTable).toBe(true)
  })

  it('protection criteria default is native_potential_and_polarization', () => {
    expect(SAUDI_ARAMCO.protectionCriteria.defaultMethod).toBe('native_potential_and_polarization')
  })

  it('high resistivity threshold is 10k Ω·cm', () => {
    expect(SAUDI_ARAMCO.groundbed.resistivityThresholds.high).toBe(10000)
  })

  it('very high resistivity threshold is 50k Ω·cm', () => {
    expect(SAUDI_ARAMCO.groundbed.resistivityThresholds.veryHigh).toBe(50000)
  })

  it('base current density is 0.1 mA/m²', () => {
    expect(SAUDI_ARAMCO.currentDensityBasis.defaultMAperM2).toBe(0.1)
  })

  it('standards references use 17-SAMSS codes', () => {
    const refs = SAUDI_ARAMCO.standardsReferences
    expect(refs.tru).toBe('17-SAMSS-003')
    expect(refs.anode).toBe('17-SAMSS-016')
    expect(refs.junctionBox).toBe('17-SAMSS-008')
    expect(refs.cable).toBe('17-SAMSS-020')
    expect(refs.cokeBackfill).toBe('17-855-011')
    expect(refs.testStation).toBe('17-SAMSS-007')
  })
})

// ─── NACE SP0169 — Key Values ────────────────────────────────────────────────

describe('NACE SP0169 — key values', () => {
  it('uses linear temperature correction', () => {
    expect(NACE_SP0169.temperatureCorrection.method).toBe('linear')
    expect(NACE_SP0169.temperatureCorrection.baseTempC).toBe(25)
    expect(NACE_SP0169.temperatureCorrection.alpha).toBe(0.025)
  })

  it('spare factor is 1.25', () => {
    expect(NACE_SP0169.currentRequirement.spareFactor).toBe(1.25)
  })

  it('anode utilization factor is 0.80', () => {
    expect(NACE_SP0169.designLife.anodeUtilizationFactor).toBe(0.80)
  })

  it('default target design life is 20 years', () => {
    expect(NACE_SP0169.designLife.defaultTargetYears).toBe(20)
  })

  it('min design life margin is 2 years', () => {
    expect(NACE_SP0169.designLife.minMarginYears).toBe(2)
  })

  it('coke backfill contingency is 1.10 (+10%)', () => {
    expect(NACE_SP0169.cokeBackfill.contingency).toBe(1.10)
  })

  it('coke backfill annulus factor is 35.0', () => {
    expect(NACE_SP0169.cokeBackfill.annulusFactor).toBe(35.0)
  })

  it('min remoteness is 15m', () => {
    expect(NACE_SP0169.groundbed.minRemotenessM).toBe(15)
  })

  it('does not use SAES-X-400 remoteness table', () => {
    expect(NACE_SP0169.groundbed.SAES_X_400_remotenessTable).toBe(false)
  })

  it('TR efficiency is 0.75', () => {
    expect(NACE_SP0169.trSizing.efficiency).toBe(0.75)
  })

  it('TR input voltage is 230V/3Φ (international)', () => {
    expect(NACE_SP0169.trSizing.inputVoltage).toBe(230)
    expect(NACE_SP0169.trSizing.inputPhases).toBe(3)
  })

  it('TR step is 5V/5A', () => {
    expect(NACE_SP0169.trSizing.stepVoltage).toBe(5)
    expect(NACE_SP0169.trSizing.stepCurrent).toBe(5)
  })

  it('protection criteria default is -850mV polarized', () => {
    expect(NACE_SP0169.protectionCriteria.defaultMethod).toBe('neg850_mv_polarized')
  })

  it('has 4 available protection methods', () => {
    expect(NACE_SP0169.protectionCriteria.availableMethods).toHaveLength(4)
  })

  it('high resistivity threshold is 15k Ω·cm', () => {
    expect(NACE_SP0169.groundbed.resistivityThresholds.high).toBe(15000)
  })

  it('very high resistivity threshold is 100k Ω·cm', () => {
    expect(NACE_SP0169.groundbed.resistivityThresholds.veryHigh).toBe(100000)
  })

  it('base current density is 0.05 mA/m²', () => {
    expect(NACE_SP0169.currentDensityBasis.defaultMAperM2).toBe(0.05)
  })

  it('standards references use NACE/IEC codes', () => {
    const refs = NACE_SP0169.standardsReferences
    expect(refs.tru).toBe('NACE TM0108 / IEEE 665')
    expect(refs.anode).toBe('NACE TM0108')
    expect(refs.junctionBox).toBe('NEMA 4X / IEC 60529')
    expect(refs.cable).toBe('IEC 60228 / NEPA 70')
    expect(refs.cokeBackfill).toBe('NACE RP0288')
    expect(refs.testStation).toBe('NACE TM0497')
  })
})

// ─── Differing Values — Verify Intentional Differences ───────────────────────

describe('Intentional differences between Saudi Aramco and NACE', () => {
  it('temperature correction method differs', () => {
    expect(SAUDI_ARAMCO.temperatureCorrection.method).toBe('exponential')
    expect(NACE_SP0169.temperatureCorrection.method).toBe('linear')
  })

  it('NACE spare factor is lower than Aramco', () => {
    expect(NACE_SP0169.currentRequirement.spareFactor).toBeLessThan(
      SAUDI_ARAMCO.currentRequirement.spareFactor,
    )
  })

  it('NACE utilization factor is lower than Aramco', () => {
    expect(NACE_SP0169.designLife.anodeUtilizationFactor).toBeLessThan(
      SAUDI_ARAMCO.designLife.anodeUtilizationFactor,
    )
  })

  it('NACE default design life is shorter than Aramco', () => {
    expect(NACE_SP0169.designLife.defaultTargetYears).toBeLessThan(
      SAUDI_ARAMCO.designLife.defaultTargetYears,
    )
  })

  it('NACE min margin is smaller than Aramco', () => {
    expect(NACE_SP0169.designLife.minMarginYears).toBeLessThan(
      SAUDI_ARAMCO.designLife.minMarginYears,
    )
  })

  it('NACE coke contingency is lower than Aramco', () => {
    expect(NACE_SP0169.cokeBackfill.contingency).toBeLessThan(
      SAUDI_ARAMCO.cokeBackfill.contingency,
    )
  })

  it('NACE min remoteness is smaller than Aramco', () => {
    expect(NACE_SP0169.groundbed.minRemotenessM).toBeLessThan(
      SAUDI_ARAMCO.groundbed.minRemotenessM,
    )
  })

  it('NACE TR efficiency is lower than Aramco', () => {
    expect(NACE_SP0169.trSizing.efficiency).toBeLessThan(
      SAUDI_ARAMCO.trSizing.efficiency,
    )
  })

  it('Aramco uses 480V input, NACE uses 230V', () => {
    expect(SAUDI_ARAMCO.trSizing.inputVoltage).toBe(480)
    expect(NACE_SP0169.trSizing.inputVoltage).toBe(230)
  })

  it('Aramco resistivity thresholds are tighter (lower) than NACE', () => {
    expect(SAUDI_ARAMCO.groundbed.resistivityThresholds.high).toBeLessThan(
      NACE_SP0169.groundbed.resistivityThresholds.high,
    )
    expect(SAUDI_ARAMCO.groundbed.resistivityThresholds.veryHigh).toBeLessThan(
      NACE_SP0169.groundbed.resistivityThresholds.veryHigh,
    )
  })

  it('NACE base current density is half of Aramco', () => {
    expect(NACE_SP0169.currentDensityBasis.defaultMAperM2).toBe(
      SAUDI_ARAMCO.currentDensityBasis.defaultMAperM2 / 2,
    )
  })
})

// ─── Metadata ────────────────────────────────────────────────────────────────

describe('Standard metadata', () => {
  it('Saudi Aramco metadata has all required fields', () => {
    const m = SAUDI_ARAMCO.metadata
    expect(m).toHaveProperty('organization', 'Saudi Aramco')
    expect(m).toHaveProperty('standardsBody')
    expect(m).toHaveProperty('region')
    expect(m).toHaveProperty('typicalApplication')
  })

  it('NACE metadata has all required fields', () => {
    const m = NACE_SP0169.metadata
    expect(m).toHaveProperty('organization')
    expect(m).toHaveProperty('standardsBody', 'NACE/AMPP')
    expect(m).toHaveProperty('region')
    expect(m).toHaveProperty('typicalApplication')
  })

  it('NACE metadata organization is NACE International (not Saudi Aramco)', () => {
    expect(NACE_SP0169.metadata.organization).not.toBe('Saudi Aramco')
  })
})

// ─── Protection Criteria ─────────────────────────────────────────────────────

describe('Protection criteria sections', () => {
  it('both have availableMethods array', () => {
    expect(Array.isArray(SAUDI_ARAMCO.protectionCriteria.availableMethods)).toBe(true)
    expect(Array.isArray(NACE_SP0169.protectionCriteria.availableMethods)).toBe(true)
  })

  it('both have basePotentialMvCSE', () => {
    expect(SAUDI_ARAMCO.protectionCriteria.basePotentialMvCSE).toBe(-850)
    expect(NACE_SP0169.protectionCriteria.basePotentialMvCSE).toBe(-850)
  })

  it('both have polarizationShiftMv of 100', () => {
    expect(SAUDI_ARAMCO.protectionCriteria.polarizationShiftMv).toBe(100)
    expect(NACE_SP0169.protectionCriteria.polarizationShiftMv).toBe(100)
  })

  it('Aramco requires IR drop correction; NACE allows instant-off', () => {
    expect(SAUDI_ARAMCO.protectionCriteria.irDropCorrectionRequired).toBe(true)
    expect(NACE_SP0169.protectionCriteria.irDropCorrectionRequired).toBe(false)
  })

  it('each available method has id, label, and description', () => {
    const allMethods = [
      ...SAUDI_ARAMCO.protectionCriteria.availableMethods,
      ...NACE_SP0169.protectionCriteria.availableMethods,
    ]
    allMethods.forEach((m) => {
      expect(m).toHaveProperty('id')
      expect(m).toHaveProperty('label')
      expect(m).toHaveProperty('description')
    })
  })
})

// ─── Current Requirement ─────────────────────────────────────────────────────

describe('Current requirement sections', () => {
  it('Aramco does not apply coating efficiency; NACE does', () => {
    expect(SAUDI_ARAMCO.currentRequirement.applyCoatingEfficiency).toBe(false)
    expect(NACE_SP0169.currentRequirement.applyCoatingEfficiency).toBe(true)
  })

  it('Aramco does not enable coating degradation; NACE does', () => {
    expect(SAUDI_ARAMCO.currentRequirement.coatingDegradationEnabled).toBe(false)
    expect(NACE_SP0169.currentRequirement.coatingDegradationEnabled).toBe(true)
  })

  it('tempCorrectionMethod matches temperatureCorrection.method', () => {
    expect(SAUDI_ARAMCO.currentRequirement.tempCorrectionMethod).toBe(
      SAUDI_ARAMCO.temperatureCorrection.method,
    )
    expect(NACE_SP0169.currentRequirement.tempCorrectionMethod).toBe(
      NACE_SP0169.temperatureCorrection.method,
    )
  })

  it('tempCorrection baseTempC matches temperatureCorrection.baseTempC', () => {
    expect(SAUDI_ARAMCO.currentRequirement.baseTempC).toBe(
      SAUDI_ARAMCO.temperatureCorrection.baseTempC,
    )
    expect(NACE_SP0169.currentRequirement.baseTempC).toBe(
      NACE_SP0169.temperatureCorrection.baseTempC,
    )
  })
})

// ─── Temperature Correction — Formula Strings ────────────────────────────────

describe('Temperature correction formulas', () => {
  it('Aramco formula is exponential', () => {
    expect(SAUDI_ARAMCO.temperatureCorrection.formula).toContain('1.25')
    expect(SAUDI_ARAMCO.temperatureCorrection.formula).toContain('T − 30')
  })

  it('NACE formula is linear', () => {
    expect(NACE_SP0169.temperatureCorrection.formula).toContain('0.025')
    expect(NACE_SP0169.temperatureCorrection.formula).toContain('T − 25')
  })
})
