/**
 * SettingsPage.jsx
 *
 * Enterprise Settings — card + tab layout covering General, Security,
 * Standards, Notifications, Appearance, Integrations, and Audit.
 */

import { useState } from 'react'
import { useAuthStore } from '../store/authStore.js'
import { USER_ROLES, ROLE_PERMISSIONS, getUserPermissions } from '../config/authPolicy.js'
import {
  Settings,
  Shield,
  User,
  Check,
  Bell,
  Palette,
  Globe,
  Database,
  Activity,
  FileText,
  Key,
  Lock,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react'
import { useProjectStore } from '../store/projectStore.js'

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'standards', label: 'Standards', icon: FileText },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'integrations', label: 'Integrations', icon: Globe },
  { id: 'audit', label: 'Audit', icon: Activity },
]

function RoleBadge({ role }) {
  const colors = {
    admin: 'var(--accent)',
    engineer: 'var(--pass)',
    viewer: 'var(--text-muted)',
  }
  return (
    <span
      style={{
        backgroundColor: `${colors[role] || 'var(--text-muted)'}20`,
        color: colors[role] || 'var(--text-muted)',
        border: `1px solid ${colors[role] || 'var(--text-muted)'}40`,
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        textTransform: 'capitalize',
      }}
    >
      {role}
    </span>
  )
}

function PermissionList({ role }) {
  const perms = ROLE_PERMISSIONS[role] || []
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
      {perms.map((perm) => (
        <div key={perm} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 0' }}>
          <Check size={12} style={{ color: 'var(--pass)', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)' }}>{perm}</span>
        </div>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState('general')
  const user = useAuthStore((s) => s.user)
  const permissions = getUserPermissions(user)
  const theme = useProjectStore((s) => s.ui.theme)
  const setTheme = useProjectStore((s) => s.setTheme)

  const ActiveIcon = TABS.find((t) => t.id === tab)?.icon || Settings

  return (
    <div className="page">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={18} style={{ color: 'var(--text-secondary)' }} />
            Settings
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
            Application configuration and user preferences
          </p>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span>{user.email}</span>
            <RoleBadge role={user.role || 'viewer'} />
          </div>
        )}
      </div>

      <div className="enterprise-2col">
        {/* Left: Tab Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Tab Navigation — horizontal pill tabs */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 2 }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  fontSize: 12.5,
                  fontWeight: tab === id ? 600 : 400,
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: tab === id ? 'var(--brand)' : 'var(--card)',
                  color: tab === id ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 16,
            boxShadow: 'var(--shadow-sm)',
          }}>
            {tab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={15} style={{ color: 'var(--text-secondary)' }} />
                    Current User
                  </h3>
                  <div className="kpi-row" style={{ marginBottom: 0 }}>
                    <div className="kpi-card">
                      <span className="kpi-card__label">Email</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{user?.email || '—'}</span>
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-card__label">Role</span>
                      <RoleBadge role={user?.role || 'viewer'} />
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-card__label">Account Status</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: user?.isActive !== false ? 'var(--pass)' : 'var(--fail)' }}>
                        {user?.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={15} style={{ color: 'var(--text-secondary)' }} />
                    Your Permissions
                  </h3>
                  <PermissionList role={user?.role || 'viewer'} />
                </div>
              </div>
            )}

            {tab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={15} style={{ color: 'var(--text-secondary)' }} />
                  Security Configuration
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="kpi-card">
                    <span className="kpi-card__label">Session Timeout</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>30 min</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Auto-logout on inactivity</span>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-card__label">Max Login Attempts</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>5</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Before 15-min lockout</span>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-card__label">Password Min Length</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>8</span>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-card__label">MFA Required</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--warn)' }}>Optional</span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'standards' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={15} style={{ color: 'var(--text-secondary)' }} />
                  Design Standards
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  The active design standard is configured per project in the Design Basis page.
                  Available standards: NACE SP0169, ISO 15589-1, ADNOC, PDO, Saudi Aramco.
                </p>
              </div>
            )}

            {tab === 'notifications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={15} style={{ color: 'var(--text-secondary)' }} />
                  Notification Preferences
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['Calculation completed', 'Validation warnings', 'Approval requests', 'System updates'].map((item, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
                      <input type="checkbox" defaultChecked style={{ accentColor: 'var(--brand-mid)' }} />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {tab === 'appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Palette size={15} style={{ color: 'var(--text-secondary)' }} />
                  Appearance
                </h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { val: 'light', icon: Sun, label: 'Light' },
                    { val: 'dark', icon: Moon, label: 'Dark' },
                    { val: 'system', icon: Monitor, label: 'System' },
                  ].map(({ val, icon: Icon, label }) => (
                    <button
                      key={val}
                      onClick={() => setTheme(val)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 20px',
                        fontSize: 13,
                        border: theme === val ? '2px solid var(--brand-mid)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        background: theme === val ? 'var(--brand-light)' : 'var(--card)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        flex: 1,
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={15} /> {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === 'integrations' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={15} style={{ color: 'var(--text-secondary)' }} />
                  Integrations
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { name: 'Firebase Auth', status: 'Connected', tone: 'var(--pass)' },
                    { name: 'Firestore Database', status: 'Connected', tone: 'var(--pass)' },
                    { name: 'Firebase Storage', status: 'Configured', tone: 'var(--warn)' },
                    { name: 'Vercel Deployment', status: 'Ready', tone: 'var(--pass)' },
                  ].map((int, i) => (
                    <div key={i} className="kpi-card">
                      <span className="kpi-card__label">{int.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: int.tone }}>{int.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'audit' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={15} style={{ color: 'var(--text-secondary)' }} />
                  Audit Configuration
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  All user actions, project modifications, and calculation runs are automatically
                  logged to the Audit Trail. View detailed audit logs from the Audit Trail page
                  in the Workspace section.
                </p>
                <div className="kpi-row" style={{ marginBottom: 0 }}>
                  <div className="kpi-card">
                    <span className="kpi-card__label">Log Retention</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>90 days</span>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-card__label">Export Format</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>CSV</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Role Hierarchy & System Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 16,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={15} style={{ color: 'var(--text-secondary)' }} />
              Role Hierarchy
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.values(USER_ROLES).map((role) => (
                <div key={role} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px dashed var(--border)' }}>
                  <RoleBadge role={role} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {role === 'admin' && 'Full access — manage users, settings, and all projects'}
                    {role === 'engineer' && 'Create and edit projects, run calculations, generate reports'}
                    {role === 'viewer' && 'Read-only access — view projects and reports'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 16,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={15} style={{ color: 'var(--text-secondary)' }} />
              System Info
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>App Version</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>1.0.0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Database</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>Firestore</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Auth Provider</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>Firebase Auth</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Deployment</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>Vercel</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
