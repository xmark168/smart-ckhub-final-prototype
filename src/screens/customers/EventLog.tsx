import { useState } from 'react'
import { Icon } from '../../lib/icons'
import type { Activity } from '../../store/types'

export type SourcedActivity = Activity & { source: string }

const COLLAPSED = 4

/** Customer + project events: filter by source, first few shown, expand on demand. */
export function EventLog({ entries }: { entries: SourcedActivity[] }) {
  const sources = Array.from(new Set(entries.map((entry) => entry.source)))
  const [source, setSource] = useState('')
  const [expanded, setExpanded] = useState(false)
  const list = entries.filter((entry) => !source || entry.source === source)
  const visible = expanded ? list : list.slice(0, COLLAPSED)

  return (
    <>
      {sources.length > 1 && (
        <div className="event-filter" role="group" aria-label="Lọc sự kiện theo nguồn">
          {['', ...sources].map((name) => (
            <button key={name || 'all'} type="button" aria-pressed={source === name} className={source === name ? 'on' : ''} onClick={() => { setSource(name); setExpanded(false) }}>
              {name || 'Tất cả'} <small>{name ? entries.filter((entry) => entry.source === name).length : entries.length}</small>
            </button>
          ))}
        </div>
      )}
      <div className="customer-activity" aria-live="polite">
        {visible.length
          ? visible.map((entry, index) => (
              <div key={index}>
                <Icon name={entry.icon} />
                <span><b>{entry.title}</b><small><em className="log-source">{entry.source}</em>{entry.time ? ' · ' + entry.time : ''} · {entry.detail}</small></span>
              </div>
            ))
          : <div className="customer-activity-empty">Chưa có hoạt động được ghi nhận.</div>}
      </div>
      {list.length > COLLAPSED && (
        <button type="button" className="text-btn event-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Thu gọn' : 'Xem thêm ' + (list.length - COLLAPSED) + ' sự kiện'}
        </button>
      )}
    </>
  )
}
