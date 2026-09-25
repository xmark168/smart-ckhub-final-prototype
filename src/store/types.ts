export type Role = 'account' | 'partner' | 'admin' | 'bods'

export interface Activity {
  icon: string
  title: string
  detail: string
  time?: string
}

export interface Customer {
  id: string
  name: string
  owner: string
  area: string
  projectCode: string
  state: 'active' | 'stopped'
  attention: boolean
  newCustomer: boolean
  /** Planned end of the current cycle, or "Chưa cập nhật". */
  cycle: string
  service: string
  contact: string
  createdBy?: string
  activities: Activity[]
}

export type ProjectState = 'active' | 'pending' | 'stopped' | 'draft'

export interface Onboarding {
  financeVerified: boolean
  financeRef: string
  handoverReady: boolean
  handoverLink: string
  briefReady: boolean
  briefLink: string
  setupReady: boolean
  workspaceLink: string
  setupNote: string
}

export type PlanStatus = 'draft' | 'sent' | 'changes' | 'approved'

export interface CycleTask {
  id: string
  name: string
  owner: string
  deadline: string
  status: string
  type: string
}

export interface CycleData {
  plan: { status: PlanStatus; version: number; link: string; sentAt: string; approvedAt: string; feedback: string }
  tasks: CycleTask[]
  shootings: Array<{ date: string; media: string; status: string; assets: string }>
  demo: { status: string; link: string; sentAt: string; approvedAt: string }
  posts: { planned: number; actual: number }
  exceptions: Array<{ type: string; reason: string }>
  activity: Array<{ title: string; detail: string; time: string }>
}

export interface Project {
  id: string
  code: string
  customer: string
  owner: string
  createdBy: string
  area: string
  service: string
  servicePackageId: string
  serviceScope: string
  servicePrice: number
  contractCode: string
  state: ProjectState
  risk: boolean
  cycle: number
  total: number
  progress: number
  /** yyyy-mm-dd, set when the current cycle has an explicit start. */
  cycleStart?: string
  /** Planned end of the current cycle, dd.mm.yyyy. */
  due: string
  actualEnd?: string
  actualEndNote?: string
  posts: number
  shooting: number
  tasks: number
  activities: Activity[]
  onboarding?: Onboarding
  cycleData?: CycleData | null
}

export interface Payment {
  installment: number
  percent: number
  amount: number
  /** yyyy-mm-dd */
  due: string
  paid: number
  paidAt?: string
  evidence?: string
  driveLink?: string
}

export type ContractStatus = 'Nháp' | 'Hiệu lực' | 'Kết thúc' | 'Đã hủy'

export interface Contract {
  id: string
  code: string
  projectId: string
  customer: string
  project: string
  type: 'Hợp đồng chính' | 'Phụ lục'
  isPrimary: boolean
  service: string
  scope: string
  cycles: number
  /** yyyy-mm-dd */
  start: string
  /** dd.mm.yyyy */
  end: string
  value: number
  paid: number
  payments: Payment[]
  status: ContractStatus
  evidence: string
  folderUrl: string
  activity: string[]
}

export interface ServiceCategory {
  id: string
  name: string
  code: string
  status: string
}

export type PriceType = 'fixed' | 'range' | 'from' | 'quote'

export interface ServicePackage {
  id: string
  category: string
  group: string
  name: string
  unit: string
  priceType: PriceType
  price: number
  maxPrice?: number
  status: 'Đang áp dụng' | 'Ngừng áp dụng'
  scope: string
}

/** [code, title, group, channels, date, status] */
export type ContentRow = [string, string, string, string, string, string]
/** [code, title, project, time, partner, input, status] */
export type ShootingRow = [string, string, string, string, string, string, string]
/** [code, title, project, owner, deadline, output, status] */
export type TaskRow = [string, string, string, string, string, string, string]

export interface Operations {
  contents: ContentRow[]
  shootings: ShootingRow[]
  tasks: TaskRow[]
}

export interface Profile {
  name: string
  email: string
  phone: string
}

export interface Period {
  mode: 'month' | 'year'
  month: string
  year: string
}

export interface AppData {
  version: number
  customers: Customer[]
  projects: Project[]
  contracts: Contract[]
  categories: ServiceCategory[]
  packages: ServicePackage[]
  operations: Operations
  profile: Profile
  period: Period
}
