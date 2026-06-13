/**
 * costReductionRules.js
 *
 * Three new cost-reduction rules layered on top of the existing advisor.
 * Pure, deterministic, no DOM/React/Zustand.
 *
 * Each rule: { id, when(input) -> bool, build(input) -> { title, message, action, observedValue, threshold } }
 */

function fmt(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return '-'
  if (Number.isInteger(n)) return String(n)
  return Number(n).toFixed(digits)
}

function fmtPct(p) {
  if (p == null || Number.isNaN(p)) return '-'
  return p.toFixed(0) + '%'
}

/**
 * Rule 1: TR oversized by 15%
 * Triggers when utilization < 0.55 and TR has been sized.
 */
function trOversizedRule(input) {
  const u = input.trMinVoltage
  const r = input.trRatedVoltage
  if (typeof u !== 'number' || typeof r !== 'number' || r <= 0) return null
  const utilization = u / r
  if (utilization >= 0.55) return null
  return {
    id: 'cost.tr_oversized',
    title: 'TR appears oversized',
    message: 'TR utilization is ' + fmtPct(utilization * 100) + ' (V_min=' + fmt(u, 1) + ' V, V_rated=' + fmt(r, 1) + ' V). Consider a smaller TR unit.',
    action: 'Downsize the TR or use a lower-voltage unit. The Optimizer can help find the right size.',
    observedValue: utilization,
    threshold: 0.55,
  }
}

/**
 * Rule 2: Groundbed far below target
 * Triggers when groundbed resistance is well below the allowable max
 * and design life factor > 1.5 (i.e., the anode budget is generous).
 */
function groundbedUnderutilizedRule(input) {
  const r = input.groundbedResistanceOhm
  const maxAllowable = input.maxAllowableGroundbedRes
  if (typeof r !== 'number' || typeof maxAllowable !== 'number' || maxAllowable <= 0) return null
  if (r >= maxAllowable * 0.30) return null

  const dl = input.designLifeYears
  const target = input.targetDesignLifeYears
  let designLifeFactor = null
  if (typeof dl === 'number' && typeof target === 'number' && target > 0) {
    designLifeFactor = dl / target
  }
  if (designLifeFactor !== null && designLifeFactor <= 1.5) return null

  const pctBelowMax = Math.round((1 - r / maxAllowable) * 100)
  return {
    id: 'cost.groundbed_underutilized',
    title: 'Groundbed resistance far below maximum',
    message: 'R_G = ' + fmt(r, 3) + ' Ohm is ' + pctBelowMax + '% below the maximum allowable (' + fmt(maxAllowable, 3) + ' Ohm). Design life could be increased.',
    action: 'Run the Optimizer with "minimize cost" objective to find savings.',
    observedValue: r,
    threshold: maxAllowable * 0.30,
  }
}

/**
 * Rule 3: Excess anode count
 * Triggers when sacrificialAnodeCount > calculatedAnodeCount * 1.5.
 */
function excessAnodeCountRule(input) {
  const specified = input.sacrificialAnodeCount
  const calculated = input.calculatedAnodeCount
  if (typeof specified !== 'number' || typeof calculated !== 'number' || calculated <= 0) return null
  if (specified <= calculated * 1.5) return null

  const recommended = calculated + 1 // +1 for spares
  return {
    id: 'cost.excess_anode_count',
    title: 'Excess anode count',
    message: specified + ' anodes specified; calculations require ' + calculated + '. Reduce to ' + recommended + ' for spares.',
    action: 'Reduce anode count to ' + recommended + ' (calculated + 1 spare) to lower material cost.',
    observedValue: specified,
    threshold: calculated * 1.5,
  }
}

export const COST_REDUCTION_RULES = [
  trOversizedRule,
  groundbedUnderutilizedRule,
  excessAnodeCountRule,
]

/**
 * Run all cost-reduction rules against the input.
 * Returns an array of rule results (only triggered rules).
 */
export function evaluateCostReduction(input) {
  const safe = input && typeof input === 'object' ? input : {}
  const out = []
  for (const rule of COST_REDUCTION_RULES) {
    let built = null
    try { built = rule(safe) } catch { built = null }
    if (built) out.push(built)
  }
  return out
}

export default evaluateCostReduction
