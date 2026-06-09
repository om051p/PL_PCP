import { describe, it, expect } from 'vitest'
import { calcDistributedGroundbedResistance } from './calculations.js'

describe('calcDistributedGroundbedResistance', () => {
  it('calculates resistance for 10 distributed anodes', () => {
    // rho = 2000 ohm-cm (20 ohm-m)
    // L = 3m, d = 0.2m, depth = 2m
    const res = calcDistributedGroundbedResistance(2000, 3, 0.2, 2, 10)
    
    // Single anode Dwight approx:
    // R = (20 / (2 * pi * 3)) * (ln(12/0.2) - 1 + 3/7)
    // R = (20 / 18.85) * (ln(60) - 1 + 0.428)
    // R = 1.06 * (4.09 - 1 + 0.428) = 1.06 * 3.518 = 3.73 ohm
    // For 10 anodes: 0.373 ohm
    
    expect(res).toBeCloseTo(0.373, 1)
  })

  it('returns sentinel for invalid inputs', () => {
    expect(calcDistributedGroundbedResistance(2000, 0, 0.2, 2, 10)).toBe(999)
    expect(calcDistributedGroundbedResistance(2000, 3, -1, 2, 10)).toBe(999)
  })
})
