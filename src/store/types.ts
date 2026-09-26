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
  /** yyyy-mm-dd — used for "khách mới trong kỳ". */
  createdAt: string
  createdBy?: string
  /** Manual watch flag; project delays also make a customer "cần chú ý". */
  attention: boolean
  /** Why the manual flag was set (required when flagging). */
  attentionReason?: string
  /** Set when the cooperation is ended; only allowed once no project is running. */
  ended?: { date: string; reason: string }
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

/** Operating parameters from the SOP; editable by Administrator. */
export interface SopParams {
  cycleMonths: number
  planLeadBusinessDays: number
  shootingPlanAfterApprovalDays: number
  postDemoAfterShootBusinessDays: number
  postsPerWeekMin: number
  postsPerWeekMax: number
  scriptBatchSize: number
  scriptLeadDays: number
  editLeadDays: number
  cycleEndWarningDays: number
  requireBriefBeforeT0: boolean
}

/** Deliverables per monthly cycle, snapshotted from the service package. */
export interface PackageQuota {
  posts: number
  shoots: number
  plans: number
  brandPosts: number
  salesPosts: number
}

export type PlanStatus = 'draft' | 'sent' | 'changes' | 'approved'

export interface CycleTask {
  id: string
  name: string
  owner: string
  /** dd.mm.yyyy */
  deadline: string
  status: string
  type: string
}

export type ContentStage = 'Ý tưởng' | 'Script' | 'Dựng' | 'Chờ khách duyệt' | 'Lên lịch' | 'Đã đăng'
export type Platform = 'Facebook' | 'TikTok'

export interface ContentChannel {
  platform: Platform
  status: 'Chưa lên lịch' | 'Đã lên lịch' | 'Đã đăng'
  /** HH:MM */
  time: string
  link: string
}

/** One row of the Content Plan sheet. Dates are yyyy-mm-dd or ''. */
export interface ContentItem {
  id: string
  stt: number
  /** Bài tặng thêm, không tính vào định mức. */
  bonus: boolean
  /** Carried over from the previous cycle when it was closed short. */
  carried?: boolean
  postDate: string
  deadlineScript: string
  deadlineEdit: string
  mission: 'Thương hiệu' | 'Bán hàng'
  category: string
  topic: string
  title: string
  format: 'Video' | 'Ảnh' | 'Album'
  stage: ContentStage
  mediaLink: string
  channels: ContentChannel[]
}

export interface Shooting {
  id: string
  /** yyyy-mm-dd */
  date: string
  time: string
  location: string
  media: string[]
  status: 'Chờ xác nhận' | 'Đã xác nhận' | 'Đã hoàn thành'
  checklist: string
}

/** One monthly service cycle. All dates are yyyy-mm-dd or ''. */
export interface Cycle {
  no: number
  start: string
  plannedEnd: string
  actualEnd: string
  status: 'running' | 'closed'
  /** Filled when the cycle is closed; history rows read it instead of the content list. */
  result?: { published: number; planned: number; note: string }
  plan: { status: PlanStatus; link: string; sentAt: string; approvedAt: string; feedback: string }
  shootingPlan: { sentAt: string; link: string }
  shootings: Shooting[]
  demo: { status: 'Chưa gửi' | 'Đã gửi' | 'Cần chỉnh sửa' | 'Đã duyệt'; link: string; sentAt: string; approvedAt: string }
  contents: ContentItem[]
  tasks: CycleTask[]
  exceptions: Array<{ id: string; type: string; reason: string; resolved: boolean }>
  activity: Array<{ title: string; detail: string; time: string }>
}

export interface ProjectTeam {
  account: string
  planner: string
  media: string[]
  ads: string
}

export interface ProjectLinks {
  folder: string
  contentPlan: string
  contentPost: string
  keyNotes: string
}

export interface KeyNote {
  id: string
  /** yyyy-mm-dd */
  date: string
  author: string
  type: 'Từ khách' | 'Từ Account' | 'Shooting recap'
  content: string
}

export interface Project {
  id: string
  code: string
  customerId: string
  /** Customer name, denormalised for lists and search. */
  customer: string
  owner: string
  createdBy: string
  area: string
  service: string
  servicePackageId: string
  serviceScope: string
  servicePrice: number
  quota: PackageQuota
  contractCode: string
  /** Number of cycles in the primary contract. */
  total: number
  state: ProjectState
  risk: boolean
  /** Why the project was flagged (required when flagging). */
  riskReason?: string
  /** Package change signed in a Phụ lục, applied when cycle `fromCycle` opens. */
  pendingPackage?: { packageId: string; fromCycle: number; source: string }
  pause?: { reason: string; returnDate: string }
  stop?: { reason: string; date: string }
  cycles: Cycle[]
  team: ProjectTeam
  links: ProjectLinks
  notes: string
  keyNotes: KeyNote[]
  activities: Activity[]
  onboarding?: Onboarding
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
  /** Other projects of the same customer billed in this contract (one contract, several packages). */
  extraProjectIds?: string[]
  /** Phụ lục only: the package it switches to and the first cycle it applies to. */
  packageChange?: { projectId: string; packageId: string; fromCycle: number }
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
  quota: PackageQuota
}

/** [code, title, project, time, partner, input, status] */
export type ShootingRow = [string, string, string, string, string, string, string]
/** [code, title, project, owner, deadline, output, status] */
export type TaskRow = [string, string, string, string, string, string, string]

export interface Operations {
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
  params: SopParams
}
