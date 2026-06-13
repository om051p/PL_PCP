/**
 * VizAxis
 *
 * Minimal SVG axis renderer. Draws an axis line, ticks, and labels.
 *
 * Props:
 *   - orientation: 'bottom' | 'left' | 'right' | 'top'
 *   - domain: [min, max]
 *   - range: [start, end] in viewBox units
 *   - ticks: array of values; if omitted, auto-generates ~5
 *   - label: optional axis title
 *   - format: (v) => string for tick labels
 *   - tickSize: length of tick mark
 */
export function VizAxis({
  orientation = 'bottom',
  domain = [0, 100],
  range = [0, 800],
  ticks,
  label,
  format = (v) => String(v),
  tickSize = 6,
  className = '',
}) {
  const [d0, d1] = domain
  const [r0, r1] = range
  const scale = (v) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0)
  const invScale = (px) => d0 + ((px - r0) / (r1 - r0 || 1)) * (d1 - d0)

  const tickValues =
    ticks ||
    (() => {
      const n = 5
      const step = (d1 - d0) / n
      return Array.from({ length: n + 1 }, (_, i) => d0 + i * step)
    })()

  const isHorizontal = orientation === 'bottom' || orientation === 'top'
  const isLeft = orientation === 'left'
  const isRight = orientation === 'right'

  return (
    <g
      className={`viz-axis viz-axis--${orientation} ${className}`.trim()}
      aria-hidden="true"
    >
      {isHorizontal && (
        <line x1={scale(d0)} y1={0} x2={scale(d1)} y2={0} stroke="currentColor" strokeWidth={1} />
      )}
      {(isLeft || isRight) && (
        <line x1={0} y1={scale(d0)} x2={0} y2={scale(d1)} stroke="currentColor" strokeWidth={1} />
      )}

      {tickValues.map((v, i) => {
        const pos = scale(v)
        if (isHorizontal) {
          return (
            <g key={i} transform={`translate(${pos},0)`}>
              <line y1={0} y2={tickSize} stroke="currentColor" strokeWidth={1} />
              <text y={tickSize + 12} textAnchor="middle" fontSize={10} fill="currentColor">
                {format(v)}
              </text>
            </g>
          )
        }
        const tx = isRight ? tickSize + 4 : -(tickSize + 4)
        return (
          <g key={i} transform={`translate(0,${pos})`}>
            <line x1={-tickSize} x2={0} stroke="currentColor" strokeWidth={1} />
            <text x={tx} y={3} textAnchor={isRight ? 'start' : 'end'} fontSize={10} fill="currentColor">
              {format(v)}
            </text>
          </g>
        )
      })}

      {label && (
        <text
          x={isHorizontal ? (scale(d0) + scale(d1)) / 2 : (isRight ? tickSize + 6 : -(tickSize + 6))}
          y={isHorizontal ? tickSize + 28 : (scale(d0) + scale(d1)) / 2}
          textAnchor="middle"
          fontSize={11}
          fill="currentColor"
          fontWeight={500}
          transform={
            !isHorizontal
              ? `rotate(-90, ${isRight ? tickSize + 6 : -(tickSize + 6)}, ${(scale(d0) + scale(d1)) / 2})`
              : undefined
          }
        >
          {label}
        </text>
      )}
      {/* suppress unused warning */}
      <metadata data-inverse-scale={invScale(0)} />
    </g>
  )
}
