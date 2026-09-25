import { paymentMetrics } from '../../data/contracts'
import { projectHealth } from '../../lib/sop'
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

/** Reasons a customer needs attention: manual flag, late projects, overdue payments. */
export function attentionReasons(customer: Customer, projects: Project[], contracts: Contract[], params: SopParams): string[] {
  if (customer.ended) return []
  const reasons: string[] = []
  if (customer.attention) reasons.push('Account đã gắn cờ cần chú ý')
  customerProjects(customer, projects).forEach((project) => {
    const health = projectHealth(project, params)
    if (health.level === 'late') reasons.push(project.code + ': ' + health.reason)
    else if (project.risk) reasons.push(project.code + ': gắn cờ rủi ro')
    contracts
      .filter((row) => row.projectId === project.id && row.status === 'Hiệu lực')
      .forEach((row) => {
        const overdue = paymentMetrics(row).overdue
        if (overdue) reasons.push(row.code + ': công nợ quá hạn ' + overdue.toLocaleString('vi-VN') + 'đ')
      })
  })
  return reasons
}

export function isNewInPeriod(customer: Customer, period: Period): boolean {
  return period.mode === 'year' ? customer.createdAt.startsWith(period.year) : customer.createdAt.startsWith(period.year + '-' + period.month)
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
  const normal = (value: string) => value.trim().toLocaleLowerCase('vi').replace(/\s+/g, ' ')
  return normal(a) === normal(b)
}
