#!/usr/bin/env node
import { build } from 'esbuild'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'demo-out')
mkdirSync(OUT, { recursive: true })

const entrySrc = `
import { createRoot } from 'react-dom/client'
import { createElement as h, StrictMode } from 'react'
import { GroundbedVisualizer } from '../src/visualizations/GroundbedVisualizer.jsx'
import { CableNetworkVisualizer } from '../src/visualizations/CableNetworkVisualizer.jsx'
import {
  RightSideEngineeringPanel,
  GroundbedWidgets,
  CableWidgets,
  PipelineWidgets,
  SoilResistivitySection,
} from '../src/visualizations/sidePanel/index.js'
import '../src/index.css'

// ─── Groundbed fixtures (C2) ─────────────────────────────────────────────────
const gbHorizontal = {
  name: 'Station 1',
  proposedAnodes: 6,
  anodeSpec: { id: 'hi-silicon', label: 'High-silicon cast iron', weightKg: 30, consumptionRate: 0.5, type: 'Impressed' },
  groundbed: { type: 'distributed', startDepthM: 1.5, anodeLengthM: 1.2, anodeSpacingM: 4.0, boreholeDiaM: 0.3 },
  lastCalcResult: { groundbedResistanceOhm: 0.42, maxAllowableGroundbedRes: 0.55, designLifeYears: 28.4, targetDesignLifeYears: 25, activeLengthM: 1.2 },
}
const gbDeepwell = {
  name: 'Station 2',
  proposedAnodes: 8,
  anodeSpec: { id: 'mmo', label: 'MMO tubular', weightKg: 12, consumptionRate: 0.02, type: 'Impressed' },
  groundbed: { type: 'deepwell', startDepthM: 25, anodeLengthM: 1.5, anodeSpacingM: 3.0, boreholeDiaM: 0.35, cokeCoverM: 5, cementPlugM: 2 },
  lastCalcResult: { groundbedResistanceOhm: 0.18, maxAllowableGroundbedRes: 0.5, designLifeYears: 32.0, targetDesignLifeYears: 25, activeLengthM: 22.5, totalDrillDepthM: 54.5 },
}
const gbShallow = {
  name: 'Station 3',
  proposedAnodes: 4,
  anodeSpec: { id: 'graphite', label: 'Graphite', weightKg: 18, consumptionRate: 0.4, type: 'Impressed' },
  groundbed: { type: 'shallow_vertical', startDepthM: 4, anodeLengthM: 3, anodeSpacingM: 6, boreholeDiaM: 0.3 },
  lastCalcResult: { groundbedResistanceOhm: 0.95, maxAllowableGroundbedRes: 0.8, designLifeYears: 20.1, targetDesignLifeYears: 25, activeLengthM: 39 },
}

// ─── Cable network fixtures (C3) ─────────────────────────────────────────────
function makeCableStation(overrides = {}) {
  return {
    name: 'Cable Demo Station',
    proposedAnodes: overrides.proposedAnodes ?? 6,
    soilResistivityOhmCm: 5000,
    anodeSpec: { id: 'mmo', label: 'MMO tubular', weightKg: 12, consumptionRate: 0.02, type: 'Impressed' },
    groundbed: { type: 'deepwell', startDepthM: 25, anodeLengthM: 1.5, anodeSpacingM: 3.0, boreholeDiaM: 0.35, cokeCoverM: 5, cementPlugM: 2 },
    tr: { ratedVoltage: 50, ratedCurrent: 20 },
    cables: {
      anodeCableSizeMm2: 16,
      anodeTailLengths: [5, 5, 5, 5, 5, 5],
      posMainLengthM: 80,
      posMainSizeMm2: 35,
      negMainLengthM: 60,
      negMainSizeMm2: 35,
      negSecLengthM: 20,
      negSecSizeMm2: 16,
    },
    lastCalcResult: {
      anodeTailParallelResOhm: 0.05,
      posMainCableResOhm: 0.042,
      negMainCableResOhm: 0.038,
      totalCableResOhm: 0.13,
      groundbedResistanceOhm: 0.42,
      maxAllowableGroundbedRes: 0.8,
      totalCircuitResistanceOhm: 0.95,
      minTRVoltage: 19.0,
    },
    ...overrides,
  }
}

const cableOk = makeCableStation({ name: 'Cable Network — all within limits' })
const cableWarn = makeCableStation({
  name: 'Cable Network — one cable in warn',
  cables: { anodeCableSizeMm2: 10, anodeTailLengths: [10, 10, 10, 10, 10, 10], posMainLengthM: 250, posMainSizeMm2: 16, negMainLengthM: 60, negMainSizeMm2: 35, negSecLengthM: 20, negSecSizeMm2: 16 },
  lastCalcResult: { ...makeCableStation().lastCalcResult, posMainCableResOhm: 0.18, totalCableResOhm: 0.27, totalCircuitResistanceOhm: 1.12, minTRVoltage: 22.4 },
})
const cableFail = makeCableStation({
  name: 'Cable Network — exceeds limits',
  tr: { ratedVoltage: 24, ratedCurrent: 30 },
  cables: { anodeCableSizeMm2: 10, anodeTailLengths: [12, 12, 12, 12, 12, 12], posMainLengthM: 500, posMainSizeMm2: 10, negMainLengthM: 200, negMainSizeMm2: 10, negSecLengthM: 50, negSecSizeMm2: 10 },
  lastCalcResult: { ...makeCableStation().lastCalcResult, anodeTailParallelResOhm: 0.21, posMainCableResOhm: 0.84, negMainCableResOhm: 0.46, totalCableResOhm: 1.51, groundbedResistanceOhm: 1.2, totalCircuitResistanceOhm: 2.85, minTRVoltage: 85.5 },
})

// ─── Project fixture (C4) ────────────────────────────────────────────────────
const demoProject = {
  id: 'demo',
  projectName: 'Sample Pipeline Project',
  projectNumber: 'P-2026-001',
  status: 'calculated',
  stations: [
    {
      id: 's1', name: 'Station 1', status: 'approved',
      proposedAnodes: 6, anodeSpec: gbDeepwell.anodeSpec,
      groundbed: { type: 'deepwell', startDepthM: 25, anodeLengthM: 1.5, anodeSpacingM: 3, boreholeDiaM: 0.35, cokeCoverM: 5, cementPlugM: 2 },
      tr: { ratedVoltage: 50, ratedCurrent: 20 },
      cables: gbDeepwell.cables || { anodeCableSizeMm2: 16, anodeTailLengths: [5,5,5,5,5,5], posMainLengthM: 80, posMainSizeMm2: 35, negMainLengthM: 60, negMainSizeMm2: 35, negSecLengthM: 20, negSecSizeMm2: 16 },
      soilResistivityOhmCm: 5000,
      pipelineSegments: [{ lengthM: 1200 }, { lengthM: 800 }, { lengthM: 1500 }],
      validationErrors: [],
      insights: [],
      lastCalcResult: { ...gbDeepwell.lastCalcResult, calculatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    },
    {
      id: 's2', name: 'Station 2', status: 'engineering_review',
      proposedAnodes: 4, anodeSpec: gbShallow.anodeSpec,
      groundbed: gbShallow.groundbed,
      tr: { ratedVoltage: 30, ratedCurrent: 12 },
      cables: { anodeCableSizeMm2: 16, anodeTailLengths: [4,4,4,4], posMainLengthM: 150, posMainSizeMm2: 25, negMainLengthM: 100, negMainSizeMm2: 25, negSecLengthM: 30, negSecSizeMm2: 16 },
      soilResistivityOhmCm: 8000,
      pipelineSegments: [{ lengthM: 600 }, { lengthM: 900 }],
      validationErrors: [],
      insights: [],
      lastCalcResult: { ...gbShallow.lastCalcResult, calculatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    },
    {
      id: 's3', name: 'Station 3', status: 'draft',
      proposedAnodes: 8, anodeSpec: gbHorizontal.anodeSpec,
      groundbed: gbHorizontal.groundbed,
      tr: { ratedVoltage: 40, ratedCurrent: 15 },
      cables: { anodeCableSizeMm2: 16, anodeTailLengths: [3,3,3,3,3,3,3,3], posMainLengthM: 60, posMainSizeMm2: 35, negMainLengthM: 50, negMainSizeMm2: 35, negSecLengthM: 0, negSecSizeMm2: 35 },
      soilResistivityOhmCm: 3000,
      pipelineSegments: [{ lengthM: 700 }, { lengthM: 1100 }, { lengthM: 600 }],
      validationErrors: [],
      insights: [],
      lastCalcResult: null,
    },
  ],
}

function App() {
  return h('div', { style: { padding: 24, background: '#09090b', minHeight: '100vh' } },
    h('h1', { style: { color: '#fafafa', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 18, marginBottom: 8 } }, 'Phase C Visualizations — C2 + C3 + C4 Side Panel'),
    h('h2', { style: { color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, marginTop: 24, marginBottom: 8 } }, 'C2 — GroundbedVisualizer: horizontal (distributed) — 6 anodes, within limits'),
    h(GroundbedVisualizer, { station: gbHorizontal }),
    h('h2', { style: { color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, marginTop: 24, marginBottom: 8 } }, 'C2 — GroundbedVisualizer: vertical deep well — 8 anodes, within limits'),
    h(GroundbedVisualizer, { station: gbDeepwell }),
    h('h2', { style: { color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, marginTop: 24, marginBottom: 8 } }, 'C2 — GroundbedVisualizer: shallow vertical — 4 anodes, exceeds limits (warn)'),
    h(GroundbedVisualizer, { station: gbShallow }),
    h('h2', { style: { color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, marginTop: 32, marginBottom: 8 } }, 'C3 — CableNetworkVisualizer: all cables within limits'),
    h(CableNetworkVisualizer, { station: cableOk }),
    h('h2', { style: { color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, marginTop: 24, marginBottom: 8 } }, 'C3 — CableNetworkVisualizer: one cable in warn (5–10 %)'),
    h(CableNetworkVisualizer, { station: cableWarn }),
    h('h2', { style: { color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, marginTop: 24, marginBottom: 8 } }, 'C3 — CableNetworkVisualizer: multiple cables exceed limits'),
    h(CableNetworkVisualizer, { station: cableFail }),
    h('h2', { style: { color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, marginTop: 32, marginBottom: 8 } }, 'C4 — RightSideEngineeringPanel: Groundbed Intelligence (deep well, OK)'),
    h(RightSideEngineeringPanel, { panelTitle: 'Groundbed Intelligence', panel: h('div', { className: 'viz-side-widgets' },
      h('section', { className: 'viz-side-section' },
        h('h3', { className: 'viz-side-section-title' }, 'Groundbed schematic'),
        h('div', { className: 'viz-side-viz-host' }, h(GroundbedVisualizer, { station: gbDeepwell })),
      ),
      h('hr', { className: 'viz-side-divider' }),
      h(GroundbedWidgets, { station: gbDeepwell, project: demoProject }),
    ) },
      h('div', { className: 'viz-soil-resistivity', style: { marginTop: 16 } },
        h(SoilResistivitySection, {
          designResistivityOhmCm: demoProject.stations[0].soilResistivityOhmCm,
          source: 'Central design settings',
          standard: 'NACE / IEEE',
        }),
      ),
    ),
    h('h2', { style: { color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, marginTop: 24, marginBottom: 8 } }, 'C4 — RightSideEngineeringPanel: Cable Intelligence (all OK)'),
    h(RightSideEngineeringPanel, { panelTitle: 'Cable Intelligence', panel: h('div', { className: 'viz-side-widgets' },
      h('section', { className: 'viz-side-section' },
        h('h3', { className: 'viz-side-section-title' }, 'Cable network schematic'),
        h('div', { className: 'viz-side-viz-host' }, h(CableNetworkVisualizer, { station: cableOk })),
      ),
      h('hr', { className: 'viz-side-divider' }),
      h(CableWidgets, { station: cableOk }),
    ) },
      h('div', null),
    ),
    h('h2', { style: { color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, marginTop: 24, marginBottom: 8 } }, 'C4 — RightSideEngineeringPanel: Cable Intelligence (one cable in warn)'),
    h(RightSideEngineeringPanel, { panelTitle: 'Cable Intelligence', panel: h(CableWidgets, { station: cableWarn }) },
      h('div', { style: { padding: 24, background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif' } },
        h('h3', { style: { margin: '0 0 8px', fontSize: 13 } }, 'Cable network schematic (placeholder)'),
        h('p', { style: { margin: 0, fontSize: 12, color: '#71717a' } }, 'See CableNetworkVisualizer sections above for the actual schematic.'),
      ),
    ),
    h('h2', { style: { color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, marginTop: 24, marginBottom: 8 } }, 'C4 — RightSideEngineeringPanel: Project Intelligence (3 stations)'),
    h(RightSideEngineeringPanel, { panelTitle: 'Project Intelligence', panel: h(PipelineWidgets, { project: demoProject }) },
      h('div', { style: { padding: 24, background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif' } },
        h('h3', { style: { margin: '0 0 8px', fontSize: 13 } }, 'Pipeline overview (placeholder)'),
        h('p', { style: { margin: 0, fontSize: 12, color: '#71717a' } }, 'See PageDashboard for the actual integration with the active project.'),
      ),
    ),
  )
}

createRoot(document.getElementById('root')).render(h(StrictMode, null, h(App)))
`

