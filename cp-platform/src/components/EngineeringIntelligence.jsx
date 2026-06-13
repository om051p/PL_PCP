/**
 * EngineeringIntelligence.jsx
 *
 * Contextual engineering intelligence widget.
 * Renders a list of pre-computed insights. No AI calculations. No formula modifications.
 *
 * Builders that produce the insights live in EngineeringIntelligence.builders.js
 * (kept separate so this file can export only React components, per
 * react-refresh/only-export-components lint rule).
 */

import { BookOpen, AlertTriangle, CheckCircle2, Info, Zap } from 'lucide-react'

/**
 * @typedef {Object} IntelligenceEntry
 * @property {string} id - Unique key
 * @property {string} text - Insight text
 * @property {'info'|'pass'|'warn'|'fail'|'good'} [tone='info'] - Tone/severity
 * @property {string} [metric] - Contextual metric label
 * @property {string} [reference] - Standard reference
 */

/**
 * EngineeringIntelligence — renders a list of contextual insights.
 *
 * @param {Object} props
 * @param {Array<IntelligenceEntry>} props.insights - Pre-computed insights
 * @param {string} [props.title='Engineering Intelligence'] - Section title
 */
export function EngineeringIntelligence({ insights = [], title = 'Engineering Intelligence' }) {
  if (!insights || insights.length === 0) return null

  const toneIcons = {
    good: <CheckCircle2 size={14} />,
    pass: <CheckCircle2 size={14} />,
    info: <Info size={14} />,
    warn: <AlertTriangle size={14} />,
    fail: <AlertTriangle size={14} />,
  }

  const toneColors = {
    good: 'var(--status-pass, #16a34a)',
    pass: 'var(--status-pass, #16a34a)',
    info: 'var(--brand, #2563eb)',
    warn: 'var(--status-warn, #d97706)',
    fail: 'var(--status-fail, #dc2626)',
  }

  return (
    <div className="eng-intelligence">
      <div className="eng-intelligence-header">
        <Zap size={15} className="eng-intelligence-header-icon" />
        <span>{title}</span>
      </div>
      <div className="eng-intelligence-list">
        {insights.map((ins) => (
          <div
            key={ins.id}
            className="eng-intelligence-item"
            style={{ borderLeftColor: toneColors[ins.tone] || toneColors.info }}
          >
            <span
              className="eng-intelligence-item-icon"
              style={{ color: toneColors[ins.tone] || toneColors.info }}
            >
              {toneIcons[ins.tone] || toneIcons.info}
            </span>
            <div className="eng-intelligence-item-body">
              <span className="eng-intelligence-item-text">{ins.text}</span>
              <div className="eng-intelligence-item-meta">
                {ins.metric && (
                  <span className="eng-intelligence-item-metric">{ins.metric}</span>
                )}
                {ins.reference && (
                  <span className="eng-intelligence-item-ref">
                    <BookOpen size={10} />
                    {ins.reference}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
