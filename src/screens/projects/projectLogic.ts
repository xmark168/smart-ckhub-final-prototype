import { cycleProgress, currentCycle, runningCycle } from '../../lib/sop'
import { formatDate, parseInput } from '../../lib/format'
import { update } from '../../store/store'
import { viewOnlyReason } from '../../ui/viewOnly'
import type { Cycle, PlanStatus, Project, SopParams } from '../../store/types'

export const MEDIA_PEOPLE = ['Hải', 'Như', 'Hân', 'Bình', 'Phước', 'Anh Thư', 'Ngọc']

export function projectLabel(item: Project): string {
  return item.state === 'active' ? 'Đang triển khai' : item.state === 'pending' ? 'Tạm dừng' : item.state === 'stopped' ? 'Đã dừng' : 'Dự án nháp'
}

export function projectTone(item: Project): string {
  return item.risk ? 'danger' : item.state === 'active' ? 'ok' : item.state === 'draft' ? 'muted' : 'waiting'
}

/** "dd.mm.yyyy – dd.mm.yyyy" of a cycle. */
export function rangeOf(cycle: Cycle): string {
  return formatDate(parseInput(cycle.start)) + ' – ' + formatDate(parseInput(cycle.plannedEnd))
}

/** Range of the running (or last) cycle, or "Chưa bắt đầu". */
export function cycleRange(item: Project): string {
  const cycle = currentCycle(item)
  return cycle ? rangeOf(cycle) : 'Chưa bắt đầu'
}

/** Current cycle number shown as "4 / 6". */
export function cycleCounter(item: Project): string {
  const cycle = currentCycle(item)
  return (cycle ? cycle.no : '–') + ' / ' + (item.total || '–')
}

/** Published / planned posts of the current cycle; `null` for packages without content. */
export function postProgress(item: Project) {
  const cycle = currentCycle(item)
  if (!cycle || !item.quota.posts) return null
  const progress = cycleProgress(cycle, item.quota)
  return { ...progress, percent: Math.round((progress.published / Math.max(1, progress.planned)) * 100) }
}

export function addProjectActivity(item: Project, icon: string, title: string, detail: string): void {
  item.activities = [{ icon, title, detail }, ...item.activities].slice(0, 12)
}

export interface OnboardingItem {
  key: string
  icon: string
  title: string
  required: boolean
  ready: boolean
  detail: string
}

/** Conditions for T0. The SOP starts a project only after deposit and a complete brief. */
export function onboardingItems(item: Project, params: SopParams): OnboardingItem[] {
  const data = item.onboarding
  return [
    { key: 'contract', icon: 'file-text', title: 'Hợp đồng chính', required: true, ready: Boolean(item.contractCode), detail: item.contractCode ? 'Đã liên kết ' + item.contractCode : 'Cần hợp đồng chính hiệu lực.' },
    { key: 'finance', icon: 'badge-check', title: 'Xác nhận cọc', required: true, ready: Boolean(data?.financeVerified), detail: data?.financeVerified ? 'Kế toán đã xác nhận: ' + (data.financeRef || 'Đã xác nhận') : 'Chờ Kế toán xác nhận cọc hoặc thanh toán đợt 1.' },
    { key: 'handover', icon: 'handshake', title: 'Bàn giao từ Sale', required: true, ready: Boolean(data?.handoverReady), detail: data?.handoverReady ? 'Đã có Sales Brief.' : 'Cần Sales Brief và phạm vi đã chốt.' },
    { key: 'brief', icon: 'clipboard-check', title: 'Brief khách hàng', required: params.requireBriefBeforeT0, ready: Boolean(data?.briefReady), detail: data?.briefReady ? 'Brief form và tài liệu nguồn đã đủ.' : 'Cần brief form (Thông tin dự án) và tài liệu nguồn.' },
    { key: 'setup', icon: 'settings-2', title: 'Thiết lập triển khai', required: false, ready: Boolean(data?.setupReady), detail: data?.setupReady ? 'Đã chuẩn bị workspace và quyền truy cập cần thiết.' : 'Thiết lập theo gói dịch vụ chưa hoàn tất.' },
  ]
}

export function onboardingReady(item: Project, params: SopParams): boolean {
  return onboardingItems(item, params).filter((entry) => entry.required).every((entry) => entry.ready)
}

/**
 * Mutates a draft project's running cycle and logs the change on both the cycle and the project.
 * Does nothing when the project has no running cycle.
 */
export function withCycle(item: Project, change: (cycle: Cycle) => [string, string]): void {
  const cycle = runningCycle(item)
  if (!cycle) return
  const [title, detail] = change(cycle)
  cycle.activity.unshift({ title, detail, time: 'Vừa xong' })
  addProjectActivity(item, 'list-checks', title, detail)
}

export function planLabel(status: PlanStatus): string {
  return { draft: 'Nháp', sent: 'Đã gửi khách', changes: 'Cần chỉnh sửa', approved: 'Đã duyệt' }[status] ?? 'Nháp'
}

export function statusTone(status: string): string {
  if (status === 'Đã duyệt' || status === 'Đã hoàn thành' || status === 'Đã xác nhận' || status === 'Đã đăng') return 'ok'
  if (status === 'Cần chỉnh sửa' || status === 'Có nguy cơ trễ' || status === 'Trễ chu kỳ') return 'danger'
  if (status === 'Đang thực hiện' || status === 'Đã gửi khách' || status === 'Đã gửi' || status === 'Đã lên lịch' || status === 'Lên lịch') return 'info'
  if (status === 'Dựng' || status === 'Chờ khách duyệt' || status === 'Chờ xác nhận') return 'waiting'
  return 'muted'
}

export function updateProject(id: string, change: (project: Project) => void): void {
  if (viewOnlyReason()) return
  update((draft) => {
    const project = draft.projects.find((item) => item.id === id)
    if (project) change(project)
  })
}

export function canStopProject(role: string, account: string, project: Project): boolean {
  return role === 'account' && (project.owner === account || project.createdBy === account)
}

/** "Còn N ngày" / "Quá N ngày" relative to today, for a yyyy-mm-dd date. */
export function relativeDay(iso: string, today: string): string {
  if (!iso) return ''
  const days = Math.round((parseInput(iso).getTime() - parseInput(today).getTime()) / 86400000)
  if (days === 0) return 'hôm nay'
  return days > 0 ? 'còn ' + days + ' ngày' : 'quá ' + -days + ' ngày'
}


export function resolveException(projectId: string, id: string): void {
  updateProject(projectId, (item) =>
    withCycle(item, (cycle) => {
      const entry = cycle.exceptions.find((row) => row.id === id)
      if (entry) entry.resolved = true
      return ['Ngoại lệ đã xử lý', entry?.type ?? '']
    }),
  )
}
