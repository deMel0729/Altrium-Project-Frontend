import { Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/ToastProvider'
import { EmptyState } from './components/ui'
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
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="companies" element={<Companies />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="leads" element={<Leads />} />
          <Route path="deals" element={<Deals />} />
          <Route path="engagements" element={<Engagements />} />
          <Route path="follow-ups" element={<FollowUps />} />
          <Route path="team" element={<Team />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ToastProvider>
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
