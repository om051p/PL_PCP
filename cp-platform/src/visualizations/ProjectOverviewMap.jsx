/**
 * ProjectOverviewMap.jsx
 *
 * Multi-project rollup visualization. Renders a 2D grid of project cards
 * sized by status and ordered by recency. Each card shows project metadata
 * and a small inline mini-chart.
 *
 * If projects have lat/lng, falls back to a 2D scatter on a stylized grid
 * (no real map tiles — zero-dep). If not, uses the grid layout.
 */

import { Folder, MapPin, Activity, TrendingUp } from 'lucide-react'

const STATUS_COLORS = {
  draft: 'var(--text-tertiary)',
  in_review: 'var(--warn)',
  approved: 'var(--pass)',
  issued: 'var(--brand-mid)',
  archived: 'var(--text-tertiary)',
}

export function ProjectOverviewMap({ projects, onProjectClick, height = 360 }) {
  if (!projects || projects.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-tertiary)', fontSize: 11, textAlign: 'center' }}>
        No projects to display.
      </div>
    )
  }

  // Use lat/lng if available
  const hasGeo = projects.some((p) => p.location?.lat != null && p.location?.lng != null)

  if (hasGeo) {
    return <GeoView projects={projects} onProjectClick={onProjectClick} height={height} />
  }
  return <GridView projects={projects} onProjectClick={onProjectClick} height={height} />
}

function GeoView({ projects, onProjectClick, height }) {
  const withGeo = projects.filter((p) => p.location?.lat != null)
  const lats = withGeo.map((p) => p.location.lat)
  const lngs = withGeo.map((p) => p.location.lng)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const range = (max, min) => (max - min || 1)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 10.5, color: 'var(--text-tertiary)' }}>
        <MapPin size={11} /> Geo view ({withGeo.length} with coordinates)
      </div>
      <svg width="100%" height={height} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} role="img" aria-label="Project overview map">
        {/* Stylized grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <g key={p}>
            <line x1={`${p * 100}%`} y1={0} x2={`${p * 100}%`} y2={height} stroke="var(--border)" strokeDasharray="2 2" />
            <line x1={0} y1={`${p * 100}%`} x2="100%" y2={`${p * 100}%`} stroke="var(--border)" strokeDasharray="2 2" />
          </g>
        ))}
        {withGeo.map((p) => {
          const x = ((p.location.lng - minLng) / range(maxLng, minLng)) * 100
          const y = (1 - (p.location.lat - minLat) / range(maxLat, minLat)) * 100
          const color = STATUS_COLORS[p.status] || 'var(--text-tertiary)'
          return (
            <g key={p.id} style={{ cursor: 'pointer' }} onClick={() => onProjectClick?.(p)}>
              <circle cx={`${x}%`} cy={`${y}%`} r={8} fill={color} fillOpacity={0.7} stroke="var(--text-primary)" strokeWidth={1} />
              <text x={`${x}%`} y={`${y}%`} dy={-12} textAnchor="middle" fontSize={9} fill="var(--text-primary)">
                {p.name?.slice(0, 20) || p.id}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function GridView({ projects, onProjectClick, height }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 10.5, color: 'var(--text-tertiary)' }}>
        <Folder size={11} /> Grid view ({projects.length} projects)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, maxHeight: height, overflowY: 'auto' }}>
        {projects.map((p) => {
          const color = STATUS_COLORS[p.status] || 'var(--text-tertiary)'
          return (
            <div
              key={p.id}
              onClick={() => onProjectClick?.(p)}
              style={{
                padding: 10,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: onProjectClick ? 'pointer' : 'default',
                borderLeft: `3px solid ${color}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{p.name || p.id}</span>
                <span style={{ fontSize: 9, color, fontWeight: 600, textTransform: 'uppercase' }}>{p.status}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                {p.number || p.id}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                {p.client || '—'}
              </div>
              {p.standard && (
                <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 4 }}>{p.standard}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
