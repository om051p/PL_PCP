/**
 * GroundbedGaugeRow.jsx
 *
 * Row of 4 engineering gauges for groundbed health indicators:
 * Current Density, Resistance Margin, Life Margin, Failure Risk.
 */

import { GaugeRow } from './shared/EngineeringGauge.jsx'

/**
 * @param {object} props
 * @param {object} props.result - Last calculation result (station.lastCalcResult)
 * @param {object} props.groundbed - Groundbed config
 * @param {object} props.project - Project object for design basis
 */
export function GroundbedGaugeRow({ result, groundbed, project }) {
  if (!result) return null

  const db = project?.designBasis || {}
  const targetLife = db.systemDesignLifeYears || 25

  // Current density (A/m²)
  const currentDensity = result.currentDensityAm2 || result.currentDensity || 0
  const maxCurrentDensity = groundbed?.type === 'deepwell' ? 1.5 : 1.0

  // Resistance margin
  const rg = result.groundbedResistanceOhm || 0
  const maxRg = result.maxAllowableGroundbedRes || Infinity
  const resistanceMargin = maxRg !== Infinity ? ((maxRg - rg) / maxRg) * 100 : 100

  // Life margin
  const designLife = result.designLife || result.designLifeYears || 0
  const lifeMargin = targetLife > 0 ? ((designLife - targetLife) / targetLife) * 100 : 0

  // Failure risk (inverse of life margin, capped 0-100)
  const failureRisk = Math.max(0, Math.min(100, 100 - lifeMargin))

  const gauges = [
    {
      label: 'Current Density',
      value: currentDensity,
      min: 0,
      max: maxCurrentDensity,
      unit: 'A/m²',
      status: currentDensity > maxCurrentDensity * 0.8 ? 'warn' : 'pass',
    },
    {
      label: 'R_G Margin',
      value: resistanceMargin,
      min: 0,
      max: 100,
      unit: '%',
      status: resistanceMargin < 20 ? 'fail' : resistanceMargin < 50 ? 'warn' : 'pass',
    },
    {
      label: 'Life Margin',
      value: lifeMargin,
      min: -50,
      max: 100,
      unit: '%',
      status: lifeMargin < 0 ? 'fail' : lifeMargin < 20 ? 'warn' : 'pass',
    },
    {
      label: 'Failure Risk',
      value: 100 - failureRisk,
      min: 0,
      max: 100,
      unit: '',
      status: failureRisk > 60 ? 'fail' : failureRisk > 30 ? 'warn' : 'pass',
    },
  ]

  return <GaugeRow gauges={gauges} gap={16} />
}
