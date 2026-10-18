import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '@/app/Icons'

interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Dialog({ open, title, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) {
      return
    }
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal()
      } else {
        dialog.setAttribute('open', '')
      }
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close()
      } else {
        dialog.removeAttribute('open')
      }
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) {
          onClose()
        }
      }}
    >
      {open ? (
        <div className="dialog__body">
          <div className="dialog__head">
            <h2 className="dialog__title">{title}</h2>
            <button type="button" className="btn btn--ghost btn--icon" aria-label="Close" onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  )
}
