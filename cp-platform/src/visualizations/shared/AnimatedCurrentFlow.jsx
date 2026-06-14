/**
 * AnimatedCurrentFlow.jsx
 *
 * SVG component that renders animated particles flowing along a path.
 * Used in cable circuit diagrams to show current direction and magnitude.
 *
 * Pure CSS animation — no JS animation loops.
 * GPU-accelerated via transform/opacity.
 */

const PARTICLE_COUNT = 6

/**
 * @param {object} props
 * @param {string} props.d - SVG path d attribute
 * @param {string} [props.color='#3b82f6'] - Particle color
 * @param {number} [props.speed=3] - Animation duration in seconds
 * @param {number} [props.particleSize=3] - Radius of each particle
 * @param {number} [props.opacity=0.7] - Particle opacity
 * @param {string} [props.id] - Unique ID for the gradient/path
 */
export function AnimatedCurrentFlow({
  d,
  color = '#3b82f6',
  speed = 3,
  particleSize = 3,
  opacity = 0.7,
  id,
}) {
  const pathId = id || `flow-${Math.random().toString(36).slice(2, 8)}`

  return (
    <g className="viz-circuit-flow">
      {/* The path itself (invisible, just for reference) */}
      <path
        d={d}
        fill="none"
        stroke="none"
        id={pathId}
      />

      {/* Animated particles */}
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <circle
          key={i}
          r={particleSize}
          fill={color}
          opacity={opacity}
          className="viz-flow-particle"
          style={{
            offsetPath: `path("${d}")`,
            offsetRotate: '0deg',
            animationDuration: `${speed}s`,
            animationDelay: `${(i * speed) / PARTICLE_COUNT}s`,
          }}
        />
      ))}
    </g>
  )
}

/**
 * DirectionalArrow — SVG arrow marker for current direction.
 */
export function DirectionalArrow({ x, y, angle = 0, color = '#3b82f6', size = 8 }) {
  return (
    <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
      <polygon
        points={`0,${-size / 2} ${size},0 0,${size / 2}`}
        fill={color}
        opacity={0.8}
      />
    </g>
  )
}

/**
 * CurrentLabel — SVG text label showing current magnitude.
 */
export function CurrentLabel({ x, y, value, unit = 'A', color = '#d4d4d8' }) {
  if (value == null) return null
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill={color}
      fontSize={10}
      fontFamily="var(--font-mono, monospace)"
      fontWeight={600}
    >
      {typeof value === 'number' ? value.toFixed(2) : value} {unit}
    </text>
  )
}
