/**
 * ProtectionBand
 *
 * Renders the NACE protection band on a potential-vs-distance plot.
 * The "protected" region is conventionally at or more negative than
 * -850 mV (vs Cu/CuSO4 reference). Configurable.
 *
 * Usage:
 *   <ProtectionBand domain={[0, 50]} range={[-1500, -500]} />
 *
 * The component draws a filled rect from minX to maxX at the protection
 * threshold and labels it.
 */
export function ProtectionBand({
  domain = [0, 50],
  range = [-1500, -500],
  threshold = -850,
  label = 'NACE protection threshold (-850 mV vs Cu/CuSO4)',
  color = 'rgba(16, 185, 129, 0.10)',
  borderColor = 'rgba(16, 185, 129, 0.45)',
  protectedColor = 'rgba(16, 185, 129, 0.05)',
  showLabel = true,
}) {
  const [d0, d1] = domain
  const [r0, r1] = range
  const xScale = (v) => d0 + ((v - d0) / (d1 - d0 || 1)) * 100 // returns % in viewBox 0-100
  // For an SVG group with domain, we use a generic mapping by passing a
  // 0..100 viewBox. Callers can wrap in their own coordinate system.
  const yTop = r0
  const yBottom = threshold
  const yNorm = (v) => ((v - r0) / (r1 - r0 || 1)) * 100
  const yProtected = yNorm(yBottom)
  const yRange = yNorm(yTop)
  void xScale // suppress unused warning

  return (
    <g className="viz-protection-band" aria-hidden="true">
      {/* Subtle fill for the entire protected region (more negative than threshold) */}
      <rect
        x="0"
        y={yProtected}
        width="100"
        height={yRange - yProtected}
        fill={protectedColor}
      />
      {/* Threshold line */}
      <line
        x1="0"
        y1={yProtected}
        x2="100"
        y2={yProtected}
        stroke={borderColor}
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      {showLabel && (
        <text
          x="0.5"
          y={yProtected - 4}
          fontSize={10}
          fill={borderColor}
          fontWeight={500}
        >
          {label}
        </text>
      )}
    </g>
  )
}
