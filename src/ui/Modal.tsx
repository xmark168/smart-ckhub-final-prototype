import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../app/context'

interface ModalProps {
  title: ReactNode
  children: ReactNode
  /** Extra class on the `.modal` form, e.g. `contract-modal`. */
  className?: string
  /** Extra class on the backdrop; the original used `customer-modal` for most dialogs. */
  backdropClassName?: string
  onSubmit?: (form: HTMLFormElement) => void
  onClose?: () => void
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible modal dialog: role="dialog" named by its title, Escape closes, Tab stays inside,
 * first field gets focus on open and focus returns to the opener on close.
 */
export function Modal({ title, children, className = '', backdropClassName = 'customer-modal', onSubmit, onClose }: ModalProps) {
  const { closeModal } = useApp()
  const close = onClose ?? closeModal
  const titleId = useId()
  const formRef = useRef<HTMLDivElement>(null)
  // Captured during the first render, before autoFocus moves focus into the dialog.
  const [opener] = useState(() => document.activeElement as HTMLElement | null)
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })

  useEffect(() => {
    const form = formRef.current
    if (form && !form.contains(document.activeElement)) {
      const first = form.querySelector<HTMLElement>('.form ' + FOCUSABLE.split(', ').join(', .form ')) ?? form.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !formRef.current) return
      const items = [...formRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (opener && document.contains(opener)) opener.focus()
    }
  }, [opener])

  return (
    <div className={'modal-backdrop show ' + backdropClassName} onClick={(event) => event.target === event.currentTarget && close()}>
      <div ref={formRef} className={('modal ' + className).trim()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <form
          className="modal-form"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit?.(event.currentTarget)
          }}
        >
          <div className="modal-top">
            <h2 id={titleId}>{title}</h2>
            <button className="close" type="button" onClick={close} aria-label="Đóng">×</button>
          </div>
          {children}
        </form>
      </div>
    </div>
  )
}

/** Cancel / primary action row used at the bottom of most forms. */
export function FormActions({ submit, cancel = 'Hủy' }: { submit: string; cancel?: string | null }) {
  const { closeModal } = useApp()
  return (
    <div className="form-actions">
      {cancel && <button className="secondary" type="button" onClick={closeModal}>{cancel}</button>}
      <button className="primary">{submit}</button>
    </div>
  )
}

export function InfoModal({ title, message, contract = false }: { title: string; message: string; contract?: boolean }) {
  const { closeModal } = useApp()
  const body = (
    <>
      <div className="customer-data-rules"><p>{message}</p></div>
      <div className="form-actions"><button className="primary" type="button" onClick={closeModal}>Đóng</button></div>
    </>
  )
  return (
    <Modal title={title} className={contract ? 'contract-modal' : ''}>
      {contract ? <div className="form">{body}</div> : body}
    </Modal>
  )
}
