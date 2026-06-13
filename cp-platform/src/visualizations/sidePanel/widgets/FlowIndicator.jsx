import { motion } from 'framer-motion'
import { DURATION, EASE } from '../../../motion/timings'
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion'

/**
 * FlowIndicator
 *
 * A small SVG diagram with a chain of nodes and a moving particle
 * travelling along the path. Used to indicate the direction of current
 * flow (TR → groundbed → earth → pipeline → TR).
 *
 * The path itself is a static polyline. Animation is purely visual;
 * no engineering values are derived here.
 */
export function FlowIndicator({
  nodes = [],
  width = 240,
  height = 100,
  speed = 4,
  ariaLabel = 'Current flow indicator',
  reduced,
}) {
  const prefersReduced = usePrefersReducedMotion()
  const isReduced = reduced ?? prefersReduced
  if (!nodes || nodes.length < 2) return null

  // Layout: distribute nodes evenly along the X axis
  const padX = 30
  const padY = 30
  const innerW = width - padX * 2
  const cy = height / 2
  const points = nodes.map((n, i) => ({
    x: padX + (innerW * i) / (nodes.length - 1),
    y: cy,
    label: n.label,
    tone: n.tone || 'neutral',
  }))

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ')

  const lineLength = innerW

  return (
    <div className="viz-side-flow" role="img" aria-label={ariaLabel}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {/* base line */}
        <line
          x1={padX}
          y1={cy}
          x2={padX + innerW}
          y2={cy}
          stroke="var(--border, #27272a)"
          strokeWidth={1.5}
          strokeDasharray="3 4"
        />
        {/* moving particle */}
        {!isReduced && (
          <motion.circle
            cy={cy}
            r={4}
            fill="#3b82f6"
            initial={{ cx: padX, opacity: 0 }}
            animate={{ cx: [padX, padX + innerW, padX], opacity: [0, 1, 0] }}
            transition={{
              duration: speed,
              ease: 'linear',
              repeat: Infinity,
              repeatDelay: 0.3,
            }}
          />
        )}
        {/* nodes */}
        {points.map((p, i) => {
          const tone = p.tone
          const fill = tone === 'ok' ? '#10b981' : tone === 'warn' ? '#f59e0b' : tone === 'fail' ? '#ef4444' : 'var(--text-secondary, #d4d4d8)'
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={6}
                fill="var(--card, #18181b)"
                stroke={fill}
                strokeWidth={1.5}
              />
              {p.label && (
                <text
                  x={p.x}
                  y={p.y + 22}
                  textAnchor="middle"
                  fontSize={10}
                  fill="currentColor"
                  opacity={0.7}
                >
                  {p.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
