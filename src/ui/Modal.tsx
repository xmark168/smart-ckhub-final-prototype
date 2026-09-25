import type { ReactNode } from 'react'
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

export function Modal({ title, children, className = '', backdropClassName = 'customer-modal', onSubmit, onClose }: ModalProps) {
  const { closeModal } = useApp()
  const close = onClose ?? closeModal
  return (
    <div className={'modal-backdrop show ' + backdropClassName} onClick={(event) => event.target === event.currentTarget && close()}>
      <form
        className={('modal ' + className).trim()}
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit?.(event.currentTarget)
        }}
      >
        <div className="modal-top">
          <h2>{title}</h2>
          <button className="close" type="button" onClick={close}>×</button>
        </div>
        {children}
      </form>
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
