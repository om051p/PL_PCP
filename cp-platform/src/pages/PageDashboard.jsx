/**
 * PageDashboard.jsx
 *
 * Enterprise Project Dashboard — KPIs, pipeline overview, workflow modules,
 * recent activity, and project management.
 */

import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore.js'
import { StatusBadge } from '../components/ui.jsx'
import { getActiveStandard } from '../constants/index.js'
import { PipelineOverviewCanvas } from '../visualizations/index.js'
import { KPITrendWidget, extractTrendData } from '../visualizations/KPITrendWidget.jsx'
import { ProjectOverviewMap } from '../visualizations/ProjectOverviewMap.jsx'
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
  LayoutDashboard,
  Zap,
  Cable,
  Cpu,
  Signal,
  ClipboardCheck,
  CheckCircle,
  Activity,
  Route,
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

  const hasStations = totalStations > 0
  const isCalculated = hasStations && project.stations.every((s) => s.lastCalcResult)

  let validationStatus = '—'
  let allChecksPassed = true
  if (isCalculated) {
    const hasFailures = project.stations.some((s) =>
      (s.lastCalcResult?.checks || []).some((c) => c.status === 'fail')
    )
    validationStatus = hasFailures ? '⚠' : '✓'
    allChecksPassed = !hasFailures
  }

  let progress = 20
  if (isCalculated) progress += 15
  if (isCalculated) progress += 15
  if (isCalculated) progress += 15
  if (isCalculated) {
    progress += allChecksPassed ? 15 : 5
  }

  return (
    <div
      className={`dashboard-project-card ${isActive ? 'dashboard-project-card--active' : ''}`}
      onClick={handleClick}
    >
      <div className="dashboard-project-header">
        <div className="dashboard-project-number">{project.projectNumber}</div>
        <StatusBadge status={project.status} />
        {project.archived && <span className="dashboard-archived-badge">Archived</span>}
      </div>
      <div className="dashboard-project-name">{project.projectName}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: 2 }}>
        {project.clientName || '—'}
      </div>
      <div style={{ fontSize: '10.5px', color: 'var(--brand-mid)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 6 }}>
        {std?.label || project.designStandard}
      </div>
      <div className="dashboard-project-meta">
        <div className="dashboard-meta-item">
          <Layers size={11} />
          <span>{totalStations} station{totalStations !== 1 ? 's' : ''}</span>
        </div>
        <div className="dashboard-meta-item">
          <Clock size={11} />
          <span>{formatRelative(project.updatedAt)}</span>
        </div>
        {project.currentRevision && (
          <div className="dashboard-meta-item">
            <Bookmark size={11} />
            <span>{project.currentRevision}</span>
          </div>
        )}
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
          <span>Progress</span>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{progress}%</span>
        </div>
        <div style={{ height: 4, background: 'var(--surface-hover)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? 'var(--pass)' : 'var(--brand)', borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>
      </div>
      <div className="dashboard-project-footer" onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-sm" onClick={() => onDuplicate(project.id)}>
          <Copy size={11} /> Duplicate
        </button>
        {!project.archived ? (
          <button className="btn btn-sm" onClick={() => onArchive(project.id)}>
            <Archive size={11} /> Archive
          </button>
        ) : (
          <button className="btn btn-sm" onClick={() => onUnarchive(project.id)}>
            <ArchiveRestore size={11} /> Restore
          </button>
        )}
        <button className="btn btn-sm" onClick={() => onDelete(project.id)} style={{ color: 'var(--fail)' }}>
          <Trash2 size={11} />
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
  const activeProject = projects.find((p) => p.id === activeProjectId) || null

  const handleNew = () => {
    createProject({
      projectNumber: `ECP${new Date().getFullYear()}-${String(projects.length + 1).padStart(3, '0')}`,
    })
    navigate('/project')
  }

  const stations = activeProject?.stations || []
  const calculatedStations = stations.filter((s) => s.lastCalcResult)
  const totalStations = stations.length
  const hasFailures = calculatedStations.some((s) =>
    (s.lastCalcResult?.checks || []).some((c) => c.status === 'fail')
  )
  const allValidated = calculatedStations.length > 0 && !hasFailures
  const totalValidationErrors = stations.reduce((acc, s) => acc + (s.validationErrors?.length || 0), 0)

  // Compute total pipeline length
  const totalPipelineM = stations.reduce((acc, s) => {
    if (s.pipelineSegments && Array.isArray(s.pipelineSegments)) {
      return acc + s.pipelineSegments.reduce((sum, seg) => sum + (parseFloat(seg.lengthM) || 0), 0)
    }
    return acc
  }, 0)

  // Total groundbeds
  const groundbedCount = stations.filter((s) => s.groundbed?.type).length

  // TR units count
  const trCount = stations.filter((s) => s.tr).length

  // Build recent activity
  const recentActivity = stations
    .flatMap((s) => {
      const events = []
      if (s.lastCalcResult?.calculatedAt) events.push({ station: s.name, kind: 'calc', text: 'Calculation run', ts: s.lastCalcResult.calculatedAt })
      if (s.status === 'approved' || s.status === 'issued_for_construction') events.push({ station: s.name, kind: 'approval', text: 'Station approved', ts: s.updatedAt || new Date().toISOString() })
      if (s.status === 'engineering_review') events.push({ station: s.name, kind: 'revision', text: 'In engineering review', ts: s.updatedAt || new Date().toISOString() })
      return events
    })
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .slice(0, 10)

  // Workflow module definitions
  const workflowModules = [
    { id: 'current', label: 'Current Req.', icon: Zap, path: '/current', status: calculatedStations.length > 0 ? 'done' : 'pending', value: calculatedStations.length > 0 ? `${calculatedStations[0]?.lastCalcResult?.totalCurrentAmps?.toFixed(2) || '—'} A` : null },
    { id: 'groundbed', label: 'Groundbed', icon: Layers, path: '/groundbed', status: stations.some((s) => s.lastCalcResult?.groundbedResistanceOhm != null) ? 'done' : 'pending', value: null },
    { id: 'cable', label: 'Cable Resistance', icon: Cable, path: '/cable', status: stations.some((s) => s.lastCalcResult?.totalCableResOhm != null) ? 'done' : 'pending', value: null },
    { id: 'tr', label: 'TR Sizing', icon: Cpu, path: '/tr', status: stations.some((s) => s.lastCalcResult?.trRatedVoltage != null) ? 'done' : 'pending', value: null },
    { id: 'attenuation', label: 'Attenuation', icon: Signal, path: '/attenuation', status: stations.some((s) => s.lastCalcResult?.attenuationPercent != null) ? 'done' : 'pending', value: null },
    { id: 'validation', label: 'Validation', icon: ClipboardCheck, path: '/validation', status: allValidated ? 'done' : totalValidationErrors > 0 ? 'in-progress' : 'pending', value: allValidated ? 'All passed' : totalValidationErrors > 0 ? `${totalValidationErrors} issues` : null },
    { id: 'optimizer', label: 'Optimizer', icon: Activity, path: '/optimizer', status: 'pending', value: null },
  ]

  return (
    <div className="enterprise-page" style={{ padding: '0' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>Project Dashboard</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {activeProjects.length} active project{activeProjects.length !== 1 ? 's' : ''}
            {archivedProjects.length > 0 && ` · ${archivedProjects.length} archived`}
            {activeProject ? ` · ${activeProject.projectName}` : ''}
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
        <>
          {/* KPI Top Row */}
          {activeProject && (
            <div className="kpi-row">
              <div className={`kpi-card ${allValidated ? 'kpi-card--pass' : hasFailures ? 'kpi-card--fail' : 'kpi-card--brand'}`}>
                <div className="kpi-card__label">Project Health</div>
                <div className="kpi-card__value" style={{ color: allValidated ? 'var(--pass)' : hasFailures ? 'var(--fail)' : 'var(--text-tertiary)' }}>
                  {allValidated ? 'PASS' : hasFailures ? 'ISSUES' : 'PENDING'}
                </div>
                <div className="kpi-card__sub">
                  {calculatedStations.length} of {totalStations} stations calculated
                </div>
              </div>

              <div className="kpi-card kpi-card--info">
                <div className="kpi-card__label">Pipeline Length</div>
                <div className="kpi-card__value">
                  {totalPipelineM > 0 ? totalPipelineM.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '—'}
                </div>
                <div className="kpi-card__sub">meters · {totalStations} station{totalStations !== 1 ? 's' : ''}</div>
              </div>

              <div className="kpi-card kpi-card--brand">
                <div className="kpi-card__label">Groundbeds</div>
                <div className="kpi-card__value">{groundbedCount || '—'}</div>
                <div className="kpi-card__sub">
                  {stations.filter((s) => s.groundbed?.type === 'deepwell').length} deepwell · {stations.filter((s) => s.groundbed?.type === 'shallow').length} shallow
                </div>
              </div>

              <div className="kpi-card kpi-card--brand">
                <div className="kpi-card__label">TR Units</div>
                <div className="kpi-card__value">{trCount || '—'}</div>
                <div className="kpi-card__sub">Transformer-Rectifier units</div>
              </div>

              <div className={`kpi-card ${totalValidationErrors === 0 ? 'kpi-card--pass' : 'kpi-card--warn'}`}>
                <div className="kpi-card__label">Validation</div>
                <div className="kpi-card__value" style={{ color: totalValidationErrors === 0 ? 'var(--pass)' : 'var(--warn)' }}>
                  {totalValidationErrors === 0 ? 'CLEAN' : totalValidationErrors}
                </div>
                <div className="kpi-card__sub">
                  {totalValidationErrors === 0 ? 'All checks passed' : 'open validation issues'}
                </div>
              </div>

              <div className="kpi-card kpi-card--info">
                <div className="kpi-card__label">Design Standard</div>
                <div className="kpi-card__value" style={{ fontSize: 16, fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
                  {getActiveStandard(activeProject)?.label || activeProject.designStandard || 'NACE'}
                </div>
                <div className="kpi-card__sub">Active engineering standard</div>
              </div>
            </div>
          )}

          {/* KPI Trend Row — 4 mini charts derived from project.revisions */}
          {activeProject && (activeProject.revisions?.length ?? 0) > 0 && (
            <div className="section-card" style={{ marginTop: 12 }}>
              <div className="section-card-header">
                <span className="section-card-title">KPI Trends</span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  Across {activeProject.revisions.length} revision{activeProject.revisions.length !== 1 ? 's' : ''} · derived from project.revisions[].snapshot
                </span>
              </div>
              <div className="section-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <KPITrendWidget
                    data={extractTrendData(activeProject, 'totalStations')}
                    label="Stations"
                    unit=""
                    color="var(--brand-mid)"
                    height={120}
                  />
                </div>
                <div>
                  <KPITrendWidget
                    data={extractTrendData(activeProject, 'totalPipelineM')}
                    label="Pipeline Length"
                    unit="m"
                    color="var(--brand-mid)"
                    height={120}
                  />
                </div>
                <div>
                  <KPITrendWidget
                    data={extractTrendData(activeProject, 'groundbedCount')}
                    label="Groundbeds"
                    unit=""
                    color="var(--brand-mid)"
                    height={120}
                  />
                </div>
                <div>
                  <KPITrendWidget
                    data={extractTrendData(activeProject, 'validationErrors')}
                    label="Validation Errors"
                    unit=""
                    color="var(--warn)"
                    thresholds={{ warn: 0.5, pass: 0 }}
                    height={120}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pipeline Overview Viz — Full Width */}
          {activeProject && stations.length > 0 && (
            <div className="viz-fullwidth" style={{ minHeight: 440 }}>
              <div className="viz-fullwidth__header">
                <div className="viz-fullwidth__title">
                  <LayoutDashboard size={14} />
                  Pipeline Overview
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {activeProject.projectName} · {totalStations} station{totalStations !== 1 ? 's' : ''} · {totalPipelineM > 0 ? totalPipelineM.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' m' : ''}
                </div>
              </div>
              <div className="viz-fullwidth__body" style={{ minHeight: 390, padding: 8 }}>
                <PipelineOverviewCanvas stations={stations} />
              </div>
            </div>
          )}

          {/* Engineering Modules Progress — Workflow Cards */}
          {activeProject && (
            <>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '4px 0 0' }}>
                Engineering Modules
              </h3>
              <div className="workflow-grid">
                {workflowModules.map((mod) => (
                  <button
                    key={mod.id}
                    className="workflow-card"
                    onClick={() => navigate(mod.path)}
                    style={{ textAlign: 'left', fontFamily: 'inherit' }}
                  >
                    <div className="workflow-card__header">
                      <div className="workflow-card__icon">
                        <mod.icon size={15} />
                      </div>
                      <div className={`workflow-card__status workflow-card__status--${mod.status}`} />
                    </div>
                    <div className="workflow-card__title">{mod.label}</div>
                    {mod.value ? (
                      <div className="workflow-card__value">{mod.value}</div>
                    ) : (
                      <div className="workflow-card__sub">
                        {mod.status === 'done' ? 'Complete' : mod.status === 'in-progress' ? 'Needs attention' : 'Not started'}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Recent Activity */}
          {activeProject && recentActivity.length > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                Recent Activity
              </h3>
              <div className="activity-feed">
                {recentActivity.map((ev, i) => (
                  <div key={i} className="activity-feed__item">
                    <div className={`activity-feed__dot activity-feed__dot--${ev.kind}`} />
                    <span className="activity-feed__label">
                      <strong>{ev.station}</strong> · {ev.text}
                    </span>
                    <span className="activity-feed__time">
                      {new Date(ev.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Project Map — multi-project rollup (geo or grid view) */}
          {activeProjects.length > 1 && (
            <div className="section-card" style={{ marginTop: 12 }}>
              <div className="section-card-header">
                <span className="section-card-title">Project Overview</span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  {activeProjects.length} active · click to switch
                </span>
              </div>
              <div className="section-card-body">
                <ProjectOverviewMap
                  projects={activeProjects.map((p) => ({
                    id: p.id,
                    name: p.name,
                    number: p.number,
                    client: p.client,
                    standard: getActiveStandard(p)?.label || p.designStandard,
                    status: p.status,
                    location: p.location,
                  }))}
                  onProjectClick={(p) => switchProject(p.id)}
                  height={300}
                />
              </div>
            </div>
          )}

          {/* Project Cards — for project management */}
          <div style={{ marginTop: 8 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)', marginBottom: 10 }}>
              {activeProjects.length} Active Project{activeProjects.length !== 1 ? 's' : ''}
            </h3>
            <div className="dashboard-project-grid">
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
          </div>

          {archivedProjects.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)', marginBottom: 10 }}>
                {archivedProjects.length} Archived Project{archivedProjects.length !== 1 ? 's' : ''}
              </h3>
              <div className="dashboard-project-grid">
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
            </div>
          )}
        </>
      )}
    </div>
  )
}
