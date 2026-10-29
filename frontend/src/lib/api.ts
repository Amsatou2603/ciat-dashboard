import type { AuthPayload } from '@/types/api'

/** Erreur API normalisée : le backend renvoie toujours {code, message, details}. */
export class ApiError extends Error {
  status: number
  code: string
  details: Record<string, unknown> | null
  constructor(status: number, code: string, message: string, details: Record<string, unknown> | null = null) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'

// Le jeton d'accès (10 min) reste EN MÉMOIRE uniquement : jamais dans localStorage/sessionStorage (risque XSS).
// Le jeton de rafraîchissement est un cookie HttpOnly inaccessible au JavaScript.
let accessToken: string | null = null
let refreshing: Promise<AuthPayload | null> | null = null
let onAuthLost: (() => void) | null = null

export const setAccessToken = (token: string | null) => { accessToken = token }
export const getAccessToken = () => accessToken
export const setAuthLostHandler = (handler: (() => void) | null) => { onAuthLost = handler }

export type Params = Record<string, string | number | string[] | null | undefined>

export function toQuery(params?: Params): string {
  if (!params) return ''
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const values = Array.isArray(value) ? value : [value]
    for (const v of values) if (v !== null && v !== undefined && v !== '') q.append(key, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

async function parseError(res: Response): Promise<ApiError> {
  let body: { code?: string; message?: string; details?: Record<string, unknown> | null } = {}
  try { body = await res.json() } catch { /* corps non JSON */ }
  const fallback = res.status >= 500 ? 'Le serveur a rencontré une erreur. Réessayez dans un instant.' : 'Requête refusée.'
  return new ApiError(res.status, body.code ?? 'error', body.message ?? fallback, body.details ?? null)
}

async function send(path: string, init: RequestInit, withAuth: boolean): Promise<Response> {
  const headers = new Headers(init.headers)
  if (withAuth && accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  try {
    return await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, 'network', 'Serveur injoignable. Vérifiez votre connexion et réessayez.')
  }
}

/** Renouvelle la session via le cookie HttpOnly. Appels concurrents fusionnés (une seule requête de refresh). */
export function refreshSession(): Promise<AuthPayload | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await send('/auth/refresh/', { method: 'POST', headers: { 'X-CIAT-Client': 'web' } }, false)
        if (!res.ok) { setAccessToken(null); return null }
        const data = (await res.json()) as AuthPayload
        setAccessToken(data.access)
        return data
      } catch {
        return null
      } finally {
        refreshing = null
      }
    })()
  }
  return refreshing
}

interface Options { method?: string; body?: unknown; params?: Params; signal?: AbortSignal }

async function authed(path: string, options: Options): Promise<Response> {
  const init: RequestInit = { method: options.method ?? 'GET', signal: options.signal }
  if (options.body !== undefined) { init.body = JSON.stringify(options.body); init.headers = { 'Content-Type': 'application/json' } }
  const url = path + toQuery(options.params)
  let res = await send(url, init, true)
  if (res.status === 401) {
    const session = await refreshSession()
    if (!session) { onAuthLost?.(); throw await parseError(res) }
    res = await send(url, init, true)
  }
  if (!res.ok) throw await parseError(res)
  return res
}

export async function request<T>(path: string, options: Options = {}): Promise<T> {
  const res = await authed(path, options)
  return (res.status === 204 ? undefined : await res.json()) as T
}

export async function publicPost<T>(path: string, body: unknown): Promise<T> {
  const res = await send(path, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }, false)
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as T
}

export async function logoutRequest(): Promise<void> {
  try { await send('/auth/logout/', { method: 'POST', headers: { 'X-CIAT-Client': 'web' } }, false) } catch { /* déconnexion locale quoi qu'il arrive */ }
  setAccessToken(null)
}

/** Télécharge un export en conservant les filtres ; le nom de fichier vient du serveur. */
export async function downloadFile(path: string, params?: Params): Promise<string> {
  const res = await authed(path, { params })
  const blob = await res.blob()
  const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')
  const name = match?.[1] ?? 'export'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return name
}

/** Convertit les erreurs de validation DRF en messages par champ (pour React Hook Form). */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.details) return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(error.details)) {
    out[key] = Array.isArray(value) ? String(value[0]) : String(value)
  }
  return out
}
