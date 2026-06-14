/**
 * SoilImpactPanel.jsx
 *
 * Side panel widget showing how soil resistivity affects downstream modules.
 */

import { Droplets, Cable, Layers, Route, Shield } from 'lucide-react'

const IMPACT_ITEMS = [
  { module: 'Groundbed Design', icon: Layers, field: 'R_G', description: 'Higher ρ → higher groundbed resistance' },
  { module: 'Cable Resistance', icon: Cable, field: 'Earth Return', description: 'Higher ρ → higher earth return resistance' },
  { module: 'TR Sizing', icon: Shield, field: 'Circuit R', description: 'Higher ρ → higher total circuit resistance' },
  { module: 'Attenuation', icon: Route, field: 'Coating R_L', description: 'Higher ρ → higher coating leakage resistance' },
  { module: 'Anode Life', icon: Droplets, field: 'Current demand', description: 'Higher ρ → higher current requirement' },
]

function getImpactStatus(resistivityOhmCm) {
  if (resistivityOhmCm < 1000) return 'pass'
  if (resistivityOhmCm < 3000) return 'warn'
  return 'fail'
}

const STATUS_COLORS = {
  pass: 'var(--pass, #22c55e)',
  warn: 'var(--warn, #f59e0b)',
  fail: 'var(--fail, #ef4444)',
}

/**
 * @param {object} props
 * @param {number} props.resistivityOhmCm - Design soil resistivity
 */
export function SoilImpactPanel({ resistivityOhmCm }) {
  const status = getImpactStatus(resistivityOhmCm)

  return (
    <div className="viz-side-section">
      <h3 className="viz-side-section-title">Engineering Impact</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {IMPACT_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.module}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '5px 8px',
                background: 'var(--surface)',
                borderRadius: 4,
                fontSize: 11,
              }}
            >
              <Icon size={13} style={{ color: STATUS_COLORS[status], marginTop: 1, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.module}</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{item.description}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: STATUS_COLORS[status], flexShrink: 0 }}>
                {item.field}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
