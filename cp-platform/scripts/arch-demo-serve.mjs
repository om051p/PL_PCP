/**
 * Architecture demo: renders the new + refactored components in a
 * self-contained HTML page. Components are loaded as ESM modules from
 * a pre-bundled demo. No router, no auth, no Firebase.
 */
import { build } from 'esbuild'
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'demo-out')
mkdirSync(OUT, { recursive: true })

const entrySrc = `
import { createRoot } from 'react-dom/client'
import { createElement as h, StrictMode, useState, useSyncExternalStore } from 'react'
import '../src/index.css'

// Stub project store (no zustand, no Firebase, no router)
const project = {
  id: 'demo',
  projectName: 'Sample Pipeline Project',
  projectNumber: 'P-2026-001',
  clientName: 'Aramco Eastern Region',
  activeStandard: 'Saudi Aramco DES-104',
  status: 'calculated',
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  currentRevision: 'R3',
  revisions: [{ n: 1 }, { n: 2 }, { n: 3 }],
  designBasis: {
    systemDesignLifeYears: 25,
    soilResistivityOhmCm: 5200,
    soilResistivitySource: 'wenner',
    soilResistivityLayers: [
      { depthFromM: 0, depthToM: 2, resistivityOhmCm: 8500 },
      { depthFromM: 2, depthToM: 8, resistivityOhmCm: 5200 },
      { depthFromM: 8, depthToM: 20, resistivityOhmCm: 3100 },
      { depthFromM: 20, depthToM: 50, resistivityOhmCm: 2200 },
    ],
    soilResistivitySurvey: [
      { distanceM: 1, resistivityOhmCm: 8800 },
      { distanceM: 2, resistivityOhmCm: 6500 },
      { distanceM: 3, resistivityOhmCm: 5200 },
      { distanceM: 5, resistivityOhmCm: 4800 },
      { distanceM: 8, resistivityOhmCm: 4200 },
      { distanceM: 15, resistivityOhmCm: 3100 },
      { distanceM: 25, resistivityOhmCm: 2400 },
    ],
  },
  stations: [
    { id: 's1', name: 'Station 1', status: 'approved', proposedAnodes: 6, anodeSpec: { id: 'mmo', label: 'MMO tubular' }, groundbed: { type: 'deepwell', startDepthM: 25, anodeLengthM: 1.5, anodeSpacingM: 3, boreholeDiaM: 0.35, cokeCoverM: 5, cementPlugM: 2 }, tr: { ratedVoltage: 50, ratedCurrent: 20 }, cables: { anodeCableSizeMm2: 16, anodeTailLengths: [5,5,5,5,5,5], posMainLengthM: 80, posMainSizeMm2: 35, negMainLengthM: 60, negMainSizeMm2: 35, negSecLengthM: 20, negSecSizeMm2: 16 }, soilResistivityOhmCm: 5200, pipelineSegments: [{ lengthM: 1200 }, { lengthM: 800 }, { lengthM: 1500 }], validationErrors: [], lastCalcResult: { groundbedResistanceOhm: 0.18, maxAllowableGroundbedRes: 0.5, designLifeYears: 32, targetDesignLifeYears: 25, activeLengthM: 22.5, totalDrillDepthM: 54.5, calculatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), anodeTailParallelResOhm: 0.05, posMainCableResOhm: 0.042, negMainCableResOhm: 0.038, totalCableResOhm: 0.13, totalCircuitResistanceOhm: 0.95, minTRVoltage: 19.0 }, updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
    { id: 's2', name: 'Station 2', status: 'engineering_review', proposedAnodes: 4, anodeSpec: { id: 'graphite', label: 'Graphite' }, groundbed: { type: 'shallow_vertical', startDepthM: 4, anodeLengthM: 3, anodeSpacingM: 6, boreholeDiaM: 0.3 }, tr: { ratedVoltage: 30, ratedCurrent: 12 }, cables: { anodeCableSizeMm2: 16, anodeTailLengths: [4,4,4,4], posMainLengthM: 150, posMainSizeMm2: 25, negMainLengthM: 100, negMainSizeMm2: 25, negSecLengthM: 30, negSecSizeMm2: 16 }, soilResistivityOhmCm: 5200, pipelineSegments: [{ lengthM: 600 }, { lengthM: 900 }], validationErrors: ['Coating breakdown exceeds 3% at KM 6+200'], lastCalcResult: { groundbedResistanceOhm: 0.95, maxAllowableGroundbedRes: 0.8, designLifeYears: 20, targetDesignLifeYears: 25, activeLengthM: 39, calculatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), anodeTailParallelResOhm: 0.12, posMainCableResOhm: 0.18, negMainCableResOhm: 0.09, totalCableResOhm: 0.39, totalCircuitResistanceOhm: 1.5, minTRVoltage: 24.5 }, updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: 's3', name: 'Station 3', status: 'draft', proposedAnodes: 8, anodeSpec: { id: 'hi-silicon', label: 'High-silicon cast iron' }, groundbed: { type: 'distributed', startDepthM: 1.5, anodeLengthM: 1.2, anodeSpacingM: 4, boreholeDiaM: 0.3 }, tr: { ratedVoltage: 40, ratedCurrent: 15 }, cables: { anodeCableSizeMm2: 16, anodeTailLengths: [3,3,3,3,3,3,3,3], posMainLengthM: 60, posMainSizeMm2: 35, negMainLengthM: 50, negMainSizeMm2: 35, negSecLengthM: 0, negSecSizeMm2: 35 }, soilResistivityOhmCm: 5200, pipelineSegments: [{ lengthM: 700 }, { lengthM: 1100 }, { lengthM: 600 }], validationErrors: [], lastCalcResult: null },
  ],
}

// Pure JS computation for the demo's mini-visualisations
function classifySoil(ohmCm) {
  if (!Number.isFinite(ohmCm) || ohmCm <= 0) return 'unknown'
  if (ohmCm < 1000) return 'Low'
  if (ohmCm < 5000) return 'Medium'
  if (ohmCm < 20000) return 'High'
  return 'Very high'
}

function App() {
  const [tab, setTab] = useState('resistivity')
  return h('div', { style: { background: '#09090b', minHeight: '100vh', color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif' } },
    h('div', { style: { padding: 16, borderBottom: '1px solid #27272a', display: 'flex', gap: 8, alignItems: 'center' } },
      h('h1', { style: { fontSize: 16, margin: 0, marginRight: 24, color: '#fafafa' } }, 'UI Architecture Optimization — Demos'),
      h('button', { className: 'btn btn-sm ' + (tab === 'resistivity' ? 'btn-primary' : ''), onClick: () => setTab('resistivity') }, '1. Soil Resistivity'),
      h('button', { className: 'btn btn-sm ' + (tab === 'dashboard' ? 'btn-primary' : ''), onClick: () => setTab('dashboard') }, '2. Dashboard v2'),
      h('button', { className: 'btn btn-sm ' + (tab === 'cable' ? 'btn-primary' : ''), onClick: () => setTab('cable') }, '3. Cable v2'),
    ),
    h('div', { style: { padding: 16 } },
      tab === 'resistivity' && h(ResistivityPanel, { project }),
      tab === 'dashboard' && h(DashboardPanel, { project }),
      tab === 'cable' && h(CablePanel, { station: project.stations[1] }),
    ),
  )
}

// ─── Self-contained mini-resistivity panel (no zustand, no router) ─────────
function ResistivityPanel({ project }) {
  const [rho, setRho] = useState(project.designBasis.soilResistivityOhmCm)
  const [layers, setLayers] = useState(project.designBasis.soilResistivityLayers)
  const [survey, setSurvey] = useState(project.designBasis.soilResistivitySurvey)
  const source = layers.length > 0 ? 'layered' : survey.length > 0 ? 'wenner' : 'standard'
  const layeredAvg = computeLayeredAverage(layers)
  const surveyAvg = computeSurveyAverage(survey)
  return h('div', null,
    h('div', { className: 'demo-section-title' }, 'PRIORITY 1 — SOIL RESISTIVITY WORKSPACE'),
    h('p', { style: { color: '#a1a1aa', fontSize: 12, marginBottom: 12 } },
      'New module under "Project Definition" in the sidebar. Single source of truth for design ρ. Consumed by Groundbed, Cable, TR, Attenuation, Optimizer, and Validation.'
    ),
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 } },
      h('section', { className: 'viz-soil-resistivity' },
        h('header', { className: 'viz-soil-resistivity-header' },
          h('h3', { className: 'viz-soil-resistivity-title' }, 'Manual Design Resistivity'),
        ),
        h('dl', { className: 'viz-soil-resistivity-list' },
          h('div', { className: 'viz-soil-resistivity-row is-primary' },
            h('dt', null, 'Design ρ'),
            h('dd', null,
              h('span', { className: 'viz-soil-resistivity-value' }, rho.toLocaleString()),
              h('span', { className: 'viz-soil-resistivity-unit' }, ' Ω·cm'),
            ),
          ),
          h('div', { className: 'viz-soil-resistivity-row is-meta' },
            h('dt', null, 'Source of value'),
            h('dd', null, h('span', null, source === 'wenner' ? 'Wenner 4-pin survey' : source === 'layered' ? 'Layered soil model' : 'Standard default')),
          ),
          h('div', { className: 'viz-soil-resistivity-row is-meta' },
            h('dt', null, 'Standard'),
            h('dd', null, 'Saudi Aramco DES-104'),
          ),
          h('div', { className: 'viz-soil-resistivity-row is-meta' },
            h('dt', null, 'Soil class'),
            h('dd', null, h('span', null, classifySoil(rho))),
          ),
        ),
        h('div', { style: { marginTop: 8, display: 'flex', gap: 6 } },
          h('input', { type: 'range', min: 100, max: 30000, step: 100, value: rho, onChange: (e) => setRho(Number(e.target.value)), style: { flex: 1 } }),
        ),
      ),
      h('section', { className: 'viz-soil-resistivity' },
        h('header', { className: 'viz-soil-resistivity-header' },
          h('h3', { className: 'viz-soil-resistivity-title' }, 'Layered Soil Model'),
        ),
        h('div', { className: 'viz-resistivity-table-wrap' },
          h('table', { className: 'viz-resistivity-table' },
            h('thead', null, h('tr', null, h('th', null, 'Layer'), h('th', null, 'From (m)'), h('th', null, 'To (m)'), h('th', null, 'ρ (Ω·cm)'), h('th', null, 'Class'))),
            h('tbody', null, layers.map((l, i) => h('tr', { key: i },
              h('td', null, 'L' + (i + 1)),
              h('td', null, l.depthFromM),
              h('td', null, l.depthToM),
              h('td', null, l.resistivityOhmCm.toLocaleString()),
              h('td', null, h('span', { className: 'viz-resistivity-class' }, classifySoil(l.resistivityOhmCm))),
            ))),
          ),
        ),
        layeredAvg != null && h('div', { className: 'viz-resistivity-apply' },
          h('span', null, 'Harmonic mean: ', h('strong', null, Math.round(layeredAvg).toLocaleString() + ' Ω·cm')),
          h('button', { className: 'btn btn-sm', onClick: () => setRho(Math.round(layeredAvg)) }, 'Use as design ρ'),
        ),
      ),
    ),
    h('section', { className: 'viz-soil-resistivity', style: { marginBottom: 12 } },
      h('header', { className: 'viz-soil-resistivity-header' },
        h('h3', { className: 'viz-soil-resistivity-title' }, 'Wenner 4-Pin Survey'),
      ),
      h('div', { className: 'viz-resistivity-table-wrap' },
        h('table', { className: 'viz-resistivity-table' },
          h('thead', null, h('tr', null, h('th', null, 'Point'), h('th', null, 'a (m)'), h('th', null, 'ρ (Ω·cm)'))),
          h('tbody', null, survey.map((s, i) => h('tr', { key: i },
            h('td', null, 'P' + (i + 1)),
            h('td', null, s.distanceM),
            h('td', null, s.resistivityOhmCm.toLocaleString()),
          ))),
        ),
      ),
      surveyAvg != null && h('div', { className: 'viz-resistivity-apply' },
        h('span', null, 'Arithmetic mean: ', h('strong', null, Math.round(surveyAvg).toLocaleString() + ' Ω·cm')),
        h('button', { className: 'btn btn-sm', onClick: () => setRho(Math.round(surveyAvg)) }, 'Use as design ρ'),
      ),
    ),
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 } },
      h('section', { className: 'viz-resistivity-host' },
        h('div', { style: { padding: 8, fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 } }, 'Layer Visualization'),
        h(LayerSvg, { layers }),
      ),
      h('section', { className: 'viz-resistivity-host' },
        h('div', { style: { padding: 8, fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 } }, 'Survey Curve'),
        h(SurveySvg, { survey }),
      ),
    ),
    h('section', { className: 'viz-soil-resistivity' },
      h('header', { className: 'viz-soil-resistivity-header' },
        h('h3', { className: 'viz-soil-resistivity-title' }, 'Engineering Traceability'),
      ),
      h('p', { style: { fontSize: 12, color: '#a1a1aa', margin: '0 0 8px' } },
        'Every module that reads this resistivity:'
      ),
      h('table', { className: 'viz-resistivity-traceability' },
        h('thead', null, h('tr', null, h('th', null, 'Module'), h('th', null, 'Field path'), h('th', null, 'Purpose'))),
        h('tbody', null,
          ['Groundbed Design', 'Cable Resistance', 'TR Sizing', 'Attenuation Analysis', 'Design Optimizer', 'Engineering Validation'].map((m, i) =>
            h('tr', { key: i },
              h('td', null, h('strong', null, m)),
              h('td', null, h('code', null, 'project.designBasis.soilResistivityOhmCm')),
              h('td', null, ['R_G (Dwight/Sunde)', 'Earth return', 'Voltage margin', 'Coating leakage R_L', 'Trade-off sensitivity', 'Compliance range check'][i]),
            )
          ),
        ),
      ),
    ),
  )
}

function LayerSvg({ layers }) {
  const W = 600, H = 200, padX = 60, padY = 20
  const drawDepth = Math.max(...layers.map((l) => Number(l.depthToM) || 0), 10)
  const yScale = (m) => padY + (m / drawDepth) * (H - padY * 2)
  const maxRho = Math.max(...layers.map((l) => Number(l.resistivityOhmCm) || 0), 1000)
  return h('svg', { viewBox: '0 0 ' + W + ' ' + H, style: { width: '100%', display: 'block' } },
    h('line', { x1: padX, y1: padY, x2: padX, y2: H - padY, stroke: 'currentColor', strokeOpacity: 0.4 }),
    h('line', { x1: padX, y1: H - padY, x2: W - 20, y2: H - padY, stroke: 'currentColor', strokeOpacity: 0.4 }),
    layers.map((l, i) => {
      const y0 = yScale(l.depthFromM), y1 = yScale(l.depthToM)
      const w = maxRho > 0 ? (l.resistivityOhmCm / maxRho) * (W - padX - 50) : 0
      const tone = l.resistivityOhmCm < 1000 ? '#10b981' : l.resistivityOhmCm < 5000 ? '#3b82f6' : l.resistivityOhmCm < 20000 ? '#f59e0b' : '#ef4444'
      return h('g', { key: i },
        h('rect', { x: padX, y: y0, width: Math.max(2, w), height: Math.max(2, y1 - y0), fill: tone, fillOpacity: 0.7 }),
        h('text', { x: padX - 6, y: (y0 + y1) / 2 + 3, textAnchor: 'end', fontSize: 9, fill: 'currentColor', opacity: 0.7, fontFamily: 'var(--font-mono, monospace)' }, l.depthFromM + '–' + l.depthToM + ' m'),
        h('text', { x: padX + w + 6, y: (y0 + y1) / 2 + 3, fontSize: 9, fill: 'currentColor', opacity: 0.85, fontFamily: 'var(--font-mono, monospace)' }, l.resistivityOhmCm.toLocaleString() + ' Ω·cm'),
      )
    }),
  )
}

function SurveySvg({ survey }) {
  const W = 600, H = 200, padX = 60, padY = 30
  if (!survey.length) return h('div', { className: 'viz-resistivity-empty' }, 'No survey points')
  const maxDist = Math.max(...survey.map((s) => s.distanceM), 10)
  const maxRho = Math.max(...survey.map((s) => s.resistivityOhmCm), 1000)
  const xScale = (d) => padX + (d / maxDist) * (W - padX - 20)
  const yScale = (r) => H - padY - (r / maxRho) * (H - padY * 2)
  const pathD = survey.sort((a, b) => a.distanceM - b.distanceM).map((s, i) =>
    (i === 0 ? 'M' : 'L') + ' ' + xScale(s.distanceM) + ' ' + yScale(s.resistivityOhmCm)
  ).join(' ')
  return h('svg', { viewBox: '0 0 ' + W + ' ' + H, style: { width: '100%', display: 'block' } },
    h('line', { x1: padX, y1: padY, x2: padX, y2: H - padY, stroke: 'currentColor', strokeOpacity: 0.4 }),
    h('line', { x1: padX, y1: H - padY, x2: W - 20, y2: H - padY, stroke: 'currentColor', strokeOpacity: 0.4 }),
    h('path', { d: pathD, fill: 'none', stroke: '#3b82f6', strokeWidth: 2 }),
    survey.map((s, i) =>
      h('circle', { key: i, cx: xScale(s.distanceM), cy: yScale(s.resistivityOhmCm), r: 3.5, fill: '#3b82f6' })
    ),
  )
}

function computeLayeredAverage(layers) {
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

function computeSurveyAverage(survey) {
  const valid = survey.filter((s) => s.resistivityOhmCm > 0)
  if (valid.length === 0) return null
  const sum = valid.reduce((a, s) => a + s.resistivityOhmCm, 0)
  return sum / valid.length
}

// ─── Self-contained mini-dashboard (matches PageDashboard v2 layout) ─────────
function DashboardPanel({ project }) {
  const stations = project.stations
  const calculated = stations.filter((s) => s.lastCalcResult).length
  const approved = stations.filter((s) => s.status === 'approved').length
  const inReview = stations.filter((s) => s.status === 'engineering_review').length
  const openWarnings = stations.reduce((acc, s) => acc + (s.validationErrors?.length || 0), 0)
  const score = Math.round(((calculated / stations.length) * 50) + ((approved / stations.length) * 30) + ((inReview / stations.length) * 20))

  return h('div', { style: { display: 'grid', gridTemplateColumns: '7fr 3fr', gap: 12 } },
    // LEFT 70%
    h('div', null,
      h('div', { className: 'demo-section-title' }, 'PRIORITY 2 — DASHBOARD v2 (LEFT 70%)'),
      h('section', { className: 'dashboard-pipeline-section' },
        h('div', { className: 'dashboard-section-header' },
          h('h2', { style: { fontSize: 14, fontWeight: 600, margin: 0, color: '#fafafa' } }, 'Project Overview'),
          h('div', { style: { fontSize: 12, color: '#71717a' } }, project.projectName + ' · ' + stations.length + ' stations'),
        ),
        h('div', { className: 'dashboard-project-metadata' },
          ['Project', 'Number', 'Client', 'Standard', 'Status', 'Design life'].map((label, i) => {
            const vals = [project.projectName, project.projectNumber, project.clientName, project.activeStandard, project.status, project.designBasis.systemDesignLifeYears + ' yrs']
            return h('div', { className: 'dashboard-meta-card', key: i },
              h('div', { className: 'dashboard-meta-label' }, label),
              h('div', { className: 'dashboard-meta-value viz-mono' }, vals[i]),
            )
          }),
        ),
        h('div', { className: 'dashboard-viz' },
          h('h3', { className: 'dashboard-section-title' }, 'Pipeline overview'),
          PipelineOverviewMini({ stations }),
        ),
        h('div', { className: 'dashboard-grid-3' },
          h('div', { className: 'dashboard-status-card' },
            h('h3', { className: 'dashboard-section-title' }, 'Current status'),
            h('ul', { className: 'dashboard-status-list' },
              h('li', null, h('span', null, 'Calculated stations'), h('strong', null, calculated + ' / ' + stations.length)),
              h('li', null, h('span', null, 'Approved stations'), h('strong', null, approved)),
              h('li', null, h('span', null, 'In review'), h('strong', null, inReview)),
              h('li', null, h('span', null, 'Open validation errors'), h('strong', null, openWarnings)),
            ),
          ),
          h('div', { className: 'dashboard-status-card' },
            h('h3', { className: 'dashboard-section-title' }, 'Open warnings'),
            h('ul', { className: 'dashboard-warning-list' },
              stations.flatMap((s) => (s.validationErrors || []).map((e) =>
                h('li', { key: s.id + e }, h('span', { className: 'dashboard-warning-station' }, s.name), h('span', { className: 'dashboard-warning-text' }, e))
              )),
              openWarnings === 0 && h('li', { className: 'dashboard-warning-empty' }, 'No open warnings'),
            ),
          ),
          h('div', { className: 'dashboard-status-card' },
            h('h3', { className: 'dashboard-section-title' }, 'Latest calculations'),
            h('ul', { className: 'dashboard-recent-list' },
              stations.filter((s) => s.lastCalcResult?.calculatedAt).slice(0, 6).map((s) =>
                h('li', { key: s.id },
                  h('span', { className: 'dashboard-recent-name' }, s.name),
                  h('span', { className: 'dashboard-recent-text' }, 'Calculation run'),
                  h('span', { className: 'dashboard-recent-time' }, new Date(s.lastCalcResult.calculatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })),
                )
              ),
            ),
          ),
        ),
        h('div', { className: 'dashboard-recent-activity' },
          h('h3', { className: 'dashboard-section-title' }, 'Recent activity'),
          h('ul', { className: 'dashboard-recent-list' },
            stations.flatMap((s) => {
              const events = []
              if (s.lastCalcResult?.calculatedAt) events.push({ station: s.name, text: 'Calculation run', ts: s.lastCalcResult.calculatedAt })
              if (s.status === 'approved') events.push({ station: s.name, text: 'Station approved', ts: s.updatedAt })
              if (s.status === 'engineering_review') events.push({ station: s.name, text: 'In engineering review', ts: s.updatedAt })
              return events
            }).sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 8).map((e, i) =>
              h('li', { key: i },
                h('span', { className: 'dashboard-recent-name' }, e.station),
                h('span', { className: 'dashboard-recent-text' }, e.text),
                h('span', { className: 'dashboard-recent-time' }, new Date(e.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })),
              )
            ),
          ),
        ),
        h('div', { className: 'dashboard-revision' },
          h('h3', { className: 'dashboard-section-title' }, 'Revision information'),
          h('div', { className: 'dashboard-revision-grid' },
            h('div', null, h('span', null, 'Current revision'), h('strong', null, project.currentRevision || '—')),
            h('div', null, h('span', null, 'Created'), h('strong', null, new Date(project.createdAt).toLocaleDateString())),
            h('div', null, h('span', null, 'Last updated'), h('strong', null, new Date(project.updatedAt).toLocaleDateString())),
            h('div', null, h('span', null, 'Revisions'), h('strong', null, String(project.revisions.length))),
          ),
        ),
      ),
    ),
    // RIGHT 30%
    h('div', null,
      h('div', { className: 'demo-section-title' }, 'RIGHT 30%'),
      h('div', { className: 'viz-side-aside-sticky', style: { position: 'static' } },
        h('div', { className: 'viz-side-widgets' },
          h('section', { className: 'viz-side-section viz-side-section-center' },
            h('h3', { className: 'viz-side-section-title' }, 'Project health'),
            h('div', { className: 'viz-side-gauge' },
              h('svg', { width: 120, height: 120, viewBox: '0 0 120 120' },
                h('circle', { cx: 60, cy: 60, r: 50, fill: 'none', stroke: '#27272a', strokeWidth: 10 }),
                h('circle', { cx: 60, cy: 60, r: 50, fill: 'none', stroke: score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444', strokeWidth: 10, strokeLinecap: 'round', strokeDasharray: 2 * Math.PI * 50, strokeDashoffset: 2 * Math.PI * 50 * (1 - score / 100), transform: 'rotate(-90 60 60)' }),
              ),
              h('div', { className: 'viz-side-gauge-center' },
                h('div', { className: 'viz-side-gauge-value' }, score + '%'),
                h('div', { className: 'viz-side-gauge-label' }, 'Health'),
                h('div', { className: 'viz-side-gauge-caption' }, 'composite'),
              ),
            ),
          ),
          h('section', { className: 'viz-side-section' },
            h('h3', { className: 'viz-side-section-title' }, 'Workflow progress'),
            h('ol', { className: 'viz-side-workflow' },
              ['Design basis', 'Pipeline', 'Groundbed', 'TR', 'Validation', 'Approval'].map((s, i) =>
                h('li', { key: s, className: 'viz-side-workflow-step is-' + (i < 4 ? 'ok' : 'pending') },
                  h('span', { className: 'viz-side-workflow-bullet' }),
                  h('span', { className: 'viz-side-workflow-label' }, s),
                )
              ),
            ),
          ),
          h('section', { className: 'viz-side-section' },
            h('h3', { className: 'viz-side-section-title' }, 'Station summary'),
            h('ul', { className: 'viz-side-status-list' },
              h('li', { key: 'total', className: 'viz-side-status-row' }, h('span', { className: 'viz-side-status-icon' }, '●'), h('span', { className: 'viz-side-status-text' }, 'Total stations'), h('span', { className: 'viz-side-status-hint' }, stations.length)),
              h('li', { key: 'calc', className: 'viz-side-status-row' }, h('span', { className: 'viz-side-status-icon' }, '●'), h('span', { className: 'viz-side-status-text' }, 'Calculated'), h('span', { className: 'viz-side-status-hint' }, calculated)),
              h('li', { key: 'app', className: 'viz-side-status-row' }, h('span', { className: 'viz-side-status-icon' }, '●'), h('span', { className: 'viz-side-status-text' }, 'Approved'), h('span', { className: 'viz-side-status-hint' }, approved)),
            ),
          ),
          h('section', { className: 'viz-side-section' },
            h('h3', { className: 'viz-side-section-title' }, 'Quick metrics'),
            h('div', { className: 'viz-side-kpi-grid', style: { '--kpi-min': '90px' } },
              h('div', { className: 'viz-side-kpi is-sm' }, h('div', { className: 'viz-side-kpi-label' }, 'Groundbeds'), h('div', { className: 'viz-side-kpi-value' }, h('span', { className: 'viz-side-kpi-num' }, stations.filter((s) => s.groundbed).length), h('span', { className: 'viz-side-kpi-unit' }, ''))),
              h('div', { className: 'viz-side-kpi is-sm' }, h('div', { className: 'viz-side-kpi-label' }, 'TR units'), h('div', { className: 'viz-side-kpi-value' }, h('span', { className: 'viz-side-kpi-num' }, stations.filter((s) => s.tr).length))),
              h('div', { className: 'viz-side-kpi is-sm' }, h('div', { className: 'viz-side-kpi-label' }, 'Pipeline (km)'), h('div', { className: 'viz-side-kpi-value' }, h('span', { className: 'viz-side-kpi-num' }, (stations.reduce((a, s) => a + (s.pipelineSegments || []).reduce((a, seg) => a + seg.lengthM, 0), 0) / 1000).toFixed(1)), h('span', { className: 'viz-side-kpi-unit' }, 'km'))),
            ),
          ),
          h('section', { className: 'viz-side-section' },
            h('h3', { className: 'viz-side-section-title' }, 'Approval status'),
            h('ul', { className: 'viz-side-status-list' },
              h('li', { key: 'ap', className: 'viz-side-status-row is-ok' }, h('span', null, '✓'), h('span', { className: 'viz-side-status-text' }, approved + ' / ' + stations.length + ' approved')),
              h('li', { key: 're', className: 'viz-side-status-row is-pending' }, h('span', null, '○'), h('span', { className: 'viz-side-status-text' }, inReview + ' in review')),
            ),
          ),
        ),
      ),
    ),
  )
}

function PipelineOverviewMini({ stations }) {
  // Simplified horizontal pipeline overview
  const W = 1200, H = 100
  const segments = stations.flatMap((s) => s.pipelineSegments || [])
  const totalLen = segments.reduce((a, s) => a + s.lengthM, 0) || 1
  const xScale = (x) => 50 + (x / totalLen) * (W - 100)
  return h('svg', { viewBox: '0 0 ' + W + ' ' + H, style: { width: '100%', height: 100, display: 'block' } },
    h('line', { x1: 20, y1: H / 2, x2: W - 20, y2: H / 2, stroke: '#3f6212', strokeWidth: 4 }),
    stations.map((s, i) => {
      const offset = segments.slice(0, i).reduce((a, seg) => a + seg.lengthM, 0)
      return h('g', { key: s.id },
        h('circle', { cx: xScale(offset), cy: H / 2, r: 8, fill: '#a855f7', stroke: '#6b21a8', strokeWidth: 2 }),
        h('text', { x: xScale(offset), y: H / 2 - 14, textAnchor: 'middle', fontSize: 10, fill: 'currentColor' }, s.name),
      )
    }),
  )
}

function CablePanel({ station }) {
  // Simplified cable panel showing the new layout: viz on top, KPIs/diagnostics below
  const r = station.lastCalcResult
  if (!r) return h('div', null, 'No calculation result for this station')
  const cableI = station.tr.ratedCurrent
  const cableV = station.tr.ratedVoltage
  return h('div', null,
    h('div', { className: 'demo-section-title' }, 'PRIORITY 3 — CABLE RESISTANCE v2 (VIZ DOMINANT)'),
    h('p', { style: { color: '#a1a1aa', fontSize: 12, marginBottom: 12 } },
      'LEFT: Inputs + Results (form sections). RIGHT: Top — Cable network visualization (dominant, min 460 px tall). Bottom — compact KPIs + diagnostics.'
    ),
    h('div', { style: { display: 'grid', gridTemplateColumns: '7fr 3fr', gap: 12 } },
      // LEFT — form placeholder
      h('div', null,
        h('section', { className: 'cable-viz-section' },
          h('h3', { style: { fontSize: 13, color: '#fafafa', margin: '0 0 8px' } }, 'LEFT 70% — Inputs + Results'),
          h('div', { style: { fontSize: 11, color: '#71717a' } },
            '• Anode Tail Cables — size ' + station.cables.anodeCableSizeMm2 + ' mm², ' + station.cables.anodeTailLengths.length + ' anodes',
            h('br'),
            '• Positive Main — ' + station.cables.posMainLengthM + ' m × ' + station.cables.posMainSizeMm2 + ' mm²',
            h('br'),
            '• Negative Main — ' + station.cables.negMainLengthM + ' m × ' + station.cables.negMainSizeMm2 + ' mm²',
            h('br'),
            '• Negative Secondary — ' + station.cables.negSecLengthM + ' m × ' + station.cables.negSecSizeMm2 + ' mm²',
            h('br'),
            h('strong', { style: { color: '#10b981' } }, 'R_c = ' + r.totalCableResOhm.toFixed(4) + ' Ω'),
          ),
        ),
      ),
      // RIGHT — viz on top, KPIs below
      h('div', null,
        h('div', { className: 'viz-side-aside-sticky', style: { position: 'static' } },
          h('div', { className: 'viz-side-widgets' },
            h('section', { className: 'viz-side-section' },
              h('h3', { className: 'viz-side-section-title' }, 'Cable network visualization (TOP)'),
              h('div', { className: 'viz-side-viz-host viz-side-viz-host--dominant' },
                CableNetworkMini({ station }),
              ),
            ),
            h('hr', { className: 'viz-side-divider' }),
            h('section', { className: 'viz-side-section' },
              h('h3', { className: 'viz-side-section-title' }, 'KPIs (BOTTOM)'),
              h('div', { className: 'viz-side-kpi-grid', style: { '--kpi-min': '90px' } },
                h('div', { className: 'viz-side-kpi is-sm is-neutral' }, h('div', { className: 'viz-side-kpi-label' }, 'R_T'), h('div', { className: 'viz-side-kpi-value' }, h('span', { className: 'viz-side-kpi-num' }, r.totalCircuitResistanceOhm.toFixed(3)), h('span', { className: 'viz-side-kpi-unit' }, 'Ω'))),
                h('div', { className: 'viz-side-kpi is-sm is-neutral' }, h('div', { className: 'viz-side-kpi-label' }, 'R_c'), h('div', { className: 'viz-side-kpi-value' }, h('span', { className: 'viz-side-kpi-num' }, r.totalCableResOhm.toFixed(4)), h('span', { className: 'viz-side-kpi-unit' }, 'Ω'))),
                h('div', { className: 'viz-side-kpi is-sm is-fail' }, h('div', { className: 'viz-side-kpi-label' }, 'V drop'), h('div', { className: 'viz-side-kpi-value' }, h('span', { className: 'viz-side-kpi-num' }, (r.totalCableResOhm * cableI).toFixed(2)), h('span', { className: 'viz-side-kpi-unit' }, 'V'))),
                h('div', { className: 'viz-side-kpi is-sm is-warn' }, h('div', { className: 'viz-side-kpi-label' }, 'Margin'), h('div', { className: 'viz-side-kpi-value' }, h('span', { className: 'viz-side-kpi-num' }, ((r.minTRVoltage / cableV) * 100).toFixed(1)), h('span', { className: 'viz-side-kpi-unit' }, '%'))),
              ),
            ),
          ),
        ),
      ),
    ),
  )
}

function CableNetworkMini({ station }) {
  // Simplified cable network diagram
  const r = station.lastCalcResult
  const cableI = station.tr.ratedCurrent
  return h('svg', { viewBox: '0 0 1000 460', style: { width: '100%', height: 'auto' } },
    // Background
    h('rect', { x: 0, y: 0, width: 1000, height: 460, fill: 'rgba(24, 24, 27, 0.5)' }),
    // TR
    h('rect', { x: 80, y: 100, width: 120, height: 100, fill: '#18181b', stroke: '#52525b', strokeWidth: 1.5, rx: 6 }),
    h('text', { x: 140, y: 145, textAnchor: 'middle', fontSize: 12, fontWeight: 700, fill: 'currentColor' }, 'TR'),
    h('text', { x: 140, y: 162, textAnchor: 'middle', fontSize: 9, fill: 'currentColor', opacity: 0.7 }, 'Transformer'),
    h('circle', { cx: 105, cy: 190, r: 5, fill: '#ef4444' }),
    h('text', { x: 105, y: 194, textAnchor: 'middle', fontSize: 8, fontWeight: 700, fill: '#fafafa' }, '+'),
    h('circle', { cx: 175, cy: 190, r: 5, fill: '#3b82f6' }),
    h('text', { x: 175, y: 194, textAnchor: 'middle', fontSize: 8, fontWeight: 700, fill: '#fafafa' }, '−'),
    // Groundbed
    h('rect', { x: 730, y: 100, width: 180, height: 100, fill: '#18181b', stroke: '#52525b', strokeWidth: 1.5, rx: 6 }),
    h('text', { x: 820, y: 130, textAnchor: 'middle', fontSize: 12, fontWeight: 700, fill: 'currentColor' }, 'GROUNDBED'),
    h('text', { x: 820, y: 145, textAnchor: 'middle', fontSize: 9, fill: 'currentColor', opacity: 0.65 }, station.proposedAnodes + ' deep well anodes'),
    [1,2,3,4,5,6].map((i) => h('rect', { key: i, x: 740 + i * 22, y: 160, width: 10, height: 22, fill: '#a855f7', stroke: '#6b21a8', strokeWidth: 1, rx: 1 })),
    // Pipeline
    h('rect', { x: 240, y: 320, width: 440, height: 36, fill: '#18181b', stroke: '#52525b', strokeWidth: 1.5, rx: 4 }),
    h('text', { x: 460, y: 305, textAnchor: 'middle', fontSize: 12, fontWeight: 700, fill: 'currentColor' }, 'PIPELINE (cathode)'),
    [0,1,2,3,4,5,6,7,8,9,10].map((i) => h('line', { key: i, x1: 250 + i * 42, y1: 320, x2: 250 + i * 42, y2: 356, stroke: '#52525b', strokeOpacity: 0.4 })),
    // +cable
    h('line', { x1: 200, y1: 150, x2: 730, y2: 150, stroke: '#10b981', strokeWidth: 6, strokeLinecap: 'round' }),
    h('rect', { x: 380, y: 100, width: 130, height: 36, fill: '#18181b', stroke: '#10b981', rx: 4 }),
    h('text', { x: 445, y: 118, textAnchor: 'middle', fontSize: 10, fontWeight: 600, fill: 'currentColor' }, '+cable'),
    h('text', { x: 445, y: 132, textAnchor: 'middle', fontSize: 9, fontFamily: 'monospace', fill: 'currentColor', opacity: 0.85 }, (r.posMainCableResOhm * cableI * 1000).toFixed(0) + ' mV drop'),
    // Earth return
    h('path', { d: 'M 820 200 C 840 280, 720 280, 680 338', fill: 'none', stroke: 'currentColor', strokeOpacity: 0.18, strokeWidth: 12, strokeLinecap: 'round' }),
    h('line', { x1: 820, y1: 200, x2: 680, y2: 338, stroke: '#71717a', strokeWidth: 5, strokeLinecap: 'round', strokeDasharray: '8 4' }),
    h('rect', { x: 690, y: 245, width: 120, height: 36, fill: '#18181b', stroke: '#71717a', rx: 4 }),
    h('text', { x: 750, y: 263, textAnchor: 'middle', fontSize: 10, fontWeight: 600, fill: 'currentColor' }, 'earth (R_G)'),
    h('text', { x: 750, y: 277, textAnchor: 'middle', fontSize: 9, fontFamily: 'monospace', fill: 'currentColor', opacity: 0.85 }, (r.groundbedResistanceOhm * 1000).toFixed(0) + ' mΩ'),
    // -cable (L-shape)
    h('line', { x1: 140, y1: 200, x2: 140, y2: 380, stroke: '#f59e0b', strokeWidth: 5, strokeLinecap: 'round' }),
    h('line', { x1: 140, y1: 380, x2: 240, y2: 380, stroke: '#f59e0b', strokeWidth: 5, strokeLinecap: 'round' }),
    h('rect', { x: 90, y: 280, width: 100, height: 36, fill: '#18181b', stroke: '#f59e0b', rx: 4 }),
    h('text', { x: 140, y: 298, textAnchor: 'middle', fontSize: 10, fontWeight: 600, fill: 'currentColor' }, '−cable'),
    h('text', { x: 140, y: 312, textAnchor: 'middle', fontSize: 9, fontFamily: 'monospace', fill: 'currentColor', opacity: 0.85 }, (r.negMainCableResOhm * cableI * 1000).toFixed(0) + ' mV drop'),
  )
}

createRoot(document.getElementById('root')).render(h(StrictMode, null, h(App)))
`

