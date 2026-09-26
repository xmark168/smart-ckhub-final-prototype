import { shortDate } from '../../../lib/format'
import { Icon } from '../../../lib/icons'
import { MILESTONE_LABEL, type Milestone } from '../../../lib/sop'

/** Short step names for the horizontal timeline. */
function stepName(item: Milestone): string {
  if (item.key === 't0') return item.label.startsWith('T0') ? 'T0' : 'Bắt đầu'
  if (item.key === 'plan') return 'Content Plan'
  if (item.key === 'shootingPlan') return 'Shooting Plan'
  if (item.key === 'shoot') return 'Shoot'
  if (item.key === 'demo') return 'Post Demo'
  if (item.key === 'cadence') return 'Đăng bài'
  if (item.key === 'end') return 'Chốt chu kỳ'
  return item.label.replace(/\s*\(.*\)$/, '')
}

/** SOP order: kick-off → plan → shooting → demo → script batches → posting → close. */
const ORDER = ['t0', 'plan', 'shootingPlan', 'shoot', 'demo', 'script', 'cadence', 'end']
function ordered(items: Milestone[]): Milestone[] {
  const rank = (item: Milestone) => ORDER.indexOf(item.key.startsWith('script') ? 'script' : item.key)
  return [...items].sort((a, b) => rank(a) - rank(b))
}

/** Where the cycle stands in the SOP: one row of steps, done → current → upcoming. */
export function CycleTimeline({ items }: { items: Milestone[] }) {
  return (
    <ol className="cycle-timeline" aria-label="Tiến trình SOP của chu kỳ">
      {ordered(items).map((item) => {
        const done = item.state === 'done' || item.state === 'doneLate'
        const date = item.done && done ? item.done : item.due
        return (
          <li key={item.key} className={'ct-step is-' + item.state} title={item.label + ' · ' + item.detail}>
            <span className="ct-dot" aria-hidden="true">
              {done ? <Icon name="check" /> : item.state === 'late' ? '!' : ''}
            </span>
            <span className="ct-name">{stepName(item)}</span>
            <span className="ct-date">{date ? shortDate(date) : '—'}</span>
            <span className="sr-only">{MILESTONE_LABEL[item.state]}</span>
          </li>
        )
      })}
    </ol>
  )
}
