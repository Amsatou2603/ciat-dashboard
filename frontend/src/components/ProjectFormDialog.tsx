import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/AuthContext'
import { ApiError, fieldErrors } from '@/lib/api'
import { projectSchema, type ProjectFormValues, type ProjectOutput } from '@/schemas'
import { useFilterOptions } from '@/services/analytics'
import { useCreatePorteur, usePorteurs, useSaveProject } from '@/services/projects'
import type { Project, ProjectInput } from '@/types/api'

const today = () => new Date().toISOString().slice(0, 10)
const blank = (): ProjectFormValues => ({ title: '', description: '', cohort: '', domain: '', subdomain: '', mentor: '', delay_days: 0, porteur: '', received_date: today(), status: 'RECU', start_date: '', deadline: '', progress: 0, prototype_stage: 'AUCUN', prototype_notes: '' })
const fromProject = (p: Project): ProjectFormValues => ({
  title: p.title, description: p.description, cohort: String(p.cohort), domain: String(p.domain), subdomain: p.subdomain ? String(p.subdomain) : '', mentor: p.mentor, delay_days: p.delay_days, porteur: String(p.porteur), received_date: p.received_date, status: p.status,
  start_date: p.start_date ?? '', deadline: p.deadline ?? '', progress: p.progress, prototype_stage: p.prototype_stage, prototype_notes: p.prototype_notes,
})
const toInput = (v: ProjectOutput): ProjectInput => ({ ...v, cohort: Number(v.cohort), domain: Number(v.domain), porteur: Number(v.porteur), subdomain: v.subdomain ? Number(v.subdomain) : null, start_date: v.start_date || null, deadline: v.deadline || null })

const STATUS_OPTIONS = [['RECU', 'Idée reçue'], ['PRESELECTIONNE', 'Présélectionné'], ['SELECTIONNE', 'Sélectionné'], ['EN_INCUBATION', 'En incubation'], ['PROTOTYPAGE', 'En prototypage'], ['TERMINE', 'Terminé'], ['ABANDONNE', 'Abandonné'], ['REJETE', 'Non retenu']]
const STAGE_OPTIONS = [['AUCUN', 'Aucun'], ['MAQUETTE', 'Maquette'], ['PROTOTYPE', 'Prototype fonctionnel'], ['MVP', 'Produit minimum viable']]

