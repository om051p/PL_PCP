import { RECOMMENDATION_CATEGORIES, RECOMMENDATION_PRIORITIES } from './recommendationRegistry.js'

function fmt(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return '-'
  if (Number.isInteger(n)) return String(n)
  return Number(n).toFixed(digits)
}

function fmtPct(p) {
  if (p == null || Number.isNaN(p)) return '-'
  return (p * 100).toFixed(0) + '%'
}

/**
 * Rule 1: Proximity Interference Proximity
 * Triggers when actualRemotenesM < requiredRemotenesM
 */
function proximityInterferenceRule(input) {
  const actual = input.actualRemotenesM
  const required = input.requiredRemotenesM
  if (typeof actual !== 'number' || typeof required !== 'number' || required <= 0) return null
  if (actual >= required) return null

  return {
    id: 'warning.station_proximity',
    category: RECOMMENDATION_CATEGORIES.WARNING,
    priority: RECOMMENDATION_PRIORITIES.HIGH,
    severity: 'warn',
    title: 'Potential Multi-Station Interference',
    message: `Actual groundbed remoteness (${fmt(actual)} m) is less than the required remoteness (${fmt(required)} m). Foreign structures face high interference risk.`,
    action: 'Increase groundbed distance from foreign structures or conduct a specialized CP interference survey.',
    observedValue: actual,
    threshold: required,
    source: 'rule',
    traceStepId: 'GROUNDBED_RESISTANCE',
  }
}

/**
 * Rule 2: TR Sizing/Utilization Band Analysis
 * Triggers when TR voltage or current utilization is outside [30%, 90%]
 */
function trUtilizationBandRule(input) {
  const vMin = input.minTRVoltage
  const vRated = input.trRatedVoltage
  const iDesign = input.designCurrentA
  const iRated = input.trRatedCurrent

  // Check voltage utilization
  if (typeof vMin === 'number' && typeof vRated === 'number' && vRated > 0) {
    const vUtil = vMin / vRated
    if (vUtil > 0.90) {
      return {
        id: 'warning.tr_voltage_near_capacity',
        category: RECOMMENDATION_CATEGORIES.WARNING,
        priority: RECOMMENDATION_PRIORITIES.CRITICAL,
        severity: 'error',
        title: 'TR Voltage Sizing Near Capacity',
        message: `TR voltage utilization is at ${fmtPct(vUtil)} (V_min=${fmt(vMin)} V of ${fmt(vRated)} V rated). High risk of voltage saturation.`,
        action: 'Increase the rated voltage of the TR unit or optimize the groundbed resistance to lower output voltage.',
        observedValue: vUtil,
        threshold: 0.90,
        source: 'rule',
        traceStepId: 'TR_CIRCUIT_ANALYSIS',
      }
    }
    if (vUtil < 0.30) {
      return {
        id: 'warning.tr_voltage_underutilized',
        category: RECOMMENDATION_CATEGORIES.OPTIMIZATION,
        priority: RECOMMENDATION_PRIORITIES.LOW,
        severity: 'info',
        title: 'TR Voltage Underutilized',
        message: `TR voltage is operating below recommended load band at ${fmtPct(vUtil)} (V_min=${fmt(vMin)} V of ${fmt(vRated)} V rated).`,
        action: 'Consider downsizing the TR rated voltage or increasing cable segment resistances if optimizing loop impedance.',
        observedValue: vUtil,
        threshold: 0.30,
        source: 'rule',
        traceStepId: 'TR_CIRCUIT_ANALYSIS',
      }
    }
  }

  // Check current utilization
  if (typeof iDesign === 'number' && typeof iRated === 'number' && iRated > 0) {
    const iUtil = iDesign / iRated
    if (iUtil > 0.90) {
      return {
        id: 'warning.tr_current_near_capacity',
        category: RECOMMENDATION_CATEGORIES.WARNING,
        priority: RECOMMENDATION_PRIORITIES.CRITICAL,
        severity: 'error',
        title: 'TR Current Sizing Near Capacity',
        message: `TR current utilization is at ${fmtPct(iUtil)} (I_design=${fmt(iDesign)} A of ${fmt(iRated)} A rated).`,
        action: 'Select a TR unit with a higher current rating to maintain safety headroom.',
        observedValue: iUtil,
        threshold: 0.90,
        source: 'rule',
        traceStepId: 'TR_CIRCUIT_ANALYSIS',
      }
    }
    if (iUtil < 0.30) {
      return {
        id: 'warning.tr_current_underutilized',
        category: RECOMMENDATION_CATEGORIES.OPTIMIZATION,
        priority: RECOMMENDATION_PRIORITIES.LOW,
        severity: 'info',
        title: 'TR Current Underutilized',
        message: `TR current is operating below recommended load band at ${fmtPct(iUtil)} (I_design=${fmt(iDesign)} A of ${fmt(iRated)} A rated).`,
        action: 'Consider selecting a TR unit with a lower current rating to operate in the highly efficient 30%-90% band.',
        observedValue: iUtil,
        threshold: 0.30,
        source: 'rule',
        traceStepId: 'TR_CIRCUIT_ANALYSIS',
      }
    }
  }

  return null
}

