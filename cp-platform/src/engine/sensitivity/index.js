/**
 * sensitivity/index.js
 *
 * Read-only sensitivity analysis module. Given a base station + life + project,
 * produces three classes of analysis:
 *
 *   - computeTornado(station, life, project, output, inputs, pctPerturbation)
 *       Rank-orders inputs by impact on a chosen output. Used by the Tornado
 *       diagram visualization.
 *
 *   - computeSweep(station, life, project, field, range, samples)
 *       One-at-a-time sweep of a single input across a [min, max] range.
 *       Used by the Sweep chart visualization.
 *
 *   - computeScenarioComparison(station, life, project, scenarios, outputs)
 *       Run a list of named scenarios and compare outputs. Used by the Radar
 *       chart visualization.
 *
 * All functions are PURE: they do not mutate the input station or project.
 * They construct deep copies, perturb, and re-run runStationCalculations.
 */

import { runStationCalculations } from '../modules/calculations.js'
import { INPUT_LINKS } from '../inputLinkRegistry.js'

// ─── Default perturbed inputs ──────────────────────────────────────────────
// These are the designBasis fields + station-level fields that we perturb in
// the Tornado by default. Each entry has a `path` getter that returns a new
// copy with the field perturbed.

const DEFAULT_PERTURBABLE = [
  { id: 'soilResistivityOhmCm', path: ['soilResistivityOhmCm'], apply: (s, v) => { s.soilResistivityOhmCm = v } },
  { id: 'backEmfV', path: ['designBasis', 'backEmfV'], apply: (s, v, p) => { p.designBasis.backEmfV = v } },
  { id: 'structureResistanceOhm', path: ['designBasis', 'structureResistanceOhm'], apply: (s, v, p) => { p.designBasis.structureResistanceOhm = v } },
  { id: 'trEfficiencyPct', path: ['designBasis', 'trEfficiencyPct'], apply: (s, v, p) => { p.designBasis.trEfficiencyPct = v } },
  { id: 'cokeContingencyPct', path: ['designBasis', 'cokeContingencyPct'], apply: (s, v, p) => { p.designBasis.cokeContingencyPct = v } },
  { id: 'systemDesignLifeYears', path: ['designBasis', 'systemDesignLifeYears'], apply: (s, v, p) => { p.designBasis.systemDesignLifeYears = v } },
  { id: 'groundbed.anodeLengthM', path: ['groundbed', 'anodeLengthM'], apply: (s, v) => { s.groundbed.anodeLengthM = v } },
  { id: 'groundbed.boreholeDiaM', path: ['groundbed', 'boreholeDiaM'], apply: (s, v) => { s.groundbed.boreholeDiaM = v } },
  { id: 'groundbed.startDepthM', path: ['groundbed', 'startDepthM'], apply: (s, v) => { s.groundbed.startDepthM = v } },
  { id: 'proposedAnodes', path: ['proposedAnodes'], apply: (s, v) => { s.proposedAnodes = v } },
]

// ─── Default observable outputs ────────────────────────────────────────────
const DEFAULT_OUTPUTS = [
  { id: 'groundbedResistanceOhm', label: 'Groundbed Resistance (R_G)', unit: 'Ω' },
  { id: 'totalCircuitResistanceOhm', label: 'Total Circuit Resistance (R_T)', unit: 'Ω' },
  { id: 'minTRVoltage', label: 'Min TR Voltage (V_min)', unit: 'V' },
  { id: 'designLifeYears', label: 'Design Life', unit: 'years' },
  { id: 'cokeBagsWithContingency', label: 'Coke Bags', unit: 'bags' },
  { id: 'requiredCurrentA', label: 'Required Current (I_req)', unit: 'A' },
]

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Deep clone a station + project pair (preserves enough for runStationCalculations).
 */
function clonePair(station, project) {
  return [
    JSON.parse(JSON.stringify(station)),
    project ? JSON.parse(JSON.stringify(project)) : null,
  ]
}

/**
 * Read a nested value via a path array, with safe fallback.
 */
