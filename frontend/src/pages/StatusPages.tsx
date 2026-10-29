import { Link } from 'react-router-dom'
import { Compass, ShieldAlert } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="panel panel-pad mx-auto mt-10 max-w-lg text-center">
      <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent"><Compass aria-hidden size={26} /></span>
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-ink-2">L’adresse demandée n’existe pas ou a été déplacée.</p>
      <Link to="/" className="btn btn-primary mt-5">Retour au tableau de bord</Link>
    </div>
  )
}

export function AccessDeniedPage() {
  return (
    <div className="panel panel-pad mx-auto mt-10 max-w-lg text-center">
      <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-warning-soft text-warning"><ShieldAlert aria-hidden size={26} /></span>
      <h1 className="text-2xl font-bold">Accès non autorisé</h1>
      <p className="mt-2 text-ink-2">Votre rôle ne permet pas de consulter cette page. Contactez un administrateur si vous pensez qu’il s’agit d’une erreur.</p>
      <Link to="/" className="btn btn-primary mt-5">Retour au tableau de bord</Link>
    </div>
  )
}
