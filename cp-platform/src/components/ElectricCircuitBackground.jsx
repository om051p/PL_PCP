import { useEffect, useRef } from 'react'

/**
 * ElectricCircuitBackground
 *
 * Procedural animated circuit network with:
 *   - Random node points connected by proximity-based lines
 *   - 3 color variants (blue / cyan / teal) with stroke-dasharray pulse
 *   - 3 drifting gradient orbs
 *   - Floating particles drifting upward
 *   - Random lightning strikes
 *   - Mouse proximity boost on nearby paths
 *   - Responsive regeneration on window resize
 *
 * Self-contained: direct DOM manipulation via refs (no React state churn).
 */
export function ElectricCircuitBackground() {
  const svgRef = useRef(null)
  const particlesRef = useRef(null)
  const lightningRef = useRef(null)

  useEffect(() => {
    const svg = svgRef.current
    const particles = particlesRef.current
    const lightning = lightningRef.current
    if (!svg || !particles || !lightning) return

    let resizeTimeout = null

    const pointToLineDistance = (px, py, x1, y1, x2, y2) => {
      const A = px - x1
      const B = py - y1
      const C = x2 - x1
      const D = y2 - y1
      const dot = A * C + B * D
      const len_sq = C * C + D * D
      let param = -1
      if (len_sq !== 0) param = dot / len_sq
      let xx, yy
      if (param < 0) { xx = x1; yy = y1 }
      else if (param > 1) { xx = x2; yy = y2 }
      else { xx = x1 + param * C; yy = y1 + param * D }
      return Math.hypot(px - xx, py - yy)
    }

    const generateCircuit = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)

      // Remove all children except <defs>
      const children = Array.from(svg.childNodes)
      for (const child of children) {
        if (child.nodeName !== 'defs') svg.removeChild(child)
      }

      const nodes = []
      const numNodes = Math.floor((width * height) / 25000)
      for (let i = 0; i < numNodes; i++) {
        nodes.push({ x: Math.random() * width, y: Math.random() * height })
      }

      const paths = []
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)
          if (dist < 200 && Math.random() > 0.3) {
            paths.push({
              x1: nodes[i].x, y1: nodes[i].y,
              x2: nodes[j].x, y2: nodes[j].y,
            })
          }
        }
      }

      const NS = 'http://www.w3.org/2000/svg'
      paths.forEach((p) => {
        const line = document.createElementNS(NS, 'line')
        line.setAttribute('x1', p.x1)
        line.setAttribute('y1', p.y1)
        line.setAttribute('x2', p.x2)
        line.setAttribute('y2', p.y2)
        const rand = Math.random()
        if (rand > 0.7) line.classList.add('circuit-path', 'active')
        else if (rand > 0.5) line.classList.add('circuit-path', 'active-2')
        else if (rand > 0.3) line.classList.add('circuit-path', 'active-3')
        else line.classList.add('circuit-path')
        const length = Math.hypot(p.x2 - p.x1, p.y2 - p.y1)
        line.style.strokeDasharray = `${length / 4} ${length / 2}`
        svg.appendChild(line)
      })

      nodes.forEach((n) => {
        const circle = document.createElementNS(NS, 'circle')
        circle.setAttribute('cx', n.x)
        circle.setAttribute('cy', n.y)
        circle.setAttribute('r', 3)
        const rand = Math.random()
        if (rand > 0.6) circle.classList.add('node', 'active')
        else if (rand > 0.3) circle.classList.add('node', 'active-2')
        else circle.classList.add('node')
        svg.appendChild(circle)
      })
    }

    const generateParticles = () => {
      while (particles.firstChild) particles.removeChild(particles.firstChild)
      for (let i = 0; i < 30; i++) {
        const p = document.createElement('div')
        p.className = 'particle'
        p.style.left = Math.random() * 100 + '%'
        p.style.animationDuration = (6 + Math.random() * 8) + 's'
        p.style.animationDelay = Math.random() * 5 + 's'
        particles.appendChild(p)
      }
    }

    const generateLightning = () => {
      while (lightning.firstChild) lightning.removeChild(lightning.firstChild)
      for (let i = 0; i < 5; i++) {
        const bolt = document.createElement('div')
        bolt.className = 'lightning'
        bolt.style.left = (20 + Math.random() * 60) + '%'
        bolt.style.top = (Math.random() * 50) + '%'
        bolt.style.animationDelay = Math.random() * 6 + 's'
        bolt.style.animationDuration = (4 + Math.random() * 4) + 's'
        lightning.appendChild(bolt)
      }
    }

    const handleMouseMove = (e) => {
      const rect = svg.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const pathEls = svg.querySelectorAll('.circuit-path')
      pathEls.forEach((el) => {
        const x1 = parseFloat(el.getAttribute('x1'))
        const y1 = parseFloat(el.getAttribute('y1'))
        const x2 = parseFloat(el.getAttribute('x2'))
        const y2 = parseFloat(el.getAttribute('y2'))
        const dist = pointToLineDistance(x, y, x1, y1, x2, y2)
        if (dist < 100) {
          el.style.opacity = 1
          el.style.strokeWidth = 3
        } else {
          el.style.opacity = ''
          el.style.strokeWidth = ''
        }
      })
    }

    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(generateCircuit, 300)
    }

    generateCircuit()
    generateParticles()
    generateLightning()
    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      clearTimeout(resizeTimeout)
    }
  }, [])

  return (
    <div className="electric-bg" aria-hidden="true">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <svg
        className="circuit-svg"
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0" />
            <stop offset="50%" stopColor="#4a9eff" stopOpacity="1" />
            <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div ref={particlesRef} className="particles-layer" />
      <div ref={lightningRef} className="lightning-layer" />
    </div>
  )
}
