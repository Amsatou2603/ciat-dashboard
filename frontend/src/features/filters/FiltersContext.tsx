import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Params } from '@/lib/api'

export interface Filters { period_start: string; period_end: string; cohort: string; domain: string; subdomain: string; status: string; porteur: string }
const KEYS: (keyof Filters)[] = ['period_start', 'period_end', 'cohort', 'domain', 'subdomain', 'status', 'porteur']
const ISO = /^\d{4}-\d{2}-\d{2}$/

interface Ctx {
  filters: Filters
  setFilter: (key: keyof Filters, value: string) => void
  /** Modifie plusieurs filtres en une seule mise à jour d'URL (évite que deux appels successifs s'écrasent). */
  setFilters: (patch: Partial<Filters>) => void
  reset: () => void
  /** Paramètres propres à envoyer à l'API (valeurs vides retirées). */
  params: Params
  /** Chaîne stable pour les clés de cache. */
  key: string
  activeCount: number
  /** Message si la combinaison est invalide (ex. fin avant début) : aucune requête n'est alors émise. */
  error: string | null
  /** Query-string à conserver lors des navigations entre pages. */
  search: string
}
const Ctx = createContext<Ctx | null>(null)

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [sp, setSp] = useSearchParams()
  const filters = useMemo<Filters>(() => {
    const f = Object.fromEntries(KEYS.map((k) => [k, sp.get(k) ?? ''])) as unknown as Filters
    // Valeurs corrompues dans l'URL : ignorées plutôt que transmises au serveur.
    if (f.period_start && !ISO.test(f.period_start)) f.period_start = ''
    if (f.period_end && !ISO.test(f.period_end)) f.period_end = ''
    for (const k of ['cohort', 'domain', 'subdomain', 'porteur'] as const) if (f[k] && !/^\d+$/.test(f[k])) f[k] = ''
    return f
  }, [sp])

  const setFilter = useCallback((key: keyof Filters, value: string) => {
    setSp((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value); else next.delete(key)
      return next
    }, { replace: true })
  }, [setSp])
  const setFilters = useCallback((patch: Partial<Filters>) => {
    setSp((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(patch)) { if (value) next.set(key, value); else next.delete(key) }
      return next
    }, { replace: true })
  }, [setSp])
  const reset = useCallback(() => setSp((prev) => { const n = new URLSearchParams(prev); KEYS.forEach((k) => n.delete(k)); return n }, { replace: true }), [setSp])

  const value = useMemo<Ctx>(() => {
    const params: Params = {}
    for (const k of KEYS) if (filters[k]) params[k] = filters[k]
    const error = filters.period_start && filters.period_end && filters.period_start > filters.period_end
      ? 'La date de fin doit être postérieure à la date de début.' : null
    const search = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
    return { filters, setFilter, setFilters, reset, params, key: JSON.stringify(params), activeCount: Object.keys(params).length, error, search: search ? `?${search}` : '' }
  }, [filters, setFilter, setFilters, reset])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useFilters(): Ctx {
  const c = useContext(Ctx)
  if (!c) throw new Error('FiltersProvider manquant')
  return c
}
