import { useEffect, useId, useRef } from 'react'
import { TONES } from '../constants/enums'

export function Badge({ children, tone }) {
  const resolved = tone ?? TONES[children] ?? 'neutral'
  return <span className={`badge badge--${resolved}`}>{children}</span>
}

export function Button({ variant = 'secondary', size, className = '', ...props }) {
  const classes = ['btn', `btn--${variant}`, size ? `btn--${size}` : '', className]
  return <button type="button" className={classes.filter(Boolean).join(' ')} {...props} />
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="spinner" role="status">
      <span className="spinner__ring" aria-hidden="true" />
      <span className="spinner__label">{label}…</span>
    </div>
  )
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty">
      <div className="empty__mark" aria-hidden="true" />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty empty--error">
      <h3>Something went wrong</h3>
      <p>{error?.message ?? 'Unknown error'}</p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function Field({ label, hint, error, children, required }) {
  const id = useId()
  const control =
    typeof children === 'function' ? children(id) : children
  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required && <span className="field__required"> *</span>}
      </label>
      {control}
      {error ? (
        <p className="field__error">{error}</p>
      ) : (
        hint && <p className="field__hint">{hint}</p>
      )}
    </div>
  )
}

export function Modal({ title, subtitle, onClose, children, footer, wide }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className={`modal${wide ? ' modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className="modal__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', busy, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="confirm__message">{message}</p>
    </Modal>
  )
}
