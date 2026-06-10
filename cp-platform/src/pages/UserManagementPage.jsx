import { useAuthStore } from '../store/authStore.js'
import { USER_ROLES } from '../config/authPolicy.js'
import { Users, Shield, AlertCircle } from 'lucide-react'

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

export default function UserManagementPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="page">
      <div className="page-header">
        <Users size={20} />
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage user access and roles</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-info-row">
          <AlertCircle size={16} color="var(--text-muted)" />
          <span>User management is coming soon. Currently, users are provisioned through Firebase Authentication with role assignment via Firestore.</span>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">
          <Shield size={16} />
          Current User
        </h3>
        <div className="user-card">
          <div className="user-avatar">
            {(user?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="user-info">
            <div className="user-email">{user?.email || '—'}</div>
            <div className="user-meta">
              <RoleBadge role={user?.role || 'viewer'} />
              <span className={`status-dot ${user?.isActive !== false ? 'status-dot--active' : 'status-dot--inactive'}`} />
              <span>{user?.isActive !== false ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 className="card-title">Provisioning Guide</h3>
        <div className="provisioning-steps">
          <div className="provisioning-step">
            <span className="step-number">1</span>
            <div>
              <strong>Create user in Firebase Console</strong>
              <p>Authentication → Users → Add user</p>
            </div>
          </div>
          <div className="provisioning-step">
            <span className="step-number">2</span>
            <div>
              <strong>Create Firestore user document</strong>
              <p>Collection: <code>users</code>, Document ID: <code>{'{'}`uid{'}`'}</code></p>
            </div>
          </div>
          <div className="provisioning-step">
            <span className="step-number">3</span>
            <div>
              <strong>Set role and active status</strong>
              <p>{'{'}"role": "engineer", "isActive": true{'}'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
