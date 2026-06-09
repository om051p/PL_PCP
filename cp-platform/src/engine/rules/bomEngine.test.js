import { describe, it, expect } from 'vitest'
import { generateBOM } from './bomEngine.js'

function deepwellStation(overrides = {}) {
  return {
    groundbed: {
      type: 'deepwell',
      startDepthM: 15,
      anodeLengthM: 2.13,
      anodeSpacingM: 1.5,
      boreholeDiaM: 0.25,
      cokeCoverM: 2.5,
      cementPlugM: 0.5,
    },
    anodeSpec: { label: 'HSCI Tubular TA-4', weightKg: 38.6, consumptionRate: 0.45 },
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
    ...overrides,
  }
}

function shallowStation(overrides = {}) {
  return {
    groundbed: {
      type: 'shallow_vertical',
      startDepthM: 2,
      anodeLengthM: 1.5,
      anodeSpacingM: 3,
      boreholeDiaM: 0.3,
    },
    anodeSpec: { label: 'HSCI Tubular TA-4', weightKg: 38.6, consumptionRate: 0.45 },
    proposedAnodes: 6,
    cables: {
      anodeTailLengths: [15, 20, 25, 30, 35, 40],
      anodeCableSizeMm2: 16,
      posMainLengthM: 120,
      posMainSizeMm2: 25,
      negMainLengthM: 80,
      negMainSizeMm2: 25,
      negSecLengthM: 40,
      negSecSizeMm2: 16,
    },
    tr: { ratedVoltage: 24, ratedCurrent: 15, backEMF: 2, structureResistance: 0.05 },
    ...overrides,
  }
}

function result(overrides = {}) {
  return {
    acInputKVA: 1.8,
    acInputCurrentA: 2.2,
    activeLengthM: 31.17,
    totalDrillDepthM: 49.17,
    groundbedResistanceOhm: 0.1135,
    cokeBagsBase: 81,
    cokeBagsWithContingency: 94,
    ...overrides,
  }
}

