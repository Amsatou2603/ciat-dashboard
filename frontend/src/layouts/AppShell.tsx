import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, Download, FileText, FolderKanban, Handshake, LayoutDashboard, LogOut, Menu, Monitor, Moon, Sparkles, Sun, Users } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { FiltersProvider, useFilters } from '@/features/filters/FiltersContext'
import { Dialog } from '@/components/ui/dialog'
import { Logo } from '@/components/Logo'
import { useTheme, type ThemeMode } from '@/lib/theme'
import { fullName, initials } from '@/lib/format'
import type { Capability } from '@/types/api'

interface NavItem { to: string; label: string; icon: typeof BarChart3; cap: Capability; end?: boolean }
const NAV: NavItem[] = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, cap: 'view_dashboard', end: true },
  { to: '/synthese', label: 'Synthèse', icon: FileText, cap: 'view_dashboard' },
  { to: '/projets', label: 'Projets', icon: FolderKanban, cap: 'view_projects' },
  { to: '/partenariats', label: 'Partenariats & financements', icon: Handshake, cap: 'view_dashboard' },
  { to: '/assistant', label: 'Assistant IA', icon: Sparkles, cap: 'use_ai' },
  { to: '/exports', label: 'Exports', icon: Download, cap: 'export' },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: Users, cap: 'manage_users' },
]

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth()
  const { search } = useFilters() // les filtres actifs suivent l'utilisateur d'une page à l'autre
  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-1">
      {NAV.filter((n) => can(n.cap)).map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={{ pathname: to, search: to === '/utilisateurs' ? '' : search }} end={end} className="nav-link" onClick={onNavigate}>
          <Icon aria-hidden size={19} strokeWidth={1.9} />{label}
        </NavLink>
      ))}
    </nav>
  )
}

function Brand({ variant = 'horizontal' }: { variant?: 'horizontal' | 'vertical' }) {
  if (variant === 'vertical') {
    return (
      <Link to="/" className="group flex flex-col items-center rounded-control p-2 text-center transition hover:bg-surface-2" aria-label="CIAT — accueil">
        <Logo variant="vertical" style={{ height: 56, width: 'auto' }} />
        <span className="mt-2 block text-[9px] font-semibold uppercase tracking-wide text-ink-3 group-hover:text-ink leading-tight max-w-[120px]">Pilotage de l'incubateur</span>
      </Link>
    )
  }
  return (
    <Link to="/" className="flex items-center rounded-control" aria-label="CIAT — accueil">
      <Logo variant="horizontal" className="h-6 sm:h-7 lg:h-8 w-auto max-w-[110px] sm:max-w-[130px] lg:max-w-[150px]" />
    </Link>
  )
}

const THEMES: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Clair', icon: Sun }, { mode: 'dark', label: 'Sombre', icon: Moon }, { mode: 'system', label: 'Système', icon: Monitor },
]
function ThemeToggle() {
  const { mode, setMode } = useTheme()
  return (
    <div role="radiogroup" aria-label="Thème d’affichage" className="hidden items-center rounded-full bg-surface-2 p-1 sm:flex">
      {THEMES.map(({ mode: m, label, icon: Icon }) => (
        <button key={m} type="button" role="radio" aria-checked={mode === m} aria-label={label} title={label} onClick={() => setMode(m)}
          className={`grid h-9 w-9 place-items-center rounded-full transition duration-150 ${mode === m ? 'bg-surface text-accent shadow-sm' : 'text-ink-3 hover:text-ink'}`}>
          <Icon aria-hidden size={16} />
        </button>
      ))}
    </div>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const { mode, setMode } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  if (!user) return null
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Menu du compte"
        className="flex min-h-[44px] items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition hover:bg-surface-2">
        <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white shadow-sm" style={{ background: 'linear-gradient(135deg, var(--accent), var(--violet))' }}>{initials(user)}</span>
        <span className="hidden text-left leading-tight md:block"><span className="block text-sm font-semibold">{fullName(user)}</span><span className="block text-xs text-ink-3">{user.role_label}</span></span>
      </button>
      {open && (
        <div role="menu" aria-label="Compte" className="glass absolute right-0 top-[calc(100%+8px)] z-40 w-64 rounded-[20px] p-2">
          <div className="px-3 py-2"><p className="text-sm font-semibold">{fullName(user)}</p><p className="text-xs text-ink-3">{user.role_label}</p></div>
          <div className="my-1 border-t border-line sm:hidden" />
          <div className="px-1 sm:hidden" role="group" aria-label="Thème">
            {THEMES.map(({ mode: m, label, icon: Icon }) => (
              <button key={m} type="button" role="menuitemradio" aria-checked={mode === m} onClick={() => setMode(m)} className="nav-link w-full"><Icon aria-hidden size={17} />{label}{mode === m && <span className="ml-auto text-xs text-accent">Actif</span>}</button>
            ))}
          </div>
          <div className="my-1 border-t border-line" />
          <button type="button" role="menuitem" onClick={() => void logout()} className="nav-link w-full text-danger hover:text-danger"><LogOut aria-hidden size={17} />Se déconnecter</button>
        </div>
      )}
    </div>
  )
}

function Shell() {
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()
  const { can } = useAuth()
  useEffect(() => { setDrawer(false) }, [location.pathname])
  return (
    <div className="min-h-dvh">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-control focus:bg-surface focus:px-4 focus:py-2">Aller au contenu</a>
      <aside className="glass fixed bottom-3 left-3 top-3 z-30 hidden w-[var(--sidebar-w)] flex-col rounded-[28px] p-4 lg:flex" aria-label="Barre latérale">
        <div className="px-1 pb-5 pt-2"><Brand variant="vertical" /></div>
        <Nav />
        <p className="mt-auto px-3 pb-1 pt-6 text-xs leading-relaxed text-ink-3">Tableau de bord décisionnel · ISEP Amadou Trawaré</p>
      </aside>

      <div className="lg:pl-[calc(var(--sidebar-w)+1.5rem)]">
        <div className="sticky top-0 z-30 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
          <header className="glass mx-auto flex max-w-[1320px] items-center justify-between gap-2 rounded-full py-2 pl-2 pr-2 sm:py-1.5 sm:pl-3">
            <button type="button" className="btn btn-ghost btn-icon lg:hidden shrink-0" onClick={() => setDrawer(true)} aria-label="Ouvrir le menu" aria-haspopup="dialog"><Menu aria-hidden size={22} /></button>
            <div className="absolute left-1/2 -translate-x-1/2 lg:static lg:left-auto lg:translate-x-0"><Brand /></div>
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              {can('use_ai') && <Link to="/assistant" className="btn btn-ghost btn-sm hidden sm:inline-flex"><Sparkles aria-hidden size={15} /> Demander à l’IA</Link>}
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>
        </div>
        <main id="contenu" tabIndex={-1} className="mx-auto max-w-[1320px] px-3 pb-24 pt-6 outline-none sm:px-6">
          <div key={location.pathname} className="page-enter"><Outlet /></div>
        </main>
      </div>

      <Dialog open={drawer} onClose={() => setDrawer(false)} title="Navigation" variant="drawer">
        <div className="px-3 pb-4 pt-2">
          <Brand variant="vertical" />
        </div>
        <Nav onNavigate={() => setDrawer(false)} />
      </Dialog>
    </div>
  )
}

export function AppShell() {
  return <FiltersProvider><Shell /></FiltersProvider>
}
