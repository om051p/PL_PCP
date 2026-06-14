import { Component, useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { MotionConfig, motion } from 'framer-motion'
import { useProjectStore } from './store/projectStore.js'
import { Sidebar, TopBar } from './components/layout.jsx'
import { ProtectedRoute, PublicRoute, RoleRoute } from './components/ProtectedRoute.jsx'
import { SessionTimeoutDialog } from './components/SessionTimeoutDialog.jsx'
import { ConfirmDialogHost } from './components/ConfirmDialog.jsx'
import { SaveIndicator } from './components/SaveIndicator.jsx'
import { useSessionTimeout } from './hooks/useSessionTimeout.js'
import { OfflineStatusBar } from './components/OfflineStatusBar.jsx'

// Lazy loaded page components
const LoginPage = lazy(() => import('./pages/LoginPage.jsx').then(m => ({ default: m.LoginPage })))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx').then(m => ({ default: m.ForgotPasswordPage })))
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx').then(m => ({ default: m.RegisterPage })))

const PageProjectSetup = lazy(() => import('./pages/PageProjectSetup.jsx').then(m => ({ default: m.PageProjectSetup })))
const PagePipeline = lazy(() => import('./pages/PagePipeline.jsx').then(m => ({ default: m.PagePipeline })))
const PageSoilResistivity = lazy(() => import('./pages/PageSoilResistivity.jsx').then(m => ({ default: m.PageSoilResistivity })))
const PageCurrentRequirement = lazy(() => import('./pages/PageCurrentRequirement.jsx').then(m => ({ default: m.PageCurrentRequirement })))
const PageGroundbed = lazy(() => import('./pages/PageGroundbed.jsx').then(m => ({ default: m.PageGroundbed })))
const PageCableResistance = lazy(() => import('./pages/PageCableResistance.jsx').then(m => ({ default: m.PageCableResistance })))
const PageTRSizing = lazy(() => import('./pages/PageTRSizing.jsx').then(m => ({ default: m.PageTRSizing })))
const PageValidation = lazy(() => import('./pages/PageValidation.jsx').then(m => ({ default: m.PageValidation })))
const PageOptimizer = lazy(() => import('./pages/PageOptimizer.jsx').then(m => ({ default: m.PageOptimizer })))
const PageBOM = lazy(() => import('./pages/PageBOM.jsx').then(m => ({ default: m.PageBOM })))
const PageReport = lazy(() => import('./pages/PageReport.jsx').then(m => ({ default: m.PageReport })))
const PageImport = lazy(() => import('./pages/PageImport.jsx').then(m => ({ default: m.PageImport })))
const PageAttenuation = lazy(() => import('./pages/PageAttenuation.jsx').then(m => ({ default: m.PageAttenuation })))
const PageWorkspace = lazy(() => import('./pages/PageWorkspace.jsx').then(m => ({ default: m.PageWorkspace })))
const PageTank = lazy(() => import('./pages/PageTank.jsx').then(m => ({ default: m.PageTank })))
const PageVessel = lazy(() => import('./pages/PageVessel.jsx').then(m => ({ default: m.PageVessel })))
const PageHistory = lazy(() => import('./pages/PageHistory.jsx').then(m => ({ default: m.PageHistory })))
const PageCompliance = lazy(() => import('./pages/PageCompliance.jsx').then(m => ({ default: m.PageCompliance })))
const PageSensitivity = lazy(() => import('./pages/PageSensitivity.jsx').then(m => ({ default: m.PageSensitivity })))
const PageLogs = lazy(() => import('./pages/PageLogs.jsx').then(m => ({ default: m.PageLogs })))
const PageKnowledge = lazy(() => import('./pages/PageKnowledge.jsx').then(m => ({ default: m.PageKnowledge })))

const PageDashboard = lazy(() => import('./pages/PageDashboard.jsx'))
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'))
const UserManagementPage = lazy(() => import('./pages/UserManagementPage.jsx'))

function PageSkeleton() {
  return (
    <div className="page-skeleton" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ height: '32px', width: '250px', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', opacity: 0.6, animation: 'pulse 1.5s infinite' }} />
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ height: '120px', flex: 1, background: 'var(--surface-hover)', borderRadius: 'var(--radius)', opacity: 0.6, animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: '120px', flex: 1, background: 'var(--surface-hover)', borderRadius: 'var(--radius)', opacity: 0.6, animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: '120px', flex: 1, background: 'var(--surface-hover)', borderRadius: 'var(--radius)', opacity: 0.6, animation: 'pulse 1.5s infinite' }} />
      </div>
      <div style={{ height: '300px', width: '100%', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', opacity: 0.6, animation: 'pulse 1.5s infinite' }} />
    </div>
  )
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, errorInfo: null, showDetails: false }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('[ErrorBoundary] Unhandled error:', error)
    if (errorInfo?.componentStack) {
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
    }
  }
  render() {
    if (this.state.error) {
      return (
        <motion.div
          className="error-boundary"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0.2, 1] }}
        >
          <div className="error-boundary-card">
            <div className="error-boundary-icon">!</div>
            <h2>Something went wrong</h2>
            <p className="error-boundary-message">
              {this.state.error.message || 'An unexpected error occurred while rendering this page.'}
            </p>
            {this.state.errorInfo?.componentStack && (
              <>
                <button
                  className="error-boundary-detail-toggle"
                  onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                >
                  {this.state.showDetails ? 'Hide Details ▲' : 'Show Details ▼'}
                </button>
                {this.state.showDetails && (
                  <div className="error-boundary-stack">
                    {this.state.errorInfo.componentStack}
                  </div>
                )}
              </>
            )}
            <button
              className="btn btn-primary"
              onClick={() => {
                this.setState({ error: null, errorInfo: null, showDetails: false })
                window.location.reload()
              }}
            >
              Reload Application
            </button>
          </div>
        </motion.div>
      )
    }
    return this.props.children
  }
}

