/**
 * engineeringAdvisorEngine.js
 *
 * Rule-based engineering recommendation engine. Takes a station's engineering
 * inputs and produces a list of recommendations (advisories) plus an
 * overall health score.
 *
 * Design principles:
 *   1. Deterministic - same inputs always produce the same outputs.
 *   2. Pure - no DOM, no React, no state. Fully unit-testable.
 *   3. Future-ready - every recommendation has a `source: 'rule' | 'ai'` field.
 *   4. Explainable - every recommendation cites the threshold and the
 *      observed value, so engineers can trust the output.
 */

export const SEVERITY = Object.freeze({
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  SUCCESS: 'success',
})

export const CATEGORY = Object.freeze({
  SOIL: 'soil',
  PIPELINE: 'pipeline',
  CURRENT: 'current',
  GROUNDBED: 'groundbed',
  TR: 'tr',
  CABLE: 'cable',
  ATTENUATION: 'attenuation',
  DESIGN_LIFE: 'design_life',
  WORKFLOW: 'workflow',
})

export const THRESHOLDS = Object.freeze({
  soilResistivityOhmCm: { veryLow: 500, low: 1000, nominal: 5000, high: 10000, veryHigh: 50000 },
  pipelineLengthKm: { veryShort: 0.5, short: 2, nominal: 25, long: 50, veryLong: 100 },
  currentReqA: { veryLow: 0.5, low: 2, nominal: 30, high: 50, veryHigh: 100 },
  groundbedOhm: { veryLow: 0.1, low: 0.3, nominal: 2.0, high: 5.0, veryHigh: 10.0 },
  trUtilization: { undersized: 0.30, tight: 0.55, optimalLow: 0.60, optimalHigh: 0.80, oversized: 0.85 },
  cableDropV: { oversized: 0.1, optimal: 0.3, high: 0.5, veryHigh: 1.0 },
  attenuationCoveragePct: { inadequate: 50, marginal: 90, adequate: 95 },
  attenuationWorstPointMv: { excellent: -950, adequate: -850, marginal: -750, inadequate: -650 },
  designLifeFactor: { undersized: 1.0, tight: 1.20, comfortable: 1.50, oversized: 2.00 },
})

function fmt(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return '-'
  if (Number.isInteger(n)) return String(n)
  return Number(n).toFixed(digits)
}

function fmtPct(p) {
  if (p == null || Number.isNaN(p)) return '-'
  return p.toFixed(0) + '%'
}

function hasAnyData(input) {
  if (!input || typeof input !== "object") return false
  return Object.values(input).some(v => v != null && v !== "" && !(typeof v === "number" && Number.isNaN(v)))
}

function severityWeight(s) {
  if (s === SEVERITY.ERROR) return 30
  if (s === SEVERITY.WARN) return 15
  if (s === SEVERITY.INFO) return 5
  if (s === SEVERITY.SUCCESS) return -2
  return 0
}

function computeHealthScore(recs) {
  let p = 0
  for (const r of recs) p += severityWeight(r.severity)
  return Math.max(0, Math.min(100, Math.round(100 - p)))
}

function scoreLabel(s) {
  if (s >= 90) return 'Optimal'
  if (s >= 75) return 'Good'
  if (s >= 55) return 'Marginal'
  if (s >= 30) return 'Critical'
  return 'Severe'
}

const T = THRESHOLDS

