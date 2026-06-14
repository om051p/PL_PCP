/**
 * PipelineRouteMap.jsx
 *
 * Horizontal schematic route map showing stations, groundbeds, TRs,
 * crossings, bonds, and isolation joints along the pipeline.
 */

import { useMemo, useState } from 'react'

const MARKER_ICONS = {
  station: { color: '#3b82f6', label: 'Station' },
  groundbed: { color: '#a855f7', label: 'Groundbed' },
  tr: { color: '#10b981', label: 'TR' },
  crossing: { color: '#f59e0b', label: 'Crossing' },
  isolation: { color: '#ef4444', label: 'Isolation Joint' },
  bond: { color: '#06b6d4', label: 'Bond' },
}

/**
 * @param {object} props
 * @param {Array} props.stations - Array of station objects with positionKm
 * @param {number} props.totalLengthKm - Total pipeline length
 * @param {Function} props.onStationClick - Click handler for station markers
 */
export function PipelineRouteMap({ stations, totalLengthKm = 100, onStationClick }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  const sortedStations = useMemo(() => {
    if (!stations?.length) return []
    return [...stations].sort((a, b) => (a.positionKm || 0) - (b.positionKm || 0))
  }, [stations])

  if (!sortedStations.length) return null

  const maxKm = Math.max(totalLengthKm, ...sortedStations.map((s) => s.positionKm || 0))
  const padding = 40
  const width = 800
  const usableWidth = width - padding * 2

  return (
    <div className="viz-side-section">
      <h3 className="viz-side-section-title">Pipeline Route</h3>
      <svg width="100%" viewBox={`0 0 ${width} 80`} style={{ overflow: 'visible' }}>
        {/* Pipeline line */}
        <line
          x1={padding}
          y1={40}
          x2={width - padding}
          y2={40}
          stroke="var(--border)"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Station markers */}
        {sortedStations.map((station, i) => {
          const x = padding + ((station.positionKm || 0) / maxKm) * usableWidth
          const isHovered = hoveredIdx === i
          const hasResult = !!station.lastCalcResult

          return (
            <g
              key={station.id || i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onStationClick?.(station)}
              style={{ cursor: 'pointer' }}
            >
              {/* Marker */}
              <circle
                cx={x}
                cy={40}
                r={isHovered ? 8 : 6}
                fill={hasResult ? '#3b82f6' : '#71717a'}
                stroke="var(--card)"
                strokeWidth={2}
                style={{ transition: 'r 0.15s ease' }}
              />

              {/* Station label */}
              <text
                x={x}
                y={20}
                textAnchor="middle"
                fontSize={9}
                fill="var(--text-secondary)"
                fontWeight={isHovered ? 700 : 400}
              >
                {station.id || `S${i + 1}`}
              </text>

              {/* KM label */}
              <text
                x={x}
                y={60}
                textAnchor="middle"
                fontSize={8}
                fill="var(--text-tertiary)"
                fontFamily="var(--font-mono)"
              >
                {(station.positionKm || 0).toFixed(0)} km
              </text>

              {/* Status indicator */}
              {hasResult && (
                <circle
                  cx={x + 5}
                  cy={35}
                  r={3}
                  fill={station.lastCalcResult?.designAdequate ? '#22c55e' : '#ef4444'}
                />
              )}
            </g>
          )
        })}

        {/* Start/End labels */}
        <text x={padding - 5} y={44} textAnchor="end" fontSize={8} fill="var(--text-tertiary)">
          0 km
        </text>
        <text x={width - padding + 5} y={44} textAnchor="start" fontSize={8} fill="var(--text-tertiary)">
          {maxKm.toFixed(0)} km
        </text>
      </svg>
    </div>
  )
}
