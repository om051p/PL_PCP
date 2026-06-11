/**
 * PageDashboard.jsx
 *
 * Project Dashboard — overview of all projects.
 * Shows recent/active projects, archived projects, and quick actions.
 */

import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore.js'
import { StatusBadge } from '../components/ui.jsx'
import { getActiveStandard } from '../constants/index.js'
import {
  Plus,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  FolderOpen,
  Clock,
  Layers,
  Bookmark,
} from 'lucide-react'

function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatRelative(isoString) {
  if (!isoString) return ''
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return formatDate(isoString)
}

function ProjectCard({ project, isActive, onSwitch, onDuplicate, onArchive, onUnarchive, onDelete }) {
  const navigate = useNavigate()
  const std = getActiveStandard(project)
  const calculatedStations = project.stations.filter((s) => s.lastCalcResult).length
  const totalStations = project.stations.length

  const handleClick = () => {
    onSwitch(project.id)
    navigate('/project')
  }

  // Engineering Flow Checks
  const hasStations = totalStations > 0
  const isCalculated = hasStations && project.stations.every((s) => s.lastCalcResult)

  const designBasisDone = !!(project.projectName && project.clientName)
  const currentReqDone = isCalculated
  const groundbedDone = isCalculated
  const trSizingDone = isCalculated

  let validationStatus = '—'
  let allChecksPassed = true
  if (isCalculated) {
    const hasFailures = project.stations.some((s) =>
      (s.lastCalcResult?.checks || []).some((c) => c.status === 'fail')
    )
    validationStatus = hasFailures ? '⚠' : '✓'
    allChecksPassed = !hasFailures
  }

  // Calculate Progress Percentage
  let progress = 20 // Design Basis starts at 20%
  if (currentReqDone) progress += 15
  if (groundbedDone) progress += 15
  if (trSizingDone) progress += 15
  if (isCalculated) {
    progress += allChecksPassed ? 15 : 5
  }

  return (
    <div
      className={`dashboard-project-card ${isActive ? 'active' : ''}`}
      onClick={handleClick}
      style={{ display: 'flex', flexDirection: 'column', minHeight: '340px' }}
    >
      <div className="dashboard-card-header">
        <div className="dashboard-card-number">{project.projectNumber}</div>
        <StatusBadge status={project.status} />
        {project.archived && <span className="dashboard-archived-badge">Archived</span>}
      </div>
      <div className="dashboard-card-name" style={{ fontWeight: '500', fontSize: '14px', marginBottom: '2px' }}>{project.projectName}</div>
      <div className="dashboard-card-client" style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{project.clientName}</div>

      <div style={{ fontSize: '11px', color: 'var(--brand-mid)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {std?.label || project.designStandard}
      </div>

      {/* Engineering Checklist */}
      <div className="dashboard-card-checks" style={{ margin: '12px 0', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Design Basis</span>
          <span style={{ color: designBasisDone ? 'var(--pass)' : 'var(--text-tertiary)', fontWeight: 'bold' }}>✓</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Current Requirement</span>
          <span style={{ color: currentReqDone ? 'var(--pass)' : 'var(--text-tertiary)', fontWeight: currentReqDone ? 'bold' : 'normal' }}>{currentReqDone ? '✓' : '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Groundbed Design</span>
          <span style={{ color: groundbedDone ? 'var(--pass)' : 'var(--text-tertiary)', fontWeight: groundbedDone ? 'bold' : 'normal' }}>{groundbedDone ? '✓' : '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)' }}>TR Sizing</span>
          <span style={{ color: trSizingDone ? 'var(--pass)' : 'var(--text-tertiary)', fontWeight: trSizingDone ? 'bold' : 'normal' }}>{trSizingDone ? '✓' : '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Validation</span>
          <span style={{
            color: validationStatus === '✓' ? 'var(--pass)' : validationStatus === '⚠' ? 'var(--warn)' : 'var(--text-tertiary)',
            fontWeight: 'bold'
          }}>{validationStatus}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="dashboard-card-progress-wrapper" style={{ margin: '8px 0 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
          <span>Progress</span>
          <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{progress}%</span>
        </div>
        <div style={{ height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? 'var(--pass)' : 'var(--brand)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      <div className="dashboard-card-meta" style={{ marginTop: 'auto', borderTop: 'none', paddingTop: 0 }}>
        <div className="dashboard-card-meta-item">
          <Layers size={12} />
          <span>{totalStations} station{totalStations !== 1 ? 's' : ''}</span>
        </div>
        <div className="dashboard-card-meta-item">
          <Clock size={12} />
          <span>{formatRelative(project.updatedAt)}</span>
        </div>
        {project.currentRevision && (
          <div className="dashboard-card-meta-item">
            <span className="dashboard-card-revision">{project.currentRevision}</span>
          </div>
        )}
      </div>

      <div className="dashboard-card-actions" onClick={(e) => e.stopPropagation()} style={{ marginTop: '12px' }}>
        <button className="btn btn-sm" onClick={() => onDuplicate(project.id)} title="Duplicate">
          <Copy size={12} /> Duplicate
        </button>
        {!project.archived ? (
          <button className="btn btn-sm" onClick={() => onArchive(project.id)} title="Archive">
            <Archive size={12} /> Archive
          </button>
        ) : (
          <button className="btn btn-sm" onClick={() => onUnarchive(project.id)} title="Unarchive">
            <ArchiveRestore size={12} /> Restore
          </button>
        )}
        <button
          className="btn btn-sm"
          onClick={() => onDelete(project.id)}
          title="Delete"
          style={{ color: 'var(--fail)' }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

export default function PageDashboard() {
  const navigate = useNavigate()
  const projects = useProjectStore((s) => s.projects)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const switchProject = useProjectStore((s) => s.switchProject)
  const createProject = useProjectStore((s) => s.createProject)
  const duplicateProject = useProjectStore((s) => s.duplicateProject)
  const archiveProject = useProjectStore((s) => s.archiveProject)
  const unarchiveProject = useProjectStore((s) => s.unarchiveProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)

  const activeProjects = projects.filter((p) => !p.archived)
  const archivedProjects = projects.filter((p) => p.archived)

  const handleNew = () => {
    createProject({
      projectNumber: `ECP${new Date().getFullYear()}-${String(projects.length + 1).padStart(3, '0')}`,
    })
    navigate('/project')
  }

  return (
    <div className="page">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Project Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {activeProjects.length} active project{activeProjects.length !== 1 ? 's' : ''}
            {archivedProjects.length > 0 && ` · ${archivedProjects.length} archived`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>
          <Plus size={14} /> New Project
        </button>
      </div>

      {activeProjects.length === 0 ? (
        <div className="dashboard-empty">
          <FolderOpen size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>No active projects</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Create a new project to get started with CP design.
          </div>
          <button className="btn btn-primary" onClick={handleNew}>
            <Plus size={14} /> Create First Project
          </button>
        </div>
      ) : (
        <div className="dashboard-grid">
          {activeProjects
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                isActive={p.id === activeProjectId}
                onSwitch={switchProject}
                onDuplicate={duplicateProject}
                onArchive={archiveProject}
                onUnarchive={unarchiveProject}
                onDelete={(id) => {
                  if (projects.length <= 1) return
                  deleteProject(id)
                }}
              />
            ))}
        </div>
      )}

      {archivedProjects.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginTop: 24, marginBottom: 12 }}>
            Archived Projects
          </h2>
          <div className="dashboard-grid">
            {archivedProjects
              .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
              .map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  isActive={p.id === activeProjectId}
                  onSwitch={switchProject}
                  onDuplicate={duplicateProject}
                  onArchive={archiveProject}
                  onUnarchive={unarchiveProject}
                  onDelete={(id) => {
                    if (projects.length <= 1) return
                    deleteProject(id)
                  }}
                />
              ))}
          </div>
        </>
      )}
    </div>
  )
}
