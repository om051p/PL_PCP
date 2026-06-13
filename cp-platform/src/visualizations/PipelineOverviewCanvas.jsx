import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { VisualizationCanvas } from './VisualizationCanvas.jsx'
import { ZoomPan } from './ZoomPan.jsx'
import { VizTooltip } from './VizTooltip.jsx'
import { VizLegend } from './VizLegend.jsx'
import { EmptyState } from './EmptyState.jsx'
import { Route } from 'lucide-react'

/**
 * PipelineOverviewCanvas
 *
 * Reference architecture for engineering visualizations. Renders a
 * single-line schematic of a cathodic protection pipeline system:
 *
 *   - Each station sits on the pipeline at its cumulative length.
 *   - Groundbeds (anode arrays) hang below the line.
 *   - TR (transformer-rectifier) units float above the line.
 *   - Pipeline segments are coloured by status.
 *   - Hover / focus reveals an accessible tooltip with engineering data.
 *   - Click / Enter navigates to the station's design page.
 *
 * All geometry is derived from the project's existing data shape:
 *   project.stations[].pipelineSegments[].lengthM
 *   project.stations[].groundbed { ... }
 *   project.stations[].tr { ... }
 *   project.stations[].status
 * No calculations are performed — only layout math (sum of segment
 * lengths along the X axis).
 */

const VIEW_W = 1000
const VIEW_H = 360
const PIPELINE_Y = 180
const TR_OFFSET = -60
const GB_OFFSET = 60
const STATION_R = 8
const TR_R = 7
const GB_R = 6
const KM = 1000

const STATUS_COLORS = {
  draft: { line: '#71717a', fill: '#27272a' },
  input_complete: { line: '#3b82f6', fill: '#1e3a8a' },
  calculated: { line: '#06b6d4', fill: '#0e7490' },
  engineering_review: { line: '#f59e0b', fill: '#713f12' },
  optimized: { line: '#a855f7', fill: '#581c87' },
  approved: { line: '#10b981', fill: '#064e3b' },
  issued_for_construction: { line: '#22c55e', fill: '#14532d' },
}

function computeLayout(stations) {
  let cursor = 0
  return stations.map((s) => {
    const segs = s.pipelineSegments || []
    const segLengths = segs.map((seg) => Number(seg.lengthM) || 0)
    const segTotal = segLengths.reduce((a, b) => a + b, 0)
    const startM = cursor
    const endM = cursor + segTotal
    cursor = endM
    return { station: s, startM, endM, segLengths }
  })
}

function buildPathD(items, totalM, xScale) {
  if (items.length === 0) return ''
  return items
    .map(({ startM, endM, station }, i) => {
      const x0 = xScale(startM)
      const x1 = xScale(endM)
      return `M ${x0} ${PIPELINE_Y} L ${x1} ${PIPELINE_Y}`
    })
    .join(' ')
}

