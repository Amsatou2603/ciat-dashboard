import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { ApiError, fieldErrors } from '@/lib/api'
import { fundingSchema, partnershipSchema, type FundingOutput, type FundingValues, type PartnershipOutput, type PartnershipValues } from '@/schemas'
import { useCreatePartner, usePartners, useSaveLink } from '@/services/projects'

const KINDS = [['ACADEMIQUE', 'Établissement académique'], ['ENTREPRISE', 'Entreprise'], ['INSTITUTION', 'Institution publique'], ['FINANCEUR', 'Bailleur / financeur'], ['ONG', 'ONG / association']]

function PartnerSelect({ register, error, onCreated }: { register: ReturnType<typeof useForm>['register']; error?: string; onCreated: (id: string) => void }) {
  const { data } = usePartners()
  const create = useCreatePartner()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState('ENTREPRISE')
  const [err, setErr] = useState<string | null>(null)
  const add = async () => {
    if (name.trim().length < 2) { setErr('Saisissez le nom du partenaire.'); return }
    try { const p = await create.mutateAsync({ name: name.trim(), kind }); onCreated(String(p.id)); setOpen(false); setName(''); setErr(null) }
    catch (e) { setErr(e instanceof ApiError ? (fieldErrors(e).name ?? e.message) : 'Création impossible.') }
  }
  return (
    <div className="sm:col-span-2">
      <Field label="Partenaire" error={error}><select className="input" {...register('partner')}><option value="">Choisir…</option>{data?.results.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      {!open ? <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => setOpen(true)}>+ Nouveau partenaire</button> : (
        <fieldset className="mt-3 grid gap-3 rounded-control border border-line p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <legend className="px-1 text-xs font-semibold text-ink-3">Nouveau partenaire</legend>
          <div><label className="field-label" htmlFor="pn-name">Nom</label><input id="pn-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="field-label" htmlFor="pn-kind">Type</label><select id="pn-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <button type="button" className="btn btn-secondary" onClick={() => void add()}>Ajouter</button>
          {err && <p role="alert" className="field-error sm:col-span-3">{err}</p>}
        </fieldset>
      )}
    </div>
  )
}

export function PartnershipDialog({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: number }) {
  const toast = useToast()
  const save = useSaveLink('partnerships')
  const { register, handleSubmit, reset, setValue, setError, formState: { errors, isSubmitting } } = useForm<PartnershipValues, unknown, PartnershipOutput>({ resolver: zodResolver(partnershipSchema), defaultValues: { partner: '', nature: 'TECHNIQUE', status: 'ACTIF', start_date: '' } })
  useEffect(() => { if (open) reset({ partner: '', nature: 'TECHNIQUE', status: 'ACTIF', start_date: '' }) }, [open, reset])
  const submit = handleSubmit(async (v) => {
    try { await save.mutateAsync({ ...v, partner: Number(v.partner), project: projectId, start_date: v.start_date || null }); toast.success('Partenariat ajouté.'); onClose() }
    catch (e) { const fe = fieldErrors(e); if (fe.non_field_errors || fe.partner) setError('partner', { message: fe.non_field_errors ?? fe.partner }); else toast.error(e instanceof ApiError ? e.message : 'Ajout impossible.') }
  })
  return (
    <Dialog open={open} onClose={onClose} title="Ajouter un partenariat"
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button><button type="submit" form="partnership-form" className="btn btn-primary" disabled={isSubmitting}>Enregistrer</button></>}>
      <form id="partnership-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <PartnerSelect register={register as never} error={errors.partner?.message} onCreated={(id) => setValue('partner', id, { shouldValidate: true })} />
        <Field label="Nature"><select className="input" {...register('nature')}><option value="TECHNIQUE">Appui technique</option><option value="MENTORAT">Mentorat</option><option value="COMMERCIAL">Débouché commercial</option><option value="HEBERGEMENT">Hébergement / équipement</option><option value="FINANCIER">Appui financier</option></select></Field>
        <Field label="Statut"><select className="input" {...register('status')}><option value="ACTIF">Actif</option><option value="DISCUSSION">En discussion</option><option value="TERMINE">Terminé</option></select></Field>
        <Field label="Date de début (facultatif)" error={errors.start_date?.message}><input className="input" type="date" {...register('start_date')} /></Field>
      </form>
    </Dialog>
  )
}

export function FundingDialog({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: number }) {
  const toast = useToast()
  const save = useSaveLink('fundings')
  const blank = (): FundingValues => ({ partner: '', amount_xof: '', status: 'PROMIS', date: new Date().toISOString().slice(0, 10) })
  const { register, handleSubmit, reset, setValue, setError, formState: { errors, isSubmitting } } = useForm<FundingValues, unknown, FundingOutput>({ resolver: zodResolver(fundingSchema), defaultValues: blank() })
  useEffect(() => { if (open) reset(blank()) }, [open, reset])
  const submit = handleSubmit(async (v) => {
    try { await save.mutateAsync({ ...v, partner: Number(v.partner), project: projectId }); toast.success('Financement ajouté.'); onClose() }
    catch (e) { const fe = fieldErrors(e); if (fe.amount_xof) setError('amount_xof', { message: fe.amount_xof }); else toast.error(e instanceof ApiError ? e.message : 'Ajout impossible.') }
  })
  return (
    <Dialog open={open} onClose={onClose} title="Ajouter un financement"
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button><button type="submit" form="funding-form" className="btn btn-primary" disabled={isSubmitting}>Enregistrer</button></>}>
      <form id="funding-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <PartnerSelect register={register as never} error={errors.partner?.message} onCreated={(id) => setValue('partner', id, { shouldValidate: true })} />
        <Field label="Montant (XOF)" error={errors.amount_xof?.message}><input className="input" type="number" min={1} step={1} inputMode="numeric" {...register('amount_xof')} /></Field>
        <Field label="Statut"><select className="input" {...register('status')}><option value="PROMIS">Promis</option><option value="OBTENU">Obtenu</option></select></Field>
        <Field label="Date" error={errors.date?.message}><input className="input" type="date" {...register('date')} /></Field>
      </form>
    </Dialog>
  )
}
