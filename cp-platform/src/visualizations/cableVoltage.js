/**
 * Cable voltage drop classifier and helpers.
 *
 * Pure functions — consumes the existing `station.cables`, `station.tr`,
 * and `station.lastCalcResult` shapes and returns engineering values
 * that the visualizer renders. No engineering formulas are evaluated
 * here beyond Ohm's law (V = I × R) which is a direct read of existing
 * numbers, not a recalculation of the design.
 *
 * Status thresholds (industry-standard, per NACE SP0169 / IEEE 837):
 *   - green  : voltage drop <  5 % of TR rated voltage
 *   - amber  : 5 % <= drop < 10 %
 *   - red    : drop >= 10 %
 *   - draft  : inputs missing or no calculation result
 */

/** Thresholds expressed as fraction of TR rated voltage. */
export const VOLTAGE_DROP_THRESHOLDS = Object.freeze({
  warn: 0.05, //  5%
  fail: 0.10, // 10%
})

export const CABLE_STATUS_LABELS = Object.freeze({
  ok: 'Within limit',
  warn: 'Approaching limit',
  fail: 'Exceeds limit',
  draft: 'Not calculated',
  unknown: '—',
})

/**
 * Classify a voltage drop percentage into a status bucket.
 * @param {number|null|undefined} pct - Drop as fraction of TR rated (0.05 = 5%)
 * @returns {'ok'|'warn'|'fail'|'draft'}
 */
export function classifyVoltageDrop(pct) {
  if (pct == null || !Number.isFinite(pct)) return 'draft'
  if (pct < 0) return 'draft'
  if (pct >= VOLTAGE_DROP_THRESHOLDS.fail) return 'fail'
  if (pct >= VOLTAGE_DROP_THRESHOLDS.warn) return 'warn'
  return 'ok'
}

/**
 * Compute voltage drop (volts) and as a fraction of TR rated voltage.
 * Uses Ohm's law: V = I × R.
 *
 * @param {number} resistanceOhm  - Cable resistance (Ω)
 * @param {number} currentA        - Operating current (A)
 * @param {number} ratedVoltage    - TR rated voltage (V)
 * @returns {{voltageDropV: number, fractionOfRated: number, status: string}}
 */
export function computeVoltageDrop(resistanceOhm, currentA, ratedVoltage) {
  if (
    resistanceOhm == null ||
    currentA == null ||
    ratedVoltage == null ||
    ratedVoltage <= 0 ||
    !Number.isFinite(resistanceOhm) ||
    !Number.isFinite(currentA)
  ) {
    return { voltageDropV: null, fractionOfRated: null, status: 'draft' }
  }
  const v = resistanceOhm * currentA
  const frac = ratedVoltage > 0 ? v / ratedVoltage : null
  return { voltageDropV: v, fractionOfRated: frac, status: classifyVoltageDrop(frac) }
}

/**
 * Build a list of cable segments with their computed voltage drop.
 * Pure inspection of the existing engine output — no recomputation.
 *
 * @param {object} station - Active station from the project store
 * @returns {Array<{id,label,resistanceOhm,lengthM,sizeMm2,voltageDropV,fractionOfRated,status}>}
 */
export function describeCableSegments(station) {
  const r = station?.lastCalcResult
  const cb = station?.cables
  const tr = station?.tr
  if (!r || !cb || !tr) return []
  const I = Number(tr.ratedCurrent) || 0
  const V = Number(tr.ratedVoltage) || 0

  const segs = [
    {
      id: 'anode-tail',
      label: 'Anode tail cables (parallel)',
      resistanceOhm: r.anodeTailParallelResOhm,
      lengthM: Array.isArray(cb.anodeTailLengths)
        ? cb.anodeTailLengths.reduce((a, b) => a + (Number(b) || 0), 0)
        : 0,
      sizeMm2: cb.anodeCableSizeMm2,
    },
    {
      id: 'pos-main',
      label: 'Positive main cable',
      resistanceOhm: r.posMainCableResOhm,
      lengthM: Number(cb.posMainLengthM) || 0,
      sizeMm2: cb.posMainSizeMm2,
    },
    {
      id: 'neg-main',
      label: 'Negative main cable',
      resistanceOhm: r.negMainCableResOhm,
      lengthM: (Number(cb.negMainLengthM) || 0) + (Number(cb.negSecLengthM) || 0),
      sizeMm2: cb.negMainSizeMm2,
    },
  ]
  return segs.map((s) => {
    const drop = computeVoltageDrop(s.resistanceOhm, I, V)
    return {
      ...s,
      voltageDropV: drop.voltageDropV,
      fractionOfRated: drop.fractionOfRated,
      status: drop.status,
    }
  })
}

/**
 * Status of the total circuit voltage margin.
 * @param {object} result - lastCalcResult
 * @returns {'ok'|'warn'|'fail'|'draft'}
 */
export function classifyCircuitMargin(result) {
  if (!result?.minTRVoltage || !result?.trRatedVoltage) return 'draft'
  const margin = result.minTRVoltage / (Number(result.trRatedVoltage) || 1)
  if (margin > 1) return 'fail' // need more voltage than TR can provide
  if (margin > 0.85) return 'warn' // tight
  return 'ok'
}
