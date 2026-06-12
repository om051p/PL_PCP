import { useState } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { SectionCard, Divider } from '../components/ui.jsx'
import { History, Search, ShieldAlert, FileDown } from 'lucide-react'

function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function PageHistory() {
  const project = useProjectStore((s) => s.getProject())
  const log = project?.activityLog || []

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModule, setSelectedModule] = useState('all')

  const uniqueModules = ['all', ...Array.from(new Set(log.map((item) => item.module).filter(Boolean)))]

  const filteredLog = log
    .filter((item) => {
      if (selectedModule !== 'all' && item.module !== selectedModule) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          item.action.toLowerCase().includes(query) ||
          item.details.toLowerCase().includes(query) ||
          item.user.toLowerCase().includes(query)
        )
      }
      return true
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Module', 'Details']
    const rows = filteredLog.map((item) => [
      item.timestamp,
      item.user,
      item.action,
      item.module,
      item.details.replace(/"/g, '""'),
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `activity_log_${project?.projectNumber || 'RAXA'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="page">
      <div className="validation-filter-container">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            className="field-input"
            style={{ width: 180, height: 32, fontSize: 12 }}
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
          >
            {uniqueModules.map((m) => (
              <option key={m} value={m}>
                {m === 'all' ? 'All Modules' : m}
              </option>
            ))}
          </select>
          <button className="btn btn-sm" onClick={handleExportCSV} disabled={filteredLog.length === 0}>
            <FileDown size={13} /> Export CSV
          </button>
        </div>
        <div className="field-input-wrap" style={{ position: 'relative', width: 240 }}>
          <input
            type="text"
            className="field-input"
            style={{ paddingLeft: 28 }}
            placeholder="Search activity log..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={13} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-tertiary)' }} />
        </div>
      </div>

      <SectionCard title="Project Audit Trail" icon={History}>
        <div className="bom-table">
          <div
            className="bom-row bom-header"
            style={{ gridTemplateColumns: '150px 150px 140px 110px 1fr' }}
          >
            <div>Timestamp</div>
            <div>User</div>
            <div>Action</div>
            <div>Module</div>
            <div>Details</div>
          </div>

          {filteredLog.length > 0 ? (
            filteredLog.map((item) => (
              <div
                key={item.id}
                className="bom-row"
                style={{
                  gridTemplateColumns: '150px 150px 140px 110px 1fr',
                  fontSize: 12,
                  alignItems: 'start',
                }}
              >
                <div style={{ color: 'var(--text-tertiary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                  {formatDate(item.timestamp)}
                </div>
                <div style={{ fontWeight: 500, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.user}>
                  {item.user}
                </div>
                <div>
                  <span
                    className="tag"
                    style={{
                      backgroundColor:
                        item.action.includes('Created') || item.action.includes('Approved')
                          ? 'var(--pass-bg)'
                          : item.action.includes('Failed')
                          ? 'var(--fail-bg)'
                          : 'var(--surface-hover)',
                      color:
                        item.action.includes('Created') || item.action.includes('Approved')
                          ? 'var(--pass)'
                          : item.action.includes('Failed')
                          ? 'var(--fail)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    {item.action}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{item.module}</div>
                <div style={{ color: 'var(--text-primary)', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {item.details}
                </div>
              </div>
            ))
          ) : (
            <div className="no-result">
              <ShieldAlert size={28} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
              <div>No activity logs found matching the filters.</div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
