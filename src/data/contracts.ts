import { addDaysIso, contractEnd, TODAY, toIso } from '../lib/format'
import type { Contract, Payment, Project, ServicePackage } from '../store/types'
import { COM_TAM_TAI_CONTRACT, COM_TAM_TAI_CONTRACT_FOLDER, COM_TAM_TAI_ID } from './comTamTai'

export type PaymentState = 'Đã thu đủ' | 'Thu một phần' | 'Quá hạn' | 'Đến hạn' | 'Chưa đến hạn'

export function paymentState(payment: Payment): PaymentState {
  const remaining = Math.max(0, payment.amount - payment.paid)
  if (!remaining) return 'Đã thu đủ'
  if (payment.paid) return 'Thu một phần'
  if (payment.due < TODAY) return 'Quá hạn'
  if (payment.due === TODAY) return 'Đến hạn'
  return 'Chưa đến hạn'
}

export function paymentTone(state: PaymentState): string {
  if (state === 'Đã thu đủ') return 'ok'
  if (state === 'Thu một phần' || state === 'Đến hạn') return 'waiting'
  if (state === 'Quá hạn') return 'danger'
  return 'muted'
}

export function contractTone(status: Contract['status']): string {
  return status === 'Hiệu lực' ? 'ok' : status === 'Nháp' ? 'muted' : status === 'Đã hủy' ? 'danger' : 'waiting'
}

export function paymentMetrics(row: Contract) {
  const remain = (payment: Payment) => Math.max(0, payment.amount - payment.paid)
  const unpaid = row.payments.filter((payment) => payment.paid < payment.amount)
  const sum = (list: Payment[]) => list.reduce((total, payment) => total + remain(payment), 0)
  return {
    remaining: sum(unpaid),
    overdue: sum(unpaid.filter((payment) => payment.due && payment.due < TODAY)),
    dueToday: sum(unpaid.filter((payment) => payment.due === TODAY)),
    future: sum(unpaid.filter((payment) => payment.due > TODAY)),
    next: [...unpaid].sort((a, b) => a.due.localeCompare(b.due))[0] ?? null,
  }
}

export function totalPaid(payments: Payment[]): number {
  return payments.reduce((sum, payment) => sum + Math.min(payment.amount, payment.paid), 0)
}

/** The contract bills this project, as main project or as an extra package line. */
export function coversProject(row: Contract, projectId: string): boolean {
  return row.projectId === projectId || Boolean(row.extraProjectIds?.includes(projectId))
}

/** Overdue unpaid amount on the project's primary contract (0 when none). */
export function projectOverdue(contracts: Contract[], projectId: string): number {
  const row = primaryContract(contracts, projectId)
  return row && row.status === 'Hiệu lực' ? paymentMetrics(row).overdue : 0
}

export function primaryContract(contracts: Contract[], projectId: string): Contract | undefined {
  return contracts.find((row) => coversProject(row, projectId) && row.isPrimary && row.status !== 'Đã hủy')
}

/** Project's contract code and cycle total always come from its primary contract. */
export function syncProjectContract(project: Project, contracts: Contract[]): void {
  const primary = primaryContract(contracts, project.id)
  project.contractCode = primary ? primary.code : ''
  project.total = primary ? primary.cycles : 0
}

/** VAT used by the demo contracts (Cơm Tấm Tài: 9tr × 6 + 8% = 58.320.000 đ). */
export const VAT_RATE = 0.08

export function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return toIso(new Date(y, m - 1 + months, d))
}

export interface ScheduleRow {
  percent: number
  due: string
  onDemo?: boolean
}

/**
 * Payment schedule as written in the company's contracts, dated from signing:
 * 1 tháng 50% on signing + 50% when the first demo video is sent; 3 tháng three equal
 * installments monthly; 6 tháng 40/30/30 on signing, +2 and +4 months. Other lengths
 * follow the nearest pattern. One-off packages: 50% on signing, 50% on hand-over.
 */
