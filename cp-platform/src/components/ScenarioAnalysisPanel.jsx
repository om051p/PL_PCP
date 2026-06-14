import { useState, useMemo } from 'react'
import { makeScenario } from '../engine/scenarios/ScenarioModel.js'
import { runScenario } from '../engine/scenarios/scenarioRunner.js'
import { useProjectStore } from '../store/projectStore.js'
import { SectionCard } from './ui.jsx'

const AVAILABLE_SWEEP_INPUTS = [
  { id: 'soilResistivityOhmCm', label: 'Soil Resistivity (Ω·cm)', path: ['soilResistivityOhmCm'], step: 10, min: 10, max: 10000 },
  { id: 'proposedAnodes', label: 'Proposed Anodes Qty', path: ['proposedAnodes'], step: 1, min: 1, max: 100 },
  { id: 'startDepthM', label: 'Groundbed Start Depth (m)', path: ['groundbed', 'startDepthM'], step: 1, min: 1, max: 200 },
  { id: 'anodeLengthM', label: 'Anode Length (m)', path: ['groundbed', 'anodeLengthM'], step: 0.1, min: 0.5, max: 10 },
  { id: 'anodeSpacingM', label: 'Anode Spacing (m)', path: ['groundbed', 'anodeSpacingM'], step: 0.1, min: 0.5, max: 10 },
  { id: 'ratedVoltage', label: 'TR Rated Voltage (V)', path: ['tr', 'ratedVoltage'], step: 5, min: 5, max: 300 },
  { id: 'ratedCurrent', label: 'TR Rated Current (A)', path: ['tr', 'ratedCurrent'], step: 5, min: 5, max: 300 },
  { id: 'backEMF', label: 'Structure Back EMF (V)', path: ['tr', 'backEMF'], step: 0.1, min: 0.5, max: 5.0 },
]

