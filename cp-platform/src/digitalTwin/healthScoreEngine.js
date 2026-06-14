/**
 * M11 — Health Score Engine
 * healthScoreEngine.js — Deterministic 0–100 score from design data
 *
 * PROTECTED: No engineering formula changes. Reads from lastCalcResult only.
 * Factors: TR voltage margin, design life factor, groundbed resistance margin,
 *          rule pass/fail ratio, cable voltage drop margin.
 *
 * Score = weighted average of all factor scores (0–100 per factor).
 * Thresholds: HEALTHY ≥ 75 / WARNING 50–74 / CRITICAL < 50
 */

/**
 * Health score thresholds and labels.
 */
export const HEALTH_THRESHOLDS = {
  HEALTHY:  { min: 75, label: 'Healthy',  color: 'var(--pass, #22c55e)' },
  WARNING:  { min: 50, label: 'Warning',  color: 'var(--warn, #eab308)' },
  CRITICAL: { min: 0,  label: 'Critical', color: 'var(--fail, #ef4444)' },
}

/**
 * Get health status label and color for a score.
 * @param {number} score
 * @returns {{ label: string, color: string }}
 */
export function getHealthStatus(score) {
  if (score >= HEALTH_THRESHOLDS.HEALTHY.min) return HEALTH_THRESHOLDS.HEALTHY
  if (score >= HEALTH_THRESHOLDS.WARNING.min) return HEALTH_THRESHOLDS.WARNING
  return HEALTH_THRESHOLDS.CRITICAL
}

// ─── Factor Weights ───────────────────────────────────────────────────────────

const WEIGHTS = {
  trVoltageMargine: 0.25,
  designLifeFactor: 0.25,
  groundbedResistanceMargine: 0.20,
  rulePassRatio: 0.20,
  cableDropMargine: 0.10,
}

// ─── Individual Factor Scorers ────────────────────────────────────────────────

/**
 * Score TR voltage margin.
 * Ideal: rated voltage ≥ 2× required voltage (ratio ≥ 2.0 → score 100)
 * Minimum: ratio ≥ 1.25 (SAES-X-400 requirement) → score 0 if below
 *
 * @param {object} station
 * @returns {{ score: number, ratio: number|null, label: string }}
 */
function scoreTRVoltage(station) {
  const rated = station.tr?.ratedVoltageV
  const required = station.lastCalcResult?.trMinVoltage

  if (!rated || !required || required <= 0) {
    return { score: 0, ratio: null, label: 'TR data unavailable' }
  }

  const ratio = rated / required

  if (ratio < 1.25) {
    return { score: 0, ratio, label: 'Below minimum margin (< 1.25×)' }
  }

  // Normalize 1.25× → 2.5× to 0–100
  const score = Math.min(100, Math.round(((ratio - 1.25) / (2.5 - 1.25)) * 100))
  return { score, ratio, label: `${ratio.toFixed(2)}× margin` }
}

/**
 * Score design life factor.
 * Asset life must cover design life. Surplus adds margin (better score).
 *
 * @param {object} station
 * @param {object} project
 * @returns {{ score: number, ratio: number|null, label: string }}
 */
function scoreDesignLife(station, project) {
  const anodeLife = station.lastCalcResult?.designLifeYears
  const projectLife = project?.designBasis?.systemDesignLifeYears

  if (!anodeLife || !projectLife || projectLife <= 0) {
    return { score: 0, ratio: null, label: 'Design life data unavailable' }
  }

  const ratio = anodeLife / projectLife

  if (ratio < 1.0) {
    return {
      score: Math.round(ratio * 50), // Partial score if close
      ratio,
      label: `Anode life ${anodeLife.toFixed(1)}y < ${projectLife}y design life`,
    }
  }

  // Normalize 1.0× → 2.0× to 50–100
  const score = Math.min(100, Math.round(50 + ((ratio - 1.0) / 1.0) * 50))
  return { score, ratio, label: `${anodeLife.toFixed(1)} / ${projectLife} years (${ratio.toFixed(2)}×)` }
}

/**
 * Score groundbed resistance margin.
 * SAES-X-400 limit: < 2.0 Ω. Ideal: < 0.5 Ω.
 *
 * @param {object} station
 * @returns {{ score: number, resistanceOhm: number|null, label: string }}
 */
