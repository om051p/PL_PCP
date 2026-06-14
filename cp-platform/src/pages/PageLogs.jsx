/**
 * PageLogs.jsx
 *
 * Dedicated logs / activity log screen. Shows all activity for the active
 * project with filtering (by user, module, action, kind) and live updates
 * via the Firestore subscription in activityLogger.
 *
 * Use this when the user wants to audit the full history. The Dashboard's
 * "Recent Activity" shows only the latest 10; this page shows the full
 * log with filtering.
 */

import { useState, useEffect, useMemo } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { SectionCard, SelectField, FieldInput } from '../components/ui.jsx'
import { subscribeToActivity } from '../services/activityLogger.js'
import { useToast } from '../components/Toast.jsx'
import { ScrollText, Filter, Download, RefreshCw, Activity, AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

const KIND_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
}

const KIND_COLORS = {
  info: 'var(--brand-mid)',
  success: 'var(--pass)',
  warning: 'var(--warn)',
  error: 'var(--fail)',
}

export function PageLogs() {
  const project = useProjectStore((s) => s.getProject())
  const toast = useToast()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterUser, setFilterUser] = useState('all')
  const [filterModule, setFilterModule] = useState('all')
  const [filterAction, setFilterAction] = useState('all')
  const [filterKind, setFilterKind] = useState('all')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(200)

  // Subscribe to live activity
  useEffect(() => {
    if (!project?.id) {
      Promise.resolve().then(() => {
        setEntries([])
        setLoading(false)
      })
      return undefined
    }
    Promise.resolve().then(() => {
      setLoading(true)
    })
    const unsub = subscribeToActivity(project.id, (e) => {
      setEntries(e)
      setLoading(false)
    }, limit)
    return () => { if (typeof unsub === 'function') unsub() }
  }, [project?.id, limit])

  // Build filter dropdowns
  const { users, modules, actions } = useMemo(() => {
    const u = new Set(), m = new Set(), a = new Set()
    entries.forEach((e) => {
      if (e.userEmail) u.add(e.userEmail)
      if (e.module) m.add(e.module)
      if (e.action) a.add(e.action)
    })
    return {
      users: Array.from(u).sort(),
      modules: Array.from(m).sort(),
      actions: Array.from(a).sort(),
    }
  }, [entries])

  // Apply filters
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return entries.filter((e) => {
      if (filterUser !== 'all' && e.userEmail !== filterUser) return false
      if (filterModule !== 'all' && e.module !== filterModule) return false
      if (filterAction !== 'all' && e.action !== filterAction) return false
      if (filterKind !== 'all' && e.kind !== filterKind) return false
      if (q) {
        const hay = `${e.action} ${e.module} ${e.details} ${e.userEmail}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [entries, filterUser, filterModule, filterAction, filterKind, search])

  // Group by day for the timeline
  const grouped = useMemo(() => {
    const out = []
    let lastDay = null
    filtered.forEach((e) => {
      const day = e.timestamp ? e.timestamp.slice(0, 10) : 'unknown'
      if (day !== lastDay) {
        out.push({ day, entries: [] })
        lastDay = day
      }
      out[out.length - 1].entries.push(e)
    })
    return out
  }, [filtered])

  function handleExport() {
    try {
      const csv = [
        'timestamp,user,module,action,details,kind',
        ...filtered.map((e) =>
          [e.timestamp, e.userEmail, e.module, e.action, `"${(e.details || '').replace(/"/g, '""')}"`, e.kind].join(',')
        ),
      ].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `activity-log-${project?.id || 'project'}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Log exported', `${filtered.length} entries written to CSV`)
    } catch (err) {
      toast.error('Export failed', err.message)
    }
  }

  function handleRefresh() {
    setLoading(true)
    // The subscription will re-fire; just give a visual cue
    setTimeout(() => setLoading(false), 400)
    toast.info('Refreshing', 'Re-syncing activity log from Firestore')
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionCard
        title={<span><ScrollText size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Activity Log</span>}
        sub={`${filtered.length} of ${entries.length} entries${project ? ` for project ${project.name || project.id}` : ''}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>
            <Filter size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} /> Filter
          </span>
          <SelectField
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            options={[{ value: 'all', label: 'All users' }, ...users.map((u) => ({ value: u, label: u }))]}
          />
          <SelectField
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            options={[{ value: 'all', label: 'All modules' }, ...modules.map((m) => ({ value: m, label: m }))]}
          />
          <SelectField
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            options={[{ value: 'all', label: 'All actions' }, ...actions.map((a) => ({ value: a, label: a }))]}
          />
          <SelectField
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value)}
            options={[
              { value: 'all', label: 'All kinds' },
              { value: 'info', label: 'Info' },
              { value: 'success', label: 'Success' },
              { value: 'warning', label: 'Warning' },
              { value: 'error', label: 'Error' },
            ]}
          />
          <FieldInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
          />
          <SelectField
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            options={[
              { value: 50, label: 'Last 50' },
              { value: 200, label: 'Last 200' },
              { value: 500, label: 'Last 500' },
            ]}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRefresh}
            data-testid="logs-refresh"
            style={{ marginLeft: 'auto' }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExport}
            data-testid="logs-export"
            disabled={filtered.length === 0}
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
      </SectionCard>

      {loading && entries.length === 0 ? (
        <SectionCard title="Loading…">
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
            <Activity size={20} style={{ opacity: 0.4 }} />
            <div style={{ marginTop: 8 }}>Loading activity log…</div>
          </div>
        </SectionCard>
      ) : entries.length === 0 ? (
        <SectionCard title="No activity yet">
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
            <ScrollText size={20} style={{ opacity: 0.4 }} />
            <div style={{ marginTop: 8 }}>No activity entries yet. Calculations and approvals will appear here.</div>
          </div>
        </SectionCard>
      ) : (
        <div data-testid="logs-timeline" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {grouped.map((g) => (
            <SectionCard key={g.day} title={g.day} sub={`${g.entries.length} entries`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {g.entries.map((e) => {
                  const Icon = KIND_ICONS[e.kind] || Info
                  const color = KIND_COLORS[e.kind] || KIND_COLORS.info
                  return (
                    <div
                      key={e.id}
                      className="row-clickable cursor-highlight"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '20px 130px 1fr 110px',
                        gap: 10,
                        padding: '6px 8px',
                        fontSize: 11.5,
                        borderRadius: 4,
                        alignItems: 'center',
                      }}
                    >
                      <Icon size={14} style={{ color }} aria-hidden="true" />
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                        {e.timestamp ? new Date(e.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                      </span>
                      <div>
                        <div style={{ color: 'var(--text-primary)' }}>
                          <strong>{e.userEmail}</strong>
                          <span style={{ color: 'var(--text-tertiary)', margin: '0 4px' }}>·</span>
                          <em>{e.action}</em>
                          <span style={{ color: 'var(--text-tertiary)' }}> in {e.module}</span>
                        </div>
                        {e.details && (
                          <div style={{ color: 'var(--text-secondary)', marginTop: 1 }}>{e.details}</div>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 9.5,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color,
                          fontWeight: 600,
                          textAlign: 'right',
                        }}
                      >
                        {e.kind || 'info'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  )
}
