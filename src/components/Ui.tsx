import type { ReactNode } from 'react'
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
    <article className="stat-card" style={{ '--stat-accent': accent } as never}>
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
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
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
    </div>
  )
}
