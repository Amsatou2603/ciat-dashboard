import { useState } from 'react'
import { Filter, RotateCcw } from 'lucide-react'
import { useFilterOptions } from '@/services/analytics'
import { Dialog } from '@/components/ui/dialog'
import { useFilters } from './FiltersContext'

function FilterFields({ compact = false }: { compact?: boolean }) {
  const { filters, setFilter, setFilters, error } = useFilters()
  const { data: options } = useFilterOptions()
  const cls = compact ? 'input' : 'input min-h-[40px] py-1.5 text-sm'
  const label = 'mb-1 block text-xs font-semibold text-ink-3'
  return (
    <>
      <div><label className={label} htmlFor="f-start">Du</label>
        <input id="f-start" type="date" className={cls} value={filters.period_start} max={filters.period_end || undefined} aria-invalid={!!error} onChange={(e) => setFilter('period_start', e.target.value)} /></div>
      <div><label className={label} htmlFor="f-end">Au</label>
        <input id="f-end" type="date" className={cls} value={filters.period_end} min={filters.period_start || undefined} aria-invalid={!!error} aria-describedby={error ? 'f-error' : undefined} onChange={(e) => setFilter('period_end', e.target.value)} /></div>
      <div><label className={label} htmlFor="f-cohort">Cohorte</label>
        <select id="f-cohort" className={cls} value={filters.cohort} onChange={(e) => setFilter('cohort', e.target.value)}>
          <option value="">Toutes</option>{options?.cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div><label className={label} htmlFor="f-domain">Domaine</label>
        <select id="f-domain" className={cls} value={filters.domain} onChange={(e) => setFilters({ domain: e.target.value, subdomain: '' })}>
          <option value="">Tous</option>{options?.domains.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>
      <div><label className={label} htmlFor="f-subdomain">Sous-domaine</label>
        <select id="f-subdomain" className={cls} value={filters.subdomain} onChange={(e) => setFilter('subdomain', e.target.value)}>
          <option value="">Tous</option>{options?.subdomains.filter((s) => !filters.domain || String(s.domain) === filters.domain).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
      <div><label className={label} htmlFor="f-status">Statut</label>
        <select id="f-status" className={cls} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">Tous</option>{options?.statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
      {options?.porteur_filter_available && (
        <div><label className={label} htmlFor="f-porteur">Porteur</label>
          <select id="f-porteur" className={cls} value={filters.porteur} onChange={(e) => setFilter('porteur', e.target.value)}>
            <option value="">Tous</option>{options.porteurs.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
      )}
    </>
  )
}

/** Barre de filtres flottante (verre) : en ligne sur grand écran, feuille modale sur mobile. */
export function FilterBar() {
  const { activeCount, reset, error } = useFilters()
  const [open, setOpen] = useState(false)
  return (
    <div className="sticky top-[calc(env(safe-area-inset-top)+4.5rem)] z-20 -mx-1">
      <div className="glass rounded-[20px] px-3 py-2.5 sm:px-4">
        <div className="hidden items-end gap-3 md:flex" role="group" aria-label="Filtres">
          <div className="grid flex-1 grid-cols-3 gap-3 xl:grid-cols-7"><FilterFields /></div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={!activeCount}><RotateCcw aria-hidden size={14} /> Réinitialiser</button>
        </div>
        <div className="flex items-center justify-between gap-3 md:hidden">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(true)} aria-haspopup="dialog">
            <Filter aria-hidden size={15} /> Filtres{activeCount > 0 && <span className="badge tone-info -mr-1 px-2 py-0.5">{activeCount}</span>}
          </button>
          {activeCount > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>Réinitialiser</button>}
        </div>
        {error && <p id="f-error" role="alert" className="field-error mt-2">{error}</p>}
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Filtres" description="Les indicateurs et graphiques se mettent à jour automatiquement."
        footer={<><button type="button" className="btn btn-secondary" onClick={reset}>Réinitialiser</button><button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>Appliquer</button></>}>
        <div className="grid gap-4 sm:grid-cols-2"><FilterFields compact /></div>
        {error && <p role="alert" className="field-error mt-3">{error}</p>}
      </Dialog>
    </div>
  )
}
