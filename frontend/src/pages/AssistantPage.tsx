import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { SendHorizonal, Sparkles, Trash2 } from 'lucide-react'
import { FilterBar } from '@/features/filters/FilterBar'
import { useFilters } from '@/features/filters/FiltersContext'
import { FiltersGate } from '@/components/FiltersGate'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/feedback'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { askSchema, type AskValues } from '@/schemas'
import { useAsk, useAssistantHistory, useAssistantStatus, useClearHistory } from '@/services/assistant'
import type { AssistantAnswer } from '@/types/api'

const SUGGESTIONS = ['Combien de projets sont en retard ?', 'Quel domaine compte le plus de projets ?', 'Compare les deux dernières cohortes.', 'Quel est le montant total des financements enregistrés ?', 'Résume la situation des projets de la période sélectionnée.']

interface Turn { question: string; answer?: AssistantAnswer; error?: string }

export default function AssistantPage() {
  const { params, activeCount } = useFilters()
  const toast = useToast()
  const [sp, setSp] = useSearchParams()
  const status = useAssistantStatus()
  const history = useAssistantHistory()
  const ask = useAsk()
  const clear = useClearHistory()
  const [turns, setTurns] = useState<Turn[]>([])
  const [confirmClear, setConfirmClear] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const prefilled = useRef(false)
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<AskValues>({ resolver: zodResolver(askSchema), defaultValues: { question: '' } })
  const max = status.data?.max_question_chars ?? 500
  const length = String(watch('question') ?? '').length

  const send = async (question: string) => {
    setTurns((t) => [...t, { question }])
    try {
      const answer = await ask.mutateAsync({ question, filters: params })
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, answer } : x)))
    } catch (e) {
      const message = e instanceof ApiError ? (e.status === 429 ? 'Trop de questions en peu de temps : patientez une minute.' : e.message) : 'Une erreur est survenue.'
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, error: message } : x)))
    }
  }
  const submit = handleSubmit(async ({ question }) => { reset({ question: '' }); await send(question.trim()) })

  // Question pré-remplie depuis le tableau de bord (?q=…) : insérée dans le champ, jamais envoyée automatiquement.
  useEffect(() => {
    const q = sp.get('q')
    if (q && !prefilled.current) { prefilled.current = true; setValue('question', q.slice(0, 500)); const next = new URLSearchParams(sp); next.delete('q'); setSp(next, { replace: true }) }
  }, [sp, setSp, setValue])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [turns, ask.isPending])

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Assistant" title="Interroger les données" description="Posez une question en français. Le serveur calcule les chiffres à partir de la base ; l’IA, lorsqu’elle est activée, ne fait que les expliquer." />
      <FilterBar />
      <FiltersGate>
        <section className="panel flex min-h-[420px] flex-col" aria-label="Conversation">
          <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6" aria-live="polite">
            {turns.length === 0 && (
              <div className="mx-auto max-w-xl py-6 text-center">
                <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent"><Sparkles aria-hidden size={26} /></span>
                <p className="text-lg font-semibold">Que souhaitez-vous savoir ?</p>
                <p className="mt-1 text-sm text-ink-2">{activeCount ? `Les ${activeCount} filtre(s) actif(s) sont appliqués à vos questions.` : 'Aucun filtre actif : toutes les données autorisées sont utilisées.'}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">{SUGGESTIONS.map((s) => <button key={s} type="button" className="btn btn-secondary btn-sm font-medium" onClick={() => void send(s)} disabled={ask.isPending}>{s}</button>)}</div>
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className="space-y-3">
                <p className="ml-auto w-fit max-w-[85%] rounded-[20px] rounded-br-md bg-accent px-4 py-2.5 text-[15px] text-on-accent">{t.question}</p>
                {t.error ? <p role="alert" className="max-w-[90%] rounded-[20px] rounded-bl-md bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{t.error}</p>
                  : t.answer ? <Answer a={t.answer} /> : <div className="max-w-[60%] space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /><span className="sr-only" role="status">Calcul en cours…</span></div>}
              </div>
            ))}
            <div ref={end} />
          </div>
          <form onSubmit={submit} noValidate className="border-t border-line p-3 sm:p-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="q" className="sr-only">Votre question</label>
                <textarea id="q" rows={1} className="input resize-none" placeholder="Ex. : Combien de projets sont en retard ?" maxLength={max} aria-invalid={!!errors.question} aria-describedby="q-hint"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit() } }} {...register('question')} />
              </div>
              <button type="submit" className="btn btn-primary btn-icon" aria-label="Envoyer la question" disabled={ask.isPending}><SendHorizonal aria-hidden size={19} /></button>
            </div>
            <div id="q-hint" className="mt-1.5 flex justify-between text-xs text-ink-3"><span role={errors.question ? 'alert' : undefined} className={errors.question ? 'font-medium text-danger' : ''}>{errors.question?.message ?? 'Entrée pour envoyer, Maj+Entrée pour un retour à la ligne.'}</span><span className="num">{length}/{max}</span></div>
          </form>
        </section>

        <section className="panel panel-pad" aria-labelledby="hist">
          <div className="mb-3 flex items-center justify-between gap-3"><h2 id="hist" className="text-[15px] font-semibold">Votre historique récent</h2>
            {!!history.data?.items.length && <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => setConfirmClear(true)}><Trash2 aria-hidden size={14} /> Effacer</button>}</div>
          {history.isPending ? <Skeleton className="h-16 w-full" /> : history.data?.items.length ? (
            <ul className="divide-y divide-line">{history.data.items.slice(0, 6).map((h) => <li key={h.id} className="py-3"><button type="button" className="text-left" onClick={() => setValue('question', h.question)}><span className="block text-[15px] font-medium hover:text-accent">{h.question}</span><span className="line-clamp-2 text-sm text-ink-3">{h.answer}</span></button></li>)}</ul>
          ) : <p className="text-sm text-ink-3">Aucune question enregistrée. Seul vous voyez cet historique (limité aux dernières questions).</p>}
        </section>
      </FiltersGate>
      <ConfirmDialog open={confirmClear} title="Effacer l’historique ?" message="Vos questions et réponses enregistrées seront supprimées." confirmLabel="Effacer" busy={clear.isPending}
        onClose={() => setConfirmClear(false)} onConfirm={() => clear.mutate(undefined, { onSuccess: () => { toast.success('Historique effacé.'); setConfirmClear(false) } })} />
    </div>
  )
}

function Answer({ a }: { a: AssistantAnswer }) {
  return (
    <div className="max-w-[92%] space-y-2">
      <div className="rounded-[20px] rounded-bl-md bg-surface-2 px-4 py-3 text-[15px] leading-relaxed">{a.answer}</div>
      {a.warning && <p className="rounded-control bg-warning-soft px-3 py-2 text-xs font-medium text-warning">{a.warning}</p>}
    </div>
  )
}