export function ScenarioAnalysisPanel({ station }) {
  const project = useProjectStore((s) => s.getProject())
  const saveScenario = useProjectStore((s) => s.saveScenario)
  const deleteScenario = useProjectStore((s) => s.deleteScenario)

  const [activeTab, setActiveTab] = useState('single') // 'single' | 'multi'

  // --- Single-Variable State ---
  const [selectedInputId, setSelectedInputId] = useState('soilResistivityOhmCm')
  const [overrideValue, setOverrideValue] = useState('')
  const [presetPercent, setPresetPercent] = useState('0') // '+20' | '-20' | '+50' | '-50' | '0' (custom)

  // --- Multi-Variable State ---
  const [newScenName, setNewScenName] = useState('')
  const [newScenDesc, setNewScenDesc] = useState('')
  const [multiOverrides, setMultiOverrides] = useState({
    soilResistivityOhmCm: '',
    proposedAnodes: '',
    startDepthM: '',
    ratedVoltage: '',
    ratedCurrent: '',
  })

  // Get saved scenarios for the active station
  const savedScenarios = useMemo(() => {
    return (project?.scenarios || []).filter(s => s.baseStationId === station?.id)
  }, [project?.scenarios, station?.id])

  // Resolve current value of selected parameter
  const selectedInputObj = useMemo(() => {
    return AVAILABLE_SWEEP_INPUTS.find(i => i.id === selectedInputId)
  }, [selectedInputId])

  const baseValue = useMemo(() => {
    if (!station || !selectedInputObj) return 0
    const path = selectedInputObj.path
    if (path.length === 1) return station[path[0]]
    if (path.length === 2 && station[path[0]]) return station[path[0]][path[1]]
    return 0
  }, [station, selectedInputObj])

  // Apply percentage or custom value
  const computedOverride = useMemo(() => {
    const val = Number(baseValue)
    if (presetPercent === '+20') return val * 1.20
    if (presetPercent === '-20') return val * 0.80
    if (presetPercent === '+50') return val * 1.50
    if (presetPercent === '-50') return val * 0.50
    return overrideValue !== '' ? Number(overrideValue) : val
  }, [baseValue, presetPercent, overrideValue])

  // Run single-variable scenario on the fly
  const singleScenarioResult = useMemo(() => {
    if (!station || !project || !selectedInputObj) return null
    
    // Construct single override scenario
    const path = selectedInputObj.path
    const overrides = { station: {}, groundbed: {}, tr: {} }
    
    if (path.length === 1) {
      overrides.station[path[0]] = computedOverride
    } else if (path.length === 2) {
      overrides[path[0]][path[1]] = computedOverride
    }

    const sc = makeScenario({
      name: 'Single variable sweep',
      baseStationId: station.id,
      overrides
    })

    return runScenario(station, project, sc)
  }, [station, project, selectedInputObj, computedOverride])

  // Run all saved multi-variable scenarios
  const computedMultiScenarios = useMemo(() => {
    if (!station || !project) return []
    return savedScenarios.map(sc => {
      return runScenario(station, project, sc)
    })
  }, [station, project, savedScenarios])

  if (!station || !station.lastCalcResult) {
    return (
      <div className="p-6 text-center border border-dashed border-border rounded-lg bg-surface text-text-secondary">
        <span className="text-xl">📊</span>
        <h4 className="mt-2 font-semibold text-text-primary text-sm">No Scenario Data</h4>
        <p className="text-xs mt-1">Please calculate the base station design before running simulations.</p>
      </div>
    )
  }

  // --- Handlers ---
  const handleAddScenario = (e) => {
    e.preventDefault()
    if (!newScenName.trim()) return

    const overrides = { station: {}, groundbed: {}, tr: {} }
    if (multiOverrides.soilResistivityOhmCm) {
      overrides.station.soilResistivityOhmCm = Number(multiOverrides.soilResistivityOhmCm)
    }
    if (multiOverrides.proposedAnodes) {
      overrides.station.proposedAnodes = Number(multiOverrides.proposedAnodes)
    }
    if (multiOverrides.startDepthM) {
      overrides.groundbed.startDepthM = Number(multiOverrides.startDepthM)
    }
    if (multiOverrides.ratedVoltage) {
      overrides.tr.ratedVoltage = Number(multiOverrides.ratedVoltage)
    }
    if (multiOverrides.ratedCurrent) {
      overrides.tr.ratedCurrent = Number(multiOverrides.ratedCurrent)
    }

    const sc = makeScenario({
      name: newScenName,
      description: newScenDesc,
      baseStationId: station.id,
      overrides
    })

    saveScenario(sc)
    setNewScenName('')
    setNewScenDesc('')
    setMultiOverrides({
      soilResistivityOhmCm: '',
      proposedAnodes: '',
      startDepthM: '',
      ratedVoltage: '',
      ratedCurrent: '',
    })
  }

  const renderComparisonRow = (label, key, unit, formatter = (v) => v.toFixed(2)) => {
    const base = station.lastCalcResult[key]
    const mod = singleScenarioResult?.result[key]
    if (base == null || mod == null) return null

    const diff = mod - base
    const diffPct = base !== 0 ? (diff / base) * 100 : 0
    const isWorse = (key === 'groundbedResistanceOhm' || key === 'minTRVoltage' || key === 'totalCircuitResistanceOhm') ? diff > 0 : diff < 0
    const badgeColor = diff === 0 ? 'bg-surface-hover text-text-secondary' : isWorse ? 'bg-red-500 bg-opacity-10 text-red-400' : 'bg-green-500 bg-opacity-10 text-green-400'

    return (
      <tr className="border-b border-border text-xs hover:bg-surface-hover">
        <td className="p-3 font-medium text-text-primary">{label}</td>
        <td className="p-3 font-mono text-text-primary text-right">{formatter(base)} {unit}</td>
        <td className="p-3 font-mono text-text-primary text-right">{formatter(mod)} {unit}</td>
        <td className="p-3 text-right">
          <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${badgeColor}`}>
            {diffPct > 0 ? '+' : ''}{diffPct.toFixed(1)}%
          </span>
        </td>
      </tr>
    )
  }

  return (
    <div className="scenario-analysis-panel">
      {/* Tabs Header */}
      <div className="flex border-b border-border mb-4">
        <button
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'single' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
          onClick={() => setActiveTab('single')}
        >
          Single-Variable What-If
        </button>
        <button
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'multi' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
          onClick={() => setActiveTab('multi')}
        >
          Multi-Variable Comparisons ({savedScenarios.length})
        </button>
      </div>

      {/* TAB 1: Single Variable */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Parameter to Vary</label>
              <select
                className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                value={selectedInputId}
                onChange={(e) => {
                  setSelectedInputId(e.target.value)
                  setOverrideValue('')
                  setPresetPercent('0')
                }}
              >
                {AVAILABLE_SWEEP_INPUTS.map(i => (
                  <option key={i.id} value={i.id}>{i.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Current Base Value</label>
              <div className="bg-surface border border-border rounded px-3 py-2 text-xs font-mono text-text-secondary">
                {baseValue}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-2">Preset Quick Shifts</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '-20%', val: '-20' },
                  { label: 'Custom', val: '0' },
                  { label: '+20%', val: '+20' },
                  { label: '-50%', val: '-50' },
                  { label: '+50%', val: '+50' },
                ].map(p => (
                  <button
                    key={p.val}
                    className={`py-1.5 px-2 rounded text-[10px] font-bold border transition-colors ${
                      presetPercent === p.val
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-surface text-text-secondary hover:border-border-hover'
                    }`}
                    onClick={() => {
                      setPresetPercent(p.val)
                      if (p.val !== '0') setOverrideValue('')
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {presetPercent === '0' && (
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Custom Override Value</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="flex-1 bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary font-mono focus:border-primary focus:outline-none"
                    placeholder={`e.g. ${baseValue}`}
                    step={selectedInputObj?.step}
                    min={selectedInputObj?.min}
                    max={selectedInputObj?.max}
                    value={overrideValue}
                    onChange={(e) => setOverrideValue(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg border border-border bg-surface text-xs text-text-secondary leading-relaxed">
              <span className="font-semibold text-text-primary block mb-0.5">Simulation Context</span>
              Varying {selectedInputObj?.label}. This simulates calculation outcomes without modifying the primary project database.
            </div>
          </div>

          {/* Symmetrical Comparison Results */}
          <div className="lg:col-span-8">
            <h4 className="text-sm font-semibold text-text-primary mb-3">Simulation Results Comparison</h4>
            <div className="overflow-x-auto border border-border rounded-lg bg-surface">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-hover border-b border-border text-xs text-text-primary font-semibold">
                    <th className="p-3">Parameter / Outcome</th>
                    <th className="p-3 text-right">Base Design</th>
                    <th className="p-3 text-right">Modified Design</th>
                    <th className="p-3 text-right">Shift (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {renderComparisonRow('Soil Resistivity', 'soilResistivityOhmCm', 'Ω·cm', v => v.toFixed(0))}
                  {renderComparisonRow('Required Current', 'requiredCurrentA', 'A')}
                  {renderComparisonRow('Design Current', 'designCurrentA', 'A')}
                  {renderComparisonRow('Groundbed Resistance', 'groundbedResistanceOhm', 'Ω', v => v.toFixed(4))}
                  {renderComparisonRow('Loop Circuit Resistance', 'totalCircuitResistanceOhm', 'Ω', v => v.toFixed(4))}
                  {renderComparisonRow('TR Voltage Requirement', 'minTRVoltage', 'V', v => v.toFixed(2))}
                  {renderComparisonRow('Anode Bed Design Life', 'designLifeYears', 'yrs', v => v.toFixed(1))}
                  
                  {/* Status Row */}
                  <tr className="text-xs">
                    <td className="p-3 font-medium text-text-primary">Compliance Status</td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        station.lastCalcResult.allChecksPassed ? 'bg-green-500 bg-opacity-10 text-green-400' : 'bg-red-500 bg-opacity-10 text-red-400'
                      }`}>
                        {station.lastCalcResult.allChecksPassed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        singleScenarioResult?.result.allChecksPassed ? 'bg-green-500 bg-opacity-10 text-green-400' : 'bg-red-500 bg-opacity-10 text-red-400'
                      }`}>
                        {singleScenarioResult?.result.allChecksPassed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="p-3 text-right text-text-muted">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Multi Variable Comparison */}
      {activeTab === 'multi' && (
        <div className="flex flex-col gap-6">
          {/* Form to Add Scenario */}
          <form onSubmit={handleAddScenario} className="bg-surface border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-1">
              <label className="text-xs font-semibold text-text-primary block mb-1">Scenario Name</label>
              <input
                type="text"
                className="w-full bg-surface-hover border border-border rounded px-3 py-1.5 text-xs text-text-primary focus:border-primary focus:outline-none"
                placeholder="e.g. Worse Case Temperature"
                value={newScenName}
                onChange={(e) => setNewScenName(e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-xs font-semibold text-text-primary block mb-1">Soil Resistivity (Ω·cm)</label>
              <input
                type="number"
                className="w-full bg-surface-hover border border-border rounded px-3 py-1.5 text-xs text-text-primary font-mono focus:border-primary focus:outline-none"
                placeholder={`Base: ${station.soilResistivityOhmCm}`}
                value={multiOverrides.soilResistivityOhmCm}
                onChange={(e) => setMultiOverrides({ ...multiOverrides, soilResistivityOhmCm: e.target.value })}
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-xs font-semibold text-text-primary block mb-1">Anodes Qty</label>
              <input
                type="number"
                className="w-full bg-surface-hover border border-border rounded px-3 py-1.5 text-xs text-text-primary font-mono focus:border-primary focus:outline-none"
                placeholder={`Base: ${station.proposedAnodes}`}
                value={multiOverrides.proposedAnodes}
                onChange={(e) => setMultiOverrides({ ...multiOverrides, proposedAnodes: e.target.value })}
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-xs font-semibold text-text-primary block mb-1">Start Depth (m)</label>
              <input
                type="number"
                className="w-full bg-surface-hover border border-border rounded px-3 py-1.5 text-xs text-text-primary font-mono focus:border-primary focus:outline-none"
                placeholder={`Base: ${station.groundbed?.startDepthM}`}
                value={multiOverrides.startDepthM}
                onChange={(e) => setMultiOverrides({ ...multiOverrides, startDepthM: e.target.value })}
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-xs font-semibold text-text-primary block mb-1">TR Current Capacity (A)</label>
              <input
                type="number"
                className="w-full bg-surface-hover border border-border rounded px-3 py-1.5 text-xs text-text-primary font-mono focus:border-primary focus:outline-none"
                placeholder={`Base: ${station.tr?.ratedCurrent}`}
                value={multiOverrides.ratedCurrent}
                onChange={(e) => setMultiOverrides({ ...multiOverrides, ratedCurrent: e.target.value })}
              />
            </div>
            <div className="md:col-span-1 flex gap-2">
              <button
                type="submit"
                className="btn btn-primary text-xs w-full py-2 rounded-md font-bold"
              >
                + Add Design Scenario
              </button>
            </div>
          </form>

          {/* Comparison Grid */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">Multi-Variable Comparison Matrix</h4>
            <div className="overflow-x-auto border border-border rounded-lg bg-surface">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-hover border-b border-border text-xs text-text-primary font-semibold">
                    <th className="p-3">Parameter / Outcome</th>
                    <th className="p-3 text-right">Base Design</th>
                    {computedMultiScenarios.map((sc, idx) => (
                      <th key={idx} className="p-3 text-right font-semibold">
                        <div className="flex items-center justify-end gap-2">
                          <span>{savedScenarios[idx].name}</span>
                          <button
                            type="button"
                            className="text-red-400 hover:text-red-300 font-normal text-xs"
                            onClick={() => deleteScenario(savedScenarios[idx].id)}
                          >
                            ×
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border text-xs">
                    <td className="p-3 font-medium text-text-primary">Soil Resistivity</td>
                    <td className="p-3 font-mono text-text-primary text-right">{station.soilResistivityOhmCm} Ω·cm</td>
                    {computedMultiScenarios.map((sc, idx) => (
                      <td key={idx} className="p-3 font-mono text-right">
                        {sc.appliedOverrides.station.soilResistivityOhmCm ?? station.soilResistivityOhmCm} Ω·cm
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border text-xs">
                    <td className="p-3 font-medium text-text-primary">Anodes Count</td>
                    <td className="p-3 font-mono text-text-primary text-right">{station.proposedAnodes}</td>
                    {computedMultiScenarios.map((sc, idx) => (
                      <td key={idx} className="p-3 font-mono text-right">
                        {sc.appliedOverrides.station.proposedAnodes ?? station.proposedAnodes}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border text-xs">
                    <td className="p-3 font-medium text-text-primary">Required Current</td>
                    <td className="p-3 font-mono text-text-primary text-right">{station.lastCalcResult.requiredCurrentA.toFixed(2)} A</td>
                    {computedMultiScenarios.map((sc, idx) => (
                      <td key={idx} className="p-3 font-mono text-text-primary text-right">
                        {sc.result.requiredCurrentA.toFixed(2)} A
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border text-xs">
                    <td className="p-3 font-medium text-text-primary">Groundbed Resistance</td>
                    <td className="p-3 font-mono text-text-primary text-right">{station.lastCalcResult.groundbedResistanceOhm.toFixed(4)} Ω</td>
                    {computedMultiScenarios.map((sc, idx) => (
                      <td key={idx} className="p-3 font-mono text-text-primary text-right">
                        {sc.result.groundbedResistanceOhm.toFixed(4)} Ω
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border text-xs">
                    <td className="p-3 font-medium text-text-primary">TR Voltage Req</td>
                    <td className="p-3 font-mono text-text-primary text-right">{station.lastCalcResult.minTRVoltage.toFixed(2)} V</td>
                    {computedMultiScenarios.map((sc, idx) => (
                      <td key={idx} className="p-3 font-mono text-text-primary text-right">
                        {sc.result.minTRVoltage.toFixed(2)} V
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border text-xs">
                    <td className="p-3 font-medium text-text-primary">Anode Bed Life</td>
                    <td className="p-3 font-mono text-text-primary text-right">{station.lastCalcResult.designLifeYears.toFixed(1)} yrs</td>
                    {computedMultiScenarios.map((sc, idx) => (
                      <td key={idx} className="p-3 font-mono text-text-primary text-right">
                        {sc.result.designLifeYears.toFixed(1)} yrs
                      </td>
                    ))}
                  </tr>
                  
                  {/* Status Row */}
                  <tr className="text-xs">
                    <td className="p-3 font-medium text-text-primary">Compliance Status</td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        station.lastCalcResult.allChecksPassed ? 'bg-green-500 bg-opacity-10 text-green-400' : 'bg-red-500 bg-opacity-10 text-red-400'
                      }`}>
                        {station.lastCalcResult.allChecksPassed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    {computedMultiScenarios.map((sc, idx) => (
                      <td key={idx} className="p-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sc.result.allChecksPassed ? 'bg-green-500 bg-opacity-10 text-green-400' : 'bg-red-500 bg-opacity-10 text-red-400'
                        }`}>
                          {sc.result.allChecksPassed ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScenarioAnalysisPanel
