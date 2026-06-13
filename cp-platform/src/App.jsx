import { Component, useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { MotionConfig, motion } from 'framer-motion'
import { useProjectStore } from './store/projectStore.js'
import { Sidebar, TopBar } from './components/layout.jsx'
import { ProtectedRoute, PublicRoute, RoleRoute } from './components/ProtectedRoute.jsx'
import { SessionTimeoutDialog } from './components/SessionTimeoutDialog.jsx'
import { ConfirmDialogHost } from './components/ConfirmDialog.jsx'
import { SaveIndicator } from './components/SaveIndicator.jsx'
import { useSessionTimeout } from './hooks/useSessionTimeout.js'
import { LoginPage } from './pages/LoginPage.jsx'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.jsx'
import { RegisterPage } from './pages/RegisterPage.jsx'
import {
  PageProjectSetup,
  PagePipeline,
  PageSoilResistivity,
  PageCurrentRequirement,
  PageGroundbed,
  PageCableResistance,
  PageTRSizing,
  PageValidation,
  PageOptimizer,
  PageBOM,
  PageReport,
  PageImport,
  PageAttenuation,
  PageWorkspace,
  PageTank,
  PageVessel,
  PageHistory,
  PageCompliance,
  PageSensitivity,
  PageLogs,
} from './pages/index.jsx'
import PageDashboard from './pages/PageDashboard.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import UserManagementPage from './pages/UserManagementPage.jsx'

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
            <Routes>
              <Route path="/workspace" element={<PageWorkspace />} />
              <Route path="*" element={<Navigate to="/workspace" replace />} />
            </Routes>
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
      <ConfirmDialogHost />
      <SaveIndicator />
    </MotionConfig>
  )
}
