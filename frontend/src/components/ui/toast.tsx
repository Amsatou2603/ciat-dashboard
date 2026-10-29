import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

interface Toast { id: number; tone: 'success' | 'error'; message: string }
interface Ctx { success: (m: string) => void; error: (m: string) => void }
const ToastCtx = createContext<Ctx | null>(null)
let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const push = useCallback((tone: Toast['tone'], message: string) => {
    const id = ++seq
    setToasts((t) => [...t.slice(-3), { id, tone, message }])
    // Les erreurs restent affichées jusqu'à fermeture (message critique ne doit pas disparaître seul).
    if (tone === 'success') setTimeout(() => dismiss(id), 5000)
  }, [dismiss])
  const value = useMemo(() => ({ success: (m: string) => push('success', m), error: (m: string) => push('error', m) }), [push])
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 sm:items-end sm:pr-4" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className="glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-control px-4 py-3 text-sm">
            {t.tone === 'success' ? <CheckCircle2 aria-hidden size={18} className="mt-0.5 shrink-0 text-success" /> : <AlertCircle aria-hidden size={18} className="mt-0.5 shrink-0 text-danger" />}
            <p className="flex-1 font-medium text-ink">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Fermer la notification" className="-m-1 rounded p-1 text-ink-3 hover:text-ink"><X aria-hidden size={16} /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast(): Ctx {
  const c = useContext(ToastCtx)
  if (!c) throw new Error('ToastProvider manquant')
  return c
}
