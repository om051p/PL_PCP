/**
 * PageSensitivity.jsx
 *
 * Sensitivity Analysis page. Three visualizations driven by the read-only
 * sensitivity engine:
 *   1. Tornado diagram — rank-orders inputs by impact on a chosen output
 *   2. Sweep chart — varies a single input across a range
 *   3. Radar chart — compares named scenarios
 *
 * Read-only — no engine modifications, no formula changes.
 */

import { useState, useMemo, useEffect } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { SectionCard, SelectField, FieldInput } from '../components/ui.jsx'
import { SensitivityTornado } from '../visualizations/SensitivityTornado.jsx'
import { SensitivitySweep } from '../visualizations/SensitivitySweep.jsx'
import { SensitivityRadar } from '../visualizations/SensitivityRadar.jsx'
import {
  computeTornado,
  computeSweep,
  computeScenarioComparison,
  getAvailableInputs,
  getAvailableOutputs,
} from '../engine/sensitivity/index.js'
import { Sigma, Sliders, GitCompare, TrendingUp } from 'lucide-react'

export function PageSensitivity() {
  const project = useProjectStore((s) => s.getProject())
  const stations = project?.stations ?? []
  const activeStation = stations.find((s) => s.id === project?.activeStationId) || stations[0]

  const availableOutputs = getAvailableOutputs()
  const availableInputs = getAvailableInputs()

  const [selectedStationId, setSelectedStationId] = useState(activeStation?.id || '')
  const [selectedOutput, setSelectedOutput] = useState('minTRVoltage')
  const [perturbationPct, setPerturbationPct] = useState(10)
  const [sweepInput, setSweepInput] = useState('soilResistivityOhmCm')
  const [sweepMin, setSweepMin] = useState(100)
  const [sweepMax, setSweepMax] = useState(10000)
  const [sweepSamples, setSweepSamples] = useState(15)
  const [sweepOutputs, setSweepOutputs] = useState(['groundbedResistanceOhm', 'minTRVoltage'])

  const station = useMemo(
    () => stations.find((s) => s.id === selectedStationId) || stations[0],
    [stations, selectedStationId]
  )

  useEffect(() => {
    if (station && !selectedStationId) setSelectedStationId(station.id)
  }, [station, selectedStationId])

  // Run sensitivity calculations
  const life = station?.designLifeYears || 25
  const projectDesignBasis = project?.designBasis

  const tornadoData = useMemo(() => {
    if (!station) return null
    return computeTornado(station, life, projectDesignBasis, selectedOutput, undefined, perturbationPct)
  }, [station, life, projectDesignBasis, selectedOutput, perturbationPct])

  const sweepData = useMemo(() => {
    if (!station) return null
    return computeSweep(station, life, projectDesignBasis, sweepInput, [sweepMin, sweepMax], sweepSamples, sweepOutputs)
  }, [station, life, projectDesignBasis, sweepInput, sweepMin, sweepMax, sweepSamples, sweepOutputs])

  const radarData = useMemo(() => {
    if (!station) return null
    const baseScenarios = [
      { name: 'Current', station, life, project: projectDesignBasis },
    ]
    // Add 2 scenarios: +3 anodes, -3 anodes
    const sPlus = JSON.parse(JSON.stringify(station))
    sPlus.proposedAnodes = (station.proposedAnodes || 9) + 3
    baseScenarios.push({ name: '+3 anodes', station: sPlus, life, project: projectDesignBasis })
    const sMinus = JSON.parse(JSON.stringify(station))
    sMinus.proposedAnodes = Math.max(1, (station.proposedAnodes || 9) - 3)
    baseScenarios.push({ name: '−3 anodes', station: sMinus, life, project: projectDesignBasis })
    // 50% deeper groundbed
    const sDeep = JSON.parse(JSON.stringify(station))
    if (sDeep.groundbed?.startDepthM != null) sDeep.groundbed.startDepthM *= 1.5
    baseScenarios.push({ name: '+50% depth', station: sDeep, life, project: projectDesignBasis })
    return computeScenarioComparison(baseScenarios)
  }, [station, life, projectDesignBasis])

  if (!station) {
    return (
      <div className="page">
        <SectionCard title="Sensitivity Analysis" sub="Select a station to analyze">
          <div style={{ padding: 24, color: 'var(--text-tertiary)', fontSize: 12, textAlign: 'center' }}>
            No stations in this project. Add a station on the Project Setup page.
          </div>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionCard title="Configuration" sub="Choose station, output, and perturbation">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <SelectField
            label="Station"
            value={selectedStationId}
            onChange={(e) => setSelectedStationId(e.target.value)}
            options={stations.map((s) => ({ value: s.id, label: s.name || s.id }))}
          />
          <SelectField
            label="Output to measure"
            value={selectedOutput}
            onChange={(e) => setSelectedOutput(e.target.value)}
            options={availableOutputs.map((o) => ({ value: o.id, label: `${o.label} (${o.unit})` }))}
          />
          <FieldInput
            label="Perturbation ±%"
            type="number"
            value={perturbationPct}
            onChange={(e) => setPerturbationPct(Math.max(1, Math.min(50, Number(e.target.value) || 10)))}
          />
        </div>
      </SectionCard>

      <SectionCard
        title={<span><Sigma size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Tornado Diagram</span>}
        sub={`Rank-ordered impact on ${availableOutputs.find((o) => o.id === selectedOutput)?.label || selectedOutput} (read-only)`}
      >
        <SensitivityTornado data={tornadoData} width={780} />
      </SectionCard>

      <SectionCard
        title={<span><Sliders size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />One-At-A-Time Sweep</span>}
        sub="Vary a single input across a range and observe outputs"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 12 }}>
          <SelectField
            label="Input to sweep"
            value={sweepInput}
            onChange={(e) => setSweepInput(e.target.value)}
            options={availableInputs.map((i) => ({ value: i.id, label: i.id }))}
          />
          <FieldInput label="Min" type="number" value={sweepMin} onChange={(e) => setSweepMin(Number(e.target.value) || 0)} />
          <FieldInput label="Max" type="number" value={sweepMax} onChange={(e) => setSweepMax(Number(e.target.value) || 0)} />
          <FieldInput label="Samples" type="number" value={sweepSamples} onChange={(e) => setSweepSamples(Math.max(3, Math.min(50, Number(e.target.value) || 10)))} />
        </div>
        <SensitivitySweep data={sweepData} outputIds={sweepOutputs} height={320} />
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {availableOutputs.map((o) => (
            <label key={o.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sweepOutputs.includes(o.id)}
                onChange={(e) => {
                  if (e.target.checked) setSweepOutputs((arr) => [...arr, o.id])
                  else setSweepOutputs((arr) => arr.filter((x) => x !== o.id))
                }}
                style={{ cursor: 'pointer' }}
              />
              {o.label}
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={<span><GitCompare size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Scenario Comparison</span>}
        sub="Compare alternative designs on multiple outputs"
      >
        <SensitivityRadar data={radarData} height={340} />
      </SectionCard>
    </div>
  )
}
