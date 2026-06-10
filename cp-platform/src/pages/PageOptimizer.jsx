/**
 * PageOptimizer.jsx
 *
 * Design alternatives comparison with trade-off analysis and apply action.
 */

import { useState } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import StationTabs from '../components/StationTabs.jsx'
import {
  SectionCard,
  StandardBadge,
  InfoBox,
} from '../components/ui.jsx'
import { CheckCircle2, XCircle } from 'lucide-react'

export function PageOptimizer() {
  const station = useProjectStore((s) => s.getActiveStation())
  const updateStation = useProjectStore((s) => s.updateStation)
  const calculateStation = useProjectStore((s) => s.calculateStation)
  const project = useProjectStore((s) => s.getProject())
  const [selectedAlt, setSelectedAlt] = useState(null)
  if (!station) return null

  const alts = station.alternatives || []

  function applyAlternative(alt) {
    if (alt.isCurrentDesign) return
    if (alt.parameters.proposedAnodes) {
      updateStation(station.id, (s) => {
        s.proposedAnodes = alt.parameters.proposedAnodes
      })
    }
    if (alt.parameters.trVoltage) {
      updateStation(station.id, (s) => {
        s.tr.ratedVoltage = alt.parameters.trVoltage
      })
    }
    if (alt.parameters.trCurrent) {
      updateStation(station.id, (s) => {
        s.tr.ratedCurrent = alt.parameters.trCurrent
      })
    }
    calculateStation(station.id)
    setSelectedAlt(null)
  }

  return (
    <div className="page">
      <StationTabs />
      <div style={{ marginBottom: 12 }}>
        <StandardBadge project={project} />
      </div>
      <InfoBox type="info">
        The optimizer evaluates multiple design variants automatically. Select an alternative to
        apply it.
      </InfoBox>

      {alts.length === 0 && (
        <div className="no-result" style={{ padding: 24 }}>
          Run calculations first to generate design alternatives.
          <button
            className="btn btn-sm btn-primary"
            style={{ marginTop: 12 }}
            onClick={() => calculateStation(station.id)}
          >
            Calculate Station
          </button>
        </div>
      )}

      <div className="alt-grid">
        {alts.map((alt) => {
          const r = alt.result
          const allPass = r?.allChecksPassed
          const isSelected = selectedAlt === alt.id

          return (
            <div
              key={alt.id}
              className={`alt-card ${alt.isCurrentDesign ? 'alt-card--current' : ''} ${isSelected ? 'alt-card--selected' : ''} ${allPass ? 'alt-card--pass' : 'alt-card--fail'}`}
              onClick={() => setSelectedAlt(isSelected ? null : alt.id)}
            >
              <div className="alt-card-header">
                <span className="alt-label">{alt.label}</span>
                {alt.isCurrentDesign && <span className="alt-badge">Current</span>}
                {allPass ? (
                  <CheckCircle2 size={16} color="var(--pass)" />
                ) : (
                  <XCircle size={16} color="var(--fail)" />
                )}
              </div>

              {r && (
                <div className="alt-stats">
                  <div className="alt-stat">
                    <span>Design Life</span>
                    <strong>{r.designLifeYears?.toFixed(1)}y</strong>
                  </div>
                  <div className="alt-stat">
                    <span>R_G</span>
                    <strong>{r.groundbedResistanceOhm?.toFixed(4)}Ω</strong>
                  </div>
                  <div className="alt-stat">
                    <span>V_min</span>
                    <strong>{r.minTRVoltage?.toFixed(1)}V</strong>
                  </div>
                </div>
              )}

              {isSelected && (
                <div className="alt-details">
                  <div style={{ marginBottom: 8 }}>
                    <div className="section-label">Advantages</div>
                    {alt.advantages.map((a, i) => (
                      <div key={i} className="alt-advantage">
                        ✓ {a}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="section-label">Disadvantages</div>
                    {alt.disadvantages.map((d, i) => (
                      <div key={i} className="alt-disadvantage">
                        − {d}
                      </div>
                    ))}
                  </div>
                  {!alt.isCurrentDesign && (
                    <button
                      className="btn btn-primary btn-full"
                      onClick={() => applyAlternative(alt)}
                    >
                      Apply This Design
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