function scoreGroundbedResistance(station) {
  const rg = station.lastCalcResult?.groundbedResistanceOhm

  if (rg == null) {
    return { score: 0, resistanceOhm: null, label: 'Groundbed data unavailable' }
  }

  if (rg > 2.0) {
    return { score: 0, resistanceOhm: rg, label: `${rg.toFixed(3)} Ω — exceeds 2.0 Ω limit` }
  }

  if (rg > 1.0) {
    // 1.0–2.0 Ω: score 25–60
    const score = Math.round(25 + ((2.0 - rg) / 1.0) * 35)
    return { score, resistanceOhm: rg, label: `${rg.toFixed(3)} Ω — above preferred limit` }
  }

  // 0–1.0 Ω: score 60–100
  const score = Math.round(60 + ((1.0 - rg) / 1.0) * 40)
  return { score: Math.min(100, score), resistanceOhm: rg, label: `${rg.toFixed(3)} Ω — good` }
}

/**
 * Score rule pass ratio.
 * All rules pass → 100. Any failures → proportional reduction.
 *
 * @param {object} station
 * @returns {{ score: number, passCount: number, failCount: number, label: string }}
 */
function scoreRules(station) {
  const checks = station.lastCalcResult?.checks ?? []

  if (checks.length === 0) {
    return { score: 0, passCount: 0, failCount: 0, label: 'Not calculated' }
  }

  const passCount = checks.filter((c) => c.status === 'pass').length
  const failCount = checks.filter((c) => c.status === 'fail').length
  const warnCount = checks.filter((c) => c.status === 'warn').length

  // Fails are heavy penalty, warns are light penalty
  const effectivePasses = passCount + warnCount * 0.5
  const total = checks.length
  const score = Math.round((effectivePasses / total) * 100)

  return {
    score,
    passCount,
    failCount,
    warnCount,
    label: `${passCount} pass, ${warnCount} warn, ${failCount} fail`,
  }
}

/**
 * Score cable voltage drop margin.
 * Positive cable: limit 0.5V. Negative cable: limit 0.3V.
 * Score based on how far below the limit we are.
 *
 * @param {object} station
 * @returns {{ score: number, label: string }}
 */
function scoreCableDrop(station) {
  const positiveDrop = station.lastCalcResult?.positiveCableVoltageDrop
  const negativeDrop = station.lastCalcResult?.negativeCableVoltageDrop

  if (positiveDrop == null && negativeDrop == null) {
    return { score: 0, label: 'Cable data unavailable' }
  }

  const scores = []

  if (positiveDrop != null) {
    const LIMIT = 0.5
    if (positiveDrop > LIMIT) {
      scores.push(0)
    } else {
      scores.push(Math.round(((LIMIT - positiveDrop) / LIMIT) * 100))
    }
  }

  if (negativeDrop != null) {
    const LIMIT = 0.3
    if (negativeDrop > LIMIT) {
      scores.push(0)
    } else {
      scores.push(Math.round(((LIMIT - negativeDrop) / LIMIT) * 100))
    }
  }

  const score = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const label = [
    positiveDrop != null ? `+ve drop: ${positiveDrop.toFixed(3)}V` : null,
    negativeDrop != null ? `−ve drop: ${negativeDrop.toFixed(3)}V` : null,
  ].filter(Boolean).join(', ')

  return { score, label }
}

// ─── Main Health Score Function ───────────────────────────────────────────────

/**
 * Compute the full health score for a station.
 * Returns a detailed breakdown plus the composite score.
 *
 * @param {object} station — station object from project state
 * @param {object} project — active project
 * @returns {HealthScoreResult}
 */
export function computeHealthScore(station, project) {
  if (!station) {
    return { score: 0, status: getHealthStatus(0), factors: {}, computedAt: new Date().toISOString() }
  }

  const factors = {
    trVoltageMargine:            scoreTRVoltage(station),
    designLifeFactor:            scoreDesignLife(station, project),
    groundbedResistanceMargine:  scoreGroundbedResistance(station),
    rulePassRatio:               scoreRules(station),
    cableDropMargine:            scoreCableDrop(station),
  }

  // Weighted composite
  const weightedSum = Object.entries(WEIGHTS).reduce((sum, [key, weight]) => {
    return sum + (factors[key]?.score ?? 0) * weight
  }, 0)

  const score = Math.round(Math.max(0, Math.min(100, weightedSum)))
  const status = getHealthStatus(score)

  return {
    score,
    status,
    factors,
    weights: WEIGHTS,
    computedAt: new Date().toISOString(),
  }
}

/**
 * Compute health scores for all stations in a project.
 *
 * @param {object} project
 * @returns {Record<stationId, HealthScoreResult>}
 */
export function computeProjectHealthScores(project) {
  const scores = {}
  for (const station of project?.stations ?? []) {
    scores[station.id] = computeHealthScore(station, project)
  }
  return scores
}
