import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { AppShell } from '@/layouts/AppShell'
import { Spinner } from '@/components/ui/feedback'
import LoginPage from '@/pages/LoginPage'
import { AccessDeniedPage, NotFoundPage } from '@/pages/StatusPages'

// Les pages lourdes (graphiques) sont chargées à la demande.
const Dashboard = lazy(() => import('@/pages/DashboardPage'))
const Summary = lazy(() => import('@/pages/SummaryPage'))
const Projects = lazy(() => import('@/pages/ProjectsPage'))
const ProjectDetail = lazy(() => import('@/pages/ProjectDetailPage'))
const Partnerships = lazy(() => import('@/pages/PartnershipsPage'))
const Assistant = lazy(() => import('@/pages/AssistantPage'))
const Exports = lazy(() => import('@/pages/ExportsPage'))
const Users = lazy(() => import('@/pages/UsersPage'))

export function App() {
  return (
    <Suspense fallback={<div className="grid min-h-[50dvh] place-items-center"><Spinner /></div>}>
      <Routes>
        <Route path="/connexion" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/acces-refuse" element={<AccessDeniedPage />} />
            <Route element={<ProtectedRoute requires="view_dashboard" />}>
              <Route index element={<Dashboard />} />
              <Route path="/synthese" element={<Summary />} />
              <Route path="/partenariats" element={<Partnerships />} />
            </Route>
            <Route element={<ProtectedRoute requires="view_projects" />}>
              <Route path="/projets" element={<Projects />} />
              <Route path="/projets/:id" element={<ProjectDetail />} />
            </Route>
            <Route element={<ProtectedRoute requires="use_ai" />}><Route path="/assistant" element={<Assistant />} /></Route>
            <Route element={<ProtectedRoute requires="export" />}><Route path="/exports" element={<Exports />} /></Route>
            <Route element={<ProtectedRoute requires="manage_users" />}><Route path="/utilisateurs" element={<Users />} /></Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
