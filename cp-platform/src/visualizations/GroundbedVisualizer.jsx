import { useMemo, useState, useCallback } from 'react'
import { VisualizationCanvas } from './VisualizationCanvas.jsx'
import { ZoomPan } from './ZoomPan.jsx'
import { VizTooltip } from './VizTooltip.jsx'
import { VizLegend } from './VizLegend.jsx'
import { EmptyState } from './EmptyState.jsx'
import { Layers } from 'lucide-react'
import { classifyGroundbedStatus as classifyStatus, GROUNDBED_STATUS_LABELS } from './groundbedStatus.js'

/**
 * GroundbedVisualizer
 *
 * SVG schematic of a cathodic-protection groundbed. Two modes are
 * supported, selected from the existing `groundbed.type` field:
 *
 *   - horizontal (`distributed`): a string of anodes laid out in a
 *     shallow trench along a length axis.
 *   - vertical (`deepwell` and `shallow_vertical`): a single borehole
 *     with N anodes stacked on a depth axis, plus coke cover and
 *     cement plug where applicable.
 *
 * All inputs are read from the existing `station.groundbed` shape and
 * `station.lastCalcResult` (if calculated). No engineering formulas
 * are evaluated here — only layout geometry (positions, lengths,
 * depths). The R_G, max allowable resistance, and design life values
 * are read directly from the last calculation result.
 *
 * Status colour comes from comparing the calculated R_G to the
 * maximum allowable resistance, and the design life to the target:
 *
 *   green  — both within limits
 *   amber  — one within / one out
 *   red    — both out of limits
 *   blue   — inputs only, no calculation yet
 */

const STATUS_COLORS = {
  ok: { line: '#10b981', fill: 'rgba(16, 185, 129, 0.18)', strong: '#10b981' },
  warn: { line: '#f59e0b', fill: 'rgba(245, 158, 11, 0.18)', strong: '#f59e0b' },
  fail: { line: '#ef4444', fill: 'rgba(239, 68, 68, 0.18)', strong: '#ef4444' },
  draft: { line: '#3b82f6', fill: 'rgba(59, 130, 235, 0.18)', strong: '#3b82f6' },
}

