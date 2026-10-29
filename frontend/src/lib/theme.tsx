import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
interface ThemeCtx { mode: ThemeMode; resolved: 'light' | 'dark'; setMode: (m: ThemeMode) => void }
const Ctx = createContext<ThemeCtx | null>(null)
const KEY = 'ciat-theme' // préférence d'affichage uniquement : donnée non sensible

const systemDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
const read = (): ThemeMode => {
  try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' || v === 'system' ? v : 'system' } catch { return 'system' }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(read)
  const [prefersDark, setPrefersDark] = useState(systemDark)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setPrefersDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const resolved: 'light' | 'dark' = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode
  useEffect(() => { document.documentElement.dataset.theme = resolved }, [resolved])
  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    try { localStorage.setItem(KEY, m) } catch { /* stockage indisponible : préférence non persistée */ }
  }, [])
  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('ThemeProvider manquant')
  return c
}