writeFileSync(join(OUT, 'demo-entry.jsx'), entrySrc)
writeFileSync(join(OUT, 'index.html'), `<!doctype html><html lang="en" class="dark"><head><meta charset="utf-8" /><title>Phase C viz demo</title></head><body><div id="root"></div><script type="module" src="./demo-entry.js"></script></body></html>`)

await build({
  entryPoints: [join(OUT, 'demo-entry.jsx')],
  bundle: true,
  outfile: join(OUT, 'demo-entry.js'),
  format: 'esm',
  jsx: 'automatic',
  loader: { '.js': 'jsx', '.jsx': 'jsx', '.css': 'css' },
  define: { 'process.env.NODE_ENV': '"development"' },
  logLevel: 'error',
})

const PORT = Number(process.env.PORT || 4178)
const server = http.createServer((req, res) => {
  let p = req.url === '/' ? '/index.html' : req.url.split('?')[0]
  const file = join(OUT, p)
  if (!existsSync(file)) { res.statusCode = 404; res.end('nf'); return }
  const ext = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/plain'
  res.setHeader('Content-Type', ext)
  res.setHeader('Cache-Control', 'no-store')
  res.end(readFileSync(file))
})
server.listen(PORT, '127.0.0.1', () => {
  console.log(`READY http://127.0.0.1:${PORT}`)
})
