import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { Field } from '@/components/ui/field'
import { Logo } from '@/components/Logo'
import { ApiError } from '@/lib/api'
import { loginSchema, type LoginValues } from '@/schemas'

export default function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (status === 'authenticated') return <Navigate to={from} replace />

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await login(values.username, values.password)
      navigate(from, { replace: true })
    } catch (e) {
      if (e instanceof ApiError) setFormError(e.status === 429 ? e.message : e.status === 401 ? 'Identifiant ou mot de passe incorrect.' : e.message)
      else setFormError('Connexion impossible. Réessayez.')
    }
  })

  return (
    <main className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.15fr_1fr]">
      <section className="rise" aria-labelledby="intro">
        <div className="mb-8">
          <Logo variant="horizontal" className="h-12 w-auto max-w-[260px] sm:h-16 sm:max-w-[340px]" />
        </div>
        <h1 id="intro" className="text-[38px] font-bold leading-[1.08] sm:text-[52px]">Piloter l’incubateur<br /><span style={{ background: 'linear-gradient(100deg, var(--accent), var(--violet))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>avec clarté.</span></h1>
        <p className="mt-5 max-w-md text-[17px] text-ink-2">Suivez les idées, les projets, les retards, les partenariats et les financements du CIAT, sur des données enregistrées et vérifiables.</p>
        <ul className="mt-8 hidden space-y-3 text-[15px] text-ink-2 sm:block">
          {[[BarChart3, 'Indicateurs et graphiques calculés depuis la base de données'], [Sparkles, 'Assistant en langage naturel appuyé sur des calculs du serveur'], [ShieldCheck, 'Accès par rôle, sessions renouvelables et journal d’audit']].map(([Icon, text], i) => {
            const I = Icon as typeof Lock
            return <li key={i} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent"><I aria-hidden size={18} /></span>{text as string}</li>
          })}
        </ul>
      </section>

      <section className="glass rise rounded-[32px] p-7 sm:p-9" style={{ ['--i' as string]: 2 }} aria-labelledby="login-title">
        <h2 id="login-title" className="text-2xl font-bold">Connexion</h2>
        <p className="mt-1 text-sm text-ink-2">Utilisez le compte fourni par l’administrateur.</p>
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          {formError && <div role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{formError}</div>}
          <Field label="Identifiant" error={errors.username?.message}><input className="input" autoComplete="username" autoCapitalize="none" spellCheck={false} {...register('username')} /></Field>
          <Field label="Mot de passe" error={errors.password?.message}><input className="input" type="password" autoComplete="current-password" {...register('password')} /></Field>
          <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Connexion…' : 'Se connecter'}</button>
        </form>
        <p className="mt-5 flex items-center gap-2 text-xs text-ink-3"><Lock aria-hidden size={13} /> Connexion protégée : votre mot de passe n’est jamais conservé dans le navigateur.</p>
      </section>
    </main>
  )
}
