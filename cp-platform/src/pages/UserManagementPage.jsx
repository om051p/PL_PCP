import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '../store/authStore.js'
import { USER_ROLES } from '../config/authPolicy.js'
import { Users, Shield, AlertCircle, Trash2, Check, X, ShieldAlert, Key, UserCheck, UserMinus, Lock, AlertTriangle, ShieldCheck, List, Search, Activity, Clock, UserX } from 'lucide-react'

function RoleBadge({ role }) {
  const colors = {
    admin: 'var(--accent)',
    manager: 'var(--brand-mid)',
    engineer: 'var(--pass)',
    reviewer: 'var(--warn)',
    viewer: 'var(--text-secondary)',
  }
  return (
    <span style={{
      backgroundColor: `${colors[role] || 'var(--text-secondary)'}20`,
      color: colors[role] || 'var(--text-secondary)',
      border: `1px solid ${colors[role] || 'var(--text-secondary)'}40`,
      textTransform: 'capitalize', fontSize: '10.5px', padding: '2px 7px',
      borderRadius: '4px', display: 'inline-block', fontWeight: 500,
    }}>{role}</span>
  )
}

function StatusBadge({ status }) {
  const m = {
    active: { bg: 'var(--pass-bg)', color: 'var(--pass)', text: 'Active' },
    pending: { bg: 'var(--warn-bg)', color: 'var(--warn)', text: 'Pending' },
    suspended: { bg: '#fee2e2', color: '#b91c1c', text: 'Suspended' },
    disabled: { bg: 'var(--border)', color: 'var(--text-secondary)', text: 'Disabled' },
    rejected: { bg: '#f3f4f6', color: '#4b5563', text: 'Rejected' },
  }
  const s = m[status] || { bg: 'var(--border)', color: 'var(--text-secondary)', text: status }
  return (<span style={{ backgroundColor: s.bg, color: s.color, fontSize: '10.5px', padding: '2px 7px', borderRadius: '4px', fontWeight: 500 }}>{s.text}</span>)
}