const THEME_KEY = 'cp-designer-theme'

function getInitialTheme() {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
  const theme = useProjectStore((s) => s.ui.theme)
  const setTheme = useProjectStore((s) => s.setTheme)
  const activeWorkspace = useProjectStore((s) => s.activeWorkspace)
  const { showWarning, timeRemaining, staySignedIn } = useSessionTimeout()

  // Apply theme class on mount and on change
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  // Initialize theme on mount
  useEffect(() => {
    const initial = getInitialTheme()
    setTheme(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const content = document.querySelector('.page-content')
    if (content) content.scrollTop = 0
  }, [pathname])

  const getProject = useProjectStore((s) => s.getProject)
  const project = getProject()
  const stations = project?.stations || []
  const activeStationId = useProjectStore((s) => s.activeStationId)
  const setActiveStation = useProjectStore((s) => s.setActiveStation)
  if (!activeStationId && stations.length > 0) {
    setActiveStation(stations[0].id)
  }

  const isWorkspacePortal = pathname === '/workspace' || !activeWorkspace

  if (isWorkspacePortal) {
    return (
      <div className="portal-shell">
        <main className="portal-content">
          <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/workspace" element={<PageWorkspace />} />
                <Route path="*" element={<Navigate to="/workspace" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
        <SessionTimeoutDialog
          show={showWarning}
          timeRemaining={timeRemaining}
          onStaySignedIn={staySignedIn}
        />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="main-area">
        <TopBar />
        {project?.hasCalculationsMismatch && (
          <div className="warning-banner" style={{
            background: 'var(--bg-warning, #fdf6e2)',
            borderBottom: '1px solid var(--border-warning, #f5e0b3)',
            color: 'var(--text-warning, #b58900)',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'center',
            zIndex: 10
          }}>
            <span>⚠️</span>
            <span>Design Basis Out of Sync: Please recalculate to update output reports.</span>
          </div>
        )}
        <main className="page-content">
          <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={
                  activeWorkspace === 'tank' ? <Navigate to="/tank" replace /> :
                  activeWorkspace === 'vessel' ? <Navigate to="/vessel" replace /> :
                  <Navigate to="/dashboard" replace />
                } />
                <Route path="/dashboard" element={<PageDashboard />} />
                <Route path="/project" element={<RoleRoute requiredRole="engineer"><PageProjectSetup /></RoleRoute>} />
                <Route path="/pipeline" element={<RoleRoute requiredRole="engineer"><PagePipeline /></RoleRoute>} />
                <Route path="/resistivity" element={<RoleRoute requiredRole="engineer"><PageSoilResistivity /></RoleRoute>} />
                <Route path="/current" element={<RoleRoute requiredRole="engineer"><PageCurrentRequirement /></RoleRoute>} />
                <Route path="/groundbed" element={<RoleRoute requiredRole="engineer"><PageGroundbed /></RoleRoute>} />
                <Route path="/cable" element={<RoleRoute requiredRole="engineer"><PageCableResistance /></RoleRoute>} />
                <Route path="/tr" element={<RoleRoute requiredRole="engineer"><PageTRSizing /></RoleRoute>} />
                <Route path="/validation" element={<PageValidation />} />
                <Route path="/optimizer" element={<RoleRoute requiredRole="engineer"><PageOptimizer /></RoleRoute>} />
                <Route path="/sensitivity" element={<RoleRoute requiredRole="engineer"><PageSensitivity /></RoleRoute>} />
                <Route path="/bom" element={<RoleRoute requiredRole="engineer"><PageBOM /></RoleRoute>} />
                <Route path="/report" element={<PageReport />} />
                <Route path="/history" element={<PageHistory />} />
                <Route path="/logs" element={<PageLogs />} />
                <Route path="/compliance" element={<PageCompliance />} />
                <Route path="/knowledge" element={<PageKnowledge />} />
                <Route path="/import" element={<RoleRoute requiredRole="engineer"><PageImport /></RoleRoute>} />
                <Route path="/attenuation" element={<RoleRoute requiredRole="engineer"><PageAttenuation /></RoleRoute>} />
                <Route path="/tank" element={<RoleRoute requiredRole="engineer"><PageTank /></RoleRoute>} />
                <Route path="/vessel" element={<RoleRoute requiredRole="engineer"><PageVessel /></RoleRoute>} />
                <Route path="/settings" element={<RoleRoute requiredRole="admin"><SettingsPage /></RoleRoute>} />
                <Route path="/users" element={<RoleRoute requiredRole="admin"><UserManagementPage /></RoleRoute>} />
                <Route path="*" element={
                  activeWorkspace === 'tank' ? <Navigate to="/tank" replace /> :
                  activeWorkspace === 'vessel' ? <Navigate to="/vessel" replace /> :
                  <Navigate to="/dashboard" replace />
                } />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <SessionTimeoutDialog
        show={showWarning}
        timeRemaining={timeRemaining}
        onStaySignedIn={staySignedIn}
      />
    </div>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<div className="loading-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>Loading...</div>}>
        <Routes>
          {/* Public routes — no sidebar/topbar */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

          {/* Protected routes — full app shell */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
      <ConfirmDialogHost />
      <SaveIndicator />
      <OfflineStatusBar />
    </MotionConfig>
  )
}