/**
 * Rule 3: Anode Life vs Target Design Life Gap
 * Triggers when designLifeYears < targetDesignLifeYears
 */
function anodeLifeGapRule(input) {
  const life = input.designLifeYears
  const target = input.targetDesignLifeYears
  if (typeof life !== 'number' || typeof target !== 'number' || target <= 0) return null
  if (life >= target) return null

  return {
    id: 'warning.anode_life_gap',
    category: RECOMMENDATION_CATEGORIES.WARNING,
    priority: RECOMMENDATION_PRIORITIES.HIGH,
    severity: 'warn',
    title: 'Anode Bed Design Life Below Target',
    message: `Calculated anode bed life of ${fmt(life)} years is below the target design life of ${fmt(target)} years.`,
    action: 'Increase the number of anodes or select an anode specification with higher weight/capacity.',
    observedValue: life,
    threshold: target,
    source: 'rule',
    traceStepId: 'DESIGN_LIFE',
  }
}

/**
 * Rule 4: Coating vs Soil Aggressiveness Mismatch
 * Triggers when soil resistivity is very low (< 1000) and coating efficiency is lower (< 0.97)
 */
function coatingSoilMismatchRule(input) {
  const rho = input.soilResistivityOhmCm
  if (typeof rho !== 'number' || rho >= 1000) return null

  const segments = input.segments || []
  const hasLowerCoating = segments.some(
    s => s.coatingEfficiency < 0.97 || s.coatingType === 'coal_tar_enamel'
  )

  if (!hasLowerCoating) return null

  return {
    id: 'warning.coating_soil_mismatch',
    category: RECOMMENDATION_CATEGORIES.WARNING,
    priority: RECOMMENDATION_PRIORITIES.MEDIUM,
    severity: 'warn',
    title: 'Coating & Soil Resistivity Mismatch',
    message: `Aggressive soil environment (${fmt(rho)} Ω·cm) coupled with lower-efficiency coating indicates high risks of localized coating failures.`,
    action: 'Upgrade coating to high-efficiency FBE/3LPE or specify higher safety margins for the design current density.',
    observedValue: rho,
    threshold: 1000,
    source: 'rule',
    traceStepId: 'CURRENT_REQUIREMENT',
  }
}

export const NEW_ADVISOR_RULES = [
  proximityInterferenceRule,
  trUtilizationBandRule,
  anodeLifeGapRule,
  coatingSoilMismatchRule,
]

export function evaluateNewRules(input) {
  const safe = input && typeof input === 'object' ? input : {}
  const out = []
  for (const rule of NEW_ADVISOR_RULES) {
    let built
    try { built = rule(safe) } catch { built = null }
    if (built) out.push(built)
  }
  return out
}