const ANODE_FILL = '#a855f7'
const ANODE_STROKE = '#6b21a8'
const COKE_FILL = 'rgba(120, 113, 108, 0.45)'
const COKE_STROKE = '#a8a29e'
const CEMENT_FILL = 'rgba(214, 211, 209, 0.55)'
const CEMENT_STROKE = '#e7e5e4'
const BACKFILL_FILL = 'rgba(168, 162, 158, 0.25)'
const BACKFILL_STROKE = '#a8a29e'
const BOREHOLE_FILL = 'rgba(24, 24, 27, 0.7)'
const BOREHOLE_STROKE = '#52525b'
const PIPELINE_LINE = '#3f6212'
const SOIL_FILL = 'rgba(120, 53, 15, 0.18)'

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function HorizontalGroundbed({ groundbed, proposedAnodes, anodeSpec, result, onHover, onFocus, focusedKey }) {
  const N = Math.max(1, num(proposedAnodes) || 1)
  const anodeL = num(groundbed.anodeLengthM)
  const spacing = num(groundbed.anodeSpacingM)
  const dia = num(groundbed.boreholeDiaM) || 0.3
  const startDepth = num(groundbed.startDepthM)

  // Total length of anode string
  const totalL = N * anodeL + Math.max(0, N - 1) * spacing
  const status = classifyStatus(result)
  const colors = STATUS_COLORS[status]

  // Layout: SVG viewBox 1000 x 360
  const VIEW_W = 1000
  const VIEW_H = 360
  const padL = 80
  const padR = 60
  const padT = 60
  const padB = 70
  const xScale = totalL > 0 ? (m) => padL + (m / totalL) * (VIEW_W - padL - padR) : () => VIEW_W / 2
  const trenchY = VIEW_H - padB - 60
  const trenchH = 60
  const anodeH = trenchH * 0.55
  const anodeY = trenchY + (trenchH - anodeH) / 2

  // Anode positions
  const anodes = []
  let cursor = 0
  for (let i = 0; i < N; i++) {
    const x0 = cursor
    const x1 = cursor + anodeL
    anodes.push({ idx: i, x0, x1, cx: (x0 + x1) / 2 })
    cursor = x1 + spacing
  }

  return (
    <g className="viz-gb-h-anodes">
      {/* Ground surface line */}
      <line
        x1={padL - 10}
        y1={padT - 20}
        x2={xScale(totalL) + 10}
        y2={padT - 20}
        stroke="currentColor"
        strokeOpacity={0.4}
        strokeWidth={1.5}
      />
      <text x={padL - 10} y={padT - 26} fontSize={10} fill="currentColor" opacity={0.65}>
        Surface (0 m)
      </text>

      {/* Soil layer above trench */}
      <rect
        x={padL - 10}
        y={padT - 20}
        width={xScale(totalL) - padL + 20}
        height={trenchY - (padT - 20)}
        fill={SOIL_FILL}
        stroke="none"
      />

      {/* Pipeline to the right of the trench (above), as context */}
      <line
        x1={xScale(totalL) + 12}
        y1={trenchY + trenchH / 2}
        x2={VIEW_W - 10}
        y2={trenchY + trenchH / 2}
        stroke={PIPELINE_LINE}
        strokeWidth={3}
        strokeDasharray="6 3"
        opacity={0.7}
      />
      <text x={VIEW_W - 12} y={trenchY + trenchH / 2 - 6} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.65}>
        → pipeline
      </text>

      {/* Trench / backfill (coke column as the trench) */}
      <rect
        x={xScale(0)}
        y={trenchY}
        width={xScale(totalL) - xScale(0)}
        height={trenchH}
        fill={BACKFILL_FILL}
        stroke={colors.line}
        strokeWidth={1.5}
        rx={3}
        ry={3}
      />
      <text
        x={xScale(0) - 6}
        y={trenchY + trenchH / 2 + 3}
        textAnchor="end"
        fontSize={9}
        fill="currentColor"
        opacity={0.7}
      >
        Trench
      </text>

      {/* Anodes */}
      {anodes.map((a) => {
        const xa = xScale(a.x0)
        const xb = xScale(a.x1)
        const w = Math.max(2, xb - xa - 1)
        const isFocused = focusedKey === `h-anode-${a.idx}`
        return (
          <g
            key={`h-anode-${a.idx}`}
            tabIndex={0}
            role="button"
            aria-label={`Anode ${a.idx + 1} of ${N}, length ${anodeL.toFixed(2)} metres, depth ${startDepth.toFixed(2)} metres`}
            onMouseEnter={(e) =>
              onHover({
                kind: 'horizontal-anode',
                x: e.clientX,
                y: e.clientY,
                data: { idx: a.idx, total: N, x0: a.x0, x1: a.x1, anodeL, startDepth, dia, anodeSpec },
              })
            }
            onMouseMove={(e) => onHover((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))}
            onMouseLeave={() => onHover(null)}
            onFocus={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              onFocus({
                kind: 'horizontal-anode',
                key: `h-anode-${a.idx}`,
                x: r.left + r.width / 2,
                y: r.top,
                data: { idx: a.idx, total: N, x0: a.x0, x1: a.x1, anodeL, startDepth, dia, anodeSpec },
              })
            }}
            onBlur={() => onFocus(null)}
            style={{ cursor: 'help', outline: 'none' }}
          >
            <rect
              x={xa + 0.5}
              y={anodeY}
              width={w}
              height={anodeH}
              fill={ANODE_FILL}
              stroke={ANODE_STROKE}
              strokeWidth={1.5}
              rx={2}
              ry={2}
              opacity={isFocused ? 1 : 0.9}
            />
            <text
              x={xa + w / 2}
              y={anodeY + anodeH / 2 + 3}
              textAnchor="middle"
              fontSize={9}
              fontWeight={600}
              fill="#fafafa"
              pointerEvents="none"
            >
              {a.idx + 1}
            </text>
          </g>
        )
      })}

      {/* Cable tail from leftmost anode to pipeline (visual cue) */}
      <line
        x1={xScale(0)}
        y1={trenchY + trenchH / 2}
        x2={xScale(0) - 18}
        y2={trenchY + trenchH / 2}
        stroke={ANODE_STROKE}
        strokeWidth={1.5}
        strokeDasharray="2 2"
      />
      <text
        x={xScale(0) - 22}
        y={trenchY + trenchH / 2 + 3}
        textAnchor="end"
        fontSize={9}
        fill="currentColor"
        opacity={0.7}
      >
        cable tail
      </text>

      {/* Spacing ticks between anodes */}
      {anodes.slice(0, -1).map((a, i) => {
        const tickX = xScale(a.x1 + spacing / 2)
        return (
          <g key={`h-tick-${i}`} aria-hidden="true">
            <line
              x1={tickX}
              y1={trenchY + trenchH + 6}
              x2={tickX}
              y2={trenchY + trenchH + 12}
              stroke="currentColor"
              strokeOpacity={0.5}
            />
            <text
              x={tickX}
              y={trenchY + trenchH + 24}
              textAnchor="middle"
              fontSize={9}
              fill="currentColor"
              opacity={0.7}
              fontFamily="var(--font-mono, monospace)"
            >
              {spacing.toFixed(1)} m
            </text>
          </g>
        )
      })}

      {/* Length axis baseline */}
      <line
        x1={xScale(0)}
        y1={trenchY + trenchH + 36}
        x2={xScale(totalL)}
        y2={trenchY + trenchH + 36}
        stroke="currentColor"
        strokeOpacity={0.3}
      />
      {anodes.map((a, i) => (
        <g key={`h-axis-${i}`} aria-hidden="true">
          <line
            x1={xScale(a.x0)}
            y1={trenchY + trenchH + 33}
            x2={xScale(a.x0)}
            y2={trenchY + trenchH + 39}
            stroke="currentColor"
            strokeOpacity={0.4}
          />
          {i === 0 && (
            <text
              x={xScale(0)}
              y={trenchY + trenchH + 52}
              textAnchor="middle"
              fontSize={9}
              fill="currentColor"
              opacity={0.7}
              fontFamily="var(--font-mono, monospace)"
            >
              0 m
            </text>
          )}
        </g>
      ))}
      <text
        x={xScale(totalL)}
        y={trenchY + trenchH + 52}
        textAnchor="middle"
        fontSize={9}
        fill="currentColor"
        opacity={0.7}
        fontFamily="var(--font-mono, monospace)"
      >
        {totalL.toFixed(2)} m
      </text>

      {/* Total length label */}
      <text
        x={VIEW_W / 2}
        y={trenchY - 8}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="currentColor"
        opacity={0.9}
      >
        Anode string — {N} anodes × {anodeL.toFixed(2)} m, spacing {spacing.toFixed(2)} m
      </text>
    </g>
  )
}

