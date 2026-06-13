import { describe, it, expect } from 'vitest'
import { analyze, analyzeAsync, SEVERITY, CATEGORY, THRESHOLDS } from './engineeringAdvisorEngine.js'

const BASE = {
  soilResistivityOhmCm: 2000,
  pipelineLengthKm: 12,
  currentReqA: 8.4,
  groundbedResistanceOhm: 1.2,
  trRatedVoltage: 30,
  trMinVoltage: 18,
  cableDropV: 0.3,
  attenuationCoveragePct: 92,
  attenuationWorstPointMv: -900,
  designLifeYears: 28,
  targetDesignLifeYears: 25,
  pendingApprovalDays: 0,
}

describe('analyze() — shape and determinism', () => {
  it('returns the documented AnalysisResult shape', () => {
    const r = analyze(BASE)
    expect(r).toHaveProperty('recommendations')
    expect(r).toHaveProperty('score')
    expect(r).toHaveProperty('scoreLabel')
    expect(r).toHaveProperty('summary')
    expect(r).toHaveProperty('inputEcho')
    expect(Array.isArray(r.recommendations)).toBe(true)
    expect(typeof r.score).toBe('number')
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
  })

  it('is deterministic — same input gives same output', () => {
    expect(analyze(BASE)).toEqual(analyze(BASE))
  })

  it('handles null / undefined / non-object input safely', () => {
    expect(() => analyze(null)).not.toThrow()
    expect(() => analyze(undefined)).not.toThrow()
    expect(() => analyze('not an object')).not.toThrow()
    const r = analyze(null)
    expect(r.recommendations).toEqual([])
    expect(r.score).toBe(100)
  })

  it('skips misbehaving rules without throwing', () => {
    expect(() => analyze({ soilResistivityOhmCm: 'NaN' })).not.toThrow()
    expect(() => analyze({ attenuationWorstPointMv: Infinity })).not.toThrow()
  })

  it('returns the input echo', () => {
    const r = analyze(BASE)
    expect(r.inputEcho).toEqual(BASE)
  })
})

