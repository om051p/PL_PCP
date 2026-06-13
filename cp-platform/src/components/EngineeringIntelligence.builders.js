/**
 * EngineeringIntelligence.builders.js
 *
 * Insight builder utilities for the EngineeringIntelligence widget.
 * Pure data functions — generate contextual intelligence from calculation outputs.
 * Kept in a .js file (not .jsx) so the component file can export only React components
 * (required by react-refresh/only-export-components lint rule).
 */

/**
 * Generate groundbed intelligence from calculated results.
 * @param {Object} calcResult - Station lastCalcResult
 * @param {Object} [station] - Station object
 * @returns {Array<Object>}
 */
export function buildGroundbedIntelligence(calcResult, station) {
  const insights = []
  if (!calcResult) return insights

  const r = calcResult

  // R_G vs max allowable
  if (r.groundbedResistanceOhm != null && r.maxAllowableGroundbedRes != null && r.maxAllowableGroundbedRes > 0) {
    const ratio = r.groundbedResistanceOhm / r.maxAllowableGroundbedRes
    const pctBelow = ((1 - ratio) * 100).toFixed(0)
    if (ratio <= 0.7) {
      insights.push({
        id: 'gb-rg-margin',
        text: `Groundbed resistance is ${pctBelow}% below maximum allowable (${r.maxAllowableGroundbedRes.toFixed(3)} Ω). Excellent margin.`,
        tone: 'good',
        metric: `${r.groundbedResistanceOhm.toFixed(4)} Ω`,
        reference: 'SAES-X-400',
      })
    } else if (ratio <= 0.9) {
      insights.push({
        id: 'gb-rg-margin',
        text: `Groundbed resistance is ${pctBelow}% below maximum allowable. Acceptable, review for optimization.`,
        tone: 'info',
        metric: `${r.groundbedResistanceOhm.toFixed(4)} Ω`,
        reference: 'SAES-X-400',
      })
    } else if (ratio > 1) {
      insights.push({
        id: 'gb-rg-margin',
        text: `Groundbed resistance EXCEEDS maximum allowable (${r.maxAllowableGroundbedRes.toFixed(3)} Ω). Consider more anodes or deeper borehole.`,
        tone: 'fail',
        metric: `${r.groundbedResistanceOhm.toFixed(4)} Ω`,
        reference: 'SAES-X-400',
      })
    }
  }

  // Design life vs target
  if (r.designLifeYears != null && r.targetDesignLifeYears != null) {
    const margin = r.designLifeYears - r.targetDesignLifeYears
    if (margin >= 2) {
      insights.push({
        id: 'gb-life-margin',
        text: `Design life exceeds target by ${margin.toFixed(1)} years. Anode configuration is conservative.`,
        tone: 'good',
        metric: `${r.designLifeYears.toFixed(1)} yrs`,
        reference: 'NACE SP0169',
      })
    } else if (margin >= 0) {
      insights.push({
        id: 'gb-life-margin',
        text: `Design life meets target with ${margin.toFixed(1)} year margin. Marginal — monitor anode consumption.`,
        tone: 'warn',
        metric: `${r.designLifeYears.toFixed(1)} yrs`,
        reference: 'NACE SP0169',
      })
    } else {
      insights.push({
        id: 'gb-life-margin',
        text: `Design life is ${Math.abs(margin).toFixed(1)} years BELOW target. Increase anode quantity or weight.`,
        tone: 'fail',
        metric: `${r.designLifeYears.toFixed(1)} yrs`,
        reference: 'NACE SP0169',
      })
    }
  }

  // Active length insight
  if (r.activeLengthM != null && station?.groundbed?.type === 'deepwell') {
    insights.push({
      id: 'gb-length',
      text: `Active column length: ${r.activeLengthM.toFixed(2)} m. Total drill depth: ${r.totalDrillDepthM?.toFixed(2) || '—'} m.`,
      tone: 'info',
      metric: `${r.activeLengthM.toFixed(2)} m`,
    })
  }

  return insights
}

/**
 * Generate cable intelligence from calculated results.
 * @param {Object} calcResult - Station lastCalcResult
 * @param {Object} [station] - Station object
 * @returns {Array<Object>}
 */
