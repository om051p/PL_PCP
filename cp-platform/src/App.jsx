import { Component, useState } from 'react'
import { useProjectStore } from './store/projectStore.js'
import { Sidebar, TopBar } from './components/layout.jsx'
import {
  PageProjectSetup, PagePipeline, PageCurrentRequirement,
  PageGroundbed, PageCableResistance, PageTRSizing,
  PageValidation, PageOptimizer, PageBOM, PageReport, PageImport
} from './pages/index.jsx'

const PAGES = {
  project:    PageProjectSetup,
  pipeline:   PagePipeline,
  current:    PageCurrentRequirement,
  groundbed:  PageGroundbed,
  cable:      PageCableResistance,
  tr:         PageTRSizing,
  validation: PageValidation,
  optimizer:  PageOptimizer,
  bom:        PageBOM,
  report:     PageReport,
  import:     PageImport,
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="page" style={{ padding: 24 }}>
          <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
            {this.state.error.message}
          </p>
          <button className="btn btn-primary" onClick={() => { this.setState({ error: null }); window.location.reload() }}>
            Reload Application
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const activePage = useProjectStore(s => s.ui.activePage)
  const [collapsed, setCollapsed] = useState(false)
  const ActivePage = PAGES[activePage] || PageProjectSetup

  const stations = useProjectStore(s => s.project.stations)
  const activeStationId = useProjectStore(s => s.activeStationId)
  const setActiveStation = useProjectStore(s => s.setActiveStation)
  if (!activeStationId && stations.length > 0) {
    setActiveStation(stations[0].id)
  }

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <div className="main-area">
        <TopBar />
        <main className="page-content">
          <ErrorBoundary>
            <ActivePage />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
