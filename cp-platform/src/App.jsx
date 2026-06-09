import { Component, useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useProjectStore } from './store/projectStore.js'
import { Sidebar, TopBar } from './components/layout.jsx'
import {
  PageProjectSetup,
  PagePipeline,
  PageCurrentRequirement,
  PageGroundbed,
  PageCableResistance,
  PageTRSizing,
  PageValidation,
  PageOptimizer,
  PageBOM,
  PageReport,
  PageImport,
} from './pages/index.jsx'

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
        <div className="error-boundary">
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
        </div>
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

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
  const theme = useProjectStore((s) => s.ui.theme)
  const setTheme = useProjectStore((s) => s.setTheme)

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

  const stations = useProjectStore((s) => s.project.stations)
  const activeStationId = useProjectStore((s) => s.activeStationId)
  const setActiveStation = useProjectStore((s) => s.setActiveStation)
  if (!activeStationId && stations.length > 0) {
    setActiveStation(stations[0].id)
  }

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="main-area">
        <TopBar />
        <main className="page-content">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Navigate to="/project" replace />} />
              <Route path="/project" element={<PageProjectSetup />} />
              <Route path="/pipeline" element={<PagePipeline />} />
              <Route path="/current" element={<PageCurrentRequirement />} />
              <Route path="/groundbed" element={<PageGroundbed />} />
              <Route path="/cable" element={<PageCableResistance />} />
              <Route path="/tr" element={<PageTRSizing />} />
              <Route path="/validation" element={<PageValidation />} />
              <Route path="/optimizer" element={<PageOptimizer />} />
              <Route path="/bom" element={<PageBOM />} />
              <Route path="/report" element={<PageReport />} />
              <Route path="/import" element={<PageImport />} />
              <Route path="*" element={<Navigate to="/project" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
