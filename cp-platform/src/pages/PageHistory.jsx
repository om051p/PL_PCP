/**
 * PageHistory.jsx
 *
 * Enterprise Audit Trail — timeline view, filter panel, activity heatmap,
 * action statistics, and recent changes.
 */

import { useState, useMemo } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { SectionCard } from '../components/ui.jsx'
import { History, Search, ShieldAlert, FileDown, Filter, Clock, Activity, BarChart3, GitCommit, Layers } from 'lucide-react'

function formatDate(isoString) {
  if (!isoString) return '\u2014'
  return new Date(isoString).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

function formatTime(isoString) {
  if (!isoString) return '\u2014'
  return new Date(isoString).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const ACTION_COLORS = {
  Created: '#10b981',
  Approved: '#10b981',
  Calculated: '#3b82f6',
  Updated: '#f59e0b',
  Failed: '#ef4444',
  Exported: '#8b5cf6',
  Imported: '#06b6d4',
  default: '#71717a'
}

function getActionColor(action) {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return color
  }
  return ACTION_COLORS.default
}

export function PageHistory() {
  const project = useProjectStore((s) => s.getProject())
  const log = project?.activityLog || []

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModule, setSelectedModule] = useState('all')
  const [selectedAction, setSelectedAction] = useState('all')
  const [viewMode, setViewMode] = useState('timeline')

  const uniqueModules = useMemo(() => ['all', ...Array.from(new Set(log.map((item) => item.module).filter(Boolean)))], [log])
  const uniqueActions = useMemo(() => ['all', ...Array.from(new Set(log.map((item) => item.action).filter(Boolean)))], [log])

  const filteredLog = useMemo(() => {
    return log
      .filter((item) => {
        if (selectedModule !== 'all' && item.module !== selectedModule) return false
        if (selectedAction !== 'all' && item.action !== selectedAction) return false
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          return item.action.toLowerCase().includes(query) ||
            item.details.toLowerCase().includes(query) ||
            item.user.toLowerCase().includes(query)
        }
        return true
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }, [log, selectedModule, selectedAction, searchQuery])

  // Activity statistics
  const stats = useMemo(() => {
    const total = log.length
    const today = new Date().toDateString()
    const todayCount = log.filter((l) => new Date(l.timestamp).toDateString() === today).length
    const actionCounts = {}
    log.forEach((l) => { actionCounts[l.action] = (actionCounts[l.action] || 0) + 1 })
    const topActions = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const moduleCounts = {}
    log.forEach((l) => { moduleCounts[l.module] = (moduleCounts[l.module] || 0) + 1 })
    const topModules = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
    // Hourly heatmap (simple: count per hour of day)
    const hourCounts = new Array(24).fill(0)
    log.forEach((l) => {
      const h = new Date(l.timestamp).getHours()
      if (h >= 0 && h < 24) hourCounts[h]++
    })
    const maxHour = Math.max(...hourCounts, 1)
    return { total, todayCount, topActions, topModules, hourCounts, maxHour }
  }, [log])

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Module', 'Details']
    const rows = filteredLog.map((item) => [
      item.timestamp, item.user, item.action, item.module,
      item.details.replace(/"/g, '""')
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', `activity_log_${project?.projectNumber || 'RAXA'}.csv`)
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Audit Trail</h1>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
            {project?.projectName || 'Project'} \u00b7 {log.length} total events \u00b7 {stats.todayCount} today
          </p>
        </div>
        <button className="btn btn-sm" onClick={handleExportCSV} disabled={filteredLog.length === 0}>
          <FileDown size={13} /> Export CSV
        </button>
      </div>

      {/* Activity Stats KPI Row */}
      <div className="kpi-row" style={{ marginBottom: 10 }}>
        <div className="kpi-card kpi-card--brand">
          <span className="kpi-card__label">Total Events</span>
          <span className="kpi-card__value">{stats.total}</span>
          <span className="kpi-card__sub">All-time activity</span>
        </div>
        <div className="kpi-card kpi-card--info">
          <span className="kpi-card__label">Today</span>
          <span className="kpi-card__value">{stats.todayCount}</span>
          <span className="kpi-card__sub">Events in last 24h</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Top Action</span>
          <span className="kpi-card__value" style={{ fontSize: 16 }}>{stats.topActions[0]?.[0] || '\u2014'}</span>
          <span className="kpi-card__sub">{stats.topActions[0]?.[1] || 0} occurrences</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Top Module</span>
          <span className="kpi-card__value" style={{ fontSize: 16 }}>{stats.topModules[0]?.[0] || '\u2014'}</span>
          <span className="kpi-card__sub">{stats.topModules[0]?.[1] || 0} events</span>
        </div>
      </div>

      <div className="enterprise-2col">
        {/* Left: Filters + Timeline/Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Filter Panel */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="field-input-wrap" style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <input type="text" className="field-input" style={{ paddingLeft: 28, height: 30, fontSize: 12 }} placeholder="Search activity..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <Search size={13} style={{ position: 'absolute', left: 8, top: 8, color: 'var(--text-tertiary)' }} />
            </div>
            <select className="field-input" style={{ width: 140, height: 30, fontSize: 12 }} value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)}>
              {uniqueModules.map((m) => <option key={m} value={m}>{m === 'all' ? 'All Modules' : m}</option>)}
            </select>
            <select className="field-input" style={{ width: 130, height: 30, fontSize: 12 }} value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)}>
              {uniqueActions.map((a) => <option key={a} value={a}>{a === 'all' ? 'All Actions' : a}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className={`btn btn-sm ${viewMode === 'timeline' ? 'btn-primary' : ''}`} onClick={() => setViewMode('timeline')} style={{ padding: '4px 10px', fontSize: 11 }}>
                <GitCommit size={12} /> Timeline
              </button>
              <button className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : ''}`} onClick={() => setViewMode('table')} style={{ padding: '4px 10px', fontSize: 11 }}>
                <Layers size={12} /> Table
              </button>
            </div>
          </div>

          {/* Timeline / Table View */}
          <SectionCard title={viewMode === 'timeline' ? 'Activity Timeline' : 'Activity Log'} icon={viewMode === 'timeline' ? GitCommit : Layers}>
            {filteredLog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>
                <ShieldAlert size={28} style={{ marginBottom: 8 }} />
                <div>No activity logs found matching the filters.</div>
              </div>
            ) : viewMode === 'timeline' ? (
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
                {filteredLog.map((item, i) => {
                  const color = getActionColor(item.action)
                  return (
                    <div key={item.id || i} style={{ position: 'relative', paddingBottom: 10, paddingLeft: 12 }}>
                      <div style={{ position: 'absolute', left: -21, top: 5, width: 10, height: 10, borderRadius: '50%', background: color, border: '2px solid var(--card)', zIndex: 1 }} />
                      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginBottom: 2 }}>{formatDate(item.timestamp)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ background: color + '20', color, padding: '1px 6px', borderRadius: 3, fontSize: 10.5, fontWeight: 600 }}>{item.action}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.module}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-primary)', marginTop: 2 }}>{item.details}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>{item.user}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Timestamp</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>User</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Action</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Module</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLog.map((item, i) => (
                      <tr key={item.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{formatDate(item.timestamp)}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 500 }}>{item.user}</td>
                        <td style={{ padding: '7px 10px' }}><span style={{ background: getActionColor(item.action) + '20', color: getActionColor(item.action), padding: '1px 6px', borderRadius: 3, fontSize: 10.5, fontWeight: 600 }}>{item.action}</span></td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: 11 }}>{item.module}</td>
                        <td style={{ padding: '7px 10px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right: Activity Stats + Heatmap */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Top Actions */}
          <div className="section-card" style={{ marginBottom: 0 }}>
            <div className="section-card-header">
              <span className="section-card-title"><Activity size={14} /> Top Actions</span>
            </div>
            <div className="section-card-body">
              {stats.topActions.map(([action, count]) => (
                <div key={action} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px dashed var(--border)' }}>
                  <span style={{ background: getActionColor(action) + '20', color: getActionColor(action), padding: '1px 6px', borderRadius: 3, fontSize: 10.5, fontWeight: 600, flexShrink: 0 }}>{action}</span>
                  <div style={{ flex: 1, height: 4, background: 'var(--surface-hover)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / stats.topActions[0][1]) * 100}%`, background: getActionColor(action), borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontWeight: 600, minWidth: 24, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hourly Heatmap */}
          <div className="section-card" style={{ marginBottom: 0 }}>
            <div className="section-card-header">
              <span className="section-card-title"><BarChart3 size={14} /> Activity Heatmap (by hour)</span>
            </div>
            <div className="section-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
                {stats.hourCounts.map((count, hour) => {
                  const intensity = count / stats.maxHour
                  const bg = `rgba(59, 130, 246, ${Math.max(0.08, intensity * 0.85)})`
                  return (
                    <div key={hour} title={`${hour}:00 - ${count} events`} style={{
                      padding: '4px 2px', background: bg, borderRadius: 3, textAlign: 'center',
                      border: intensity > 0.5 ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent'
                    }}>
                      <div style={{ fontSize: 8, color: 'var(--text-tertiary)' }}>{hour}h</div>
                      <div style={{ fontSize: 9, fontWeight: 600, fontFamily: 'var(--font-mono)', color: count > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{count}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Top Modules */}
          <div className="section-card" style={{ marginBottom: 0 }}>
            <div className="section-card-header">
              <span className="section-card-title"><Layers size={14} /> Top Modules</span>
            </div>
            <div className="section-card-body">
              {stats.topModules.map(([mod, count]) => (
                <div key={mod} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dashed var(--border)', fontSize: 11.5 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{mod}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontWeight: 600 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
