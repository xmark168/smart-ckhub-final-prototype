export type Role = 'account' | 'accountant' | 'partner' | 'admin' | 'bods'

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
  /** Free notes about the customer (preferences, context, agreements outside the contract). */
  notes?: string
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
  shootingPlanBeforeShootDays: number
  postDemoAfterShootBusinessDays: number
  postsPerWeekMin: number
  postsPerWeekMax: number
  scriptBatchSize: number
  scriptLeadDays: number
  editLeadDays: number
  cycleEndWarningDays: number
  /** Default VAT % for new contracts. */
  vatRate: number
  requireBriefBeforeT0: boolean
}

/** Deliverables per monthly cycle, snapshotted from the service package. */
export interface PackageQuota {
  posts: number
  shoots: number
  plans: number
  brandPosts: number
  salesPosts: number
  /** One-off package (setup, website): a single delivery, no monthly cycles, no renewal. */
  once?: boolean
}

export type PlanStatus = 'draft' | 'sent' | 'changes' | 'approved'

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
  /** yyyy-mm-dd; '' while the date is not fixed yet. */
  date: string
  time: string
  location: string
  media: string[]
  status: 'Chờ xác nhận' | 'Đã xác nhận' | 'Đã hoàn thành'
  checklist: string
  /** The Shooting Plan of this shoot (one per shoot). */
  plan: { sentAt: string; link: string }
}

/**
 * Timeline step types. Each type reads its "done" from the cycle's own records (Content Plan,
 * Shooting, Post Demo, content stages), so nothing is entered twice. `custom` is ticked by hand.
 */
export type StepKind = 'kickoff' | 'plan' | 'shootingPlan' | 'shoot' | 'demo' | 'script' | 'edit' | 'publish' | 'custom'
export type StepOwner = 'Account' | 'Planner/Content' | 'Media' | 'Khách'

/** When a step is due: `offset` days (working or calendar) after T0 or after another step. */
export interface StepAnchor {
  /** 'T0', 'shoot' / 'shoot:N' (a shooting of the cycle) or the id of an earlier step. */
  after: string
  /** 'approved' waits for the customer to approve that step; 'scheduled' uses a shoot's planned date. */
  event: 'done' | 'approved' | 'scheduled'
  offset: number
  unit: 'bd' | 'd'
}

/** One step of a package's timeline template. */
export interface TimelineStepTemplate {
  id: string
  kind: StepKind
  name: string
  owner: StepOwner
  anchor: StepAnchor
  /** script / edit / publish: posts covered, 1-based by order in the Content Plan; `to` 0 = to the end (bonus posts included). */
  posts?: [number, number]
  /** shoot: which shooting of the cycle (1-based). */
  shootNo?: number
  /** publish: posts per week [min, max]. */
  perWeek?: [number, number]
  /** Only in the project's first cycle (e.g. Post Demo agrees mood & tone once). */
  firstCycleOnly?: boolean
}

/** A template step copied into a cycle; Account adjustments are kept with their reasons. */
export interface TimelineStep extends TimelineStepTemplate {
  /** Due date set by hand; replaces the computed one. */
  dueOverride?: string
  skipped?: boolean
  /** custom steps only: ticked done on this date. */
  doneAt?: string
  log: Array<{ at: string; by: string; text: string }>
}

/** One service cycle. It closes when every step is done, not on a calendar date. All dates are yyyy-mm-dd or ''. */
export interface Cycle {
  no: number
  start: string
  /** Target end (T0 + cycle length); the cycle is closed when the timeline is delivered. */
  plannedEnd: string
  actualEnd: string
  status: 'running' | 'closed'
  /** Snapshot of the package timeline when the cycle opened. */
  timeline: TimelineStep[]
  /** Filled when the cycle is closed; history rows read it instead of the content list. */
  result?: { published: number; planned: number; note: string }
  plan: { status: PlanStatus; link: string; sentAt: string; approvedAt: string; feedback: string }
  shootings: Shooting[]
  demo: { status: 'Chưa gửi' | 'Đã gửi' | 'Cần chỉnh sửa' | 'Đã duyệt'; link: string; sentAt: string; approvedAt: string }
  contents: ContentItem[]
  activity: Array<{ title: string; detail: string; time: string }>
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
  /** VAT % of this contract (entered per contract; the rate changes over the years). */
  vatRate?: number
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
  /** Default steps of every cycle of this package; edited in Gói dịch vụ › Timeline. */
  timeline: TimelineStepTemplate[]
}

/**
 * A to-do. Generated ones carry `source` (the milestone, post, installment… they come from) and
 * are kept in sync with it; manual ones have no source and are ticked by hand.
 */
export interface WorkTask {
  id: string
  source?: string
  projectId: string
  title: string
  /** Who normally does it. */
  role: StepOwner | 'Kế toán'
  /** Person it is given to; editable, never overwritten by the sync. */
  assignee: string
  /** yyyy-mm-dd */
  due: string
  status: 'open' | 'done' | 'cancelled'
  doneAt?: string
  note?: string
  /** Project tab where the work is done. */
  tab?: 'tong-quan' | 'quay-chup' | 'noi-dung' | 'hop-dong' | 'tai-lieu'
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
  tasks: WorkTask[]
  profile: Profile
  period: Period
  params: SopParams
}
