import { useState } from 'react'
import { useAuthStore } from '../store/authStore.js'
import { USER_ROLES } from '../config/authPolicy.js'
import { Users, Shield, AlertCircle, Plus, Trash2, Check, X, UserPlus } from 'lucide-react'

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

export default function UserManagementPage() {
  const user = useAuthStore((s) => s.user)
  const usersRegistry = useAuthStore((s) => s.usersRegistry)
  const addUserRegistry = useAuthStore((s) => s.addUserRegistry)
  const updateUserRegistry = useAuthStore((s) => s.updateUserRegistry)
  const deleteUserRegistry = useAuthStore((s) => s.deleteUserRegistry)

  // Form State
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('engineer')
  const [newActive, setNewActive] = useState(true)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Edit State
  const [editingEmail, setEditingEmail] = useState(null)
  const [editRole, setEditRole] = useState('')
  const [editName, setEditName] = useState('')
  const [editActive, setEditActive] = useState(true)

  const handleAddUser = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    const emailTrimmed = newEmail.trim().toLowerCase()
    const nameTrimmed = newName.trim()

    if (!emailTrimmed || !nameTrimmed) {
      setFormError('Please enter both email and name.')
      return
    }

    if (!emailTrimmed.endsWith('@ikkgroup.com')) {
      setFormError('Email must belong to @ikkgroup.com domain.')
      return
    }

    const exists = usersRegistry.some((u) => u.email.toLowerCase() === emailTrimmed)
    if (exists) {
      setFormError('User email already exists in registry.')
      return
    }

    try {
      await addUserRegistry({
        email: emailTrimmed,
        name: nameTrimmed,
        role: newRole,
        active: newActive,
      })
      setNewEmail('')
      setNewName('')
      setNewRole('engineer')
      setNewActive(true)
      setFormSuccess('User successfully added to registry.')
      setTimeout(() => setFormSuccess(''), 3000)
    } catch (err) {
      setFormError(err.message || 'Failed to add user.')
    }
  }

  const startEdit = (u) => {
    setEditingEmail(u.email)
    setEditName(u.name)
    setEditRole(u.role)
    setEditActive(u.active)
  }

  const cancelEdit = () => {
    setEditingEmail(null)
  }

  const handleUpdateUser = async (email) => {
    try {
      await updateUserRegistry(email, {
        name: editName,
        role: editRole,
        active: editActive,
      })
      setEditingEmail(null)
    } catch (err) {
      alert(err.message || 'Failed to update user.')
    }
  }

  const handleDeleteUser = async (email) => {
    if (email.toLowerCase() === user?.email?.toLowerCase()) {
      alert('You cannot delete your own account.')
      return
    }
    if (window.confirm(`Are you sure you want to delete ${email} from the registry?`)) {
      try {
        await deleteUserRegistry(email)
      } catch (err) {
        alert(err.message || 'Failed to delete user.')
      }
    }
  }

  return (
    <div className="page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'var(--brand-light)', p: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', color: 'var(--brand)' }}>
          <Users size={24} />
        </div>
        <div>
          <h1 className="page-title" style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>User Management Console</h1>
          <p className="page-subtitle" style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Manage approved users, activate/deactivate accounts, and assign roles.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '24px' }}>
        {/* Add User Section */}
        <div className="card" style={{ padding: '20px', height: 'fit-content' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
            <UserPlus size={16} /> Add Approved User
          </h3>

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

          <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group">
              <label className="field-label" htmlFor="new-name" style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Name</label>
              <input
                id="new-name"
                type="text"
                className="field-input"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ahmad Admin"
                required
              />
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="new-email" style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Email Address</label>
              <input
                id="new-email"
                type="email"
                className="field-input"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@ikkgroup.com"
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>Must be an @ikkgroup.com domain.</span>
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="new-role" style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Role</label>
              <select
                id="new-role"
                className="field-input"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--card)' }}
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value={USER_ROLES.ADMIN}>Admin</option>
                <option value={USER_ROLES.MANAGER}>Manager</option>
                <option value={USER_ROLES.ENGINEER}>Engineer</option>
                <option value={USER_ROLES.REVIEWER}>Reviewer</option>
                <option value={USER_ROLES.VIEWER}>Viewer</option>
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input
                id="new-active"
                type="checkbox"
                checked={newActive}
                onChange={(e) => setNewActive(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="new-active" style={{ fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>Active (Access Enabled)</label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', padding: '10px 16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <Plus size={16} /> Add User
            </button>
          </form>
        </div>

        {/* Users List Section */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
            <Shield size={16} /> Approved Registry Users ({usersRegistry.length})
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
                  <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: '600' }}>Name / Email</th>
                  <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: '600', width: '130px' }}>Role</th>
                  <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: '600', width: '110px' }}>Status</th>
                  <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: '600', width: '110px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersRegistry.map((u) => {
                  const isSelf = u.email.toLowerCase() === user?.email?.toLowerCase()
                  const isEditing = editingEmail === u.email

                  return (
                    <tr key={u.email} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '12px 8px' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="field-input"
                            style={{ padding: '4px 8px', fontSize: '12.5px', width: '180px', borderRadius: '4px', border: '1px solid var(--border)' }}
                          />
                        ) : (
                          <strong style={{ display: 'block', fontWeight: '500' }}>{u.name} {isSelf && <span style={{ fontSize: '11px', color: 'var(--brand)', fontStyle: 'italic' }}>(you)</span>}</strong>
                        )}
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{u.email}</span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {isEditing ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="field-input"
                            style={{ padding: '4px 8px', fontSize: '12.5px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card)' }}
                          >
                            <option value={USER_ROLES.ADMIN}>Admin</option>
                            <option value={USER_ROLES.MANAGER}>Manager</option>
                            <option value={USER_ROLES.ENGINEER}>Engineer</option>
                            <option value={USER_ROLES.REVIEWER}>Reviewer</option>
                            <option value={USER_ROLES.VIEWER}>Viewer</option>
                          </select>
                        ) : (
                          <RoleBadge role={u.role} />
                        )}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {isEditing ? (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={editActive}
                              onChange={(e) => setEditActive(e.target.checked)}
                            />
                            <span style={{ fontSize: '12px' }}>Active</span>
                          </label>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: u.active ? 'var(--pass)' : 'var(--fail)',
                                display: 'inline-block',
                              }}
                            />
                            <span>{u.active ? 'Active' : 'Inactive'}</span>
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {isEditing ? (
                            <>
                              <button
                                className="btn btn-icon"
                                onClick={() => handleUpdateUser(u.email)}
                                style={{ padding: '4px 8px', color: 'var(--pass)' }}
                                title="Save changes"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                className="btn btn-icon"
                                onClick={cancelEdit}
                                style={{ padding: '4px 8px', color: 'var(--text-secondary)' }}
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-sm"
                                onClick={() => startEdit(u)}
                                style={{ padding: '4px 8px' }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-icon-ghost"
                                onClick={() => handleDeleteUser(u.email)}
                                disabled={isSelf}
                                style={{ color: isSelf ? 'var(--text-tertiary)' : 'var(--fail)' }}
                                title="Delete user"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
