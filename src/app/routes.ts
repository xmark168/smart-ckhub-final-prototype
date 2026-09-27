import type { Role } from '../store/types'
import type { ScreenId } from './context'

export interface PageMeta {
  /** Breadcrumb / tab title. Detail pages build theirs from the record instead. */
  title: string
  /** Roles allowed to open the page by URL. */
  access: Role[]
  /** Menu entry, shown to `nav.roles` only. Pages without it are reached from other pages. */
  nav?: { label: string; icon: string; roles: Role[]; badge?: string }
  /** List page a detail page belongs to (menu highlight, breadcrumb, notifications). */
  parent?: ScreenId
}

const ALL: Role[] = ['account', 'accountant', 'partner', 'admin', 'bods']
/** Business data: Account works on it, BODs and Administrator can view everything. Never Partner. */
const BUSINESS: Role[] = ['account', 'admin', 'bods']

/** Page registry, in menu order. */
export const PAGES: Record<ScreenId, PageMeta> = {
  overview: { title: 'Tổng quan', access: BUSINESS, nav: { label: 'Tổng quan', icon: 'layout-dashboard', roles: ['account', 'bods'] } },
  customers: { title: 'Khách hàng', access: BUSINESS, nav: { label: 'Khách hàng', icon: 'users-round', roles: ['account'] } },
  customerDetail: { title: 'Chi tiết khách hàng', access: BUSINESS, parent: 'customers' },
  projects: { title: 'Dự án', access: BUSINESS, nav: { label: 'Dự án', icon: 'folder-kanban', roles: ['account', 'bods'] } },
  projectDetail: { title: 'Chi tiết dự án', access: BUSINESS, parent: 'projects' },
  cycleWorkspace: { title: 'Chu kỳ', access: BUSINESS, parent: 'projects' },
  contracts: { title: 'Hợp đồng & công nợ', access: [...BUSINESS, 'accountant'], nav: { label: 'Hợp đồng & công nợ', icon: 'file-text', roles: ['account', 'accountant', 'bods'], badge: '2' } },
  posts: { title: 'Bài đăng', access: BUSINESS, nav: { label: 'Bài đăng', icon: 'file-pen-line', roles: ['account', 'bods'] } },
  shootings: { title: 'Lịch shooting', access: BUSINESS, nav: { label: 'Lịch shooting', icon: 'calendar-clock', roles: ['account', 'bods'] } },
  tasks: { title: 'Việc cần làm', access: [...BUSINESS, 'accountant'], nav: { label: 'Việc cần làm', icon: 'list-checks', roles: ['account', 'accountant', 'bods'] } },
  partners: { title: 'Partner & năng lực', access: BUSINESS, nav: { label: 'Partner & năng lực', icon: 'handshake', roles: ['account'] } },
  partnerWork: { title: 'Việc của tôi', access: ['partner', 'admin'], nav: { label: 'Việc của tôi', icon: 'check-square', roles: ['partner'], badge: '1' } },
  partnerProject: { title: 'Dự án được giao', access: ['partner', 'admin'], nav: { label: 'Dự án được giao', icon: 'folder-kanban', roles: ['partner'] } },
  partnerSchedule: { title: 'Lịch của tôi', access: ['partner', 'admin'], nav: { label: 'Lịch của tôi', icon: 'calendar-days', roles: ['partner'] } },
  reviews: { title: 'Hàng chờ phê duyệt', access: ['bods', 'admin'] },
  poc: { title: 'Quản trị hệ thống', access: ['admin'], nav: { label: 'Quản trị hệ thống', icon: 'settings', roles: ['admin'] } },
  docs: { title: 'Tài liệu thiết kế', access: ['admin'], nav: { label: 'Tài liệu', icon: 'notebook-tabs', roles: ['admin'] } },
  services: { title: 'Quản lý gói dịch vụ', access: ['admin'], nav: { label: 'Quản lý gói dịch vụ', icon: 'package', roles: ['admin'] } },
  parameters: { title: 'Tham số vận hành', access: ['admin', 'bods', 'account'], nav: { label: 'Tham số vận hành', icon: 'settings-2', roles: ['admin'] } },
  access: { title: 'Phân quyền', access: ['admin'], nav: { label: 'Phân quyền', icon: 'shield-check', roles: ['admin'] } },
  profile: { title: 'Hồ sơ cá nhân', access: ALL, nav: { label: 'Hồ sơ', icon: 'circle-user-round', roles: ALL } },
  settings: { title: 'Cài đặt', access: ALL, nav: { label: 'Cài đặt', icon: 'settings', roles: ALL } },
}

export function canOpen(role: Role, screen: ScreenId): boolean {
  return PAGES[screen].access.includes(role)
}

/** The list page to highlight / return to for a given page. */
export function sectionOf(screen: ScreenId): ScreenId {
  return PAGES[screen].parent ?? screen
}
