import { useId, useState } from 'react'
import { useOutsideClose } from '../../lib/useOutsideClose'

/** "Cần chú ý" pill that reveals its reasons on click/Enter (not hover-only). */
export function ReasonPill({ reasons }: { reasons: string[] }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const ref = useOutsideClose<HTMLSpanElement>(open, () => setOpen(false))
  return (
    <span className="reason-pill" ref={ref}>
      <button
        type="button"
        className="pill danger"
        aria-expanded={open}
        aria-controls={id}
        onClick={(event) => {
          event.stopPropagation()
          setOpen(!open)
        }}
      >
        Cần chú ý ({reasons.length})
      </button>
      {open && (
        <ul id={id} className="reason-popover" onClick={(event) => event.stopPropagation()}>
          {reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      )}
    </span>
  )
}
