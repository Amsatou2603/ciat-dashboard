import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { FilterBar } from '@/features/filters/FilterBar'
import { useFilters } from '@/features/filters/FiltersContext'
import { FiltersGate } from '@/components/FiltersGate'
import { PageHeader } from '@/components/PageHeader'
import { ProjectFormDialog } from '@/components/ProjectFormDialog'
import { ConfirmDialog } from '@/components/ui/dialog'
import { EmptyState, QueryState, Skeleton } from '@/components/ui/feedback'
import { LateBadge, ProgressBar, StatusBadge } from '@/components/ui/badges'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { formatDate, formatInt } from '@/lib/format'
import { useDeleteProject, useProjects } from '@/services/projects'
import type { Project } from '@/types/api'

const ORDERINGS = [['-received_date', 'Plus récents'], ['received_date', 'Plus anciens'], ['title', 'Titre (A→Z)'], ['-progress', 'Progression ↓'], ['progress', 'Progression ↑'], ['deadline', 'Échéance proche']]

export default function ProjectsPage() {
  const { can } = useAuth()
  const toast = useToast()
  const { params, key } = useFilters()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [ordering, setOrdering] = useState('-received_date')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Project | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Project | null>(null)
  const { error } = useFilters()
  const del = useDeleteProject()

  useEffect(() => { const t = setTimeout(() => { setDebounced(search.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [search])
  useEffect(() => { setPage(1) }, [key, ordering])

  const query = useProjects({ page, search: debounced, ordering, filters: params as Record<string, string>, }, !error)
  const data = query.data
  const writable = can('write_projects')

  const confirmDelete = async () => {
    if (!deleting) return
    try { await del.mutateAsync(deleting.id); toast.success('Projet supprimé.'); setDeleting(null) }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Suppression impossible.'); setDeleting(null) }
  }
  const actions = (p: Project) => (
    <div className="flex items-center justify-end gap-1">
      {writable && <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(p)} aria-label={`Modifier ${p.title}`}><Pencil aria-hidden size={16} /></button>}
      {can('delete_projects') && <button type="button" className="btn btn-ghost btn-sm btn-icon text-danger hover:text-danger" onClick={() => setDeleting(p)} aria-label={`Supprimer ${p.title}`}><Trash2 aria-hidden size={16} /></button>}
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Gestion" title="Projets" description="Tous les projets suivis par le CIAT. Les filtres de période, cohorte, domaine et statut s’appliquent ici aussi."
        actions={writable ? <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus aria-hidden size={17} /> Nouveau projet</button> : undefined} />
      <FilterBar />
      <FiltersGate>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search aria-hidden size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input className="input pl-10" type="search" placeholder="Rechercher un titre ou une description" aria-label="Rechercher un projet" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={100} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-2"><span className="sr-only sm:not-sr-only">Trier par</span>
            <select className="input w-auto" value={ordering} onChange={(e) => setOrdering(e.target.value)} aria-label="Trier par">{ORDERINGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        </div>

        <section className="panel overflow-hidden" aria-label="Liste des projets" aria-busy={query.isFetching}>
          <QueryState query={query} data={data} isEmpty={(d) => d.count === 0} skeleton={<div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, n) => <Skeleton key={n} className="h-14 w-full" />)}</div>}
            empty={<EmptyState icon="search" title="Aucun projet trouvé" hint="Aucun projet ne correspond à la recherche et aux filtres actifs." />}>
            {(d) => (
              <>
                <div className="scroll-x hidden md:block">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead><tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                      {['Projet', 'Domaine', 'Statut', 'Progression', 'Échéance'].map((h) => <th key={h} scope="col" className="px-5 py-3.5 font-semibold">{h}</th>)}<th scope="col" className="px-5 py-3.5"><span className="sr-only">Actions</span></th></tr></thead>
                    <tbody className="divide-y divide-line">
                      {d.results.map((p) => (
                        <tr key={p.id} className="transition hover:bg-surface-2/60">
                          <td className="max-w-[320px] px-5 py-4"><Link to={`/projets/${p.id}`} className="block truncate font-semibold hover:text-accent">{p.title}</Link><span className="text-xs text-ink-3">{p.cohort_name} · {p.porteur_detail.full_name}</span></td>
                          <td className="max-w-[200px] px-5 py-4 text-ink-2"><span className="line-clamp-2">{p.domain_label}</span></td>
                          <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                          <td className="w-[190px] px-5 py-4"><ProgressBar value={p.progress} label={`Progression de ${p.title}`} /></td>
                          <td className="px-5 py-4 text-ink-2"><span className="block whitespace-nowrap">{formatDate(p.deadline)}</span><LateBadge days={p.days_late} /></td>
                          <td className="px-3 py-4">{actions(p)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="divide-y divide-line md:hidden">
                  {d.results.map((p) => (
                    <li key={p.id} className="space-y-2.5 p-4">
                      <div className="flex items-start justify-between gap-2"><Link to={`/projets/${p.id}`} className="font-semibold leading-snug hover:text-accent">{p.title}</Link>{actions(p)}</div>
                      <p className="text-xs text-ink-3">{p.cohort_name} · {p.domain_label}</p>
                      <div className="flex flex-wrap items-center gap-2"><StatusBadge status={p.status} /><LateBadge days={p.days_late} /></div>
                      <ProgressBar value={p.progress} label={`Progression de ${p.title}`} />
                      <p className="text-xs text-ink-3">Échéance : {formatDate(p.deadline)}</p>
                    </li>
                  ))}
                </ul>
                <footer className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-2">
                  <span>{formatInt(d.count)} projet(s) · page {page}</span>
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-secondary btn-sm" disabled={!d.previous} onClick={() => setPage((n) => n - 1)}><ChevronLeft aria-hidden size={15} /> Précédent</button>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={!d.next} onClick={() => setPage((n) => n + 1)}>Suivant <ChevronRight aria-hidden size={15} /></button>
                  </div>
                </footer>
              </>
            )}
          </QueryState>
        </section>
      </FiltersGate>
      <ProjectFormDialog open={creating || !!editing} project={editing ?? undefined} onClose={() => { setCreating(false); setEditing(null) }} />
      <ConfirmDialog open={!!deleting} title="Supprimer ce projet ?" message={`« ${deleting?.title ?? ''} » ainsi que ses partenariats et financements seront définitivement supprimés. Cette action est irréversible.`} busy={del.isPending} onConfirm={() => void confirmDelete()} onClose={() => setDeleting(null)} />
    </div>
  )
}