export function PipelineOverviewCanvas({ stations = [], height = 360, className = '' }) {
  const navigate = useNavigate()
  const [tooltip, setTooltip] = useState(null)

  const layout = useMemo(() => computeLayout(stations), [stations])
  const totalM = useMemo(() => layout.reduce((acc, it) => acc + (it.endM - it.startM), 0), [layout])

  const handleStationActivate = useCallback(
    (station) => {
      if (!station?.id) return
      navigate(`/project?station=${station.id}`)
    },
    [navigate]
  )

  if (!stations || stations.length === 0) {
    return (
      <EmptyState
        icon={Route}
        title="No pipeline data yet"
        description="Add stations and pipeline segments to see the system layout."
        compact
      />
    )
  }

  if (totalM <= 0) {
    return (
      <EmptyState
        icon={Route}
        title="No segment lengths defined"
        description="Each station needs at least one pipeline segment with a length to be placed on the route."
        compact
      />
    )
  }

  const xScale = (m) => 60 + (m / totalM) * (VIEW_W - 120)
  const formatKm = (m) => `${(m / KM).toFixed(2)} km`

  return (
    <div className={`viz-pipeline-overview ${className}`.trim()}>
      <ZoomPan initialViewBox={[0, 0, VIEW_W, VIEW_H]} ariaLabel="Pipeline overview. Scroll or use plus and minus to zoom. Drag to pan. Click a station to open it.">
        {({ viewBox, reset, zoomIn, zoomOut, zoomPct }) => (
          <>
            <VisualizationCanvas
              viewBox={viewBox}
              aspectRatio={`${VIEW_W} / ${VIEW_H}`}
              minHeight={height}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              ariaLabel={`Pipeline schematic with ${layout.length} stations over ${(totalM / KM).toFixed(2)} km`}
            >
              {/* Pipeline line per station segment */}
              <g className="viz-pipeline-segments">
                {layout.map(({ station, startM, endM }, i) => {
                  const status = station.status || 'draft'
                  const colors = STATUS_COLORS[status] || STATUS_COLORS.draft
                  const x0 = xScale(startM)
                  const x1 = xScale(endM)
                  return (
                    <line
                      key={station.id || i}
                      x1={x0}
                      y1={PIPELINE_Y}
                      x2={x1}
                      y2={PIPELINE_Y}
                      stroke={colors.line}
                      strokeWidth={4}
                      strokeLinecap="round"
                    />
                  )
                })}
              </g>

              {/* Distance axis baseline */}
              <g className="viz-pipeline-axis" aria-hidden="true">
                <line x1={xScale(0)} y1={PIPELINE_Y + 90} x2={xScale(totalM)} y2={PIPELINE_Y + 90} stroke="currentColor" strokeOpacity={0.25} />
                {layout.map(({ station, startM }, i) => (
                  <g key={`tick-${i}`} transform={`translate(${xScale(startM)},${PIPELINE_Y + 90})`}>
                    <line y1={-3} y2={3} stroke="currentColor" strokeOpacity={0.4} />
                    <text y={18} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.7}>
                      {formatKm(startM)}
                    </text>
                  </g>
                ))}
                <text
                  x={xScale(totalM / 2)}
                  y={PIPELINE_Y + 115}
                  textAnchor="middle"
                  fontSize={10}
                  fill="currentColor"
                  opacity={0.55}
                >
                  Cumulative distance
                </text>
              </g>

              {/* TR markers (above) */}
              <g className="viz-pipeline-trs">
                {layout.map(({ station, startM, endM }, i) => {
                  const cx = xScale((startM + endM) / 2)
                  return (
                    <g key={`tr-${station.id || i}`}>
                      <line
                        x1={cx}
                        y1={PIPELINE_Y - 4}
                        x2={cx}
                        y2={PIPELINE_Y + TR_OFFSET + TR_R}
                        stroke="currentColor"
                        strokeOpacity={0.25}
                        strokeDasharray="2 3"
                      />
                      <g
                        tabIndex={0}
                        role="button"
                        aria-label={`Transformer rectifier at ${station.name || 'station ' + (i + 1)}`}
                        onMouseEnter={(e) =>
                          setTooltip({
                            kind: 'tr',
                            x: e.clientX,
                            y: e.clientY,
                            data: { station },
                          })
                        }
                        onMouseMove={(e) =>
                          setTooltip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))
                        }
                        onMouseLeave={() => setTooltip(null)}
                        onFocus={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setTooltip({
                            kind: 'tr',
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                            data: { station },
                          })
                        }}
                        onBlur={() => setTooltip(null)}
                        style={{ cursor: 'help', outline: 'none' }}
                      >
                        <circle
                          cx={cx}
                          cy={PIPELINE_Y + TR_OFFSET}
                          r={TR_R}
                          fill="#3b82f6"
                          stroke="#0a0a0a"
                          strokeWidth={1.5}
                        />
                        <text
                          x={cx}
                          y={PIPELINE_Y + TR_OFFSET - 12}
                          textAnchor="middle"
                          fontSize={9}
                          fill="currentColor"
                          opacity={0.75}
                        >
                          TR
                        </text>
                      </g>
                    </g>
                  )
                })}
              </g>

              {/* Groundbed markers (below) */}
              <g className="viz-pipeline-groundbeds">
                {layout.map(({ station, startM, endM }, i) => {
                  const cx = xScale((startM + endM) / 2)
                  const anodes = Number(station.proposedAnodes) || 0
                  return (
                    <g key={`gb-${station.id || i}`}>
                      <line
                        x1={cx}
                        y1={PIPELINE_Y + 4}
                        x2={cx}
                        y2={PIPELINE_Y + GB_OFFSET - GB_R}
                        stroke="currentColor"
                        strokeOpacity={0.25}
                        strokeDasharray="2 3"
                      />
                      <g
                        tabIndex={0}
                        role="button"
                        aria-label={`Groundbed at ${station.name || 'station ' + (i + 1)}: ${anodes} anodes`}
                        onMouseEnter={(e) =>
                          setTooltip({
                            kind: 'groundbed',
                            x: e.clientX,
                            y: e.clientY,
                            data: { station, anodes },
                          })
                        }
                        onMouseMove={(e) =>
                          setTooltip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))
                        }
                        onMouseLeave={() => setTooltip(null)}
                        onFocus={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setTooltip({
                            kind: 'groundbed',
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                            data: { station, anodes },
                          })
                        }}
                        onBlur={() => setTooltip(null)}
                        style={{ cursor: 'help', outline: 'none' }}
                      >
                        <rect
                          x={cx - GB_R}
                          y={PIPELINE_Y + GB_OFFSET - GB_R}
                          width={GB_R * 2}
                          height={GB_R * 2}
                          fill="#f59e0b"
                          stroke="#0a0a0a"
                          strokeWidth={1.5}
                        />
                        <text
                          x={cx}
                          y={PIPELINE_Y + GB_OFFSET + 18}
                          textAnchor="middle"
                          fontSize={9}
                          fill="currentColor"
                          opacity={0.75}
                        >
                          GB
                        </text>
                      </g>
                    </g>
                  )
                })}
              </g>

              {/* Station markers (on the pipeline) */}
              <g className="viz-pipeline-stations">
                {layout.map(({ station, startM }, i) => {
                  const cx = xScale(startM)
                  const status = station.status || 'draft'
                  const colors = STATUS_COLORS[status] || STATUS_COLORS.draft
                  return (
                    <g
                      key={`st-${station.id || i}`}
                      tabIndex={0}
                      role="button"
                      aria-label={`Station ${station.name || i + 1}, status ${status}. Press Enter to open.`}
                      onMouseEnter={(e) =>
                        setTooltip({
                          kind: 'station',
                          x: e.clientX,
                          y: e.clientY,
                          data: { station, status },
                        })
                      }
                      onMouseMove={(e) =>
                        setTooltip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))
                      }
                      onMouseLeave={() => setTooltip(null)}
                      onFocus={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setTooltip({
                          kind: 'station',
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                          data: { station, status },
                        })
                      }}
                      onBlur={() => setTooltip(null)}
                      onClick={() => handleStationActivate(station)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleStationActivate(station)
                        }
                      }}
                      style={{ cursor: 'pointer', outline: 'none' }}
                    >
                      <circle
                        cx={cx}
                        cy={PIPELINE_Y}
                        r={STATION_R + 4}
                        fill="transparent"
                        stroke="transparent"
                        className="viz-station-hit"
                      />
                      <circle
                        cx={cx}
                        cy={PIPELINE_Y}
                        r={STATION_R}
                        fill={colors.fill}
                        stroke={colors.line}
                        strokeWidth={2}
                      />
                      <text
                        x={cx}
                        y={PIPELINE_Y - 14}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={600}
                        fill="currentColor"
                      >
                        {station.name || `Station ${i + 1}`}
                      </text>
                    </g>
                  )
                })}
              </g>
            </VisualizationCanvas>

            <div className="viz-pipeline-controls" aria-hidden="true">
              <button type="button" onClick={zoomOut} aria-label="Zoom out">−</button>
              <span className="viz-pipeline-zoom-pct">{zoomPct}%</span>
              <button type="button" onClick={zoomIn} aria-label="Zoom in">+</button>
              <button type="button" onClick={reset} aria-label="Reset zoom">⟲</button>
            </div>

            <VizTooltip target={tooltip?.data} x={tooltip?.x} y={tooltip?.y} onDismiss={() => setTooltip(null)}>
              {(d) => {
                if (!d) return null
                if (tooltip.kind === 'station') {
                  return (
                    <div>
                      <div className="viz-tooltip-title">{d.station.name}</div>
                      <div className="viz-tooltip-row">
                        <span>Status</span>
                        <strong>{d.status}</strong>
                      </div>
                      {d.station.location && (
                        <div className="viz-tooltip-row">
                          <span>Location</span>
                          <strong>{d.station.location}</strong>
                        </div>
                      )}
                      {d.station.soilResistivityOhmCm != null && (
                        <div className="viz-tooltip-row">
                          <span>Soil resistivity</span>
                          <strong>{d.station.soilResistivityOhmCm} Ω·cm</strong>
                        </div>
                      )}
                      {d.station.tr?.ratedVoltage != null && (
                        <div className="viz-tooltip-row">
                          <span>TR voltage</span>
                          <strong>{d.station.tr.ratedVoltage} V</strong>
                        </div>
                      )}
                    </div>
                  )
                }
                if (tooltip.kind === 'tr') {
                  return (
                    <div>
                      <div className="viz-tooltip-title">Transformer Rectifier</div>
                      {d.station.tr && (
                        <>
                          <div className="viz-tooltip-row">
                            <span>Rated V</span>
                            <strong>{d.station.tr.ratedVoltage ?? '—'} V</strong>
                          </div>
                          <div className="viz-tooltip-row">
                            <span>Rated I</span>
                            <strong>{d.station.tr.ratedCurrent ?? '—'} A</strong>
                          </div>
                        </>
                      )}
                    </div>
                  )
                }
                if (tooltip.kind === 'groundbed') {
                  return (
                    <div>
                      <div className="viz-tooltip-title">Groundbed</div>
                      <div className="viz-tooltip-row">
                        <span>Anodes</span>
                        <strong>{d.anodes}</strong>
                      </div>
                      {d.station.groundbed && (
                        <div className="viz-tooltip-row">
                          <span>Type</span>
                          <strong>{d.station.groundbed.type}</strong>
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              }}
            </VizTooltip>
          </>
        )}
      </ZoomPan>

      <VizLegend
        title="Status"
        items={Object.entries(STATUS_COLORS).map(([id, c]) => ({
          id,
          label: id.replace(/_/g, ' '),
          color: c.line,
        }))}
      />
    </div>
  )
}
