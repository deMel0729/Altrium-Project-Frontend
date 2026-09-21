import { Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/ToastProvider'
import { EmptyState } from './components/ui'
import { AuthProvider } from './auth/AuthContext'
import { ROLES } from './auth/auth-context'
import { RequireAuth, RequireRole } from './auth/RequireAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import Contacts from './pages/Contacts'
import Leads from './pages/Leads'
import Deals from './pages/Deals'
import Engagements from './pages/Engagements'
import FollowUps from './pages/FollowUps'
import Team from './pages/Team'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* The only screen reachable without a token. */}
          <Route path="/login" element={<Login />} />

          {/* Everything else sits behind the guard, so a signed-out visitor is sent
              to the login page instead of watching every request fail with a 401. */}
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="companies" element={<Companies />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="leads" element={<Leads />} />
            <Route path="deals" element={<Deals />} />
            <Route path="engagements" element={<Engagements />} />
            <Route path="follow-ups" element={<FollowUps />} />
            <Route
              path="team"
              element={
                <RequireRole roles={[ROLES.LEADERSHIP]}>
                  <Team />
                </RequireRole>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="That route is not part of the CRM."
      action={
        <Link className="btn btn--primary" to="/">
          Back to dashboard
        </Link>
      }
    />
  )
}
