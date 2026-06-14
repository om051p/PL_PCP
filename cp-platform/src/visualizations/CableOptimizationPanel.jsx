/**
 * CableOptimizationPanel.jsx
 *
 * Side panel widget showing cable optimization suggestions.
 * "If you increase X to Y, expected ΔV = ..."
 */

import { useMemo } from 'react'
import { describeCableSegments } from './cableVoltage.js'
import { OptimizationSuggestion } from './shared/OptimizationSuggestion.jsx'

const CABLE_SPECS_MAP = {
  16: { area: 16, resistanceFactor: 1.0 },
  25: { area: 25, resistanceFactor: 0.64 },
  35: { area: 35, resistanceFactor: 0.46 },
  50: { area: 50, resistanceFactor: 0.32 },
  70: { area: 70, resistanceFactor: 0.23 },
  95: { area: 95, resistanceFactor: 0.17 },
  120: { area: 120, resistanceFactor: 0.13 },
}

function getNextCableSize(currentMm2) {
  const sizes = Object.keys(CABLE_SPECS_MAP).map(Number).sort((a, b) => a - b)
  const idx = sizes.findIndex((s) => s >= currentMm2)
  return idx < sizes.length - 1 ? sizes[idx + 1] : null
}

/**
 * @param {object} props
 * @param {object} props.station - Station object
 */
export function CableOptimizationPanel({ station }) {
  const segments = useMemo(() => describeCableSegments(station), [station])
  const r = station?.lastCalcResult

  if (!segments?.length || !r) return null

  // Find the worst cable segment
  const worstSegment = segments
    .filter((s) => s.fractionOfRated != null && s.fractionOfRated > 0.05)
    .sort((a, b) => (b.fractionOfRated || 0) - (a.fractionOfRated || 0))[0]

  if (!worstSegment) return null

  // Calculate improvement for next cable size
  const currentMm2 = worstSegment.cableMm2 || 35
  const nextMm2 = getNextCableSize(currentMm2)

  if (!nextMm2) return null

  const currentResistance = worstSegment.resistanceOhm || 0
  const improvementFactor = CABLE_SPECS_MAP[currentMm2]
    ? CABLE_SPECS_MAP[nextMm2].resistanceFactor / CABLE_SPECS_MAP[currentMm2].resistanceFactor
    : 0.7
  const newResistance = currentResistance * improvementFactor
  const deltaR = newResistance - currentResistance

  const currentA = r.currentA || r.operatingCurrentA || 1
  const deltaV = deltaR * currentA

  const current = [
    { label: worstSegment.label, value: `${currentMm2} mm²` },
    { label: 'Resistance', value: worstSegment.resistanceOhm != null ? `${(worstSegment.resistanceOhm * 1000).toFixed(1)} mΩ` : '—' },
  ]

  const suggested = [
    { label: worstSegment.label, value: `${nextMm2} mm²` },
    { label: 'Resistance', value: `${(newResistance * 1000).toFixed(1)} mΩ` },
  ]

  const improvements = [
    { label: 'Voltage Drop', delta: `${(deltaV * 1000).toFixed(1)} mV`, positive: deltaV < 0 },
    { label: 'Resistance', delta: `${(deltaR * 1000).toFixed(2)} mΩ`, positive: deltaR < 0 },
  ]

  return (
    <OptimizationSuggestion
      title="Cable Optimization"
      current={current}
      suggested={suggested}
      improvements={improvements}
    />
  )
}
