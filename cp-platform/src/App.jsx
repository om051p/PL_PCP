import { useState } from 'react'
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
          <ActivePage />
        </main>
      </div>
    </div>
  )
}
