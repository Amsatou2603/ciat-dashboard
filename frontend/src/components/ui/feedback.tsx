import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, RefreshCw, SearchX } from 'lucide-react'
import { ApiError } from '@/lib/api'

export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 text-sm text-ink-2">
      <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
      {label}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />
}

export function EmptyState({ title, hint, icon = 'inbox', action }: { title: string; hint?: string; icon?: 'inbox' | 'search'; action?: ReactNode }) {
  const Icon = icon === 'search' ? SearchX : Inbox
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink-3"><Icon aria-hidden size={22} /></span>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-sm text-sm text-ink-2">{hint}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError ? error.message : 'Une erreur inattendue est survenue.'
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger"><AlertTriangle aria-hidden size={22} /></span>
      <p className="text-[15px] font-semibold text-ink">Impossible de charger ces données</p>
      <p className="max-w-sm text-sm text-ink-2">{message}</p>
      {onRetry && <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}><RefreshCw aria-hidden size={14} /> Réessayer</button>}
    </div>
  )
}

interface QueryLike { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown }

/** Gère uniformément chargement / erreur / absence de données pour un bloc de visualisation. */
export function QueryState<T>({ query, data, isEmpty, empty, skeleton, children }: {
  query: QueryLike; data: T | undefined; isEmpty?: (d: T) => boolean
  empty?: ReactNode; skeleton?: ReactNode; children: (d: T) => ReactNode
}) {
  if (query.isPending) return <>{skeleton ?? <Skeleton className="h-48 w-full" />}</>
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  if (data === undefined) return null
  if (isEmpty?.(data)) return <>{empty ?? <EmptyState title="Aucune donnée" hint="Aucun résultat pour la sélection actuelle. Modifiez les filtres." icon="search" />}</>
  return <>{children(data)}</>
}
