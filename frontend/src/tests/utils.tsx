import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ToastProvider } from '@/components/ui/toast'
import { setAccessToken } from '@/lib/api'
import { ThemeProvider } from '@/lib/theme'
import type { Capability, Role, User } from '@/types/api'

export const ALL_CAPS: Capability[] = ['view_dashboard', 'view_projects', 'view_personal', 'write_projects', 'delete_projects', 'export', 'use_ai', 'manage_users', 'view_audit']
export const makeUser = (role: Role = 'admin', capabilities: Capability[] = ALL_CAPS): User => ({
  id: 1, username: 'amsatou', first_name: 'Amsatou', last_name: 'N.', email: null, role, role_label: 'Administrateur', capabilities,
})

type Handler = unknown | ((url: URL, init?: RequestInit) => unknown)
export interface Route { status?: number; body?: Handler }

/** Simule le serveur : table « METHODE chemin » → réponse. Toute route non prévue échoue bruyamment. */
export function mockApi(routes: Record<string, Route | Handler>) {
  const calls: { method: string; path: string; search: string; headers: Headers }[] = []
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const method = (init?.method ?? 'GET').toUpperCase()
    const path = url.pathname.replace(/^\/api/, '')
    calls.push({ method, path, search: url.search, headers: new Headers(init?.headers) })
    const entry = routes[`${method} ${path}`] ?? routes[path]
    if (entry === undefined) throw new Error(`Route non simulée : ${method} ${path}`)
    const route = (typeof entry === 'object' && entry !== null && ('status' in entry || 'body' in entry) ? entry : { body: entry }) as Route
    const body = typeof route.body === 'function' ? (route.body as (u: URL, i?: RequestInit) => unknown)(url, init) : route.body
    const status = route.status ?? 200
    return new Response(status === 204 ? null : JSON.stringify(body ?? {}), { status, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fn)
  return { fn, calls }
}

export const session = (user: User = makeUser()) => ({ 'POST /auth/refresh/': { body: { access: 'tok', user } } })
export const anonymous = () => ({ 'POST /auth/refresh/': { status: 401, body: { code: 'not_authenticated', message: 'Session expirée.', details: null } } })

export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  setAccessToken(null)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } })
  return render(
    <ThemeProvider><QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}><ToastProvider><AuthProvider>{ui}</AuthProvider></ToastProvider></MemoryRouter></QueryClientProvider></ThemeProvider>,
  )
}
