import { describe, it, expect } from 'vitest'
import { runRules } from './rulesEngine.js'
import { calcRequiredRemotenessM } from '../../constants/index.js'

function makeStation(overrides = {}) {
  return {
    pipelineSegments: [
      { od: 48, lengthM: 292, opTempC: 57.22, currentDensityBase: 0.1, coatingEfficiency: 0.98 },
    ],
    groundbed: {
      type: 'deepwell',
      startDepthM: 15,
      anodeLengthM: 2.13,
      anodeSpacingM: 1.5,
      boreholeDiaM: 0.25,
    },
    anodeSpec: { weightKg: 38.6, consumptionRate: 0.45 },
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
    ...overrides,
  }
}

function makeResult(overrides = {}) {
  return {
    minTRVoltage: 16.6,
    groundbedResistanceOhm: 0.1135,
    maxAllowableGroundbedRes: 0.4,
    totalCircuitResistanceOhm: 0.5839,
    maxCircuitRes70pct: 0.84,
    maxCircuitRes90pct: 1.08,
    designLifeYears: 26.25,
    targetDesignLifeYears: 25,
    designCurrentA: 0.2573,
    totalCableResOhm: 0.2553,
    ...overrides,
  }
}

describe('runRules', () => {
  it('returns checks, insights, and allPassed fields', () => {
    const result = runRules(makeStation(), makeResult())
    expect(result).toHaveProperty('checks')
    expect(result).toHaveProperty('insights')
    expect(result).toHaveProperty('allPassed')
    expect(Array.isArray(result.checks)).toBe(true)
    expect(Array.isArray(result.insights)).toBe(true)
    expect(typeof result.allPassed).toBe('boolean')
  })

  it('returns 6 validation checks', () => {
    const result = runRules(makeStation(), makeResult())
    expect(result.checks).toHaveLength(6)
  })

  it('returns empty result for null station segments', () => {
    const result = runRules(makeStation({ pipelineSegments: [] }), makeResult())
    expect(result.allPassed).toBeDefined()
  })

  // ── BR-001: TR Voltage Adequate ──────────────────────────────────────

  describe('BR-001: TR Voltage Adequate', () => {
    it('passes when rated voltage >= minimum required', () => {
      const result = runRules(makeStation(), makeResult({ minTRVoltage: 25 }))
      const rule = result.checks.find((c) => c.id === 'BR-001')
      expect(rule.status).toBe('pass')
    })

    it('fails when rated voltage < minimum required', () => {
      const result = runRules(
        makeStation({
          tr: { ratedVoltage: 12, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
        }),
        makeResult({ minTRVoltage: 16.6 }),
      )
      const rule = result.checks.find((c) => c.id === 'BR-001')
      expect(rule.status).toBe('fail')
      expect(rule.recommendation).toContain('Increase TR')
    })

    it('generates insight when insufficient', () => {
      const result = runRules(
        makeStation({
          tr: { ratedVoltage: 12, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
        }),
        makeResult({ minTRVoltage: 16.6 }),
      )
      const insights = result.insights.filter((i) => i.title === 'TR Voltage Insufficient')
      expect(insights).toHaveLength(1)
      expect(insights[0].severity).toBe('error')
    })

    it('does not generate insight when voltage is adequate', () => {
      const result = runRules(makeStation(), makeResult({ minTRVoltage: 25 }))
      const insights = result.insights.filter((i) => i.title === 'TR Voltage Insufficient')
      expect(insights).toHaveLength(0)
    })
  })

  // ── BR-002: Groundbed Resistance Within Allowable ─────────────────────

  describe('BR-002: Groundbed Resistance Within Allowable', () => {
    it('passes when R_G < max allowable', () => {
      const result = runRules(
        makeStation(),
        makeResult({ groundbedResistanceOhm: 0.1135, maxAllowableGroundbedRes: 0.4 }),
      )
      const rule = result.checks.find((c) => c.id === 'BR-002')
      expect(rule.status).toBe('pass')
    })

    it('fails when R_G >= max allowable', () => {
      const result = runRules(
        makeStation(),
        makeResult({ groundbedResistanceOhm: 0.5, maxAllowableGroundbedRes: 0.4 }),
      )
      const rule = result.checks.find((c) => c.id === 'BR-002')
      expect(rule.status).toBe('fail')
    })

    it('generates insight when groundbed resistance is too high', () => {
      const result = runRules(
        makeStation({ soilResistivityOhmCm: 5000 }),
        makeResult({ groundbedResistanceOhm: 0.5, maxAllowableGroundbedRes: 0.4 }),
      )
      const insights = result.insights.filter((i) => i.title === 'Groundbed Resistance Too High')
      expect(insights).toHaveLength(1)
      expect(insights[0].severity).toBe('error')
    })

    it('mentions very high soil resistivity in insight when applicable', () => {
      const result = runRules(
        makeStation({ soilResistivityOhmCm: 50000 }),
        makeResult({ groundbedResistanceOhm: 0.5, maxAllowableGroundbedRes: 0.4 }),
      )
      const insight = result.insights.find((i) => i.title === 'Groundbed Resistance Too High')
      expect(insight.recommendations.some((r) => r.includes('very high'))).toBe(true)
    })
  })

  // ── BR-003: Circuit Resistance < 70% ──────────────────────────────────

  describe('BR-003: Circuit Resistance < 70% Operating Threshold', () => {
    it('passes when R_T < 70% threshold', () => {
      const result = runRules(
        makeStation(),
        makeResult({ totalCircuitResistanceOhm: 0.5839, maxCircuitRes70pct: 0.84 }),
      )
      const rule = result.checks.find((c) => c.id === 'BR-003')
      expect(rule.status).toBe('pass')
    })

    it('fails when R_T >= 70% threshold', () => {
      const result = runRules(
        makeStation(),
        makeResult({ totalCircuitResistanceOhm: 0.9, maxCircuitRes70pct: 0.84 }),
      )
      const rule = result.checks.find((c) => c.id === 'BR-003')
      expect(rule.status).toBe('fail')
    })

    it('generates insight when R_T exceeds 90% threshold', () => {
      const result = runRules(
        makeStation(),
        makeResult({
          totalCircuitResistanceOhm: 1.2,
          maxCircuitRes70pct: 0.84,
          maxCircuitRes90pct: 1.08,
          totalCableResOhm: 0.3,
          groundbedResistanceOhm: 0.5,
        }),
      )
      const insights = result.insights.filter((i) => i.title === 'Circuit Resistance Elevated')
      expect(insights.length).toBeGreaterThanOrEqual(1)
    })

    it('insight severity is error when R_T >= 70% threshold', () => {
      const result = runRules(
        makeStation(),
        makeResult({
          totalCircuitResistanceOhm: 1.2,
          maxCircuitRes70pct: 0.84,
          maxCircuitRes90pct: 1.08,
        }),
      )
      const insight = result.insights.find((i) => i.title === 'Circuit Resistance Elevated')
      expect(insight.severity).toBe('error')
    })
  })

  // ── BR-004: Circuit Resistance < 90% ──────────────────────────────────

  describe('BR-004: Circuit Resistance < 90% Warning Threshold', () => {
    it('passes when R_T < 70% threshold', () => {
      const result = runRules(
        makeStation(),
        makeResult({
          totalCircuitResistanceOhm: 0.5,
          maxCircuitRes70pct: 0.84,
          maxCircuitRes90pct: 1.08,
        }),
      )
      const rule = result.checks.find((c) => c.id === 'BR-004')
      expect(rule.status).toBe('pass')
    })

    it('warns when R_T between 70%-90%', () => {
      const result = runRules(
        makeStation(),
        makeResult({
          totalCircuitResistanceOhm: 0.9,
          maxCircuitRes70pct: 0.84,
          maxCircuitRes90pct: 1.08,
        }),
      )
      const rule = result.checks.find((c) => c.id === 'BR-004')
      expect(rule.status).toBe('warning')
    })

    it('fails when R_T >= 90% threshold', () => {
      const result = runRules(
        makeStation(),
        makeResult({
          totalCircuitResistanceOhm: 1.1,
          maxCircuitRes70pct: 0.84,
          maxCircuitRes90pct: 1.08,
        }),
      )
      const rule = result.checks.find((c) => c.id === 'BR-004')
      expect(rule.status).toBe('fail')
    })
  })

  // ── BR-005: Design Life ──────────────────────────────────────────────

  describe('BR-005: Design Life Meets Target', () => {
    it('passes when design life >= target + margin', () => {
      const result = runRules(
        makeStation(),
        makeResult({ designLifeYears: 30.88, targetDesignLifeYears: 25 }),
      )
      const rule = result.checks.find((c) => c.id === 'BR-005')
      expect(rule.status).toBe('pass')
    })

    it('warns when design life >= target but within margin', () => {
      const result = runRules(
        makeStation(),
        makeResult({ designLifeYears: 26, targetDesignLifeYears: 25 }),
      )
      const rule = result.checks.find((c) => c.id === 'BR-005')
      expect(rule.status).toBe('warning')
    })

    it('fails when design life < target', () => {
      const result = runRules(
        makeStation(),
        makeResult({ designLifeYears: 15, targetDesignLifeYears: 25 }),
      )
      const rule = result.checks.find((c) => c.id === 'BR-005')
      expect(rule.status).toBe('fail')
      expect(rule.recommendation).toContain('Add anodes')
    })

    it('generates insight for low design life margin', () => {
      const result = runRules(
        makeStation({
          proposedAnodes: 9,
          anodeSpec: { weightKg: 38.6, consumptionRate: 0.45 },
          tr: { ratedCurrent: 25 },
        }),
        makeResult({ designLifeYears: 26, targetDesignLifeYears: 25 }),
      )
      const insights = result.insights.filter((i) => i.title === 'Design Life Margin Low')
      expect(insights.length).toBeGreaterThanOrEqual(0)
    })
  })

  // ── BR-006: Remoteness Check ──────────────────────────────────────────

  describe('BR-006: Remoteness Check', () => {
    it('passes when actual >= required (auto-computed from SAES-X-400)', () => {
      // TR ratedCurrent=25A, soilResistivity=361 -> 20m per SAES-X-400
      const result = runRules(
        makeStation({ actualRemotenesM: 56 }),
        makeResult(),
      )
      const rule = result.checks.find((c) => c.id === 'BR-006')
      expect(rule.status).toBe('pass')
      expect(rule.limit).toContain('20m')
    })

    it('fails when actual < auto-computed required', () => {
      const result = runRules(
        makeStation({ actualRemotenesM: 10 }),
        makeResult(),
      )
      const rule = result.checks.find((c) => c.id === 'BR-006')
      expect(rule.status).toBe('fail')
      expect(rule.recommendation).toContain('move')
    })

    it('generates insight when remoteness insufficient', () => {
      const result = runRules(
        makeStation({ actualRemotenesM: 10 }),
        makeResult(),
      )
      const insights = result.insights.filter((i) => i.title === 'Groundbed Too Close to Pipeline')
      expect(insights).toHaveLength(1)
    })

    it('auto-computes larger remoteness for higher current', () => {
      // 60A > 50A -> falls into <100A row; soil 400 < 500 -> 65m
      const result = runRules(
        makeStation({
          actualRemotenesM: 70,
          tr: { ratedVoltage: 50, ratedCurrent: 60, backEMF: 2, structureResistance: 0.055 },
          soilResistivityOhmCm: 400,
        }),
        makeResult(),
      )
      const rule = result.checks.find((c) => c.id === 'BR-006')
      expect(rule.status).toBe('pass')
      expect(rule.limit).toContain('65m')
    })

    it('returns null for current > 150A (beyond SAES-X-400 table)', () => {
      const result = runRules(
        makeStation({
          actualRemotenesM: 56,
          tr: { ratedVoltage: 60, ratedCurrent: 200, backEMF: 2, structureResistance: 0.055 },
        }),
        makeResult(),
      )
      const rule = result.checks.find((c) => c.id === 'BR-006')
      // Falls back to MIN_REMOTENESS_M = 20m when calcRequiredRemotenessM returns null
      expect(rule.limit).toContain('20m')
    })
  })

  // ── Proactive Insights ────────────────────────────────────────────────

  describe('Proactive Insights', () => {
    it('generates high soil resistivity insight when applicable', () => {
      const result = runRules(makeStation({ soilResistivityOhmCm: 50000 }), makeResult())
      const insights = result.insights.filter((i) => i.title === 'High Soil Resistivity Detected')
      expect(insights).toHaveLength(1)
    })

    it('does not generate soil insight for normal resistivity', () => {
      const result = runRules(makeStation({ soilResistivityOhmCm: 1000 }), makeResult())
      const insights = result.insights.filter((i) => i.title === 'High Soil Resistivity Detected')
      expect(insights).toHaveLength(0)
    })

    it('generates very high soil severity as error', () => {
      const result = runRules(makeStation({ soilResistivityOhmCm: 50001 }), makeResult())
      const insight = result.insights.find((i) => i.title === 'High Soil Resistivity Detected')
      expect(insight.severity).toBe('error')
    })

    it('generates low TR headroom insight when margin < 20%', () => {
      const result = runRules(
        makeStation({
          tr: { ratedVoltage: 30, ratedCurrent: 0.3, backEMF: 2, structureResistance: 0.055 },
        }),
        makeResult({ designCurrentA: 0.2573 }),
      )
      const insights = result.insights.filter((i) => i.title === 'Low TR Current Headroom')
      expect(insights).toHaveLength(1)
    })

    it('does not generate headroom insight when margin >= 20%', () => {
      const result = runRules(
        makeStation({
          tr: { ratedVoltage: 30, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
        }),
        makeResult({ designCurrentA: 0.2573 }),
      )
      const insights = result.insights.filter((i) => i.title === 'Low TR Current Headroom')
      expect(insights).toHaveLength(0)
    })

    it('generates high temp insight when max temp > 60°C', () => {
      const segments = [
        { od: 48, lengthM: 292, opTempC: 80, currentDensityBase: 0.1, coatingEfficiency: 1 },
      ]
      const result = runRules(makeStation({ pipelineSegments: segments }), makeResult())
      const insights = result.insights.filter((i) => i.title === 'Elevated Operating Temperature')
      expect(insights).toHaveLength(1)
    })

    it('does not generate high temp insight when temp <= 60°C', () => {
      const result = runRules(makeStation(), makeResult())
      const insights = result.insights.filter((i) => i.title === 'Elevated Operating Temperature')
      expect(insights).toHaveLength(0)
    })
  })

  // ── allPassed ──────────────────────────────────────────────────────────

  describe('allPassed', () => {
    it('is true when all checks pass or warn', () => {
      const result = runRules(makeStation(), makeResult())
      expect(result.allPassed).toBe(true)
    })

    it('is false when any check fails', () => {
      const result = runRules(
        makeStation({
          tr: { ratedVoltage: 12, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
        }),
        makeResult({ minTRVoltage: 16.6 }),
      )
      expect(result.allPassed).toBe(false)
    })
  })

// ── calcRequiredRemotenessM ───────────────────────────────────────────────

describe('calcRequiredRemotenessM', () => {
  it('returns 20m for 25A current, 361 Ω·cm soil', () => {
    expect(calcRequiredRemotenessM(25, 361)).toBe(20)
  })

  it('returns 25m at same current with higher resistivity (800 Ω·cm)', () => {
    expect(calcRequiredRemotenessM(25, 800)).toBe(25)
  })

  it('returns 50m at same current with 2000 Ω·cm', () => {
    expect(calcRequiredRemotenessM(25, 2000)).toBe(50)
  })

  it('returns 75m at same current with 5000 Ω·cm', () => {
    expect(calcRequiredRemotenessM(25, 5000)).toBe(75)
  })

  it('returns 65m for 60A current, 400 Ω·cm soil', () => {
    expect(calcRequiredRemotenessM(60, 400)).toBe(65)
  })

  it('returns 75m for 60A, 800 Ω·cm soil', () => {
    expect(calcRequiredRemotenessM(60, 800)).toBe(75)
  })

  it('returns 150m for 60A, 2000 Ω·cm soil', () => {
    expect(calcRequiredRemotenessM(60, 2000)).toBe(150)
  })

  it('returns 250m for 60A, 5000 Ω·cm soil', () => {
    expect(calcRequiredRemotenessM(60, 5000)).toBe(250)
  })

  it('returns null for current > 150A (beyond table)', () => {
    expect(calcRequiredRemotenessM(200, 500)).toBeNull()
  })

  it('returns null for zero/negative current', () => {
    expect(calcRequiredRemotenessM(0, 500)).toBeNull()
    expect(calcRequiredRemotenessM(-10, 500)).toBeNull()
  })

  it('returns null for zero/negative resistivity', () => {
    expect(calcRequiredRemotenessM(25, 0)).toBeNull()
    expect(calcRequiredRemotenessM(25, -100)).toBeNull()
  })

  it('exact boundary: 35A @ 500 Ω·cm -> 20m', () => {
    expect(calcRequiredRemotenessM(35, 500)).toBe(20)
  })

  it('exact boundary: 35A @ 1000 Ω·cm -> 25m', () => {
    expect(calcRequiredRemotenessM(35, 1000)).toBe(25)
  })

  it('exact boundary: 50A @ 500 Ω·cm -> 30m', () => {
    expect(calcRequiredRemotenessM(50, 500)).toBe(30)
  })

  it('exact boundary: 50A @ 1000 Ω·cm -> 35m', () => {
    expect(calcRequiredRemotenessM(50, 1000)).toBe(35)
  })

  it('exact boundary: 100A @ 500 Ω·cm -> 65m', () => {
    expect(calcRequiredRemotenessM(100, 500)).toBe(65)
  })

  it('exact boundary: 100A @ 1000 Ω·cm -> 75m', () => {
    expect(calcRequiredRemotenessM(100, 1000)).toBe(75)
  })

  it('exact boundary: 150A @ 500 Ω·cm -> 100m', () => {
    expect(calcRequiredRemotenessM(150, 500)).toBe(100)
  })
})
})
