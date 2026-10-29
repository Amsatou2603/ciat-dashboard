import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode
  variant?: 'sheet' | 'drawer'; footer?: ReactNode
}

/** Fenêtre modale basée sur <dialog> natif : piège de focus, Échap et restauration du focus fournis par le navigateur. */
export function Dialog({ open, onClose, title, description, children, variant = 'sheet', footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])
  const id = `dlg-${title.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <dialog
      ref={ref}
      className={`sheet ${variant === 'drawer' ? 'drawer' : ''}`}
      aria-labelledby={`${id}-t`}
      aria-describedby={description ? `${id}-d` : undefined}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      onClose={() => { if (open) onClose() }}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-6 pb-4 pt-5">
            <div>
              <h2 id={`${id}-t`} className="text-lg font-semibold">{title}</h2>
              {description && <p id={`${id}-d`} className="mt-1 text-sm text-ink-2">{description}</p>}
            </div>
            <button type="button" className="btn btn-ghost btn-icon -mr-2 -mt-1" onClick={onClose} aria-label="Fermer"><X aria-hidden size={20} /></button>
          </header>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Supprimer', busy, onConfirm, onClose }: {
  open: boolean; title: string; message: string; confirmLabel?: string; busy?: boolean; onConfirm: () => void; onClose: () => void
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} footer={
      <>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Suppression…' : confirmLabel}</button>
      </>
    }>
      <p className="text-[15px] text-ink-2">{message}</p>
    </Dialog>
  )
}
