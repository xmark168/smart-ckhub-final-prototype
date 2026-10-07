import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { AppContext, ROLES, type AppContextValue, type ScreenId } from './app/context'
import { ACCOUNTS } from './lib/format'
import { LoginOverlay } from './app/LoginOverlay'
import { currentLocation, navigate, pathFor, useLocation } from './app/router'
import { canOpen } from './app/routes'
import { PARTNER_PEOPLE } from './lib/people'
import { Sidebar } from './app/Sidebar'
import { Topbar } from './app/Topbar'
import { ProfileScreen } from './screens/account/ProfileScreen'
import { SettingsScreen } from './screens/account/SettingsScreen'
import { AccessScreen } from './screens/admin/AccessScreen'
import { AdminDashboardScreen } from './screens/admin/AdminDashboardScreen'
import { DocsScreen } from './screens/admin/DocsScreen'
import { ParametersScreen } from './screens/admin/ParametersScreen'
import { ServicesScreen } from './screens/admin/ServicesScreen'
import { ContractsScreen } from './screens/contracts/ContractsScreen'
import { CustomerDetailScreen } from './screens/customers/CustomerDetailScreen'
import { CustomersScreen } from './screens/customers/CustomersScreen'
import { PostsScreen } from './screens/operations/PostsScreen'
import { ShootingsScreen } from './screens/operations/ShootingsScreen'
import { TasksScreen } from './screens/operations/TasksScreen'
import { OverviewScreen } from './screens/overview/OverviewScreen'
import { PartnerProjectsScreen } from './screens/partner/PartnerProjectsScreen'
import { PartnerScheduleScreen } from './screens/partner/PartnerScheduleScreen'
import { PartnerWorkScreen } from './screens/partner/PartnerWorkScreen'
import { PartnersScreen } from './screens/partners/PartnersScreen'
import { CreativeWorkloadScreen } from './screens/partners/DepartmentWorkloadScreen'
import { ProjectDetailScreen } from './screens/projects/ProjectDetailScreen'
import { ProjectsScreen } from './screens/projects/ProjectsScreen'
import { ReviewsScreen } from './screens/reviews/ReviewsScreen'
import { ForbiddenScreen } from './screens/system/ForbiddenScreen'
import { NotFoundScreen } from './screens/system/NotFoundScreen'
import type { Role } from './store/types'

const SCREENS: Record<ScreenId, ComponentType> = {
  overview: OverviewScreen,
  customers: CustomersScreen,
  customerDetail: CustomerDetailScreen,
  projects: ProjectsScreen,
  projectDetail: ProjectDetailScreen,
  cycleWorkspace: ProjectDetailScreen,
  contracts: ContractsScreen,
  posts: PostsScreen,
  shootings: ShootingsScreen,
  tasks: TasksScreen,
  partners: PartnersScreen,
  creativeWorkload: CreativeWorkloadScreen,
  partnerWork: PartnerWorkScreen,
  partnerProject: PartnerProjectsScreen,
  partnerSchedule: PartnerScheduleScreen,
  reviews: ReviewsScreen,
  poc: AdminDashboardScreen,
  services: ServicesScreen,
  parameters: ParametersScreen,
  docs: DocsScreen,
  access: AccessScreen,
  profile: ProfileScreen,
  settings: SettingsScreen,
}

const ROLE_KEY = 'smart-ckhub-ui'

interface SavedUi {
  role: Role
  account: string
}

function loadUi(): SavedUi {
  const ui: SavedUi = { role: 'account', account: 'Hiền' }
  try {
    const saved = JSON.parse(localStorage.getItem(ROLE_KEY) || 'null') as Partial<SavedUi> | null
    if (saved?.role && saved.role in ROLES) ui.role = saved.role
    if (saved?.account && (ACCOUNTS.includes(saved.account) || PARTNER_PEOPLE.includes(saved.account))) ui.account = saved.account
  } catch {
    // Ignore unreadable UI state.
  }
  return ui
}

/** Last URL (path + page query) seen for each page, so returning to a list keeps its page. */
const lastPaths = new Map<ScreenId, string>()

/** A modal belongs to the page (path, not `?page=`) it was opened on; Back/Forward to another page hides it. */
interface OpenModal {
  node: ReactNode
  key: string
}

export default function App() {
  const location = useLocation()
  const route = location.route
  const [role, setRoleState] = useState<Role>(() => loadUi().role)
  const [account, setAccountState] = useState<string>(() => loadUi().account)
  const [modal, setModal] = useState<OpenModal | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [toastText, setToastText] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)
  const pathOnly = location.path

  useEffect(() => {
    try {
      localStorage.setItem(ROLE_KEY, JSON.stringify({ role, account }))
    } catch {
      // Role still works for this session without storage.
    }
  }, [role, account])

  // Empty hash → the current role's home page.
  useEffect(() => {
    if (pathOnly === '/') navigate(pathFor(ROLES[role].home), { replace: true })
  }, [pathOnly, role])

  useEffect(() => {
    if (route) lastPaths.set(route.screen, route.key)
  }, [route])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathOnly])

  const toast = useCallback((text: string) => {
    setToastText(text)
    setToastVisible(true)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastVisible(false), 2800)
  }, [])

  const screen = route?.screen ?? null
  const customerId = screen === 'customerDetail' ? route!.id : ''
  const projectId = screen === 'projectDetail' || screen === 'cycleWorkspace' ? route!.id : ''

  const context = useMemo<AppContextValue>(() => {
    const go = (target: ScreenId) => {
      setModal(null)
      if (target === 'customerDetail') navigate(pathFor(target, customerId))
      else if (target === 'projectDetail' || target === 'cycleWorkspace') navigate(pathFor(target, projectId))
      else navigate(lastPaths.get(target) ?? pathFor(target))
    }
    return {
      role,
      account,
      setAccount: (next) => {
        setModal(null)
        setAccountState(next)
      },
      screen,
      customerId,
      projectId,
      setRole: (next) => {
        setModal(null)
        setRoleState(next)
        navigate(pathFor(ROLES[next].home))
      },
      go,
      openCustomer: (id) => { setModal(null); navigate(pathFor('customerDetail', id)) },
      openProject: (id, tab) => { setModal(null); navigate(pathFor('projectDetail', id, { tab: tab === 'tong-quan' ? undefined : tab })) },
      toast,
      showModal: (node) => {
        const now = currentLocation()
        setModal({ node, key: now.path })
      },
      closeModal: () => setModal(null),
      openLogin: (afterLogout) => {
        setLoginOpen(true)
        if (afterLogout) toast('Phiên mô phỏng đã đăng xuất. Đăng nhập để tiếp tục.')
      },
    }
  }, [role, account, screen, customerId, projectId, toast])

  let page: ReactNode = null
  if (pathOnly !== '/') {
    if (!route) page = <NotFoundScreen />
    else if (!canOpen(role, route.screen)) page = <ForbiddenScreen screen={route.screen} />
    else {
      const Screen = SCREENS[route.screen]
      page = <Screen />
    }
  }

  return (
    <AppContext.Provider value={context}>
      <div className="app">
        <Sidebar />
        <main className="main">
          <Topbar />
          <div className="content">{page}</div>
        </main>
      </div>
      {modal && modal.key === pathOnly && modal.node}
      <div className={'toast' + (toastVisible ? ' show' : '')} role="status">{toastText}</div>
      <LoginOverlay open={loginOpen} onClose={() => setLoginOpen(false)} />
    </AppContext.Provider>
  )
}
