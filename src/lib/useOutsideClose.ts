import { useEffect, useRef } from 'react'

/** Calls `onClose` when the user clicks outside the returned ref while `open` is true. */
export function useOutsideClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!open) return
    const handle = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    document.addEventListener('click', handle)
    return () => document.removeEventListener('click', handle)
  }, [open, onClose])
  return ref
}
