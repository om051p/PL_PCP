import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore.js'
import { USER_ROLES } from '../config/authPolicy.js'
import { Users, Shield, AlertCircle, Trash2, Check, X, ShieldAlert, Key, UserCheck, UserMinus, Lock, AlertTriangle, ShieldCheck, List } from 'lucide-react'

function RoleBadge({ role }) {
  const colors = {
    admin: 'var(--accent)',
    manager: 'var(--brand-mid)',
    engineer: 'var(--pass)',
    reviewer: 'var(--warn)',
    viewer: 'var(--text-muted)',
  }
  return (
    <span
      className="badge"
      style={{
        backgroundColor: `${colors[role] || 'var(--text-muted)'}20`,
        color: colors[role] || 'var(--text-muted)',
        border: `1px solid ${colors[role] || 'var(--text-muted)'}40`,
        textTransform: 'capitalize',
        fontSize: '11px',
        padding: '2px 8px',
        borderRadius: '4px',
        display: 'inline-block',
      }}
    >
      {role}
    </span>
  )
}

function StatusBadge({ status }) {
  const styles = {
    active: { bg: 'var(--pass-bg, #dcfce7)', color: 'var(--pass)', text: 'Active' },
    pending: { bg: 'var(--warn-bg, #fef3c7)', color: 'var(--warn)', text: 'Pending Approval' },
    suspended: { bg: '#fee2e2', color: '#b91c1c', text: 'Suspended' },
    disabled: { bg: 'var(--border)', color: 'var(--text-secondary)', text: 'Disabled' },
    rejected: { bg: '#f3f4f6', color: '#4b5563', text: 'Rejected' },
  }
  const current = styles[status] || { bg: 'var(--border)', color: 'var(--text-secondary)', text: status }
  return (
    <span
      style={{
        backgroundColor: current.bg,
        color: current.color,
        fontSize: '11.5px',
        padding: '2px 8px',
        borderRadius: '4px',
        fontWeight: '500',
        display: 'inline-block',
      }}
    >
      {current.text}
    </span>
  )
}

