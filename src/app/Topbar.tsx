import { Fragment, useEffect, useRef, useState } from 'react'
import { alertsFor } from './alerts'
import { useData } from '../store/store'
import { ROLES, useApp, type ScreenId } from './context'
import { PAGES } from './routes'

function Breadcrumb() {
  const { role, screen, go, customerId, projectId } = useApp()
  const { customers, projects } = useData()
  const home = ROLES[role].home
  const parts: Array<[string, ScreenId | null]> = [['Smart CKHUB', home]]
  const project = projects.find((item) => item.id === projectId)
  if (!screen) {
    parts.push(['Không tìm thấy trang', null])
  } else if (screen === 'customerDetail') {
    parts.push(['Khách hàng', 'customers'], [customers.find((item) => item.id === customerId)?.name ?? 'Không tìm thấy', null])
  } else if (screen === 'projectDetail' || screen === 'cycleWorkspace') {
    parts.push(['Dự án', 'projects'], [project?.customer ?? 'Không tìm thấy', null])
  } else if (screen !== home) {
    parts.push([PAGES[screen].title, screen])
  }
  const pageTitle = parts.length > 1 ? parts[parts.length - 1][0] : PAGES[home].title

  useEffect(() => {
    document.title = pageTitle + ' · Smart CKHUB'
  }, [pageTitle])

  return (
    <nav className="crumb" aria-label="Điều hướng">
      {parts.map(([label, target], index) => (
        <Fragment key={index}>
          {index > 0 && <i>›</i>}
          <button type="button" className={target ? undefined : 'current'} onClick={() => target && go(target)}>{label}</button>
        </Fragment>
      ))}
    </nav>
  )
}

/** Bell: the current user's overdue / due-today items, computed from the data. */
function Notifications() {
  const { role, account, go, openProject } = useApp()
  const data = useData()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState<string[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)
  const items = alertsFor(data, role, account)
  const unread = items.filter((item) => !seen.includes(item.key)).length

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  return (
    <div className="notification-wrap" ref={wrapRef}>
      <button
        className="notification-bell"
        aria-label={unread ? 'Thông báo: ' + unread + ' chưa đọc' : 'Thông báo'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
        {unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      <section className={'notification-popover' + (open ? ' open' : '')} aria-label="Danh sách thông báo">
        <div className="notification-head">
          <div className="notification-title-group"><b>Cần xử lý</b></div>
          {unread > 0 && <button type="button" onClick={() => setSeen(items.map((item) => item.key))}>Đánh dấu đã đọc</button>}
        </div>
        <div className="notification-list">
          {items.slice(0, 8).map((item) => (
            <button
              type="button"
              key={item.key}
              className={'notification-item ' + (seen.includes(item.key) ? 'read' : 'unread')}
              onClick={() => {
                setOpen(false)
                if ('screen' in item.target) go(item.target.screen)
                else openProject(item.target.projectId, item.target.tab)
              }}
            >
              <i className="notification-dot" />
              <div><b>{item.title}</b><p>{item.text}</p></div>
            </button>
          ))}
          {!items.length && <p className="empty-copy notification-empty">Không có việc quá hạn hay đến hạn hôm nay.</p>}
        </div>
        {items.length > 8 && <div className="notification-foot">+{items.length - 8} mục khác</div>}
      </section>
    </div>
  )
}

export function Topbar() {
  return (
    <header className="top">
      <Breadcrumb />
      <div className="top-right"><Notifications /></div>
    </header>
  )
}