const RULES = [
  // SOIL
  { id: 'soil.very_high', cat: CATEGORY.SOIL, sev: SEVERITY.WARN,
    when: i => typeof i.soilResistivityOhmCm === 'number' && i.soilResistivityOhmCm > T.soilResistivityOhmCm.veryHigh,
    build: i => ({ title: 'Very high soil resistivity',
      message: 'Soil resistivity is ' + fmt(i.soilResistivityOhmCm, 0) + ' Ohm-cm - above the ' + T.soilResistivityOhmCm.veryHigh + ' Ohm-cm deepwell threshold. Shallow groundbeds are unlikely to meet the R_G target.',
      action: 'Switch groundbed type to Deepwell and re-run groundbed calculations.' }),
    conf: 0.90 },
  { id: 'soil.high', cat: CATEGORY.SOIL, sev: SEVERITY.INFO,
    when: i => typeof i.soilResistivityOhmCm === 'number' && i.soilResistivityOhmCm > T.soilResistivityOhmCm.high && i.soilResistivityOhmCm <= T.soilResistivityOhmCm.veryHigh,
    build: i => ({ title: 'High soil resistivity',
      message: 'Soil resistivity is ' + fmt(i.soilResistivityOhmCm, 0) + ' Ohm-cm. Consider a deepwell groundbed for a more reliable R_G.',
      action: 'Review groundbed type - Deepwell is preferred for rho > 10,000 Ohm-cm.' }),
    conf: 0.75 },
  { id: 'soil.very_low', cat: CATEGORY.SOIL, sev: SEVERITY.SUCCESS,
    when: i => typeof i.soilResistivityOhmCm === 'number' && i.soilResistivityOhmCm < T.soilResistivityOhmCm.veryLow,
    build: i => ({ title: 'Very low soil resistivity',
      message: 'Soil resistivity is ' + fmt(i.soilResistivityOhmCm, 0) + ' Ohm-cm - excellent for CP. Shallow or distributed groundbeds will perform well.',
      action: 'No action needed. Shallow/distributed groundbed is appropriate.' }),
    conf: 0.95 },
  { id: 'soil.deepwell_alternative', cat: CATEGORY.SOIL, sev: SEVERITY.INFO,
    when: i => typeof i.soilResistivityOhmCm === 'number' && i.soilResistivityOhmCm > T.soilResistivityOhmCm.nominal,
    build: i => ({ title: 'Soil resistivity suggests deepwell alternative',
      message: 'rho = ' + fmt(i.soilResistivityOhmCm, 0) + ' Ohm-cm is well above the nominal ' + T.soilResistivityOhmCm.nominal + ' Ohm-cm. Deepwell anodes at depth typically encounter 2-5x lower resistivity than the surface layer.',
      action: 'Compare Deepwell vs Shallow Vertical using the Optimizer.' }),
    conf: 0.80 },

  // PIPELINE
  { id: 'pipeline.very_long', cat: CATEGORY.PIPELINE, sev: SEVERITY.WARN,
    when: i => typeof i.pipelineLengthKm === 'number' && i.pipelineLengthKm > T.pipelineLengthKm.veryLong,
    build: i => ({ title: 'Very long pipeline',
      message: 'Pipeline length is ' + fmt(i.pipelineLengthKm, 1) + ' km - exceeds the ' + T.pipelineLengthKm.veryLong + ' km threshold. A single groundbed may not provide uniform protection.',
      action: 'Consider multiple groundbeds (distributed mode) or a thorough attenuation review.' }),
    conf: 0.90 },
  { id: 'pipeline.long', cat: CATEGORY.PIPELINE, sev: SEVERITY.INFO,
    when: i => typeof i.pipelineLengthKm === 'number' && i.pipelineLengthKm > T.pipelineLengthKm.long && i.pipelineLengthKm <= T.pipelineLengthKm.veryLong,
    build: i => ({ title: 'Long pipeline - verify attenuation coverage',
      message: 'Pipeline length is ' + fmt(i.pipelineLengthKm, 1) + ' km. At this scale, attenuation is often the limiting factor.',
      action: 'Run attenuation analysis to confirm full coverage.' }),
    conf: 0.70 },
  { id: 'pipeline.very_short', cat: CATEGORY.PIPELINE, sev: SEVERITY.INFO,
    when: i => typeof i.pipelineLengthKm === 'number' && i.pipelineLengthKm < T.pipelineLengthKm.veryShort,
    build: i => ({ title: 'Very short pipeline',
      message: 'Pipeline length is only ' + fmt(i.pipelineLengthKm, 2) + ' km. A single shallow groundbed is usually sufficient.',
      action: 'No action needed. Verify attenuation manually given the short run.' }),
    conf: 0.80 },

  // CURRENT
  { id: 'current.very_high', cat: CATEGORY.CURRENT, sev: SEVERITY.WARN,
    when: i => typeof i.currentReqA === 'number' && i.currentReqA > T.currentReqA.veryHigh,
    build: i => ({ title: 'Very high current requirement',
      message: 'Required current is ' + fmt(i.currentReqA, 1) + ' A - exceeds the ' + T.currentReqA.veryHigh + ' A threshold for a single TR.',
      action: 'Consider two parallel TR units, or split into multiple protection zones.' }),
    conf: 0.85 },
  { id: 'current.high', cat: CATEGORY.CURRENT, sev: SEVERITY.INFO,
    when: i => typeof i.currentReqA === 'number' && i.currentReqA > T.currentReqA.high && i.currentReqA <= T.currentReqA.veryHigh,
    build: i => ({ title: 'High current requirement',
      message: 'Required current is ' + fmt(i.currentReqA, 1) + ' A. Verify TR current rating has adequate headroom.',
      action: 'Check TR rated current vs design current.' }),
    conf: 0.70 },
  { id: 'current.very_low', cat: CATEGORY.CURRENT, sev: SEVERITY.WARN,
    when: i => typeof i.currentReqA === 'number' && i.currentReqA < T.currentReqA.veryLow && i.currentReqA > 0,
    build: i => ({ title: 'Very low current requirement',
      message: 'Required current is only ' + fmt(i.currentReqA, 2) + ' A. This is unusually low - verify the calculation inputs.',
      action: 'Re-check pipeline segments, coating efficiency, and design current density.' }),
    conf: 0.80 },

  // GROUNDBED
  { id: 'groundbed.unusually_low', cat: CATEGORY.GROUNDBED, sev: SEVERITY.SUCCESS,
    when: i => typeof i.groundbedResistanceOhm === 'number' && i.groundbedResistanceOhm < T.groundbedOhm.veryLow,
    build: i => ({ title: 'Groundbed resistance unusually low',
      message: 'R_G = ' + fmt(i.groundbedResistanceOhm, 3) + ' Ohm - exceptional. The design is well within budget and you may be able to reduce anode count or shorten anode length.',
      action: 'Consider cost optimization: try the Optimizer with fewer anodes or shallower depth.' }),
    conf: 0.80 },
  { id: 'groundbed.very_high', cat: CATEGORY.GROUNDBED, sev: SEVERITY.ERROR,
    when: i => typeof i.groundbedResistanceOhm === 'number' && i.groundbedResistanceOhm > T.groundbedOhm.veryHigh,
    build: i => ({ title: 'Groundbed resistance too high',
      message: 'R_G = ' + fmt(i.groundbedResistanceOhm, 2) + ' Ohm - exceeds the ' + T.groundbedOhm.veryHigh + ' Ohm threshold. TR will not be able to deliver design voltage.',
      action: 'Add more anodes, increase anode length, or switch to a lower-resistivity layer.' }),
    conf: 0.95 },
  { id: 'groundbed.high', cat: CATEGORY.GROUNDBED, sev: SEVERITY.WARN,
    when: i => typeof i.groundbedResistanceOhm === 'number' && i.groundbedResistanceOhm > T.groundbedOhm.high && i.groundbedResistanceOhm <= T.groundbedOhm.veryHigh,
    build: i => ({ title: 'Groundbed resistance above target',
      message: 'R_G = ' + fmt(i.groundbedResistanceOhm, 2) + ' Ohm. Verify this is within the TR voltage budget.',
      action: 'Review R_G_max allowable (TR Voltage - V_backEMF) / I_design.' }),
    conf: 0.75 },
  { id: 'groundbed.missing', cat: CATEGORY.GROUNDBED, sev: SEVERITY.WARN,
    when: i => i.groundbedResistanceOhm == null || (typeof i.groundbedResistanceOhm === 'number' && i.groundbedResistanceOhm <= 0),
    build: () => ({ title: 'Groundbed resistance not set',
      message: 'No groundbed R_G available. The circuit cannot be evaluated.',
      action: 'Run Groundbed calculations to set R_G.' }),
    conf: 0.95 },

  // TR
  { id: 'tr.undersized', cat: CATEGORY.TR, sev: SEVERITY.ERROR,
    when: i => typeof i.trMinVoltage === 'number' && typeof i.trRatedVoltage === 'number' && i.trRatedVoltage > 0 && (i.trMinVoltage / i.trRatedVoltage) < T.trUtilization.undersized,
    build: i => ({ title: 'TR appears undersized',
      message: 'Required voltage (' + fmt(i.trMinVoltage, 1) + ' V) is only ' + fmtPct((i.trMinVoltage / i.trRatedVoltage) * 100) + ' of the TR rating (' + fmt(i.trRatedVoltage, 1) + ' V). The TR is operating near the bottom of its range and has no headroom.',
      action: 'Either upgrade the TR to a higher voltage rating, or reduce the circuit load.' }),
    conf: 0.90 },
  { id: 'tr.tight', cat: CATEGORY.TR, sev: SEVERITY.WARN,
    when: i => typeof i.trMinVoltage === 'number' && typeof i.trRatedVoltage === 'number' && i.trRatedVoltage > 0,
    build: i => {
      const u = i.trMinVoltage / i.trRatedVoltage
      if (u < T.trUtilization.undersized || u >= T.trUtilization.tight) return null
      return { title: 'TR utilization tight',
        message: 'TR is at ' + fmtPct(u * 100) + ' of rating. Below the optimal ' + fmtPct(T.trUtilization.optimalLow * 100) + '-' + fmtPct(T.trUtilization.optimalHigh * 100) + ' band.',
        action: 'Consider a slightly smaller TR or improving the circuit to reduce V_min.' }
    },
    conf: 0.70 },
  { id: 'tr.optimal', cat: CATEGORY.TR, sev: SEVERITY.SUCCESS,
    when: i => typeof i.trMinVoltage === 'number' && typeof i.trRatedVoltage === 'number' && i.trRatedVoltage > 0,
    build: i => {
      const u = i.trMinVoltage / i.trRatedVoltage
      if (u < T.trUtilization.optimalLow || u > T.trUtilization.optimalHigh) return null
      return { title: 'TR is well-sized',
        message: 'TR utilization is ' + fmtPct(u * 100) + ' - within the optimal band. Sized for adequate headroom without overspending.',
        action: 'No action needed.' }
    },
    conf: 0.90 },
  { id: 'tr.oversized', cat: CATEGORY.TR, sev: SEVERITY.WARN,
    when: i => typeof i.trMinVoltage === 'number' && typeof i.trRatedVoltage === 'number' && i.trRatedVoltage > 0 && (i.trMinVoltage / i.trRatedVoltage) > T.trUtilization.oversized,
    build: i => ({ title: 'TR appears oversized',
      message: 'Required voltage is only ' + fmtPct((i.trMinVoltage / i.trRatedVoltage) * 100) + ' of TR rating. The TR is being run well below its capacity - capital is wasted.',
      action: 'Downsize the TR or use a lower-voltage unit. The Optimizer can help find the right size.' }),
    conf: 0.85 },

  // CABLE
  { id: 'cable.very_high_drop', cat: CATEGORY.CABLE, sev: SEVERITY.WARN,
    when: i => typeof i.cableDropV === 'number' && i.cableDropV > T.cableDropV.veryHigh,
    build: i => ({ title: 'Cable voltage drop very high',
      message: 'Cable voltage drop is ' + fmt(i.cableDropV, 2) + ' V - exceeds the ' + fmt(T.cableDropV.veryHigh, 2) + ' V threshold. The cable is undersized for the run length or current.',
      action: 'Increase cable cross-section, or use shorter cable runs.' }),
    conf: 0.90 },
  { id: 'cable.high_drop', cat: CATEGORY.CABLE, sev: SEVERITY.INFO,
    when: i => typeof i.cableDropV === 'number' && i.cableDropV > T.cableDropV.high && i.cableDropV <= T.cableDropV.veryHigh,
    build: i => ({ title: 'Cable voltage drop is high',
      message: 'V_drop = ' + fmt(i.cableDropV, 2) + ' V. Within tolerance, but consider whether a larger cable would reduce operating cost.',
      action: 'Run Optimizer to compare cable sizes.' }),
    conf: 0.60 },
  { id: 'cable.oversized', cat: CATEGORY.CABLE, sev: SEVERITY.WARN,
    when: i => typeof i.cableDropV === 'number' && i.cableDropV < T.cableDropV.oversized && i.cableDropV > 0,
    build: i => ({ title: 'Cable may be oversized',
      message: 'V_drop is only ' + fmt(i.cableDropV, 3) + ' V - far below the ' + fmt(T.cableDropV.optimal, 1) + ' V optimum. The cable cross-section is larger than needed.',
      action: 'Consider a smaller cable size to reduce material cost.' }),
    conf: 0.65 },

  // ATTENUATION
  { id: 'attenuation.inadequate', cat: CATEGORY.ATTENUATION, sev: SEVERITY.ERROR,
    when: i => typeof i.attenuationCoveragePct === 'number' && i.attenuationCoveragePct < T.attenuationCoveragePct.inadequate,
    build: i => ({ title: 'Attenuation coverage inadequate',
      message: 'Only ' + fmt(i.attenuationCoveragePct, 0) + '% of the pipeline is protected. This is well below the NACE -850 mV criterion.',
      action: 'Add groundbed stations, increase current, or re-position existing stations.' }),
    conf: 0.95 },
  { id: 'attenuation.marginal', cat: CATEGORY.ATTENUATION, sev: SEVERITY.WARN,
    when: i => typeof i.attenuationCoveragePct === 'number' && i.attenuationCoveragePct >= T.attenuationCoveragePct.inadequate && i.attenuationCoveragePct < T.attenuationCoveragePct.marginal,
    build: i => ({ title: 'Attenuation coverage marginal',
      message: fmt(i.attenuationCoveragePct, 0) + '% of the pipeline is protected. Below the recommended 90% threshold.',
      action: 'Run additional attenuation review - add stations or increase current.' }),
    conf: 0.80 },
  { id: 'attenuation.worst_point_marginal', cat: CATEGORY.ATTENUATION, sev: SEVERITY.WARN,
    when: i => typeof i.attenuationWorstPointMv === 'number' && i.attenuationWorstPointMv > T.attenuationWorstPointMv.adequate && i.attenuationWorstPointMv <= T.attenuationWorstPointMv.marginal,
    build: i => ({ title: 'Worst-case potential is marginal',
      message: 'Worst point is at ' + fmt(i.attenuationWorstPointMv, 0) + ' mV - just above the -850 mV NACE criterion.',
      action: 'Additional attenuation review recommended; consider increasing current slightly for safety margin.' }),
    conf: 0.85 },
  { id: 'attenuation.worst_point_inadequate', cat: CATEGORY.ATTENUATION, sev: SEVERITY.ERROR,
    when: i => typeof i.attenuationWorstPointMv === 'number' && i.attenuationWorstPointMv > T.attenuationWorstPointMv.inadequate,
    build: i => ({ title: 'Worst-case potential is inadequate',
      message: 'Worst point is at ' + fmt(i.attenuationWorstPointMv, 0) + ' mV - well above the -850 mV NACE criterion. The pipeline is unprotected at this location.',
      action: 'Critical: add anodes, increase current, or relocate groundbeds.' }),
    conf: 0.95 },
  { id: 'attenuation.excellent', cat: CATEGORY.ATTENUATION, sev: SEVERITY.SUCCESS,
    when: i => typeof i.attenuationWorstPointMv === 'number' && i.attenuationWorstPointMv <= T.attenuationWorstPointMv.excellent,
    build: i => ({ title: 'Excellent attenuation coverage',
      message: 'Worst point is at ' + fmt(i.attenuationWorstPointMv, 0) + ' mV - well below the NACE criterion with strong safety margin.',
      action: 'No action needed. The design is conservative and robust.' }),
    conf: 0.95 },
  { id: 'attenuation.review_recommended', cat: CATEGORY.ATTENUATION, sev: SEVERITY.INFO,
    when: i => typeof i.pipelineLengthKm === 'number' && i.pipelineLengthKm > T.pipelineLengthKm.long,
    build: i => ({ title: 'Additional attenuation review recommended',
      message: 'At ' + fmt(i.pipelineLengthKm, 1) + ' km, an attenuation study is essential.',
      action: 'Open Sensitivity > Attenuation Explorer to visualize coverage.' }),
    conf: 0.80 },

  // DESIGN LIFE
  { id: 'design_life.undersized', cat: CATEGORY.DESIGN_LIFE, sev: SEVERITY.ERROR,
    when: i => typeof i.designLifeYears === 'number' && typeof i.targetDesignLifeYears === 'number' && i.targetDesignLifeYears > 0 && (i.designLifeYears / i.targetDesignLifeYears) < T.designLifeFactor.undersized,
    build: i => ({ title: 'Design life below target',
      message: 'Design life is ' + fmt(i.designLifeYears, 1) + ' y vs target ' + fmt(i.targetDesignLifeYears, 1) + ' y (' + fmtPct((i.designLifeYears / i.targetDesignLifeYears) * 100) + '). The anodes will deplete before the design horizon.',
      action: 'Increase anode count, use larger anodes, or lower anode consumption rate.' }),
    conf: 0.95 },
  { id: 'design_life.tight', cat: CATEGORY.DESIGN_LIFE, sev: SEVERITY.WARN,
    when: i => typeof i.designLifeYears === 'number' && typeof i.targetDesignLifeYears === 'number' && i.targetDesignLifeYears > 0,
    build: i => {
      const r = i.designLifeYears / i.targetDesignLifeYears
      if (r < T.designLifeFactor.undersized || r >= T.designLifeFactor.tight) return null
      return { title: 'Design life is tight',
        message: 'Design life is ' + fmt(i.designLifeYears, 1) + ' y vs target ' + fmt(i.targetDesignLifeYears, 1) + ' y - only ' + fmtPct(r * 100) + ' of target. There is no safety margin for accelerated consumption.',
        action: 'Add 10-20% more anodes for design life headroom.' }
    },
    conf: 0.75 },
  { id: 'design_life.can_be_increased', cat: CATEGORY.DESIGN_LIFE, sev: SEVERITY.SUCCESS,
    when: i => typeof i.designLifeYears === 'number' && typeof i.targetDesignLifeYears === 'number' && i.targetDesignLifeYears > 0 && (i.designLifeYears / i.targetDesignLifeYears) >= T.designLifeFactor.comfortable,
    build: i => ({ title: 'Design life can be increased',
      message: 'Design life is ' + fmt(i.designLifeYears, 1) + ' y - ' + fmt((i.designLifeYears / i.targetDesignLifeYears), 1) + 'x the target. The anode budget is generous.',
      action: 'Run the Optimizer with "minimize cost" objective to find savings.' }),
    conf: 0.80 },

  // WORKFLOW
  { id: 'workflow.approval_pending', cat: CATEGORY.WORKFLOW, sev: SEVERITY.INFO,
    when: i => typeof i.pendingApprovalDays === 'number' && i.pendingApprovalDays > 7,
    build: i => ({ title: 'Approval pending for ' + fmt(i.pendingApprovalDays, 0) + ' days',
      message: 'Design has been awaiting approval for ' + fmt(i.pendingApprovalDays, 0) + ' days.',
      action: 'Follow up with the reviewer or escalate.' }),
    conf: 0.90 },
  { id: 'workflow.export_report', cat: CATEGORY.WORKFLOW, sev: SEVERITY.INFO,
    when: i => i.designLifeYears != null && i.attenuationCoveragePct != null && i.attenuationCoveragePct >= 90,
    build: i => ({ title: 'Ready to export report',
      message: 'Attenuation coverage is ' + fmt(i.attenuationCoveragePct, 0) + '% and design life is ' + fmt(i.designLifeYears, 1) + ' y. The design is ready for the engineering report.',
      action: 'Open the Report page to generate a PDF or Excel export.' }),
    conf: 0.80 },
]

