import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useProjectStore } from '../store/projectStore.js'
import { useAuthStore } from '../store/authStore.js'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { StatusBadge, StandardBadge, ThemeToggle } from '../components/ui.jsx'
import { hasRole } from '../config/authPolicy.js'
import {
  Shield,
  FolderOpen,
  Route,
  Zap,
  Layers,
  Cable,
  Cpu,
  ClipboardCheck,
  List,
  FileText,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Upload,
  Signal,
  LayoutDashboard,
  Plus,
  Copy,
  Archive,
  Trash2,
  ArchiveRestore,
  LogOut,
  Settings,
  Users,
  Database,
  History,
  Sigma,
} from 'lucide-react'

const PIPELINE_NAV_ITEMS = [
  {
    section: 'WORKSPACE',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'history', label: 'Audit Trail', icon: History },
    ],
  },
  {
    section: 'PROJECT DEFINITION',
    items: [
      { id: 'project', label: 'Design Basis', icon: FolderOpen },
      { id: 'pipeline', label: 'Pipeline Parameters', icon: Route },
      { id: 'resistivity', label: 'Soil Resistivity', icon: Layers },
    ],
  },
  {
    section: 'ENGINEERING ANALYSIS',
    items: [
      { id: 'current', label: 'Current Requirement', icon: Zap },
      { id: 'groundbed', label: 'Groundbed Design', icon: Layers },
      { id: 'cable', label: 'Cable Resistance', icon: Cable },
      { id: 'tr', label: 'TR Sizing', icon: Cpu },
      { id: 'attenuation', label: 'Attenuation Analysis', icon: Signal },
    ],
  },
  {
    section: 'DESIGN REVIEW',
    items: [
      { id: 'validation', label: 'Validation', icon: ClipboardCheck, badge: true },
      { id: 'optimizer', label: 'Design Optimizer', icon: Activity },
      { id: 'sensitivity', label: 'Sensitivity Analysis', icon: Sigma },
      { id: 'compliance', label: 'Compliance Center', icon: Shield },
    ],
  },
  {
    section: 'DELIVERABLES',
    items: [
      { id: 'bom', label: 'Bill of Materials', icon: List },
      { id: 'report', label: 'Engineering Report', icon: FileText },
    ],
  },
  {
    section: 'TOOLS',
    items: [
      { id: 'import', label: 'Import Excel', icon: Upload },
    ],
  },
  {
    section: 'Administration',
    adminOnly: true,
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'users', label: 'User Management', icon: Users },
    ],
  },
]

const TANK_NAV_ITEMS = [
  {
    section: 'WORKSPACE',
    items: [
      { id: 'tank', label: 'Tank Bottom CP', icon: Layers },
      { id: 'history', label: 'Audit Trail', icon: History },
    ],
  },
  {
    section: 'Administration',
    adminOnly: true,
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'users', label: 'User Management', icon: Users },
    ],
  },
]

const VESSEL_NAV_ITEMS = [
  {
    section: 'WORKSPACE',
    items: [
      { id: 'vessel', label: 'Vessel CP', icon: Database },
      { id: 'history', label: 'Audit Trail', icon: History },
    ],
  },
  {
    section: 'Administration',
    adminOnly: true,
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'users', label: 'User Management', icon: Users },
    ],
  },
]

