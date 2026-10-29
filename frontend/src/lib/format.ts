const nf = new Intl.NumberFormat('fr-FR')
export const formatInt = (n: number) => nf.format(n)
export const formatPct = (n: number | null | undefined) => (n === null || n === undefined ? 'n/d' : `${nf.format(n)} %`)

/** Montants en francs CFA ; forme compacte pour les indicateurs (ex. 4,5 M XOF). */
export function formatXof(n: number, compact = false): string {
  if (compact && Math.abs(n) >= 1_000_000) return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n / 1_000_000)} M XOF`
  if (compact && Math.abs(n) >= 10_000) return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n / 1_000)} k XOF`
  return `${nf.format(n)} XOF`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function monthLabel(ym: string): string {
  const d = new Date(`${ym}-01T00:00:00`)
  return Number.isNaN(d.getTime()) ? ym : d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

export const fullName = (u: { first_name: string; last_name: string; username: string }) =>
  [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username

export const initials = (u: { first_name: string; last_name: string; username: string }) =>
  (fullName(u).split(/\s+/).map((p) => p[0]).slice(0, 2).join('') || '?').toUpperCase()
