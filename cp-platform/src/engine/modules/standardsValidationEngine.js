/**
 * StandardsValidationEngine.js
 *
 * Centralized SAES-X standards validation engine.
 *
 * Architecture:
 *   Rule Registry — all validation rules defined in one place
 *   Rule Evaluator — runs rules against station/project data
 *   Compliance Reporter — produces compliance score, violations, and report
 *
 * Each rule references:
 *   - Exact SAES clause
 *   - Module checked
 *   - Severity (CRITICAL, HIGH, MEDIUM, LOW)
 *   - Auto-validatable flag
 */

import { getActiveStandard, ANODE_SPECS, CABLE_SPECS, THRESHOLDS } from '../../constants/index.js'

// ─── Rule Registry ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ValidationRule
 * @property {string} id - Unique rule identifier
 * @property {string} standard - Standard reference (e.g., "SAES-X-400 §7.5.5")
 * @property {string} module - Module checked (Groundbed, TR, Cable, Validation, etc.)
 * @property {string} description - Human-readable rule description
 * @property {'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'} severity
 * @property {boolean} autoValidatable - Can be checked programmatically
 * @property {Function} evaluate - (station, project) => { pass: boolean, message: string, detail: object }
 */

export const STANDARDS_RULES = [
  // ── TR Circuit Rules ──────────────────────────────────────────────────────
  {
    id: 'SAES-400-7.5.5',
    standard: 'SAES-X-400 §7.5.5',
    module: 'TR Sizing',
    description: 'Operating circuit resistance shall be ≤ 70% of rated circuit resistance',
    severity: 'HIGH',
    autoValidatable: true,
    evaluate: (station, _project) => {
      const r = station.lastCalcResult
      if (!r) return null // Not calculated
      const R_op = r.totalCircuitResistanceOhm
      const R_rated = station.tr.ratedVoltage / station.tr.ratedCurrent
      const R_max_70 = 0.7 * R_rated
      const pass = R_op <= R_max_70
      return {
        pass,
        message: pass
          ? `R_op = ${R_op.toFixed(4)} Ω ≤ 0.7 × R_rated = ${R_max_70.toFixed(4)} Ω ✓`
          : `R_op = ${R_op.toFixed(4)} Ω exceeds 0.7 × R_rated = ${R_max_70.toFixed(4)} Ω ✗`,
        detail: { R_op, R_rated, R_max_70, fraction: R_op / R_rated },
      }
    },
  },
  {
    id: 'SAES-400-7.5.6',
    standard: 'SAES-X-400 §7.5.6',
    module: 'TR Sizing',
    description: 'Commissioning circuit resistance shall be ≤ 90% of rated circuit resistance',
    severity: 'MEDIUM',
    autoValidatable: true,
    evaluate: (station, _project) => {
      const r = station.lastCalcResult
      if (!r) return null
      const R_op = r.totalCircuitResistanceOhm
      const R_rated = station.tr.ratedVoltage / station.tr.ratedCurrent
      const R_max_90 = 0.9 * R_rated
      const pass = R_op <= R_max_90
      return {
        pass,
        message: pass
          ? `R_op = ${R_op.toFixed(4)} Ω ≤ 0.9 × R_rated = ${R_max_90.toFixed(4)} Ω ✓`
          : `R_op = ${R_op.toFixed(4)} Ω exceeds 0.9 × R_rated = ${R_max_90.toFixed(4)} Ω ✗`,
        detail: { R_op, R_rated, R_max_90, fraction: R_op / R_rated },
      }
    },
  },
  {
    id: 'SAES-500-6.8.4',
    standard: 'SAES-X-500 §6.8.4',
    module: 'TR Sizing',
    description: 'DC power supplies shall have maximum rated output voltage ≤ 100 volts',
    severity: 'CRITICAL',
    autoValidatable: true,
    evaluate: (station, _project) => {
      const V = station.tr.ratedVoltage
      const pass = V <= 100
      return {
        pass,
        message: pass
          ? `TR rated voltage ${V}V ≤ 100V ✓`
          : `TR rated voltage ${V}V exceeds SAES-X-500 maximum of 100V ✗`,
        detail: { ratedVoltage: V, maxAllowed: 100 },
      }
    },
  },

  // ── Groundbed Rules ──────────────────────────────────────────────────────
  {
    id: 'SAES-400-Table10',
    standard: 'SAES-X-400 Table 10',
    module: 'Groundbed Design',
    description: 'Minimum remoteness distance per current and resistivity table',
    severity: 'HIGH',
    autoValidatable: true,
    evaluate: (station, _project) => {
      const r = station.lastCalcResult
      if (!r) return null
      const actual = station.actualRemotenesM || r.actualRemotenesM
      const required = r.requiredRemotenesM
      if (!actual || !required) return null
      const pass = actual >= required
      return {
        pass,
        message: pass
          ? `Remoteness ${actual}m ≥ required ${required}m ✓`
          : `Remoteness ${actual}m < required ${required}m ✗ — increase anode bed distance`,
        detail: { actualM: actual, requiredM: required, source: 'SAES-X-400 Table 10' },
      }
    },
  },
  {
    id: 'SAES-400-7.5.8',
    standard: 'SAES-X-400 §7.5.8',
    module: 'Groundbed Design',
    description: 'If average soil resistivity > 4,000 Ω·cm, record each anode resistance during installation',
    severity: 'MEDIUM',
    autoValidatable: true,
    evaluate: (station, project) => {
      const rho = project?.designBasis?.soilResistivityOhmCm ?? station.soilResistivityOhmCm
      if (rho > 4000) {
        return {
          pass: true,
          message: `Soil resistivity ${rho} Ω·cm > 4,000 Ω·cm — individual anode resistance recording required per SAES-X-400 §7.5.8`,
          detail: { resistivity: rho, threshold: 4000 },
        }
      }
      return { pass: true, message: '', detail: {} }
    },
  },

  // ── Design Life Rules ────────────────────────────────────────────────────
  {
    id: 'SAES-600-5.2.4-MIN',
    standard: 'SAES-X-600 §5.2.4',
    module: 'Design Life',
    description: 'Minimum design life for impressed current systems shall be 25 years',
    severity: 'HIGH',
    autoValidatable: true,
    evaluate: (station, _project) => {
      const r = station.lastCalcResult
      if (!r) return null
      const pass = r.designLifeYears >= 25
      return {
        pass,
        message: pass
          ? `Design life ${r.designLifeYears.toFixed(1)} years ≥ 25 years ✓`
          : `Design life ${r.designLifeYears.toFixed(1)} years < 25 years minimum ✗`,
        detail: { designLifeYears: r.designLifeYears, minRequired: 25 },
      }
    },
  },

  // ── Protection Criteria Rules ────────────────────────────────────────────
  {
    id: 'SAES-300-6.2.2-OVERPROTECT',
    standard: 'SAES-X-300 §6.2.2',
    module: 'Validation',
    description: 'Over-protection ceiling: potential shall not exceed maximum negative limit',
    severity: 'CRITICAL',
    autoValidatable: true,
    evaluate: (station, project) => {
      const std = getActiveStandard(project)
      const limit = std?.protectionCriteria?.overProtectionLimitMvCSE
      if (!limit) return null // Standard doesn't define over-protection limit
      // Check from attenuation results if available
      const maxPotential = station.lastCalcResult?.attenuationSummary?.maxCombinedPotentialMv
      if (!maxPotential && !station.lastCalcResult?.maxPotentialMv) return null
      const pot = maxPotential || station.lastCalcResult.maxPotentialMv
      const pass = pot >= limit // More negative is below limit; pot >= limit means safer (less negative)
      return {
        pass,
        message: pass
          ? `Maximum potential ${pot.toFixed(0)} mV ≥ limit ${limit} mV CSE ✓`
          : `Maximum potential ${pot.toFixed(0)} mV exceeds over-protection limit ${limit} mV CSE ✗ — HISC risk`,
        detail: { maxPotentialMv: pot, overProtectionLimitMv: limit },
      }
    },
  },

  // ── Anode Material Rules ─────────────────────────────────────────────────
  {
    id: 'SAES-500-6.6.4-ZN',
    standard: 'SAES-X-500 §6.6.4',
    module: 'Groundbed Design',
    description: 'Zinc anodes shall not be used where temperature exceeds 50°C (except HTZ)',
    severity: 'CRITICAL',
    autoValidatable: true,
    evaluate: (station, _project) => {
      const anode = ANODE_SPECS[station.anodeSpec?.id]
      if (!anode || anode.type !== 'Sacrificial') return null
      const isZinc = anode.material?.toLowerCase().includes('zinc')
      const isHTZ = anode.material?.toLowerCase().includes('high temperature')
      if (!isZinc || isHTZ) return null
      const maxTemp = Math.max(...(station.pipelineSegments || []).map(s => s.opTempC || 0), 0)
      if (maxTemp <= 50) return { pass: true, message: '', detail: {} }
      return {
        pass: false,
        message: `Zinc anode (${anode.label}) specified but max operating temperature ${maxTemp}°C > 50°C. Use HTZ anodes per SAES-X-500 §6.6.4.`,
        detail: { anodeMaterial: anode.material, maxTempC: maxTemp, limit: 50 },
      }
    },
  },
  {
    id: 'SAES-500-6.6.3-MG',
    standard: 'SAES-X-500 §6.6.3',
    module: 'Groundbed Design',
    description: 'Magnesium anodes shall not be used if electrolyte resistivity < 2,000 Ω·cm',
    severity: 'CRITICAL',
    autoValidatable: true,
    evaluate: (station, project) => {
      const anode = ANODE_SPECS[station.anodeSpec?.id]
      if (!anode || !anode.material?.toLowerCase().includes('magnesium')) return null
      const rho = project?.designBasis?.soilResistivityOhmCm ?? station.soilResistivityOhmCm
      if (rho >= 2000) return { pass: true, message: '', detail: {} }
      return {
        pass: false,
        message: `Magnesium anode specified but soil resistivity ${rho} Ω·cm < 2,000 Ω·cm. Mg anodes prohibited per SAES-X-500 §6.6.3.`,
        detail: { resistivityOhmCm: rho, limit: 2000 },
      }
    },
  },

  // ── Cable/Bond Rules ─────────────────────────────────────────────────────
  {
    id: 'SAES-400-6.10.1.4-BOND',
    standard: 'SAES-X-400 §6.10.1.4',
    module: 'Cable Resistance',
    description: 'Minimum bond conductor size shall be 16 mm² (#6 AWG)',
    severity: 'HIGH',
    autoValidatable: true,
    evaluate: (station, _project) => {
      // Check if any cable or bond uses size < 16mm²
      const sizes = [
        station.cables?.anodeCableSizeMm2,
        station.cables?.posMainSizeMm2,
        station.cables?.negMainSizeMm2,
        station.cables?.negSecSizeMm2,
        station.cables?.bondCableSizeMm2, // if bond cable exists
      ].filter(s => s != null)
      const underSized = sizes.filter(s => s < 16)
      if (underSized.length === 0) return { pass: true, message: '', detail: {} }
      return {
        pass: false,
        message: `Cable/bond sizes below 16mm² minimum per SAES-X-400 §6.10.1.4: ${underSized.join(', ')} mm²`,
        detail: { underSizedSizesMm2: underSized, minimumSizeMm2: 16 },
      }
    },
  },
  {
    id: 'SAES-400-Table5-CD',
    standard: 'SAES-X-400 Table 5',
    module: 'Groundbed Design',
    description: 'MMO anode current density shall not exceed SAES limits (7 A/m² fresh water, 35 A/m² salt water)',
    severity: 'CRITICAL',
    autoValidatable: true,
    evaluate: (station, _project) => {
      const anode = ANODE_SPECS[station.anodeSpec?.id] || station.anodeSpec
      if (!anode || anode.type !== 'MMO') return null
      const numAnodes = station.proposedAnodes
      if (!numAnodes || numAnodes <= 0) return null
      const currentPerAnode = station.tr.ratedCurrent / numAnodes
      const area = Math.PI * (anode.diameterM || 0.025) * (anode.lengthM || 1.0)
      const cd = currentPerAnode / area
      const limit = anode.maxCurrentDensity || 35.0
      const pass = cd <= limit
      return {
        pass,
        message: pass
          ? `MMO anode current density ${cd.toFixed(2)} A/m² ≤ limit ${limit} A/m² ✓`
          : `MMO anode current density ${cd.toFixed(2)} A/m² exceeds SAES limit ${limit} A/m² ✗`,
        detail: { currentPerAnode, area, cd, limit },
      }
    },
  },
  {
    id: 'SAES-600-5.2.5-COMM-VOLT',
    standard: 'SAES-X-600 §5.2.5',
    module: 'TR Sizing',
    description: 'Commissioning target current shall be achieved at 30%-70% of TR rated voltage',
    severity: 'HIGH',
    autoValidatable: true,
    evaluate: (station, _project) => {
      const r = station.lastCalcResult
      if (!r) return null
      const minTRVoltage = r.minTRVoltage
      const ratedVoltage = station.tr.ratedVoltage
      if (!ratedVoltage) return null
      const ratio = minTRVoltage / ratedVoltage
      const pass = ratio >= 0.3 && ratio <= 0.7
      return {
        pass,
        message: pass
          ? `Required voltage ratio ${Math.round(ratio * 100)}% falls within 30%-70% commissioning range ✓`
          : `Required voltage ratio ${Math.round(ratio * 100)}% falls outside 30%-70% commissioning range ✗`,
        detail: { minTRVoltage, ratedVoltage, ratio },
      }
    },
  },
  {
    id: 'SAES-600-5.2.5-OP-MARGIN',
    standard: 'SAES-X-600 §5.2.5',
    module: 'TR Sizing',
    description: 'TR normal operating voltage shall have >10% voltage adjustment remaining',
    severity: 'HIGH',
    autoValidatable: true,
    evaluate: (station, _project) => {
      const r = station.lastCalcResult
      if (!r) return null
      const minTRVoltage = r.minTRVoltage
      const ratedVoltage = station.tr.ratedVoltage
      if (!ratedVoltage) return null
      const margin = (ratedVoltage - minTRVoltage) / ratedVoltage
      const pass = margin >= 0.10
      return {
        pass,
        message: pass
          ? `TR operating voltage margin ${(margin * 100).toFixed(1)}% ≥ 10% required ✓`
          : `TR operating voltage margin ${(margin * 100).toFixed(1)}% < 10% required ✗`,
        detail: { minTRVoltage, ratedVoltage, margin },
      }
    },
  },
  {
    id: 'SAES-700-6.1.1-SHARED',
    standard: 'SAES-X-700 §6.1.1',
    module: 'Validation',
    description: 'Shared well casings are prohibited except for solar power source with multiple wells',
    severity: 'CRITICAL',
    autoValidatable: true,
    evaluate: (station, _project) => {
      const isShared = station.wellCasingShared || station.tr?.wellCasingShared || false
      const isSolar = station.powerSourceType === 'solar' || station.tr?.powerSourceType === 'solar' || false
      const pass = !isShared || isSolar
      return {
        pass,
        message: pass
          ? `Shared well casing: ${isShared ? 'Yes (Solar allowed)' : 'No'} ✓`
          : `Shared well casing detected on non-solar power source ✗ (prohibited per SAES-X-700 §6.1.1)`,
        detail: { isShared, isSolar },
      }
    },
  },
  {
    id: 'SAES-700-6.5.4-DIST',
    standard: 'SAES-X-700 §6.5.4/5',
    module: 'Groundbed Design',
    description: 'Anode bed separation distance must be ≥150m for ≥25A or ≥75m for <25A discharge current',
    severity: 'HIGH',
    autoValidatable: true,
    evaluate: (station, _project) => {
      const r = station.lastCalcResult
      if (!r) return null
      const current = station.tr.ratedCurrent
      const actual = station.actualRemotenesM || r.actualRemotenesM
      if (!actual) return null
      const limit = current >= 25 ? 150 : 75
      const pass = actual >= limit
      return {
        pass,
        message: pass
          ? `Anode bed remoteness ${actual}m ≥ required ${limit}m for ${current}A discharge ✓`
          : `Anode bed remoteness ${actual}m < required ${limit}m for ${current}A discharge ✗`,
        detail: { current, actual, limit },
      }
    },
  },
  {
    id: 'SAES-600-5.1.2.4-RMU',
    standard: 'SAES-X-600 §5.1.2.4',
    module: 'Validation',
    description: 'Remote Monitoring Unit (RMU) is mandatory for new CP systems',
    severity: 'HIGH',
    autoValidatable: true,
    evaluate: (station, _project) => {
      const hasRMU = station.hasRMU || station.tr?.hasRMU || false
      const pass = hasRMU === true
      return {
        pass,
        message: pass
          ? `Remote Monitoring Unit (RMU) is configured ✓`
          : `Remote Monitoring Unit (RMU) is required but not configured ✗`,
        detail: { hasRMU },
      }
    },
  },
  {
    id: 'SAES-600-5.2.7-HAZ',
    standard: 'SAES-X-600 §5.2.7',
    module: 'TR Sizing',
    description: 'Transformer-Rectifier type must comply with hazardous area cooling requirements (oil-immersed in hazardous area)',
    severity: 'HIGH',
    autoValidatable: true,
    evaluate: (station, _project) => {
      const hazClass = station.hazardousAreaClass || station.tr?.hazardousAreaClass || 'non_hazardous'
      const cooling = station.tr?.coolingType || 'air_cooled'
      if (hazClass === 'non_hazardous') return { pass: true, message: 'Non-hazardous area: no special cooling required ✓', detail: {} }
      const pass = cooling === 'oil_immersed'
      return {
        pass,
        message: pass
          ? `Oil-immersed TR configured for hazardous area (${hazClass}) ✓`
          : `Air-cooled TR configured for hazardous area (${hazClass}). Oil-immersed TR is required ✗`,
        detail: { hazClass, cooling },
      }
    },
  },
]