export function paymentSchedule(cycles: number, start: string, once = false): ScheduleRow[] {
  if (once || cycles <= 1) return [{ percent: 50, due: start }, { percent: 50, due: addDaysIso(start, 14), onDemo: !once }]
  if (cycles === 2) return [{ percent: 50, due: start }, { percent: 50, due: addMonthsIso(start, 1) }]
  if (cycles <= 3) return [{ percent: 33.34, due: start }, { percent: 33.33, due: addMonthsIso(start, 1) }, { percent: 33.33, due: addMonthsIso(start, 2) }]
  const step = Math.max(1, Math.floor(cycles / 3))
  return [{ percent: 40, due: start }, { percent: 30, due: addMonthsIso(start, step) }, { percent: 30, due: addMonthsIso(start, step * 2) }]
}

/** Split `value` by percent; the last installment takes the rounding remainder (whole thousands). */
export function splitAmounts(value: number, percents: number[]): number[] {
  let left = value
  return percents.map((percent, index) => {
    // A third (33.33 / 33.34 %) is an exact third, as in the 3-month contracts (3 equal installments).
    const share = Math.abs(percent - 100 / 3) < 0.02 ? value / 3 : (value * percent) / 100
    const amount = index === percents.length - 1 ? left : Math.round(share / 1000) * 1000
    left -= amount
    return amount
  })
}

/** Contract clause: debt older than 20 days ends the contract automatically. */
export const AUTO_END_DAYS = 20

/** "quá 12 ngày", with the 20-day auto-termination rule when it gets close. */
export function overdueText(days: number): string {
  if (days >= AUTO_END_DAYS) return 'quá ' + days + ' ngày · vượt 20 ngày, HĐ tự chấm dứt'
  if (days >= 15) return 'quá ' + days + ' ngày · còn ' + (AUTO_END_DAYS - days) + ' ngày là HĐ tự chấm dứt'
  return 'quá ' + days + ' ngày'
}

/** 1-month contracts: the "on demo" installment falls due on the day the Post Demo is sent. */
export function syncDemoPayments(contracts: Contract[], projects: Project[]): void {
  for (const contract of contracts) {
    const demo = projects.find((item) => item.id === contract.projectId)?.cycles[0]?.demo.sentAt
    for (const payment of contract.payments) if (payment.onDemo && demo && payment.paid < payment.amount) payment.due = demo
  }
}

/**
 * Demo schedule: installments spread over the term; past-due ones are paid except on a few
 * projects (overdue or partly paid) so the debt view has realistic cases.
 */
function seedPayments(value: number, start: string, cycles: number, index: number, once: boolean): Payment[] {
  const schedule = paymentSchedule(cycles, start, once)
  const amounts = splitAmounts(value, schedule.map((row) => row.percent))
  return schedule.map(({ percent, due, onDemo }, n) => {
    const amount = amounts[n]
    const past = due <= TODAY
    // Only a recent installment (last 45 days) is left unpaid in the demo.
    const next = schedule[n + 1]?.due
    const last = (!next || next > TODAY) && due > addDaysIso(TODAY, -45)
    const overdue = past && last && index % 7 === 2
    const partial = past && last && index % 9 === 4
    const paid = !past || overdue ? 0 : partial ? Math.round(amount / 2 / 1000) * 1000 : amount
    // Paid installments already have their VAT invoice, except the most recent one on a few projects.
    const invoiced = paid >= amount && !(last && index % 5 === 1)
    return { installment: n + 1, percent, amount, due, paid, paidAt: paid ? due : undefined, evidence: paid ? 'UNC-' + due.slice(2, 7).replace('-', '') + '-' + String(index + 1).padStart(3, '0') : '', onDemo, invoiced }
  })
}

