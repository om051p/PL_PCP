/**
 * PageCableResistance.jsx
 *
 * Anode tail cables, positive/negative main cables, and total cable circuit resistance.
 */

import { useProjectStore } from '../store/projectStore.js'
import StationTabs from '../components/StationTabs.jsx'
import {
  FieldInput,
  SelectField,
  ResultRow,
  SectionCard,
  StandardBadge,
  Grid2,
} from '../components/ui.jsx'
import { CABLE_SPECS } from '../constants/index.js'
import { Cable, BarChart3 } from 'lucide-react'

export function PageCableResistance() {
  const station = useProjectStore((s) => s.getActiveStation())
  const updateStation = useProjectStore((s) => s.updateStation)
  const project = useProjectStore((s) => s.getProject())
  if (!station) return null
  const r = station.lastCalcResult
  const cb = station.cables
  const N = station.proposedAnodes
  const cableSizeOptions = Object.values(CABLE_SPECS).map((c) => ({
    value: c.sizeMm2,
    label: c.label,
  }))

  return (
    <div className="page">
      <StationTabs />
      <div style={{ marginBottom: 12 }}>
        <StandardBadge project={project} />
      </div>

      <SectionCard title="Anode Tail Cables — Positive Circuit" icon={Cable}>
        <Grid2>
          <SelectField
            label="Anode Tail Cable Size"
            value={cb.anodeCableSizeMm2}
            onChange={(v) =>
              updateStation(station.id, (s) => {
                s.cables.anodeCableSizeMm2 = parseInt(v)
              })
            }
            options={cableSizeOptions}
          />
        </Grid2>
        <div className="anode-tail-grid">
          {Array.from({ length: N }, (_, i) => (
            <FieldInput
              key={i}
              label={`Anode ${i + 1}`}
              value={cb.anodeTailLengths[i] || 0}
              unit="m"
              min={0}
              onChange={(v) =>
                updateStation(station.id, (s) => {
                  s.cables.anodeTailLengths[i] = v
                })
              }
            />
          ))}
        </div>
        {r && (
          <ResultRow
            label="Parallel Anode Tail Resistance"
            symbol="R_ac"
            value={r.anodeTailParallelResOhm.toFixed(6)}
            unit="Ω"
            formula="R_ac = 1 / Σ(1 / (L_i × r))"
            highlight
          />
        )}
      </SectionCard>

      <Grid2>
        <SectionCard title="Positive Main Cable" icon={Cable}>
          <FieldInput
            label="Length"
            value={cb.posMainLengthM}
            unit="m"
            min={0}
            onChange={(v) =>
              updateStation(station.id, (s) => {
                s.cables.posMainLengthM = v
              })
            }
          />
          <SelectField
            label="Cable Size"
            value={cb.posMainSizeMm2}
            onChange={(v) =>
              updateStation(station.id, (s) => {
                s.cables.posMainSizeMm2 = parseInt(v)
              })
            }
            options={cableSizeOptions}
          />
          {r && (
            <ResultRow
              label="R_pc"
              symbol="R_pc"
              value={r.posMainCableResOhm.toFixed(5)}
              unit="Ω"
            />
          )}
          {r && (
            <ResultRow
              label="Total Positive R"
              value={(r.anodeTailParallelResOhm + r.posMainCableResOhm).toFixed(5)}
              unit="Ω"
              highlight
            />
          )}
        </SectionCard>

        <SectionCard title="Negative Circuit Cables" icon={Cable}>
          <FieldInput
            label="Main Negative Length"
            value={cb.negMainLengthM}
            unit="m"
            min={0}
            onChange={(v) =>
              updateStation(station.id, (s) => {
                s.cables.negMainLengthM = v
              })
            }
          />
          <SelectField
            label="Main Negative Size"
            value={cb.negMainSizeMm2}
            onChange={(v) =>
              updateStation(station.id, (s) => {
                s.cables.negMainSizeMm2 = parseInt(v)
              })
            }
            options={cableSizeOptions}
          />
          <FieldInput
            label="Secondary Negative Length"
            value={cb.negSecLengthM}
            unit="m"
            min={0}
            onChange={(v) =>
              updateStation(station.id, (s) => {
                s.cables.negSecLengthM = v
              })
            }
          />
          <SelectField
            label="Secondary Negative Size"
            value={cb.negSecSizeMm2}
            onChange={(v) =>
              updateStation(station.id, (s) => {
                s.cables.negSecSizeMm2 = parseInt(v)
              })
            }
            options={cableSizeOptions}
          />
          {r && (
            <ResultRow
              label="Total Negative R"
              value={r.negMainCableResOhm.toFixed(5)}
              unit="Ω"
              highlight
            />
          )}
        </SectionCard>
      </Grid2>

      {r && (
        <SectionCard title="Total Cable Circuit Resistance" icon={BarChart3}>
          <ResultRow
            label="R_c = R_ac + R_pc + R_nc"
            symbol="R_c"
            value={r.totalCableResOhm.toFixed(5)}
            unit="Ω"
            highlight
          />
        </SectionCard>
      )}
    </div>
  )
}