export default function UserManagementPage() {
  const user = useAuthStore((s) => s.user)
  const usersList = useAuthStore((s) => s.usersList)
  const auditLogs = useAuthStore((s) => s.auditLogs)
  const fetchUsersList = useAuthStore((s) => s.fetchUsersList)
  const fetchAuditLogs = useAuthStore((s) => s.fetchAuditLogs)
  const approveUser = useAuthStore((s) => s.approveUser)
  const rejectUser = useAuthStore((s) => s.rejectUser)
  const updateUserRole = useAuthStore((s) => s.updateUserRole)
  const suspendUser = useAuthStore((s) => s.suspendUser)
  const disableUser = useAuthStore((s) => s.disableUser)
  const enableUser = useAuthStore((s) => s.enableUser)
  const resetUserAccess = useAuthStore((s) => s.resetUserAccess)

  const [selectedUser, setSelectedUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  useEffect(() => { fetchUsersList(); fetchAuditLogs() }, [fetchUsersList, fetchAuditLogs])

  const pendingUsers = usersList.filter((u) => u.status === 'pending' || !u.approved)
  const activeUsers = usersList.filter((u) => u.approved && u.status !== 'rejected')
  const suspendedUsers = usersList.filter((u) => u.status === 'suspended')
  const totalUsers = usersList.length

  const filteredUsers = useMemo(() => {
    let list = activeUsers
    if (filterStatus === 'pending') list = pendingUsers
    else if (filterStatus === 'suspended') list = suspendedUsers
    else if (filterStatus === 'disabled') list = usersList.filter((u) => u.status === 'disabled')
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((u) => (u.email || '').toLowerCase().includes(q) || (u.displayName || u.name || '').toLowerCase().includes(q))
    }
    return list
  }, [activeUsers, pendingUsers, suspendedUsers, usersList, filterStatus, searchQuery])

  const recentSecurityEvents = useMemo(() => {
    return auditLogs.filter((l) => l.action.includes('FAILURE') || l.action.includes('LOCKED') || l.action.includes('SUSPEND') || l.action.includes('DENIED')).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8)
  }, [auditLogs])

  const today = new Date().toDateString()
  const failedLoginsToday = auditLogs.filter((l) => l.action === 'LOGIN_FAILURE' && new Date(l.timestamp).toDateString() === today).length

  const handleApprove = async (u) => { try { await approveUser(u.uid, u.email); setFormSuccess('User approved.'); setTimeout(() => setFormSuccess(''), 3000) } catch (e) { setFormError(e.message) } }
  const handleReject = async (u) => { if (window.confirm('Reject ' + u.email + '?')) { try { await rejectUser(u.uid, u.email); setFormSuccess('User rejected.') } catch (e) { setFormError(e.message) } } }
  const handleRoleChange = async (u, r) => { try { await updateUserRole(u.uid, u.email, r) } catch (e) { alert(e.message) } }
  const handleSuspend = async (u) => { if (window.confirm('Suspend ' + u.email + '?')) { try { await suspendUser(u.uid, u.email) } catch (e) { alert(e.message) } } }
  const handleDisable = async (u) => { if (window.confirm('Disable ' + u.email + '?')) { try { await disableUser(u.uid, u.email) } catch (e) { alert(e.message) } } }
  const handleEnable = async (u) => { try { await enableUser(u.uid, u.email) } catch (e) { alert(e.message) } }
  const handleResetAccess = async (u) => { try { await resetUserAccess(u.uid, u.email); alert('Password reset sent to ' + u.email) } catch (e) { alert(e.message) } }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>User Management Console</h1>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>Manage users, process approvals, assign roles, and monitor security</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="field-input-wrap" style={{ position: 'relative', width: 200 }}>
            <input type="text" className="field-input" style={{ paddingLeft: 28, height: 30, fontSize: 12 }} placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <Search size={13} style={{ position: 'absolute', left: 8, top: 8, color: 'var(--text-tertiary)' }} />
          </div>
          <select className="field-input" style={{ width: 130, height: 30, fontSize: 12 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {formError && (<div style={{ marginBottom: 8, padding: '6px 10px', background: 'var(--fail-bg)', color: 'var(--fail)', border: '1px solid #fca5a5', borderRadius: 4, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={13} />{formError}</div>)}
      {formSuccess && (<div style={{ marginBottom: 8, padding: '6px 10px', background: 'var(--pass-bg)', color: 'var(--pass)', border: '1px solid #bbf7d0', borderRadius: 4, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Check size={13} />{formSuccess}</div>)}

      {/* KPI Row */}
      <div className="kpi-row" style={{ marginBottom: 10 }}>
        <div className="kpi-card kpi-card--brand">
          <span className="kpi-card__label">Total Users</span>
          <span className="kpi-card__value">{totalUsers}</span>
          <span className="kpi-card__sub">All registered accounts</span>
        </div>
        <div className="kpi-card kpi-card--pass">
          <span className="kpi-card__label">Active Users</span>
          <span className="kpi-card__value">{activeUsers.length}</span>
          <span className="kpi-card__sub">Approved & active</span>
        </div>
        <div className={`kpi-card ${pendingUsers.length > 0 ? 'kpi-card--warn' : ''}`}>
          <span className="kpi-card__label">Pending Approval</span>
          <span className="kpi-card__value">{pendingUsers.length}</span>
          <span className="kpi-card__sub">Awaiting admin action</span>
        </div>
        <div className={`kpi-card ${suspendedUsers.length > 0 ? 'kpi-card--fail' : ''}`}>
          <span className="kpi-card__label">Suspended</span>
          <span className="kpi-card__value">{suspendedUsers.length}</span>
          <span className="kpi-card__sub">Access disabled</span>
        </div>
        <div className={`kpi-card ${failedLoginsToday > 0 ? 'kpi-card--warn' : 'kpi-card--info'}`}>
          <span className="kpi-card__label">Failed Logins Today</span>
          <span className="kpi-card__value">{failedLoginsToday}</span>
          <span className="kpi-card__sub">Security events</span>
        </div>
      </div>

      {/* Main Content: Table + Right Panel */}
      <div className="enterprise-2col" style={{ marginBottom: 10 }}>
        {/* Left: User Table */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <Users size={14} /> {filterStatus === 'pending' ? 'Pending Approvals' : filterStatus === 'suspended' ? 'Suspended Users' : filterStatus === 'disabled' ? 'Disabled Users' : 'Active Users'} ({filteredUsers.length})
            </span>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>User</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Role</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Last Login</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)', fontSize: 13 }}>No users found.</td></tr>
                ) : filteredUsers.map((u) => {
                  const isSelf = u.email?.toLowerCase() === user?.email?.toLowerCase()
                  const isSelected = selectedUser?.uid === u.uid
                  return (
                    <tr key={u.uid || u.email} onClick={() => setSelectedUser(u)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isSelected ? 'var(--surface-hover)' : 'transparent', transition: 'background 0.1s' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 500 }}>{u.displayName || u.name || u.email?.split('@')[0]} {isSelf && <span style={{ fontSize: 10, color: 'var(--brand-mid)', fontStyle: 'italic' }}>(you)</span>}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {isSelf ? <RoleBadge role={u.role} /> : (
                          <select value={u.role} onChange={(e) => { e.stopPropagation(); handleRoleChange(u, e.target.value) }} onClick={(e) => e.stopPropagation()} className="field-input" style={{ padding: '2px 6px', fontSize: 11, borderRadius: 3, width: 90 }}>
                            <option value={USER_ROLES.ADMIN}>Admin</option>
                            <option value={USER_ROLES.MANAGER}>Manager</option>
                            <option value={USER_ROLES.ENGINEER}>Engineer</option>
                            <option value={USER_ROLES.REVIEWER}>Reviewer</option>
                            <option value={USER_ROLES.VIEWER}>Viewer</option>
                          </select>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px' }}><StatusBadge status={u.status || 'active'} /></td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                          {u.status === 'pending' && (<><button className="btn btn-sm" style={{ borderColor: 'var(--pass)', color: 'var(--pass)', padding: '3px 8px', fontSize: 11 }} onClick={() => handleApprove(u)}><UserCheck size={11} />Approve</button><button className="btn btn-sm" style={{ borderColor: 'var(--fail)', color: 'var(--fail)', padding: '3px 8px', fontSize: 11 }} onClick={() => handleReject(u)}><UserMinus size={11} />Reject</button></>)}
                          {u.status === 'active' && !isSelf && (<><button className="btn btn-sm" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => handleResetAccess(u)}><Key size={11} /></button><button className="btn btn-sm" style={{ borderColor: '#b91c1c', color: '#b91c1c', padding: '3px 8px', fontSize: 11 }} onClick={() => handleSuspend(u)}>Suspend</button><button className="btn btn-sm" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => handleDisable(u)}>Disable</button></>)}
                          {(u.status === 'suspended' || u.status === 'disabled') && (<button className="btn btn-sm" style={{ borderColor: 'var(--pass)', color: 'var(--pass)', padding: '3px 8px', fontSize: 11 }} onClick={() => handleEnable(u)}>Enable</button>)}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: User Details Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="section-card" style={{ marginBottom: 0 }}>
            <div className="section-card-header">
              <span className="section-card-title"><Users size={14} /> User Details</span>
            </div>
            <div className="section-card-body">
              {selectedUser ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ textAlign: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--brand-light)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                      <Users size={22} style={{ color: 'var(--brand-mid)' }} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedUser.displayName || selectedUser.name || selectedUser.email?.split('@')[0]}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{selectedUser.email}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div><div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: 0.5 }}>Role</div><div style={{ fontSize: 12, fontWeight: 500 }}><RoleBadge role={selectedUser.role} /></div></div>
                    <div><div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: 0.5 }}>Status</div><div style={{ fontSize: 12 }}><StatusBadge status={selectedUser.status || 'active'} /></div></div>
                    <div><div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: 0.5 }}>Approved</div><div style={{ fontSize: 12 }}>{selectedUser.approved ? '✓ Yes' : '✗ No'}</div></div>
                    <div><div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: 0.5 }}>Last Login</div><div style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleDateString() : 'Never'}</div></div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-tertiary)', fontSize: 12 }}>Select a user from the table to view details</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Recent Security Events */}
      <div className="section-card" style={{ marginBottom: 0 }}>
        <div className="section-card-header">
          <span className="section-card-title"><ShieldAlert size={14} /> Recent Security Events</span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Last {recentSecurityEvents.length} critical events</span>
        </div>
        <div className="section-card-body" style={{ padding: 0 }}>
          {recentSecurityEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-tertiary)', fontSize: 12 }}>No recent security events.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Time</th>
                  <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Event</th>
                  <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>User</th>
                  <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Outcome</th>
                  <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Context</th>
                </tr>
              </thead>
              <tbody>
                {recentSecurityEvents.map((log, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: '#fee2e210' }}>
                    <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '7px 10px', fontWeight: 600, color: '#b91c1c' }}>{log.action}</td>
                    <td style={{ padding: '7px 10px' }}>{log.email || 'N/A'}</td>
                    <td style={{ padding: '7px 10px' }}><span style={{ padding: '1px 5px', borderRadius: 3, fontSize: 10, background: '#fef2f2', color: '#b91c1c' }}>{log.status}</span></td>
                    <td style={{ padding: '7px 10px', color: 'var(--text-tertiary)', fontSize: 10.5 }}>{log.details?.reason || log.details?.browser || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
