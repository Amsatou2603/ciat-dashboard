import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { logoutRequest, publicPost, refreshSession, setAccessToken, setAuthLostHandler } from '@/lib/api'
import type { AuthPayload, Capability, User } from '@/types/api'

type Status = 'loading' | 'authenticated' | 'anonymous'
interface AuthCtx {
  status: Status
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Aide d'affichage uniquement : l'autorité reste le backend (chaque endpoint revérifie les droits). */
  can: (cap: Capability) => boolean
}
const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUser] = useState<User | null>(null)
  const qc = useQueryClient()

  const clear = useCallback(() => {
    setAccessToken(null); setUser(null); setStatus('anonymous'); qc.clear()
  }, [qc])

  useEffect(() => {
    setAuthLostHandler(clear)
    let alive = true
    refreshSession().then((session) => {
      if (!alive) return
      if (session) { setUser(session.user); setStatus('authenticated') } else setStatus('anonymous')
    })
    return () => { alive = false; setAuthLostHandler(null) }
  }, [clear])

  const login = useCallback(async (username: string, password: string) => {
    const data = await publicPost<AuthPayload>('/auth/login/', { username, password })
    setAccessToken(data.access)
    setUser(data.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => { await logoutRequest(); clear() }, [clear])
  const can = useCallback((cap: Capability) => !!user?.capabilities.includes(cap), [user])
  const value = useMemo(() => ({ status, user, login, logout, can }), [status, user, login, logout, can])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('AuthProvider manquant')
  return c
}