export function ProjectFormDialog({ open, onClose, project }: { open: boolean; onClose: () => void; project?: Project }) {
  const toast = useToast()
  const { can } = useAuth()
  const { data: options } = useFilterOptions()
  const personal = can('view_personal')
  const { data: porteurs } = usePorteurs(open && personal)
  const save = useSaveProject()
  const createPorteur = useCreatePorteur()
  const [newPorteur, setNewPorteur] = useState(false)
  const [pName, setPName] = useState('')
  const [pGender, setPGender] = useState('NS')
  const [pError, setPError] = useState<string | null>(null)
  const { register, handleSubmit, reset, setError, setValue, watch, formState: { errors, isSubmitting } } = useForm<ProjectFormValues, unknown, ProjectOutput>({ resolver: zodResolver(projectSchema), defaultValues: blank() })

  const chosenDomain = watch('domain')
  useEffect(() => { if (open) { reset(project ? fromProject(project) : blank()); setNewPorteur(false); setPName(''); setPError(null) } }, [open, project, reset])

  const submit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ id: project?.id, data: toInput(values) })
      toast.success(project ? 'Projet mis à jour.' : 'Projet créé.')
      onClose()
    } catch (e) {
      const fe = fieldErrors(e)
      const known = Object.keys(fe).filter((k) => k in blank())
      known.forEach((k) => setError(k as keyof ProjectFormValues, { message: fe[k] }))
      if (!known.length) toast.error(e instanceof ApiError ? e.message : 'Enregistrement impossible.')
    }
  })

  const addPorteur = async () => {
    setPError(null)
    if (pName.trim().length < 2) { setPError('Saisissez le nom du porteur.'); return }
    try {
      const created = await createPorteur.mutateAsync({ full_name: pName.trim(), gender: pGender })
      setValue('porteur', String(created.id), { shouldValidate: true })
      setNewPorteur(false); setPName('')
    } catch (e) { setPError(e instanceof ApiError ? e.message : 'Création impossible.') }
  }

  return (
    <Dialog open={open} onClose={onClose} title={project ? 'Modifier le projet' : 'Nouveau projet'} description="Les champs marqués doivent respecter les règles du CIAT ; le serveur les revérifie."
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button><button type="submit" form="project-form" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Enregistrement…' : 'Enregistrer'}</button></>}>
      <form id="project-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Titre du projet" error={errors.title?.message}><input className="input" {...register('title')} /></Field>
        <Field className="sm:col-span-2" label="Description" error={errors.description?.message}><textarea className="input" rows={3} {...register('description')} /></Field>
        <Field label="Cohorte" error={errors.cohort?.message}><select className="input" {...register('cohort')}><option value="">Choisir…</option>{options?.cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Domaine d’application" error={errors.domain?.message}><select className="input" {...register('domain')}><option value="">Choisir…</option>{options?.domains.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select></Field>
        <Field label="Sous-domaine (facultatif)" error={errors.subdomain?.message}><select className="input" {...register('subdomain')}><option value="">Non classé</option>{options?.subdomains.filter((s) => !chosenDomain || String(s.domain) === String(chosenDomain)).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
        <Field label="Mentor (facultatif)" error={errors.mentor?.message}><input className="input" {...register('mentor')} /></Field>
        <div className="sm:col-span-2">
          {personal ? (
            <>
              <Field label="Porteur de projet" error={errors.porteur?.message}><select className="input" {...register('porteur')}><option value="">Choisir…</option>{porteurs?.results.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>
              {!newPorteur ? <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => setNewPorteur(true)}>+ Nouveau porteur</button> : (
                <fieldset className="mt-3 grid gap-3 rounded-control border border-line p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <legend className="px-1 text-xs font-semibold text-ink-3">Nouveau porteur (données minimales)</legend>
                  <div><label className="field-label" htmlFor="np-name">Nom complet</label><input id="np-name" className="input" value={pName} onChange={(e) => setPName(e.target.value)} /></div>
                  <div><label className="field-label" htmlFor="np-gender">Genre</label><select id="np-gender" className="input" value={pGender} onChange={(e) => setPGender(e.target.value)}><option value="NS">Non renseigné</option><option value="F">Femme</option><option value="M">Homme</option></select></div>
                  <button type="button" className="btn btn-secondary" onClick={() => void addPorteur()}>Ajouter</button>
                  {pError && <p role="alert" className="field-error sm:col-span-3">{pError}</p>}
                </fieldset>
              )}
            </>
          ) : <p className="text-sm text-ink-3">Votre rôle ne permet pas de gérer les porteurs.</p>}
        </div>
        <Field label="Date de réception" error={errors.received_date?.message}><input className="input" type="date" {...register('received_date')} /></Field>
        <Field label="Statut" error={errors.status?.message}><select className="input" {...register('status')}>{STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Date de début (facultatif)" error={errors.start_date?.message}><input className="input" type="date" {...register('start_date')} /></Field>
        <Field label="Date limite (facultatif)" error={errors.deadline?.message}><input className="input" type="date" {...register('deadline')} /></Field>
        <Field label="Progression (%)" error={errors.progress?.message}><input className="input" type="number" min={0} max={100} inputMode="numeric" {...register('progress')} /></Field>
        <Field label="Retard cumulé (jours)" hint="Retard constaté sur les jalons ; 0 si aucun." error={errors.delay_days?.message}><input className="input" type="number" min={0} inputMode="numeric" {...register('delay_days')} /></Field>
        <Field label="Stade du prototype" error={errors.prototype_stage?.message}><select className="input" {...register('prototype_stage')}>{STAGE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field className="sm:col-span-2" label="Notes sur le prototype (facultatif)" error={errors.prototype_notes?.message}><textarea className="input" rows={2} {...register('prototype_notes')} /></Field>
      </form>
    </Dialog>
  )
}