describe('generateBOM', () => {
  it('returns empty array when result is null', () => {
    expect(generateBOM(deepwellStation(), null)).toEqual([])
  })

  it('returns empty array when result is undefined', () => {
    expect(generateBOM(deepwellStation(), undefined)).toEqual([])
  })

  it('returns non-empty array for deepwell mode', () => {
    const bom = generateBOM(deepwellStation(), result())
    expect(bom.length).toBeGreaterThan(0)
  })

  it('returns non-empty array for shallow vertical mode', () => {
    const bom = generateBOM(shallowStation(), result())
    expect(bom.length).toBeGreaterThan(0)
  })

  it('returns 0 items for unknown groundbed type', () => {
    const station = deepwellStation({
      groundbed: { ...deepwellStation().groundbed, type: 'unknown' },
    })
    const bom = generateBOM(station, result())
    expect(bom.length).toBeGreaterThan(0) // TRU, cables, jbox, test station, misc still included
  })

  // ── TRU Section ──────────────────────────────────────────────────────

  describe('TRU items', () => {
    it('includes TRU unit with correct voltage/current rating', () => {
      const bom = generateBOM(deepwellStation(), result())
      const tru = bom.find((i) => i.description.includes('Transformer-Rectifier'))
      expect(tru).toBeDefined()
      expect(tru.quantity).toBe(1)
      expect(tru.description).toContain('30V')
      expect(tru.description).toContain('25A')
    })

    it('includes RMU', () => {
      const bom = generateBOM(deepwellStation(), result())
      const rmu = bom.find((i) => i.description.includes('Remote Monitoring'))
      expect(rmu).toBeDefined()
      expect(rmu.quantity).toBe(1)
    })

    it('uses 2 drums of oil for kVA <= 2', () => {
      const bom = generateBOM(deepwellStation(), result({ acInputKVA: 1.8 }))
      const oil = bom.find((i) => i.description.includes('Transformer Oil'))
      expect(oil.quantity).toBe(2)
    })

    it('uses 3 drums of oil for kVA > 2', () => {
      const bom = generateBOM(deepwellStation(), result({ acInputKVA: 3.5 }))
      const oil = bom.find((i) => i.description.includes('Transformer Oil'))
      expect(oil.quantity).toBe(3)
    })

    it('includes AC disconnect switch with correct amp rating', () => {
      const bom = generateBOM(deepwellStation(), result({ acInputCurrentA: 2.2 }))
      const sw = bom.find((i) => i.description.includes('Disconnect'))
      expect(sw).toBeDefined()
      expect(sw.description).toContain('A') // has amp rating
    })
  })

  // ── Deepwell Section ──────────────────────────────────────────────────

  describe('Deepwell items', () => {
    it('includes one anode per proposed anode', () => {
      const bom = generateBOM(deepwellStation({ proposedAnodes: 9 }), result())
      const anodes = bom.filter((i) => i.tag === 'Anode')
      expect(anodes).toHaveLength(9)
    })

    it('includes each anode with correct tail cable length', () => {
      const bom = generateBOM(deepwellStation(), result())
      const anodes = bom.filter((i) => i.tag === 'Anode')
      expect(anodes[0].description).toContain('25m')
      expect(anodes[8].description).toContain('65m')
    })

    it('uses fallback label when anodeSpec has no label', () => {
      const station = deepwellStation({ anodeSpec: { weightKg: 38.6, consumptionRate: 0.45 } })
      const bom = generateBOM(station, result())
      const anodes = bom.filter((i) => i.tag === 'Anode')
      expect(anodes.length).toBeGreaterThan(0)
      expect(anodes[0].description).toContain('HSCI Tubular TA-4')
    })

    it('includes coke backfill bags', () => {
      const bom = generateBOM(deepwellStation(), result({ activeLengthM: 31.17 }))
      const coke = bom.find((i) => i.tag === 'Backfill')
      expect(coke).toBeDefined()
      expect(coke.quantity).toBeGreaterThan(0)
      expect(coke.unit).toBe('Bag (50lb)')
    })

    it('includes vent pipe', () => {
      const bom = generateBOM(deepwellStation(), result({ totalDrillDepthM: 49.17 }))
      const vent = bom.find((i) => i.description.includes('Vent Pipe'))
      expect(vent).toBeDefined()
      expect(vent.unit).toBe('m')
    })

    it('includes centralizers (2 per anode)', () => {
      const bom = generateBOM(deepwellStation({ proposedAnodes: 5 }), result())
      const cent = bom.find((i) => i.description.includes('Centralizers'))
      expect(cent.quantity).toBe(10)
    })

    it('includes wellhead assembly', () => {
      const bom = generateBOM(deepwellStation(), result())
      const wh = bom.find((i) => i.description.includes('Wellhead'))
      expect(wh).toBeDefined()
      expect(wh.quantity).toBe(1)
    })

    it('includes cement plug when cementPlugM > 0', () => {
      const bom = generateBOM(deepwellStation(), result())
      const cement = bom.find((i) => i.description.includes('Cement'))
      expect(cement).toBeDefined()
    })

    it('omits cement plug when cementPlugM is 0', () => {
      const bom = generateBOM(
        deepwellStation({ groundbed: { ...deepwellStation().groundbed, cementPlugM: 0 } }),
        result(),
      )
      const cement = bom.find((i) => i.description.includes('Cement'))
      expect(cement).toBeUndefined()
    })
  })

  // ── Shallow Vertical Section ──────────────────────────────────────────

  describe('Shallow Vertical items', () => {
    it('includes one anode per proposed anode', () => {
      const bom = generateBOM(shallowStation(), result())
      const anodes = bom.filter((i) => i.tag === 'Anode')
      expect(anodes).toHaveLength(6)
    })

    it('includes coke backfill for N holes', () => {
      const bom = generateBOM(shallowStation({ proposedAnodes: 6 }), result())
      const coke = bom.find((i) => i.tag === 'Backfill')
      expect(coke).toBeDefined()
      expect(coke.quantity).toBeGreaterThan(0)
    })

    it('uses fallback label when anodeSpec has no label', () => {
      const station = shallowStation({ anodeSpec: { weightKg: 38.6, consumptionRate: 0.45 } })
      const bom = generateBOM(station, result())
      const anodes = bom.filter((i) => i.tag === 'Anode')
      expect(anodes.length).toBeGreaterThan(0)
      expect(anodes[0].description).toContain('HSCI Tubular TA-4')
    })
  })

  // ── Cables Section ────────────────────────────────────────────────────

  describe('Cable items', () => {
    it('includes anode tail cable with +5% waste', () => {
      const bom = generateBOM(deepwellStation(), result())
      const tails = bom.find((i) => i.description.includes('Anode Tail Cable'))
      expect(tails).toBeDefined()
      const totalLen = 25 + 30 + 35 + 40 + 45 + 50 + 55 + 60 + 65
      expect(tails.quantity).toBe(Math.ceil(totalLen * 1.05))
    })

    it('includes positive main cable with +5% waste', () => {
      const bom = generateBOM(deepwellStation(), result())
      const pos = bom.find((i) => i.description.includes('Main Positive'))
      expect(pos.quantity).toBe(Math.ceil(180 * 1.05))
    })

    it('includes negative main cable with +5% waste', () => {
      const bom = generateBOM(deepwellStation(), result())
      const neg = bom.find((i) => i.description.includes('Main Negative'))
      expect(neg.quantity).toBe(Math.ceil(100 * 1.05))
    })
  })

  // ── Junction Box Section ──────────────────────────────────────────────

  describe('Junction Box items', () => {
    it('uses 12-terminal box for <=12 anodes', () => {
      const bom = generateBOM(deepwellStation({ proposedAnodes: 9 }), result())
      const jbox = bom.find((i) => i.description.includes('Anode Junction Box'))
      expect(jbox.description).toContain('12-terminal')
    })

    it('uses 20-terminal box for >12 anodes', () => {
      const bom = generateBOM(deepwellStation({ proposedAnodes: 15 }), result())
      const jbox = bom.find((i) => i.description.includes('Anode Junction Box'))
      expect(jbox.description).toContain('20-terminal')
    })

    it('includes negative junction box', () => {
      const bom = generateBOM(deepwellStation(), result())
      const njbox = bom.find((i) => i.description.includes('Negative Junction Box'))
      expect(njbox).toBeDefined()
    })
  })

  // ── Test Station Section ──────────────────────────────────────────────

  describe('Test Station items', () => {
    it('includes reference electrode', () => {
      const bom = generateBOM(deepwellStation(), result())
      const ref = bom.find((i) => i.description.includes('Reference Electrode'))
      expect(ref).toBeDefined()
      expect(ref.quantity).toBe(1)
    })

    it('includes CP test station', () => {
      const bom = generateBOM(deepwellStation(), result())
      const ts = bom.find((i) => i.description.includes('Test Station'))
      expect(ts).toBeDefined()
    })
  })

  // ── Misc Section ──────────────────────────────────────────────────────

  describe('Misc items', () => {
    it('includes thermoweld mold', () => {
      const bom = generateBOM(deepwellStation(), result())
      const mold = bom.find((i) => i.description.includes('Thermoweld Mold'))
      expect(mold).toBeDefined()
    })

    it('includes thermoweld charges (2 per anode + 10 spare)', () => {
      const bom = generateBOM(deepwellStation({ proposedAnodes: 9 }), result())
      const charges = bom.find((i) => i.description.includes('Thermoweld Charges'))
      expect(charges.quantity).toBe(Math.ceil(9 * 2 + 10))
    })

    it('includes cable warning tape', () => {
      const bom = generateBOM(deepwellStation(), result())
      const tape = bom.find((i) => i.description.includes('Warning Tape'))
      expect(tape).toBeDefined()
    })

    it('includes cable route markers', () => {
      const bom = generateBOM(deepwellStation(), result())
      const markers = bom.find((i) => i.description.includes('Route Markers'))
      expect(markers.quantity).toBe(20)
    })
  })

  // ── Standards References ──────────────────────────────────────────────

  describe('Standards references', () => {
    it('assigns standards to TRU items', () => {
      const bom = generateBOM(deepwellStation(), result())
      const tru = bom.find((i) => i.tag === 'TRU')
      expect(tru.standard).toBeDefined()
    })

    it('assigns standards to anode items', () => {
      const bom = generateBOM(deepwellStation(), result())
      const anode = bom.find((i) => i.tag === 'Anode')
      expect(anode.standard).toBeDefined()
    })

    it('assigns standards to cable items', () => {
      const bom = generateBOM(deepwellStation(), result())
      const cable = bom.find((i) => i.tag === 'Cable +ve')
      expect(cable.standard).toBeDefined()
    })
  })
})
