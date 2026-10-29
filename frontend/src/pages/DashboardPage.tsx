import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, Download, FlaskConical, Handshake, Info, Rocket, Sparkles, Target, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { FilterBar } from '@/features/filters/FilterBar'
import { useFilters } from '@/features/filters/FiltersContext'
import { FiltersGate } from '@/components/FiltersGate'
import { PageHeader } from '@/components/PageHeader'
import { BarList, ChartCard, CohortChart, Donut, ProgressChart, TimelineChart } from '@/components/charts/charts'
import { EmptyState, QueryState, Skeleton } from '@/components/ui/feedback'
import { LateBadge, ProgressBar } from '@/components/ui/badges'
import { formatDate, formatInt, formatPct, formatXof } from '@/lib/format'
import { useBreakdown, useCohorts, useFundingOverview, useIndicators, useLate, useProgress, useSummary, useTimeseries } from '@/services/analytics'
import type { ReactNode } from 'react'

function Kpi({ icon: Icon, label, value, hint, children }: { icon: typeof Target; label: string; value: ReactNode; hint?: ReactNode; children?: ReactNode }) {
  return (
    <div className="p-5">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-2"><Icon aria-hidden size={16} className="text-accent" />{label}</p>
      <p className="num mt-2 text-[28px] font-bold leading-none">{value}</p>
      {hint && <p className="mt-1.5 text-[13px] text-ink-3">{hint}</p>}
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const { user, can } = useAuth()
  const { search, filters, setFilter } = useFilters()
  const navigate = useNavigate()
  const ind = useIndicators()
  const ts = useTimeseries()
  const late = useLate()
  const status = useBreakdown('status')
  const domain = useBreakdown('domain')
  const subdomain = useBreakdown('subdomain')
  const gender = useBreakdown('gender')
  const cohorts = useCohorts()
  const progress = useProgress()
  const funding = useFundingOverview()
  const summary = useSummary()
  const i = ind.data
  const agg = i?.cohort_aggregates
  const useAgg = !!agg?.applicable
  const toggle = (key: 'status' | 'domain' | 'subdomain', value: string | number) => setFilter(key, filters[key] === String(value) ? '' : String(value))

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} title={`Bonjour, ${user?.first_name || user?.username || ''}`}
        description="Vue d’ensemble de l’incubateur : ce qui avance, ce qui prend du retard et ce qui mérite une décision."
        actions={<>{can('export') && <Link to={{ pathname: '/exports', search }} className="btn btn-secondary btn-sm"><Download aria-hidden size={15} /> Exporter</Link>}
          {can('use_ai') && <Link to="/assistant" className="btn btn-primary btn-sm"><Sparkles aria-hidden size={15} /> Assistant IA</Link>}</>} />
      <FilterBar />
      <FiltersGate>
        {i && i.data_quality.demo_projects > 0 && (
          <div role="note" className="flex items-start gap-3 rounded-[18px] bg-accent-soft px-4 py-3 text-sm text-ink">
            <Info aria-hidden size={18} className="mt-0.5 shrink-0 text-accent" />
            <p><strong>Données fictives de démonstration.</strong> {i.data_quality.demo_projects} projet(s) affiché(s) ne sont pas des données officielles du CIAT.</p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-12">
          <section className="panel panel-pad rise lg:col-span-8" style={{ ['--i' as string]: 1 }} aria-labelledby="pipeline">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="pipeline" className="eyebrow">{useAgg ? 'Candidatures reçues' : 'Idées reçues'}</h2>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {i ? <span className="num text-[52px] font-bold leading-none sm:text-[64px]">{formatInt(useAgg ? (agg?.applications ?? 0) : i.ideas_received)}</span> : <Skeleton className="h-14 w-28" />}
                  {i && (useAgg
                    ? <span className="text-[15px] text-ink-2">dont <strong className="text-ink">{formatInt(agg?.selections ?? 0)}</strong> sélectionnées ({formatPct(agg?.selection_rate_pct)}) · agrégat des cohortes</span>
                    : <span className="text-[15px] text-ink-2">dont <strong className="text-ink">{formatInt(i.projects_selected)}</strong> sélectionnées ({formatPct(i.selection_rate_pct)})</span>)}
                </div>
              </div>
              {summary.data?.trend && (
                <p className={`badge ${summary.data.trend.delta >= 0 ? 'tone-success' : 'tone-warning'}`}>
                  {summary.data.trend.delta >= 0 ? <TrendingUp aria-hidden size={14} /> : <TrendingDown aria-hidden size={14} />}
                  {summary.data.trend.delta === 0 ? 'Stable' : `${summary.data.trend.delta > 0 ? '+' : ''}${summary.data.trend.delta}`} vs mois précédent
                </p>
              )}
            </div>
            {i && useAgg && <p className="-mt-2 mb-3 text-[13px] text-ink-3">{formatInt(i.ideas_received)} projet(s) détaillé(s) suivis ci-dessous ; la courbe montre ces projets par mois de dépôt.</p>}
            {agg && !agg.applicable && <p className="-mt-2 mb-3 text-[13px] text-ink-3">{agg.reason}</p>}
            <QueryState query={ts} data={ts.data?.items} isEmpty={(d) => d.length === 0} skeleton={<Skeleton className="h-[280px] w-full" />}
              empty={<EmptyState title="Aucune idée reçue sur cette période" hint="Élargissez la période ou réinitialisez les filtres." icon="search" />}>
              {(items) => <TimelineChart data={items} />}
            </QueryState>
          </section>

          <section className="panel panel-pad rise lg:col-span-4" style={{ ['--i' as string]: 2 }} aria-labelledby="watch">
            <h2 id="watch" className="eyebrow flex items-center gap-2"><AlertTriangle aria-hidden size={14} /> À surveiller</h2>
            <QueryState query={late} data={late.data?.items} skeleton={<Skeleton className="mt-3 h-52 w-full" />}>
              {(items) => (
                <>
                  <p className="mt-2 flex items-baseline gap-2"><span className={`num text-[44px] font-bold leading-none ${items.length ? 'text-danger' : 'text-success'}`}>{formatInt(i?.late_projects ?? items.length)}</span><span className="text-[15px] text-ink-2">projet(s) en retard</span></p>
                  {items.length === 0 ? (
                    <p className="mt-4 flex items-center gap-2 rounded-control bg-success-soft px-3 py-2.5 text-sm font-medium text-success"><CheckCircle2 aria-hidden size={16} /> Aucun projet en cours n’est en retard.</p>
                  ) : (
                    <ul className="mt-4 divide-y divide-line">
                      {items.slice(0, 4).map((p) => (
                        <li key={p.id}><Link to={`/projets/${p.id}`} className="group flex items-start justify-between gap-3 py-3">
                          <span className="min-w-0"><span className="block truncate text-[14px] font-semibold group-hover:text-accent">{p.title}</span><span className="block text-xs text-ink-3">{p.cohort} · {p.deadline ? `échéance ${formatDate(p.deadline)}` : 'retard cumulé sur les jalons'}</span></span>
                          <LateBadge days={p.days_late} /></Link></li>
                      ))}
                    </ul>
                  )}
                  {i && i.data_quality.active_without_deadline > 0 && <p className="mt-3 text-xs text-ink-3">{i.data_quality.active_without_deadline} projet(s) en cours sans date limite ni retard cumulé : retard non évaluable (ou nul).</p>}
                </>
              )}
            </QueryState>
          </section>
        </div>

        <section className="panel rise overflow-hidden" style={{ ['--i' as string]: 3 }} aria-label="Indicateurs clés">
          {ind.isError ? <div className="p-4"><QueryState query={ind} data={i}>{() => null}</QueryState></div> : (
            <div className="grid grid-cols-2 divide-line sm:grid-cols-3 sm:divide-x xl:grid-cols-6 [&>*]:border-b [&>*]:border-line xl:[&>*]:border-b-0">
              {!i ? Array.from({ length: 6 }, (_, n) => <div key={n} className="p-5"><Skeleton className="h-20 w-full" /></div>) : (
                <>
                  <Kpi icon={Target} label="Sélectionnés" value={formatInt(useAgg ? (agg?.selections ?? 0) : i.projects_selected)} hint={useAgg ? `${formatPct(agg?.selection_rate_pct)} des candidatures · ${formatInt(i.projects_selected)} projet(s) détaillé(s)` : `${formatPct(i.selection_rate_pct)} des idées`} />
                  <Kpi icon={FlaskConical} label="Prototypes" value={formatInt(i.prototypes)} hint="Prototype fonctionnel ou MVP" />
                  <Kpi icon={Rocket} label="Progression moyenne" value={formatPct(i.average_progress_pct)} hint={`${formatInt(i.active_projects)} projet(s) en cours`}>
                    {i.average_progress_pct !== null && <div className="mt-2"><ProgressBar value={i.average_progress_pct} label="Progression moyenne" showValue={false} /></div>}
                  </Kpi>
                  <Kpi icon={Handshake} label="Partenariats" value={formatInt(i.partnerships)} hint={`${formatInt(i.distinct_partners)} partenaire(s) · ${formatInt(i.partnerships_active)} actif(s)`} />
                  <Kpi icon={Wallet} label="Financements obtenus" value={i.funding_count ? formatXof(i.funding_obtained_xof, true) : 'Aucun'} hint={i.funding_count ? `${formatXof(i.funding_promised_xof, true)} promis` : 'Aucun financement enregistré'} />
                  <Kpi icon={Users} label="Porteurs distincts" value={formatInt(i.porteurs)} hint={`pour ${formatInt(i.ideas_received)} projet(s)`} />
                </>
              )}
            </div>
          )}
        </section>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <ChartCard title="Répartition par statut" subtitle="Cliquez une ligne pour filtrer">
            <QueryState query={status} data={status.data} isEmpty={(d) => d.items.every((x) => x.count === 0)}>
              {(d) => <BarList items={d.items} onSelect={(k) => toggle('status', k)} selectedKey={filters.status} />}
            </QueryState>
          </ChartCard>
          <ChartCard title="Répartition par domaine" subtitle="Domaine, puis sous-domaine — cliquez pour filtrer">
            <QueryState query={domain} data={domain.data} isEmpty={(d) => d.items.length === 0}>
              {(d) => <BarList items={d.items} colorOffset={1} onSelect={(k) => toggle('domain', k)} selectedKey={filters.domain} />}
            </QueryState>
            {subdomain.data && subdomain.data.items.some((x) => x.key !== 'none') && (
              <div className="mt-5 border-t border-line pt-4">
                <h4 className="eyebrow mb-3">Sous-domaines</h4>
                <BarList items={subdomain.data.items} colorOffset={3} onSelect={(k) => k !== 'none' && toggle('subdomain', k)} selectedKey={filters.subdomain} />
              </div>
            )}
          </ChartCard>
          <ChartCard title="Comparaison des cohortes" subtitle="Idées, sélectionnés, prototypes" className="md:col-span-2 xl:col-span-1">
            <QueryState query={cohorts} data={cohorts.data?.items} isEmpty={(d) => d.length === 0}>{(rows) => <CohortChart rows={rows} />}</QueryState>
          </ChartCard>
          <ChartCard title="Progression des projets en cours" subtitle="Nombre de projets par tranche">
            <QueryState query={progress} data={progress.data} isEmpty={(d) => d.active_total === 0} empty={<EmptyState title="Aucun projet en cours" hint="La progression n’a de sens que pour les projets sélectionnés en cours de réalisation." />}>
              {(d) => <ProgressChart items={d.distribution} />}
            </QueryState>
          </ChartCard>
          <ChartCard title="Répartition par genre" subtitle="Genre du porteur, par projet">
            <QueryState query={gender} data={gender.data} isEmpty={(d) => d.available && d.items.length === 0}>
              {(d) => d.available ? <Donut items={d.items.map((x) => ({ label: x.label, value: x.count }))} centerLabel="projets" /> : <EmptyState title="Donnée non accessible" hint={d.reason} />}
            </QueryState>
          </ChartCard>
          <ChartCard title="Financements" subtitle="Obtenus et promis">
            <QueryState query={funding} data={funding.data} isEmpty={(d) => d.count === 0} empty={<EmptyState title="Aucun financement enregistré" hint="Aucune donnée de financement pour cette sélection." />}>
              {(d) => <Donut items={d.by_status.map((x) => ({ label: x.label, value: x.amount_xof }))} centerLabel="XOF" format={(n) => formatXof(n, true).replace(' XOF', '')} />}
            </QueryState>
          </ChartCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-5">
          <section className="panel panel-pad lg:col-span-3" aria-labelledby="synth">
            <div className="mb-3 flex items-center justify-between gap-3"><h2 id="synth" className="text-[15px] font-semibold">Synthèse analytique</h2>
              <Link to={{ pathname: '/synthese', search }} className="btn btn-ghost btn-sm">Fiche complète <ArrowRight aria-hidden size={14} /></Link></div>
            <QueryState query={summary} data={summary.data} isEmpty={(d) => d.indicators.ideas_received === 0}>
              {(d) => (
                <>
                  <ul className="space-y-2.5 text-[15px] text-ink-2">{d.observations.map((o) => <li key={o} className="flex gap-2.5"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{o}</li>)}</ul>
                  <p className="mt-3 text-xs text-ink-3">Observations produites par des règles de calcul, sans IA. {d.limits.length} limite(s) des données signalée(s) dans la fiche.</p>
                </>
              )}
            </QueryState>
          </section>
          {can('use_ai') && (
            <section className="glass rounded-panel p-6 lg:col-span-2" aria-labelledby="ask-ai">
              <h2 id="ask-ai" className="flex items-center gap-2 text-[15px] font-semibold"><Sparkles aria-hidden size={16} className="text-violet" /> Interroger les données</h2>
              <p className="mt-1.5 text-sm text-ink-2">Posez une question en français : les chiffres sont calculés par le serveur, jamais inventés.</p>
              <div className="mt-4 flex flex-col gap-2">
                {['Combien de projets sont en retard ?', 'Quel domaine compte le plus de projets ?', 'Compare les deux dernières cohortes.'].map((q) => (
                  <button key={q} type="button" className="btn btn-secondary justify-start text-left font-medium" onClick={() => navigate({ pathname: '/assistant', search: `?q=${encodeURIComponent(q)}${search ? `&${search.slice(1)}` : ''}` })}>{q}</button>
                ))}
              </div>
            </section>
          )}
        </div>
      </FiltersGate>
    </div>
  )
}
