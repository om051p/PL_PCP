/**
 * DESIGN OPTIMIZATION ENGINE
 * After every calculation run, evaluates multiple design alternatives.
 * Compares current design vs. alternatives and presents trade-offs.
 */

import { runStationCalculations } from '../modules/calculations.js'
import { runRules } from '../rules/rulesEngine.js'

/**
 * Generate design alternatives for a station.
 * @param {import('../../types').Station} station
 * @param {import('../../types').CalcResult} baseResult
 * @param {number} systemDesignLifeYears
 * @returns {import('../../types').DesignAlternative[]}
 */
export function generateAlternatives(station, baseResult, systemDesignLifeYears) {
  const alternatives = []

  // ── Alternative A: +4 anodes ─────────────────────────────────────────────
  const stationA = cloneStation(station)
  stationA.proposedAnodes = station.proposedAnodes + 4
  stationA.cables.anodeTailLengths = padTailLengths(stationA.cables.anodeTailLengths, stationA.proposedAnodes)
  const resultA = runStationCalculations(stationA, systemDesignLifeYears)
  const rulesA = runRules(stationA, resultA)
  alternatives.push({
    id: 'alt-a',
    label: `+4 Anodes (${stationA.proposedAnodes} total)`,
    parameters: { proposedAnodes: stationA.proposedAnodes },
    result: { ...resultA, ...rulesA },
    advantages: [
      `Design life increases to ${resultA.designLifeYears.toFixed(1)} years (+${(resultA.designLifeYears - baseResult.designLifeYears).toFixed(1)}y)`,
      `Groundbed resistance reduces to ${resultA.groundbedResistanceOhm.toFixed(4)}Ω`,
      rulesA.allPassed ? 'All validation checks PASS' : '',
    ].filter(Boolean),
    disadvantages: [
      `Additional ${stationA.proposedAnodes - station.proposedAnodes} anodes increases material cost`,
      `Larger junction box may be required`,
    ],
    isCurrentDesign: false,
  })

  // ── Alternative B: +8 anodes ─────────────────────────────────────────────
  const stationB = cloneStation(station)
  stationB.proposedAnodes = station.proposedAnodes + 8
  stationB.cables.anodeTailLengths = padTailLengths(stationB.cables.anodeTailLengths, stationB.proposedAnodes)
  const resultB = runStationCalculations(stationB, systemDesignLifeYears)
  const rulesB = runRules(stationB, resultB)
  alternatives.push({
    id: 'alt-b',
    label: `+8 Anodes (${stationB.proposedAnodes} total)`,
    parameters: { proposedAnodes: stationB.proposedAnodes },
    result: { ...resultB, ...rulesB },
    advantages: [
      `Design life increases to ${resultB.designLifeYears.toFixed(1)} years (+${(resultB.designLifeYears - baseResult.designLifeYears).toFixed(1)}y)`,
      `Lowest groundbed resistance of all options: ${resultB.groundbedResistanceOhm.toFixed(4)}Ω`,
      rulesB.allPassed ? 'All validation checks PASS' : '',
    ].filter(Boolean),
    disadvantages: [
      `Significant additional anode cost`,
      `20-terminal junction box required for >${stationB.proposedAnodes > 12 ? '12' : '20'} anodes`,
      `Greater drilling depth required`,
    ],
    isCurrentDesign: false,
  })

  // ── Alternative C: Larger TR (next standard size up) ─────────────────────
  const stationC = cloneStation(station)
  const nextTRVoltage = Math.ceil((station.tr.ratedVoltage + 5) / 10) * 10
  const nextTRCurrent = station.tr.ratedCurrent + 10
  stationC.tr = { ...station.tr, ratedVoltage: nextTRVoltage, ratedCurrent: nextTRCurrent }
  const resultC = runStationCalculations(stationC, systemDesignLifeYears)
  const rulesC = runRules(stationC, resultC)
  alternatives.push({
    id: 'alt-c',
    label: `Larger TR (${nextTRVoltage}V / ${nextTRCurrent}A)`,
    parameters: { trVoltage: nextTRVoltage, trCurrent: nextTRCurrent },
    result: { ...resultC, ...rulesC },
    advantages: [
      `More voltage headroom: ${(stationC.tr.ratedVoltage - resultC.minTRVoltage).toFixed(1)}V margin`,
      `Higher current capacity for future demand increase`,
      rulesC.allPassed ? 'All validation checks PASS' : '',
    ].filter(Boolean),
    disadvantages: [
      `Higher TR capital cost`,
      `Higher AC power consumption (${resultC.acInputKVA.toFixed(1)} kVA)`,
      `Design life unchanged (${resultC.designLifeYears.toFixed(1)} years)`,
    ],
    isCurrentDesign: false,
  })

  // ── Current design (baseline) ────────────────────────────────────────────
  const baseRules = runRules(station, baseResult)
  alternatives.unshift({
    id: 'current',
    label: `Current Design (${station.proposedAnodes} anodes)`,
    parameters: {},
    result: { ...baseResult, ...baseRules },
    advantages: [
      `Lowest initial cost`,
      `Design life: ${baseResult.designLifeYears.toFixed(1)} years`,
    ],
    disadvantages: baseRules.allPassed ? [] : [`${baseRules.checks.filter(c => c.status === 'fail').length} validation check(s) failing`],
    isCurrentDesign: true,
  })

  return alternatives
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cloneStation(station) {
  return JSON.parse(JSON.stringify(station))
}

function padTailLengths(lengths, targetCount) {
  const result = [...lengths]
  const avgLen = result.filter(l => l > 0).reduce((a, b) => a + b, 0) / Math.max(result.filter(l => l > 0).length, 1)
  while (result.length < targetCount) result.push(Math.round(avgLen))
  return result
}
