import { useEffect, useRef, useState } from 'react'
import { Icon } from '../lib/icons'
import { useData } from '../store/store'
import type { Role } from '../store/types'
import { PARENT_SCREEN, ROLES, useApp, type ScreenId } from './context'

interface NavItem {
  screen: ScreenId
  roles: Role[]
  icon: string
  label: string
  badge?: string
}

const ALL_ROLES: Role[] = ['account', 'partner', 'admin', 'bods']

const NAV: NavItem[] = [
  { screen: 'overview', roles: ['account'], icon: 'layout-dashboard', label: 'Tổng quan' },
  { screen: 'customers', roles: ['account'], icon: 'users-round', label: 'Khách hàng' },
  { screen: 'projects', roles: ['account', 'bods'], icon: 'folder-kanban', label: 'Dự án' },
  { screen: 'contracts', roles: ['account', 'bods'], icon: 'file-text', label: 'Hợp đồng & công nợ', badge: '2' },
  { screen: 'posts', roles: ['account', 'bods'], icon: 'file-pen-line', label: 'Bài đăng' },
  { screen: 'shootings', roles: ['account', 'bods'], icon: 'calendar-clock', label: 'Lịch shooting' },
  { screen: 'tasks', roles: ['account'], icon: 'list-checks', label: 'Công việc', badge: '2' },
  { screen: 'partners', roles: ['account'], icon: 'handshake', label: 'Partner & năng lực' },
  { screen: 'partnerWork', roles: ['partner'], icon: 'check-square', label: 'Việc của tôi', badge: '1' },
  { screen: 'partnerProject', roles: ['partner'], icon: 'folder-kanban', label: 'Dự án được giao' },
  { screen: 'partnerSchedule', roles: ['partner'], icon: 'calendar-days', label: 'Lịch của tôi' },
  { screen: 'reviews', roles: ['bods'], icon: 'clipboard-check', label: 'Hàng chờ phê duyệt', badge: '2' },
  { screen: 'poc', roles: ['admin'], icon: 'settings', label: 'Quản trị hệ thống' },
  { screen: 'docs', roles: ['admin'], icon: 'notebook-tabs', label: 'Tài liệu' },
  { screen: 'services', roles: ['admin'], icon: 'package', label: 'Quản lý gói dịch vụ' },
  { screen: 'access', roles: ['admin'], icon: 'shield-check', label: 'Phân quyền' },
  { screen: 'profile', roles: ALL_ROLES, icon: 'circle-user-round', label: 'Hồ sơ' },
  { screen: 'settings', roles: ALL_ROLES, icon: 'settings', label: 'Cài đặt' },
]

export function Sidebar() {
  const { role, setRole, screen, go } = useApp()
  const { profile } = useData()
  const [menuOpen, setMenuOpen] = useState(false)
  const personRef = useRef<HTMLDivElement>(null)
  const activeScreen = PARENT_SCREEN[screen] ?? screen

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
        {NAV.filter((item) => item.roles.includes(role)).map((item) => (
          <button key={item.screen} className={item.screen === activeScreen ? 'active' : ''} onClick={() => go(item.screen)}>
            <Icon name={item.icon} className="ico" />
            <label>{item.label}</label>
            {item.badge && <b>{item.badge}</b>}
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
          </div>
          <button type="button" onClick={() => { setMenuOpen(false); go('profile') }}>Hồ sơ cá nhân</button>
          <button type="button" onClick={() => { setMenuOpen(false); go('settings') }}>Cài đặt</button>
        </div>
        <button
          type="button"
          className="sidebar-user-trigger"
          aria-expanded={menuOpen}
          aria-label="Mở menu người dùng"
          onClick={(event) => { event.stopPropagation(); setMenuOpen((open) => !open) }}
        >
          <i className="avatar">{ROLES[role].initial}</i>
          <div className="user-copy"><b>{profile.name}</b><span>{ROLES[role].label}</span></div>
          <span className="sidebar-user-caret">⌃</span>
        </button>
      </div>
    </aside>
  )
}
