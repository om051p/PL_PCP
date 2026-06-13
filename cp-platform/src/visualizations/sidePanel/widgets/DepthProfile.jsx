import { motion } from 'framer-motion'
import { useId } from 'react'
import { DURATION, EASE } from '../../../motion/timings'

/**
 * DepthProfile
 *
 * A vertical representation of the groundbed column. Surface at top,
 * anodes highlighted, total depth and active length labelled.
 * Subtle staggered fade-in for the anodes.
 *
 * Pure display — geometry is passed in.
 */
export function DepthProfile({
  surfaceLabel = 'Surface (0 m)',
  totalDepthM = 0,
  activeLengthM = 0,
  numAnodes = 0,
  ariaLabel = 'Depth profile',
}) {
  const id = useId()
  const W = 140
  const H = 220
  const padX = 24
  const padY = 20
  const drawDepth = Math.max(totalDepthM, activeLengthM + 1, 5)
  const innerH = H - padY * 2
  const yScale = (m) => padY + (m / drawDepth) * innerH
  const activeY0 = yScale(0)
  const activeY1 = yScale(activeLengthM)
  const totalY1 = yScale(totalDepthM)
  const boreholeX = W / 2
  const boreholeW = 24

  return (
    <div className="viz-side-depth" role="img" aria-label={ariaLabel}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        {/* soil background */}
        <rect x={padX - 12} y={padY - 4} width={W - padX * 2 + 24} height={H - padY * 2 + 4} fill="rgba(120, 53, 15, 0.12)" />
        {/* surface line */}
        <line x1={padX - 12} y1={padY - 6} x2={W - padX + 12} y2={padY - 6} stroke="currentColor" strokeOpacity={0.5} strokeWidth={1} />
        {/* borehole */}
        <rect
          x={boreholeX - boreholeW / 2}
          y={padY}
          width={boreholeW}
          height={Math.max(0, totalY1 - padY)}
          fill="rgba(24, 24, 27, 0.7)"
          stroke="#52525b"
          strokeWidth={1}
          rx={2}
          ry={2}
        />
        {/* active column highlight */}
        <rect
          x={boreholeX - boreholeW / 2 + 3}
          y={activeY0}
          width={boreholeW - 6}
          height={Math.max(0, activeY1 - activeY0)}
          fill="rgba(168, 85, 247, 0.25)"
        />
        {/* anode markers (staggered animation) */}
        {Array.from({ length: numAnodes }, (_, i) => {
          const t = numAnodes === 1 ? 0.5 : i / (numAnodes - 1)
          const ay = activeY0 + t * (activeY1 - activeY0)
          return (
            <motion.rect
              key={i}
              x={boreholeX - boreholeW / 2 + 4}
              y={ay - 2}
              width={boreholeW - 8}
              height={4}
              fill="#a855f7"
              stroke="#6b21a8"
              strokeWidth={0.5}
              rx={1}
              initial={{ opacity: 0, scaleY: 0.4 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{
                duration: DURATION.base,
                ease: EASE.standard,
                delay: i * 0.05,
              }}
            />
          )
        })}
        {/* depth labels */}
        <text x={padX - 14} y={padY - 10} fontSize={8} fill="currentColor" opacity={0.6} textAnchor="start">
          {surfaceLabel}
        </text>
        <text
          x={W - padX + 14}
          y={activeY0 - 4}
          fontSize={8}
          fill="currentColor"
          opacity={0.65}
          textAnchor="end"
          fontFamily="var(--font-mono, monospace)"
        >
          {activeLengthM.toFixed(1)} m
        </text>
        <text
          x={W - padX + 14}
          y={totalY1 + 4}
          fontSize={8}
          fontWeight={600}
          fill="currentColor"
          opacity={0.85}
          textAnchor="end"
          fontFamily="var(--font-mono, monospace)"
        >
          {totalDepthM.toFixed(1)} m
        </text>
      </svg>
    </div>
  )
}
