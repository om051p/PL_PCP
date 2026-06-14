/**
 * ProjectStatusDashboard.jsx
 *
 * Side panel widget showing current module status, completed modules,
 * blocked items, and next recommended action.
 */

import { useMemo } from 'react'
import { CheckCircle2, AlertTriangle, Clock, ArrowRight } from 'lucide-react'

const MODULE_LIST = [
  { id: 'pipeline', label: 'Pipeline Config' },
  { id: 'groundbed', label: 'Groundbed Design' },
  { id: 'cable', label: 'Cable Resistance' },
  { id: 'tr', label: 'TR Sizing' },
  { id: 'attenuation', label: 'Attenuation Analysis' },
  { id: 'validation', label: 'Validation' },
]

function getModuleStatus(moduleId, station) {
  if (!station) return 'future'

  switch (moduleId) {
    case 'pipeline':
      return station.pipelineSegments?.length > 0 ? 'completed' : 'current'
    case 'groundbed':
      return station.groundbed?.type ? 'completed' : !station.pipelineSegments?.length ? 'future' : 'current'
    case 'cable':
      return station.cables?.positiveMainLengthM > 0 ? 'completed' : 'future'
    case 'tr':
      return station.tr?.ratedVoltage > 0 ? 'completed' : 'future'
    case 'attenuation':
      return station.lastCalcResult ? 'completed' : 'future'
    case 'validation':
      return station.status === 'approved' ? 'completed' : station.lastCalcResult ? 'current' : 'future'
    default:
      return 'future'
  }
}

function getNextAction(moduleStatuses) {
  const current = moduleStatuses.find((m) => m.status === 'current')
  if (current) return `Complete ${current.label}`
  const future = moduleStatuses.find((m) => m.status === 'future')
  if (future) `Start ${future.label}`
  return 'All modules complete'
}

/**
 * @param {object} props
 * @param {object} props.station - Current station object
 */
export function ProjectStatusDashboard({ station }) {
  const moduleStatuses = useMemo(() => {
    return MODULE_LIST.map((mod) => ({
      ...mod,
      status: getModuleStatus(mod.id, station),
    }))
  }, [station])

  const completedCount = moduleStatuses.filter((m) => m.status === 'completed').length
  const totalCount = moduleStatuses.length
  const nextAction = getNextAction(moduleStatuses)

  return (
    <div className="viz-side-section">
      <h3 className="viz-side-section-title">Project Status</h3>

      {/* Progress bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Modules Complete</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {completedCount}/{totalCount}
          </span>
        </div>
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${(completedCount / totalCount) * 100}%`,
              background: completedCount === totalCount ? 'var(--pass)' : 'var(--brand-mid, #3b82f6)',
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Module list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {moduleStatuses.map((mod) => {
          const color = mod.status === 'completed' ? 'var(--pass)' : mod.status === 'current' ? 'var(--warn)' : 'var(--text-tertiary)'
          return (
            <div
              key={mod.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                padding: '3px 6px',
                borderRadius: 3,
                background: mod.status === 'current' ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
              }}
            >
              {mod.status === 'completed' ? (
                <CheckCircle2 size={12} style={{ color, flexShrink: 0 }} />
              ) : mod.status === 'current' ? (
                <Clock size={12} style={{ color, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 12, height: 12, borderRadius: '50%', border: `1.5px solid ${color}`, flexShrink: 0 }} />
              )}
              <span style={{ color: mod.status === 'future' ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                {mod.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Next action */}
      <div style={{ marginTop: 8, padding: '6px 8px', background: 'var(--surface)', borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ArrowRight size={12} style={{ color: 'var(--brand-mid, #3b82f6)', flexShrink: 0 }} />
        <span style={{ color: 'var(--text-secondary)' }}>{nextAction}</span>
      </div>
    </div>
  )
}
