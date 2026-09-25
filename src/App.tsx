import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppContext, ROLES, type AppContextValue, type ScreenId } from './app/context'
import { LoginOverlay } from './app/LoginOverlay'
import { Sidebar } from './app/Sidebar'
import { Topbar } from './app/Topbar'
import { AccessScreen, AdminDashboard } from './screens/Admin'
import { ContractsScreen } from './screens/contracts/ContractsScreen'
import { CustomerDetail } from './screens/customers/CustomerDetail'
import { CustomersScreen } from './screens/customers/CustomersScreen'
import { DocsScreen } from './screens/Docs'
import { PostsScreen, ShootingsScreen, TasksScreen } from './screens/Operations'
import { Overview } from './screens/Overview'
import { PartnerProjects, PartnerSchedule, PartnersScreen, PartnerWork, ReviewsScreen } from './screens/Partners'
import { ProfileScreen } from './screens/Profile'
import { CycleWorkspace } from './screens/projects/CycleWorkspace'
import { ProjectDetail } from './screens/projects/ProjectDetail'
import { ProjectsScreen } from './screens/projects/ProjectsScreen'
import { ServicesScreen } from './screens/Services'
import { SettingsScreen } from './screens/Settings'
import type { Role } from './store/types'

const SCREENS: Record<ScreenId, () => ReactNode> = {
  overview: Overview,
  customers: CustomersScreen,
  customerDetail: CustomerDetail,
  projects: ProjectsScreen,
  projectDetail: ProjectDetail,
  cycleWorkspace: CycleWorkspace,
  contracts: ContractsScreen,
  posts: PostsScreen,
  shootings: ShootingsScreen,
  tasks: TasksScreen,
  partners: PartnersScreen,
  partnerWork: PartnerWork,
  partnerProject: PartnerProjects,
  partnerSchedule: PartnerSchedule,
  reviews: ReviewsScreen,
  poc: AdminDashboard,
  services: ServicesScreen,
  docs: DocsScreen,
  access: AccessScreen,
  profile: ProfileScreen,
  settings: SettingsScreen,
}

const UI_KEY = 'smart-ckhub-ui'

interface UiState {
  role: Role
  screen: ScreenId
  customerId: string
  projectId: string
}

function loadUi(): UiState {
  const fallback: UiState = { role: 'account', screen: 'overview', customerId: '', projectId: '' }
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY) || 'null') as UiState | null
    if (saved && saved.role in ROLES && saved.screen in SCREENS) return saved
  } catch {
    // Ignore unreadable UI state.
  }
  return fallback
}

export default function App() {
  const [ui, setUi] = useState<UiState>(loadUi)
  const [modal, setModal] = useState<ReactNode>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [toastText, setToastText] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify(ui))
    } catch {
      // Navigation still works without persistence.
    }
  }, [ui])

  const toast = useCallback((text: string) => {
    setToastText(text)
    setToastVisible(true)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastVisible(false), 2800)
  }, [])

  const context = useMemo<AppContextValue>(() => {
    const go = (screen: ScreenId) => {
      setModal(null)
      setUi((current) => ({ ...current, screen }))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    return {
      ...ui,
      setRole: (role) => {
        setModal(null)
        setUi((current) => ({ ...current, role, screen: ROLES[role].home }))
      },
      go,
      openCustomer: (customerId) => {
        setUi((current) => ({ ...current, customerId }))
        go('customerDetail')
      },
      openProject: (projectId) => {
        setUi((current) => ({ ...current, projectId }))
        go('projectDetail')
      },
      openCycle: (projectId) => {
        setUi((current) => ({ ...current, projectId }))
        go('cycleWorkspace')
      },
      toast,
      showModal: setModal,
      closeModal: () => setModal(null),
      openLogin: (afterLogout) => {
        setLoginOpen(true)
        if (afterLogout) toast('Phiên mô phỏng đã đăng xuất. Đăng nhập để tiếp tục.')
      },
    }
  }, [ui, toast])

  const Screen = SCREENS[ui.screen]

  return (
    <AppContext.Provider value={context}>
      <div className="app">
        <Sidebar />
        <main className="main">
          <Topbar />
          <div className="content">
            <Screen />
          </div>
        </main>
      </div>
      {modal}
      <div className={'toast' + (toastVisible ? ' show' : '')} role="status">{toastText}</div>
      <LoginOverlay open={loginOpen} onClose={() => setLoginOpen(false)} />
    </AppContext.Provider>
  )
}
