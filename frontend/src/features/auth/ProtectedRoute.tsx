import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Capability } from '@/types/api'
import { useAuth } from './AuthContext'
import { Spinner } from '@/components/ui/feedback'

/** Protège les routes : redirige vers /connexion si non connecté, vers /acces-refuse si le rôle ne suffit pas. */
export function ProtectedRoute({ requires }: { requires?: Capability }) {
  const { status, can } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <div className="grid min-h-dvh place-items-center"><Spinner label="Vérification de la session…" /></div>
  if (status === 'anonymous') return <Navigate to="/connexion" replace state={{ from: location.pathname + location.search }} />
  if (requires && !can(requires)) return <Navigate to="/acces-refuse" replace />
  return <Outlet />
}
