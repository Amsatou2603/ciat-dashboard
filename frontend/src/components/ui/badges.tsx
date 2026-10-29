import { Archive, CheckCircle2, CircleDashed, FlaskConical, Hourglass, Inbox, Rocket, Target, XCircle, type LucideIcon } from 'lucide-react'
import type { Status } from '@/types/api'

// Chaque statut combine icône + texte + teinte : la couleur n'est jamais le seul vecteur d'information.
const STATUS: Record<Status, { tone: string; icon: LucideIcon; label: string }> = {
  RECU: { tone: 'tone-neutral', icon: Inbox, label: 'Idée reçue' },
  PRESELECTIONNE: { tone: 'tone-info', icon: Hourglass, label: 'Présélectionné' },
  SELECTIONNE: { tone: 'tone-info', icon: Target, label: 'Sélectionné' },
  EN_INCUBATION: { tone: 'tone-indigo', icon: Rocket, label: 'En incubation' },
  PROTOTYPAGE: { tone: 'tone-violet', icon: FlaskConical, label: 'En prototypage' },
  TERMINE: { tone: 'tone-success', icon: CheckCircle2, label: 'Terminé' },
  ABANDONNE: { tone: 'tone-warning', icon: Archive, label: 'Abandonné' },
  REJETE: { tone: 'tone-danger', icon: XCircle, label: 'Non retenu' },
}

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS[status] ?? { tone: 'tone-neutral', icon: CircleDashed, label: status }
  const Icon = s.icon
  return <span className={`badge ${s.tone}`}><Icon aria-hidden size={13} />{s.label}</span>
}

export function LateBadge({ days }: { days: number | null }) {
  if (days === null || days <= 0) return null
  return <span className="badge tone-danger">En retard de {days} j</span>
}

export function ProgressBar({ value, label, showValue = true }: { value: number; label?: string; showValue?: boolean }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="flex items-center gap-2.5">
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={label ?? 'Progression'} className="h-2 w-full min-w-[64px] overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full transition-[width] duration-300 ease-enter" style={{ width: `${v}%`, background: 'linear-gradient(90deg, var(--chart-1), var(--chart-2))' }} />
      </div>
      {showValue && <span className="num w-11 shrink-0 whitespace-nowrap text-right text-[13px] font-semibold text-ink-2">{v} %</span>}
    </div>
  )
}