export function seedContracts(projects: Project[], packages: ServicePackage[] = []): Contract[] {
  const records: Contract[] = []
  projects.forEach((project, index) => {
    if (project.state === 'draft' || SHARED_CONTRACT[project.id]) return
    const cycles = project.total || (index % 4 === 0 ? 3 : 6)
    const comTamTai = project.id === COM_TAM_TAI_ID
    const monthly = packages.find((item) => item.id === project.servicePackageId)?.unit === 'Tháng'
    const price = project.servicePrice || 2000000
    // Monthly packages bill every cycle; one-off packages (setup, website) once.
    const value = comTamTai ? COM_TAM_TAI_CONTRACT.value : Math.round((price * (monthly ? cycles : 1) * (1 + VAT_RATE)) / 1000) * 1000
    const start = comTamTai ? COM_TAM_TAI_CONTRACT.start : project.cycles[0]?.start ?? '2026-09-01'
    const payments: Payment[] = comTamTai ? COM_TAM_TAI_CONTRACT.payments.map((payment) => ({ ...payment, invoiced: payment.paid >= payment.amount })) : seedPayments(value, start, monthly ? cycles : 1, index, !monthly)
    const settled = payments.every((payment) => payment.paid >= payment.amount)
    records.push({
      id: 'contract-' + (index + 1),
      code: project.contractCode || 'HĐ-2026-' + String(index + 101),
      projectId: project.id,
      customer: project.customer,
      project: project.customer,
      type: 'Hợp đồng chính',
      isPrimary: true,
      service: project.service,
      scope: project.serviceScope,
      cycles,
      start,
      end: contractEnd(start, cycles),
      value,
      vatRate: VAT_RATE * 100,
      paid: totalPaid(payments),
      payments,
      status: comTamTai ? 'Hiệu lực' : project.state === 'stopped' && settled ? 'Kết thúc' : 'Hiệu lực',
      evidence: comTamTai ? COM_TAM_TAI_CONTRACT_FOLDER : '',
      folderUrl: comTamTai ? COM_TAM_TAI_CONTRACT_FOLDER : '',
      activity: [comTamTai ? 'Đã tạo hợp đồng, lịch 3 đợt thanh toán 40/30/30' : 'Đã tạo từ dữ liệu mẫu'],
    })
    if (index % 11 === 3) {
      const due = addMonthsIso(start, 1)
      records.push({
        id: 'appendix-' + (index + 1),
        code: 'PL-2026-' + String(index + 1).padStart(3, '0'),
        projectId: project.id,
        customer: project.customer,
        project: project.customer,
        type: 'Phụ lục',
        isPrimary: false,
        service: project.service,
        scope: 'Bổ sung phạm vi theo phụ lục.',
        cycles: 1,
        start: due,
        end: contractEnd(due, 1),
        value: 1080000,
        paid: due < addDaysIso(TODAY, -45) ? 1080000 : 0,
        payments: [{ installment: 1, percent: 100, amount: 1080000, paid: due < addDaysIso(TODAY, -45) ? 1080000 : 0, paidAt: due < addDaysIso(TODAY, -45) ? due : undefined, due, evidence: due < addDaysIso(TODAY, -45) ? 'UNC-PL-' + String(index + 1).padStart(3, '0') : '', invoiced: due < addDaysIso(TODAY, -45) }],
        status: 'Hiệu lực',
        evidence: '',
        folderUrl: '',
        activity: ['Phụ lục bổ sung phạm vi'],
      })
    }
    syncProjectContract(project, records)
  })
  // One contract, several packages: the extra project is a second line of its sibling's contract.
  Object.entries(SHARED_CONTRACT).forEach(([extraId, mainId]) => {
    const extra = projects.find((item) => item.id === extraId)
    const contract = records.find((row) => row.projectId === mainId && row.isPrimary)
    if (!extra || !contract) return
    contract.extraProjectIds = [...(contract.extraProjectIds ?? []), extraId]
    contract.service += ' + ' + extra.service
    // A monthly package in the contract sets its length (the one-off package is billed once).
    const cycles = extra.quota.once ? 1 : extra.total || 6
    contract.cycles = Math.max(contract.cycles, cycles)
    contract.end = contractEnd(contract.start, contract.cycles)
    contract.value += Math.round((extra.servicePrice * cycles * (1 + VAT_RATE)) / 1000) * 1000
    contract.payments = contract.payments.map((payment) => {
      const amount = Math.round((contract.value * payment.percent) / 100 / 1000) * 1000
      // A fully paid installment stays fully paid at the combined amount.
      return { ...payment, amount, paid: payment.paid >= payment.amount ? amount : Math.min(payment.paid, amount) }
    })
    contract.paid = totalPaid(contract.payments)
    contract.activity.unshift('Hợp đồng gồm 2 gói: ' + contract.service)
    syncProjectContract(extra, records)
  })
  return records
}

/** Demo: A Mẹt Quán's Ads project is billed inside the Website contract (HĐ-2026-106). */
export const SHARED_CONTRACT: Record<string, string> = { 'project-amet-ads': 'project-6' }