function VerticalGroundbed({ groundbed, proposedAnodes, anodeSpec, result, onHover, onFocus, focusedKey }) {
  const isDeep = groundbed.type === 'deepwell'
  const N = Math.max(1, num(proposedAnodes) || 1)
  const anodeL = num(groundbed.anodeLengthM)
  const spacing = num(groundbed.anodeSpacingM)
  const dia = num(groundbed.boreholeDiaM) || 0.3
  const startDepth = num(groundbed.startDepthM)
  const cokeCover = isDeep ? num(groundbed.cokeCoverM) : 0
  const cementPlug = isDeep ? num(groundbed.cementPlugM) : 0

  // Compute active column (matches calculations.js geometry: N anodes + (N-1) spacers)
  const activeL = result?.activeLengthM != null ? num(result.activeLengthM) : N * anodeL + Math.max(0, N - 1) * spacing
  const totalDepth = isDeep ? num(result?.totalDrillDepthM) || startDepth + activeL + cokeCover + cementPlug : startDepth + activeL
  const status = classifyStatus(result)
  const colors = STATUS_COLORS[status]

  // Layout
  const VIEW_W = 1000
  const VIEW_H = 520
  const padL = 90
  const padR = 60
  const padT = 40
  const padB = 50
  const boreholeX = VIEW_W / 2
  const boreholeW = 60
  const drawDepth = Math.max(totalDepth, startDepth + activeL + 1, 5)
  const yScale = (m) => padT + (m / drawDepth) * (VIEW_H - padT - padB)

  // Anode stack positions
  const anodes = []
  let top = startDepth
  for (let i = 0; i < N; i++) {
    const y0 = top
    const y1 = top + anodeL
    anodes.push({ idx: i, y0, y1, cy: (y0 + y1) / 2 })
    top = y1 + spacing
  }
  const lastAnode = anodes[anodes.length - 1]
  const activeEndY = lastAnode ? lastAnode.y1 : startDepth

  // Layer ranges (in m)
  const cokeY0 = isDeep ? activeEndY : null
  const cokeY1 = isDeep ? activeEndY + cokeCover : null
  const cementY0 = isDeep ? totalDepth - cementPlug : null
  const cementY1 = isDeep ? totalDepth : null

  return (
    <g className="viz-gb-v-anodes">
      {/* Ground surface line */}
      <line
        x1={padL - 20}
        y1={padT - 5}
        x2={VIEW_W - 30}
        y2={padT - 5}
        stroke="currentColor"
        strokeOpacity={0.45}
        strokeWidth={1.5}
      />
      <text
        x={padL - 20}
        y={padT - 12}
        fontSize={10}
        fill="currentColor"
        opacity={0.7}
      >
        Surface (0 m)
      </text>

      {/* Pipeline to the side (context) */}
      <line
        x1={padL - 30}
        y1={yScale(startDepth + activeL / 2)}
        x2={boreholeX - boreholeW / 2 - 16}
        y2={yScale(startDepth + activeL / 2)}
        stroke={PIPELINE_LINE}
        strokeWidth={3}
        opacity={0.6}
        strokeDasharray="6 3"
      />
      <text
        x={padL - 30}
        y={yScale(startDepth + activeL / 2) - 6}
        fontSize={9}
        fill="currentColor"
        opacity={0.7}
      >
        pipeline →
      </text>

      {/* Soil layer (left side, between surface and bottom) */}
      <rect
        x={padL - 20}
        y={padT - 5}
        width={VIEW_W - padL - padR + 10}
        height={VIEW_H - padT - padB + 5}
        fill={SOIL_FILL}
        opacity={0.5}
        stroke="none"
      />

      {/* Borehole column */}
      <rect
        x={boreholeX - boreholeW / 2}
        y={padT}
        width={boreholeW}
        height={yScale(totalDepth) - padT}
        fill={BOREHOLE_FILL}
        stroke={BOREHOLE_STROKE}
        strokeWidth={1.5}
        rx={3}
        ry={3}
      />
      <text
        x={boreholeX + boreholeW / 2 + 6}
        y={padT + 12}
        fontSize={9}
        fill="currentColor"
        opacity={0.7}
      >
        Borehole ⌀ {dia.toFixed(2)} m
      </text>

      {/* Coke backfill column (full active length) */}
      <rect
        x={boreholeX - boreholeW / 2 + 4}
        y={yScale(startDepth)}
        width={boreholeW - 8}
        height={yScale(activeEndY) - yScale(startDepth)}
        fill={COKE_FILL}
        stroke={COKE_STROKE}
        strokeWidth={0.5}
        strokeDasharray="2 2"
      />
      <text
        x={boreholeX - boreholeW / 2 - 6}
        y={(yScale(startDepth) + yScale(activeEndY)) / 2 + 3}
        textAnchor="end"
        fontSize={9}
        fill="currentColor"
        opacity={0.7}
      >
        Coke column
      </text>

      {/* Coke cover above top anode (deepwell only) */}
      {isDeep && cokeY0 != null && cokeCover > 0 && (
        <g>
          <rect
            x={boreholeX - boreholeW / 2 + 4}
            y={yScale(cokeY0)}
            width={boreholeW - 8}
            height={yScale(cokeY1) - yScale(cokeY0)}
            fill={COKE_FILL}
            stroke={COKE_STROKE}
            strokeWidth={0.5}
            strokeDasharray="3 2"
          />
          <text
            x={boreholeX + boreholeW / 2 + 6}
            y={(yScale(cokeY0) + yScale(cokeY1)) / 2 + 3}
            fontSize={9}
            fill="currentColor"
            opacity={0.7}
          >
            coke cover {cokeCover.toFixed(2)} m
          </text>
        </g>
      )}

      {/* Cement plug (deepwell only) */}
      {isDeep && cementY0 != null && cementPlug > 0 && (
        <g>
          <rect
            x={boreholeX - boreholeW / 2 + 4}
            y={yScale(cementY0)}
            width={boreholeW - 8}
            height={yScale(cementY1) - yScale(cementY0)}
            fill={CEMENT_FILL}
            stroke={CEMENT_STROKE}
            strokeWidth={0.5}
          />
          <text
            x={boreholeX + boreholeW / 2 + 6}
            y={(yScale(cementY0) + yScale(cementY1)) / 2 + 3}
            fontSize={9}
            fill="currentColor"
            opacity={0.7}
          >
            cement {cementPlug.toFixed(2)} m
          </text>
        </g>
      )}

      {/* Anodes */}
      {anodes.map((a) => {
        const isFocused = focusedKey === `v-anode-${a.idx}`
        return (
          <g
            key={`v-anode-${a.idx}`}
            tabIndex={0}
            role="button"
            aria-label={`Anode ${a.idx + 1} of ${N} at depth ${a.y0.toFixed(2)} to ${a.y1.toFixed(2)} metres`}
            onMouseEnter={(e) =>
              onHover({
                kind: 'vertical-anode',
                x: e.clientX,
                y: e.clientY,
                data: { idx: a.idx, total: N, y0: a.y0, y1: a.y1, dia, anodeSpec },
              })
            }
            onMouseMove={(e) => onHover((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))}
            onMouseLeave={() => onHover(null)}
            onFocus={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              onFocus({
                kind: 'vertical-anode',
                key: `v-anode-${a.idx}`,
                x: r.left + r.width / 2,
                y: r.top,
                data: { idx: a.idx, total: N, y0: a.y0, y1: a.y1, dia, anodeSpec },
              })
            }}
            onBlur={() => onFocus(null)}
            style={{ cursor: 'help', outline: 'none' }}
          >
            <rect
              x={boreholeX - boreholeW / 2 + 6}
              y={yScale(a.y0)}
              width={boreholeW - 12}
              height={Math.max(2, yScale(a.y1) - yScale(a.y0))}
              fill={ANODE_FILL}
              stroke={ANODE_STROKE}
              strokeWidth={1.5}
              rx={2}
              ry={2}
              opacity={isFocused ? 1 : 0.92}
            />
            <text
              x={boreholeX}
              y={(yScale(a.y0) + yScale(a.y1)) / 2 + 3}
              textAnchor="middle"
              fontSize={9}
              fontWeight={600}
              fill="#fafafa"
              pointerEvents="none"
            >
              {a.idx + 1}
            </text>
          </g>
        )
      })}

      {/* Depth axis on the right */}
      <g className="viz-gb-depth-axis" aria-hidden="true">
        <line
          x1={boreholeX + boreholeW / 2 + 30}
          y1={padT}
          x2={boreholeX + boreholeW / 2 + 30}
          y2={yScale(totalDepth)}
          stroke="currentColor"
          strokeOpacity={0.4}
        />
        {anodes.map((a, i) => (
          <g key={`v-tick-${i}`}>
            <line
              x1={boreholeX + boreholeW / 2 + 26}
              y1={yScale(a.y0)}
              x2={boreholeX + boreholeW / 2 + 34}
              y2={yScale(a.y0)}
              stroke="currentColor"
              strokeOpacity={0.4}
            />
            <text
              x={boreholeX + boreholeW / 2 + 38}
              y={yScale(a.y0) + 3}
              fontSize={9}
              fill="currentColor"
              opacity={0.7}
              fontFamily="var(--font-mono, monospace)"
            >
              {a.y0.toFixed(1)} m
            </text>
          </g>
        ))}
        <line
          x1={boreholeX + boreholeW / 2 + 26}
          y1={yScale(totalDepth)}
          x2={boreholeX + boreholeW / 2 + 34}
          y2={yScale(totalDepth)}
          stroke="currentColor"
          strokeOpacity={0.5}
        />
        <text
          x={boreholeX + boreholeW / 2 + 38}
          y={yScale(totalDepth) + 3}
          fontSize={9}
          fontWeight={600}
          fill="currentColor"
          opacity={0.85}
          fontFamily="var(--font-mono, monospace)"
        >
          {totalDepth.toFixed(1)} m
        </text>
        <text
          x={boreholeX + boreholeW / 2 + 30}
          y={padT - 12}
          textAnchor="middle"
          fontSize={9}
          fill="currentColor"
          opacity={0.65}
        >
          Depth
        </text>
      </g>
    </g>
  )
}

