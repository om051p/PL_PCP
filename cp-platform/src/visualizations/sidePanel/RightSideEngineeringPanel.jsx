import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PanelRightOpen, PanelRightClose, Activity } from 'lucide-react'
import { DURATION, EASE } from '../../motion/timings'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * RightSideEngineeringPanel
 *
 * Responsive shell for the engineering intelligence side panel.
 *
 * Layout:
 *   - Desktop (≥ 1200px): 2-column grid, viz 70 % / panel 30 %
 *   - Ultrawide (≥ 1600px): viz 65 % / panel 35 %
 *   - Tablet (< 1200px): 1-column, panel becomes a collapsible drawer
 *
 * The panel is "sticky" inside its grid cell so it stays in view as the
 * user scrolls the main visualization. Tab order is: page main → panel
 * (no keyboard trap).
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Main visualization
 * @param {React.ReactNode} props.panel - Side panel content
 * @param {string} [props.panelTitle] - Header label for the panel
 * @param {string} [props.ariaLabel] - aria-label for the panel region
 */
export function RightSideEngineeringPanel({
  children,
  panel,
  panelTitle = 'Engineering Intelligence',
  ariaLabel = 'Engineering intelligence panel',
}) {
  const reduced = usePrefersReducedMotion()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="viz-engineering-workspace">
      <main className="viz-engineering-main">{children}</main>
      <aside className="viz-engineering-aside" aria-label={ariaLabel}>
        <div className="viz-engineering-aside-sticky">
          <header className="viz-engineering-aside-header">
            <h2 className="viz-engineering-aside-title">
              <Activity size={14} strokeWidth={2.25} />
              {panelTitle}
            </h2>
            <button
              type="button"
              className="viz-engineering-drawer-toggle"
              onClick={() => setDrawerOpen((o) => !o)}
              aria-expanded={drawerOpen}
              aria-controls="viz-engineering-drawer"
            >
              {drawerOpen ? (
                <>
                  <PanelRightClose size={14} /> Hide
                </>
              ) : (
                <>
                  <PanelRightOpen size={14} /> Open
                </>
              )}
            </button>
          </header>
          <AnimatePresence initial={!reduced}>
            <motion.div
              id="viz-engineering-drawer"
              className="viz-engineering-aside-body"
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: 4 }}
              transition={{ duration: DURATION.base, ease: EASE.standard }}
            >
              {panel}
            </motion.div>
          </AnimatePresence>
        </div>
      </aside>
    </div>
  )
}
