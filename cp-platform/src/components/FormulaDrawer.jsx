/**
 * FormulaDrawer.jsx
 *
 * Right-side collapsible engineering formula explorer panel.
 *
 * Displays:
 * - Current page formulas with equations
 * - Standard references
 * - Assumptions
 * - Units in use
 * - Variables with current values
 *
 * Collapses to a narrow tab when not in use.
 * Works alongside existing RightSideEngineeringPanel.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Sigma,
  Ruler,
  ListChecks,
  Variable,
  GripHorizontal,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react'

/**
 * @typedef {Object} FormulaEntry
 * @property {string} name - Formula name
 * @property {string} equation - Formula equation
 * @property {string} [standardRef] - Standard reference
 * @property {string} [description] - Human-readable description
 */

/**
 * @typedef {Object} UnitEntry
 * @property {string} unit - Unit symbol
 * @property {string} name - Full unit name
 * @property {string[]} [usedIn] - Where this unit appears
 */

/**
 * FormulaDrawer — collapsible side panel showing all formulas on the current page.
 *
 * @param {Object} props
 * @param {string} props.title - Drawer title (e.g., "Current Requirement Formulas")
 * @param {Array<FormulaEntry>} props.formulas - List of formula entries
 * @param {string} [props.primaryStandard] - Primary standard displayed
 * @param {string[]} [props.standards] - All applicable standards
 * @param {string[]} [props.assumptions] - Engineering assumptions
 * @param {Array<UnitEntry>} [props.units] - Units in use
 * @param {Object[]} [props.variables] - Live variable values
 * @param {boolean} [props.defaultOpen=false] - Start open
 */
export function FormulaDrawer({
  title = 'Engineering Formula Explorer',
  formulas = [],
  primaryStandard,
  standards = [],
  assumptions = [],
  units = [],
  variables = [],
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [activeSection, setActiveSection] = useState('formulas')

  const sections = [
    { id: 'formulas', label: 'Formulas', icon: Sigma },
    { id: 'standards', label: 'Standards', icon: BookOpen },
    { id: 'assumptions', label: 'Assumptions', icon: ListChecks },
    { id: 'units', label: 'Units', icon: Ruler },
    { id: 'variables', label: 'Variables', icon: Variable },
  ]

  return (
    <div className={`formula-drawer ${open ? 'formula-drawer--open' : 'formula-drawer--closed'}`}>
      {/* Collapsed tab — always visible */}
      {!open && (
        <button
          className="formula-drawer-tab"
          onClick={() => setOpen(true)}
          title="Open Formula Explorer"
          aria-label="Open Formula Explorer"
        >
          <Sigma size={16} />
          <span className="formula-drawer-tab-text">Formulas</span>
          <ChevronLeft size={12} />
        </button>
      )}

      {/* Open drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="formula-drawer-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0.2, 1] }}
          >
            <div className="formula-drawer-inner">
              {/* Header */}
              <div className="formula-drawer-header">
                <div className="formula-drawer-header-title">
                  <Sigma size={16} />
                  <h3>{title}</h3>
                </div>
                <button
                  className="formula-drawer-close-btn"
                  onClick={() => setOpen(false)}
                  title="Close Formula Explorer"
                  aria-label="Close Formula Explorer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Primary standard badge */}
              {primaryStandard && (
                <div className="formula-drawer-primary-standard">
                  <BookOpen size={13} />
                  <span>{primaryStandard}</span>
                </div>
              )}

              {/* Section tabs */}
              <div className="formula-drawer-tabs">
                {sections.map((s) => {
                  const Icon = s.icon
                  return (
                    <button
                      key={s.id}
                      className={`formula-drawer-tab-btn ${activeSection === s.id ? 'formula-drawer-tab-btn--active' : ''}`}
                      onClick={() => setActiveSection(s.id)}
                    >
                      <Icon size={12} />
                      <span>{s.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Section content */}
              <div className="formula-drawer-content">
                {/* Formulas */}
                {activeSection === 'formulas' && (
                  <div className="formula-drawer-section">
                    {formulas.length === 0 ? (
                      <div className="formula-drawer-empty">
                        <Info size={14} />
                        <span>No formulas defined for this page.</span>
                      </div>
                    ) : (
                      formulas.map((f, i) => (
                        <div key={i} className="formula-drawer-formula">
                          <div className="formula-drawer-formula-name">{f.name}</div>
                          <code className="formula-drawer-formula-eq">{f.equation}</code>
                          {f.standardRef && (
                            <div className="formula-drawer-formula-ref">
                              <BookOpen size={10} /> {f.standardRef}
                            </div>
                          )}
                          {f.description && (
                            <div className="formula-drawer-formula-desc">{f.description}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Standards */}
                {activeSection === 'standards' && (
                  <div className="formula-drawer-section">
                    {standards.length === 0 ? (
                      <div className="formula-drawer-empty">
                        <Info size={14} />
                        <span>No standards defined.</span>
                      </div>
                    ) : (
                      standards.map((s, i) => (
                        <div key={i} className="formula-drawer-standard">
                          <BookOpen size={13} />
                          <span>{s}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Assumptions */}
                {activeSection === 'assumptions' && (
                  <div className="formula-drawer-section">
                    {assumptions.length === 0 ? (
                      <div className="formula-drawer-empty">
                        <Info size={14} />
                        <span>No assumptions documented.</span>
                      </div>
                    ) : (
                      <ul className="formula-drawer-assumptions-list">
                        {assumptions.map((a, i) => (
                          <li key={i} className="formula-drawer-assumption">
                            <GripHorizontal size={10} />
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Units */}
                {activeSection === 'units' && (
                  <div className="formula-drawer-section">
                    {units.length === 0 ? (
                      <div className="formula-drawer-empty">
                        <Info size={14} />
                        <span>No units defined.</span>
                      </div>
                    ) : (
                      <div className="formula-drawer-units-grid">
                        {units.map((u, i) => (
                          <div key={i} className="formula-drawer-unit-item">
                            <div className="formula-drawer-unit-symbol">{u.unit}</div>
                            <div className="formula-drawer-unit-name">{u.name}</div>
                            {u.usedIn && u.usedIn.length > 0 && (
                              <div className="formula-drawer-unit-usage">
                                {u.usedIn.join(' · ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Variables */}
                {activeSection === 'variables' && (
                  <div className="formula-drawer-section">
                    {variables.length === 0 ? (
                      <div className="formula-drawer-empty">
                        <Info size={14} />
                        <span>No variable data available.</span>
                      </div>
                    ) : (
                      <table className="formula-drawer-vars-table">
                        <thead>
                          <tr>
                            <th>Var</th>
                            <th>Value</th>
                            <th>Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variables.map((v, i) => (
                            <tr key={i}>
                              <td><code>{v.symbol || v.name}</code></td>
                              <td>{typeof v.value === 'number' ? v.value.toFixed(2) : v.value}</td>
                              <td>{v.unit || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
