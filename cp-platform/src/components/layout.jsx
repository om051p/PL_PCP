import { useState, useRef, useEffect, useCallback } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { useAuthStore } from '../store/authStore.js'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { StatusBadge, StandardBadge, ThemeToggle } from '../components/ui.jsx'
import { hasRole } from '../config/authPolicy.js'
import {
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
} from 'lucide-react'

const NAV_ITEMS = [
  {
    section: 'Workspace',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    section: 'Project',
    items: [
      { id: 'project', label: 'Project Setup', icon: FolderOpen },
      { id: 'pipeline', label: 'Pipeline Parameters', icon: Route },
    ],
  },
  {
    section: 'Engineering',
    items: [
      { id: 'current', label: 'Current Requirement', icon: Zap },
      { id: 'groundbed', label: 'Groundbed Design', icon: Layers },
      { id: 'cable', label: 'Cable Resistance', icon: Cable },
      { id: 'tr', label: 'TR Sizing', icon: Cpu },
      { id: 'attenuation', label: 'Attenuation', icon: Signal },
    ],
  },
  {
    section: 'Output',
    items: [
      { id: 'validation', label: 'Validation', icon: ClipboardCheck, badge: true },
      { id: 'optimizer', label: 'Design Optimizer', icon: Activity },
      { id: 'bom', label: 'Bill of Materials', icon: List },
      { id: 'report', label: 'Summary Report', icon: FileText },
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

const PAGE_META = {
  dashboard: { title: 'Project Dashboard', sub: 'Overview of all projects and recent activity' },
  project: { title: 'Project Setup', sub: 'Client details, station count, system configuration' },
  pipeline: { title: 'Pipeline Parameters', sub: 'Geometry, operating conditions, soil resistivity' },
  current: { title: 'Current Requirement', sub: 'Protection current calculation with temperature correction' },
  groundbed: { title: 'Groundbed Design', sub: 'Anode bed configuration and resistance calculations' },
  cable: { title: 'Cable Resistance', sub: 'Positive and negative circuit cable analysis' },
  tr: { title: 'TR Sizing', sub: 'Circuit analysis and transformer-rectifier verification' },
  validation: { title: 'Engineering Validation', sub: 'Automated PASS/FAIL checks with engineering insights' },
  optimizer: { title: 'Design Optimizer', sub: 'Alternative designs with trade-off analysis' },
  bom: { title: 'Bill of Materials', sub: 'Auto-generated material quantities (requires Approved status)' },
  report: { title: 'Summary Report', sub: 'Consolidated engineering design summary' },
  import: { title: 'Import from Excel', sub: 'Upload PCP.xlsx or CP Designer export to populate project data' },
  attenuation: { title: 'Attenuation Analysis', sub: 'Transmission-line cosh model · NACE SP0169 · ISO 15589-1' },
  settings: { title: 'Settings', sub: 'Application settings and configuration' },
  users: { title: 'User Management', sub: 'Manage user access and roles' },
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
  const project = useProjectStore((s) => s.getProject())
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
  const project = useProjectStore((s) => s.getProject())
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
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
          <div className="sidebar-project-name">{project?.projectNumber || 'New Project'}</div>
          <StatusBadge status={project?.status || 'draft'} />
        </div>
      )}

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((group) => {
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
                    <Icon size={16} className="nav-icon" />
                    {!collapsed && <span className="nav-label">{item.label}</span>}
                    {!collapsed && item.badge && failCount > 0 && (
                      <span className="nav-badge nav-badge--fail">{failCount}</span>
                    )}
                    {!collapsed && item.badge && failCount === 0 && (
                      <span className="nav-badge nav-badge--pass">✓</span>
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
  const project = useProjectStore((s) => s.getProject())
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