function SecurityDashboard({ pendingUsers, activeUsers }) {
  const auditLogs = useAuthStore((s) => s.auditLogs)
  const fetchAuditLogs = useAuthStore((s) => s.fetchAuditLogs)
  const usersList = useAuthStore((s) => s.usersList)
  const [currentTime] = useState(() => Date.now())

  useEffect(() => {
    fetchAuditLogs()
    // Poll every 15 seconds for real-time security alerts
    const interval = setInterval(fetchAuditLogs, 15000)
    return () => clearInterval(interval)
  }, [fetchAuditLogs])

  const todayStr = new Date(currentTime).toDateString()

  // 1. Failed Logins Today
  const failedLoginsToday = auditLogs.filter((log) => {
    if (log.action !== 'LOGIN_FAILURE') return false
    return new Date(log.timestamp).toDateString() === todayStr
  }).length

  // 2. Pending Approvals
  const pendingApprovals = pendingUsers.length

  // 3. Suspended Accounts
  const suspendedAccounts = usersList.filter((u) => u.status === 'suspended').length

  // 4. Locked Accounts (active lockouts in last 30 minutes)
  const lockedAccounts = auditLogs.filter((log) => {
    if (log.action !== 'LOGIN_LOCKED') return false
    if (!currentTime) return false
    const elapsed = currentTime - new Date(log.timestamp).getTime()
    return elapsed < 30 * 60 * 1000
  }).length

  // 5. Password Resets Today
  const passwordResetsToday = auditLogs.filter((log) => {
    if (log.action !== 'PASSWORD_RESET_REQUEST') return false
    return new Date(log.timestamp).toDateString() === todayStr
  }).length

  // 6. Login Success Rate
  const successCount = auditLogs.filter((log) => log.action === 'LOGIN_SUCCESS').length
  const failureCount = auditLogs.filter((log) => log.action === 'LOGIN_FAILURE').length
  const totalAttempts = successCount + failureCount
  const successRate = totalAttempts > 0 ? ((successCount / totalAttempts) * 100).toFixed(1) : '100.0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
        <ShieldAlert size={16} /> Security Monitoring Dashboard
      </h3>

      {/* Grid of aggregate cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px'
      }}>
        {/* Card 1: Failed Logins */}
        <div className="stat-card" style={{
          padding: '16px',
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: failedLoginsToday > 0 ? 'var(--fail)' : 'var(--text-secondary)' }}>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>Failed Logins Today</span>
            <AlertCircle size={16} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: failedLoginsToday > 0 ? 'var(--fail)' : 'var(--text-primary)' }}>
            {failedLoginsToday}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>From audit_logs collection</div>
        </div>

        {/* Card 2: Login Success Rate */}
        <div className="stat-card" style={{
          padding: '16px',
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--brand)' }}>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>Login Success Rate</span>
            <ShieldCheck size={16} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: parseFloat(successRate) < 80 ? 'var(--warn)' : 'var(--pass)' }}>
            {successRate}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{successCount} of {totalAttempts} attempts</div>
        </div>

        {/* Card 3: Pending Approvals */}
        <div className="stat-card" style={{
          padding: '16px',
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: pendingApprovals > 0 ? 'var(--warn)' : 'var(--text-secondary)' }}>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>Pending Approvals</span>
            <Users size={16} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: pendingApprovals > 0 ? 'var(--warn)' : 'var(--text-primary)' }}>
            {pendingApprovals}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Awaiting action</div>
        </div>

        {/* Card 4: Suspended Accounts */}
        <div className="stat-card" style={{
          padding: '16px',
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: suspendedAccounts > 0 ? '#b91c1c' : 'var(--text-secondary)' }}>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>Suspended Accounts</span>
            <AlertTriangle size={16} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: suspendedAccounts > 0 ? '#b91c1c' : 'var(--text-primary)' }}>
            {suspendedAccounts}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Disabled logins</div>
        </div>

        {/* Card 5: Locked Accounts */}
        <div className="stat-card" style={{
          padding: '16px',
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: lockedAccounts > 0 ? '#b91c1c' : 'var(--text-secondary)' }}>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>Locked Accounts</span>
            <Lock size={16} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: lockedAccounts > 0 ? '#b91c1c' : 'var(--text-primary)' }}>
            {lockedAccounts}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active cooldown (30 min)</div>
        </div>

        {/* Card 6: Password Resets */}
        <div className="stat-card" style={{
          padding: '16px',
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>Password Resets Today</span>
            <Key size={16} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {passwordResetsToday}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Email requests sent</div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div style={{ marginTop: '16px' }}>
        <h4 style={{ fontSize: '13.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--text-primary)' }}>
          <List size={15} /> Real-Time Security Audit Log (Last 15 Events)
        </h4>
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-light, #f8fafc)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Timestamp</th>
                <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Event Action</th>
                <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Target User</th>
                <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Triggered By</th>
                <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Outcome</th>
                <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: '600' }}>System Context</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.slice(0, 15).map((log, index) => {
                const isFail = log.action.includes('FAILURE') || log.action.includes('LOCKED') || log.action.includes('DENIED') || log.status === 'suspended'
                return (
                  <tr key={index} style={{ borderBottom: '1px solid var(--border)', background: isFail ? '#fee2e220' : 'transparent' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: '600', color: isFail ? '#b91c1c' : 'var(--text-primary)' }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{log.email || 'N/A'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{log.performedBy || 'system'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: '3px',
                        fontSize: '10.5px',
                        fontWeight: '500',
                        background: log.status === 'success' || log.status === 'active' ? 'var(--pass-bg)' : '#fef2f2',
                        color: log.status === 'success' || log.status === 'active' ? 'var(--pass)' : '#b91c1c',
                      }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                      {log.details ? (
                        <span>
                          {log.details.browser && `${log.details.browser}`}
                          {log.details.device && ` (${log.details.device})`}
                          {log.details.referenceId && `Ref: ${log.details.referenceId}`}
                          {log.details.reason && `Reason: ${log.details.reason}`}
                          {!log.details.browser && !log.details.referenceId && !log.details.reason && JSON.stringify(log.details)}
                        </span>
                      ) : 'N/A'}
                    </td>
                  </tr>
                )
              })}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No audit logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function UserManagementPage() {
  const user = useAuthStore((s) => s.user)
  const usersList = useAuthStore((s) => s.usersList)
  const fetchUsersList = useAuthStore((s) => s.fetchUsersList)
  const approveUser = useAuthStore((s) => s.approveUser)
  const rejectUser = useAuthStore((s) => s.rejectUser)
  const updateUserRole = useAuthStore((s) => s.updateUserRole)
  const suspendUser = useAuthStore((s) => s.suspendUser)
  const disableUser = useAuthStore((s) => s.disableUser)
  const enableUser = useAuthStore((s) => s.enableUser)
  const resetUserAccess = useAuthStore((s) => s.resetUserAccess)

  const [activeTab, setActiveTab] = useState('active')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  useEffect(() => {
    fetchUsersList()
  }, [fetchUsersList])

  const handleApprove = async (u) => {
    try {
      setFormSuccess('')
      await approveUser(u.uid, u.email)
      setFormSuccess(`Successfully approved Eyad Engineer role for ${u.email}.`)
      setTimeout(() => setFormSuccess(''), 3000)
    } catch (err) {
      setFormError(err.message || 'Failed to approve user.')
      setTimeout(() => setFormError(''), 3000)
    }
  }

  const handleReject = async (u) => {
    if (window.confirm(`Are you sure you want to REJECT ${u.email}?`)) {
      try {
        setFormSuccess('')
        await rejectUser(u.uid, u.email)
        setFormSuccess(`User ${u.email} was rejected.`)
        setTimeout(() => setFormSuccess(''), 3000)
      } catch (err) {
        setFormError(err.message || 'Failed to reject user.')
        setTimeout(() => setFormError(''), 3000)
      }
    }
  }

  const handleRoleChange = async (u, newRole) => {
    try {
      await updateUserRole(u.uid, u.email, newRole)
    } catch (err) {
      alert(err.message || 'Failed to change role.')
    }
  }

  const handleSuspend = async (u) => {
    if (window.confirm(`Suspend access for ${u.email}?`)) {
      try {
        await suspendUser(u.uid, u.email)
      } catch (err) {
        alert(err.message || 'Failed to suspend user.')
      }
    }
  }

  const handleDisable = async (u) => {
    if (window.confirm(`Disable access for ${u.email}?`)) {
      try {
        await disableUser(u.uid, u.email)
      } catch (err) {
        alert(err.message || 'Failed to disable user.')
      }
    }
  }

  const handleEnable = async (u) => {
    try {
      await enableUser(u.uid, u.email)
    } catch (err) {
      alert(err.message || 'Failed to enable user.')
    }
  }

  const handleResetAccess = async (u) => {
    try {
      await resetUserAccess(u.uid, u.email)
      alert(`Password reset link sent to ${u.email}`)
    } catch (err) {
      alert(err.message || 'Failed to send password reset.')
    }
  }

  // Filter users lists
  const pendingUsers = usersList.filter((u) => u.status === 'pending' || !u.approved)
  const activeUsers = usersList.filter((u) => u.approved && u.status !== 'rejected')

  return (
    <div className="page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'var(--brand-light)', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', color: 'var(--brand)' }}>
          <Users size={24} />
        </div>
        <div>
          <h1 className="page-title" style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>User Management Console</h1>
          <p className="page-subtitle" style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Manage approved users, process approval queues, and assign roles.
          </p>
        </div>
      </div>

      {formError && (
        <div className="login-error" style={{ marginBottom: '16px', padding: '8px 12px', background: 'var(--fail-bg)', color: 'var(--fail)', border: '1px solid #fca5a5', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={14} />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div style={{ marginBottom: '16px', padding: '8px 12px', background: 'var(--pass-bg, #dcfce7)', color: 'var(--pass)', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={14} />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px', gap: '16px' }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'active' ? '2px solid var(--brand)' : 'none',
            padding: '8px 16px 12px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'active' ? '600' : '400',
            color: activeTab === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          Active User Base ({activeUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'pending' ? '2px solid var(--brand)' : 'none',
            padding: '8px 16px 12px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'pending' ? '600' : '400',
            color: activeTab === 'pending' ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          Pending Approvals ({pendingUsers.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('security')
            useAuthStore.getState().fetchAuditLogs()
          }}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'security' ? '2px solid var(--brand)' : 'none',
            padding: '8px 16px 12px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'security' ? '600' : '400',
            color: activeTab === 'security' ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          Security Monitoring
        </button>
      </div>

      <div className="card" style={{ padding: '20px' }}>
        {activeTab === 'security' ? (
          <SecurityDashboard pendingUsers={pendingUsers} activeUsers={activeUsers} />
        ) : activeTab === 'pending' ? (
          <div>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
              <ShieldAlert size={16} /> Pending Approvals Queue
            </h3>
            {pendingUsers.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '32px 0' }}>
                No users currently awaiting approval.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
                      <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: '600' }}>Email Address</th>
                      <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: '600', width: '150px' }}>Status</th>
                      <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: '600', width: '150px' }}>Requested At</th>
                      <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: '600', width: '180px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map((u) => (
                      <tr key={u.uid || u.email} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <strong style={{ display: 'block', fontWeight: '500' }}>{u.displayName || u.email.split('@')[0]}</strong>
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{u.email}</span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <StatusBadge status={u.status || 'pending'} />
                        </td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: 'var(--pass)', color: 'var(--pass)', padding: '4px 12px' }}
                              onClick={() => handleApprove(u)}
                            >
                              <UserCheck size={13} />
                              Approve
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: 'var(--fail)', color: 'var(--fail)', padding: '4px 12px' }}
                              onClick={() => handleReject(u)}
                            >
                              <UserMinus size={13} />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
              <Shield size={16} /> Active & Managed User Base
            </h3>
            {activeUsers.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '32px 0' }}>
                No active users found.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
                      <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: '600' }}>Name / Email</th>
                      <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: '600', width: '140px' }}>Role</th>
                      <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: '600', width: '150px' }}>Last Login</th>
                      <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: '600', width: '130px' }}>Status</th>
                      <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: '600', width: '380px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeUsers.map((u) => {
                      const isSelf = u.email?.toLowerCase() === user?.email?.toLowerCase()
                      return (
                        <tr key={u.uid || u.email} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 8px' }}>
                            <strong style={{ display: 'block', fontWeight: '500' }}>
                              {u.displayName || u.name} {isSelf && <span style={{ fontSize: '11px', color: 'var(--brand)', fontStyle: 'italic' }}>(you)</span>}
                            </strong>
                            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{u.email}</span>
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            {isSelf ? (
                              <RoleBadge role={u.role} />
                            ) : (
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u, e.target.value)}
                                className="field-input"
                                style={{ padding: '4px 8px', fontSize: '12.5px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card)' }}
                              >
                                <option value={USER_ROLES.ADMIN}>Admin</option>
                                <option value={USER_ROLES.MANAGER}>Manager</option>
                                <option value={USER_ROLES.ENGINEER}>Engineer</option>
                                <option value={USER_ROLES.REVIEWER}>Reviewer</option>
                                <option value={USER_ROLES.VIEWER}>Viewer</option>
                              </select>
                            )}
                          </td>
                          <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                            {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <StatusBadge status={u.status || 'active'} />
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => handleResetAccess(u)}
                              >
                                <Key size={13} />
                                Reset Access
                              </button>
                              
                              {u.status === 'active' && !isSelf && (
                                <>
                                  <button
                                    className="btn btn-sm"
                                    style={{ borderColor: '#b91c1c', color: '#b91c1c' }}
                                    onClick={() => handleSuspend(u)}
                                  >
                                    Suspend
                                  </button>
                                  <button
                                    className="btn btn-sm"
                                    style={{ borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }}
                                    onClick={() => handleDisable(u)}
                                  >
                                    Disable
                                  </button>
                                </>
                              )}

                              {(u.status === 'suspended' || u.status === 'disabled') && (
                                <button
                                  className="btn btn-sm"
                                  style={{ borderColor: 'var(--pass)', color: 'var(--pass)' }}
                                  onClick={() => handleEnable(u)}
                                >
                                  Enable
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
