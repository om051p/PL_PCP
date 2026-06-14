/**
 * TROperatingPointChart.jsx
 *
 * TR Load-Line Operating Point Chart.
 *
 * Shows the TR's load line (V = V_emf + I × R_T) plotted against
 * the TR's rated voltage / current envelope. The intersection of
 * the load line with the I-axis is the required current, and the
 * intersection with the V-axis gives the minimum required TR voltage.
 *
 * The operating point (I_req, V_min) is plotted on the chart,
 * and the rated TR envelope is shown as a shaded region.
 *
 * Read-only — consumes lastCalcResult + station.tr. No engine calls.
 *
 * M2 — Visualization 2.0
 */

import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer, Legend, Dot,
} from 'recharts'

// ─── Custom Operating Point Dot ───────────────────────────────────────────────

function OperatingPointDot(props) {
  const { cx, cy, payload } = props
  if (!payload?.isOperatingPoint) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="var(--brand-mid)" stroke="var(--surface)" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={3} fill="#fff" />
    </g>
  )
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 11,
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginBottom: 4 }}>
        I = {d?.current?.toFixed(2)} A DC
      </div>
      <div style={{ color: 'var(--text-secondary)' }}>
        V<sub>load</sub> = {d?.loadLineV?.toFixed(2)} V
      </div>
      {d?.isOperatingPoint && (
        <div style={{ color: 'var(--brand-mid)', fontWeight: 600, marginTop: 4 }}>
          ← Operating Point
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {object} props.station      - Active station (reads .tr, .lastCalcResult, .designBasis)
 * @param {object} props.project      - Active project (reads .designBasis.backEmfV, .structureResistanceOhm)
 * @param {number} [props.height=320] - Chart height px
 */
export function TROperatingPointChart({ station, project, height = 320 }) {
  const r = station?.lastCalcResult
  const tr = station?.tr

  const isReady = r != null && tr != null

  const chartData = useMemo(() => {
    if (!isReady) return []

    const { minTRVoltage, totalCircuitResistanceOhm } = r
    const backEmfV = project?.designBasis?.backEmfV ?? 0
    const ratedV = Number(tr.ratedVoltage) || 30
    const ratedI = Number(tr.ratedCurrent) || 25

    // Load line: V(I) = V_emf + I × R_T
    // X-axis: current 0 → max(ratedI × 1.3, I_req × 1.3)
    const iMax = Math.max(ratedI * 1.3, (r.designCurrentA || r.requiredCurrentA || ratedI) * 1.4)
    const steps = 60
    const points = []

    for (let i = 0; i <= steps; i++) {
      const current = (iMax / steps) * i
      const loadLineV = backEmfV + current * totalCircuitResistanceOhm
      const isOperatingPoint = i === Math.round((r.designCurrentA ?? r.requiredCurrentA) / iMax * steps)
      points.push({ current, loadLineV, isOperatingPoint })
    }

    return points
  }, [r, tr, project, isReady])

  if (!isReady) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-tertiary)', fontSize: 13,
      }}>
        Run circuit analysis to see the TR operating point chart.
      </div>
    )
  }

  const ratedV = Number(tr.ratedVoltage) || 30
  const ratedI = Number(tr.ratedCurrent) || 25
  const iReq = r.designCurrentA ?? r.requiredCurrentA
  const vMin = r.minTRVoltage
  const margin = ratedV >= vMin ? ((ratedV - vMin) / ratedV * 100).toFixed(1) : null
  const isAdequate = ratedV >= vMin

  return (
    <div>
      {/* KPI strip above chart */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Operating Point', value: `${iReq?.toFixed(2)} A / ${vMin?.toFixed(2)} V` },
          { label: 'TR Rated', value: `${ratedI} A / ${ratedV} V`, accent: 'var(--text-secondary)' },
          {
            label: 'Voltage Margin',
            value: isAdequate ? `+${margin}%` : 'INSUFFICIENT',
            accent: isAdequate ? 'var(--pass)' : 'var(--fail)',
          },
          { label: 'Total R_T', value: `${r.totalCircuitResistanceOhm?.toFixed(4)} Ω` },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            flex: '1 0 120px', background: 'var(--card)', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)', padding: '6px 10px',
          }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>
              {kpi.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: kpi.accent || 'var(--text-primary)', marginTop: 2 }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 8, right: 32, bottom: 24, left: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 2" />

          <XAxis
            dataKey="current"
            type="number"
            domain={[0, 'dataMax']}
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            stroke="var(--text-tertiary)"
            label={{ value: 'DC Current (A)', position: 'insideBottom', offset: -12, fontSize: 10, fill: 'var(--text-tertiary)' }}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            stroke="var(--text-tertiary)"
            label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--text-tertiary)' }}
            width={48}
            tickFormatter={(v) => v.toFixed(1)}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* TR rated envelope — shaded region */}
          <ReferenceArea
            x1={0} x2={ratedI}
            y1={0} y2={ratedV}
            fill="var(--brand-mid)"
            fillOpacity={0.06}
          />

          {/* TR rated voltage ceiling */}
          <ReferenceLine
            y={ratedV}
            stroke="var(--brand-mid)"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{ value: `Rated ${ratedV}V`, position: 'right', fontSize: 9, fill: 'var(--brand-mid)' }}
          />

          {/* TR rated current limit */}
          <ReferenceLine
            x={ratedI}
            stroke="var(--brand-mid)"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{ value: `Rated ${ratedI}A`, position: 'insideTopRight', fontSize: 9, fill: 'var(--brand-mid)' }}
          />

          {/* Minimum required voltage line */}
          <ReferenceLine
            y={vMin}
            stroke={isAdequate ? 'var(--pass)' : 'var(--fail)'}
            strokeWidth={1.5}
            label={{ value: `V_min ${vMin?.toFixed(2)}V`, position: 'insideTopLeft', fontSize: 9, fill: isAdequate ? 'var(--pass)' : 'var(--fail)' }}
          />

          {/* Required current line */}
          {iReq != null && (
            <ReferenceLine
              x={iReq}
              stroke="var(--text-secondary)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}

          {/* Load line */}
          <Line
            type="monotone"
            dataKey="loadLineV"
            name="Load line V(I)"
            stroke="var(--warn)"
            strokeWidth={2.5}
            dot={<OperatingPointDot />}
            activeDot={{ r: 4, fill: 'var(--warn)' }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, fontSize: 10, color: 'var(--text-tertiary)', padding: '4px 8px', flexWrap: 'wrap' }}>
        {[
          { color: 'var(--warn)', label: `Load line: V = V_emf + I × R_T` },
          { color: 'var(--brand-mid)', label: `TR rated envelope (${ratedV}V / ${ratedI}A)` },
          { color: isAdequate ? 'var(--pass)' : 'var(--fail)', label: `V_min required = ${vMin?.toFixed(2)} V` },
        ].map((item) => (
          <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 14, height: 2, background: item.color, display: 'inline-block', borderRadius: 1 }} />
            {item.label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto' }}>● = operating point</span>
      </div>
    </div>
  )
}
