import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'

/** Libellé persistant + message d'erreur relié par aria-describedby ; le champ enfant reçoit id/aria-*. */
export function Field({ label, error, hint, children, className = '' }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  const id = useId()
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined
  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })
    : children
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      {child}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-ink-3">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="field-error">{error}</p>}
    </div>
  )
}
