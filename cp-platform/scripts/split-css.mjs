import fs from 'fs'
import path from 'path'

const srcDir = '/home/rworld_pop/projects/raxa/cp-platform/src'
const stylesDir = path.join(srcDir, 'styles')
const indexPath = path.join(srcDir, 'index.css')

// Ensure styles directory exists
if (!fs.existsSync(stylesDir)) {
  fs.mkdirSync(stylesDir, { recursive: true })
}

// Read index.css
const content = fs.readFileSync(indexPath, 'utf8')
const lines = content.split('\n')

// Define ranges (1-indexed, inclusive)
const files = [
  {
    name: 'tokens.css',
    ranges: [
      [1, 136]
    ]
  },
  {
    name: 'reset.css',
    ranges: [
      [137, 185]
    ]
  },
  {
    name: 'layout.css',
    ranges: [
      [186, 629],
      [2113, 2296]
    ]
  },
  {
    name: 'forms.css',
    ranges: [
      [630, 812]
    ]
  },
  {
    name: 'components.css',
    ranges: [
      [813, 1744],
      [1745, 1841], // Error boundary & validation banner
      [1842, 1879]  // Standard badge
    ]
  },
  {
    name: 'auth.css',
    ranges: [
      [1880, 2093] // Auth loading, login
    ]
  },
  {
    name: 'dashboard.css',
    ranges: [
      [2094, 2112], // Import loading (fits under dashboard/workspace transitions)
      [2297, 2620], // Dashboard, workspace portal
      [4239, 4449], // Dashboard v2
      [7063, 7327]  // Dashboard 3.0
    ]
  },
  {
    name: 'animations.css',
    ranges: [
      [2621, 2665] // Motion Design System
    ]
  },
  {
    name: 'visualization.css',
    ranges: [
      [2666, 4075] // Visualizations, Groundbed, CableNetwork, RightSidePanel
    ]
  },
  {
    name: 'engineering.css',
    ranges: [
      [4076, 4238], // Soil resistivity
      [4450, 7062]  // Cable resistance page v2
    ]
  }
]

// Extract and write files
files.forEach((file) => {
  let fileContent = `/* ${file.name.toUpperCase()} */\n`
  file.ranges.forEach(([start, end]) => {
    // 1-indexed to 0-indexed slicing
    const chunk = lines.slice(start - 1, end).join('\n')
    fileContent += chunk + '\n\n'
  })
  
  const destPath = path.join(stylesDir, file.name)
  fs.writeFileSync(destPath, fileContent, 'utf8')
  console.log(`Wrote ${file.name} (${fs.statSync(destPath).size} bytes)`)
})

// Write index.css aggregator
const aggregator = files.map(f => `@import "./styles/${f.name}";`).join('\n') + '\n'
fs.writeFileSync(indexPath, aggregator, 'utf8')
console.log('Rewrote index.css aggregator')
