import { useMemo, useState, useCallback } from 'react'
import { VisualizationCanvas } from './VisualizationCanvas.jsx'
import { ZoomPan } from './ZoomPan.jsx'
import { VizTooltip } from './VizTooltip.jsx'
import { VizLegend } from './VizLegend.jsx'
import { EmptyState } from './EmptyState.jsx'
import {
  describeCableSegments,
  classifyCircuitMargin,
  CABLE_STATUS_LABELS,
} from './cableVoltage.js'
import { Cable } from 'lucide-react'

/**
 * CableNetworkVisualizer
 *
 * Engineering schematic of the cathodic-protection cable circuit.
 * Renders a directed loop:
 *
 *   TR ──+cable──> Groundbed ──earth──> Pipeline ──-cable──> TR
 *
 * - The positive main cable (+cable) carries current from the TR
 *   to the groundbed.
 * - The earth-return path is the soil between the groundbed and
 *   the pipeline; its resistance is R_G (read from the calculation).
 * - The negative main cable (-cable) returns current from the
 *   pipeline to the TR.
 * - Anode tail cables are shown as N parallel lines from the
 *   positive main to the groundbed.
 *
 * All inputs are read from the existing `station.cables`,
 * `station.tr`, `station.groundbed` shapes, and
 * `station.lastCalcResult`. No engineering formulas are evaluated
 * here beyond Ohm's law (V = I × R), which is a direct read of
 * existing numbers via the helper module.
 *
 * Cable colour = status of its voltage drop as a fraction of TR
 * rated voltage:
 *
 *   green  : drop <  5 % of TR rated voltage
 *   amber  : 5 % <= drop < 10 %
 *   red    : drop >= 10 %
 *   blue   : inputs missing or no calculation
 */

const VIEW_W = 1000
const VIEW_H = 540
const TR_X = 180
const TR_Y = 160
const GB_X = 820
const GB_Y = 160
const PL_X = 500
const PL_Y = 400

const STATUS_COLORS = {
  ok: { line: '#10b981', strong: '#10b981', label: CABLE_STATUS_LABELS.ok },
  warn: { line: '#f59e0b', strong: '#f59e0b', label: CABLE_STATUS_LABELS.warn },
  fail: { line: '#ef4444', strong: '#ef4444', label: CABLE_STATUS_LABELS.fail },
  draft: { line: '#3b82f6', strong: '#3b82f6', label: CABLE_STATUS_LABELS.draft },
}

function fmtOhm(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  if (v < 0.001) return `${(v * 1000).toFixed(2)} mΩ`
  if (v < 1) return `${v.toFixed(4)} Ω`
  return `${v.toFixed(3)} Ω`
}

function fmtV(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  if (Math.abs(v) < 1) return `${(v * 1000).toFixed(1)} mV`
  return `${v.toFixed(2)} V`
}

function fmtPct(frac) {
  if (frac == null || !Number.isFinite(frac)) return '—'
  return `${(frac * 100).toFixed(2)} %`
}