export function analyze(input = {}) {
  const safe = (input && typeof input === 'object') ? input : {}
  // If the input has no real data, return an empty advisory.
  if (!hasAnyData(safe)) {
    return { recommendations: [], score: 100, scoreLabel: 'Optimal', summary: {}, inputEcho: { ...safe } }
  }
  const out = []
  for (const r of RULES) {
    let ok
    try { ok = !!r.when(safe) } catch { ok = false }
    if (!ok) continue
    let built
    try { built = r.build(safe) } catch { built = null }
    if (!built) continue
    out.push({
      id: r.id, category: r.cat, severity: r.sev,
      title: built.title, message: built.message, action: built.action,
      source: 'rule', confidence: r.conf ?? 0.8,
    })
  }
  const order = { error: 0, warn: 1, info: 2, success: 3 }
  out.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9))
  const score = computeHealthScore(out)
  return { recommendations: out, score, scoreLabel: scoreLabel(score), summary: buildSummary(safe, out), inputEcho: { ...safe } }
}

function buildSummary(input, recs) {
  const byCat = new Map()
  for (const r of recs) {
    if (!byCat.has(r.category)) byCat.set(r.category, [])
    byCat.get(r.category).push(r)
  }
  const sum = {}
  for (const [cat, items] of byCat) {
    const order = { error: 3, warn: 2, info: 1, success: 0 }
    const worst = items.reduce((acc, r) => (order[r.severity] ?? 0) > (order[acc] ?? -1) ? r.severity : acc, 'info')
    sum[cat] = {
      status: worst === 'error' ? 'critical' : worst === 'warn' ? 'warning' : worst === 'success' ? 'optimal' : 'nominal',
      headline: items[0]?.title || 'No issues',
      observed: formatObservedForCategory(cat, input),
    }
  }
  return sum
}

