/* eslint-disable react-hooks/preserve-manual-memoization */
/**
 * PageDashboard.jsx
 *
 * Enterprise Project Dashboard — KPIs, pipeline overview, workflow modules,
 * recent activity, and project management.
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore.js'
import { useAuthStore } from '../store/authStore.js'
import { StatusBadge } from '../components/ui.jsx'
import { getActiveStandard } from '../constants/index.js'
import { KPITrendWidget, extractTrendData } from '../visualizations/KPITrendWidget.jsx'
import { ProjectOverviewMap } from '../visualizations/ProjectOverviewMap.jsx'
import { subscribeToActivity } from '../services/activityLogger.js'
import { DashboardCommandCenter } from '../components/DashboardCommandCenter.jsx'
import { workspaceRegistry } from '../config/workspaceRegistry.js'
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
  Shield,
  Database,
  ClipboardCheck,
  CheckCircle,
  Activity,
  Route,
  AlertTriangle,
  AlertCircle,
  FileText,
  Download,
  FileSpreadsheet,
  RefreshCw,
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

const WORKSPACE_ICON_MAP = {
  Route,
  Layers,
  Database,
  Cpu,
  Signal,
  Shield,
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
  
  // Dashboard 3.0 Store Actions
  const addStation = useProjectStore((s) => s.addStation)
  const calculateAllStations = useProjectStore((s) => s.calculateAllStations)
  const createRevision = useProjectStore((s) => s.createRevision)
  const activeWorkspace = useProjectStore((s) => s.activeWorkspace)
  const setActiveWorkspace = useProjectStore((s) => s.setActiveWorkspace)
  const setActiveStation = useProjectStore((s) => s.setActiveStation)
  // V5: digitalTwin slice for Station Health Matrix health/risk columns
  const digitalTwin = useProjectStore((s) => s.digitalTwin)

  // Dashboard 3.0 Local State
  const [calculating, setCalculating] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [xlsxLoading, setXlsxLoading] = useState(false)
  const [showRevModal, setShowRevModal] = useState(false)
  const [revDescription, setRevDescription] = useState('')

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

  // Real activity feed (Firestore subscription) — replaces the derived feed
  const [realActivity, setRealActivity] = useState([])
  useEffect(() => {
    if (!activeProject?.id) {
      Promise.resolve().then(() => {
        setRealActivity([])
      })
      return undefined
    }
    const unsub = subscribeToActivity(activeProject.id, (entries) => setRealActivity(entries), 10)
    return () => { if (typeof unsub === 'function') unsub() }
  }, [activeProject?.id])

  // Fall back to the derived feed if no real activity yet (so the section isn't empty on first load)
  const activityToShow = realActivity.length > 0 ? null : stations
    .flatMap((s) => {
      const events = []
      if (s.lastCalcResult?.calculatedAt) events.push({ id: `calc-${s.id}`, station: s.name, kind: 'calc', text: 'Calculation run', ts: s.lastCalcResult.calculatedAt })
      if (s.status === 'approved' || s.status === 'issued_for_construction') events.push({ id: `app-${s.id}`, station: s.name, kind: 'approval', text: 'Station approved', ts: s.updatedAt || new Date().toISOString() })
      if (s.status === 'engineering_review') events.push({ id: `rev-${s.id}`, station: s.name, kind: 'revision', text: 'In engineering review', ts: s.updatedAt || new Date().toISOString() })
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

  // Dashboard 3.0 Engineering Metrics
  const totalDesignCurrent = useMemo(() => {
    return stations.reduce((acc, s) => {
      return acc + (s.lastCalcResult?.designCurrentA || s.lastCalcResult?.requiredCurrentA || 0)
    }, 0)
  }, [stations])

  const totalAnodeCount = useMemo(() => {
    return stations.reduce((acc, s) => acc + (s.proposedAnodes || 0), 0)
  }, [stations])

  const shortestDesignLife = useMemo(() => {
    const lives = stations
      .map((s) => s.lastCalcResult?.designLifeYears)
      .filter((v) => typeof v === 'number' && v > 0)
    return lives.length > 0 ? Math.min(...lives) : null
  }, [stations])

  const checkTotals = useMemo(() => {
    let pass = 0
    let fail = 0
    let warn = 0
    stations.forEach((s) => {
      const checks = s.lastCalcResult?.checks
      if (Array.isArray(checks)) {
        checks.forEach((c) => {
          if (c.status === 'pass') pass++
          else if (c.status === 'fail') fail++
          else if (c.status === 'warn') warn++
        })
      }
    })
    return { pass, fail, warn, total: pass + fail + warn }
  }, [stations])

  // Dashboard 3.0 Action Handlers
  const handleNewStation = () => {
    addStation()
    if (typeof window !== 'undefined' && window.__raxaToast) {
      window.__raxaToast.success('Station Created', 'A new Impressed Current Cathodic Protection station was added.')
    }
  }

  const handleCalculateAll = async () => {
    setCalculating(true)
    try {
      calculateAllStations()
      if (typeof window !== 'undefined' && window.__raxaToast) {
        window.__raxaToast.success('Calculations Completed', 'All pipeline stations have been successfully re-calculated.')
      }
    } catch (e) {
      if (typeof window !== 'undefined' && window.__raxaToast) {
        window.__raxaToast.error('Calculations Failed', e.message)
      }
    } finally {
      setCalculating(false)
    }
  }

  const handleExportPDF = async () => {
    setPdfLoading(true)
    try {
      const { downloadEngineeringReport } = await import('../reporting/pdfGenerator.js')
      downloadEngineeringReport(activeProject)
      if (typeof window !== 'undefined' && window.__raxaToast) {
        window.__raxaToast.success('PDF Exported', 'Engineering report downloaded successfully.')
      }
    } catch (e) {
      if (typeof window !== 'undefined' && window.__raxaToast) {
        window.__raxaToast.error('PDF Export Failed', e.message)
      }
    } finally {
      setTimeout(() => setPdfLoading(false), 1000)
    }
  }

  const handleExportExcel = async () => {
    setXlsxLoading(true)
    try {
      const { exportToExcel } = await import('../reporting/excelEngine.js')
      exportToExcel(activeProject)
      if (typeof window !== 'undefined' && window.__raxaToast) {
        window.__raxaToast.success('Excel Exported', 'Data sheet exported successfully.')
      }
    } catch (e) {
      if (typeof window !== 'undefined' && window.__raxaToast) {
        window.__raxaToast.error('Excel Export Failed', e.message)
      }
    } finally {
      setTimeout(() => setXlsxLoading(false), 800)
    }
  }

  const handleCreateRevision = (e) => {
    e.preventDefault()
    if (!revDescription.trim()) return
    createRevision(revDescription.trim())
    setRevDescription('')
    setShowRevModal(false)
    if (typeof window !== 'undefined' && window.__raxaToast) {
      window.__raxaToast.success('Revision Created', 'A new design revision snapshot has been saved.')
    }
  }

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
          {activeProject?.dashboardV3Enabled ? (
            <div className="dashboard-v3-container" data-testid="dashboard-v3" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Engineering KPI strip */}
              <div className="kpi-strip">
                <div className="kpi-strip-card kpi-strip-card--brand">
                  <div className="kpi-strip-card__label">
                    <Zap size={13} className="quick-action-btn__icon" />
                    <span>Total Design Current</span>
                  </div>
                  <div className="kpi-strip-card__value">
                    {totalDesignCurrent > 0 ? `${totalDesignCurrent.toFixed(2)} A` : '—'}
                  </div>
                  <div className="kpi-strip-card__sub">Sum of all station design loads</div>
                </div>

                <div className="kpi-strip-card kpi-strip-card--info">
                  <div className="kpi-strip-card__label">
                    <Layers size={13} className="quick-action-btn__icon" />
                    <span>Total Anode Count</span>
                  </div>
                  <div className="kpi-strip-card__value">
                    {totalAnodeCount > 0 ? `${totalAnodeCount} ea` : '—'}
                  </div>
                  <div className="kpi-strip-card__sub">Across {totalStations} CP station{totalStations !== 1 ? 's' : ''}</div>
                </div>

                <div className="kpi-strip-card kpi-strip-card--brand">
                  <div className="kpi-strip-card__label">
                    <Clock size={13} className="quick-action-btn__icon" />
                    <span>Shortest Design Life</span>
                  </div>
                  <div className="kpi-strip-card__value">
                    {shortestDesignLife !== null ? `${shortestDesignLife.toFixed(1)} yrs` : '—'}
                  </div>
                  <div className="kpi-strip-card__sub">Target: {activeProject.designBasis?.systemDesignLifeYears || 25} years</div>
                </div>

                <div className={`kpi-strip-card ${checkTotals.fail > 0 ? 'kpi-strip-card--fail' : checkTotals.warn > 0 ? 'kpi-strip-card--warn' : 'kpi-strip-card--pass'}`}>
                  <div className="kpi-strip-card__label">
                    <ClipboardCheck size={13} className="quick-action-btn__icon" />
                    <span>Validation Status</span>
                  </div>
                  <div className="kpi-strip-card__value" style={{ fontSize: '18px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {checkTotals.total > 0 ? (
                      <>
                        <span style={{ color: 'var(--pass)', fontWeight: 700 }}>{checkTotals.pass}✓</span>
                        {checkTotals.warn > 0 && <span style={{ color: 'var(--warn)', fontWeight: 700 }}>{checkTotals.warn}⚠</span>}
                        {checkTotals.fail > 0 && <span style={{ color: 'var(--fail)', fontWeight: 700 }}>{checkTotals.fail}✗</span>}
                      </>
                    ) : (
                      <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>No checks run</span>
                    )}
                  </div>
                  <div className="kpi-strip-card__sub">
                    {checkTotals.fail > 0 ? `${checkTotals.fail} critical failures` : checkTotals.warn > 0 ? `${checkTotals.warn} warning flags` : 'All checks passing'}
                  </div>
                </div>
              </div>

              {/* Main Content Layout Grid */}
              <div className="enterprise-2col enterprise-2col--viz-dominant">
                {/* Left Column: Station Health Matrix (V5 — command center format) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Station Health Matrix — V5 command center format */}
                  <div className="section-card">
                    <div className="section-card-header">
                      <span className="section-card-title">
                        <Activity size={14} />
                        Station Health Matrix
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        {calculatedStations.length} of {totalStations} stations calculated
                      </span>
                    </div>
                    <div className="section-card-body">
                      <div className="station-matrix-grid">
                        {stations.map((st) => {
                          const r = st.lastCalcResult
                          const hasErrors = st.validationErrors?.length > 0 || (r?.checks || []).some(c => c.status === 'fail')
                          const hasWarnings = (r?.checks || []).some(c => c.status === 'warn')
                          const isCalc = !!r
                          const warningCount = (r?.checks || []).filter(c => c.status === 'warn').length

                          // Health Score — prefer digitalTwin slice; fall back to check-derived
                          const dtHealth = digitalTwin?.healthScores?.[st.id]?.score
                          const derivedScore = isCalc && r?.checks?.length > 0
                            ? Math.round((r.checks.filter(c => c.status === 'pass').length / r.checks.length) * 100)
                            : null
                          const healthScore = dtHealth != null ? dtHealth : derivedScore

                          // Risk Level — from digitalTwin slice
                          const riskLevel = digitalTwin?.riskAssessments?.[st.id]?.riskLevel?.toUpperCase() || '—'

                          // Validation status
                          const validation = !isCalc ? '—' : hasErrors ? 'FAIL' : hasWarnings ? 'WARN' : 'PASS'

                          // Compliance — NACE/SAES/ISO derived from validation
                          const compliance = !isCalc ? '—' : hasErrors ? 'FAIL' : 'PASS'

                          // Health dot color from score
                          let dotColor = 'var(--text-tertiary)'
                          if (healthScore != null) {
                            if (healthScore >= 75) dotColor = 'var(--pass)'
                            else if (healthScore >= 50) dotColor = 'var(--warn)'
                            else dotColor = 'var(--fail)'
                          }

                          return (
                            <div
                              key={st.id}
                              className="station-matrix-card"
                              onClick={() => {
                                setActiveStation(st.id)
                                navigate('/project')
                              }}
                            >
                              <div className="station-matrix-card__header">
                                <span className="station-matrix-card__name" style={{ fontWeight: '600' }}>{st.name}</span>
                                <div
                                  className="station-matrix-card__health-dot"
                                  style={{ background: dotColor }}
                                  title={healthScore != null ? `Health ${healthScore}%` : 'Pending'}
                                />
                              </div>
                              <div className="station-matrix-card__body">
                                <div className="station-matrix-card__metric">
                                  <span className="station-matrix-card__metric-label">Health Score</span>
                                  <span className="station-matrix-card__metric-value">
                                    {healthScore != null ? `${healthScore}%` : '—'}
                                  </span>
                                </div>
                                <div className="station-matrix-card__metric">
                                  <span className="station-matrix-card__metric-label">Risk</span>
                                  <span
                                    className="station-matrix-card__metric-value"
                                    style={{
                                      color: riskLevel === 'LOW' ? 'var(--pass)' :
                                             riskLevel === 'MEDIUM' ? 'var(--warn)' :
                                             riskLevel === 'HIGH' || riskLevel === 'CRITICAL' ? 'var(--fail)' : undefined,
                                    }}
                                  >
                                    {riskLevel}
                                  </span>
                                </div>
                                <div className="station-matrix-card__metric">
                                  <span className="station-matrix-card__metric-label">Design Life</span>
                                  <span className="station-matrix-card__metric-value">
                                    {r ? `${r.designLifeYears.toFixed(1)} yrs` : '—'}
                                  </span>
                                </div>
                                <div className="station-matrix-card__metric">
                                  <span className="station-matrix-card__metric-label">Validation</span>
                                  <span
                                    className="station-matrix-card__metric-value"
                                    style={{
                                      color: validation === 'PASS' ? 'var(--pass)' :
                                             validation === 'WARN' ? 'var(--warn)' :
                                             validation === 'FAIL' ? 'var(--fail)' : undefined,
                                    }}
                                  >
                                    {validation}
                                  </span>
                                </div>
                                <div className="station-matrix-card__metric">
                                  <span className="station-matrix-card__metric-label">Compliance</span>
                                  <span
                                    className="station-matrix-card__metric-value"
                                    style={{
                                      color: compliance === 'PASS' ? 'var(--pass)' :
                                             compliance === 'FAIL' ? 'var(--fail)' : undefined,
                                    }}
                                  >
                                    {compliance}
                                  </span>
                                </div>
                                <div className="station-matrix-card__metric">
                                  <span className="station-matrix-card__metric-label">Warnings</span>
                                  <span
                                    className="station-matrix-card__metric-value"
                                    style={{ color: warningCount > 0 ? 'var(--warn)' : undefined }}
                                  >
                                    {isCalc ? warningCount : '—'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Actions & Log */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Quick Action Panel */}
                  <div className="section-card">
                    <div className="section-card-header">
                      <span className="section-card-title">
                        <Zap size={14} />
                        Quick Actions
                      </span>
                    </div>
                    <div className="section-card-body">
                      <div className="quick-action-grid">
                        <button className="quick-action-btn" onClick={handleNewStation}>
                          <Plus className="quick-action-btn__icon" size={20} />
                          <span className="quick-action-btn__label">Add Station</span>
                        </button>
                        <button
                          className="quick-action-btn"
                          onClick={handleCalculateAll}
                          disabled={calculating}
                        >
                          <RefreshCw className={`quick-action-btn__icon ${calculating ? 'spin' : ''}`} size={20} />
                          <span className="quick-action-btn__label">{calculating ? 'Calculating…' : 'Calculate All'}</span>
                        </button>
                        <button
                          className="quick-action-btn"
                          onClick={handleExportPDF}
                          disabled={pdfLoading || calculatedStations.length === 0}
                          title={calculatedStations.length === 0 ? 'Run calculations first' : 'Export engineering report to PDF'}
                        >
                          <Download className="quick-action-btn__icon" size={20} />
                          <span className="quick-action-btn__label">{pdfLoading ? 'Exporting…' : 'Export PDF'}</span>
                        </button>
                        <button
                          className="quick-action-btn"
                          onClick={() => setShowRevModal(true)}
                        >
                          <FileText className="quick-action-btn__icon" size={20} />
                          <span className="quick-action-btn__label">Create Rev</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Activity feed */}
                  {(realActivity.length > 0 || activityToShow?.length > 0) && (
                    <div className="section-card">
                      <div className="section-card-header">
                        <span className="section-card-title">
                          <Activity size={14} />
                          Recent Engineering Activity
                        </span>
                        {realActivity.length > 0 && <span style={{ fontSize: 9, color: 'var(--pass)', fontWeight: 400 }}>● live</span>}
                      </div>
                      <div className="section-card-body" style={{ padding: '12px 14px' }}>
                        <div className="activity-feed">
                          {(realActivity.length > 0 ? realActivity : activityToShow).map((ev, i) => (
                            <div key={ev.id || i} className="activity-feed__item">
                              <div className={`activity-feed__dot activity-feed__dot--${ev.kind || 'info'}`} />
                              <span className="activity-feed__label" style={{ fontSize: '11.5px' }}>
                                {realActivity.length > 0 ? (
                                  <><strong>{ev.userEmail}</strong> · <em>{ev.action}</em>{ev.details ? ` — ${ev.details}` : ''}</>
                                ) : (
                                  <><strong>{ev.station}</strong> · {ev.text}</>
                                )}
                              </span>
                              <span className="activity-feed__time" style={{ fontSize: '10px' }}>
                                {new Date(ev.timestamp || ev.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Workspace Switcher */}
              <div className="section-card" style={{ marginTop: 8 }}>
                <div className="section-card-header">
                  <span className="section-card-title">
                    <LayoutDashboard size={14} />
                    Engineering Workspaces
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    Switch active cathodic protection design environment
                  </span>
                </div>
                <div className="section-card-body">
                  <div className="workspace-switcher-grid">
                    {Object.values(workspaceRegistry).map((m) => {
                      const IconComponent = WORKSPACE_ICON_MAP[m.iconName] || Route
                      const isActive = activeWorkspace === m.id
                      const isAvailable = m.enabled

                      const handleSelectWorkspace = (workspaceId) => {
                        const registryEntry = workspaceRegistry[workspaceId]
                        if (registryEntry && registryEntry.enabled) {
                          setActiveWorkspace(workspaceId)
                          if (workspaceId === 'pipeline') {
                            navigate('/dashboard')
                          } else if (workspaceId === 'tank') {
                            navigate('/tank')
                          } else if (workspaceId === 'vessel') {
                            navigate('/vessel')
                          }
                        }
                      }

                      return (
                        <div
                          key={m.id}
                          className={`workspace-switcher-card ${isActive ? 'workspace-switcher-card--active' : ''}`}
                          onClick={() => isAvailable && !isActive && handleSelectWorkspace(m.id)}
                          style={{ opacity: isAvailable ? 1 : 0.5, cursor: isAvailable ? 'pointer' : 'not-allowed' }}
                        >
                          <div className="workspace-switcher-card__header">
                            <div className="workspace-switcher-card__icon">
                              <IconComponent size={20} />
                            </div>
                            <span className="workspace-badge" style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: '20px',
                              textTransform: 'uppercase',
                              background: isActive ? 'var(--pass-bg)' : isAvailable ? 'var(--surface-hover)' : 'var(--surface-hover)',
                              color: isActive ? 'var(--pass)' : isAvailable ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                              border: isActive ? 'none' : '1px solid var(--border)'
                            }}>
                              {isActive ? 'Active' : isAvailable ? 'Available' : 'Soon'}
                            </span>
                          </div>
                          <div className="workspace-switcher-card__body">
                            <div className="workspace-switcher-card__title">{m.name}</div>
                            <div className="workspace-switcher-card__desc">{m.description}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Phase 6: Dashboard 3.0 — Engineering Command Center */}
              {activeProject?.dashboardV3Enabled && (
                <DashboardCommandCenter project={activeProject} />
              )}

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

              {/* V5: Pipeline Overview moved to Digital Twin Center → Asset Explorer. Dashboard is a command center, not a visualization surface. */}

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

              {/* Recent Activity — real (Firestore) or derived fallback */}
              {activeProject && (realActivity.length > 0 || activityToShow?.length > 0) && (
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', boxShadow: 'var(--shadow-sm)' }}>
                  <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                    Recent Activity {realActivity.length > 0 ? <span style={{ fontSize: 9, color: 'var(--pass)', fontWeight: 400, marginLeft: 6 }}>● live</span> : null}
                  </h3>
                  <div className="activity-feed">
                    {(realActivity.length > 0 ? realActivity : activityToShow).map((ev, i) => (
                      <div key={ev.id || i} className="activity-feed__item">
                        <div className={`activity-feed__dot activity-feed__dot--${ev.kind || 'info'}`} />
                        <span className="activity-feed__label">
                          {realActivity.length > 0 ? (
                            <><strong>{ev.userEmail}</strong> · <em>{ev.action}</em>{ev.details ? ` — ${ev.details}` : ''}</>
                          ) : (
                            <><strong>{ev.station}</strong> · {ev.text}</>
                          )}
                        </span>
                        <span className="activity-feed__time">
                          {new Date(ev.timestamp || ev.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
        </>
      )}

      {/* Create Revision Modal */}
      {showRevModal && (
        <div className="dialog-overlay" role="dialog" aria-modal="true" style={{ zIndex: 1000 }} onClick={() => setShowRevModal(false)}>
          <div className="dialog" style={{ width: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title" style={{ display: 'flex', alignItems: 'center', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
              <FileText size={18} style={{ marginRight: 8, color: 'var(--brand-mid)' }} />
              Create Project Revision Snapshot
            </div>
            <p className="dialog-message" style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 16px', lineHeight: '1.4' }}>
              Creating a revision saves a permanent, read-only snapshot of the current design. You will be able to restore or compare against this revision later.
            </p>
            <form onSubmit={handleCreateRevision}>
              <div className="field" style={{ marginBottom: 16 }}>
                <label htmlFor="rev-desc-input" className="field-label" style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: 6 }}>Description of changes</label>
                <input
                  id="rev-desc-input"
                  className="field-input"
                  placeholder="e.g., Updated soil resistivity measurements for Station 3"
                  value={revDescription}
                  onChange={(e) => setRevDescription(e.target.value)}
                  autoFocus
                  required
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius)' }}
                />
              </div>
              <div className="dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn" onClick={() => setShowRevModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!revDescription.trim()}>
                  Save Revision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
