import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { EmptyState, QueryState, Skeleton } from '@/components/ui/feedback'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/AuthContext'
import { ApiError, fieldErrors } from '@/lib/api'
import { formatDate, fullName } from '@/lib/format'
import { userSchema, type UserValues } from '@/schemas'
import { useDeleteUser, useSaveUser, useUsers } from '@/services/users'
import type { ManagedUser } from '@/types/api'
import { Pager } from './ProjectDetailPage'

const ROLES = [['admin', 'Administrateur'], ['coordinator', 'Coordonnateur du CIAT'], ['analyst', 'Analyste'], ['reader', 'Lecteur']] as const
const ROLE_HELP: Record<string, string> = {
  admin: 'Tous les droits, dont la gestion des comptes.', coordinator: 'Gère projets, partenariats et financements ; exporte ; utilise l’assistant.',
  analyst: 'Consulte tout, exporte, utilise l’assistant ; ne modifie rien.', reader: 'Consulte indicateurs et projets ; données personnelles masquées.',
}

function UserDialog({ user, open, onClose }: { user: ManagedUser | null; open: boolean; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveUser()
  const blank: UserValues = { username: '', first_name: '', last_name: '', email: '', role: 'reader', is_active: true, password: '' }
  const { register, handleSubmit, reset, setError, watch, formState: { errors, isSubmitting } } = useForm<UserValues>({ resolver: zodResolver(userSchema), defaultValues: blank })
  useEffect(() => { if (open) reset(user ? { username: user.username, first_name: user.first_name, last_name: user.last_name, email: user.email ?? '', role: user.role, is_active: user.is_active, password: '' } : blank) }, [open, user, reset]) // eslint-disable-line react-hooks/exhaustive-deps
  const role = watch('role')
  const submit = handleSubmit(async (v) => {
    if (!user && !v.password) { setError('password', { message: 'Le mot de passe est obligatoire à la création.' }); return }
    const data: Record<string, unknown> = { ...v }
    if (!v.password) delete data.password
    try { await save.mutateAsync({ id: user?.id, data }); toast.success(user ? 'Compte mis à jour.' : 'Compte créé.'); onClose() }
    catch (e) {
      const fe = fieldErrors(e); const keys = Object.keys(fe).filter((k) => k in blank)
      keys.forEach((k) => setError(k as keyof UserValues, { message: fe[k] }))
      if (!keys.length) toast.error(e instanceof ApiError ? (fe.non_field_errors ?? e.message) : 'Enregistrement impossible.')
    }
  })
  return (
    <Dialog open={open} onClose={onClose} title={user ? 'Modifier le compte' : 'Nouveau compte'}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button><button type="submit" form="user-form" className="btn btn-primary" disabled={isSubmitting}>Enregistrer</button></>}>
      <form id="user-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Identifiant" error={errors.username?.message}><input className="input" autoComplete="off" disabled={!!user} {...register('username')} /></Field>
        <Field label="E-mail (facultatif)" error={errors.email?.message}><input className="input" type="email" autoComplete="off" {...register('email')} /></Field>
        <Field label="Prénom" error={errors.first_name?.message}><input className="input" {...register('first_name')} /></Field>
        <Field label="Nom" error={errors.last_name?.message}><input className="input" {...register('last_name')} /></Field>
        <Field label="Rôle" hint={ROLE_HELP[role]} error={errors.role?.message}><select className="input" {...register('role')}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label={user ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe'} hint="10 caractères minimum, ni trop courant ni numérique." error={errors.password?.message}><input className="input" type="password" autoComplete="new-password" {...register('password')} /></Field>
        <label className="flex min-h-[44px] items-center gap-3 sm:col-span-2"><input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" {...register('is_active')} /><span className="text-sm font-medium">Compte actif (décocher pour interdire la connexion)</span></label>
      </form>
    </Dialog>
  )
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const q = useUsers(page)
  const del = useDeleteUser()
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<ManagedUser | null>(null)
  const roleLabel = (r: string) => ROLES.find(([v]) => v === r)?.[1] ?? r
  const remove = async () => {
    if (!deleting) return
    try { await del.mutateAsync(deleting.id); toast.success('Compte supprimé.') } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Suppression impossible.') }
    setDeleting(null)
  }
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title="Utilisateurs" description="Créez les comptes et attribuez les rôles. Les droits sont appliqués par le serveur, pas par l’interface."
        actions={<button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus aria-hidden size={17} /> Nouveau compte</button>} />
      <section className="panel overflow-hidden" aria-label="Comptes">
        <QueryState query={q} data={q.data} isEmpty={(d) => d.count === 0} skeleton={<div className="space-y-3 p-5">{[0, 1, 2].map((n) => <Skeleton key={n} className="h-14 w-full" />)}</div>} empty={<EmptyState title="Aucun compte" />}>
          {(d) => (
            <>
              <ul className="divide-y divide-line">
                {d.results.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0"><p className="font-semibold">{fullName(u)} <span className="font-normal text-ink-3">@{u.username}</span>{u.id === me?.id && <span className="badge tone-info ml-2">Vous</span>}</p>
                      <p className="text-xs text-ink-3">{roleLabel(u.role)} · dernière connexion : {u.last_login ? formatDate(u.last_login) : 'jamais'}</p></div>
                    <div className="flex items-center gap-2"><span className={`badge ${u.is_active ? 'tone-success' : 'tone-neutral'}`}>{u.is_active ? 'Actif' : 'Désactivé'}</span>
                      <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label={`Modifier ${u.username}`} onClick={() => setEditing(u)}><Pencil aria-hidden size={16} /></button>
                      {u.id !== me?.id && <button type="button" className="btn btn-ghost btn-sm btn-icon text-danger" aria-label={`Supprimer ${u.username}`} onClick={() => setDeleting(u)}><Trash2 aria-hidden size={16} /></button>}</div>
                  </li>
                ))}
              </ul>
              {(d.next || d.previous) && <div className="border-t border-line px-5 py-3"><Pager page={page} setPage={setPage} next={!!d.next} prev={!!d.previous} /></div>}
            </>
          )}
        </QueryState>
      </section>
      <UserDialog open={creating || !!editing} user={editing} onClose={() => { setCreating(false); setEditing(null) }} />
      <ConfirmDialog open={!!deleting} title="Supprimer ce compte ?" message={`Le compte « ${deleting?.username ?? ''} » sera supprimé définitivement. Pour une suspension réversible, désactivez-le plutôt.`} busy={del.isPending} onConfirm={() => void remove()} onClose={() => setDeleting(null)} />
    </div>
  )
}
