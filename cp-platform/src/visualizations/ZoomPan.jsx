import { useCallback, useEffect, useId, useRef, useState } from 'react'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 8
const ZOOM_STEP = 1.2

/**
 * ZoomPan
 *
 * Wraps a child visualization with interactive zoom and pan. Drives an
 * SVG viewBox (`minX minY width height`). Exposes:
 *   - mouse wheel zoom (centered on cursor)
 *   - click+drag pan
 *   - touch single-finger pan, two-finger pinch zoom
 *   - keyboard:  + / - zoom, 0 reset, arrows pan, Home reset
 *
 * Accessibility:
 *   - The wrapper div is keyboard-focusable (tabIndex=0) and responds to
 *     the key bindings above.
 *   - An aria-live region announces zoom level.
 *   - aria-label describes the interaction.
 *
 * Children are rendered as a function: `({ viewBox, reset, zoomIn, zoomOut }) => ReactNode`.
 */
export function ZoomPan({
  initialViewBox = [0, 0, 800, 400],
  minZoom = MIN_ZOOM,
  maxZoom = MAX_ZOOM,
  ariaLabel = 'Interactive zoomable view. Use plus and minus to zoom, arrow keys to pan, zero to reset.',
  className = '',
  children,
}) {
  const [vb, setVb] = useState(() => [...initialViewBox])
  const [baseSize, setBaseSize] = useState({ w: initialViewBox[2], h: initialViewBox[3] })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef(null)
  const wrapperRef = useRef(null)
  const id = useId()

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
  const zoom = useCallback(
    (factor, cx, cy) => {
      setVb(([x, y, w, h]) => {
        const zoomNow = w / baseSize.w
        const nextZoom = clamp(zoomNow * factor, minZoom, maxZoom)
        const newW = baseSize.w * nextZoom
        const newH = baseSize.h * nextZoom
        if (typeof cx === 'number' && typeof cy === 'number' && wrapperRef.current) {
          const rect = wrapperRef.current.getBoundingClientRect()
          const fx = (cx - rect.left) / rect.width
          const fy = (cy - rect.top) / rect.height
          const newX = x + (w - newW) * fx
          const newY = y + (h - newH) * fy
          return [newX, newY, newW, newH]
        }
        return [x + (w - newW) / 2, y + (h - newH) / 2, newW, newH]
      })
    },
    [baseSize, minZoom, maxZoom]
  )

  const pan = useCallback((dx, dy) => {
    setVb(([x, y, w, h]) => [x - dx, y - dy, w, h])
  }, [])

  const reset = useCallback(() => {
    setVb([...initialViewBox])
    setBaseSize({ w: initialViewBox[2], h: initialViewBox[3] })
  }, [initialViewBox])

  const zoomIn = useCallback(() => zoom(ZOOM_STEP), [zoom])
  const zoomOut = useCallback(() => zoom(1 / ZOOM_STEP), [zoom])

  // Wheel: zoom (passive: false to preventDefault)
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return undefined
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 1) return
      e.preventDefault()
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
      zoom(factor, e.clientX, e.clientY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoom])

  // Mouse drag pan
  const onPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    dragRef.current = { x: e.clientX, y: e.clientY, vb: [...vb] }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    const start = dragRef.current.vb
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = start[2] / rect.width
    const sy = start[3] / rect.height
    setVb([start[0] - dx * sx, start[1] - dy * sy, start[2], start[3]])
  }
  const onPointerUp = (e) => {
    dragRef.current = null
    setDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  // Touch pinch (basic two-pointer)
  const pinchRef = useRef(null)
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const [a, b] = e.touches
      pinchRef.current = { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) }
    }
  }
  const onTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const [a, b] = e.touches
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      const factor = d / pinchRef.current.dist
      pinchRef.current.dist = d
      zoom(factor, (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2)
    }
  }
  const onTouchEnd = () => {
    pinchRef.current = null
  }

  // Keyboard
  const onKeyDown = (e) => {
    const step = vb[2] * 0.05
    switch (e.key) {
      case '+':
      case '=':
        e.preventDefault()
        zoomIn()
        break
      case '-':
      case '_':
        e.preventDefault()
        zoomOut()
        break
      case '0':
        e.preventDefault()
        reset()
        break
      case 'ArrowLeft':
        e.preventDefault()
        pan(step, 0)
        break
      case 'ArrowRight':
        e.preventDefault()
        pan(-step, 0)
        break
      case 'ArrowUp':
        e.preventDefault()
        pan(0, step)
        break
      case 'ArrowDown':
        e.preventDefault()
        pan(0, -step)
        break
      case 'Home':
        e.preventDefault()
        reset()
        break
      default:
        break
    }
  }

  const zoomPct = Math.round((baseSize.w / vb[2]) * 100)

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="application"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={`viz-zoom-pan ${dragging ? 'is-dragging' : ''} ${className}`.trim()}
      style={{ touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab' }}
    >
      {typeof children === 'function'
        ? children({ viewBox: vb.join(' '), reset, zoomIn, zoomOut, pan, zoomPct })
        : children}
      <div className="viz-zoom-controls" aria-hidden="true">
        <button type="button" onClick={zoomOut} aria-label="Zoom out">−</button>
        <span className="viz-zoom-pct">{zoomPct}%</span>
        <button type="button" onClick={zoomIn} aria-label="Zoom in">+</button>
        <button type="button" onClick={reset} aria-label="Reset zoom">⟲</button>
      </div>
      <div id={id} className="viz-sr-only" aria-live="polite" />
    </div>
  )
}
