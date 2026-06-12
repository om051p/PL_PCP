import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

const STATION_COLORS = ['#1D9E75', '#D85A30', '#7F77DD', '#BA7517', '#3B8BD4', '#E24B4A']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--card, #fff)',
      border: '1px solid var(--border, #e5e7eb)',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 12,
      boxShadow: 'var(--shadow, 0 1px 3px rgba(0,0,0,.1))',
    }}>
      <div style={{ fontWeight: 500, marginBottom: 4 }}>KM {label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.value} mV
        </div>
      ))}
    </div>
  )
}

export function ProfileChart({ profile, stations, minimumMv, naturalMv }) {
  // Transform profile data for recharts
  const chartData = profile.map((p) => {
    const point = { km: p.km, combined: parseFloat(p.combinedPotentialMv.toFixed(1)) }
    stations.forEach((s, i) => {
      point[s.id] = parseFloat((p.perStation[i]?.potentialV * 1000).toFixed(1))
    })
    return point
  })

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10, fontSize: 12 }}>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#3B8BD4', marginRight: 4 }} />
          Combined
        </span>
        {stations.map((s, i) => (
          <span key={s.id}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: STATION_COLORS[i % STATION_COLORS.length], marginRight: 4 }} />
            {s.label || s.id}
          </span>
        ))}
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 3, background: 'var(--fail, #E24B4A)', marginRight: 4, verticalAlign: 'middle' }} />
          Min criterion
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 3, background: 'var(--text-tertiary, #888780)', marginRight: 4, verticalAlign: 'middle' }} />
          Natural
        </span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <XAxis
            dataKey="km"
            label={{ value: 'Pipeline chainage (km)', position: 'insideBottom', offset: -5, style: { fontSize: 11 } }}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={[400, 'auto']}
            label={{ value: 'Potential (mV vs Cu/CuSO₄)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11 } }}
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={minimumMv} stroke="var(--fail, #E24B4A)" strokeDasharray="4 3" strokeWidth={1.5} />
          <ReferenceLine y={naturalMv} stroke="var(--text-tertiary, #888780)" strokeDasharray="2 4" strokeWidth={1} />
          <Line type="monotone" dataKey="combined" stroke="#3B8BD4" strokeWidth={2.5} dot={false} name="Combined" />
          {stations.map((s, i) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              stroke={STATION_COLORS[i % STATION_COLORS.length]}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              name={s.label || s.id}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Coverage bar */}
      <div style={{ marginTop: 10 }}>
        <div className="section-label" style={{ marginBottom: 4 }}>
          Protection coverage per km
        </div>
        <div style={{ display: 'flex', gap: 1, height: 8, borderRadius: 4, overflow: 'hidden' }}>
          {profile.map((p) => (
            <div
              key={p.km}
              title={`KM ${p.km}: ${p.combinedPotentialMv.toFixed(0)} mV`}
              style={{
                flex: 1,
                background: p.isProtected
                  ? 'var(--brand-mid, #3B8BD4)'
                  : 'var(--fail, #E24B4A)',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
          <span>KM {profile[0]?.km}</span>
          <span>KM {profile[profile.length - 1]?.km}</span>
        </div>
      </div>
    </div>
  )
}
