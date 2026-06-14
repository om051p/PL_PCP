/**
 * PageSoilResistivity.jsx
 *
 * Soil resistivity workspace. The single source of truth for the
 * soil resistivity that drives every downstream module:
 *   - Groundbed Design (R_G)
 *   - Cable Resistance (earth return)
 *   - TR Sizing (circuit analysis)
 *   - Attenuation Analysis (coating leakage)
 *   - Design Optimizer
 *   - Engineering Validation
 *
 * Inputs:
 *   - Manual design ρ
 *   - Layered soil model (depth-bounded layers)
 *   - Wenner 4-pin survey data
 *   - Excel paste grid
 *
 * Visualizations:
 *   - Layer visualization (depth vs ρ bar chart)
 *   - Survey curve (distance vs ρ)
 *   - Resistivity profile (composite)
 *   - Average design ρ readout
 *
 * Traceability:
 *   - Shows every module that reads this resistivity, with the
 *     exact field path it consumes.
 *
 * No calculations are performed here that aren't already in the
 * engine. The "average" calculation is a simple harmonic/weighted
 * mean that's read-only inspection of the layers.
 */

import { useMemo, useState, useCallback } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { SectionCard, Grid2, FieldInput, SelectField, ResultRow } from '../components/ui.jsx'
import { StandardBadge } from '../components/ui.jsx'
import { Layers as LayersIcon, FlaskConical, Activity, ClipboardCheck, Table2, BarChart3, LineChart as LineChartIcon, Sigma, GitBranch, Clipboard, Upload, Droplets, Thermometer, CheckCircle2, AlertTriangle } from 'lucide-react'
import { RightSideEngineeringPanel, SoilColumnVisualization, CorrosivityGauge, SoilImpactPanel, SurveyQualityScore } from '../visualizations/index.js'

const SOURCE_LABELS = {
  standard: 'Standard default',
  manual: 'User manual input',
  wenner: 'Wenner 4-pin survey',
  layered: 'Layered soil model',
  imported: 'Imported from Excel',
}

const RESISTIVITY_CONSUMERS = [
  { module: 'Groundbed Design', path: 'project.designBasis.soilResistivityOhmCm', purpose: 'R_G (Dwight / Sunde / distributed)' },
  { module: 'Cable Resistance', path: 'project.designBasis.soilResistivityOhmCm', purpose: 'Earth return (R_G) in circuit model' },
  { module: 'TR Sizing', path: 'project.designBasis.soilResistivityOhmCm', purpose: 'Voltage margin and AC input sizing' },
  { module: 'Attenuation Analysis', path: 'attenuationInput.coating.soilResistivityOhmCm', purpose: 'Coating leakage resistivity (R_L)' },
  { module: 'Design Optimizer', path: 'project.designBasis.soilResistivityOhmCm', purpose: 'Trade-off sensitivity on R_G' },
  { module: 'Engineering Validation', path: 'project.designBasis.soilResistivityOhmCm', purpose: 'Compliance range check' },
]

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function computeLayeredAverage(layers = []) {
  // Weighted harmonic mean by layer thickness. Returns NaN if no layers.
  const valid = layers.filter((l) => l.resistivityOhmCm > 0 && (l.depthToM - l.depthFromM) > 0)
  if (valid.length === 0) return null
  let totalThickness = 0
  let sumInvRhoT = 0
  for (const l of valid) {
    const t = l.depthToM - l.depthFromM
    totalThickness += t
    sumInvRhoT += t / l.resistivityOhmCm
  }
  if (sumInvRhoT === 0) return null
  return totalThickness / sumInvRhoT
}

function computeSurveyAverage(survey = []) {
  // Arithmetic mean of the Wenner readings.
  const valid = survey.filter((s) => s.resistivityOhmCm > 0)
  if (valid.length === 0) return null
  const sum = valid.reduce((a, s) => a + s.resistivityOhmCm, 0)
  return sum / valid.length
}

