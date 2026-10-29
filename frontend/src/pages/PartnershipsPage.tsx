import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FilterBar } from '@/features/filters/FilterBar'
import { FiltersGate } from '@/components/FiltersGate'
import { PageHeader } from '@/components/PageHeader'
import { BarList, ChartCard, Donut, FundingYearChart } from '@/components/charts/charts'
import { EmptyState, QueryState } from '@/components/ui/feedback'
import { formatDate, formatInt, formatPct, formatXof } from '@/lib/format'
import { useAnnualBudgets, useFundingOverview, useIndicators, usePartnershipsOverview } from '@/services/analytics'
import { useFundingsList, usePartnershipsList } from '@/services/projects'
import { Pager } from './ProjectDetailPage'

export default function PartnershipsPage() {
  const ind = useIndicators()
  const part = usePartnershipsOverview()
  const fund = useFundingOverview()
  const annual = useAnnualBudgets()
  const [pp, setPp] = useState(1)
  const [fp, setFp] = useState(1)
  const plist = usePartnershipsList(pp)
  const flist = useFundingsList(fp)
  const i = ind.data
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Écosystème" title="Partenariats & financements" description="Qui accompagne les projets et combien a été promis ou obtenu. Les graphiques suivent les filtres ; les listes montrent les derniers enregistrements." />
      <FilterBar />
      <FiltersGate>
        <section className="panel grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x" aria-label="Chiffres clés">
          {[['Partenariats', i ? formatInt(i.partnerships) : '…', i ? `${formatInt(i.partnerships_active)} actif(s)` : ''], ['Partenaires distincts', i ? formatInt(i.distinct_partners) : '…', ''],
            ['Obtenus', i ? (i.funding_count ? formatXof(i.funding_obtained_xof, true) : 'Aucun') : '…', ''], ['Promis (non obtenus)', i ? (i.funding_count ? formatXof(i.funding_promised_xof, true) : 'Aucun') : '…', '']].map(([l, v, h]) => (
            <div key={l} className="p-5"><p className="text-[13px] font-semibold text-ink-2">{l}</p><p className="num mt-2 text-[26px] font-bold leading-none">{v}</p>{h && <p className="mt-1.5 text-[13px] text-ink-3">{h}</p>}</div>))}
        </section>
        <div className="grid gap-5 md:grid-cols-2">
          <ChartCard title="Partenariats par nature">
            <QueryState query={part} data={part.data} isEmpty={(d) => d.total === 0} empty={<EmptyState title="Aucun partenariat" hint="Aucun partenariat pour cette sélection." />}>{(d) => <BarList items={d.by_nature} />}</QueryState></ChartCard>
          <ChartCard title="Partenaires par type">
            <QueryState query={part} data={part.data} isEmpty={(d) => d.total === 0}>{(d) => <Donut items={d.by_partner_kind.map((x) => ({ label: x.label, value: x.count }))} centerLabel="partenariats" />}</QueryState></ChartCard>
          <ChartCard title="Financements par année">
            <QueryState query={fund} data={fund.data} isEmpty={(d) => d.count === 0} empty={<EmptyState title="Aucun financement enregistré" />}>{(d) => <FundingYearChart rows={d.by_year} />}</QueryState></ChartCard>
          <ChartCard title="Principaux financeurs" subtitle="Montants cumulés (promis + obtenus)">
            <QueryState query={fund} data={fund.data} isEmpty={(d) => d.count === 0} empty={<EmptyState title="Aucun financement enregistré" />}>
              {(d) => <BarList items={d.by_partner.map((x) => ({ key: x.partner, label: x.partner, count: x.amount_xof }))} colorOffset={2} />}</QueryState></ChartCard>
        </div>
      </FiltersGate>
      <ChartCard title="Budget annuel du CIAT" subtitle="Enveloppes par année et par source — agrégats indépendants des filtres de projets">
        <QueryState query={annual} data={annual.data?.items} isEmpty={(d) => d.length === 0} empty={<EmptyState title="Aucun budget annuel enregistré" />}>
          {(rows) => (
            <div className="scroll-x"><table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wide text-ink-3">{['Année', 'Alloué', 'Dépensé', 'Exécution', 'Sources'].map((h) => <th key={h} scope="col" className="pb-2 pr-4 font-semibold">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">{rows.map((r) => (
                <tr key={r.year}><th scope="row" className="py-3 pr-4 font-semibold">{r.year}</th><td className="num pr-4">{formatXof(r.allocated_xof, true)}</td><td className="num pr-4">{formatXof(r.spent_xof, true)}</td>
                  <td className="num pr-4">{formatPct(r.execution_rate_pct)}</td>
                  <td className="py-3 text-ink-2">{Object.entries(r.sources).map(([k, v]) => `${k} ${formatXof(v, true)}`).join(' · ')}</td></tr>))}</tbody>
            </table></div>
          )}
        </QueryState>
      </ChartCard>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel panel-pad" aria-labelledby="l-part"><h2 id="l-part" className="mb-3 text-[15px] font-semibold">Derniers partenariats</h2>
          <QueryState query={plist} data={plist.data} isEmpty={(d) => d.count === 0} empty={<EmptyState title="Aucun partenariat enregistré" />}>
            {(d) => (<><ul className="divide-y divide-line">{d.results.map((x) => <li key={x.id} className="py-3"><p className="font-semibold">{x.partner_name}</p><p className="text-xs text-ink-3">{x.nature_label} · {x.status_label} · <Link className="hover:text-accent" to={`/projets/${x.project}`}>{x.project_title}</Link></p></li>)}</ul>
              {(d.next || d.previous) && <Pager page={pp} setPage={setPp} next={!!d.next} prev={!!d.previous} />}</>)}
          </QueryState></section>
        <section className="panel panel-pad" aria-labelledby="l-fund"><h2 id="l-fund" className="mb-3 text-[15px] font-semibold">Derniers financements</h2>
          <QueryState query={flist} data={flist.data} isEmpty={(d) => d.count === 0} empty={<EmptyState title="Aucun financement enregistré" />}>
            {(d) => (<><ul className="divide-y divide-line">{d.results.map((x) => <li key={x.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-semibold">{formatXof(x.amount_xof)}</p><p className="text-xs text-ink-3">{x.partner_name} · {formatDate(x.date)} · <Link className="hover:text-accent" to={`/projets/${x.project}`}>{x.project_title}</Link></p></div><span className={`badge ${x.status === 'OBTENU' ? 'tone-success' : 'tone-warning'}`}>{x.status_label}</span></li>)}</ul>
              {(d.next || d.previous) && <Pager page={fp} setPage={setFp} next={!!d.next} prev={!!d.previous} />}</>)}
          </QueryState></section>
      </div>
    </div>
  )
}
