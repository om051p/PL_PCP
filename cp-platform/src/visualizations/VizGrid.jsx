/**
 * VizGrid
 *
 * Lightweight grid lines for an axis. Pairs well with VizAxis.
 */
export function VizGrid({
  orientation = 'x',
  domain = [0, 100],
  range = [0, 800],
  ticks,
  stroke = 'currentColor',
  strokeOpacity = 0.12,
  strokeWidth = 1,
}) {
  const [d0, d1] = domain
  const [r0, r1] = range
  const scale = (v) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0)
  const tickValues =
    ticks ||
    (() => {
      const n = 5
      const step = (d1 - d0) / n
      return Array.from({ length: n + 1 }, (_, i) => d0 + i * step)
    })()

  const isX = orientation === 'x'

  return (
    <g className="viz-grid" aria-hidden="true">
      {tickValues.map((v, i) => {
        const pos = scale(v)
        return isX ? (
          <line key={i} x1={pos} y1={r0} x2={pos} y2={r1} stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={strokeWidth} />
        ) : (
          <line key={i} x1={r0} y1={pos} x2={r1} y2={pos} stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={strokeWidth} />
        )
      })}
    </g>
  )
}
