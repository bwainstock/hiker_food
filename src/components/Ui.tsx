import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode
  tone?: string
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function StatCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string
  value: string
  detail?: string
  accent?: string
}) {
  return (
    <article
      className="stat-card"
      aria-label={label}
      style={{ '--stat-accent': accent } as never}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  )
}

export function ProgressBar({
  label,
  value,
  max,
  display,
  tone = 'green',
}: {
  label: string
  value: number
  max: number
  display: string
  tone?: string
}) {
  const width = Math.min(100, Math.max(2, (value / max) * 100))
  return (
    <div className="progress-row">
      <div>
        <span>{label}</span>
        <strong>{display}</strong>
      </div>
      <div className="progress-track">
        <span
          className={`progress-fill progress-${tone}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function Modal({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  className?: string
}) {
  const titleId = useId()
  const modalRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [opener] = useState<HTMLElement | null>(() => {
    if (typeof document === 'undefined') return null
    return document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
  })

  useEffect(() => {
    const modal = modalRef.current
    const appRoot = document.getElementById('root')
    const previousInert = appRoot?.getAttribute('inert')
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden')
    appRoot?.setAttribute('inert', '')
    appRoot?.setAttribute('aria-hidden', 'true')
    if (!modal?.contains(document.activeElement)) {
      closeRef.current?.focus()
    }
    return () => {
      if (previousInert === null) appRoot?.removeAttribute('inert')
      else if (previousInert !== undefined) {
        appRoot?.setAttribute('inert', previousInert)
      }
      if (previousAriaHidden === null) appRoot?.removeAttribute('aria-hidden')
      else if (previousAriaHidden !== undefined) {
        appRoot?.setAttribute('aria-hidden', previousAriaHidden)
      }
      requestAnimationFrame(() => {
        if (opener?.isConnected && !modal?.isConnected) opener.focus()
      })
    }
  }, [opener])

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab' || !modalRef.current) return

    const focusable = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute('hidden'))
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable.at(-1)!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        ref={modalRef}
        className={`modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button
            ref={closeRef}
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  )
}
