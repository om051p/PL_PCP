/**
 * Standalone demo bundler for the GroundbedVisualizer.
 *
 * Builds a tiny React entry that mounts the visualization with synthetic
 * engineering data, writes the HTML+JS to ./demo-out/, and starts a local
 * HTTP server so Playwright can capture screenshots without touching the
 * protected app shell.
 *
 * Run with:  node scripts/groundbed-demo-bundle.mjs
 */
import { build } from 'esbuild'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'demo-out')
mkdirSync(OUT, { recursive: true })

const ENTRY = join(OUT, 'demo-entry.jsx')
const HTML = join(OUT, 'index.html')

const entrySrc = `
import { createRoot } from 'react-dom/client'
import { createElement as h, StrictMode } from 'react'
import { GroundbedVisualizer } from '../src/visualizations/GroundbedVisualizer.jsx'
import '../src/index.css'

const horizontal = {
  name: 'Station 1',
  proposedAnodes: 6,
  anodeSpec: { id: 'hi-silicon', label: 'High-silicon cast iron', weightKg: 30, consumptionRate: 0.5, type: 'Impressed' },
  groundbed: {
    type: 'distributed',
    startDepthM: 1.5,
    anodeLengthM: 1.2,
    anodeSpacingM: 4.0,
    boreholeDiaM: 0.3,
  },
  lastCalcResult: {
    groundbedResistanceOhm: 0.42,
    maxAllowableGroundbedRes: 0.55,
    designLifeYears: 28.4,
    targetDesignLifeYears: 25,
    activeLengthM: 1.2,
  },
}

const deepwell = {
  name: 'Station 2',
  proposedAnodes: 8,
  anodeSpec: { id: 'mmo', label: 'MMO tubular', weightKg: 12, consumptionRate: 0.02, type: 'Impressed' },
  groundbed: {
    type: 'deepwell',
    startDepthM: 25,
    anodeLengthM: 1.5,
    anodeSpacingM: 3.0,
    boreholeDiaM: 0.35,
    cokeCoverM: 5,
    cementPlugM: 2,
  },
  lastCalcResult: {
    groundbedResistanceOhm: 0.18,
    maxAllowableGroundbedRes: 0.5,
    designLifeYears: 32.0,
    targetDesignLifeYears: 25,
    activeLengthM: 22.5,
    totalDrillDepthM: 54.5,
  },
}

const shallow = {
  name: 'Station 3',
  proposedAnodes: 4,
  anodeSpec: { id: 'graphite', label: 'Graphite', weightKg: 18, consumptionRate: 0.4, type: 'Impressed' },
  groundbed: {
    type: 'shallow_vertical',
    startDepthM: 4,
    anodeLengthM: 3,
    anodeSpacingM: 6,
    boreholeDiaM: 0.3,
  },
  lastCalcResult: {
    groundbedResistanceOhm: 0.95,
    maxAllowableGroundbedRes: 0.8,
    designLifeYears: 20.1,
    targetDesignLifeYears: 25,
    activeLengthM: 39,
  },
}

function App() {
  return h(
    'div',
    { style: { padding: 24, background: '#09090b', minHeight: '100vh' } },
    h('h1', { style: { color: '#fafafa', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 18, marginBottom: 8 } }, 'GroundbedVisualizer — C2 demos'),
    h('h2', { style: { color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, marginTop: 24, marginBottom: 8 } }, 'Horizontal (distributed) — 6 anodes, within limits'),
    h(GroundbedVisualizer, { station: horizontal }),
    h('h2', { style: { color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, marginTop: 24, marginBottom: 8 } }, 'Vertical deep well — 8 anodes, within limits'),
    h(GroundbedVisualizer, { station: deepwell }),
    h('h2', { style: { color: '#d4d4d8', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, marginTop: 24, marginBottom: 8 } }, 'Shallow vertical — 4 anodes, exceeds limits (warn)'),
    h(GroundbedVisualizer, { station: shallow }),
  )
}

createRoot(document.getElementById('root')).render(h(StrictMode, null, h(App)))
`

writeFileSync(ENTRY, entrySrc)

const html = `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>GroundbedVisualizer — C2 demo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./demo-entry.js"></script>
  </body>
</html>
`
writeFileSync(HTML, html)

await build({
  entryPoints: [ENTRY],
  bundle: true,
  outfile: join(OUT, 'demo-entry.js'),
  format: 'esm',
  jsx: 'automatic',
  loader: { '.js': 'jsx', '.jsx': 'jsx', '.css': 'css' },
  alias: {
    'react': 'react',
    'react-dom': 'react-dom',
    'react-dom/client': 'react-dom/client',
    'react/jsx-runtime': 'react/jsx-runtime',
    'react-router-dom': 'react-router-dom',
    'lucide-react': 'lucide-react',
    'framer-motion': 'framer-motion',
    'zustand': 'zustand',
    'zustand/shallow': 'zustand/shallow',
    'immer': 'immer',
    'decimal.js': 'decimal.js',
    'mathjs': 'mathjs',
    'date-fns': 'date-fns',
    'firebase/app': 'firebase/app',
    'firebase/auth': 'firebase/auth',
    'firebase/firestore': 'firebase/firestore',
  },
  define: { 'process.env.NODE_ENV': '"development"' },
  external: [],
  logLevel: 'info',
})

const PORT = 4178
const server = http.createServer((req, res) => {
  let p = req.url === '/' ? '/index.html' : req.url
  const file = join(OUT, p)
  if (!existsSync(file)) {
    res.statusCode = 404
    res.end('not found')
    return
  }
  const ext = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'application/javascript' : 'text/plain'
  res.setHeader('Content-Type', ext)
  res.end(require('node:fs').readFileSync(file))
})
server.listen(PORT, () => {
  console.log(`demo server listening on http://localhost:${PORT}`)
})
