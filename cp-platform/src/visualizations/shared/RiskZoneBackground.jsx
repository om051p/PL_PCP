/**
 * RiskZoneBackground.jsx
 *
 * Renders colored horizontal background bands behind a recharts chart
 * to indicate risk zones (green/yellow/orange/red) based on engineering criteria.
 *
 * Used in attenuation analysis to show protection levels.
 */

import { ReferenceArea } from 'recharts'

const ZONE_COLORS = {
  pass: { fill: 'rgba(34, 197, 94, 0.06)', label: 'Protected' },
  warn: { fill: 'rgba(245, 158, 11, 0.06)', label: 'Marginal' },
  fail: { fill: 'rgba(239, 68, 68, 0.06)', label: 'Unprotected' },
  critical: { fill: 'rgba(220, 38, 38, 0.10)', label: 'Critical' },
}

/**
 * @param {object} props
 * @param {number} props.y1 - Bottom of the zone
 * @param {number} props.y2 - Top of the zone
 * @param {'pass'|'warn'|'fail'|'critical'} props.zone - Risk level
 * @param {boolean} [props.showLabel=true] - Show zone label
 */
export function RiskZoneBackground({ y1, y2, zone = 'pass', showLabel = true }) {
  const config = ZONE_COLORS[zone] || ZONE_COLORS.pass

  return (
    <ReferenceArea
      y1={y1}
      y2={y2}
      fill={config.fill}
      fillOpacity={1}
      label={
        showLabel
          ? {
              value: config.label,
              position: 'insideTopRight',
              fontSize: 9,
              fill: zone === 'pass' ? '#22c55e' : zone === 'warn' ? '#f59e0b' : '#ef4444',
              fontWeight: 600,
            }
          : undefined
      }
    />
  )
}

/**
 * RiskZoneBands — renders all risk zones for an attenuation chart.
 *
 * @param {object} props
 * @param {number} props.protectedMin - Minimum mV for full protection (e.g. 850)
 * @param {number} props.warningMin - Minimum mV for warning zone (e.g. 750)
 * @param {number} props.criticalMin - Minimum mV for critical zone (e.g. 650)
 * @param {number} props.chartMax - Maximum Y value for chart
 */
export function RiskZoneBands({ protectedMin = 850, warningMin = 750, criticalMin = 650, chartMax }) {
  const max = chartMax || protectedMin + 300

  return (
    <>
      <RiskZoneBackground y1={protectedMin} y2={max} zone="pass" />
      {warningMin && <RiskZoneBackground y1={warningMin} y2={protectedMin} zone="warn" />}
      {criticalMin && warningMin && (
        <RiskZoneBackground y1={criticalMin} y2={warningMin} zone="fail" />
      )}
      {criticalMin && <RiskZoneBackground y1={-1200} y2={criticalMin} zone="critical" showLabel={false} />}
    </>
  )
}
