import { describe, it, expect, vi, beforeEach } from 'vitest'

let uuidCounter = 0
vi.mock('uuid', () => ({
  v4: vi.fn(() => {
    uuidCounter++
    return `mock-uuid-${String(uuidCounter).padStart(4, '0')}`
  }),
}))

const { useProjectStore, makeDefaultProject } = await import('./projectStore.js')

describe('Tank and Vessel Calculations Engine', () => {
  beforeEach(() => {
    uuidCounter = 0
    const storeData = {}
    const mockStorage = {
      getItem: vi.fn((key) => storeData[key] ?? null),
      setItem: vi.fn((key, value) => {
        storeData[key] = value
      }),
      removeItem: vi.fn((key) => {
        delete storeData[key]
      }),
    }
    vi.stubGlobal('localStorage', mockStorage)
    const defaultProj = makeDefaultProject()
    useProjectStore.setState({
      projects: [defaultProj],
      activeProjectId: defaultProj.id,
      activeStationId: defaultProj.stations[0].id,
      ui: { sidebarCollapsed: false, theme: 'light' },
    })
  })

  describe('runTankCalculations', () => {
    it('calculates concentric ring MMO grid correctly', () => {
      const store = useProjectStore.getState()
      store.updateTankParameters({
        diameter: 30, // radius = 15m
        currentDensity: 15, // 15 mA/m2
        anodeSpacing: 1.5,
        layoutType: 'concentric',
        anodeRating: 17,
      })

      store.runTankCalculations()

      const project = store.getProject()
      const calc = project.tank.lastCalcResult

      expect(calc).toBeTruthy()
      expect(calc.bottomArea).toBeCloseTo(Math.PI * 15 * 15, 2) // ~706.86 m2
      expect(calc.reqCurrent).toBeCloseTo((Math.PI * 15 * 15 * 15) / 1000, 2) // ~10.60 A
      expect(calc.designCurrent).toBeCloseTo(calc.reqCurrent * 1.3, 2) // ~13.78 A

      // Concentric rings layout rings: 1.5, 3.0, 4.5, 6.0, 7.5, 9.0, 10.5, 12.0, 13.5, 15.0
      // Spacings sum is: 2 * Math.PI * (1.5 + 3 + ... + 15.0) = 2 * Math.PI * 82.5 = 518.36m
      expect(calc.rings).toHaveLength(10)
      expect(calc.geomLength).toBeCloseTo(518.36, 1)

      // Sunde Grid Resistance formula check:
      // r = 0.004 m, W = 30 m, d = 0.1 m, soilResistivityOhmM = 3.61 Ohm-m
      // resistance = (soilResistivityOhmM / (2 * pi * finalLength)) * (ln(4L/r) + L/W * ln(W/d) - 1)
      const expectedResistance = (3.61 / (2 * Math.PI * calc.finalLength)) * 
        (Math.log((4 * calc.finalLength) / 0.004) + (calc.finalLength / 30) * Math.log(30 / 0.1) - 1)
      expect(calc.resistance).toBeCloseTo(expectedResistance, 4)

      // DC Voltage = designCurrent * resistance + 2.0
      expect(calc.dcVoltage).toBeCloseTo(calc.designCurrent * calc.resistance + 2.0, 2)
      expect(project.tank.status).toBe('calculated')
    })

    it('calculates parallel grid MMO layout correctly', () => {
      const store = useProjectStore.getState()
      store.updateTankParameters({
        diameter: 20, // radius = 10m
        currentDensity: 20,
        anodeSpacing: 2.0,
        layoutType: 'grid',
        anodeRating: 34,
      })

      store.runTankCalculations()

      const calc = store.getProject().tank.lastCalcResult
      expect(calc).toBeTruthy()
      expect(calc.gridLines).toHaveLength(11) // 0, +/-2, +/-4, +/-6, +/-8, +/-10
      expect(calc.resistance).toBeGreaterThan(0)
    })
  })

  describe('runVesselCalculations', () => {
    it('calculates vessel sacrificial CP with polarized driving voltage (default)', () => {
      const store = useProjectStore.getState()
      store.updateVesselParameters({
        length: 8.0,
        diameter: 2.4,
        currentDensity: 30,
        anodeType: 'al_zn_in',
        anodeQty: 6,
        electrolyteResistivity: 80, // 0.8 Ohm-m
        drivingVoltageMode: 'polarized',
      })

      store.runVesselCalculations()

      const project = store.getProject()
      const calc = project.vessel.lastCalcResult

      expect(calc).toBeTruthy()
      expect(calc.totalArea).toBeCloseTo(Math.PI * 2.4 * 8.0 + 2 * Math.PI * 1.2 * 1.2, 2) // ~69.36 m2
      expect(calc.reqCurrent).toBeCloseTo((calc.totalArea * 30) / 1000, 3) // ~2.08 A

      // McCoy horizontal anode resistance:
      // anodeLength = 300mm = 0.3m, anodeRadius = 45mm = 0.045m
      // Ra = (rho / (2 * pi * L)) * (ln(4L/r) - 1) * fBoundary (1.25)
      const expectedRaSingle = (0.8 / (2 * Math.PI * 0.3)) * (Math.log((4 * 0.3) / 0.045) - 1) * 1.25 // ~0.483 Ohm
      expect(calc.anodeResistance).toBeCloseTo(expectedRaSingle, 3)

      // Current Output per Anode: I = deltaE / Ra.
      // Polarized driving voltage for al_zn_in = 0.25V
      const expectedIAnode = 0.25 / calc.anodeResistance
      expect(calc.outputCurrentPerAnode).toBeCloseTo(expectedIAnode, 3)

      // Total Output Capacity = Output Current * Quantity
      expect(calc.totalOutputCapacity).toBeCloseTo(calc.outputCurrentPerAnode * 6, 3)

      // Expected Lifespan: Y = (N * W * U) / (I_design * C)
      // weight = 4.5kg, U = 0.85, C = 3.4 kg/A-yr
      const expectedLife = (6 * 4.5 * 0.85) / (calc.designCurrent * 3.4)
      expect(calc.expectedLife).toBeCloseTo(expectedLife, 2)
      expect(project.vessel.status).toBe('calculated')
    })

    it('calculates vessel sacrificial CP with bare steel driving voltage (higher output)', () => {
      const store = useProjectStore.getState()
      store.updateVesselParameters({
        length: 8.0,
        diameter: 2.4,
        currentDensity: 30,
        anodeType: 'al_zn_in',
        anodeQty: 6,
        electrolyteResistivity: 80,
        drivingVoltageMode: 'bare', // bare steel
      })

      store.runVesselCalculations()

      const calc = store.getProject().vessel.lastCalcResult
      expect(calc).toBeTruthy()

      // Bare steel driving voltage for al_zn_in is 0.45V
      const expectedIAnode = 0.45 / calc.anodeResistance
      expect(calc.outputCurrentPerAnode).toBeCloseTo(expectedIAnode, 3)
    })
  })
})
