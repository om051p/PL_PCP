/**
 * RULES ENGINE
 * Every engineering rule is a first-class object.
 * Rules are evaluated automatically after every calculation run.
 * Rules produce: PASS/FAIL checks + Engineering Insights + Recommendations.
 *
 * Rule interface:
 *   id       — unique identifier
 *   check    — function(station, result) → ValidationCheck
 *   insight  — function(station, result) → EngineeringInsight | null
 */

import { THRESHOLDS, getSoilClassification, calcRequiredRemotenessM } from '../../constants/index.js'

// ─── Validation Rules (PASS / FAIL / WARNING) ────────────────────────────────

const VALIDATION_RULES = [
  // BR-001: TR Voltage Adequate
  {
    id: 'BR-001',
    check: (station, result) => {
      const pass = station.tr.ratedVoltage >= result.minTRVoltage
      return {
        id: 'BR-001',
        label: 'TR Voltage Adequate (V_rated ≥ V_min)',
        status: pass ? 'pass' : 'fail',
        computed: `${station.tr.ratedVoltage}V rated vs ${result.minTRVoltage.toFixed(2)}V required`,
        limit: `V_rated ≥ ${result.minTRVoltage.toFixed(2)} V`,
        recommendation: pass
          ? null
          : `Increase TR to minimum ${Math.ceil(result.minTRVoltage / 5) * 5}V rating.`,
      }
    },
    insight: (station, result) => {
      if (station.tr.ratedVoltage >= result.minTRVoltage) return null
      const deficit = result.minTRVoltage - station.tr.ratedVoltage
      return {
        severity: 'error',
        title: 'TR Voltage Insufficient',
        message: `The rated TR voltage (${station.tr.ratedVoltage}V) is ${deficit.toFixed(1)}V below the minimum circuit requirement (${result.minTRVoltage.toFixed(1)}V). The TR cannot drive the design current through the circuit.`,
        recommendations: [
          `Upgrade TR to ${Math.ceil(result.minTRVoltage / 5) * 5}V rating.`,
          `Reduce groundbed resistance by adding ${Math.ceil((result.groundbedResistanceOhm - result.maxAllowableGroundbedRes) / 0.05)} anodes.`,
          `Shorten cable routes to reduce circuit resistance.`,
        ],
        calculationRef: 'TR Circuit Analysis',
      }
    },
  },

  // BR-002: Groundbed Resistance Within Allowable
  {
    id: 'BR-002',
    check: (station, result) => {
      const pass = result.groundbedResistanceOhm < result.maxAllowableGroundbedRes
      return {
        id: 'BR-002',
        label: 'Groundbed Resistance < Max Allowable R_G',
        status: pass ? 'pass' : 'fail',
        computed: `${result.groundbedResistanceOhm.toFixed(4)}Ω vs limit ${result.maxAllowableGroundbedRes.toFixed(4)}Ω`,
        limit: `R_G < ${result.maxAllowableGroundbedRes.toFixed(4)} Ω`,
        recommendation: pass ? null : `R_G exceeds allowable. Add anodes or deepen groundbed.`,
      }
    },
    insight: (station, result, cfg = {}) => {
      const highRho = cfg.groundbed?.resistivityThresholds?.high ?? THRESHOLDS.HIGH_SOIL_RESISTIVITY
      if (result.groundbedResistanceOhm < result.maxAllowableGroundbedRes) return null
      const excess = (
        (result.groundbedResistanceOhm / result.maxAllowableGroundbedRes - 1) *
        100
      ).toFixed(0)
      return {
        severity: 'error',
        title: 'Groundbed Resistance Too High',
        message: `Groundbed resistance (${result.groundbedResistanceOhm.toFixed(4)}Ω) exceeds maximum allowable (${result.maxAllowableGroundbedRes.toFixed(4)}Ω) by ${excess}%. This is primarily driven by high soil resistivity (${station.soilResistivityOhmCm} Ω·cm).`,
        recommendations: [
          `Increase anode count from ${station.proposedAnodes} to reduce parallel resistance.`,
          `Deepen groundbed to access lower-resistivity soil strata.`,
          `Consider larger borehole diameter to increase effective electrode area.`,
          station.soilResistivityOhmCm > highRho
            ? `Soil resistivity is very high (${station.soilResistivityOhmCm} Ω·cm). A deepwell groundbed reaching ≥50m depth is strongly recommended.`
            : `Evaluate soil profile at different depths for lower resistivity zones.`,
        ],
        calculationRef: 'Groundbed Resistance',
      }
    },
  },

  // BR-003: Total Circuit Resistance < 70% Operating Threshold
  {
    id: 'BR-003',
    check: (station, result) => {
      const pass = result.totalCircuitResistanceOhm < result.maxCircuitRes70pct
      return {
        id: 'BR-003',
        label: 'Circuit Resistance < 70% Rated Operating Limit',
        status: pass ? 'pass' : 'fail',
        computed: `R_T = ${result.totalCircuitResistanceOhm.toFixed(4)}Ω vs limit ${result.maxCircuitRes70pct.toFixed(4)}Ω`,
        limit: `R_T < 0.70 × (V/I) = ${result.maxCircuitRes70pct.toFixed(4)} Ω`,
        recommendation: pass ? null : `Reduce total circuit resistance.`,
      }
    },
    insight: (station, result) => {
      if (result.totalCircuitResistanceOhm < result.maxCircuitRes90pct) return null
      const pct = ((result.totalCircuitResistanceOhm / result.maxCircuitRes70pct) * 100).toFixed(0)
      return {
        severity:
          result.totalCircuitResistanceOhm >= result.maxCircuitRes70pct ? 'error' : 'warning',
        title: 'Circuit Resistance Elevated',
        message: `Total circuit resistance is at ${pct}% of the rated operating limit. Major contributors: R_G = ${result.groundbedResistanceOhm.toFixed(4)}Ω (${((result.groundbedResistanceOhm / result.totalCircuitResistanceOhm) * 100).toFixed(0)}%), R_cable = ${result.totalCableResOhm.toFixed(4)}Ω (${((result.totalCableResOhm / result.totalCircuitResistanceOhm) * 100).toFixed(0)}%).`,
        recommendations: [
          `Reduce groundbed resistance (largest contributor at ${((result.groundbedResistanceOhm / result.totalCircuitResistanceOhm) * 100).toFixed(0)}%).`,
          `Consider larger cable cross-sections to reduce R_cable.`,
          `Review cable routing — shorter cable paths reduce resistance significantly.`,
        ],
        calculationRef: 'TR Circuit Analysis',
      }
    },
  },

  // BR-004: Circuit Resistance < 90% Warning Threshold
  {
    id: 'BR-004',
    check: (station, result) => {
      const status =
        result.totalCircuitResistanceOhm >= result.maxCircuitRes90pct
          ? 'fail'
          : result.totalCircuitResistanceOhm >= result.maxCircuitRes70pct
            ? 'warning'
            : 'pass'
      return {
        id: 'BR-004',
        label: 'Circuit Resistance < 90% Rated Limit (Warning)',
        status,
        computed: `R_T = ${result.totalCircuitResistanceOhm.toFixed(4)}Ω vs limit ${result.maxCircuitRes90pct.toFixed(4)}Ω`,
        limit: `R_T < 0.90 × (V/I) = ${result.maxCircuitRes90pct.toFixed(4)} Ω`,
      }
    },
    insight: () => null, // Insight handled by BR-003
  },

  // BR-005: Design Life Meets Target
  {
    id: 'BR-005',
    check: (station, result, cfg = {}) => {
      const minMargin = cfg.designLife?.minMarginYears ?? THRESHOLDS.MIN_DESIGN_LIFE_MARGIN_Y
      const target = result.targetDesignLifeYears
      const pass = result.designLifeYears >= target
      const warn =
        result.designLifeYears >= target &&
        result.designLifeYears < target + minMargin
      return {
        id: 'BR-005',
        label: `Design Life ≥ Target (${target} years)`,
        status: pass ? (warn ? 'warning' : 'pass') : 'fail',
        computed: `${result.designLifeYears.toFixed(1)} years`,
        limit: `≥ ${target} years`,
        recommendation: pass
          ? warn
            ? `Design life margin is only ${(result.designLifeYears - target).toFixed(1)} years. Consider adding 2 anodes for safety.`
            : null
          : `Add anodes or increase anode weight to achieve ${target} year design life.`,
      }
    },
    insight: (station, result, cfg = {}) => {
      const minMargin = cfg.designLife?.minMarginYears ?? THRESHOLDS.MIN_DESIGN_LIFE_MARGIN_Y
      const target = result.targetDesignLifeYears
      if (result.designLifeYears >= target + minMargin) return null
      const additionalAnodesNeeded = Math.ceil(
        (station.anodeSpec.consumptionRate * station.tr.ratedCurrent * target) /
          station.anodeSpec.weightKg -
          station.proposedAnodes +
          1,
      )
      return {
        severity: result.designLifeYears < target ? 'error' : 'warning',
        title:
          result.designLifeYears < target ? 'Design Life Insufficient' : 'Design Life Margin Low',
        message: `Current design achieves ${result.designLifeYears.toFixed(1)} years vs ${target} year target. With ${station.proposedAnodes} anodes at ${station.tr.ratedCurrent}A continuous output.`,
        recommendations: [
          `Add ${Math.max(1, additionalAnodesNeeded)} anodes to achieve target life with margin.`,
          `Consider heavier anode specification (e.g., TA-4 → TA-6 if available).`,
          `If TR is oversized, reduce rated current to extend anode life.`,
        ],
        calculationRef: 'Design Life',
      }
    },
  },

  // BR-006: Remoteness Check (auto-computed per SAES-X-400)
  {
    id: 'BR-006',
    check: (station, result, cfg = {}) => {
      const minRemoteness = cfg.groundbed?.minRemotenessM ?? THRESHOLDS.MIN_REMOTENESS_M
      const actual = result?.actualRemotenesM !== undefined ? result.actualRemotenesM : station.actualRemotenesM
      const required = result?.requiredRemotenesM !== undefined ? result.requiredRemotenesM : (calcRequiredRemotenessM(
        station.tr.ratedCurrent,
        station.soilResistivityOhmCm,
      ) ?? minRemoteness)
      const pass = actual >= required
      return {
        id: 'BR-006',
        label: `Groundbed Remoteness ≥ ${required}m (SAES-X-400)`,
        status: pass ? 'pass' : 'fail',
        computed: `${actual}m actual`,
        limit: `≥ ${required}m`,
        recommendation: pass
          ? null
          : `Groundbed location must be moved to ≥${required}m from pipeline.`,
      }
    },
    insight: (station, result, cfg = {}) => {
      const minRemoteness = cfg.groundbed?.minRemotenessM ?? THRESHOLDS.MIN_REMOTENESS_M
      const actual = result?.actualRemotenesM !== undefined ? result.actualRemotenesM : station.actualRemotenesM
      const required = result?.requiredRemotenesM !== undefined ? result.requiredRemotenesM : (calcRequiredRemotenessM(
        station.tr.ratedCurrent,
        station.soilResistivityOhmCm,
      ) ?? minRemoteness)
      if (actual >= required) return null
      return {
        severity: 'error',
        title: 'Groundbed Too Close to Pipeline',
        message: `Actual distance (${actual}m) is less than the required minimum (${required}m) per SAES-X-400. This can cause current channelling and coating damage.`,
        recommendations: [
          `Relocate groundbed to achieve ≥${required}m separation.`,
          `Verify remoteness calculation accounts for all pipeline routes in the area.`,
        ],
        calculationRef: 'Groundbed Remoteness',
      }
    },
  },
]

