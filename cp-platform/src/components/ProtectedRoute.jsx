import { Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore.js'
import { DOMAIN_RESTRICTION_MESSAGE, ROLE_RESTRICTION_MESSAGE, hasRole } from '../config/authPolicy.js'
import { Loader2, AlertCircle } from 'lucide-react'

function AuthErrorScreen({ title, message }) {
  return (
    <div className="auth-loading">
      <div className="auth-error">
        <AlertCircle size={32} color="var(--fail)" />
        <h2>{title}</h2>
        <p>{message}</p>
        <p style={{ marginTop: '1rem', opacity: 0.7 }}>
          Contact your administrator for access.
        </p>
      </div>
    </div>
  )
}

/**
 * ProtectedRoute — requires authentication.
 * Wraps all authenticated routes.
 */
export function ProtectedRoute({ children }) {
  const { user, loading, error, initialize } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [initialize])

  if (loading) {
    return (
      <div className="auth-loading">
        <Loader2 size={32} className="spin" />
        <p>Verifying authentication…</p>
      </div>
    )
  }

  if (!user) {
    if (error && error.includes(DOMAIN_RESTRICTION_MESSAGE)) {
      return <AuthErrorScreen title="Access Denied" message={error} />
    }
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

/**
 * RoleRoute — requires a specific role level.
 * Must be used inside ProtectedRoute.
 *
 * @param {Object} props
 * @param {string} props.requiredRole - Minimum role required (e.g., 'engineer')
 * @param {React.ReactNode} props.children
 */
export function RoleRoute({ requiredRole, children }) {
  const { user } = useAuthStore()

  if (!hasRole(user, requiredRole)) {
    return (
      <AuthErrorScreen
        title="Insufficient Permissions"
        message={`${ROLE_RESTRICTION_MESSAGE} Required: ${requiredRole} or higher.`}
      />
    )
  }

  return children
}

/**
 * PublicRoute — only accessible when NOT authenticated.
 * Redirects to /project if user is already logged in.
 */
export function PublicRoute({ children }) {
  const { user, loading, initialize } = useAuthStore()

  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [initialize])

  if (loading) {
    return (
      <div className="auth-loading">
        <Loader2 size={32} className="spin" />
        <p>Loading…</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/project" replace />
  }

  return children
}