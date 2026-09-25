import { CURRENT_ACCOUNT, cycleEnd, formatDate, parseInput } from '../../lib/format'
import { update } from '../../store/store'
import type { CycleData, PlanStatus, Project } from '../../store/types'

export function projectLabel(item: Project): string {
  return item.state === 'active' ? 'Đang triển khai' : item.state === 'pending' ? 'Tạm dừng' : item.state === 'stopped' ? 'Đã dừng' : 'Dự án nháp'
}

export function projectTone(item: Project): string {
  return item.risk ? 'danger' : item.state === 'active' ? 'ok' : item.state === 'draft' ? 'muted' : 'waiting'
}

/** "dd.mm.yyyy – dd.mm.yyyy" for the current cycle, derived from its start or its planned end. */
export function cycleRange(item: Project): string {
  if (item.cycleStart) return formatDate(parseInput(item.cycleStart)) + ' – ' + cycleEnd(item.cycleStart)
  if (!item.due) return 'Chưa bắt đầu'
  const [day, month, year] = item.due.split('.').map(Number)
  const start = new Date(year, month - 2, day + 1)
  return formatDate(start) + ' – ' + item.due
}

export function addProjectActivity(item: Project, icon: string, title: string, detail: string): void {
  item.activities = [{ icon, title, detail }, ...item.activities].slice(0, 8)
}

export interface OnboardingItem {
  key: string
  icon: string
  title: string
  required: boolean
  ready: boolean
  detail: string
}

export function onboardingItems(item: Project): OnboardingItem[] {
  const data = item.onboarding
  return [
    { key: 'contract', icon: 'file-text', title: 'Hợp đồng chính', required: true, ready: Boolean(item.contractCode), detail: item.contractCode ? 'Đã liên kết ' + item.contractCode : 'Cần hợp đồng chính hiệu lực.' },
    { key: 'finance', icon: 'badge-check', title: 'Xác nhận tài chính', required: true, ready: Boolean(data?.financeVerified), detail: data?.financeVerified ? 'Kế toán đã xác nhận: ' + (data.financeRef || 'Đã xác nhận') : 'Chờ Kế toán xác nhận cọc hoặc thanh toán.' },
    { key: 'handover', icon: 'handshake', title: 'Bàn giao từ Sale', required: true, ready: Boolean(data?.handoverReady), detail: data?.handoverReady ? 'Đã có Sales Brief.' : 'Cần Sales Brief và phạm vi đã chốt.' },
    { key: 'brief', icon: 'clipboard-check', title: 'Brief và tài liệu', required: false, ready: Boolean(data?.briefReady), detail: data?.briefReady ? 'Brief, tài liệu nguồn đã đủ.' : 'Cần brief và tài liệu vận hành.' },
    { key: 'setup', icon: 'settings-2', title: 'Thiết lập triển khai', required: false, ready: Boolean(data?.setupReady), detail: data?.setupReady ? 'Đã chuẩn bị workspace và quyền truy cập cần thiết.' : 'Thiết lập theo gói dịch vụ chưa hoàn tất.' },
  ]
}

export function onboardingReady(item: Project): boolean {
  return onboardingItems(item).filter((entry) => entry.required).every((entry) => entry.ready)
}

/** Default cycle workspace for a project that has not been opened yet. */
export function defaultCycleData(item: Project): CycleData {
  const seed = Number(item.id.replace(/\D/g, '')) || 1
  const status: PlanStatus = item.state === 'draft' ? 'draft' : seed % 5 === 0 ? 'sent' : seed % 7 === 0 ? 'changes' : 'approved'
  const approved = status === 'approved'
  return {
    plan: {
      status,
      version: 1,
      link: '',
      sentAt: status === 'draft' ? '' : '22.09.2026',
      approvedAt: approved ? '23.09.2026' : '',
      feedback: status === 'changes' ? 'Cần điều chỉnh ưu tiên nội dung tuần đầu.' : '',
    },
    tasks: [
      { id: 'plan', name: 'Hoàn thiện Content Plan', owner: item.owner, deadline: '23.09.2026', status: approved ? 'Đã hoàn thành' : 'Việc cần làm', type: 'Plan' },
      { id: 'scripts', name: 'Chuẩn bị 6 script đợt 1', owner: 'Planner/Content', deadline: '27.09.2026', status: approved ? 'Đang thực hiện' : 'Nháp', type: 'Nội dung' },
      { id: 'media', name: 'Bàn giao script và tư liệu cho Media', owner: 'Planner/Content', deadline: '29.09.2026', status: 'Nháp', type: 'Sản xuất' },
    ],
    shootings: [],
    demo: { status: 'Chưa gửi', link: '', sentAt: '', approvedAt: '' },
    posts: { planned: item.posts || 12, actual: 0 },
    exceptions: [],
    activity: [{ title: 'Chu kỳ được tạo', detail: 'Mốc dự kiến ' + item.due, time: 'Hôm nay' }],
  }
}

export function cycleDataFor(item: Project): CycleData {
  return item.cycleData ?? defaultCycleData(item)
}

/** Mutates a draft project: materialises its cycle data and logs to both cycle and project history. */
export function withCycle(item: Project, change: (cycle: CycleData) => [string, string]): void {
  const cycle = (item.cycleData = item.cycleData ?? defaultCycleData(item))
  const [title, detail] = change(cycle)
  cycle.activity.unshift({ title, detail, time: 'Vừa xong' })
  addProjectActivity(item, 'list-checks', title, detail)
}

export function planLabel(status: PlanStatus): string {
  return { draft: 'Nháp', sent: 'Đã gửi khách', changes: 'Cần chỉnh sửa', approved: 'Đã duyệt' }[status] ?? 'Nháp'
}

export function statusTone(status: string): string {
  if (status === 'Đã duyệt' || status === 'Đã hoàn thành' || status === 'Đã xác nhận') return 'ok'
  if (status === 'Cần chỉnh sửa' || status === 'Có nguy cơ trễ' || status === 'Trễ chu kỳ') return 'danger'
  if (status === 'Đang thực hiện' || status === 'Đã gửi khách' || status === 'Đã gửi') return 'info'
  return 'muted'
}

export function updateProject(id: string, change: (project: Project) => void): void {
  update((draft) => {
    const project = draft.projects.find((item) => item.id === id)
    if (project) change(project)
  })
}

export function canStopProject(role: string, project: Project): boolean {
  return role === 'account' && (project.owner === CURRENT_ACCOUNT || project.createdBy === CURRENT_ACCOUNT)
}
