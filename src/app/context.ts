import { createContext, useContext, type ReactNode } from 'react'
import type { Role } from '../store/types'

export type ScreenId =
  | 'overview' | 'customers' | 'customerDetail' | 'projects' | 'projectDetail' | 'cycleWorkspace' | 'contracts'
  | 'posts' | 'shootings' | 'tasks' | 'partners' | 'partnerWork' | 'partnerProject' | 'partnerSchedule'
  | 'reviews' | 'poc' | 'services' | 'docs' | 'access' | 'profile' | 'settings'

export const ROLES: Record<Role, { initial: string; label: string; note: string; home: ScreenId }> = {
  account: { initial: 'AC', label: 'Account', note: 'Điều phối dự án, timeline và Partner.', home: 'overview' },
  partner: { initial: 'PT', label: 'Partner', note: 'Xem công việc và dự án được giao.', home: 'partnerWork' },
  admin: { initial: 'AD', label: 'Administrator', note: 'Quản trị dữ liệu, quyền và cấu hình.', home: 'poc' },
  bods: { initial: 'BD', label: 'BODs', note: 'Theo dõi chỉ số, rủi ro và phê duyệt.', home: 'reviews' },
}

/** Detail screens keep their parent list highlighted in the menu. */
export const PARENT_SCREEN: Partial<Record<ScreenId, ScreenId>> = {
  customerDetail: 'customers',
  projectDetail: 'projects',
  cycleWorkspace: 'projects',
}

export interface AppContextValue {
  role: Role
  setRole: (role: Role) => void
  screen: ScreenId
  go: (screen: ScreenId) => void
  customerId: string
  openCustomer: (id: string) => void
  projectId: string
  openProject: (id: string) => void
  openCycle: (id: string) => void
  toast: (text: string) => void
  /** Show a modal; it replaces any modal already open. */
  showModal: (node: ReactNode) => void
  closeModal: () => void
  openLogin: (afterLogout?: boolean) => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside <AppContext.Provider>')
  return value
}
