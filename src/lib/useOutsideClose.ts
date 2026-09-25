import { useEffect, useRef } from 'react'

/** Calls `onClose` when the user clicks outside the returned ref, or presses Escape, while `open` is true. */
export function useOutsideClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!open) return
    const handle = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('click', handle)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('click', handle)
      document.removeEventListener('keydown', key)
    }
  }, [open, onClose])
  return ref
}
