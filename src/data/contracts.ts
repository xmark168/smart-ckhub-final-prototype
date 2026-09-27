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

function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return toIso(new Date(y, m - 1 + months, d))
}

/** Installment split by contract length: 6+ cycles 40/30/30, shorter 50/50, one-off 100%. */
function splitFor(cycles: number): number[] {
  return cycles >= 6 ? [40, 30, 30] : cycles >= 2 ? [50, 50] : [100]
}

/**
 * Demo schedule: installments spread over the term; past-due ones are paid except on a few
 * projects (overdue or partly paid) so the debt view has realistic cases.
 */
function seedPayments(value: number, start: string, cycles: number, index: number): Payment[] {
  const split = splitFor(cycles)
  const step = split.length > 1 ? Math.max(1, Math.floor(cycles / split.length)) : 0
  let left = value
  return split.map((percent, n) => {
    const amount = n === split.length - 1 ? left : Math.round((value * percent) / 100 / 1000) * 1000
    left -= amount
    const due = addMonthsIso(start, n * step)
    const past = due <= TODAY
    // Only a recent installment (last 45 days) is left unpaid in the demo.
    const last = (n === split.length - 1 || addMonthsIso(start, (n + 1) * step) > TODAY) && due > addDaysIso(TODAY, -45)
    const overdue = past && last && index % 7 === 2
    const partial = past && last && index % 9 === 4
    const paid = !past || overdue ? 0 : partial ? Math.round(amount / 2 / 1000) * 1000 : amount
    return { installment: n + 1, percent, amount, due, paid, paidAt: paid ? due : undefined, evidence: paid ? 'UNC-' + due.slice(2, 7).replace('-', '') + '-' + String(index + 1).padStart(3, '0') : '' }
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
    const payments: Payment[] = comTamTai ? COM_TAM_TAI_CONTRACT.payments.map((payment) => ({ ...payment })) : seedPayments(value, start, monthly ? cycles : 1, index)
    const settled = payments.every((payment) => payment.paid >= payment.amount)
    records.push({
      id: 'contract-' + (index + 1),
      code: project.contractCode || 'HĐ-2026-' + String(index + 1).padStart(3, '0'),
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
        payments: [{ installment: 1, percent: 100, amount: 1080000, paid: due < addDaysIso(TODAY, -45) ? 1080000 : 0, paidAt: due < addDaysIso(TODAY, -45) ? due : undefined, due, evidence: due < addDaysIso(TODAY, -45) ? 'UNC-PL-' + String(index + 1).padStart(3, '0') : '' }],
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

/** Demo: A Mẹt Quán's Ads project is billed inside the Website contract (HĐ-2026-006). */
export const SHARED_CONTRACT: Record<string, string> = { 'project-amet-ads': 'project-6' }
