/**
 * M12 — Risk Engine
 * riskEngine.js — Risk = Consequence × Likelihood matrix
 *
 * Both Consequence and Likelihood are derived from design data only.
 * No telemetry fields at this stage.
 *
 * Future hook: live telemetry updates risk dynamically (M15/M16).
 *
 * PROTECTED: No engineering formula changes. Reads from lastCalcResult and
 *            station design parameters only.
 */

// ─── Risk Matrix ──────────────────────────────────────────────────────────────

/**
 * Risk level classification based on R = C × L score (1–25 range).
 */
export const RISK_LEVELS = {
  LOW:      { label: 'Low',      color: 'var(--pass, #22c55e)',   min: 1,  max: 4  },
  MEDIUM:   { label: 'Medium',   color: 'var(--warn, #eab308)',   min: 5,  max: 9  },
  HIGH:     { label: 'High',     color: '#f97316',                min: 10, max: 16 },
  CRITICAL: { label: 'Critical', color: 'var(--fail, #ef4444)',   min: 17, max: 25 },
}

/**
 * Get the risk level for an R score.
 * @param {number} score — 1–25
 * @returns {{ label, color, min, max }}
 */
export function getRiskLevel(score) {
  for (const level of Object.values(RISK_LEVELS)) {
    if (score >= level.min && score <= level.max) return level
  }
  return RISK_LEVELS.LOW
}

// ─── Consequence Scoring (1–5) ────────────────────────────────────────────────

/**
 * Score consequence of CP failure (1 = low, 5 = catastrophic).
 * Based on pipeline type, design current, and segment characteristics.
 *
 * @param {object} station
 * @param {object} project
 * @returns {{ score: number, factors: object }}
 */
function scoreConsequence(station, project) {
  let score = 1
  const factors = {}

  // Factor 1: Total design current (proxy for pipeline size/importance)
  const currentA = station.lastCalcResult?.totalCurrentRequired ?? 0
  if (currentA > 20) { score += 2; factors.highCurrent = 'Large system (> 20A current requirement)' }
  else if (currentA > 8) { score += 1; factors.mediumCurrent = 'Medium system (> 8A current requirement)' }

  // Factor 2: Pipeline length (longer = higher consequence if unprotected)
  const totalLengthM = (station.pipelineSegments ?? []).reduce((s, seg) => s + (seg.lengthM ?? 0), 0)
  if (totalLengthM > 10000) { score += 1; factors.longPipeline = 'Long pipeline route (> 10 km)' }

  // Factor 3: Design life (longer commitment = higher consequence of failure)
  const designLife = project?.designBasis?.systemDesignLifeYears ?? 0
  if (designLife > 30) { score += 1; factors.longDesignLife = 'Extended design life (> 30 years)' }

  return { score: Math.min(5, score), factors }
}

// ─── Likelihood Scoring (1–5) ─────────────────────────────────────────────────

/**
 * Score likelihood of CP inadequacy occurring (1 = unlikely, 5 = near certain).
 * Based on design margins, validation results, and soil aggressiveness.
 *
 * @param {object} station
 * @param {object} project
 * @returns {{ score: number, factors: object }}
 */
function scoreLikelihood(station, project) {
  let score = 1
  const factors = {}

  // Factor 1: TR voltage margin
  const rated = station.tr?.ratedVoltageV
  const required = station.lastCalcResult?.trMinVoltage
  if (rated && required && required > 0) {
    const ratio = rated / required
    if (ratio < 1.25) { score += 3; factors.trUndersized = 'TR voltage below minimum margin (< 1.25×)' }
    else if (ratio < 1.5) { score += 2; factors.trLowMargin = 'TR voltage margin low (< 1.5×)' }
    else if (ratio < 2.0) { score += 1; factors.trModerateMargin = 'TR voltage margin moderate (< 2.0×)' }
  } else {
    score += 1
    factors.trUnknown = 'TR data missing — cannot verify margin'
  }

  // Factor 2: Soil aggressiveness (low resistivity = high corrosion rate)
  const resistivityOhmCm = station.soilResistivityOhmCm ?? Infinity
  if (resistivityOhmCm < 1000) { score += 2; factors.aggressiveSoil = 'Highly aggressive soil (ρ < 1,000 Ω·cm)' }
  else if (resistivityOhmCm < 3000) { score += 1; factors.moderatelySoil = 'Aggressive soil (ρ < 3,000 Ω·cm)' }

  // Factor 3: Validation failures
  const checks = station.lastCalcResult?.checks ?? []
  const failCount = checks.filter((c) => c.status === 'fail').length
  const warnCount = checks.filter((c) => c.status === 'warn').length
  if (failCount > 0) { score += 2; factors.validationFails = `${failCount} validation failure(s)` }
  else if (warnCount > 1) { score += 1; factors.validationWarns = `${warnCount} validation warning(s)` }

  // Factor 4: Anode life shortfall
  const anodeLife = station.lastCalcResult?.designLifeYears ?? 0
  const projectLife = project?.designBasis?.systemDesignLifeYears ?? 0
  if (projectLife > 0 && anodeLife < projectLife) {
    score += 2
    factors.anodeLifeShortfall = `Anode life ${anodeLife.toFixed(1)}y < ${projectLife}y project life`
  }

  return { score: Math.min(5, score), factors }
}

// ─── Main Risk Assessment ─────────────────────────────────────────────────────

/**
 * Compute the full risk assessment for a station.
 *
 * @param {object} station — station object from project state
 * @param {object} project — active project
 * @returns {RiskAssessmentResult}
 */
export function computeRiskAssessment(station, project) {
  if (!station) {
    return {
      consequence: { score: 1, factors: {} },
      likelihood: { score: 1, factors: {} },
      riskScore: 1,
      riskLevel: RISK_LEVELS.LOW,
      computedAt: new Date().toISOString(),
    }
  }

  const consequence = scoreConsequence(station, project)
  const likelihood = scoreLikelihood(station, project)
  const riskScore = consequence.score * likelihood.score
  const riskLevel = getRiskLevel(riskScore)

  return {
    consequence,
    likelihood,
    riskScore,
    riskLevel,
    computedAt: new Date().toISOString(),
  }
}

/**
 * Compute risk assessments for all stations in a project.
 *
 * @param {object} project
 * @returns {Record<stationId, RiskAssessmentResult>}
 */
export function computeProjectRiskAssessments(project) {
  const risks = {}
  for (const station of project?.stations ?? []) {
    risks[station.id] = computeRiskAssessment(station, project)
  }
  return risks
}

/**
 * Get the highest risk level across all stations in a project.
 *
 * @param {Record<stationId, RiskAssessmentResult>} riskMap
 * @returns {string} — risk level label of the worst station
 */
export function getProjectWorstRisk(riskMap) {
  let worstScore = 0
  for (const result of Object.values(riskMap)) {
    if (result.riskScore > worstScore) worstScore = result.riskScore
  }
  return getRiskLevel(worstScore)
}