function StatusBadge({ result }) {
  const status = classifyStatus(result)
  const labels = GROUNDBED_STATUS_LABELS
  return (
    <div
      className={`viz-gb-status-badge is-${status}`}
      style={{ borderColor: STATUS_COLORS[status].line, color: STATUS_COLORS[status].strong }}
      role="status"
      aria-live="polite"
    >
      <span className="viz-gb-status-dot" style={{ background: STATUS_COLORS[status].strong }} aria-hidden="true" />
      {labels[status]}
    </div>
  )
}

function SummaryPanel({ groundbed, proposedAnodes, anodeSpec, result }) {
  const isDeep = groundbed.type === 'deepwell'
  const rows = [
    { label: 'Type', value: groundbed.type === 'deepwell' ? 'Deep well (vertical)' : groundbed.type === 'shallow_vertical' ? 'Shallow vertical' : 'Distributed (horizontal)' },
    { label: 'Anode spec', value: anodeSpec?.label || anodeSpec?.id || '—' },
    { label: 'Anodes', value: num(proposedAnodes) },
    { label: 'Active length L_a', value: result?.activeLengthM != null ? `${result.activeLengthM.toFixed(2)} m` : '—' },
  ]
  if (isDeep && result?.totalDrillDepthM != null) {
    rows.push({ label: 'Total drill depth', value: `${result.totalDrillDepthM.toFixed(2)} m` })
  }
  if (result?.groundbedResistanceOhm != null) {
    rows.push({ label: 'R_G (calculated)', value: `${result.groundbedResistanceOhm.toFixed(4)} Ω`, strong: true })
  }
  if (result?.maxAllowableGroundbedRes != null) {
    rows.push({ label: 'R_G max allowable', value: `${result.maxAllowableGroundbedRes.toFixed(4)} Ω` })
  }
  if (result?.designLifeYears != null) {
    rows.push({ label: 'Design life Y', value: `${result.designLifeYears.toFixed(1)} yrs`, strong: true })
  }
  if (result?.targetDesignLifeYears != null) {
    rows.push({ label: 'Target life', value: `${result.targetDesignLifeYears} yrs` })
  }
  return (
    <dl className="viz-gb-summary">
      {rows.map((r) => (
        <div key={r.label} className="viz-gb-summary-row">
          <dt>{r.label}</dt>
          <dd style={r.strong ? { color: 'var(--text-primary, #fafafa)', fontWeight: 600 } : undefined}>
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function GroundbedVisualizer({ station, height, className = '' }) {
  const [tooltip, setTooltip] = useState(null)
  const [focusedKey, setFocusedKey] = useState(null)

  const groundbed = station?.groundbed
  const result = station?.lastCalcResult
  const proposedAnodes = num(station?.proposedAnodes) || num(groundbed?.numHoles) || 0
  const anodeSpec = station?.anodeSpec
  const status = useMemo(() => classifyStatus(result), [result])

  const handleHover = useCallback((payload) => {
    if (typeof payload === 'function') {
      setTooltip(payload)
    } else {
      setTooltip(payload)
    }
  }, [])

  const handleFocus = useCallback((payload) => {
    if (typeof payload === 'function') {
      setFocusedKey((k) => payload?.key ?? null)
      setTooltip((t) => (t ? { ...t } : t))
    } else {
      setFocusedKey(payload?.key ?? null)
      setTooltip(payload)
    }
  }, [])

  if (!groundbed) {
    return (
      <EmptyState
        icon={Layers}
        title="No groundbed defined"
        description="Configure a groundbed (type, depth, anodes) to see the schematic."
        compact
      />
    )
  }

  const isHorizontal = groundbed.type === 'distributed'
  const viewBox = isHorizontal ? [0, 0, 1000, 360] : [0, 0, 1000, 520]
  const minHeight = height ?? (isHorizontal ? 360 : 520)

  const typeLabel = isHorizontal
    ? 'Distributed (horizontal) groundbed'
    : groundbed.type === 'deepwell'
      ? 'Deep well (vertical) groundbed'
      : 'Shallow vertical groundbed'

  return (
    <div className={`viz-groundbed ${className}`.trim()}>
      <div className="viz-gb-header">
        <div>
          <h3 className="viz-gb-title">{typeLabel}</h3>
          <p className="viz-gb-subtitle">
            {num(proposedAnodes)} anodes · live from {isHorizontal ? 'distributed' : 'vertical'} calculation
          </p>
        </div>
        <StatusBadge result={result} />
      </div>

      <ZoomPan
        initialViewBox={viewBox}
        ariaLabel={`${typeLabel}. Use plus and minus to zoom, drag to pan, zero to reset.`}
      >
        {({ viewBox: vb, reset, zoomIn, zoomOut, zoomPct }) => (
          <>
            <VisualizationCanvas
              viewBox={vb}
              aspectRatio={`${viewBox[2]} / ${viewBox[3]}`}
              minHeight={minHeight}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              ariaLabel={`${typeLabel} schematic with ${proposedAnodes} anodes`}
            >
              {isHorizontal ? (
                <HorizontalGroundbed
                  groundbed={groundbed}
                  proposedAnodes={proposedAnodes}
                  anodeSpec={anodeSpec}
                  result={result}
                  onHover={handleHover}
                  onFocus={handleFocus}
                  focusedKey={focusedKey}
                />
              ) : (
                <VerticalGroundbed
                  groundbed={groundbed}
                  proposedAnodes={proposedAnodes}
                  anodeSpec={anodeSpec}
                  result={result}
                  onHover={handleHover}
                  onFocus={handleFocus}
                  focusedKey={focusedKey}
                />
              )}
            </VisualizationCanvas>

            <div className="viz-gb-controls" aria-hidden="true">
              <button type="button" onClick={zoomOut} aria-label="Zoom out">−</button>
              <span className="viz-gb-zoom-pct">{zoomPct}%</span>
              <button type="button" onClick={zoomIn} aria-label="Zoom in">+</button>
              <button type="button" onClick={reset} aria-label="Reset zoom">⟲</button>
            </div>
          </>
        )}
      </ZoomPan>

      <VizTooltip target={tooltip?.data} x={tooltip?.x} y={tooltip?.y} onDismiss={() => setTooltip(null)}>
        {(d) => {
          if (!d) return null
          if (tooltip.kind === 'horizontal-anode') {
            return (
              <div>
                <div className="viz-tooltip-title">
                  Anode {d.idx + 1} of {d.total}
                </div>
                <div className="viz-tooltip-row">
                  <span>Length</span>
                  <strong>{d.anodeL.toFixed(2)} m</strong>
                </div>
                <div className="viz-tooltip-row">
                  <span>Depth</span>
                  <strong>{d.startDepth.toFixed(2)} m</strong>
                </div>
                <div className="viz-tooltip-row">
                  <span>Diameter</span>
                  <strong>{d.dia.toFixed(2)} m</strong>
                </div>
                {d.anodeSpec?.label && (
                  <div className="viz-tooltip-row">
                    <span>Spec</span>
                    <strong>{d.anodeSpec.label}</strong>
                  </div>
                )}
              </div>
            )
          }
          if (tooltip.kind === 'vertical-anode') {
            return (
              <div>
                <div className="viz-tooltip-title">
                  Anode {d.idx + 1} of {d.total}
                </div>
                <div className="viz-tooltip-row">
                  <span>Top depth</span>
                  <strong>{d.y0.toFixed(2)} m</strong>
                </div>
                <div className="viz-tooltip-row">
                  <span>Bottom depth</span>
                  <strong>{d.y1.toFixed(2)} m</strong>
                </div>
                <div className="viz-tooltip-row">
                  <span>Length</span>
                  <strong>{(d.y1 - d.y0).toFixed(2)} m</strong>
                </div>
                {d.anodeSpec?.label && (
                  <div className="viz-tooltip-row">
                    <span>Spec</span>
                    <strong>{d.anodeSpec.label}</strong>
                  </div>
                )}
              </div>
            )
          }
          return null
        }}
      </VizTooltip>

      <div className="viz-gb-footer">
        <SummaryPanel
          groundbed={groundbed}
          proposedAnodes={proposedAnodes}
          anodeSpec={anodeSpec}
          result={result}
        />
        <VizLegend
          title="Status"
          items={[
            { id: 'ok', label: 'Within limits', color: STATUS_COLORS.ok.line },
            { id: 'warn', label: 'Review required', color: STATUS_COLORS.warn.line },
            { id: 'fail', label: 'Exceeds limits', color: STATUS_COLORS.fail.line },
            { id: 'draft', label: 'Awaiting calculation', color: STATUS_COLORS.draft.line },
          ]}
        />
      </div>
    </div>
  )
}
