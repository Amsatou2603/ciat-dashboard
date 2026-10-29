import { Link } from 'react-router-dom'
import { Download, Info } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { FilterBar } from '@/features/filters/FilterBar'
import { useFilters } from '@/features/filters/FiltersContext'
import { FiltersGate } from '@/components/FiltersGate'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, QueryState, Skeleton } from '@/components/ui/feedback'
import { LateBadge } from '@/components/ui/badges'
import { formatDate, formatInt, formatPct, formatXof } from '@/lib/format'
import { useSummary } from '@/services/analytics'

export default function SummaryPage() {
  const { can } = useAuth()
  const { search } = useFilters()
  const q = useSummary()
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Fiche de synthèse" title="Synthèse de la période" description={q.data ? `Période : ${q.data.period}.` : 'Résumé chiffré de la sélection active.'}
        actions={can('export') ? <Link to={{ pathname: '/exports', search }} className="btn btn-secondary"><Download aria-hidden size={16} /> Exporter</Link> : undefined} />
      <FilterBar />
      <FiltersGate>
        <QueryState query={q} data={q.data} isEmpty={(d) => d.indicators.ideas_received === 0} skeleton={<Skeleton className="h-80 w-full" />}
          empty={<div className="panel"><EmptyState icon="search" title="Aucune donnée sur cette période" hint="Aucun projet ne correspond à la sélection : élargissez les filtres." /></div>}>
          {(d) => (
            <div className="grid gap-5 lg:grid-cols-3">
              <section className="panel panel-pad lg:col-span-2" aria-labelledby="s-ind">
                <h2 id="s-ind" className="eyebrow mb-4">Indicateurs principaux</h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                  {[...(d.indicators.cohort_aggregates?.applicable ? [['Candidatures (agrégat cohortes)', formatInt(d.indicators.cohort_aggregates.applications ?? 0)], ['Sélections (agrégat cohortes)', `${formatInt(d.indicators.cohort_aggregates.selections ?? 0)} (${formatPct(d.indicators.cohort_aggregates.selection_rate_pct)})`]] : []), ['Projets enregistrés', formatInt(d.indicators.ideas_received)], ['Projets sélectionnés', `${formatInt(d.indicators.projects_selected)} (${formatPct(d.indicators.selection_rate_pct)})`],
                    ['Prototypes', formatInt(d.indicators.prototypes)], ['Porteurs distincts', formatInt(d.indicators.porteurs)], ['Progression moyenne', formatPct(d.indicators.average_progress_pct)],
                    ['Projets en retard', formatInt(d.indicators.late_projects)], ['Partenariats', formatInt(d.indicators.partnerships)],
                    ['Financements obtenus', formatXof(d.indicators.funding_obtained_xof)], ['Financements promis', formatXof(d.indicators.funding_promised_xof)],
                    ...(d.indicators.average_evaluation_score !== null ? [['Note moyenne du comité', `${formatPct(d.indicators.average_evaluation_score).replace(' %', '')} / 20`]] : []),
                    ...(d.indicators.budget_granted_xof ? [['Budgets accordés (projets)', formatXof(d.indicators.budget_granted_xof, true)], ['Budgets dépensés (projets)', formatXof(d.indicators.budget_spent_xof, true)]] : [])].map(([l, v]) => (
                    <div key={l}><dt className="text-[13px] text-ink-3">{l}</dt><dd className="num mt-1 text-xl font-bold">{v}</dd></div>))}
                </dl>
                <h2 className="eyebrow mb-3 mt-8">Observations pour la décision</h2>
                <ul className="space-y-2.5 text-[15px] text-ink-2">{d.observations.map((o) => <li key={o} className="flex gap-2.5"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{o}</li>)}</ul>
                <p className="mt-3 text-xs text-ink-3">Observations produites par des règles de calcul déterministes, sans IA générative.</p>
              </section>
              <section className="panel panel-pad" aria-labelledby="s-lim">
                <h2 id="s-lim" className="eyebrow mb-4 flex items-center gap-2"><Info aria-hidden size={14} /> Limites des données</h2>
                <ul className="space-y-3 text-sm text-ink-2">{d.limits.map((l) => <li key={l} className="rounded-control bg-surface-2 px-3.5 py-2.5">{l}</li>)}</ul>
              </section>
              <section className="panel panel-pad" aria-labelledby="s-dom">
                <h2 id="s-dom" className="eyebrow mb-4">Domaines les plus représentés</h2>
                <ol className="space-y-2.5">{d.top_domains.map((x, n) => <li key={String(x.key)} className="flex items-baseline gap-3 text-[15px]"><span className="num w-5 font-bold text-accent">{n + 1}</span><span className="flex-1">{x.label}</span><span className="num font-semibold">{x.count}</span></li>)}</ol>
              </section>
              <section className="panel panel-pad lg:col-span-2" aria-labelledby="s-coh">
                <h2 id="s-coh" className="eyebrow mb-4">Cohortes</h2>
                <div className="scroll-x"><table className="w-full min-w-[520px] text-left text-sm">
                  <thead><tr className="text-xs uppercase tracking-wide text-ink-3">{['Cohorte', 'Idées', 'Sél.', 'Proto.', 'Progression', 'Retards'].map((h) => <th key={h} scope="col" className="pb-2 pr-4 font-semibold">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-line">{d.cohorts.map((c) => <tr key={c.cohort_id}><th scope="row" className="py-3 pr-4 font-semibold">{c.cohort}</th><td className="num pr-4">{c.ideas}</td><td className="num pr-4">{c.selected}</td><td className="num pr-4">{c.prototypes}</td><td className="num pr-4">{formatPct(c.average_progress_pct)}</td><td className="num">{c.late}</td></tr>)}</tbody>
                </table></div>
              </section>
              {d.late_projects.length > 0 && (
                <section className="panel panel-pad lg:col-span-3" aria-labelledby="s-late">
                  <h2 id="s-late" className="eyebrow mb-3">Projets en retard (5 premiers)</h2>
                  <ul className="divide-y divide-line">{d.late_projects.map((p) => <li key={p.id}><Link to={`/projets/${p.id}`} className="group flex flex-wrap items-center justify-between gap-3 py-3"><span><span className="font-semibold group-hover:text-accent">{p.title}</span><span className="block text-xs text-ink-3">{p.cohort} · {p.domain} · {p.deadline ? `échéance ${formatDate(p.deadline)}` : 'retard cumulé sur les jalons'} · {p.progress} %</span></span><LateBadge days={p.days_late} /></Link></li>)}</ul>
                </section>
              )}
            </div>
          )}
        </QueryState>
      </FiltersGate>
    </div>
  )
}
