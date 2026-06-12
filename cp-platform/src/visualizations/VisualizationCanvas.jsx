import { useId, useRef, useState, useCallback, useEffect } from 'react'

/**
 * VisualizationCanvas
 *
 * Responsive SVG wrapper for engineering visualizations. Sets up the SVG
 * element, viewBox, ARIA role, and dark-mode class. Children receive
 * the SVG dimensions and may use any SVG primitives.
 *
 * Consumers wrap their content with this and pass a `viewBox` (either a
 * static 4-tuple or a dynamic value from ZoomPan). The canvas auto-resizes
 * to its parent via ResizeObserver.
 */
export function VisualizationCanvas({
  viewBox = '0 0 800 400',
  preserveAspectRatio = 'xMidYMid meet',
  role = 'img',
  ariaLabel,
  ariaDescribedBy,
  className = '',
  aspectRatio = '16 / 9',
  minHeight = 200,
  onSizeChange,
  children,
}) {
  const id = useId()
  const containerRef = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize({ width, height })
      onSizeChange?.({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [onSizeChange])

  const handleRef = useCallback((node) => {
    containerRef.current = node
  }, [])

  return (
    <div
      ref={handleRef}
      className={`viz-canvas ${className}`.trim()}
      style={{ aspectRatio, minHeight, width: '100%' }}
    >
      <svg
        id={id}
        viewBox={viewBox}
        preserveAspectRatio={preserveAspectRatio}
        role={role}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        {children}
      </svg>
    </div>
  )
}