// ─── Proactive Engineering Insights (not tied to PASS/FAIL) ──────────────────

const PROACTIVE_INSIGHT_RULES = [
  // High soil resistivity warning
  (station, result, cfg = {}) => {
    const rt = cfg.groundbed?.resistivityThresholds || {}
    const highRho = rt.high ?? THRESHOLDS.HIGH_SOIL_RESISTIVITY
    const veryHighRho = rt.veryHigh ?? THRESHOLDS.VERY_HIGH_SOIL_RESISTIVITY
    const rho = station.soilResistivityOhmCm
    if (rho < highRho) return null
    const classification = getSoilClassification(rho)
    return {
      severity: rho > veryHighRho ? 'error' : 'warning',
      title: 'High Soil Resistivity Detected',
      message: `Soil resistivity is ${rho} Ω·cm (${classification.label}). This significantly increases groundbed resistance and may require a larger TR and more anodes than typical installations.`,
      recommendations: [
        rho > veryHighRho
          ? `Very high resistivity. Deepwell groundbed reaching ≥60m depth is strongly recommended.`
          : `Consider deepwell groundbed to access deeper, lower-resistivity soil strata.`,
        `Perform multi-layer soil resistivity survey using Wenner method.`,
        `Consider use of carbonaceous backfill to enhance electrode contact.`,
        `MMO anodes may be more efficient at this resistivity level.`,
      ],
      calculationRef: 'Soil Analysis',
    }
  },

  // TR current headroom
  (station, result) => {
    if (!result) return null
    const headroom = station.tr.ratedCurrent - result.designCurrentA
    const headroomPct = (headroom / station.tr.ratedCurrent) * 100
    if (headroomPct >= 20) return null
    return {
      severity: 'warning',
      title: 'Low TR Current Headroom',
      message: `Design current (${result.designCurrentA.toFixed(1)}A) is ${headroomPct.toFixed(0)}% below TR rated current (${station.tr.ratedCurrent}A). Little room for increased protection demand over time.`,
      recommendations: [
        `Consider upgrading to next TR size for operational flexibility.`,
        `Account for coating deterioration increasing current demand over time.`,
      ],
      calculationRef: 'TR Sizing',
    }
  },

  // High operating temperature
  (station) => {
    const maxTemp = Math.max(...station.pipelineSegments.map((s) => s.opTempC))
    if (maxTemp <= 60) return null
    return {
      severity: 'warning',
      title: 'Elevated Operating Temperature',
      message: `Pipeline operating temperature (${maxTemp}°C) is above 60°C. Current density assumptions may be conservative. Higher temperatures accelerate coating degradation.`,
      recommendations: [
        `Verify current density basis with operating data at this temperature.`,
        `Apply additional safety factor to current requirement calculation.`,
        `Monitor coating condition closely in high-temperature sections.`,
      ],
      calculationRef: 'Current Requirement',
    }
  },
]

// ─── Main Rules Engine API ────────────────────────────────────────────────────

/**
 * Run all validation rules against a station and its calculation results.
 * @param {import('../../types').Station} station
 * @param {import('../../types').CalcResult} result
 * @param {object|null} [standardConfig=null] - Active standard configuration
 * @returns {{ checks: ValidationCheck[], insights: EngineeringInsight[], allPassed: boolean }}
 */
export function runRules(station, result, standardConfig = null) {
  // Resolve standard-driven thresholds with fallback to THRESHOLDS defaults
  const cfg = standardConfig || {}

  const checks = VALIDATION_RULES.map((rule) => rule.check(station, result, cfg))

  const ruleInsights = VALIDATION_RULES.map((rule) => rule.insight(station, result, cfg)).filter(Boolean)

  const proactiveInsights = PROACTIVE_INSIGHT_RULES.map((fn) => fn(station, result, cfg)).filter(Boolean)

  const insights = [...ruleInsights, ...proactiveInsights]
  const allPassed = checks.every((c) => c.status === 'pass' || c.status === 'warning')

  return { checks, insights, allPassed }
}
