/**
 * DESIGN OPTIMIZATION ENGINE
 * After every calculation run, evaluates multiple design alternatives.
 * Compares current design vs. alternatives and presents trade-offs.
 */

import { runStationCalculations } from '../modules/calculations.js'
import { runRules } from '../rules/rulesEngine.js'
import { THRESHOLDS } from '../../constants/index.js'

/**
 * Generate design alternatives for a station.
 * @param {import('../../types').Station} station
 * @param {import('../../types').CalcResult} baseResult
 * @param {number} systemDesignLifeYears
 * @param {object|null} [standardConfig=null] - Active standard config (for standard-driven values)
 * @returns {import('../../types').DesignAlternative[]}
 */
export function generateAlternatives(station, baseResult, systemDesignLifeYears, standardConfig = null) {
  const alternatives = []

  const anodeCount = Math.max(station.proposedAnodes ?? 0, 0)

  // ── Alternative A: +4 anodes ─────────────────────────────────────────────
  if (anodeCount > 0) {
    const stationA = cloneStation(station)
    stationA.proposedAnodes = anodeCount + 4
    stationA.cables.anodeTailLengths = padTailLengths(
      stationA.cables.anodeTailLengths,
      stationA.proposedAnodes,
    )
    const resultA = runStationCalculations(stationA, systemDesignLifeYears, standardConfig)
    const rulesA = runRules(stationA, resultA, standardConfig)
    alternatives.push({
      id: 'alt-a',
      label: `+4 Anodes (${stationA.proposedAnodes} total)`,
      parameters: { proposedAnodes: stationA.proposedAnodes },
      result: { ...resultA, allChecksPassed: rulesA.allPassed },
      advantages: [
        `Design life increases to ${resultA.designLifeYears.toFixed(1)} years (+${(resultA.designLifeYears - baseResult.designLifeYears).toFixed(1)}y)`,
        `Groundbed resistance reduces to ${resultA.groundbedResistanceOhm.toFixed(4)}Ω`,
        rulesA.allPassed ? 'All validation checks PASS' : '',
      ].filter(Boolean),
      disadvantages: [
        `Additional ${stationA.proposedAnodes - anodeCount} anodes increases material cost`,
        `Larger junction box may be required`,
      ],
      isCurrentDesign: false,
    })

    // ── Alternative B: +8 anodes ─────────────────────────────────────────────
    const stationB = cloneStation(station)
    stationB.proposedAnodes = anodeCount + 8
    stationB.cables.anodeTailLengths = padTailLengths(
      stationB.cables.anodeTailLengths,
      stationB.proposedAnodes,
    )
    const resultB = runStationCalculations(stationB, systemDesignLifeYears, standardConfig)
    const rulesB = runRules(stationB, resultB, standardConfig)
    alternatives.push({
      id: 'alt-b',
      label: `+8 Anodes (${stationB.proposedAnodes} total)`,
      parameters: { proposedAnodes: stationB.proposedAnodes },
      result: { ...resultB, allChecksPassed: rulesB.allPassed },
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
  }

  // ── Alternative C: Larger TR (next standard size up) ─────────────────────
  const tr = station.tr ?? { ratedVoltage: 0, ratedCurrent: 0 }
  if (tr.ratedVoltage > 0 && tr.ratedCurrent > 0) {
    const stationC = cloneStation(station)
    const ts = standardConfig?.trSizing || {}
    const voltageStep = ts.stepVoltage || THRESHOLDS.TR_STEP_VOLTAGE || 5
    const currentStep = ts.stepCurrent || THRESHOLDS.TR_STEP_CURRENT || 10
    const nextTRVoltage = Math.ceil((tr.ratedVoltage + voltageStep) / 10) * 10
    const nextTRCurrent = tr.ratedCurrent + currentStep
    stationC.tr = { ...tr, ratedVoltage: nextTRVoltage, ratedCurrent: nextTRCurrent }
    const resultC = runStationCalculations(stationC, systemDesignLifeYears, standardConfig)
    const rulesC = runRules(stationC, resultC, standardConfig)
    alternatives.push({
      id: 'alt-c',
      label: `Larger TR (${nextTRVoltage}V / ${nextTRCurrent}A)`,
      parameters: { trVoltage: nextTRVoltage, trCurrent: nextTRCurrent },
      result: { ...resultC, allChecksPassed: rulesC.allPassed },
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
  }

  // ── Current design (baseline) ────────────────────────────────────────────
  const baseRules = runRules(station, baseResult, standardConfig)
  alternatives.unshift({
    id: 'current',
    label: `Current Design (${anodeCount} anodes)`,
    parameters: {},
    result: { ...baseResult, allChecksPassed: baseRules.allPassed },
    advantages: [
      `Lowest initial cost`,
      `Design life: ${baseResult.designLifeYears.toFixed(1)} years`,
    ],
    disadvantages: baseRules.allPassed
      ? []
      : [
          `${baseRules.checks.filter((c) => c.status === 'fail').length} validation check(s) failing`,
        ],
    isCurrentDesign: true,
  })

  return alternatives
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cloneStation(station) {
  return JSON.parse(JSON.stringify(station))
}

function padTailLengths(lengths, targetCount) {
  if (targetCount <= 0) return []
  const result = [...lengths]
  const positiveLengths = result.filter((l) => l > 0)
  const avgLen =
    positiveLengths.length > 0
      ? Math.round(positiveLengths.reduce((a, b) => a + b, 0) / positiveLengths.length)
      : 30
  if (result.length > targetCount) {
    return result.slice(0, targetCount)
  }
  while (result.length < targetCount) result.push(avgLen)
  return result
}