writeFileSync(join(OUT, 'demo-entry.jsx'), entrySrc)
writeFileSync(join(OUT, 'index.html'), `<!doctype html><html lang="en" class="dark"><head><meta charset="utf-8" /><title>Architecture Optimization Demo</title><style>.demo-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#3b82f6;margin-bottom:8px;}</style></head><body><div id="root"></div><script type="module" src="./demo-entry.js"></script></body></html>`)

console.log('bundling...')
const buildResult = await build({
  entryPoints: [join(OUT, 'demo-entry.jsx')],
  bundle: true,
  outfile: join(OUT, 'demo-entry.js'),
  format: 'esm',
  jsx: 'automatic',
  loader: { '.js': 'jsx', '.jsx': 'jsx', '.css': 'css' },
  define: { 'process.env.NODE_ENV': '"development"' },
  logLevel: 'error',
})
console.log('bundled', buildResult.errors?.length || 0, 'errors')

const PORT = Number(process.env.PORT || 4179)
const server = http.createServer((req, res) => {
  let p = req.url === '/' ? '/index.html' : req.url.split('?')[0]
  const file = join(OUT, p)
  if (!readFileSync) { res.statusCode = 404; res.end('nf'); return }
  try {
    const content = readFileSync(file)
    const ext = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/plain'
    res.setHeader('Content-Type', ext)
    res.setHeader('Cache-Control', 'no-store')
    res.end(content)
  } catch (_) {
    res.statusCode = 404
    res.end('nf')
  }
})
server.listen(PORT, '127.0.0.1', () => {
  console.log(`READY http://127.0.0.1:${PORT}`)
})