export function buildCableIntelligence(calcResult, station) {
  const insights = []
  if (!calcResult) return insights

  const r = calcResult

  // Cable fraction of total circuit
  if (r.totalCableResOhm != null && r.totalCircuitResistanceOhm != null && r.totalCircuitResistanceOhm > 0) {
    const pct = ((r.totalCableResOhm / r.totalCircuitResistanceOhm) * 100).toFixed(0)
    if (pct > 30) {
      insights.push({
        id: 'cb-pct',
        text: `Cable resistance contributes ${pct}% of total circuit resistance. Consider larger cable cross-sections.`,
        tone: 'warn',
        metric: `${pct}%`,
      })
    } else {
      insights.push({
        id: 'cb-pct',
        text: `Cable resistance contributes ${pct}% of total circuit resistance. Cable sizing is adequate.`,
        tone: 'good',
        metric: `${pct}%`,
      })
    }
  }

  return insights
}

/**
 * Generate TR circuit intelligence from calculated results.
 * @param {Object} calcResult - Station lastCalcResult
 * @param {Object} [station] - Station object
 * @returns {Array<Object>}
 */
export function buildTRIntelligence(calcResult, station) {
  const insights = []
  if (!calcResult) return insights

  const r = calcResult
  const tr = station?.tr || {}

  // TR voltage margin
  if (r.minTRVoltage != null && tr.ratedVoltage > 0) {
    const margin = ((tr.ratedVoltage - r.minTRVoltage) / tr.ratedVoltage * 100).toFixed(0)
    if (margin > 20) {
      insights.push({
        id: 'tr-margin',
        text: `TR voltage margin is ${margin}%. Consider a smaller TR unit for cost optimization.`,
        tone: 'good',
        metric: `${margin}% margin`,
        reference: 'IEC 60287',
      })
    } else if (margin >= 0) {
      insights.push({
        id: 'tr-margin',
        text: `TR voltage margin is ${margin}%. Adequate for operational variations.`,
        tone: 'info',
        metric: `${margin}% margin`,
        reference: 'IEC 60287',
      })
    } else {
      insights.push({
        id: 'tr-margin',
        text: `TR voltage is ${Math.abs(margin)}% BELOW minimum required. Upgrade TR or reduce circuit resistance.`,
        tone: 'fail',
        metric: `${Math.abs(margin)}% deficit`,
        reference: 'IEC 60287',
      })
    }
  }

  // DC power
  if (r.dcPowerW != null) {
    insights.push({
      id: 'tr-power',
      text: `DC output power: ${r.dcPowerW.toFixed(0)} W. AC input: ${r.acInputKVA?.toFixed(2) || '—'} kVA.`,
      tone: 'info',
      metric: `${r.dcPowerW.toFixed(0)} W`,
    })
  }

  return insights
}

/**
 * Generate current requirement intelligence.
 * @param {Object} calcResult - Station lastCalcResult
 * @param {Object} [station] - Station object
 * @returns {Array<Object>}
 */
export function buildCurrentIntelligence(calcResult, station) {
  const insights = []
  if (!calcResult) return insights

  const r = calcResult

  // Total area
  if (r.totalSurfaceAreaM2 != null) {
    insights.push({
      id: 'cr-area',
      text: `Total exposed surface area: ${r.totalSurfaceAreaM2.toFixed(2)} m² across ${station?.pipelineSegments?.length || 0} segment(s).`,
      tone: 'info',
      metric: `${r.totalSurfaceAreaM2.toFixed(2)} m²`,
    })
  }

  // Design vs required
  if (r.designCurrentA != null && r.requiredCurrentA != null) {
    const sparePct = (((r.designCurrentA - r.requiredCurrentA) / r.requiredCurrentA) * 100).toFixed(0)
    insights.push({
      id: 'cr-spare',
      text: `Design current includes ${sparePct}% spare factor (${r.designCurrentA.toFixed(2)} A total).`,
      tone: 'info',
      metric: `+${sparePct}%`,
    })
  }

  return insights
}
