import { shortDate } from '../../../lib/format'
import { MILESTONE_LABEL, MILESTONE_TONE, type Milestone } from '../../../lib/sop'
import { relativeDay } from '../projectLogic'
import { TODAY } from '../../../lib/format'

/** SOP milestones of one cycle as a vertical strip: due date, what was done, state. */
export function MilestoneList({ items }: { items: Milestone[] }) {
  return (
    <ol className="sop-milestones">
      {items.map((item) => (
        <li key={item.key} className={'sop-milestone is-' + item.state}>
          <i aria-hidden="true" />
          <div>
            <b>{item.label}</b>
            <small>{item.detail}</small>
          </div>
          <span className="sop-milestone-due">
            {item.due ? shortDate(item.due) : '—'}
            {item.done && item.done !== item.due && <small>xong {shortDate(item.done)}</small>}
            {!item.done && item.due && (item.state === 'late' || item.state === 'due') && <small>{relativeDay(item.due, TODAY)}</small>}
          </span>
          <span className={'pill ' + MILESTONE_TONE[item.state]}>{MILESTONE_LABEL[item.state]}</span>
        </li>
      ))}
    </ol>
  )
}
