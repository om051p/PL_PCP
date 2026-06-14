/**
 * SurveyQualityScore.jsx
 *
 * Widget showing survey quality metrics: density, coverage, confidence.
 */

import { useMemo } from 'react'

/**
 * @param {object} props
 * @param {Array} props.surveyData - Wenner survey data points
 * @param {Array} props.layers - Layered soil model
 */
export function SurveyQualityScore({ surveyData, layers }) {
  const metrics = useMemo(() => {
    const density = surveyData?.length || 0
    const coverage = layers?.length || 0
    const confidence = density >= 10 && coverage >= 2 ? 'High' : density >= 5 ? 'Medium' : 'Low'
    const confidenceScore = confidence === 'High' ? 90 : confidence === 'Medium' ? 65 : 35

    return { density, coverage, confidence, confidenceScore }
  }, [surveyData, layers])

  return (
    <div className="viz-side-section">
      <h3 className="viz-side-section-title">Survey Quality</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Data Points</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{metrics.density}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Layers Defined</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{metrics.coverage}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Confidence</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: metrics.confidence === 'High' ? 'var(--pass)' : metrics.confidence === 'Medium' ? 'var(--warn)' : 'var(--fail)',
            }}
          >
            {metrics.confidence}
          </span>
        </div>

        {/* Confidence bar */}
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${metrics.confidenceScore}%`,
              background: metrics.confidence === 'High' ? 'var(--pass)' : metrics.confidence === 'Medium' ? 'var(--warn)' : 'var(--fail)',
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {metrics.confidence !== 'High' && (
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            {metrics.density < 10 ? 'Consider adding more survey readings.' : 'Define more soil layers for better accuracy.'}
          </div>
        )}
      </div>
    </div>
  )
}
