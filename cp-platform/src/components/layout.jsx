import { useProjectStore } from '../store/projectStore.js'
import { DESIGN_MODES, WORKFLOW_STATUS_MAP } from '../constants/index.js'
import { StatusBadge } from '../components/ui.jsx'
import {
  FolderOpen, Route, Zap, Layers, Cable, Cpu, ClipboardCheck,
  List, FileText, Settings, ChevronLeft, ChevronRight,
  Plus, Activity, AlertTriangle, CheckCircle2, RefreshCw, Upload
} from 'lucide-react'

const NAV_ITEMS = [
  { section: 'Project', items: [
    { id: 'project',   label: 'Project Setup',      icon: FolderOpen },
    { id: 'pipeline',  label: 'Pipeline Parameters', icon: Route },
  ]},
  { section: 'Engineering', items: [
    { id: 'current',    label: 'Current Requirement', icon: Zap },
    { id: 'groundbed',  label: 'Groundbed Design',    icon: Layers },
    { id: 'cable',      label: 'Cable Resistance',    icon: Cable },
    { id: 'tr',         label: 'TR Sizing',           icon: Cpu },
  ]},
  { section: 'Output', items: [
    { id: 'validation', label: 'Validation',          icon: ClipboardCheck, badge: true },
    { id: 'optimizer',  label: 'Design Optimizer',    icon: Activity },
    { id: 'bom',        label: 'Bill of Materials',   icon: List },
    { id: 'report',     label: 'Summary Report',      icon: FileText },
    { id: 'import',     label: 'Import Excel',         icon: Upload },
  ]},
]

const PAGE_META = {
  project:    { title: 'Project Setup',            sub: 'Client details, station count, system configuration' },
  pipeline:   { title: 'Pipeline Parameters',      sub: 'Geometry, operating conditions, soil resistivity' },
  current:    { title: 'Current Requirement',      sub: 'Protection current calculation with temperature correction' },
  groundbed:  { title: 'Groundbed Design',         sub: 'Anode bed configuration and resistance calculations' },
  cable:      { title: 'Cable Resistance',         sub: 'Positive and negative circuit cable analysis' },
  tr:         { title: 'TR Sizing',                sub: 'Circuit analysis and transformer-rectifier verification' },
  validation: { title: 'Engineering Validation',   sub: 'Automated PASS/FAIL checks with engineering insights' },
  optimizer:  { title: 'Design Optimizer',         sub: 'Alternative designs with trade-off analysis' },
  bom:        { title: 'Bill of Materials',        sub: 'Auto-generated material quantities (requires Approved status)' },
  report:     { title: 'Summary Report',           sub: 'Consolidated engineering design summary' },
  import:     { title: 'Import from Excel',         sub: 'Upload PCP.xlsx or CP Designer export to populate project data' },
}

export function Sidebar({ collapsed, onToggle }) {
  const activePage = useProjectStore(s => s.ui.activePage)
  const setActivePage = useProjectStore(s => s.setActivePage)
  const failCount = useProjectStore(s => s.getTotalValidationFailCount())
  const project = useProjectStore(s => s.project)

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div>
            <div className="sidebar-logo">⚡ CP Designer</div>
            <div className="sidebar-sub">ICCP Engineering Platform</div>
          </div>
        )}
        <button className="sidebar-toggle" onClick={onToggle}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="sidebar-project">
          <div className="sidebar-project-name">{project.projectNumber || 'New Project'}</div>
          <StatusBadge status={project.status} />
        </div>
      )}

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(group => (
          <div key={group.section}>
            {!collapsed && <div className="nav-section">{group.section}</div>}
            {group.items.map(item => {
              const Icon = item.icon
              const isActive = activePage === item.id
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
                  onClick={() => setActivePage(item.id)}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={16} className="nav-icon" />
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                  {!collapsed && item.badge && failCount > 0 && (
                    <span className="nav-badge nav-badge--fail">{failCount}</span>
                  )}
                  {!collapsed && item.badge && failCount === 0 && (
                    <span className="nav-badge nav-badge--pass">✓</span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

export function TopBar() {
  const activePage = useProjectStore(s => s.ui.activePage)
  const calculating = useProjectStore(s => s.ui.calculatingStationId)
  const calculateAllStations = useProjectStore(s => s.calculateAllStations)
  const setActivePage = useProjectStore(s => s.setActivePage)
  const meta = PAGE_META[activePage] || { title: activePage, sub: '' }

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{meta.title}</div>
        <div className="topbar-sub">{meta.sub}</div>
      </div>
      <div className="topbar-actions">
        <button
          className={`btn btn-icon ${calculating ? 'btn--loading' : ''}`}
          onClick={calculateAllStations}
          disabled={!!calculating}
          title="Recalculate all stations"
        >
          <RefreshCw size={15} className={calculating ? 'spin' : ''} />
          <span>Recalculate</span>
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setActivePage('validation')}
        >
          <ClipboardCheck size={15} />
          <span>Validate</span>
        </button>
      </div>
    </header>
  )
}
