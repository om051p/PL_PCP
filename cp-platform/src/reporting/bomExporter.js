/**
 * BOM EXPORT ENGINE
 * Handles CSV export for Bill of Materials.
 */

/**
 * Export station BOM to CSV and trigger download.
 * @param {string} stationName
 * @param {import('../types').BOMItem[]} bom
 */
export function exportBOMToCSV(stationName, bom) {
  if (!bom || bom.length === 0) return

  const headers = ['Tag', 'Description', 'Standard', 'Unit', 'Quantity', 'Notes']
  const rows = bom.map(item => [
    item.tag,
    `"${item.description}"`,
    item.standard || '',
    item.unit,
    item.quantity,
    `"${item.notes || ''}"`
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `BOM_${stationName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
