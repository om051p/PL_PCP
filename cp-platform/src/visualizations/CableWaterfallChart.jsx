/**
 * CableWaterfallChart.jsx
 *
 * Cable Voltage Drop Waterfall Chart.
 *
 * Visualizes the accumulation of voltage drops in the CP circuit,
 * showing how Back EMF, cable segment resistances, structure resistance,
 * and groundbed resistance add up to the total minimum TR voltage (V_min).
 *
 * Consumes lastCalcResult, tr configuration, and design basis values.
 * Read-only — does not execute calculations.
 *
 * M2 — Visualization 2.0
 */

import { useMemo } from 'react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, LabelList
} from 'recharts'

// Custom Tooltip
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 11,
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
        {d?.name}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
        Voltage Contribution: {d?.value?.toFixed(3)} V
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontSize: 10 }}>
        Cumulative Voltage: {d?.range[1]?.toFixed(3)} V
      </div>
    </div>
  )
}

/**
 * @param {object} props
 * @param {object} props.station      - Active station
 * @param {object} props.project      - Active project
 * @param {number} [props.height=320] - Chart height px
 */
export function CableWaterfallChart({ station, project, height = 320 }) {
  const r = station?.lastCalcResult
  const tr = station?.tr

  const isReady = r != null && tr != null

  const chartData = useMemo(() => {
    if (!isReady) return []

    const I = Number(tr.ratedCurrent) || 0
    const backEmfV = project?.designBasis?.backEmfV ?? (Number(tr.backEMF) || 0)
    const r_nc = r.negMainCableResOhm || 0
    const r_s = project?.designBasis?.structureResistanceOhm || 0
    const r_gb = r.groundbedResistanceOhm || 0
    const r_pc = r.posMainCableResOhm || 0
    const r_ac = r.anodeTailParallelResOhm || 0
    const r_emf = r.backEMFResistanceOhm || 0

    // Component voltage drops: V = I * R
    const v_emf_offset = backEmfV
    const v_nc = r_nc * I
    const v_s = r_s * I
    const v_gb = r_gb * I
    const v_pc = r_pc * I
    const v_ac = r_ac * I
    const v_emf_res = r_emf * I

    // Steps of the waterfall
    const steps = [
      { name: 'Back EMF Offset', value: v_emf_offset, color: '#3b82f6' },
      { name: 'Neg. Main Cable', value: v_nc, color: '#6b7280' },
      { name: 'Structure Return', value: v_s, color: '#4b5563' },
      { name: 'Groundbed Earth', value: v_gb, color: '#d97706' },
      { name: 'Pos. Main Cable', value: v_pc, color: '#dc2626' },
      { name: 'Anode Tails', value: v_ac, color: '#f87171' },
      { name: 'Back EMF Res.', value: v_emf_res, color: '#60a5fa' }
    ]

    let cumulative = 0
    const points = []

    steps.forEach((step) => {
      if (step.value <= 0) return // Skip 0 or empty steps
      const start = cumulative
      cumulative += step.value
      points.push({
        name: step.name,
        range: [start, cumulative],
        value: step.value,
        color: step.color
      })
    })

    // Add final total bar
    points.push({
      name: 'Total Required',
      range: [0, cumulative],
      value: cumulative,
      color: 'var(--brand-mid)',
      isTotal: true
    })

    return points
  }, [r, tr, project, isReady])

  if (!isReady) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-tertiary)', fontSize: 13,
      }}>
        Run circuit analysis to see the cable voltage drop waterfall.
      </div>
    )
  }

  const ratedV = Number(tr.ratedVoltage) || 30
  const vMin = r.minTRVoltage
  const isAdequate = ratedV >= vMin

  // Format label inside bars
  const renderLabel = (props) => {
    const { x, y, width, height, value } = props
    if (value == null) return null
    const val = Array.isArray(value) ? value[1] - value[0] : value
    if (val < 0.25) return null // Don't show labels for tiny bars
    return (
      <text
        x={x + width / 2}
        y={y + (height < 20 ? -6 : height / 2 + 4)}
        fill={height < 20 ? 'var(--text-primary)' : '#fff'}
        fontSize={10}
        fontWeight={600}
        textAnchor="middle"
      >
        {val.toFixed(2)}V
      </text>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 16, right: 32, bottom: 24, left: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 2" />

          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            stroke="var(--text-tertiary)"
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            stroke="var(--text-tertiary)"
            label={{ value: 'Voltage Drop / Offset (V)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--text-tertiary)' }}
            width={48}
            domain={[0, Math.max(ratedV * 1.1, vMin * 1.2)]}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* TR Rated Voltage reference line */}
          <ReferenceLine
            y={ratedV}
            stroke="var(--brand-mid)"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{ value: `TR Rated: ${ratedV} V`, position: 'right', fontSize: 9, fill: 'var(--brand-mid)' }}
          />

          {/* V_min reference line */}
          <ReferenceLine
            y={vMin}
            stroke={isAdequate ? 'var(--pass)' : 'var(--fail)'}
            strokeDasharray="3 3"
            strokeWidth={1}
            label={{ value: `V_min: ${vMin?.toFixed(2)} V`, position: 'insideTopLeft', fontSize: 9, fill: isAdequate ? 'var(--pass)' : 'var(--fail)' }}
          />

          <Bar dataKey="range" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            <LabelList dataKey="range" content={renderLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend / Key */}
      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-tertiary)', padding: '4px 8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {chartData.filter(d => !d.isTotal).map((item) => (
          <span key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, background: item.color, display: 'inline-block', borderRadius: 2 }} />
            {item.name} ({item.value.toFixed(2)}V)
          </span>
        ))}
      </div>
    </div>
  )
}
