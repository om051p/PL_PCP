import { useAuthStore } from '../store/authStore.js'
import { useProjectStore } from '../store/projectStore.js'
import { useNavigate } from 'react-router-dom'
import { Route, Layers, Database, Cpu, Signal, Shield, LogOut, Zap } from 'lucide-react'
import { ThemeToggle } from '../components/ui.jsx'
import { workspaceRegistry } from '../config/workspaceRegistry.js'

const ICON_MAP = {
  Route,
  Layers,
  Database,
  Cpu,
  Signal,
  Shield,
}

export function PageWorkspace() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const setActiveWorkspace = useProjectStore((s) => s.setActiveWorkspace)

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

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const modules = Object.values(workspaceRegistry)

  return (
    <div className="workspace-page">
      {/* Top Header Bar with Profile, Theme & Logout */}
      <div className="workspace-top-bar" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 40px',
        boxSizing: 'border-box',
      }}>
        <div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="user-profile-summary" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            fontSize: '12.5px',
          }}>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
              {user?.displayName || user?.email?.split('@')[0]}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
              {user?.role}
            </span>
          </div>
          <ThemeToggle />
          <button
            className="btn btn-icon btn-logout"
            onClick={handleLogout}
            title="Sign Out"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      <div className="workspace-container">
        <div className="workspace-header">
          <div className="workspace-brand">
            <Zap size={36} className="brand-icon" fill="currentColor" />
            <span>RAXA</span>
          </div>
          <p className="workspace-subtitle">Infrastructure Protection Engineering Platform</p>
          <h2 className="workspace-title-main">Select Engineering Workspace</h2>
        </div>

        <div className="workspace-grid">
          {modules.map((m) => {
            const IconComponent = ICON_MAP[m.iconName] || Route
            const isAvailable = m.enabled
            return (
              <div
                key={m.id}
                className={`workspace-card ${isAvailable ? 'available' : 'coming_soon'}`}
                onClick={() => isAvailable && handleSelectWorkspace(m.id)}
              >
                <div className="workspace-card-header">
                  <div className="workspace-card-icon">
                    <IconComponent size={24} />
                  </div>
                  <span className={`workspace-badge ${isAvailable ? 'active' : 'soon'}`}>
                    {isAvailable ? 'Available' : 'Coming Soon'}
                  </span>
                </div>
                <div className="workspace-card-body">
                  <h3>{m.name}</h3>
                  <p>{m.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