function classifySoil(ohmCm) {
  if (!Number.isFinite(ohmCm) || ohmCm <= 0) return 'unknown'
  if (ohmCm < 1000) return 'Low'
  if (ohmCm < 5000) return 'Medium'
  if (ohmCm < 20000) return 'High'
  return 'Very high'
}

function LayerVisualization({ layers = [] }) {
  const W = 600
  const H = 280
  const padX = 80
  const padY = 20
  const drawDepth = Math.max(...layers.map((l) => Number(l.depthToM) || 0), 10)
  const yScale = (m) => padY + (m / drawDepth) * (H - padY * 2)
  const maxRho = Math.max(...layers.map((l) => Number(l.resistivityOhmCm) || 0), 1000)

  return (
    <div className="viz-resistivity-host">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Layered soil resistivity profile">
        {/* axes */}
        <line x1={padX} y1={padY} x2={padX} y2={H - padY} stroke="currentColor" strokeOpacity={0.4} />
        <line x1={padX} y1={H - padY} x2={W - 20} y2={H - padY} stroke="currentColor" strokeOpacity={0.4} />
        {/* layers */}
        {layers.map((l, i) => {
          const y0 = yScale(l.depthFromM)
          const y1 = yScale(l.depthToM)
          const w = maxRho > 0 ? (l.resistivityOhmCm / maxRho) * (W - padX - 30) : 0
          const tone = l.resistivityOhmCm < 1000 ? '#10b981' : l.resistivityOhmCm < 5000 ? '#3b82f6' : l.resistivityOhmCm < 20000 ? '#f59e0b' : '#ef4444'
          return (
            <g key={i}>
              <rect x={padX} y={y0} width={Math.max(2, w)} height={Math.max(2, y1 - y0)} fill={tone} fillOpacity={0.7} />
              <text x={padX - 6} y={(y0 + y1) / 2 + 3} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.7} fontFamily="var(--font-mono, monospace)">
                {l.depthFromM}–{l.depthToM} m
              </text>
              <text x={padX + w + 6} y={(y0 + y1) / 2 + 3} fontSize={10} fill="currentColor" opacity={0.85} fontFamily="var(--font-mono, monospace)">
                {l.resistivityOhmCm.toLocaleString()} Ω·cm
              </text>
            </g>
          )
        })}
        {/* labels */}
        <text x={padX} y={H - 6} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.6}>
          Surface
        </text>
        <text x={padX} y={padY - 6} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.6}>
          {drawDepth} m
        </text>
      </svg>
    </div>
  )
}