// ─── Rule Evaluator ──────────────────────────────────────────────────────────

/**
 * Run all applicable validation rules against a station.
 *
 * @param {object} station - Station with lastCalcResult
 * @param {object} project - Project with designBasis and activeStandard
 * @returns {{ results: Array, complianceScore: number, violations: Array, summary: string }}
 */
export function runStandardsValidation(station, project) {
  const results = []

  for (const rule of STANDARDS_RULES) {
    try {
      const outcome = rule.evaluate(station, project)
      if (outcome !== null && outcome !== undefined) {
        results.push({
          ruleId: rule.id,
          standard: rule.standard,
          module: rule.module,
          description: rule.description,
          severity: rule.severity,
          autoValidatable: rule.autoValidatable,
          pass: outcome.pass,
          message: outcome.message,
          detail: outcome.detail,
        })
      }
    } catch (err) {
      results.push({
        ruleId: rule.id,
        standard: rule.standard,
        module: rule.module,
        description: rule.description,
        severity: rule.severity,
        autoValidatable: rule.autoValidatable,
        pass: false,
        message: `Rule evaluation error: ${err.message}`,
        detail: { error: err.message },
      })
    }
  }

  // Compliance scoring
  const applicable = results.filter(r => r.message) // Only rules that produced a message
  const passed = applicable.filter(r => r.pass)
  const criticalFails = applicable.filter(r => !r.pass && r.severity === 'CRITICAL')
  const highFails = applicable.filter(r => !r.pass && r.severity === 'HIGH')
  const violations = applicable.filter(r => !r.pass)

  const complianceScore = applicable.length > 0
    ? Math.round((passed.length / applicable.length) * 100)
    : 100

  let summary = 'All standards checks passed.'
  if (criticalFails.length > 0) {
    summary = `${criticalFails.length} CRITICAL violation(s) — design non-compliant.`
  } else if (highFails.length > 0) {
    summary = `${highFails.length} HIGH-severity violation(s) require attention.`
  } else if (violations.length > 0) {
    summary = `${violations.length} minor violation(s) found.`
  }

  return {
    calculatedAt: new Date().toISOString(),
    stationId: station.id,
    results,
    complianceScore,
    violations: violations.map(v => ({
      ruleId: v.ruleId,
      severity: v.severity,
      module: v.module,
      message: v.message,
    })),
    summary,
    passedCount: passed.length,
    applicableCount: applicable.length,
    criticalFailCount: criticalFails.length,
    highFailCount: highFails.length,
  }
}

/**
 * Generate a human-readable compliance report.
 */
export function generateComplianceReport(validationResult) {
  const lines = []
  lines.push('═══════════════════════════════════════')
  lines.push('  SAES-X STANDARDS COMPLIANCE REPORT')
  lines.push('═══════════════════════════════════════')
  lines.push(`Station: ${validationResult.stationId}`)
  lines.push(`Compliance Score: ${validationResult.complianceScore}%`)
  lines.push(`Passed: ${validationResult.passedCount}/${validationResult.applicableCount}`)
  lines.push(`Critical Failures: ${validationResult.criticalFailCount}`)
  lines.push(`High Failures: ${validationResult.highFailCount}`)
  lines.push(`Summary: ${validationResult.summary}`)
  lines.push('')

  // Group by module
  const byModule = {}
  for (const r of validationResult.results) {
    if (!byModule[r.module]) byModule[r.module] = []
    byModule[r.module].push(r)
  }

  for (const [mod, rules] of Object.entries(byModule)) {
    lines.push(`── ${mod} ──`)
    for (const r of rules) {
      const icon = r.pass ? '✓' : '✗'
      lines.push(`  ${icon} ${r.standard}: ${r.message}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