const PAGE_META = {
  dashboard: { title: 'Project Dashboard', sub: 'Overview of all projects and recent activity' },
  history: { title: 'Audit Trail & History', sub: 'Traceability of all project revisions, design changes, and approvals' },
  compliance: { title: "Compliance Center", sub: "SAES-X compliance tracking and gap analysis" },
  project: { title: 'Design Basis', sub: 'Client details, station count, system configuration' },
  pipeline: { title: 'Pipeline Parameters', sub: 'Geometry, operating conditions, soil resistivity' },
  resistivity: { title: 'Soil Resistivity', sub: 'Wenner survey, layered soil model, design ρ' },
  current: { title: 'Current Requirement', sub: 'Protection current calculation with temperature correction' },
  groundbed: { title: 'Groundbed Design', sub: 'Anode bed configuration and resistance calculations' },
  cable: { title: 'Cable Resistance', sub: 'Positive and negative circuit cable analysis' },
  tr: { title: 'TR Sizing', sub: 'Circuit analysis and transformer-rectifier verification' },
  validation: { title: 'Engineering Validation', sub: 'Automated PASS/FAIL checks with engineering insights' },
  optimizer: { title: 'Design Optimizer', sub: 'Alternative designs with trade-off analysis' },
  sensitivity: { title: 'Sensitivity Analysis', sub: 'Tornado, sweep, and scenario comparison for design robustness' },
  bom: { title: 'Bill of Materials', sub: 'Auto-generated material quantities (requires Approved status)' },
  report: { title: 'Engineering Report', sub: 'Consolidated engineering design summary' },
  import: { title: 'Import from Excel', sub: 'Upload PCP.xlsx or RAXA Pipeline/CP Designer export to populate project data' },
  attenuation: { title: 'Attenuation Analysis', sub: 'Transmission-line cosh model · NACE SP0169 · ISO 15589-1' },
  settings: { title: 'Settings', sub: 'Application settings and configuration' },
  users: { title: 'User Management', sub: 'Manage user access and roles' },
  tank: { title: 'Tank Bottom CP Design', sub: 'Concentric ring and grid MMO ribbon anode design for storage tanks' },
  vessel: { title: 'Vessel CP Design', sub: 'Sacrificial and ICCP anode design for vessels and separators' },
}

// ─── Project Selector Dropdown ───────────────────────────────────────────────

