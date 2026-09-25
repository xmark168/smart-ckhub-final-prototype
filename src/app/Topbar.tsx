import { Fragment, useEffect, useRef, useState } from 'react'
import { NOTIFICATION_TIMES, notificationsByScreen } from '../data/notifications'
import { useData } from '../store/store'
import { PARENT_SCREEN, useApp, type ScreenId } from './context'

const LABELS: Partial<Record<ScreenId, string>> = {
  customers: 'Khách hàng', projects: 'Dự án', contracts: 'Hợp đồng & công nợ', posts: 'Bài đăng', shootings: 'Lịch shooting',
  tasks: 'Công việc', partners: 'Partner & năng lực', partnerWork: 'Việc của tôi', partnerProject: 'Dự án được giao',
  partnerSchedule: 'Lịch của tôi', reviews: 'Hàng chờ phê duyệt', poc: 'Quản trị hệ thống', access: 'Phân quyền',
  services: 'Quản lý gói dịch vụ', docs: 'Tài liệu thiết kế', profile: 'Hồ sơ cá nhân', settings: 'Cài đặt',
}

function Breadcrumb() {
  const { screen, go, customerId, projectId } = useApp()
  const { customers, projects } = useData()
  const parts: Array<[string, ScreenId | null]> = [['Smart CKHUB', 'overview']]
  const project = projects.find((item) => item.id === projectId)
  if (screen === 'customerDetail') {
    parts.push(['Khách hàng', 'customers'], [customers.find((item) => item.id === customerId)?.name ?? 'Chi tiết', null])
  } else if (screen === 'projectDetail') {
    parts.push(['Dự án', 'projects'], [project?.customer ?? 'Chi tiết', null])
  } else if (screen === 'cycleWorkspace') {
    parts.push(['Dự án', 'projects'], [project?.customer ?? 'Chi tiết', 'projectDetail'], ['Chu kỳ ' + (project?.cycle ?? '') + ' / ' + (project?.total ?? ''), null])
  } else if (screen !== 'overview') {
    parts.push([LABELS[screen] ?? 'Smart CKHUB', screen])
  }
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

function Notifications() {
  const { screen, toast } = useApp()
  const [open, setOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [read, setRead] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const data = notificationsByScreen[PARENT_SCREEN[screen] ?? screen] ?? notificationsByScreen.projects

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
        aria-label={read ? 'Thông báo: không có mục chưa đọc' : 'Thông báo ' + data.title + ': 3 chưa đọc'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
        {!read && <span className="notification-count">3</span>}
      </button>
      <section className={'notification-popover' + (open ? ' open' : '')} aria-label="Danh sách thông báo">
        <div className="notification-head">
          <div className="notification-title-group">
            <b>Thông báo</b>
            <button type="button" className="notification-help" title="Loại thông báo của trang" aria-label="Xem loại thông báo của trang" onClick={() => setGuideOpen(true)}>?</button>
          </div>
          <button type="button" onClick={() => { setRead(true); toast('Đã đánh dấu thông báo là đã đọc.') }}>Đánh dấu đã đọc</button>
        </div>
        <div className="notification-list">
          {data.items.map(([title, text], index) => (
            <article key={title} className={'notification-item ' + (read ? 'read' : 'unread')}>
              <i className="notification-dot" />
              <div><b>{title}</b><p>{text}</p><time>{NOTIFICATION_TIMES[index]}</time></div>
            </article>
          ))}
        </div>
        <div className="notification-foot">Xem tất cả thông báo</div>
        <section className={'notification-guide' + (guideOpen ? ' open' : '')}>
          <div className="notification-guide-head">
            <div><b>Thông báo · {data.title}</b><p>Loại thông báo dùng khi đang xem trang này.</p></div>
            <button type="button" aria-label="Đóng" onClick={() => setGuideOpen(false)}>×</button>
          </div>
          <div className="notification-guide-list">
            {data.types.map(([title, text]) => <div key={title}><b>{title}</b><span>{text}</span></div>)}
          </div>
          <div className="notification-guide-rule">{data.rule}</div>
        </section>
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
