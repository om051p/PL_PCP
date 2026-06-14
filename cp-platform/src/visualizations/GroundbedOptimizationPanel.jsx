/**
 * GroundbedOptimizationPanel.jsx
 *
 * Side panel widget showing "Current config vs Suggested" for groundbed.
 */

import { useMemo } from 'react'
import { OptimizationSuggestion } from './shared/OptimizationSuggestion.jsx'

/**
 * @param {object} props
 * @param {object} props.groundbed - Groundbed config
 * @param {object} props.result - Last calculation result
 * @param {object} props.project - Project object
 */
export function GroundbedOptimizationPanel({ groundbed, result, project }) {
  const suggestion = useMemo(() => {
    if (!result || !groundbed) return null

    const db = project?.designBasis || {}
    const targetLife = db.systemDesignLifeYears || 25
    const designLife = result.designLife || result.designLifeYears || 0
    const currentAnodes = groundbed.proposedAnodes || groundbed.anodeCount || 0

    // If design life is below target, suggest more anodes
    if (designLife < targetLife && currentAnodes > 0) {
      const lifeRatio = targetLife / Math.max(designLife, 1)
      const suggestedAnodes = Math.ceil(currentAnodes * lifeRatio)
      const expectedLife = designLife * (suggestedAnodes / currentAnodes)

      return {
        current: [
          { label: 'Anodes', value: `${currentAnodes}` },
          { label: 'Design Life', value: `${designLife.toFixed(1)} years` },
        ],
        suggested: [
          { label: 'Anodes', value: `${suggestedAnodes}` },
          { label: 'Expected Life', value: `${expectedLife.toFixed(1)} years` },
        ],
        improvements: [
          { label: 'Life Improvement', delta: `+${(expectedLife - designLife).toFixed(1)} years`, positive: true },
          { label: 'Additional Anodes', delta: `+${suggestedAnodes - currentAnodes}`, positive: true },
        ],
      }
    }

    return null
  }, [groundbed, result, project])

  if (!suggestion) return null

  return (
    <OptimizationSuggestion
      title="Groundbed Optimization"
      current={suggestion.current}
      suggested={suggestion.suggested}
      improvements={suggestion.improvements}
    />
  )
}
