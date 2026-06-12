import { getGoldenDatasets } from './verificationFramework.js'
import { runStationCalculations } from '../engine/modules/calculations.js'

const datasets = getGoldenDatasets()

console.log('# Real-World Validation Report — RAXA Platform\n')
console.log('This report compares RAXA\'s engineering calculation engine outputs against reference values from standard Excel design sheets (`PCP.xlsx`), hand calculations, and previously issued design packages. The validation checks enforce a strict maximum variance threshold of **≤ 0.5%**.\n')

const targetDatasets = [
  { key: 'dataset1', title: 'Project A: Deepwell ICCP (Ref: Dataset 1)' },
  { key: 'dataset4', title: 'Project B: Shallow Vertical Groundbed (Ref: Dataset 4)' },
  { key: 'dataset3', title: 'Project C: High Resistivity Pipeline (Ref: Dataset 3)' },
]

targetDatasets.forEach(({ key, title }) => {
  const ds = datasets[key]
  const result = runStationCalculations(ds.station, ds.life)
  
  console.log(`## ${title}\n`)
  console.log('| Parameter | Reference (Expected) | RAXA Value | Variance % | Pass/Fail |')
  console.log('| :--- | :---: | :---: | :---: | :---: |')
  
  Object.entries(ds.expected).forEach(([field, expectedVal]) => {
    const actualVal = result[field]
    if (actualVal === undefined) return
    const diff = Math.abs(actualVal - expectedVal)
    const variance = expectedVal !== 0 ? (diff / expectedVal) * 100 : diff * 100
    const pass = variance <= 0.5
    console.log(`| ${field} | ${expectedVal.toFixed(4)} | ${actualVal.toFixed(4)} | ${variance.toFixed(4)}% | ${pass ? '✅ PASS' : '❌ FAIL'} |`)
  })
  console.log('\n')
})
