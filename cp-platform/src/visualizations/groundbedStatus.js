/**
 * Groundbed status classifier.
 *
 * Pure function — consumes the existing `station.lastCalcResult` shape
 * produced by `src/engine/modules/calculations.js` and returns one of:
 *
 *   'ok'    — R_G within max allowable AND design life meets target
 *   'warn'  — exactly one of the two is met
 *   'fail'  — neither is met
 *   'draft' — no calculation result present
 *
 * Extracted from `GroundbedVisualizer.jsx` so the logic can be
 * regression-tested independently of the React component.
 *
 * IMPORTANT: this function MUST NOT recompute any engineering values.
 * It only inspects what the engine already produced.
 */

export function classifyGroundbedStatus(result) {
  if (!result) return 'draft'

  // R_G check: all three fields must be present to evaluate.
  const hasRG =
    result.groundbedResistanceOhm != null &&
    result.maxAllowableGroundbedRes != null
  const rOk = hasRG && result.groundbedResistanceOhm < result.maxAllowableGroundbedRes

  // Design life check: both fields must be present to evaluate.
  const hasLife =
    result.designLifeYears != null &&
    result.targetDesignLifeYears != null
  const lifeOk = hasLife && result.designLifeYears >= result.targetDesignLifeYears

  // If we cannot evaluate either side, be conservative and report
  // 'draft' (engineer must complete the calculation).
  if (!hasRG && !hasLife) return 'draft'

  // Treat unknown evaluations as failures (safer for compliance).
  const rPass = hasRG ? rOk : false
  const lifePass = hasLife ? lifeOk : false
  if (rPass && lifePass) return 'ok'
  if (rPass || lifePass) return 'warn'
  return 'fail'
}

export const GROUNDBED_STATUS_LABELS = {
  ok: 'Within limits',
  warn: 'Review required',
  fail: 'Exceeds limits',
  draft: 'Awaiting calculation',
}
