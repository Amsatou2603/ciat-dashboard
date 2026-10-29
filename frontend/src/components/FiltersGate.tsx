import type { ReactNode } from 'react'
import { EmptyState } from '@/components/ui/feedback'
import { useFilters } from '@/features/filters/FiltersContext'

/** N'affiche le contenu que si les filtres sont cohérents (aucune requête n'est émise avec une période inversée). */
export function FiltersGate({ children }: { children: ReactNode }) {
  const { error, reset } = useFilters()
  if (!error) return <>{children}</>
  return <div className="panel"><EmptyState title="Période invalide" hint={error} icon="search" action={<button type="button" className="btn btn-secondary btn-sm" onClick={reset}>Réinitialiser les filtres</button>} /></div>
}
