import { contractEnd, TODAY } from '../lib/format'
import type { Contract, Payment, Project } from '../store/types'
import { COM_TAM_TAI_ID, DRIVE_FOLDER } from './projects'

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

export function primaryContract(contracts: Contract[], projectId: string): Contract | undefined {
  return contracts.find((row) => row.projectId === projectId && row.isPrimary && row.status !== 'Đã hủy')
}

/** Project's contract code and cycle total always come from its primary contract. */
export function syncProjectContract(project: Project, contracts: Contract[]): void {
  const primary = primaryContract(contracts, project.id)
  project.contractCode = primary ? primary.code : ''
  project.total = primary ? primary.cycles : 0
}

export function seedContracts(projects: Project[]): Contract[] {
  const records: Contract[] = []
  projects.forEach((project, index) => {
    if (project.state === 'draft') return
    const cycles = project.total || (index % 4 === 0 ? 3 : 6)
    const comTamTai = project.id === COM_TAM_TAI_ID
    const value = project.servicePrice || (index % 3 === 0 ? 9000000 : 2000000)
    const paid = index % 5 === 0 ? 0 : index % 4 === 0 ? 1000000 : project.servicePrice || 2000000
    const payments: Payment[] = comTamTai
      ? [
          { installment: 1, percent: 40, amount: 3200000, paid: 3200000, paidAt: '2026-05-13', due: '2026-05-13', evidence: 'UNC-0526-013' },
          { installment: 2, percent: 30, amount: 2400000, paid: 0, due: '2026-09-15', evidence: '' },
          { installment: 3, percent: 30, amount: 2400000, paid: 0, due: '2026-11-20', evidence: '' },
        ]
      : [{ installment: 1, percent: 100, amount: value, paid, paidAt: paid ? '2026-09-10' : '', due: '2026-09-25', evidence: paid ? 'UNC-2026-' + String(index + 1).padStart(3, '0') : '' }]
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
      start: comTamTai ? '2026-05-13' : '2026-09-01',
      end: comTamTai ? '20.11.2026' : contractEnd('2026-09-01', cycles),
      value,
      paid: totalPaid(payments),
      payments,
      status: comTamTai ? 'Hiệu lực' : index % 13 === 0 ? 'Kết thúc' : 'Hiệu lực',
      evidence: comTamTai ? DRIVE_FOLDER : '',
      folderUrl: comTamTai ? DRIVE_FOLDER : '',
      activity: [comTamTai ? 'Đã tạo hợp đồng, lịch 3 đợt thanh toán 40/30/30' : 'Đã tạo từ dữ liệu mẫu'],
    })
    if (index % 11 === 3) {
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
        start: '2026-09-15',
        end: '14.10.2026',
        value: 1000000,
        paid: 0,
        payments: [{ installment: 1, percent: 100, amount: 1000000, paid: 0, due: '2026-09-25', evidence: '' }],
        status: 'Hiệu lực',
        evidence: '',
        folderUrl: '',
        activity: ['Phụ lục bổ sung phạm vi'],
      })
    }
    syncProjectContract(project, records)
  })
  return records
}
