/**
 * FormulaCard.jsx
 *
 * Engineering formula display card showing:
 * - Formula name and equation (LaTeX-style)
 * - Standard reference
 * - Variables with input values
 * - Calculated result
 *
 * Used across all calculation pages for formula transparency.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, BookOpen, Calculator, Variable, Sigma } from 'lucide-react'

/**
 * @typedef {Object} FormulaVariable
 * @property {string} symbol - Variable symbol (e.g., "A", "ρ", "I")
 * @property {string} name - Variable description
 * @property {number|string} value - Input value used
 * @property {string} unit - Measurement unit
 * @property {string} [source] - Where the value came from
 */

/**
 * FormulaCard — self-contained formula display with expandable detail.
 *
 * @param {Object} props
 * @param {string} props.name - Formula name (e.g., "Required Current Density")
 * @param {string} props.equation - LaTeX-style equation string
 * @param {string} [props.standardRef] - Standard reference (e.g., "SAES-X-400 §4.2")
 * @param {Array<FormulaVariable>} props.variables - List of formula variables
 * @param {number|string} props.result - Calculated result value
 * @param {string} props.resultUnit - Result unit (e.g., "A", "Ω", "m²")
 * @param {string} [props.resultSymbol] - Result symbol (e.g., "I_req", "R_G")
 * @param {'pass'|'fail'|'neutral'} [props.status='neutral'] - Result status indicator
 * @param {string} [props.insight] - Engineering insight about the result
 */
export function FormulaCard({
  name,
  equation,
  standardRef,
  variables = [],
  result,
  resultUnit,
  resultSymbol,
  status = 'neutral',
  insight,
}) {
  const [expanded, setExpanded] = useState(false)

  const statusColors = {
    pass: 'var(--status-pass, #16a34a)',
    fail: 'var(--status-fail, #dc2626)',
    neutral: 'var(--brand, #2563eb)',
  }

  const statusIcons = {
    pass: '✓',
    fail: '✗',
    neutral: '=',
  }

  return (
    <div className="formula-card" data-formula-status={status}>
      {/* Header: Name + Standard */}
      <div className="formula-card-header">
        <div className="formula-card-header-left">
          <Sigma size={16} className="formula-card-icon" />
          <span className="formula-card-name">{name}</span>
          {standardRef && (
            <span className="formula-card-standard">
              <BookOpen size={12} />
              {standardRef}
            </span>
          )}
        </div>
        <button
          className="formula-card-expand-btn"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Collapse formula details' : 'Expand formula details'}
          title={expanded ? 'Collapse' : 'Expand details'}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Equation display */}
      <div className="formula-card-equation">
        <code className="formula-card-eq-text">{equation}</code>
      </div>

      {/* Result display */}
      <div className="formula-card-result" style={{ borderLeftColor: statusColors[status] }}>
        <span className="formula-card-result-prefix">{statusIcons[status]}</span>
        {resultSymbol && <span className="formula-card-result-symbol">{resultSymbol}</span>}
        <span className="formula-card-result-value">= {result}</span>
        <span className="formula-card-result-unit">{resultUnit}</span>
      </div>

      {/* Insight line */}
      {insight && (
        <div className="formula-card-insight">{insight}</div>
      )}

      {/* Expandable variable detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="formula-card-detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0.2, 1] }}
          >
            <div className="formula-card-detail-inner">
              <div className="formula-card-detail-title">
                <Variable size={14} />
                <span>Variables & Input Values</span>
              </div>
              <table className="formula-card-var-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Name</th>
                    <th>Value</th>
                    <th>Unit</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {variables.map((v, i) => (
                    <tr key={i}>
                      <td className="formula-card-var-symbol">
                        <code>{v.symbol}</code>
                      </td>
                      <td>{v.name}</td>
                      <td className="formula-card-var-value">
                        {typeof v.value === 'number' ? v.value.toFixed(4) : v.value}
                      </td>
                      <td className="formula-card-var-unit">{v.unit}</td>
                      <td className="formula-card-var-source">{v.source || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {variables.length === 0 && (
                <div className="formula-card-detail-empty">
                  No variable details available for this result.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * FormulaCardGroup — groups multiple FormulaCards with a common header.
 */
export function FormulaCardGroup({ title, standardRef, children }) {
  return (
    <div className="formula-card-group">
      {(title || standardRef) && (
        <div className="formula-card-group-header">
          {title && (
            <h3 className="formula-card-group-title">
              <Calculator size={16} />
              {title}
            </h3>
          )}
          {standardRef && (
            <span className="formula-card-group-standard">
              <BookOpen size={12} />
              {standardRef}
            </span>
          )}
        </div>
      )}
      <div className="formula-card-group-grid">{children}</div>
    </div>
  )
}
