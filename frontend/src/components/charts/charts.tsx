import type { ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartColors, usePrefersReducedMotion } from '@/hooks/useChartColors'
import { formatInt, formatXof, monthLabel } from '@/lib/format'
import type { BreakdownItem, CohortRow, FundingOverview, TimePoint } from '@/types/api'

interface TipProps { active?: boolean; payload?: { name?: string | number; value?: number | string; color?: string }[]; label?: string | number }

/** Infobulle en verre : seul élément translucide des graphiques, texte à fort contraste. */
function GlassTip({ active, payload, label, format = (v: number | string) => String(v), title }: TipProps & { format?: (v: number | string) => string; title?: (l: string | number) => string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-control px-3 py-2 text-[13px]">
      {label !== undefined && <p className="mb-1 font-semibold text-ink">{title ? title(label) : label}</p>}
      {payload.map((p) => (
        <p key={String(p.name)} className="flex items-center gap-2 text-ink-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
          {p.name} <span className="num ml-auto pl-3 font-semibold text-ink">{format(p.value ?? 0)}</span>
        </p>
      ))}
    </div>
  )
}

export function ChartCard({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel panel-pad ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div><h3 className="text-[15px] font-semibold">{title}</h3>{subtitle && <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>}</div>
        {action}
      </header>
      {children}
    </section>
  )
}

const summarize = (items: { label: string; value: number }[]) => items.map((i) => `${i.label} : ${formatInt(i.value)}`).join(' ; ')

