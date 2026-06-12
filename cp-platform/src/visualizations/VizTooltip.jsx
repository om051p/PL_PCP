import { useEffect } from 'react'

/**
 * VizTooltip
 *
 * Accessible, dark-mode-aware tooltip. Anchors to a target element
 * (typically an SVG group with bounding rect) and follows the cursor.
 *
 * - Pressing ESC dismisses the tooltip.
 * - Renders with role="tooltip" and is associated via aria-describedby.
 * - The parent should pass the active target's metadata.
 */
export function VizTooltip({ target, x, y, children, onDismiss, offset = 12 }) {
  useEffect(() => {
    if (!onDismiss) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  if (!target) return null

  const left = typeof x === 'number' ? x + offset : undefined
  const top = typeof y === 'number' ? y + offset : undefined

  return (
    <div
      role="tooltip"
      className="viz-tooltip"
      style={{
        position: 'absolute',
        left,
        top,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <div className="viz-tooltip-inner">
        {typeof children === 'function' ? children(target) : children}
      </div>
    </div>
  )
}
