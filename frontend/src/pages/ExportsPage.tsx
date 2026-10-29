import { useState } from 'react'
import { FileImage, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { FilterBar } from '@/features/filters/FilterBar'
import { useFilters } from '@/features/filters/FiltersContext'
import { FiltersGate } from '@/components/FiltersGate'
import { PageHeader } from '@/components/PageHeader'
import { useToast } from '@/components/ui/toast'
import { ApiError, downloadFile } from '@/lib/api'
import { useIndicators } from '@/services/analytics'

const FORMATS = [
  { fmt: 'pdf', title: 'Fiche PDF', icon: FileText, text: 'Synthèse lisible et imprimable : indicateurs, observations, cohortes, retards et limites des données.' },
  { fmt: 'xlsx', title: 'Classeur Excel', icon: FileSpreadsheet, text: 'Deux feuilles : synthèse des indicateurs et liste détaillée des projets (limitée à un volume borné).' },
  { fmt: 'png', title: 'Image', icon: FileImage, text: 'Planche de quatre graphiques (évolution, statuts, domaines, cohortes) pour une présentation.' },
] as const

export default function ExportsPage() {
  const { params, activeCount } = useFilters()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const ind = useIndicators()
  const run = async (fmt: string) => {
    setBusy(fmt)
    try { const name = await downloadFile(`/analytics/export/${fmt}/`, params); toast.success(`Fichier « ${name} » téléchargé.`) }
    catch (e) { toast.error(e instanceof ApiError ? (e.status === 429 ? 'Trop d’exports récents : réessayez plus tard.' : e.message) : 'Export impossible.') }
    finally { setBusy(null) }
  }
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Partage" title="Exports" description="Les exports reflètent exactement les filtres actifs et vos droits d’accès." />
      <FilterBar />
      <FiltersGate>
        <p className="panel panel-pad text-[15px] text-ink-2">
          <strong className="text-ink">{activeCount ? `${activeCount} filtre(s) actif(s)` : 'Aucun filtre actif'}</strong> — {ind.data ? `${ind.data.ideas_received} projet(s) concerné(s).` : 'calcul en cours…'}
          {ind.data?.ideas_received === 0 && ' Les fichiers générés indiqueront qu’aucune donnée ne correspond.'}
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          {FORMATS.map(({ fmt, title, icon: Icon, text }) => (
            <section key={fmt} className="panel panel-pad flex flex-col">
              <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon aria-hidden size={24} /></span>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-1.5 flex-1 text-sm text-ink-2">{text}</p>
              <button type="button" className="btn btn-primary mt-5" onClick={() => void run(fmt)} disabled={busy !== null} aria-busy={busy === fmt}>
                {busy === fmt ? <><Loader2 aria-hidden size={16} className="animate-spin" /> Génération…</> : `Télécharger (.${fmt})`}
              </button>
            </section>
          ))}
        </div>
      </FiltersGate>
    </div>
  )
}