export function TimelineChart({ data, height = 280 }: { data: TimePoint[]; height?: number }) {
  const c = useChartColors()
  const still = usePrefersReducedMotion()
  return (
    <div role="img" aria-label={`Évolution mensuelle des idées reçues et projets sélectionnés. ${summarize(data.map((d) => ({ label: monthLabel(d.month), value: d.ideas })))}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="g-ideas" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.series[0]} stopOpacity={0.35} /><stop offset="100%" stopColor={c.series[0]} stopOpacity={0} /></linearGradient>
            <linearGradient id="g-sel" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.series[2]} stopOpacity={0.28} /><stop offset="100%" stopColor={c.series[2]} stopOpacity={0} /></linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="3 5" />
          <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fill: c.axis, fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={22} />
          <YAxis allowDecimals={false} tick={{ fill: c.axis, fontSize: 12 }} tickLine={false} axisLine={false} width={42} />
          <Tooltip content={<GlassTip title={(l) => monthLabel(String(l))} />} cursor={{ stroke: c.axis, strokeDasharray: '3 4' }} />
          <Area type="monotone" dataKey="ideas" name="Idées reçues" stroke={c.series[0]} strokeWidth={2.5} fill="url(#g-ideas)" isAnimationActive={!still} animationDuration={600} activeDot={{ r: 5, strokeWidth: 2, stroke: c.surface }} />
          <Area type="monotone" dataKey="selected" name="Sélectionnés" stroke={c.series[2]} strokeWidth={2.5} fill="url(#g-sel)" isAnimationActive={!still} animationDuration={700} activeDot={{ r: 5, strokeWidth: 2, stroke: c.surface }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Liste de barres HTML : lisible sur mobile (libellés longs), navigable au clavier, cliquable pour filtrer. */
export function BarList({ items, colorOffset = 0, onSelect, selectedKey, emptyZero = false }: {
  items: BreakdownItem[]; colorOffset?: number; onSelect?: (key: string | number) => void; selectedKey?: string | number | null; emptyZero?: boolean
}) {
  const c = useChartColors()
  const visible = emptyZero ? items : items.filter((i) => i.count > 0)
  const max = Math.max(1, ...visible.map((i) => i.count))
  const total = visible.reduce((s, i) => s + i.count, 0)
  return (
    <ul className="space-y-3" aria-label="Répartition">
      {visible.map((item, idx) => {
        const color = c.series[(idx + colorOffset) % c.series.length]
        const body = (
          <>
            <span className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="font-medium text-ink">{item.label}</span>
              <span className="num shrink-0 font-semibold text-ink-2">{formatInt(item.count)}<span className="ml-1.5 font-normal text-ink-3">{total ? Math.round((100 * item.count) / total) : 0} %</span></span>
            </span>
            <span className="block h-2.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full transition-[width] duration-500 ease-enter" style={{ width: `${(100 * item.count) / max}%`, background: color }} /></span>
          </>
        )
        return (
          <li key={String(item.key)}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(item.key)} aria-pressed={selectedKey === String(item.key)} title="Filtrer sur cette valeur"
                className={`-mx-2 block w-[calc(100%+1rem)] rounded-control px-2 py-1.5 text-left transition hover:bg-surface-2 ${selectedKey === String(item.key) ? 'bg-accent-soft' : ''}`}>{body}</button>
            ) : body}
          </li>
        )
      })}
    </ul>
  )
}

export function Donut({ items, centerLabel, format = formatInt }: { items: { label: string; value: number }[]; centerLabel: string; format?: (n: number) => string }) {
  const c = useChartColors()
  const still = usePrefersReducedMotion()
  const total = items.reduce((s, i) => s + i.value, 0)
  return (
    <div className="flex flex-col items-center gap-5">
      <div role="img" aria-label={`${centerLabel}. ${summarize(items)}`} className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={items} dataKey="value" nameKey="label" innerRadius="66%" outerRadius="96%" paddingAngle={items.length > 1 ? 3 : 0} stroke="none" cornerRadius={6} isAnimationActive={!still} animationDuration={600}>
              {items.map((_, i) => <Cell key={i} fill={c.series[i % c.series.length]} />)}
            </Pie>
            <Tooltip content={<GlassTip format={(v) => format(Number(v))} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="num text-xl font-bold">{format(total)}</p><p className="text-xs text-ink-3">{centerLabel}</p></div></div>
      </div>
      <ul className="w-full space-y-2.5 text-sm">
        {items.map((it, i) => (
          <li key={it.label} className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.series[i % c.series.length] }} />
            <span className="text-ink-2">{it.label}</span>
            <span className="num ml-auto whitespace-nowrap font-semibold">{format(it.value)}<span className="ml-1.5 font-normal text-ink-3">{total ? Math.round((100 * it.value) / total) : 0} %</span></span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CohortChart({ rows, height = 260 }: { rows: CohortRow[]; height?: number }) {
  const c = useChartColors()
  const still = usePrefersReducedMotion()
  const data = rows.map((r) => ({ ...r, short: r.cohort.replace(/\s*\(démo\)/i, '').replace(/^Cohorte\s*/i, '') }))
  return (
    <div role="img" aria-label={`Comparaison des cohortes. ${rows.map((r) => `${r.cohort} : ${r.ideas} idées, ${r.selected} sélectionnés, ${r.prototypes} prototypes`).join(' ; ')}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="3 5" />
          <XAxis dataKey="short" tick={{ fill: c.axis, fontSize: 12 }} tickLine={false} axisLine={false} interval={0} />
          <YAxis allowDecimals={false} tick={{ fill: c.axis, fontSize: 12 }} tickLine={false} axisLine={false} width={42} />
          <Tooltip content={<GlassTip />} cursor={{ fill: c.grid, opacity: 0.45 }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: c.axis }} />
          <Bar dataKey="ideas" name="Idées" fill={c.series[0]} radius={[6, 6, 0, 0]} isAnimationActive={!still} animationDuration={450} />
          <Bar dataKey="selected" name="Sélectionnés" fill={c.series[1]} radius={[6, 6, 0, 0]} isAnimationActive={!still} animationDuration={450} />
          <Bar dataKey="prototypes" name="Prototypes" fill={c.series[2]} radius={[6, 6, 0, 0]} isAnimationActive={!still} animationDuration={450} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ProgressChart({ items, height = 200 }: { items: { label: string; count: number }[]; height?: number }) {
  const c = useChartColors()
  const still = usePrefersReducedMotion()
  return (
    <div role="img" aria-label={`Distribution de la progression. ${summarize(items.map((i) => ({ label: i.label, value: i.count })))}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="3 5" />
          <XAxis dataKey="label" tick={{ fill: c.axis, fontSize: 12 }} tickLine={false} axisLine={false} interval={0} />
          <YAxis allowDecimals={false} tick={{ fill: c.axis, fontSize: 12 }} tickLine={false} axisLine={false} width={42} />
          <Tooltip content={<GlassTip format={(v) => `${v} projet(s)`} />} cursor={{ fill: c.grid, opacity: 0.45 }} />
          <Bar dataKey="count" name="Projets" radius={[8, 8, 0, 0]} isAnimationActive={!still} animationDuration={450}>
            {items.map((_, i) => <Cell key={i} fill={c.series[i === items.length - 1 ? 5 : 3]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function FundingYearChart({ rows, height = 240 }: { rows: FundingOverview['by_year']; height?: number }) {
  const c = useChartColors()
  const still = usePrefersReducedMotion()
  return (
    <div role="img" aria-label={`Financements par année. ${rows.map((r) => `${r.year} : ${formatXof(r.obtained_xof)} obtenus, ${formatXof(r.promised_xof)} promis`).join(' ; ')}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="3 5" />
          <XAxis dataKey="year" tick={{ fill: c.axis, fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v: number) => formatXof(v, true).replace(' XOF', '')} tick={{ fill: c.axis, fontSize: 12 }} tickLine={false} axisLine={false} width={52} />
          <Tooltip content={<GlassTip format={(v) => formatXof(Number(v))} />} cursor={{ fill: c.grid, opacity: 0.45 }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: c.axis }} />
          <Bar dataKey="obtained_xof" name="Obtenus" fill={c.series[0]} radius={[6, 6, 0, 0]} isAnimationActive={!still} animationDuration={450} />
          <Bar dataKey="promised_xof" name="Promis" fill={c.series[4]} radius={[6, 6, 0, 0]} isAnimationActive={!still} animationDuration={450} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
