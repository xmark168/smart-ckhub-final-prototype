import { paymentMetrics } from '../../data/contracts'
import { diffDays, displayToInput, foldText, TODAY } from '../../lib/format'
import { projectHealth, runningCycle } from '../../lib/sop'
import type { Contract, Customer, Period, Project, Role, SopParams } from '../../store/types'

export type CustomerStatus = 'active' | 'onboarding' | 'paused' | 'none' | 'ended'

export const CUSTOMER_STATUS: Record<CustomerStatus, { label: string; tone: string }> = {
  active: { label: 'Đang hợp tác', tone: 'ok' },
  onboarding: { label: 'Chờ khởi động', tone: 'info' },
  paused: { label: 'Tạm ngưng', tone: 'waiting' },
  none: { label: 'Chưa có dự án', tone: 'muted' },
  ended: { label: 'Đã kết thúc hợp tác', tone: 'muted' },
}

export function addCustomerActivity(customer: Customer, title: string, detail: string, icon = 'clock-3') {
  customer.activities = [{ title, detail, icon, time: 'Vừa xong' }, ...customer.activities].slice(0, 10)
}

export function customerProjects(customer: Customer, projects: Project[]): Project[] {
  return projects.filter((item) => item.customerId === customer.id)
}

/** Customer status is derived from its projects; only "ended" is stored on the customer. */
export function customerStatus(customer: Customer, projects: Project[]): CustomerStatus {
  if (customer.ended) return 'ended'
  const own = customerProjects(customer, projects)
  if (own.some((item) => item.state === 'active')) return 'active'
  if (own.some((item) => item.state === 'pending' || item.state === 'stopped')) return 'paused'
  if (own.some((item) => item.state === 'draft')) return 'onboarding'
  return 'none'
}

export interface AttentionItem {
  kind: 'flag' | 'late' | 'risk' | 'debt' | 'renew'
  /** Short label, e.g. "DA-2026-056 · chậm tiến độ". */
  label: string
  /** Full explanation for tooltips. */
  detail: string
  /** Project or contract id to open; empty for the manual flag. */
  targetId: string
}

/** Why a customer needs attention: manual flag, late or flagged projects, overdue payments. */
export function attentionItems(customer: Customer, projects: Project[], contracts: Contract[], params: SopParams): AttentionItem[] {
  if (customer.ended) return []
  const items: AttentionItem[] = []
  if (customer.attention) items.push({ kind: 'flag', label: 'Gắn cờ · ' + (customer.attentionReason || 'cần chú ý'), detail: 'Cờ tay trên khách hàng', targetId: '' })
  customerProjects(customer, projects).forEach((project) => {
    const health = projectHealth(project, params)
    if (health.level === 'late') items.push({ kind: 'late', label: project.code + ' · chậm tiến độ', detail: health.reason, targetId: project.id })
    else if (project.risk) items.push({ kind: 'risk', label: project.code + ' · gắn cờ', detail: project.riskReason || 'Account gắn cờ trên dự án', targetId: project.id })
    contracts
      .filter((row) => row.projectId === project.id && row.status === 'Hiệu lực')
      .forEach((row) => {
        const overdue = paymentMetrics(row).overdue
        if (overdue) items.push({ kind: 'debt', label: row.code + ' · quá hạn ' + shortMoney(overdue), detail: 'Công nợ quá hạn ' + overdue.toLocaleString('vi-VN') + 'đ', targetId: row.id })
        if (row.isPrimary && project.state === 'active' && renewalDue(project, row)) {
          items.push({ kind: 'renew', label: row.code + ' · sắp hết HĐ', detail: 'Hết hạn ' + row.end + ' · chu kỳ ' + project.cycles.length + '/' + row.cycles + '. Cần trao đổi tái ký.', targetId: row.id })
        }
      })
  })
  return items
}

/** 17496000 → "17,5tr". */
export function shortMoney(value: number): string {
  return value >= 1e6 ? (Math.round(value / 1e5) / 10).toLocaleString('vi-VN') + 'tr' : value.toLocaleString('vi-VN') + 'đ'
}

/** Text form used by the list (tooltips and KPI breakdown). */
export function attentionReasons(customer: Customer, projects: Project[], contracts: Contract[], params: SopParams): string[] {
  return attentionItems(customer, projects, contracts, params).map((item) => item.label + ': ' + item.detail)
}

/** yyyy-mm-dd falls in the dashboard period (a month or a year). */
export function inPeriod(iso: string | undefined, period: Period): boolean {
  if (!iso) return false
  return iso.startsWith(period.mode === 'year' ? period.year : period.year + '-' + period.month)
}

export function isNewInPeriod(customer: Customer, period: Period): boolean {
  return inPeriod(customer.createdAt, period)
}

export function endedInPeriod(customer: Customer, period: Period): boolean {
  return inPeriod(customer.ended?.date, period)
}

/** Groups attention reasons for the KPI subtitle: late milestones, overdue debt, manual flags. */
export function attentionKind(reason: string): 'late' | 'debt' | 'flag' | 'renew' {
  return reason.includes('sắp hết HĐ') ? 'renew' : reason.includes('công nợ') ? 'debt' : reason.includes('cờ') ? 'flag' : 'late'
}

/** Days until the contract ends (end is dd.mm.yyyy); negative when already past. */
export function daysToEnd(contract: Contract): number {
  return diffDays(TODAY, displayToInput(contract.end))
}

/** Renewal window: the last contracted cycle is running, or the contract ends within 30 days. */
export function renewalDue(project: Project, contract: Contract): boolean {
  const lastCycle = Boolean(runningCycle(project)) && project.cycles.length >= contract.cycles
  return lastCycle || daysToEnd(contract) <= 30
}

export function periodLabel(period: Period): string {
  return period.mode === 'year' ? 'năm ' + period.year : 'tháng ' + period.month + '/' + period.year
}

/** Owner or creator Account; BODs and Administrator only view. */
export function canManageCustomer(role: Role, account: string, customer: Customer): boolean {
  return role === 'account' && (customer.owner === account || customer.createdBy === account)
}

/** Ending cooperation needs every project stopped and no contract still in force. */
export function endBlockers(customer: Customer, projects: Project[], contracts: Contract[]): string[] {
  const own = customerProjects(customer, projects)
  const running = own.filter((item) => item.state !== 'stopped')
  const open = contracts.filter((row) => own.some((item) => item.id === row.projectId) && (row.status === 'Hiệu lực' || row.status === 'Nháp'))
  return [
    ...running.map((item) => item.code + ' chưa dừng'),
    ...open.map((row) => row.code + ' còn ' + row.status.toLocaleLowerCase('vi')),
  ]
}

export function sameName(a: string, b: string): boolean {
  return foldText(a) === foldText(b)
}