function ProjectSelector() {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const projects = useProjectStore((s) => s.projects)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const switchProject = useProjectStore((s) => s.switchProject)
  const createProject = useProjectStore((s) => s.createProject)
  const duplicateProject = useProjectStore((s) => s.duplicateProject)
  const archiveProject = useProjectStore((s) => s.archiveProject)
  const unarchiveProject = useProjectStore((s) => s.unarchiveProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0]

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setConfirmDelete(null)
        return
      }
      if (e.type === 'mousedown' && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', handler)
    }
  }, [open])

  const handleNew = useCallback(() => {
    createProject({ projectNumber: `ECP${new Date().getFullYear()}-${String(projects.length + 1).padStart(3, '0')}` })
    setOpen(false)
    navigate('/project')
  }, [createProject, projects.length, navigate])

  const handleDuplicate = useCallback(() => {
    duplicateProject(activeProjectId)
    setOpen(false)
  }, [duplicateProject, activeProjectId])

  const handleSwitch = useCallback((id) => {
    switchProject(id)
    setOpen(false)
  }, [switchProject])

  const handleArchive = useCallback((id) => {
    archiveProject(id)
    setOpen(false)
  }, [archiveProject])

  const handleUnarchive = useCallback((id) => {
    unarchiveProject(id)
    setOpen(false)
  }, [unarchiveProject])

  const handleDelete = useCallback((id) => {
    deleteProject(id)
    setConfirmDelete(null)
    setOpen(false)
  }, [deleteProject])

  const activeProjects = projects.filter((p) => !p.archived)
  const archivedProjects = projects.filter((p) => p.archived)

  return (
    <div className="project-selector" ref={dropdownRef}>
      <button className="project-selector-trigger" onClick={() => setOpen((v) => !v)}>
        <span className="project-selector-label">
          <span className="project-selector-name">{activeProject?.projectNumber || 'New Project'}</span>
          <span className="project-selector-project-name">{activeProject?.projectName || ''}</span>
        </span>
        <ChevronDown size={14} className={`project-selector-chevron ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="project-selector-dropdown">
          <div className="project-selector-actions">
            <button className="btn btn-sm btn-primary" onClick={handleNew} style={{ width: '100%' }}>
              <Plus size={13} /> New Project
            </button>
            <button className="btn btn-sm" onClick={handleDuplicate} disabled={!activeProject} style={{ width: '100%' }}>
              <Copy size={13} /> Duplicate Current
            </button>
          </div>

          <div className="project-selector-divider" />

          <div className="project-selector-list">
            {activeProjects.map((p) => (
              <div
                key={p.id}
                className={`project-selector-item ${p.id === activeProjectId ? 'active' : ''}`}
                onClick={() => handleSwitch(p.id)}
              >
                <div className="project-selector-item-info">
                  <div className="project-selector-item-number">{p.projectNumber}</div>
                  <div className="project-selector-item-name">{p.projectName}</div>
                  <div className="project-selector-item-meta">
                    <StatusBadge status={p.status} />
                    <span>{p.stations.length} station{p.stations.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="project-selector-item-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn-icon-ghost"
                    title="Archive"
                    onClick={() => handleArchive(p.id)}
                  >
                    <Archive size={13} />
                  </button>
                  {projects.length > 1 && (
                    <button
                      className="btn-icon-ghost"
                      title="Delete"
                      onClick={() => setConfirmDelete(p.id)}
                      style={{ color: 'var(--fail)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {archivedProjects.length > 0 && (
            <>
              <div className="project-selector-divider" />
              <div className="project-selector-section-label">Archived</div>
              <div className="project-selector-list">
                {archivedProjects.map((p) => (
                  <div key={p.id} className="project-selector-item archived">
                    <div className="project-selector-item-info">
                      <div className="project-selector-item-number">{p.projectNumber}</div>
                      <div className="project-selector-item-name">{p.projectName}</div>
                    </div>
                    <div className="project-selector-item-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-icon-ghost"
                        title="Unarchive"
                        onClick={() => handleUnarchive(p.id)}
                      >
                        <ArchiveRestore size={13} />
                      </button>
                      <button
                        className="btn-icon-ghost"
                        title="Delete"
                        onClick={() => setConfirmDelete(p.id)}
                        style={{ color: 'var(--fail)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="dialog-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="dialog-title">
              <span className="dialog-title-icon"><Trash2 size={18} color="var(--fail)" /></span>
              Delete Project
            </h3>
            <p className="dialog-message">
              Are you sure you want to permanently delete this project? This action cannot be undone.
            </p>
            <div className="dialog-actions">
              <button className="btn" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Project Context Header ──────────────────────────────────────────────────

function ProjectContextHeader() {
  const project = useProjectStore((s) => s.projects.find((p) => p.id === s.activeProjectId) || s.projects[0])
  if (!project) return null

  return (
    <div className="project-context-header">
      <span className="project-context-number">{project.projectNumber}</span>
      <span className="project-context-sep">·</span>
      <span className="project-context-name">{project.projectName}</span>
      {project.currentRevision && (
        <>
          <span className="project-context-sep">·</span>
          <span className="project-context-rev">{project.currentRevision}</span>
        </>
      )}
      <StatusBadge status={project.status} />
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function Sidebar({ collapsed, onToggle }) {
  const failCount = useProjectStore((s) => s.getTotalValidationFailCount())
  const project = useProjectStore((s) => s.projects.find((p) => p.id === s.activeProjectId) || s.projects[0])
  const activeStationId = useProjectStore((s) => s.activeStationId)
  const station = project?.stations.find((st) => st.id === activeStationId) || project?.stations[0]
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setActiveWorkspace = useProjectStore((s) => s.setActiveWorkspace)
  const activeWorkspace = useProjectStore((s) => s.activeWorkspace)

  const navItems = activeWorkspace === 'tank'
    ? TANK_NAV_ITEMS
    : activeWorkspace === 'vessel'
    ? VESSEL_NAV_ITEMS
    : PIPELINE_NAV_ITEMS

  const logoText = activeWorkspace === 'tank'
    ? '⚡ RAXA Tank'
    : activeWorkspace === 'vessel'
    ? '⚡ RAXA Vessel'
    : '⚡ RAXA Pipeline'

  // Helper for Sidebar Progress Tracking
  function getNavItemStatus(itemId) {
    if (collapsed || !station || !project) return null
    if (itemId === 'dashboard') return null

    if (itemId === 'project') {
      const isDone = !!(project.projectName && project.clientName)
      return (
        <span
          className="tab-dot"
          title={isDone ? 'Design basis complete' : 'Design basis incomplete'}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: isDone ? 'var(--pass)' : 'var(--text-tertiary)',
            marginLeft: 'auto',
          }}
        />
      )
    }

    if (['pipeline', 'current', 'groundbed', 'cable', 'tr', 'attenuation'].includes(itemId)) {
      const isCalculated = !!station.lastCalcResult
      const isStale = station.status === 'needs_recalculation' || (!station.lastCalcResult && station.pipelineSegments.length > 0)

      let color = 'var(--text-tertiary)'
      let title = 'Not calculated'

      if (isCalculated && !isStale) {
        color = 'var(--pass)'
        title = 'Calculated and fresh'
      } else if (isStale) {
        color = 'var(--warn)'
        title = 'Recalculation required (inputs changed)'
      }

      return (
        <span
          className="tab-dot"
          title={title}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: color,
            marginLeft: 'auto',
          }}
        />
      )
    }

    if (itemId === 'bom') {
      const isBOMReady = station.status === 'approved' || project.status === 'approved' || station.status === 'issued_for_construction'
      return (
        <span
          className="tab-dot"
          title={isBOMReady ? 'BOM compiled' : 'Review & approval required'}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: isBOMReady ? 'var(--pass)' : 'var(--text-tertiary)',
            marginLeft: 'auto',
          }}
        />
      )
    }

    if (itemId === 'report') {
      const allDone = project.stations.every((s) => s.lastCalcResult)
      return (
        <span
          className="tab-dot"
          title={allDone ? 'Report available' : 'Incomplete calculations'}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: allDone ? 'var(--pass)' : 'var(--text-tertiary)',
            marginLeft: 'auto',
          }}
        />
      )
    }

    return null
  }

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div style={{ cursor: 'pointer' }} onClick={() => {
            setActiveWorkspace(null)
            navigate('/workspace')
          }}>
            <div className="sidebar-logo">{logoText}</div>
            <div className="sidebar-sub">Infrastructure Protection</div>
          </div>
        )}
        <button className="sidebar-toggle" onClick={onToggle}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="sidebar-project">
          <div className="sidebar-project-name">{project?.projectNumber || 'New Project'}</div>
          <StatusBadge status={project?.status || 'draft'} />
        </div>
      )}

      <nav className="sidebar-nav">
        {navItems.map((group) => {
          // Filter admin-only sections based on user role
          if (group.adminOnly && !hasRole(user, 'admin')) return null

          return (
            <div key={group.section}>
              {!collapsed && <div className="nav-section">{group.section}</div>}
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.id}
                    to={`/${item.id}`}
                    className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId="sidebar-active-indicator"
                            className="nav-active-indicator"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <Icon size={16} className="nav-icon" />
                        {!collapsed && <span className="nav-label">{item.label}</span>}
                        {!collapsed && getNavItemStatus(item.id)}
                        {!collapsed && item.badge && failCount > 0 && (
                          <span className="nav-badge nav-badge--fail" style={{ marginLeft: 6 }}>{failCount}</span>
                        )}
                        {!collapsed && item.badge && failCount === 0 && (
                          <span className="nav-badge nav-badge--pass" style={{ marginLeft: 6 }}>✓</span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

// ─── TopBar ──────────────────────────────────────────────────────────────────

export function TopBar() {
  const { pathname } = useLocation()
  const activePage = pathname.slice(1) || 'project'
  const navigate = useNavigate()
  const calculating = useProjectStore((s) => s.ui.calculatingStationId)
  const calculateAllStations = useProjectStore((s) => s.calculateAllStations)
  const project = useProjectStore((s) => s.projects.find((p) => p.id === s.activeProjectId) || s.projects[0])
  const meta = PAGE_META[activePage] || { title: activePage, sub: '' }
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = useCallback(() => {
    logout().catch(() => {
      // Store already sets error state; suppress unhandled rejection
    })
    navigate('/login', { replace: true })
  }, [logout, navigate])

  return (
    <header className="topbar">
      <div className="topbar-left">
        <ProjectSelector />
        <div className="topbar-page-info">
          <div className="topbar-title">{meta.title}</div>
          <div className="topbar-sub">{meta.sub}</div>
        </div>
      </div>
      <div className="topbar-actions">
        <ThemeToggle />
        <StandardBadge project={project} />
        <button
          className={`btn btn-icon ${calculating ? 'btn--loading' : ''}`}
          onClick={calculateAllStations}
          disabled={!!calculating}
          title="Recalculate all stations"
        >
          <RefreshCw size={15} className={calculating ? 'spin' : ''} />
          <span>Recalculate</span>
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/validation')}>
          <ClipboardCheck size={15} />
          <span>Validate</span>
        </button>
        {user && (
          <div className="topbar-user">
            <span className="topbar-user-email" title={user.email || ''}>
              {user.email || user.displayName || 'User'}
            </span>
            <button
              className="btn btn-icon-ghost topbar-logout"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
