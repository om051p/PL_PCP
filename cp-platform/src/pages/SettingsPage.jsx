import { useAuthStore } from '../store/authStore.js'
import { USER_ROLES, ROLE_PERMISSIONS, getUserPermissions } from '../config/authPolicy.js'
import { Settings, Shield, User, Check } from 'lucide-react'

function RoleBadge({ role }) {
  const colors = {
    admin: 'var(--accent)',
    engineer: 'var(--pass)',
    viewer: 'var(--text-muted)',
  }
  return (
    <span
      className="badge"
      style={{
        backgroundColor: `${colors[role] || 'var(--text-muted)'}20`,
        color: colors[role] || 'var(--text-muted)',
        border: `1px solid ${colors[role] || 'var(--text-muted)'}40`,
      }}
    >
      {role}
    </span>
  )
}

function PermissionList({ role }) {
  const permissions = ROLE_PERMISSIONS[role] || []
  return (
    <div className="permission-list">
      {permissions.map((perm) => (
        <div key={perm} className="permission-item">
          <Check size={12} color="var(--pass)" />
          <span>{perm}</span>
        </div>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const permissions = getUserPermissions(user)

  return (
    <div className="page">
      <div className="page-header">
        <Settings size={20} />
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Application settings and configuration</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card-title">
          <User size={16} />
          Current User
        </h3>
        <div className="settings-grid">
          <div className="settings-field">
            <label className="settings-label">Email</label>
            <div className="settings-value">{user?.email || '—'}</div>
          </div>
          <div className="settings-field">
            <label className="settings-label">Role</label>
            <div className="settings-value">
              <RoleBadge role={user?.role || 'viewer'} />
            </div>
          </div>
          <div className="settings-field">
            <label className="settings-label">Account Status</label>
            <div className="settings-value">
              <span className={`status-dot ${user?.isActive !== false ? 'status-dot--active' : 'status-dot--inactive'}`} />
              {user?.isActive !== false ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card-title">
          <Shield size={16} />
          Your Permissions
        </h3>
        <PermissionList role={user?.role || 'viewer'} />
      </div>

      <div className="card">
        <h3 className="card-title">Role Hierarchy</h3>
        <div className="role-hierarchy">
          {Object.values(USER_ROLES).map((role) => (
            <div key={role} className="role-hierarchy-item">
              <RoleBadge role={role} />
              <span className="role-hierarchy-desc">
                {role === 'admin' && 'Full access — manage users, settings, and all projects'}
                {role === 'engineer' && 'Create and edit projects, run calculations, generate reports'}
                {role === 'viewer' && 'Read-only access — view projects and reports'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
