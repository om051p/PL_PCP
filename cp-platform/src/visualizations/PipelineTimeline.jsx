/**
 * PipelineTimeline.jsx
 *
 * Interactive horizontal timeline showing project stages:
 * Design Basis → Groundbed → Cable → TR → Validation → Approval → Construction
 */

import { useMemo } from 'react'

const STAGES = [
  { id: 'design', label: 'Design Basis', icon: '📐' },
  { id: 'groundbed', label: 'Groundbed', icon: '⛏️' },
  { id: 'cable', label: 'Cable', icon: '🔌' },
  { id: 'tr', label: 'TR Sizing', icon: '⚡' },
  { id: 'validation', label: 'Validation', icon: '✅' },
  { id: 'approval', label: 'Approval', icon: '📋' },
  { id: 'construction', label: 'Construction', icon: '🏗️' },
]

function getStageStatus(stageId, station) {
  if (!station) return 'future'

  switch (stageId) {
    case 'design':
      return station.pipelineSegments?.length > 0 ? 'completed' : 'future'
    case 'groundbed':
      return station.groundbed?.type ? 'completed' : 'future'
    case 'cable':
      return station.cables?.positiveMainLengthM > 0 ? 'completed' : 'future'
    case 'tr':
      return station.tr?.ratedVoltage > 0 ? 'completed' : 'future'
    case 'validation':
      return station.lastCalcResult ? 'completed' : 'future'
    case 'approval':
      return station.status === 'approved' ? 'completed' : station.status === 'rejected' ? 'blocked' : 'future'
    case 'construction':
      return station.status === 'issued_for_construction' ? 'completed' : 'future'
    default:
      return 'future'
  }
}

const STATUS_COLORS = {
  completed: '#22c55e',
  in_progress: '#f59e0b',
  blocked: '#ef4444',
  future: '#52525b',
}

/**
 * @param {object} props
 * @param {object} props.station - Current station object
 * @param {Function} props.onStageClick - Click handler for stage
 */
export function PipelineTimeline({ station, onStageClick }) {
  const stages = useMemo(() => {
    return STAGES.map((stage) => ({
      ...stage,
      status: getStageStatus(stage.id, station),
    }))
  }, [station])

  return (
    <div className="viz-side-section">
      <h3 className="viz-side-section-title">Project Timeline</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }}>
        {stages.map((stage, i) => {
          const color = STATUS_COLORS[stage.status]
          const isLast = i === stages.length - 1

          return (
            <div
              key={stage.id}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                position: 'relative',
              }}
              onClick={() => onStageClick?.(stage.id)}
            >
              {/* Connector line */}
              {!isLast && (
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: '50%',
                    width: '100%',
                    height: 2,
                    background: stage.status === 'completed' ? color : 'var(--border)',
                  }}
                />
              )}

              {/* Node */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: stage.status === 'completed' ? color : 'var(--card)',
                  border: `2px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  zIndex: 1,
                }}
              >
                {stage.status === 'completed' ? '✓' : stage.icon}
              </div>

              {/* Label */}
              <div
                style={{
                  marginTop: 4,
                  fontSize: 8,
                  textAlign: 'center',
                  color: stage.status === 'completed' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontWeight: stage.status === 'completed' ? 600 : 400,
                  lineHeight: 1.2,
                  maxWidth: 60,
                }}
              >
                {stage.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
