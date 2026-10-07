import { useEffect, useRef, useState } from 'react'
import { ACCOUNTS } from '../lib/format'
import { Icon } from '../lib/icons'
import { resetData, useData } from '../store/store'
import type { Role } from '../store/types'
import { PARTNER_PEOPLE } from '../lib/people'
import { sessionName } from '../lib/scope'
import { alertsFor } from './alerts'
import { ROLES, useApp, type ScreenId } from './context'
import { PAGES, sectionOf, type PageMeta } from './routes'

const ALL_ROLES: Role[] = ['account', 'accountant', 'partner', 'admin', 'bods']

const NAV = (Object.entries(PAGES) as Array<[ScreenId, PageMeta]>).filter(([, page]) => page.nav)

export function Sidebar() {
  const { role, setRole, account, setAccount, screen, go, toast } = useApp()
  const data = useData()
  // My overdue / due-today tasks, the same list as the bell.
  const badge = alertsFor(data, role, account).filter((item) => !/^(debt|late):/.test(item.key)).length
  const { profile } = useData()
  const [menuOpen, setMenuOpen] = useState(false)
  const personRef = useRef<HTMLDivElement>(null)
  const activeScreen = screen && sectionOf(screen)

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: MouseEvent) => {
      if (!personRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  return (
    <aside>
      <div className="brand"><i className="mark">C</i><span>CK HUB</span><small>SMART</small></div>
      <div className="navcap">MENU ROLE</div>
      <nav className="nav">
        {NAV.filter(([, page]) => page.nav!.roles.includes(role)).map(([id, page]) => (
          <button key={id} className={id === activeScreen ? 'active' : ''} aria-label={page.nav!.label} title={page.nav!.label} aria-current={id === activeScreen ? 'page' : undefined} onClick={() => go(id)}>
            <Icon name={page.nav!.icon} className="ico" />
            <label>{page.nav!.label}</label>
            {(id === 'tasks' || id === 'partnerWork') && badge > 0 && <b>{badge}</b>}
          </button>
        ))}
      </nav>
      <div className="role-note">{ROLES[role].note}</div>
      <div className="person user-menu" ref={personRef}>
        <div className={'sidebar-user-popover' + (menuOpen ? ' open' : '')}>
          <div className="sidebar-role-switch">
            <label htmlFor="roleSelect">Chuyển vai trò</label>
            <select id="roleSelect" value={role} onChange={(event) => setRole(event.target.value as Role)}>
              {ALL_ROLES.map((key) => <option key={key} value={key}>{ROLES[key].label}</option>)}
            </select>
            {role === 'partner' && (
              <>
                <label htmlFor="partnerSelect">Đăng nhập là nhân sự</label>
                <select id="partnerSelect" value={sessionName('partner', account)} onChange={(event) => setAccount(event.target.value)}>
                  {PARTNER_PEOPLE.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </>
            )}
            {role === 'account' && (
              <>
                <label htmlFor="accountSelect">Đăng nhập là Account</label>
                <select id="accountSelect" value={account} onChange={(event) => setAccount(event.target.value)}>
                  {ACCOUNTS.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </>
            )}
          </div>
          <button type="button" onClick={() => { setMenuOpen(false); go('profile') }}>Hồ sơ cá nhân</button>
          <button type="button" onClick={() => { setMenuOpen(false); go('settings') }}>Cài đặt</button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              if (!window.confirm('Đặt lại toàn bộ dữ liệu mẫu? Mọi thay đổi đã lưu trên trình duyệt này sẽ mất.')) return
              resetData()
              toast('Đã đặt lại dữ liệu mẫu.')
            }}
          >
            Đặt lại dữ liệu mẫu
          </button>
        </div>
        <button
          type="button"
          className="sidebar-user-trigger"
          aria-expanded={menuOpen}
          aria-label="Mở menu người dùng"
          onClick={(event) => { event.stopPropagation(); setMenuOpen((open) => !open) }}
        >
          <i className="avatar">{ROLES[role].initial}</i>
          <div className="user-copy"><b>{role === 'account' || role === 'partner' ? sessionName(role, account) : profile.name}</b><span>{ROLES[role].label}</span></div>
          <span className="sidebar-user-caret">⌃</span>
        </button>
      </div>
    </aside>
  )
}
