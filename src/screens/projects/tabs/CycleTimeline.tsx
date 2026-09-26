import { shortDate } from '../../../lib/format'
import { Icon } from '../../../lib/icons'
import { MILESTONE_LABEL, type Milestone } from '../../../lib/sop'

/** Where the cycle stands: the package timeline in its own order, done → current → upcoming. */
export function CycleTimeline({ items }: { items: Milestone[] }) {
  return (
    <ol className="cycle-timeline" aria-label="Tiến trình timeline của chu kỳ">
      {items.map((item) => {
        const done = item.state === 'done' || item.state === 'doneLate'
        const date = done && item.done ? item.done : item.due
        return (
          <li key={item.key} className={'ct-step is-' + item.state + (item.projected ? ' is-projected' : '')} title={item.label + ' · ' + item.owner + ' · ' + item.detail}>
            <span className="ct-dot" aria-hidden="true">
              {done ? <Icon name="check" /> : item.state === 'late' ? '!' : item.state === 'skipped' ? '–' : ''}
            </span>
            <span className="ct-name">{item.label}</span>
            <span className="ct-date">{date ? (item.projected ? '~' : '') + shortDate(date) : '—'}</span>
            <span className="sr-only">{MILESTONE_LABEL[item.state]}{item.projected ? ', ngày dự kiến' : ''}</span>
          </li>
        )
      })}
    </ol>
  )
}