function formatObservedForCategory(cat, input) {
  switch (cat) {
    case CATEGORY.SOIL:
      return input.soilResistivityOhmCm != null ? 'rho = ' + fmt(input.soilResistivityOhmCm, 0) + ' Ohm-cm' : '-'
    case CATEGORY.PIPELINE:
      return input.pipelineLengthKm != null ? 'L = ' + fmt(input.pipelineLengthKm, 1) + ' km' : '-'
    case CATEGORY.CURRENT:
      return input.currentReqA != null ? 'I_req = ' + fmt(input.currentReqA, 1) + ' A' : '-'
    case CATEGORY.GROUNDBED:
      return input.groundbedResistanceOhm != null ? 'R_G = ' + fmt(input.groundbedResistanceOhm, 3) + ' Ohm' : '-'
    case CATEGORY.TR: {
      if (input.trMinVoltage == null || input.trRatedVoltage == null) return '-'
      return 'V_min/V_rated = ' + fmtPct((input.trMinVoltage / input.trRatedVoltage) * 100)
    }
    case CATEGORY.CABLE:
      return input.cableDropV != null ? 'V_drop = ' + fmt(input.cableDropV, 2) + ' V' : '-'
    case CATEGORY.ATTENUATION: {
      const c = input.attenuationCoveragePct
      const w = input.attenuationWorstPointMv
      if (c != null && w != null) return fmt(c, 0) + '% protected - worst ' + fmt(w, 0) + ' mV'
      if (c != null) return fmt(c, 0) + '% protected'
      return '-'
    }
    case CATEGORY.DESIGN_LIFE: {
      if (input.designLifeYears == null || input.targetDesignLifeYears == null || input.targetDesignLifeYears === 0) return '-'
      return fmt(input.designLifeYears, 1) + ' / ' + fmt(input.targetDesignLifeYears, 1) + ' y'
    }
    case CATEGORY.WORKFLOW:
      return input.pendingApprovalDays != null ? fmt(input.pendingApprovalDays, 0) + ' days pending' : '-'
    default:
      return '-'
  }
}

export async function analyzeAsync(input, options = {}) {
  const result = analyze(input)
  if (!options.includeAI) return result
  return result
}

export default analyze