function SurveyCurve({ survey = [] }) {
  const W = 600
  const H = 240
  const padX = 60
  const padY = 30
  const valid = survey.filter((s) => s.resistivityOhmCm > 0)
  if (valid.length === 0) {
    return <div className="viz-resistivity-empty">No survey points yet — paste Wenner readings or add rows above.</div>
  }
  const maxDist = Math.max(...valid.map((s) => s.distanceM || 0), 10)
  const maxRho = Math.max(...valid.map((s) => s.resistivityOhmCm), 1000)
  const xScale = (d) => padX + (d / maxDist) * (W - padX - 20)
  const yScale = (r) => H - padY - (r / maxRho) * (H - padY * 2)
  const pathD = valid
    .sort((a, b) => (a.distanceM || 0) - (b.distanceM || 0))
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${xScale(s.distanceM)} ${yScale(s.resistivityOhmCm)}`)
    .join(' ')

  return (
    <div className="viz-resistivity-host">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Wenner survey curve">
        <line x1={padX} y1={padY} x2={padX} y2={H - padY} stroke="currentColor" strokeOpacity={0.4} />
        <line x1={padX} y1={H - padY} x2={W - 20} y2={H - padY} stroke="currentColor" strokeOpacity={0.4} />
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2} />
        {valid.map((s, i) => (
          <circle key={i} cx={xScale(s.distanceM)} cy={yScale(s.resistivityOhmCm)} r={3.5} fill="#3b82f6" stroke="#0a0a0a" strokeWidth={1} />
        ))}
        <text x={padX} y={H - 6} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.6}>
          0 m
        </text>
        <text x={W - 20} y={H - 6} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.6} fontFamily="var(--font-mono, monospace)">
          {maxDist} m
        </text>
        <text x={12} y={padY} fontSize={9} fill="currentColor" opacity={0.6}>
          {maxRho.toLocaleString()} Ω·cm
        </text>
        <text x={12} y={H - padY} fontSize={9} fill="currentColor" opacity={0.6}>
          0
        </text>
      </svg>
    </div>
  )
}

function ResistivityProfile({ designResistivity, layeredAverage, surveyAverage, source }) {
  const W = 600
  const H = 200
  const padX = 80
  const padY = 30
  const candidates = [designResistivity, layeredAverage, surveyAverage].filter((v) => v != null && v > 0)
  const maxRho = Math.max(...candidates, 1000)
  const bars = [
    { label: 'Design ρ', value: designResistivity, color: '#10b981' },
    { label: 'Layered avg', value: layeredAverage, color: '#3b82f6' },
    { label: 'Survey avg', value: surveyAverage, color: '#f59e0b' },
  ]

  return (
    <div className="viz-resistivity-host">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Resistivity profile summary">
        <line x1={padX} y1={padY} x2={padX} y2={H - padY} stroke="currentColor" strokeOpacity={0.4} />
        {bars.map((b, i) => {
          if (!b.value) return null
          const x = padX + i * 130
          const h = (b.value / maxRho) * (H - padY * 2)
          const y = H - padY - h
          return (
            <g key={b.label}>
              <rect x={x} y={y} width={100} height={h} fill={b.color} fillOpacity={0.7} rx={3} />
              <text x={x + 50} y={y - 6} textAnchor="middle" fontSize={11} fill="currentColor" fontWeight={600} fontFamily="var(--font-mono, monospace)">
                {b.value.toLocaleString()}
              </text>
              <text x={x + 50} y={H - padY + 14} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.7}>
                {b.label}
              </text>
            </g>
          )
        })}
        <text x={12} y={padY} fontSize={9} fill="currentColor" opacity={0.6}>
          {maxRho.toLocaleString()} Ω·cm
        </text>
        <text x={W - 20} y={padY + 14} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.7} fontStyle="italic">
          Source: {SOURCE_LABELS[source] || source}
        </text>
      </svg>
    </div>
  )
}

function LayerEditor({ layers = [], onChange }) {
  const add = () => {
    const last = layers[layers.length - 1]
    const newFrom = last ? Number(last.depthToM) : 0
    onChange([...layers, { depthFromM: newFrom, depthToM: newFrom + 5, resistivityOhmCm: 5000 }])
  }
  const update = (i, field, value) => {
    const next = [...layers]
    next[i] = { ...next[i], [field]: Number(value) || 0 }
    onChange(next)
  }
  const remove = (i) => onChange(layers.filter((_, j) => j !== i))

  return (
    <div className="viz-resistivity-table-wrap">
      <table className="viz-resistivity-table">
        <thead>
          <tr>
            <th>Layer</th>
            <th>From (m)</th>
            <th>To (m)</th>
            <th>ρ (Ω·cm)</th>
            <th>Soil class</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {layers.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: 16, color: 'var(--text-tertiary)' }}>
                No layers defined. Click "Add layer" to begin.
              </td>
            </tr>
          )}
          {layers.map((l, i) => (
            <tr key={i}>
              <td>L{i + 1}</td>
              <td><input type="number" className="field-input" value={l.depthFromM} step="0.1" onChange={(e) => update(i, 'depthFromM', e.target.value)} /></td>
              <td><input type="number" className="field-input" value={l.depthToM} step="0.1" onChange={(e) => update(i, 'depthToM', e.target.value)} /></td>
              <td><input type="number" className="field-input" value={l.resistivityOhmCm} step="100" onChange={(e) => update(i, 'resistivityOhmCm', e.target.value)} /></td>
              <td><span className="viz-resistivity-class">{classifySoil(l.resistivityOhmCm)}</span></td>
              <td><button type="button" className="btn-icon-ghost" onClick={() => remove(i)}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-sm" onClick={add}>+ Add layer</button>
      </div>
    </div>
  )
}

function SurveyEditor({ survey = [], onChange }) {
  const add = () => {
    const last = survey[survey.length - 1]
    const newDist = last ? Number(last.distanceM) + 5 : 0
    onChange([...survey, { distanceM: newDist, resistivityOhmCm: 5000 }])
  }
  const update = (i, field, value) => {
    const next = [...survey]
    next[i] = { ...next[i], [field]: Number(value) || 0 }
    onChange(next)
  }
  const remove = (i) => onChange(survey.filter((_, j) => j !== i))

  return (
    <div className="viz-resistivity-table-wrap">
      <table className="viz-resistivity-table">
        <thead>
          <tr>
            <th>Point</th>
            <th>a (m)</th>
            <th>ρ (Ω·cm)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {survey.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: 16, color: 'var(--text-tertiary)' }}>
                No survey points. Click "Add point" or paste from Excel below.
              </td>
            </tr>
          )}
          {survey.map((s, i) => (
            <tr key={i}>
              <td>P{i + 1}</td>
              <td><input type="number" className="field-input" value={s.distanceM} step="0.5" onChange={(e) => update(i, 'distanceM', e.target.value)} /></td>
              <td><input type="number" className="field-input" value={s.resistivityOhmCm} step="100" onChange={(e) => update(i, 'resistivityOhmCm', e.target.value)} /></td>
              <td><button type="button" className="btn-icon-ghost" onClick={() => remove(i)}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-sm" onClick={add}>+ Add point</button>
      </div>
    </div>
  )
}

export function PageSoilResistivity() {
  const project = useProjectStore((s) => s.getProject())
  const updateProject = useProjectStore((s) => s.updateProject)

  const [pasteText, setPasteText] = useState('')

  const db = project?.designBasis || {}
  const designRho = num(db.soilResistivityOhmCm)
  const source = db.soilResistivitySource || 'standard'
  const layers = db.soilResistivityLayers || []
  const survey = db.soilResistivitySurvey || []

  const layeredAverage = useMemo(() => computeLayeredAverage(layers), [layers])
  const surveyAverage = useMemo(() => computeSurveyAverage(survey), [survey])

  if (!project) return null

  const setDesign = (field, value) => {
    updateProject((p) => {
      p.designBasis = { ...p.designBasis, [field]: value }
    })
  }

  const setLayers = (next) => {
    updateProject((p) => {
      p.designBasis = { ...p.designBasis, soilResistivityLayers: next, soilResistivitySource: 'layered' }
    })
  }

  const setSurvey = (next) => {
    updateProject((p) => {
      p.designBasis = { ...p.designBasis, soilResistivitySurvey: next, soilResistivitySource: 'wenner' }
    })
  }

  const handlePaste = () => {
    const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const next = lines.map((line) => {
      const parts = line.split(/[,\t;]\s*/).map((p) => Number(p) || 0)
      return { distanceM: parts[0] || 0, resistivityOhmCm: parts[1] || 0 }
    }).filter((s) => s.distanceM > 0 || s.resistivityOhmCm > 0)
    if (next.length > 0) {
      setSurvey(next)
      setPasteText('')
    }
  }

  const applyLayeredAverage = () => {
    if (layeredAverage) {
      setDesign('soilResistivityOhmCm', Math.round(layeredAverage))
    }
  }
  const applySurveyAverage = () => {
    if (surveyAverage) {
      setDesign('soilResistivityOhmCm', Math.round(surveyAverage))
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Soil Resistivity</h1>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
            Single source of truth for design ρ — consumed by every engineering module
          </p>
        </div>
        <StandardBadge project={project} />
      </div>

      <RightSideEngineeringPanel
        panelTitle="Soil Intelligence"
        panel={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SoilColumnVisualization
              layers={(layers || []).map((l, i) => ({
                depthM: l.depthFromM || 0,
                thicknessM: (l.depthToM || 0) - (l.depthFromM || 0),
                resistivityOhmCm: l.resistivityOhmCm || 0,
                material: l.material || `Layer ${i + 1}`,
              }))}
            />
            <CorrosivityGauge resistivityOhmCm={designRho} />
            <SoilImpactPanel resistivityOhmCm={designRho} />
            <SurveyQualityScore surveyData={survey} layers={layers} />
          </div>
        }
      >
      <div className="enterprise-2col">
        {/* Left: Input Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionCard title="Manual Design Resistivity" icon={Sigma}>
            <FieldInput
              label="Design ρ"
              value={db.soilResistivityOhmCm}
              unit="Ω·cm"
              min={1}
              step={10}
              onChange={(v) => {
                setDesign('soilResistivityOhmCm', v)
                setDesign('soilResistivitySource', 'manual')
              }}
              hint="Used directly by all downstream modules"
            />
            <SelectField
              label="Source"
              value={source}
              onChange={(v) => setDesign('soilResistivitySource', v)}
              options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Grid2>
              <SelectField
                label="Seasonal Correction"
                value={db.seasonalCorrection || 'none'}
                onChange={(v) => setDesign('seasonalCorrection', v)}
                options={[
                  { value: 'none', label: 'None (dry season)' },
                  { value: 'wet', label: 'Wet season (-30%)' },
                  { value: 'frozen', label: 'Frozen (+200%)' },
                  { value: 'custom', label: 'Custom factor' },
                ]}
              />
              <SelectField
                label="Moisture Condition"
                value={db.moistureCondition || 'normal'}
                onChange={(v) => setDesign('moistureCondition', v)}
                options={[
                  { value: 'dry', label: 'Dry / Arid' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'wet', label: 'Wet / Saturated' },
                  { value: 'submerged', label: 'Submerged' },
                ]}
              />
            </Grid2>
            {db.seasonalCorrection === 'custom' && (
              <FieldInput
                label="Correction Factor"
                value={db.seasonalCorrectionFactor || 1.0}
                unit="×"
                min={0.1}
                max={10}
                step={0.1}
                onChange={(v) => setDesign('seasonalCorrectionFactor', v)}
                hint="Multiplier applied to design ρ for seasonal variation"
              />
            )}
            <div className="viz-resistivity-meta">
              <span>Soil class:</span>
              <strong>{classifySoil(designRho)}</strong>
              {db.seasonalCorrection && db.seasonalCorrection !== 'none' && (
                <span style={{ marginLeft: 12 }}>
                  <Thermometer size={11} style={{ verticalAlign: 'middle' }} /> Seasonal: {db.seasonalCorrection}
                </span>
              )}
              {db.moistureCondition && (
                <span style={{ marginLeft: 12 }}>
                  <Droplets size={11} style={{ verticalAlign: 'middle' }} /> Moisture: {db.moistureCondition}
                </span>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Layered Soil Model" icon={LayersIcon}>
            <LayerEditor layers={layers} onChange={setLayers} />
            {layeredAverage != null && (
              <div className="viz-resistivity-apply">
                <span>
                  Harmonic-mean (thickness-weighted): <strong>{Math.round(layeredAverage).toLocaleString()} Ω·cm</strong>
                </span>
                <button type="button" className="btn btn-sm" onClick={applyLayeredAverage}>
                  Use as design ρ
                </button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Wenner 4-Pin Survey" icon={FlaskConical}>
            <div className="viz-resistivity-wenner-note">
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                Wenner 4-pin method per ASTM G57 / SAES-X-400 §6.3.3. Electrode spacing <em>a</em> (m) vs. measured apparent resistivity ρ (Ω·cm).
              </p>
            </div>
            <SurveyEditor survey={survey} onChange={setSurvey} />
            {surveyAverage != null && (
              <div className="viz-resistivity-apply">
                <span>
                  Arithmetic mean of {survey.length} point{survey.length !== 1 ? 's' : ''}: <strong>{Math.round(surveyAverage).toLocaleString()} Ω·cm</strong>
                </span>
                <button type="button" className="btn btn-sm" onClick={applySurveyAverage}>
                  Use as design ρ
                </button>
              </div>
            )}
            {/* ── Excel Paste Grid — First-Class Feature ── */}
            <div className="viz-resistivity-paste-section">
              <div className="viz-resistivity-paste-header">
                <Clipboard size={14} />
                <span>Excel / CSV Data Paste</span>
                <span className="viz-resistivity-paste-hint">Paste directly from Excel — tab, comma, or space delimited</span>
              </div>
              <textarea
                rows={6}
                className="viz-resistivity-paste-textarea"
                value={pasteText}
                onChange={(e) => {
                  setPasteText(e.target.value)
                  // Live preview: auto-parse on change
                  const lines = e.target.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
                  if (lines.length >= 2) {
                    const parsed = lines.map(line => {
                      const parts = line.split(/[,\t;]\s*/).map(p => Number(p) || 0)
                      return { distanceM: parts[0] || 0, resistivityOhmCm: parts[1] || 0 }
                    }).filter(s => s.distanceM > 0 || s.resistivityOhmCm > 0)
                    if (parsed.length > 0) {
                      // Store preview data for display
                      window.__soilPastePreview = parsed
                    }
                  }
                }}
                placeholder={`Spacing(m)\tResistivity(Ω-cm)\n1\t1200\n2\t1400\n5\t1800\n10\t2500\n20\t3500\n50\t6000`}
              />
              <div className="viz-resistivity-paste-actions">
                <button type="button" className="btn btn-sm" onClick={handlePaste}>
                  <Upload size={12} /> Parse & Import
                </button>
                <span className="viz-resistivity-paste-feedback">
                  {pasteText.trim() ? (
                    <><CheckCircle2 size={12} /> {pasteText.split(/\r?\n/).filter(l => l.trim()).length} rows detected — click Import to apply</>
                  ) : (
                    <><AlertTriangle size={12} /> Paste tabular data from Excel above</>
                  )}
                </span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Right: Large Visualization (min 500px height) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionCard title="Resistivity Profile" icon={BarChart3}>
            <ResistivityProfile
              designResistivity={designRho}
              layeredAverage={layeredAverage}
              surveyAverage={surveyAverage}
              source={source}
            />
          </SectionCard>
          <SectionCard title="Layer Visualization" icon={LayersIcon}>
            <LayerVisualization layers={layers} />
          </SectionCard>
          <SectionCard title="Survey Curve" icon={LineChartIcon}>
            <SurveyCurve survey={survey} />
          </SectionCard>
        </div>
      </div>
      </RightSideEngineeringPanel>

      {/* Bottom: Dependency Map */}
      <SectionCard title="Engineering Traceability" icon={GitBranch}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
          Every module that reads this resistivity. The field path is the exact location in the project store.
        </p>
        <table className="viz-resistivity-traceability">
          <thead>
            <tr>
              <th>Module</th>
              <th>Field path</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {RESISTIVITY_CONSUMERS.map((c) => (
              <tr key={c.module}>
                <td>
                  <strong>{c.module}</strong>
                </td>
                <td><code>{c.path}</code></td>
                <td>{c.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  )
}