function fmtM(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v.toFixed(1)} m`
}

function TrNode({ onHover, onFocus }) {
  return (
    <g
      tabIndex={0}
      role="button"
      aria-label="Transformer Rectifier: AC power source and DC output"
      onMouseEnter={(e) => onHover({ kind: 'tr', x: e.clientX, y: e.clientY, data: {} })}
      onMouseMove={(e) => onHover((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))}
      onMouseLeave={() => onHover(null)}
      onFocus={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        onFocus({ kind: 'tr', x: r.left + r.width / 2, y: r.top, data: {} })
      }}
      onBlur={() => onFocus(null)}
      style={{ cursor: 'help', outline: 'none' }}
    >
      <rect
        x={TR_X - 60}
        y={TR_Y - 50}
        width={120}
        height={100}
        rx={6}
        ry={6}
        fill="var(--card, #18181b)"
        stroke="var(--border, #52525b)"
        strokeWidth={1.5}
      />
      <text
        x={TR_X}
        y={TR_Y - 25}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill="currentColor"
      >
        TR
      </text>
      <text
        x={TR_X}
        y={TR_Y - 8}
        textAnchor="middle"
        fontSize={9}
        fill="currentColor"
        opacity={0.7}
      >
        Transformer
      </text>
      <text
        x={TR_X}
        y={TR_Y + 4}
        textAnchor="middle"
        fontSize={9}
        fill="currentColor"
        opacity={0.7}
      >
        Rectifier
      </text>
      {/* + and - terminals */}
      <circle cx={TR_X - 35} cy={TR_Y + 25} r={5} fill="#ef4444" />
      <text x={TR_X - 35} y={TR_Y + 29} textAnchor="middle" fontSize={8} fontWeight={700} fill="#fafafa">
        +
      </text>
      <circle cx={TR_X + 35} cy={TR_Y + 25} r={5} fill="#3b82f6" />
      <text x={TR_X + 35} y={TR_Y + 29} textAnchor="middle" fontSize={8} fontWeight={700} fill="#fafafa">
        −
      </text>
    </g>
  )
}

function GroundbedNode({ groundbed, proposedAnodes, onHover, onFocus }) {
  const N = Math.max(1, Number(proposedAnodes) || 1)
  const type = groundbed?.type
  return (
    <g
      tabIndex={0}
      role="button"
      aria-label={`Groundbed: ${N} ${type === 'distributed' ? 'distributed' : 'vertical'} anodes`}
      onMouseEnter={(e) => onHover({ kind: 'groundbed', x: e.clientX, y: e.clientY, data: { N, type } })}
      onMouseMove={(e) => onHover((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))}
      onMouseLeave={() => onHover(null)}
      onFocus={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        onFocus({ kind: 'groundbed', x: r.left + r.width / 2, y: r.top, data: { N, type } })
      }}
      onBlur={() => onFocus(null)}
      style={{ cursor: 'help', outline: 'none' }}
    >
      <rect
        x={GB_X - 90}
        y={GB_Y - 50}
        width={180}
        height={100}
        rx={6}
        ry={6}
        fill="var(--card, #18181b)"
        stroke="var(--border, #52525b)"
        strokeWidth={1.5}
      />
      <text
        x={GB_X}
        y={GB_Y - 28}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill="currentColor"
      >
        GROUNDBED
      </text>
      <text
        x={GB_X}
        y={GB_Y - 14}
        textAnchor="middle"
        fontSize={9}
        fill="currentColor"
        opacity={0.65}
      >
        {N} {type === 'distributed' ? 'distributed' : type === 'deepwell' ? 'deep well' : 'vertical'} anode{N === 1 ? '' : 's'}
      </text>
      {/* mini anode row */}
      {Array.from({ length: Math.min(N, 8) }, (_, i) => {
        const count = Math.min(N, 8)
        const spacing = 140 / (count + 1)
        const cx = GB_X - 70 + spacing * (i + 1)
        return (
          <rect
            key={i}
            x={cx - 4}
            y={GB_Y + 5}
            width={8}
            height={18}
            rx={1}
            ry={1}
            fill="#a855f7"
            stroke="#6b21a8"
            strokeWidth={1}
          />
        )
      })}
      {N > 8 && (
        <text
          x={GB_X}
          y={GB_Y + 35}
          textAnchor="middle"
          fontSize={9}
          fill="currentColor"
          opacity={0.65}
        >
          +{N - 8} more
        </text>
      )}
    </g>
  )
}

function PipelineNode({ onHover, onFocus }) {
  return (
    <g
      tabIndex={0}
      role="button"
      aria-label="Pipeline: protected structure (cathode)"
      onMouseEnter={(e) => onHover({ kind: 'pipeline', x: e.clientX, y: e.clientY, data: {} })}
      onMouseMove={(e) => onHover((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))}
      onMouseLeave={() => onHover(null)}
      onFocus={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        onFocus({ kind: 'pipeline', x: r.left + r.width / 2, y: r.top, data: {} })
      }}
      onBlur={() => onFocus(null)}
      style={{ cursor: 'help', outline: 'none' }}
    >
      {/* long horizontal pipe */}
      <rect
        x={PL_X - 220}
        y={PL_Y - 18}
        width={440}
        height={36}
        rx={4}
        ry={4}
        fill="var(--card, #18181b)"
        stroke="var(--border, #52525b)"
        strokeWidth={1.5}
      />
      {/* pipe segments */}
      {Array.from({ length: 11 }, (_, i) => (
        <line
          key={i}
          x1={PL_X - 210 + i * 42}
          y1={PL_Y - 18}
          x2={PL_X - 210 + i * 42}
          y2={PL_Y + 18}
          stroke="var(--border, #52525b)"
          strokeOpacity={0.4}
          strokeWidth={1}
        />
      ))}
      <text
        x={PL_X}
        y={PL_Y - 26}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill="currentColor"
      >
        PIPELINE (cathode)
      </text>
      <text
        x={PL_X}
        y={PL_Y + 4}
        textAnchor="middle"
        fontSize={10}
        fill="currentColor"
        opacity={0.7}
      >
        Protected structure
      </text>
    </g>
  )
}

function CableSegment({
  id,
  label,
  from,
  to,
  status,
  voltageDropV,
  fractionOfRated,
  resistanceOhm,
  lengthM,
  onHover,
  onFocus,
  showArrow = true,
  dashed = false,
  thickness = 6,
  labelOffset = { dx: 0, dy: -18 },
}) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.draft
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2
  // Arrow head
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const arrowSize = 10

  return (
    <g
      tabIndex={0}
      role="button"
      aria-label={`${label}: ${fmtOhm(resistanceOhm)}, ${fmtV(voltageDropV)} drop, ${fmtPct(fractionOfRated)} of TR rated`}
      onMouseEnter={(e) =>
        onHover({
          kind: 'cable',
          x: e.clientX,
          y: e.clientY,
          data: { id, label, resistanceOhm, lengthM, voltageDropV, fractionOfRated, status },
        })
      }
      onMouseMove={(e) => onHover((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))}
      onMouseLeave={() => onHover(null)}
      onFocus={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        onFocus({
          kind: 'cable',
          key: id,
          x: r.left + r.width / 2,
          y: r.top,
          data: { id, label, resistanceOhm, lengthM, voltageDropV, fractionOfRated, status },
        })
      }}
      onBlur={() => onFocus(null)}
      style={{ cursor: 'help', outline: 'none' }}
    >
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={colors.line}
        strokeWidth={thickness + 6}
        strokeOpacity={0.18}
        strokeLinecap="round"
        aria-hidden="true"
      />
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={colors.line}
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeDasharray={dashed ? '8 4' : undefined}
      />
      {showArrow && (
        <polygon
          points={`${to.x},${to.y} ${to.x - arrowSize * Math.cos(angle - Math.PI / 6)},${to.y - arrowSize * Math.sin(angle - Math.PI / 6)} ${to.x - arrowSize * Math.cos(angle + Math.PI / 6)},${to.y - arrowSize * Math.sin(angle + Math.PI / 6)}`}
          fill={colors.line}
        />
      )}
      {/* inline label box */}
      <g transform={`translate(${midX + labelOffset.dx}, ${midY + labelOffset.dy})`}>
        <rect
          x={-65}
          y={-18}
          width={130}
          height={36}
          rx={4}
          ry={4}
          fill="var(--card, #18181b)"
          stroke={colors.line}
          strokeWidth={1}
          opacity={0.95}
        />
        <text x={0} y={-4} textAnchor="middle" fontSize={10} fontWeight={600} fill="currentColor">
          {label}
        </text>
        <text
          x={0}
          y={10}
          textAnchor="middle"
          fontSize={9}
          fontFamily="var(--font-mono, monospace)"
          fill="currentColor"
          opacity={0.85}
        >
          {fmtPct(fractionOfRated)} · {fmtV(voltageDropV)}
        </text>
      </g>
    </g>
  )
}

function AnodeTails({ count, junctionX, junctionY, groundbedX, groundbedY, onHover, onFocus, status }) {
  const N = Math.min(count, 8)
  if (N === 0) return null
  const colors = STATUS_COLORS[status] || STATUS_COLORS.draft
  return (
    <g className="viz-cable-anode-tails">
      {Array.from({ length: N }, (_, i) => {
        const t = N === 1 ? 0.5 : i / (N - 1)
        const yJ = junctionY - 40 + t * 80
        const tailX1 = junctionX
        const tailY1 = yJ
        const tailX2 = groundbedX - 90
        const tailY2 = groundbedY - 30 + t * 60
        return (
          <g key={i}>
            <line
              x1={tailX1}
              y1={tailY1}
              x2={tailX2}
              y2={tailY2}
              stroke={colors.line}
              strokeWidth={2}
              strokeOpacity={0.75}
              strokeLinecap="round"
            />
          </g>
        )
      })}
    </g>
  )
}

function CircuitPanel({ station, segments }) {
  const r = station?.lastCalcResult
  const tr = station?.tr
  if (!r || !tr) return null
  const I = Number(tr.ratedCurrent) || 0
  const V = Number(tr.ratedVoltage) || 0
  const margin = classifyCircuitMargin(r)
  const colors = STATUS_COLORS[margin]
  return (
    <div className="viz-cable-panel">
      <div className="viz-cable-panel-row">
        <span>TR rated</span>
        <strong>
          {V.toFixed(1)} V · {I.toFixed(2)} A
        </strong>
      </div>
      <div className="viz-cable-panel-row">
        <span>Total cable R_c</span>
        <strong>{fmtOhm(r.totalCableResOhm)}</strong>
      </div>
      <div className="viz-cable-panel-row">
        <span>Total circuit R_T</span>
        <strong>{fmtOhm(r.totalCircuitResistanceOhm)}</strong>
      </div>
      <div className="viz-cable-panel-row">
        <span>Min TR voltage</span>
        <strong>{fmtV(r.minTRVoltage)}</strong>
      </div>
      <div className="viz-cable-panel-row">
        <span>Voltage margin</span>
        <strong style={{ color: colors.strong }}>
          {((r.minTRVoltage / (V || 1)) * 100).toFixed(1)} %{' '}
          <span className={`viz-cable-badge is-${margin}`}>{colors.label}</span>
        </strong>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.draft
  return (
    <div
      className={`viz-cable-status is-${status}`}
      style={{ borderColor: colors.line, color: colors.strong }}
      role="status"
      aria-live="polite"
    >
      <span className="viz-cable-status-dot" style={{ background: colors.strong }} aria-hidden="true" />
      {colors.label}
    </div>
  )
}

function worstSegmentStatus(segments) {
  if (!segments || segments.length === 0) return 'draft'
  const order = { draft: 0, ok: 1, warn: 2, fail: 3 }
  return segments.reduce((acc, s) => (order[s.status] > order[acc] ? s.status : acc), 'draft')
}

export function CableNetworkVisualizer({ station, className = '' }) {
  const [tooltip, setTooltip] = useState(null)
  const segments = useMemo(() => describeCableSegments(station), [station])
  const handleHover = useCallback((p) => setTooltip(p), [])
  const handleFocus = useCallback((p) => setTooltip(p), [])

  if (!station) {
    return (
      <EmptyState
        icon={Cable}
        title="No station data"
        description="Open a station with cable configuration to see the network."
        compact
      />
    )
  }

  const r = station.lastCalcResult
  if (!r) {
    return (
      <EmptyState
        icon={Cable}
        title="No calculation yet"
        description="Run the cable calculation on this station to see the network schematic with voltage drops."
        compact
      />
    )
  }

  const tailSeg = segments.find((s) => s.id === 'anode-tail')
  const posSeg = segments.find((s) => s.id === 'pos-main')
  const negSeg = segments.find((s) => s.id === 'neg-main')
  const worst = worstSegmentStatus(segments)
  const N = Number(station.proposedAnodes) || 0

  // Geometry for cable endpoints (tangent to node boxes)
  // TR right edge = TR_X + 60, GB left edge = GB_X - 90
  const trRight = { x: TR_X + 60, y: TR_Y }
  const gbLeft = { x: GB_X - 90, y: GB_Y }
  const gbBottom = { x: GB_X, y: GB_Y + 50 }
  const plRight = { x: PL_X + 220, y: PL_Y }
  const plLeft = { x: PL_X - 220, y: PL_Y }
  const trBottom = { x: TR_X, y: TR_Y + 50 }

  return (
    <div className={`viz-cable-network ${className}`.trim()}>
      <div className="viz-cable-header">
        <div>
          <h3 className="viz-cable-title">Cable Network Schematic</h3>
          <p className="viz-cable-subtitle">
            TR → positive cable → groundbed → earth return → pipeline → negative cable → TR
          </p>
        </div>
        <StatusBadge status={worst} />
      </div>

      <ZoomPan
        initialViewBox={[0, 0, VIEW_W, VIEW_H]}
        ariaLabel="Cable network schematic. Use plus and minus to zoom, drag to pan, zero to reset."
      >
        {({ viewBox: vb, reset, zoomIn, zoomOut, zoomPct }) => (
          <>
            <VisualizationCanvas
              viewBox={vb}
              aspectRatio={`${VIEW_W} / ${VIEW_H}`}
              minHeight={500}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              ariaLabel="Cable network schematic: transformer rectifier, positive cable, groundbed, earth return, pipeline, negative cable"
            >
              {/* Earth return path (drawn first, underneath) */}
              {r.groundbedResistanceOhm != null && (
                <g className="viz-cable-earth-return" aria-hidden="true">
                  <path
                    d={`M ${gbBottom.x} ${gbBottom.y} C ${gbBottom.x + 20} ${(gbBottom.y + plRight.y) / 2}, ${plRight.x + 20} ${(gbBottom.y + plRight.y) / 2}, ${plRight.x} ${plRight.y}`}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.18}
                    strokeWidth={12}
                    strokeLinecap="round"
                  />
                  <text
                    x={(gbBottom.x + plRight.x) / 2 + 30}
                    y={(gbBottom.y + plRight.y) / 2 + 4}
                    textAnchor="middle"
                    fontSize={9}
                    fill="currentColor"
                    opacity={0.6}
                    fontStyle="italic"
                  >
                    earth return
                  </text>
                </g>
              )}

              {/* Positive main cable: TR → GB */}
              {posSeg && (
                <CableSegment
                  id="pos-main"
                  label="+cable"
                  from={trRight}
                  to={gbLeft}
                  status={posSeg.status}
                  voltageDropV={posSeg.voltageDropV}
                  fractionOfRated={posSeg.fractionOfRated}
                  resistanceOhm={posSeg.resistanceOhm}
                  lengthM={posSeg.lengthM}
                  onHover={handleHover}
                  onFocus={handleFocus}
                />
              )}

              {/* Anode tails (drawn as parallel lines into GB) */}
              {tailSeg && (
                <AnodeTails
                  count={N}
                  junctionX={(trRight.x + gbLeft.x) / 2}
                  junctionY={(trRight.y + gbLeft.y) / 2}
                  groundbedX={GB_X}
                  groundbedY={GB_Y}
                  status={tailSeg.status}
                  onHover={handleHover}
                  onFocus={handleFocus}
                />
              )}

              {/* Earth-return as a labeled segment from GB to Pipeline */}
              {r.groundbedResistanceOhm != null && (
                <CableSegment
                  id="earth-return"
                  label="earth (R_G)"
                  from={gbBottom}
                  to={plRight}
                  status={r.groundbedResistanceOhm < (r.maxAllowableGroundbedRes || Infinity) ? 'ok' : 'fail'}
                  voltageDropV={null}
                  fractionOfRated={null}
                  resistanceOhm={r.groundbedResistanceOhm}
                  lengthM={null}
                  onHover={handleHover}
                  onFocus={handleFocus}
                  showArrow={true}
                  thickness={5}
                  labelOffset={{ dx: 0, dy: 22 }}
                />
              )}

              {/* Negative main cable: Pipeline → TR (L-shape: pipeline left → tr bottom) */}
              {negSeg && (
                <>
                  <CableSegment
                    id="neg-main-1"
                    label="-cable (along pipeline)"
                    from={plLeft}
                    to={trBottom}
                    status={negSeg.status}
                    voltageDropV={negSeg.voltageDropV}
                    fractionOfRated={negSeg.fractionOfRated}
                    resistanceOhm={negSeg.resistanceOhm}
                    lengthM={negSeg.lengthM}
                    onHover={handleHover}
                    onFocus={handleFocus}
                    showArrow={true}
                    thickness={5}
                    labelOffset={{ dx: 0, dy: 22 }}
                  />
                </>
              )}

              {/* Nodes on top */}
              <TrNode onHover={handleHover} onFocus={handleFocus} />
              <GroundbedNode
                groundbed={station.groundbed}
                proposedAnodes={N}
                onHover={handleHover}
                onFocus={handleFocus}
              />
              <PipelineNode onHover={handleHover} onFocus={handleFocus} />

              {/* Junction dot for anode tails (mid of +cable) */}
              {tailSeg && (
                <circle
                  cx={(trRight.x + gbLeft.x) / 2}
                  cy={(trRight.y + gbLeft.y) / 2}
                  r={4}
                  fill="var(--card, #18181b)"
                  stroke="currentColor"
                  strokeOpacity={0.4}
                />
              )}
            </VisualizationCanvas>

            <div className="viz-cable-controls" aria-hidden="true">
              <button type="button" onClick={zoomOut} aria-label="Zoom out">−</button>
              <span className="viz-cable-zoom-pct">{zoomPct}%</span>
              <button type="button" onClick={zoomIn} aria-label="Zoom in">+</button>
              <button type="button" onClick={reset} aria-label="Reset zoom">⟲</button>
            </div>
          </>
        )}
      </ZoomPan>

      <VizTooltip target={tooltip?.data} x={tooltip?.x} y={tooltip?.y} onDismiss={() => setTooltip(null)}>
        {(d) => {
          if (!d) return null
          if (tooltip.kind === 'cable') {
            return (
              <div>
                <div className="viz-tooltip-title">{d.label}</div>
                <div className="viz-tooltip-row">
                  <span>Length</span>
                  <strong>{fmtM(d.lengthM)}</strong>
                </div>
                <div className="viz-tooltip-row">
                  <span>Resistance</span>
                  <strong>{fmtOhm(d.resistanceOhm)}</strong>
                </div>
                <div className="viz-tooltip-row">
                  <span>Voltage drop</span>
                  <strong>{fmtV(d.voltageDropV)}</strong>
                </div>
                <div className="viz-tooltip-row">
                  <span>Of TR rated</span>
                  <strong>{fmtPct(d.fractionOfRated)}</strong>
                </div>
                <div className="viz-tooltip-row">
                  <span>Status</span>
                  <strong style={{ color: (STATUS_COLORS[d.status] || STATUS_COLORS.draft).strong }}>
                    {(STATUS_COLORS[d.status] || STATUS_COLORS.draft).label}
                  </strong>
                </div>
              </div>
            )
          }
          if (tooltip.kind === 'tr') {
            return (
              <div>
                <div className="viz-tooltip-title">Transformer Rectifier</div>
                <div className="viz-tooltip-row">
                  <span>Rated V</span>
                  <strong>{station.tr?.ratedVoltage ?? '—'} V</strong>
                </div>
                <div className="viz-tooltip-row">
                  <span>Rated I</span>
                  <strong>{station.tr?.ratedCurrent ?? '—'} A</strong>
                </div>
              </div>
            )
          }
          if (tooltip.kind === 'groundbed') {
            return (
              <div>
                <div className="viz-tooltip-title">Groundbed</div>
                <div className="viz-tooltip-row">
                  <span>Anodes</span>
                  <strong>{d.N}</strong>
                </div>
                <div className="viz-tooltip-row">
                  <span>Type</span>
                  <strong>{d.type || '—'}</strong>
                </div>
                <div className="viz-tooltip-row">
                  <span>R_G</span>
                  <strong>{fmtOhm(station.lastCalcResult?.groundbedResistanceOhm)}</strong>
                </div>
              </div>
            )
          }
          if (tooltip.kind === 'pipeline') {
            return (
              <div>
                <div className="viz-tooltip-title">Pipeline</div>
                <div className="viz-tooltip-row">
                  <span>Role</span>
                  <strong>Cathode (protected)</strong>
                </div>
                <div className="viz-tooltip-row">
                  <span>Soil ρ</span>
                  <strong>{station.soilResistivityOhmCm ?? '—'} Ω·cm</strong>
                </div>
              </div>
            )
          }
          return null
        }}
      </VizTooltip>

      <div className="viz-cable-footer">
        <CircuitPanel station={station} segments={segments} />
        <VizLegend
          title="Cable voltage drop"
          items={[
            { id: 'ok', label: '< 5 % (within)', color: STATUS_COLORS.ok.line },
            { id: 'warn', label: '5 – 10 % (review)', color: STATUS_COLORS.warn.line },
            { id: 'fail', label: '> 10 % (exceeds)', color: STATUS_COLORS.fail.line },
            { id: 'draft', label: 'Not calculated', color: STATUS_COLORS.draft.line },
          ]}
        />
      </div>
    </div>
  )
}
