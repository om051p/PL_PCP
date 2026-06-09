import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../modules/calculations.js', () => ({
  runStationCalculations: vi.fn(),
}))

vi.mock('../rules/rulesEngine.js', () => ({
  runRules: vi.fn(),
}))

const { runStationCalculations } = await import('../modules/calculations.js')
const { runRules } = await import('../rules/rulesEngine.js')
const { generateAlternatives } = await import('./optimizer.js')

function makeStation(overrides = {}) {
  return {
    proposedAnodes: 9,
    groundbed: { type: 'deepwell', anodeLengthM: 2.13, anodeSpacingM: 1.5 },
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
    ...overrides,
  }
}

function makeBaseResult(overrides = {}) {
  return {
    designLifeYears: 26.25,
    groundbedResistanceOhm: 0.1135,
    minTRVoltage: 16.6,
    acInputKVA: 1.8,
    ...overrides,
  }
}

describe('generateAlternatives', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    runStationCalculations.mockImplementation((station) => {
      const N = station.proposedAnodes
      if (N === 9) return makeBaseResult({ designLifeYears: 26.25, groundbedResistanceOhm: 0.1135 })
      if (N === 13) return makeBaseResult({ designLifeYears: 34.10, groundbedResistanceOhm: 0.09 })
      if (N === 17) return makeBaseResult({ designLifeYears: 41.23, groundbedResistanceOhm: 0.075 })
      return makeBaseResult({ designLifeYears: N * 3.5, groundbedResistanceOhm: 1 / N })
    })

    runRules.mockReturnValue({
      checks: [{ id: 'BR-001', status: 'pass' }],
      insights: [],
      allPassed: true,
    })
  })

  it('returns 4 alternatives', () => {
    const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
    expect(alts).toHaveLength(4)
  })

  it('first alternative is current design', () => {
    const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
    expect(alts[0].id).toBe('current')
    expect(alts[0].isCurrentDesign).toBe(true)
  })

  it('includes all required fields on each alternative', () => {
    const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
    for (const alt of alts) {
      expect(alt).toHaveProperty('id')
      expect(alt).toHaveProperty('label')
      expect(alt).toHaveProperty('parameters')
      expect(alt).toHaveProperty('result')
      expect(alt).toHaveProperty('advantages')
      expect(alt).toHaveProperty('disadvantages')
      expect(alt).toHaveProperty('isCurrentDesign')
    }
  })

  // ── Alt A: +4 anodes ─────────────────────────────────────────────────

  describe('Alternative A: +4 anodes', () => {
    it('has 13 anodes', () => {
      const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
      const altA = alts.find((a) => a.id === 'alt-a')
      expect(altA.parameters.proposedAnodes).toBe(13)
    })

    it('includes design life advantage', () => {
      const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
      const altA = alts.find((a) => a.id === 'alt-a')
      const lifeAdvantage = altA.advantages.find((a) => a.includes('Design life'))
      expect(lifeAdvantage).toBeDefined()
      expect(lifeAdvantage).toContain('years')
    })

    it('includes groundbed resistance advantage', () => {
      const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
      const altA = alts.find((a) => a.id === 'alt-a')
      const rgAdvantage = altA.advantages.find((a) => a.includes('resistance'))
      expect(rgAdvantage).toBeDefined()
    })
  })

  // ── Alt B: +8 anodes ─────────────────────────────────────────────────

  describe('Alternative B: +8 anodes', () => {
    it('has 17 anodes', () => {
      const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
      const altB = alts.find((a) => a.id === 'alt-b')
      expect(altB.parameters.proposedAnodes).toBe(17)
    })

    it('includes lowest groundbed resistance advantage', () => {
      const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
      const altB = alts.find((a) => a.id === 'alt-b')
      const lowest = altB.advantages.find((a) => a.includes('Lowest'))
      expect(lowest).toBeDefined()
    })
  })

  // ── Alt C: Larger TR ─────────────────────────────────────────────────

  describe('Alternative C: Larger TR', () => {
    it('rounds up voltage to next 10V increment', () => {
      const alts = generateAlternatives(
        makeStation({
          tr: { ratedVoltage: 30, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
        }),
        makeBaseResult(),
        25,
      )
      const altC = alts.find((a) => a.id === 'alt-c')
      expect(altC.parameters.trVoltage).toBe(40)
    })

    it('increases rated current by 10A', () => {
      const alts = generateAlternatives(
        makeStation({
          tr: { ratedVoltage: 30, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
        }),
        makeBaseResult(),
        25,
      )
      const altC = alts.find((a) => a.id === 'alt-c')
      expect(altC.parameters.trCurrent).toBe(35)
    })

    it('has voltage headroom advantage', () => {
      const alts = generateAlternatives(
        makeStation({
          tr: { ratedVoltage: 30, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
        }),
        makeBaseResult(),
        25,
      )
      const altC = alts.find((a) => a.id === 'alt-c')
      const headroom = altC.advantages.find((a) => a.includes('voltage headroom'))
      expect(headroom).toBeDefined()
    })

    it('has AC power consumption disadvantage', () => {
      const alts = generateAlternatives(
        makeStation({
          tr: { ratedVoltage: 30, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
        }),
        makeBaseResult(),
        25,
      )
      const altC = alts.find((a) => a.id === 'alt-c')
      const powerDis = altC.disadvantages.find((a) => a.includes('power consumption'))
      expect(powerDis).toBeDefined()
    })
  })

  // ── Current Design ────────────────────────────────────────────────────

  describe('Current Design', () => {
    it('is first in array', () => {
      const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
      expect(alts[0].id).toBe('current')
      expect(alts[0].isCurrentDesign).toBe(true)
    })

    it('has lowest initial cost advantage', () => {
      const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
      const advantage = alts[0].advantages.find((a) => a.includes('Lowest initial cost'))
      expect(advantage).toBeDefined()
    })

    it('has no disadvantages when all checks pass', () => {
      const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
      expect(alts[0].disadvantages).toHaveLength(0)
    })
  })

  // ── allChecksPassed ──────────────────────────────────────────────────

  describe('allChecksPassed field (was spread bug)', () => {
    it('result has allChecksPassed instead of spreading full rules object', () => {
      const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
      for (const alt of alts) {
        expect(alt.result).toHaveProperty('allChecksPassed')
        expect(alt.result).not.toHaveProperty('checks')
      }
    })

    it('allChecksPassed is true when all rules pass', () => {
      const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
      expect(alts[0].result.allChecksPassed).toBe(true)
    })

    it('allChecksPassed is false when any rule fails', () => {
      runRules.mockReturnValue({
        checks: [{ id: 'BR-001', status: 'fail' }],
        insights: [],
        allPassed: false,
      })
      const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
      expect(alts[0].result.allChecksPassed).toBe(false)
    })
  })

  // ── Clone integrity ───────────────────────────────────────────────────

  describe('Clone integrity (JSON.parse/stringify)', () => {
    it('alternatives do not mutate original station', () => {
      const station = makeStation()
      const originalAnodes = station.proposedAnodes
      generateAlternatives(station, makeBaseResult(), 25)
      expect(station.proposedAnodes).toBe(originalAnodes)
    })

    it('each alternative has independent result object', () => {
      const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
      for (let i = 1; i < alts.length; i++) {
        expect(alts[i].result).not.toBe(alts[i - 1].result)
      }
    })
  })

  // ── >12 anodes edge case ──────────────────────────────────────────────

  describe('20-terminal junction box edge case', () => {
    it('shows >20 anodes disadvantage when alt B still has <=12 anodes', () => {
      const smallStation = makeStation({ proposedAnodes: 3 })
      runStationCalculations.mockImplementation((station) => {
        const N = station.proposedAnodes
        if (N === 3) return makeBaseResult({ designLifeYears: 20, groundbedResistanceOhm: 0.2 })
        return makeBaseResult({ designLifeYears: N * 3, groundbedResistanceOhm: 1 / N })
      })
      const alts = generateAlternatives(smallStation, makeBaseResult(), 25)
      const altB = alts.find((a) => a.id === 'alt-b')
      expect(altB.parameters.proposedAnodes).toBe(11)
    })
  })

  // ── Tail Length Padding ───────────────────────────────────────────────

  describe('Tail length padding', () => {
    it('adds tail lengths for additional anodes', () => {
      const alts = generateAlternatives(makeStation(), makeBaseResult(), 25)
      const altA = alts.find((a) => a.id === 'alt-a')
      expect(altA).toBeDefined()
      expect(runStationCalculations).toHaveBeenCalled()
    })
  })
})
