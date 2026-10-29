import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { FundingDialog, PartnershipDialog } from '@/components/LinkDialogs'
import { ProjectFormDialog } from '@/components/ProjectFormDialog'
import { ConfirmDialog } from '@/components/ui/dialog'
import { EmptyState, ErrorState, QueryState, Skeleton } from '@/components/ui/feedback'
import { LateBadge, ProgressBar, StatusBadge } from '@/components/ui/badges'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { formatDate, formatXof } from '@/lib/format'

const PHASES: Record<string, string> = { PRE: 'Pré-incubation', INC: 'Incubation', POST: 'Post-incubation' }
import { useDeleteLink, useDeleteProject, useFundingsList, usePartnershipsList, useProject } from '@/services/projects'

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-ink-3">{label}</dt><dd className="mt-1 text-[15px]">{children}</dd></div>
}

export default function ProjectDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = useAuth()
  const project = useProject(id)
  const [editing, setEditing] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [addPartnership, setAddPartnership] = useState(false)
  const [addFunding, setAddFunding] = useState(false)
  const [pPage, setPPage] = useState(1)
  const [fPage, setFPage] = useState(1)
  const partnerships = usePartnershipsList(pPage, id)
  const fundings = useFundingsList(fPage, id)
  const delProject = useDeleteProject()
  const delPartnership = useDeleteLink('partnerships')
  const delFunding = useDeleteLink('fundings')
  const writable = can('write_projects')

  if (!Number.isFinite(id)) return <ErrorState error={new ApiError(404, 'not_found', 'Projet introuvable.')} />
  if (project.isError) return (
    <div className="space-y-4"><Link to="/projets" className="btn btn-ghost btn-sm"><ArrowLeft aria-hidden size={15} /> Projets</Link><div className="panel"><ErrorState error={project.error} onRetry={() => void project.refetch()} /></div></div>
  )
  const p = project.data

  const remove = async () => {
    try { await delProject.mutateAsync(id); toast.success('Projet supprimé.'); navigate('/projets', { replace: true }) }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Suppression impossible.'); setRemoving(false) }
  }

  return (
    <div className="space-y-6">
      <Link to="/projets" className="btn btn-ghost btn-sm -ml-2"><ArrowLeft aria-hidden size={15} /> Projets</Link>
      <section className="panel panel-pad rise">
        {!p ? <Skeleton className="h-40 w-full" /> : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2"><StatusBadge status={p.status} /><LateBadge days={p.days_late} />{p.is_demo && <span className="badge tone-neutral">Donnée fictive</span>}</div>
                <h1 className="text-[28px] font-bold leading-tight sm:text-[34px]">{p.title}</h1>
                <p className="mt-2 max-w-2xl text-[15px] text-ink-2">{p.description || 'Aucune description renseignée.'}</p>
              </div>
              <div className="flex gap-2">
                {writable && <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}><Pencil aria-hidden size={16} /> Modifier</button>}
                {can('delete_projects') && <button type="button" className="btn btn-secondary text-danger" onClick={() => setRemoving(true)}><Trash2 aria-hidden size={16} /> Supprimer</button>}
              </div>
            </div>
            <div className="mt-6 max-w-xl"><ProgressBar value={p.progress} label="Progression du projet" /></div>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Cohorte">{p.cohort_name}</Info><Info label="Domaine">{p.domain_label}{p.subdomain_label ? ` — ${p.subdomain_label}` : ''}</Info>
              <Info label="Porteur">{p.porteur_detail.full_name}</Info><Info label="Prototype">{p.prototype_stage_label}</Info>
              <Info label="Idée reçue le">{formatDate(p.received_date)}</Info><Info label="Début">{formatDate(p.start_date)}</Info>
              <Info label="Date limite">{p.deadline ? formatDate(p.deadline) : 'Non renseignée'}</Info><Info label="Financements obtenus">{formatXof(p.funding_obtained)}</Info>
              {p.mentor && <Info label="Mentor">{p.mentor}</Info>}
              {p.phase && <Info label="Phase">{PHASES[p.phase] ?? p.phase}</Info>}
              {p.team_size !== null && <Info label="Équipe">{p.team_size} membre(s)</Info>}
              {p.evaluation_score !== null && <Info label="Note du comité">{Number(p.evaluation_score).toLocaleString('fr-FR')} / 20</Info>}
              <Info label="Retard cumulé">{p.delay_days > 0 ? `${p.delay_days} jour(s)` : 'Aucun'}</Info>
              {p.budget_granted_xof !== null && <Info label="Budget accordé / dépensé">{formatXof(p.budget_granted_xof)} / {p.budget_spent_xof !== null ? formatXof(p.budget_spent_xof) : 'n/d'}</Info>}
              {p.budget_requested_xof !== null && <Info label="Budget demandé">{formatXof(p.budget_requested_xof)}</Info>}
            </dl>
            {p.prototype_notes && <p className="mt-5 rounded-control bg-surface-2 px-4 py-3 text-sm text-ink-2"><strong className="text-ink">Prototype : </strong>{p.prototype_notes}</p>}
          </>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel panel-pad" aria-labelledby="h-part">
          <div className="mb-3 flex items-center justify-between"><h2 id="h-part" className="text-[15px] font-semibold">Partenariats</h2>{writable && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAddPartnership(true)}><Plus aria-hidden size={14} /> Ajouter</button>}</div>
          <QueryState query={partnerships} data={partnerships.data} isEmpty={(d) => d.count === 0} empty={<EmptyState title="Aucun partenariat" hint="Aucun partenariat n’est enregistré pour ce projet." />}>
            {(d) => (<>
              <ul className="divide-y divide-line">{d.results.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-semibold">{x.partner_name}</p><p className="text-xs text-ink-3">{x.nature_label} · {x.status_label}{x.start_date ? ` · depuis ${formatDate(x.start_date)}` : ''}</p></div>
                  {writable && <button type="button" className="btn btn-ghost btn-sm btn-icon text-danger" aria-label={`Supprimer le partenariat avec ${x.partner_name}`} onClick={() => delPartnership.mutate(x.id, { onSuccess: () => toast.success('Partenariat supprimé.'), onError: () => toast.error('Suppression impossible.') })}><Trash2 aria-hidden size={16} /></button>}</li>))}</ul>
              {(d.next || d.previous) && <Pager page={pPage} setPage={setPPage} next={!!d.next} prev={!!d.previous} />}
            </>)}
          </QueryState>
        </section>
        <section className="panel panel-pad" aria-labelledby="h-fund">
          <div className="mb-3 flex items-center justify-between"><h2 id="h-fund" className="text-[15px] font-semibold">Financements</h2>{writable && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAddFunding(true)}><Plus aria-hidden size={14} /> Ajouter</button>}</div>
          <QueryState query={fundings} data={fundings.data} isEmpty={(d) => d.count === 0} empty={<EmptyState title="Aucun financement" hint="Aucun financement n’est enregistré pour ce projet." />}>
            {(d) => (<>
              <ul className="divide-y divide-line">{d.results.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-semibold">{formatXof(x.amount_xof)}</p><p className="text-xs text-ink-3">{x.partner_name} · {formatDate(x.date)}</p></div>
                  <div className="flex items-center gap-1"><span className={`badge ${x.status === 'OBTENU' ? 'tone-success' : 'tone-warning'}`}>{x.status_label}</span>
                    {writable && <button type="button" className="btn btn-ghost btn-sm btn-icon text-danger" aria-label={`Supprimer le financement de ${formatXof(x.amount_xof)}`} onClick={() => delFunding.mutate(x.id, { onSuccess: () => toast.success('Financement supprimé.'), onError: () => toast.error('Suppression impossible.') })}><Trash2 aria-hidden size={16} /></button>}</div></li>))}</ul>
              {(d.next || d.previous) && <Pager page={fPage} setPage={setFPage} next={!!d.next} prev={!!d.previous} />}
            </>)}
          </QueryState>
        </section>
      </div>

      {p && <ProjectFormDialog open={editing} project={p} onClose={() => setEditing(false)} />}
      <PartnershipDialog open={addPartnership} onClose={() => setAddPartnership(false)} projectId={id} />
      <FundingDialog open={addFunding} onClose={() => setAddFunding(false)} projectId={id} />
      <ConfirmDialog open={removing} title="Supprimer ce projet ?" message="Le projet, ses partenariats et ses financements seront définitivement supprimés. Cette action est irréversible." busy={delProject.isPending} onConfirm={() => void remove()} onClose={() => setRemoving(false)} />
    </div>
  )
}

export function Pager({ page, setPage, next, prev }: { page: number; setPage: (n: number) => void; next: boolean; prev: boolean }) {
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-ink-2">
      <button type="button" className="btn btn-secondary btn-sm" disabled={!prev} onClick={() => setPage(page - 1)}>Précédent</button>
      <span>Page {page}</span>
      <button type="button" className="btn btn-secondary btn-sm" disabled={!next} onClick={() => setPage(page + 1)}>Suivant</button>
    </div>
  )
}