describe('analyze() — soil rules', () => {
  it('flags very high soil resistivity (warn)', () => {
    const r = analyze({ ...BASE, soilResistivityOhmCm: 60000 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('soil.very_high')
    const rec = r.recommendations.find(x => x.id === 'soil.very_high')
    expect(rec.severity).toBe(SEVERITY.WARN)
    expect(rec.category).toBe(CATEGORY.SOIL)
  })
  it('flags high (but not very high) soil resistivity (info)', () => {
    const r = analyze({ ...BASE, soilResistivityOhmCm: 12000 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('soil.high')
    expect(ids).not.toContain('soil.very_high')
  })
  it('celebrates very low soil resistivity (success)', () => {
    const r = analyze({ ...BASE, soilResistivityOhmCm: 300 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('soil.very_low')
  })
  it('suggests deepwell alternative for nominal-to-high soil', () => {
    const r = analyze({ ...BASE, soilResistivityOhmCm: 8000 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('soil.deepwell_alternative')
  })
})

describe('analyze() — pipeline length rules', () => {
  it('flags very long pipelines (warn)', () => {
    const r = analyze({ ...BASE, pipelineLengthKm: 150 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('pipeline.very_long')
  })
  it('flags long pipelines (info, not warn)', () => {
    const r = analyze({ ...BASE, pipelineLengthKm: 60 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('pipeline.long')
    expect(ids).not.toContain('pipeline.very_long')
  })
  it('informs on very short pipelines', () => {
    const r = analyze({ ...BASE, pipelineLengthKm: 0.3 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('pipeline.very_short')
  })
})

describe('analyze() — current requirement rules', () => {
  it('flags very high current (warn)', () => {
    const r = analyze({ ...BASE, currentReqA: 150 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('current.very_high')
  })
  it('flags high (but not very high) current (info)', () => {
    const r = analyze({ ...BASE, currentReqA: 60 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('current.high')
    expect(ids).not.toContain('current.very_high')
  })
  it('flags very low current (warn)', () => {
    const r = analyze({ ...BASE, currentReqA: 0.2 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('current.very_low')
  })
})

describe('analyze() — groundbed resistance rules', () => {
  it('celebrates unusually low R_G (success)', () => {
    const r = analyze({ ...BASE, groundbedResistanceOhm: 0.05 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('groundbed.unusually_low')
  })
  it('errors on R_G too high', () => {
    const r = analyze({ ...BASE, groundbedResistanceOhm: 15 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('groundbed.very_high')
  })
  it('warns on R_G above nominal but not extreme', () => {
    const r = analyze({ ...BASE, groundbedResistanceOhm: 7 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('groundbed.high')
    expect(ids).not.toContain('groundbed.very_high')
  })
  it('warns when R_G is missing', () => {
    const input = { ...BASE }
    delete input.groundbedResistanceOhm
    const out = analyze(input)
    expect(out.recommendations.map(x => x.id)).toContain('groundbed.missing')
  })
})

describe('analyze() — TR sizing rules', () => {
  it('errors on undersized TR (utilization < 30%)', () => {
    const r = analyze({ ...BASE, trMinVoltage: 6, trRatedVoltage: 30 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('tr.undersized')
  })
  it('warns on tight TR (utilization 30-55%)', () => {
    const r = analyze({ ...BASE, trMinVoltage: 12, trRatedVoltage: 30 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('tr.tight')
  })
  it('celebrates optimal TR (utilization 60-80%)', () => {
    const r = analyze({ ...BASE, trMinVoltage: 21, trRatedVoltage: 30 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('tr.optimal')
  })
  it('warns on oversized TR (utilization > 85%)', () => {
    const r = analyze({ ...BASE, trMinVoltage: 27, trRatedVoltage: 30 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('tr.oversized')
  })
})

describe('analyze() — cable drop rules', () => {
  it('warns on very high cable drop', () => {
    const r = analyze({ ...BASE, cableDropV: 1.5 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('cable.very_high_drop')
  })
  it('informs on high cable drop', () => {
    const r = analyze({ ...BASE, cableDropV: 0.7 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('cable.high_drop')
  })
  it('warns on oversized cable (very low drop)', () => {
    const r = analyze({ ...BASE, cableDropV: 0.05 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('cable.oversized')
  })
})

describe('analyze() — attenuation rules', () => {
  it('errors on inadequate coverage', () => {
    const r = analyze({ ...BASE, attenuationCoveragePct: 40 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('attenuation.inadequate')
  })
  it('warns on marginal coverage', () => {
    const r = analyze({ ...BASE, attenuationCoveragePct: 70 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('attenuation.marginal')
  })
  it('warns on marginal worst point', () => {
    const r = analyze({ ...BASE, attenuationWorstPointMv: -800 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('attenuation.worst_point_marginal')
  })
  it('errors on inadequate worst point', () => {
    const r = analyze({ ...BASE, attenuationWorstPointMv: -600 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('attenuation.worst_point_inadequate')
  })
  it('celebrates excellent worst point', () => {
    const r = analyze({ ...BASE, attenuationWorstPointMv: -1000 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('attenuation.excellent')
  })
  it('suggests additional attenuation review for long pipelines', () => {
    const r = analyze({ ...BASE, pipelineLengthKm: 80 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('attenuation.review_recommended')
  })
})

describe('analyze() — design life rules', () => {
  it('errors on undersized design life', () => {
    const r = analyze({ ...BASE, designLifeYears: 18, targetDesignLifeYears: 25 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('design_life.undersized')
  })
  it('warns on tight design life', () => {
    const r = analyze({ ...BASE, designLifeYears: 27, targetDesignLifeYears: 25 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('design_life.tight')
  })
  it('celebrates oversized design life', () => {
    const r = analyze({ ...BASE, designLifeYears: 50, targetDesignLifeYears: 25 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('design_life.can_be_increased')
  })
})

describe('analyze() — workflow rules', () => {
  it('informs on long-pending approval (> 7 days)', () => {
    const r = analyze({ ...BASE, pendingApprovalDays: 14 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('workflow.approval_pending')
  })
  it('suggests report export when ready', () => {
    const r = analyze({ ...BASE, designLifeYears: 30, attenuationCoveragePct: 95 })
    const ids = r.recommendations.map(x => x.id)
    expect(ids).toContain('workflow.export_report')
  })
})

describe('analyze() — score and sort', () => {
  it('sorts recommendations: errors first, then warn, info, success', () => {
    const r = analyze({
      ...BASE,
      groundbedResistanceOhm: 15,
      trMinVoltage: 6, trRatedVoltage: 30,
      pipelineLengthKm: 150,
      cableDropV: 1.5,
    })
    const sevs = r.recommendations.map(x => x.severity)
    const firstErr = sevs.indexOf('error')
    const firstSuc = sevs.indexOf('success')
    if (firstSuc !== -1 && firstErr !== -1) {
      expect(firstErr).toBeLessThan(firstSuc)
    }
  })
  it('score reflects severity mix (errors hurt more than warns)', () => {
    const errored = analyze({ ...BASE, groundbedResistanceOhm: 15 })
    const warned = analyze({ ...BASE, soilResistivityOhmCm: 60000 })
    expect(errored.score).toBeLessThan(warned.score)
  })
  it('score is clamped 0..100 for catastrophic input', () => {
    const r = analyze({
      soilResistivityOhmCm: 100000,
      pipelineLengthKm: 500,
      currentReqA: 500,
      groundbedResistanceOhm: 50,
      trMinVoltage: 0, trRatedVoltage: 30,
      cableDropV: 5,
      attenuationCoveragePct: 0,
      attenuationWorstPointMv: -200,
      designLifeYears: 5, targetDesignLifeYears: 25,
    })
    expect(r.score).toBe(0)
  })
})

describe('analyze() — summary', () => {
  it('builds a per-category summary', () => {
    const r = analyze({ ...BASE, groundbedResistanceOhm: 15 })
    expect(r.summary.groundbed).toBeDefined()
    expect(r.summary.groundbed.status).toBe('critical')
    expect(r.summary.groundbed.headline).toBeTruthy()
  })
  it('summary observed value is formatted per category', () => {
    const r = analyze({ ...BASE, soilResistivityOhmCm: 6000 })
    expect(r.summary.soil.observed).toMatch(/Ohm-cm/)
  })
})

describe('analyzeAsync()', () => {
  it('returns the rule-based result by default', async () => {
    const r = await analyzeAsync(BASE)
    expect(r.recommendations).toBeDefined()
    expect(r.score).toBeDefined()
  })
  it('matches analyze() when includeAI is false', async () => {
    const sync = analyze(BASE)
    const async1 = await analyzeAsync(BASE)
    const async2 = await analyzeAsync(BASE, { includeAI: false })
    expect(async1.recommendations).toEqual(sync.recommendations)
    expect(async2.recommendations).toEqual(sync.recommendations)
  })
  it('is forward-compatible — accepts includeAI flag without error', async () => {
    const r = await analyzeAsync(BASE, { includeAI: true })
    expect(r).toBeDefined()
  })
})

describe('constants', () => {
  it('SEVERITY has 4 entries', () => {
    expect(Object.keys(SEVERITY)).toHaveLength(4)
    expect(Object.values(SEVERITY).sort()).toEqual(['error', 'info', 'success', 'warn'])
  })
  it('CATEGORY has 9 entries', () => {
    expect(Object.keys(CATEGORY)).toHaveLength(9)
  })
  it('THRESHOLDS is frozen', () => {
    expect(Object.isFrozen(THRESHOLDS)).toBe(true)
  })
})
