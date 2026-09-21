import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './auth-context'
import { EmptyState, Spinner } from '../components/ui'

// These guards are for the user interface only. They stop a rep being shown a
// screen full of buttons that would fail anyway — they are not what keeps the data
// safe. Every one of these rules is enforced again in the API, which is the only
// place enforcement is real: anyone can open devtools and call the endpoint
// themselves.
export function RequireAuth({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return <Spinner label="Checking your session" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export function RequireRole({ roles, children }) {
  const { user, ready } = useAuth()

  if (!ready) return <Spinner label="Checking your session" />
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.userRole)) {
    return (
      <EmptyState
        title="Not available for your role"
        description="This page is limited to leadership accounts."
      />
    )
  }
  return children
}
