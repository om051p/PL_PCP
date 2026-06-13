/**
 * CalculationBreakdown.jsx
 *
 * Step-by-step calculation traceability.
 * Shows each intermediate step with:
 * - Step number/title
 * - Input parameter name
 * - Value used
 * - Unit
 * - Source module
 *
 * Collapses to a summary line that expands on click.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Layers, GripVertical } from 'lucide-react'

/**
 * @typedef {Object} CalcStep
 * @property {string} label - Step title (e.g., "Input Resistivity")
 * @property {string} [symbol] - Variable symbol
 * @property {number|string} value - Value
 * @property {string} unit - Unit
 * @property {string} [source] - Source module or input
 * @property {string} [formula] - Sub-formula at this step
 */

/**
 * CalculationBreakdown — expandable step-by-step calculation display.
 *
 * @param {Object} props
 * @param {string} props.title - Overall calculation title
 * @param {Array<CalcStep>} props.steps - Ordered steps
 * @param {string} props.finalLabel - Label for final result
 * @param {number|string} props.finalValue - Final calculated value
 * @param {string} props.finalUnit - Final unit
 * @param {string} [props.finalSymbol] - Final symbol
 * @param {string} [props.finalFormula] - Overall formula at final step
 * @param {boolean} [props.expandedByDefault=false] - Start expanded
 */
export function CalculationBreakdown({
  title,
  steps = [],
  finalLabel,
  finalValue,
  finalUnit,
  finalSymbol,
  finalFormula,
  expandedByDefault = false,
}) {
  const [expanded, setExpanded] = useState(expandedByDefault)

  return (
    <div className="calc-breakdown" data-expanded={expanded}>
      {/* Collapsed header — always visible */}
      <div
        className="calc-breakdown-header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded(!expanded)
          }
        }}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${title} calculation breakdown`}
      >
        <div className="calc-breakdown-header-left">
          <Layers size={15} className="calc-breakdown-icon" />
          <span className="calc-breakdown-title">{title}</span>
          <span className="calc-breakdown-step-count">{steps.length} steps</span>
        </div>
        <div className="calc-breakdown-header-right">
          {/* Summary result — visible when collapsed */}
          <span className="calc-breakdown-final-preview">
            {finalSymbol && <code className="calc-breakdown-final-symbol">{finalSymbol}</code>}
            <span className="calc-breakdown-final-val">{finalValue}</span>
            <span className="calc-breakdown-final-unit">{finalUnit}</span>
          </span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="calc-breakdown-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0.2, 1] }}
          >
            <div className="calc-breakdown-steps">
              {steps.map((step, i) => (
                <div key={i} className="calc-breakdown-step">
                  <div className="calc-breakdown-step-number">{i + 1}</div>
                  <div className="calc-breakdown-step-content">
                    <div className="calc-breakdown-step-label">
                      {step.label}
                      {step.symbol && (
                        <code className="calc-breakdown-step-symbol">{step.symbol}</code>
                      )}
                    </div>
                    <div className="calc-breakdown-step-meta">
                      <span className="calc-breakdown-step-value">
                        {typeof step.value === 'number'
                          ? Number.isInteger(step.value)
                            ? step.value.toLocaleString()
                            : step.value.toFixed(2)
                          : step.value}
                      </span>
                      <span className="calc-breakdown-step-unit">{step.unit}</span>
                      {step.source && (
                        <span className="calc-breakdown-step-source">{step.source}</span>
                      )}
                    </div>
                    {step.formula && (
                      <div className="calc-breakdown-step-formula">
                        <code>{step.formula}</code>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Final result */}
              <div className="calc-breakdown-step calc-breakdown-step--final">
                <div className="calc-breakdown-step-number calc-breakdown-step-number--final">
                  <GripVertical size={14} />
                </div>
                <div className="calc-breakdown-step-content">
                  <div className="calc-breakdown-step-label">
                    {finalLabel}
                    {finalSymbol && (
                      <code className="calc-breakdown-step-symbol calc-breakdown-step-symbol--final">
                        {finalSymbol}
                      </code>
                    )}
                  </div>
                  <div className="calc-breakdown-step-meta">
                    <span className="calc-breakdown-step-value calc-breakdown-final">{finalValue}</span>
                    <span className="calc-breakdown-step-unit">{finalUnit}</span>
                  </div>
                  {finalFormula && (
                    <div className="calc-breakdown-step-formula calc-breakdown-step-formula--final">
                      <code>{finalFormula}</code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