function readPath(obj, path) {
  let cur = obj
  for (const k of path) {
    if (cur == null) return undefined
    cur = cur[k]
  }
  return cur
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Tornado analysis: rank inputs by their impact on a chosen output.
 *
 * @param {object} station - the base station
 * @param {number} life - the design life (years)
 * @param {object} project - the base project (for designBasis overrides)
 * @param {string} outputId - which output to measure (see DEFAULT_OUTPUTS)
 * @param {Array} [inputs] - list of {id, path, apply} to perturb (default: DEFAULT_PERTURBABLE)
 * @param {number} [pct=10] - perturbation percentage (±)
 * @returns {{
 *   output: {id, label, unit},
 *   base: number,
 *   baseStation: object,
 *   rows: Array<{id, label, base, low, high, deltaLowPct, deltaHighPct, range:number}>,
 *   perturbationPct: number
 * }}
 */
export function computeTornado(station, life, project, outputId, inputs = DEFAULT_PERTURBABLE, pct = 10) {
  const output = DEFAULT_OUTPUTS.find((o) => o.id === outputId) || { id: outputId, label: outputId, unit: '' }

  // Base result
  const [baseStation] = clonePair(station, project)
  const baseResult = runStationCalculations(baseStation, life, null, project)
  const base = baseResult[outputId] ?? 0

  // For each input, perturb ±pct% and measure the output
  const rows = inputs.map((input) => {
    const baseValue = readPath(station, input.path)
    if (baseValue == null || isNaN(baseValue) || baseValue === 0) {
      return {
        id: input.id,
        label: INPUT_LINKS[input.id.split('.')[0]]?.label || input.id,
        base: 0,
        low: 0,
        high: 0,
        deltaLowPct: 0,
        deltaHighPct: 0,
        range: 0,
        skipped: true,
      }
    }
    const lowValue = baseValue * (1 - pct / 100)
    const highValue = baseValue * (1 + pct / 100)

    // Low perturbation
    const [sLow, pLow] = clonePair(station, project)
    input.apply(sLow, lowValue, pLow)
    const lowResult = runStationCalculations(sLow, life, null, pLow)
    const low = lowResult[outputId] ?? 0

    // High perturbation
    const [sHigh, pHigh] = clonePair(station, project)
    input.apply(sHigh, highValue, pHigh)
    const highResult = runStationCalculations(sHigh, life, null, pHigh)
    const high = highResult[outputId] ?? 0

    const deltaLowPct = base !== 0 ? ((low - base) / base) * 100 : 0
    const deltaHighPct = base !== 0 ? ((high - base) / base) * 100 : 0
    const range = Math.abs(high - low)

    return {
      id: input.id,
      label: INPUT_LINKS[input.id.split('.')[0]]?.label || input.id,
      base: baseValue,
      lowValue,
      highValue,
      low,
      high,
      deltaLowPct,
      deltaHighPct,
      range,
    }
  })

  // Sort by range descending (largest impact first)
  rows.sort((a, b) => b.range - a.range)

  return {
    output,
    base,
    baseStation: station,
    rows,
    perturbationPct: pct,
  }
}

/**
 * One-at-a-time sweep: vary a single input across a range and observe outputs.
 *
 * @param {object} station
 * @param {number} life
 * @param {object} project
 * @param {string} inputId - id of the input (must be in DEFAULT_PERTURBABLE)
 * @param {Array<[number, number]>} range - [min, max] inclusive
 * @param {number} [samples=20] - number of sample points
 * @param {Array} [outputIds] - which outputs to observe (default: DEFAULT_OUTPUTS)
 * @returns {{
 *   input: {id, label, unit},
 *   range: [number, number],
 *   samples: number,
 *   data: Array<{x: number, results: Record<string, number>}>,
 *   outputs: Array<{id, label, unit}>,
 * }}
 */
export function computeSweep(station, life, project, inputId, range, samples = 20, outputIds = DEFAULT_OUTPUTS.map((o) => o.id)) {
  const input = DEFAULT_PERTURBABLE.find((i) => i.id === inputId)
  if (!input) throw new Error(`Unknown input for sweep: ${inputId}`)

  const [min, max] = range
  const step = (max - min) / (samples - 1)
  const data = []
  for (let i = 0; i < samples; i++) {
    const x = min + step * i
    const [s, p] = clonePair(station, project)
    input.apply(s, x, p)
    const result = runStationCalculations(s, life, null, p)
    const results = {}
    outputIds.forEach((id) => { results[id] = result[id] ?? 0 })
    data.push({ x, results })
  }
  return {
    input: { id: input.id, label: INPUT_LINKS[input.id.split('.')[0]]?.label || input.id, unit: '' },
    range,
    samples,
    data,
    outputs: DEFAULT_OUTPUTS.filter((o) => outputIds.includes(o.id)),
  }
}

/**
 * Scenario comparison: run a list of named scenarios and compare outputs.
 * A scenario is { name, station, life, project } — allows arbitrary alternatives.
 *
 * @param {Array<{name: string, station: object, life: number, project: object}>} scenarios
 * @param {Array} [outputIds]
 * @returns {{
 *   scenarios: Array<{name, results: Record<string, number>}>,
 *   outputs: Array<{id, label, unit}>,
 * }}
 */
export function computeScenarioComparison(scenarios, outputIds = DEFAULT_OUTPUTS.map((o) => o.id)) {
  const out = scenarios.map((sc) => {
    const r = runStationCalculations(sc.station, sc.life, null, sc.project)
    const results = {}
    outputIds.forEach((id) => { results[id] = r[id] ?? 0 })
    return { name: sc.name, results }
  })
  return {
    scenarios: out,
    outputs: DEFAULT_OUTPUTS.filter((o) => outputIds.includes(o.id)),
  }
}

/**
 * Get the list of available inputs / outputs for the UI.
 */
export function getAvailableInputs() {
  return DEFAULT_PERTURBABLE.map((i) => ({
    id: i.id,
    label: INPUT_LINKS[i.id.split('.')[0]]?.label || i.id,
    path: i.path,
  }))
}

export function getAvailableOutputs() {
  return DEFAULT_OUTPUTS
}

export { DEFAULT_PERTURBABLE, DEFAULT_OUTPUTS }
