import { useState } from 'react'
import { useApp } from '../../app/context'
import { paymentMetrics, paymentState, paymentTone, syncProjectContract, totalPaid } from '../../data/contracts'
import { contractEnd, formatDate, money, parseInput, TODAY } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { update, useData } from '../../store/store'
import type { Contract, ContractStatus, Payment } from '../../store/types'
import { field } from '../../lib/form'
import { Modal } from '../../ui/Modal'

interface PlanRow {
  key: number
  percent: number
  due: string
}

let rowKey = 0

/** Create or edit a contract. `preferredProjectId` comes from the project's Cổng khởi động. */
export function ContractFormModal({ contractId, preferredProjectId }: { contractId?: string; preferredProjectId?: string }) {
  const { closeModal, toast } = useApp()
  const { projects, contracts } = useData()
  const row = contracts.find((item) => item.id === contractId)
  const [projectId, setProjectId] = useState(preferredProjectId ?? row?.projectId ?? projects[0]?.id ?? '')
  const project = projects.find((item) => item.id === projectId)
  const [value, setValue] = useState<number>(row ? row.value : project?.servicePrice ?? 0)
  const [plan, setPlan] = useState<PlanRow[]>(() =>
    (row?.payments.length ? row.payments : [{ percent: 100, due: '' }]).map((payment) => ({ key: rowKey++, percent: payment.percent, due: payment.due })),
  )
  const fromOnboarding = !row && Boolean(preferredProjectId)
  const total = plan.reduce((sum, item) => sum + (Number(item.percent) || 0), 0)
  const complete = plan.every((item) => item.percent && item.due)
  const setPlanRow = (key: number, patch: Partial<PlanRow>) => setPlan((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))

  const save = (form: HTMLFormElement) => {
    const target = projects.find((item) => item.id === field(form, 'project'))
    if (!target) return
    if (fromOnboarding && !field(form, 'evidence')) { toast('Bổ sung link file hợp đồng đã ký trên Drive trước khi lưu.'); return }
    if (!(value > 0) || !complete || total !== 100) { toast('Kiểm tra lịch thanh toán: đủ hạn và tổng tỷ lệ phải là 100%.'); return }
    update((draft) => {
      const existing = row && draft.contracts.find((item) => item.id === row.id)
      const current: Contract = existing ?? {
        id: 'contract-' + Date.now(), code: '', projectId: '', customer: '', project: '', type: 'Hợp đồng chính', isPrimary: true, service: '', scope: '',
        cycles: 1, start: '', end: '', value: 0, paid: 0, payments: [], status: 'Nháp', evidence: '', folderUrl: '', activity: [],
      }
      const previousProjectId = current.projectId
      const cycles = Number(field(form, 'cycles'))
      // Keep money already collected on each installment when the schedule is edited.
      const payments: Payment[] = plan.map((item, index) => {
        const amount = Math.round((value * item.percent) / 100)
        const before = current.payments[index]
        return { installment: index + 1, percent: item.percent, amount, due: item.due, paid: Math.min(before?.paid ?? 0, amount), paidAt: before?.paidAt, evidence: before?.evidence, driveLink: before?.driveLink }
      })
      Object.assign(current, {
        projectId: target.id,
        customer: target.customer,
        project: target.customer,
        type: field(form, 'type') as Contract['type'],
        isPrimary: field(form, 'type') === 'Hợp đồng chính',
        code: field(form, 'code').toUpperCase(),
        cycles,
        start: field(form, 'start'),
        end: contractEnd(field(form, 'start'), cycles),
        value,
        payments,
        paid: totalPaid(payments),
        status: field(form, 'status') as ContractStatus,
        evidence: field(form, 'evidence'),
        folderUrl: field(form, 'folderUrl'),
        service: target.service,
        scope: target.serviceScope,
      })
      if (current.isPrimary && current.status === 'Hiệu lực') {
        draft.contracts.forEach((item) => { if (item.projectId === target.id && item.id !== current.id && item.isPrimary) item.isPrimary = false })
      }
      current.activity.unshift('Đã cập nhật thông tin hợp đồng')
      if (!existing) draft.contracts.unshift(current)
      draft.projects.forEach((item) => { if (item.id === target.id || item.id === previousProjectId) syncProjectContract(item, draft.contracts) })
    })
    closeModal()
    toast('Đã lưu hợp đồng.')
  }

  return (
    <Modal title={row ? 'Sửa hợp đồng' : 'Tạo hợp đồng'} className="contract-modal" onSubmit={save}>
      <div className="form">
        {project && (
          <div className="customer-data-rules">
            <b>{project.customer} · Account {project.owner}</b>
            <p>Gói dịch vụ: {project.service || 'Chưa có dịch vụ áp dụng'}. Giá trị được điền theo snapshot dự án; kiểm tra lại theo HĐ đã ký.</p>
          </div>
        )}
        <label className="field">Dự án
          <select
            name="project"
            value={projectId}
            onChange={(event) => {
              setProjectId(event.target.value)
              if (!row) setValue(projects.find((item) => item.id === event.target.value)?.servicePrice ?? 0)
            }}
          >
            {projects.map((item) => <option key={item.id} value={item.id}>{item.customer} · {item.service}</option>)}
          </select>
        </label>
        <label className="field">Loại liên kết
          <select name="type" defaultValue={row ? row.type : 'Hợp đồng chính'}><option>Hợp đồng chính</option><option>Phụ lục</option></select>
        </label>
        <label className="field">Mã hợp đồng<input name="code" required defaultValue={row ? row.code : fromOnboarding ? 'HĐ-2026-' + (project?.code ?? '').slice(-3) : 'HĐ-2026-'} /></label>
        <label className="field">Số chu kỳ theo hợp đồng<input name="cycles" type="number" min="1" required defaultValue={row ? row.cycles : 1} /></label>
        <label className="field">Ngày bắt đầu hợp đồng<input name="start" type="date" required defaultValue={row ? row.start : '2026-10-01'} /></label>
        <label className="field">Giá trị hợp đồng<input name="value" type="number" min="0" required value={value} onChange={(event) => setValue(Number(event.target.value))} /></label>
        <label className="field">Trạng thái
          <select name="status" defaultValue={row ? row.status : fromOnboarding ? 'Hiệu lực' : 'Nháp'}><option>Nháp</option><option>Hiệu lực</option><option>Kết thúc</option><option>Đã hủy</option></select>
        </label>
        <label className="field">Link file HĐ đã ký trên Drive<input name="evidence" type="url" required placeholder="https://drive.google.com/..." defaultValue={row?.evidence} /></label>
        <label className="field">Folder hợp đồng trên Drive <small>(khuyến nghị)</small><input name="folderUrl" type="url" placeholder="https://drive.google.com/drive/folders/..." defaultValue={row?.folderUrl} /></label>

        <section className="onboarding-payment-plan">
          <div className="onboarding-payment-plan-head">
            <div><b>Lịch thanh toán</b><small>Nhập theo điều khoản HĐ; không tự suy ra từ số chu kỳ.</small></div>
            <span className={total !== 100 || !complete ? 'invalid' : ''}>{(complete ? '' : 'Chưa đủ lịch · ') + 'Tổng ' + total + '% · ' + money(value)}</span>
          </div>
          <div>
            {plan.map((item, index) => (
              <div className="onboarding-payment-row" key={item.key}>
                <span className="onboarding-payment-index">Đợt {index + 1}</span>
                <label className="onboarding-payment-field">
                  <span>Tỷ lệ</span>
                  <input type="number" min="1" max="100" step="1" value={item.percent} onChange={(event) => setPlanRow(item.key, { percent: Number(event.target.value) })} />
                  <small>% giá trị HĐ</small>
                </label>
                <label className="onboarding-payment-field">
                  <span>Hạn thanh toán</span>
                  <input type="date" value={item.due} onChange={(event) => setPlanRow(item.key, { due: event.target.value })} />
                </label>
                <strong>{money(Math.round((value * (Number(item.percent) || 0)) / 100))}</strong>
                <button
                  className="onboarding-payment-remove"
                  type="button"
                  aria-label="Xóa đợt thanh toán"
                  disabled={plan.length === 1}
                  onClick={() => setPlan((current) => current.filter((entry) => entry.key !== item.key))}
                >×</button>
              </div>
            ))}
          </div>
          <button className="secondary onboarding-add-payment" type="button" onClick={() => setPlan((current) => [...current, { key: rowKey++, percent: 0, due: '' }])}>
            <Icon name="plus" /> Thêm đợt thanh toán
          </button>
        </section>

        <div className="customer-data-rules"><p>Ngày kết thúc dự kiến tự tính từ ngày bắt đầu và số chu kỳ. Chỉ một hợp đồng chính hiệu lực trên mỗi dự án.</p></div>
        <div className="form-actions">
          <button className="secondary" type="button" onClick={closeModal}>Hủy</button>
          <button className="primary">Lưu hợp đồng</button>
        </div>
      </div>
    </Modal>
  )
}

export function ContractDetailModal({ contractId }: { contractId: string }) {
  const { toast, showModal } = useApp()
  const row = useData().contracts.find((item) => item.id === contractId)
  if (!row) return null
  const metrics = paymentMetrics(row)
  const debt = metrics.remaining
  const unpaid = row.payments.filter((payment) => payment.paid < payment.amount)

  const record = (form: HTMLFormElement) => {
    const payment = row.payments.find((entry) => String(entry.installment) === field(form, 'installment'))
    const amount = Number(field(form, 'payment') || 0)
    const remaining = payment ? Math.max(0, payment.amount - payment.paid) : 0
    if (!payment || !amount || amount > remaining) { toast('Kiểm tra số tiền thực thu của đợt đã chọn.'); return }
    const evidence = field(form, 'paymentEvidence')
    if (!evidence) { toast('Cần mã chứng từ trước khi ghi nhận.'); return }
    update((draft) => {
      const contract = draft.contracts.find((item) => item.id === row.id)
      const target = contract?.payments.find((entry) => entry.installment === payment.installment)
      if (!contract || !target) return
      target.paid += amount
      target.paidAt = field(form, 'paidAt')
      target.evidence = evidence
      target.driveLink = field(form, 'paymentDrive')
      contract.paid = totalPaid(contract.payments)
      contract.activity.unshift('Đã ghi nhận thu ' + money(amount) + ' · Đợt ' + target.installment + ' · ' + evidence)
    })
    form.reset()
    toast('Đã ghi nhận khoản thu.')
  }

  return (
    <Modal title={row.code} className="contract-modal" onSubmit={record}>
      <div className="form">
        <div className="contract-detail-meta">
          <div><span>Khách hàng</span><b>{row.customer}</b></div>
          <div><span>Loại liên kết</span><b>{row.isPrimary ? 'Hợp đồng chính' : row.type}</b></div>
          <div><span>Thời hạn HĐ</span><b>{formatDate(parseInput(row.start))} – {row.end}</b></div>
        </div>
        <div className="customer-data-rules"><b>{row.service || 'Chưa có dịch vụ áp dụng'}</b><p>{row.scope || 'Chưa có phạm vi dịch vụ.'}</p></div>
        <div className="contract-money-grid">
          <div><span>Giá trị hợp đồng</span><b>{money(row.value)}</b></div>
          <div><span>Đã ghi nhận</span><b>{money(row.paid)}</b></div>
          <div><span>{metrics.overdue ? 'Công nợ quá hạn' : 'Phải thu còn lại'}</span><b className={metrics.overdue ? 'contract-debt' : ''}>{money(metrics.overdue || debt)}</b></div>
        </div>

        <section className="contract-payment-schedule">
          <div className="contract-schedule-head"><div><h3>Lịch thanh toán</h3><p>Chứng từ gắn theo từng đợt thu.</p></div><span>{row.payments.length} đợt</span></div>
          {row.payments.map((payment) => {
            const status = paymentState(payment)
            return (
              <article className="contract-payment-item" key={payment.installment}>
                <div className="contract-payment-step">Đợt {payment.installment}</div>
                <div><b>{money(payment.amount)}</b><span>Hạn {formatDate(parseInput(payment.due))}</span></div>
                <div><b>Đã thu {money(payment.paid)}</b><span>Còn {money(Math.max(0, payment.amount - payment.paid))}</span></div>
                <div>
                  <span className={'pill ' + paymentTone(status)}>{status}</span>
                  <small>{payment.evidence ? 'Mã: ' + payment.evidence : 'Chưa có mã chứng từ'}</small>
                </div>
              </article>
            )
          })}
        </section>

        <section className="contract-payment-form">
          <h3>Ghi nhận khoản thu</h3>
          <p>Chỉ dùng cho tiền đã thu thực tế. Mã chứng từ bắt buộc.</p>
          <label className="field">Đợt thanh toán
            <select name="installment" disabled={!debt}>
              {unpaid.map((payment) => <option key={payment.installment} value={payment.installment}>Đợt {payment.installment} · còn {money(payment.amount - payment.paid)}</option>)}
            </select>
          </label>
          <label className="field">Số tiền thực thu<input name="payment" type="number" min="1" disabled={!debt} placeholder="Nhập số tiền đã thu" /></label>
          <label className="field">Ngày thu<input name="paidAt" type="date" defaultValue={TODAY} disabled={!debt} /></label>
          <label className="field">Mã chứng từ<input name="paymentEvidence" required disabled={!debt} placeholder="Ví dụ: UNC-0926-018" autoComplete="off" /></label>
          <label className="field">Link chứng từ trên Drive <small>(khuyến nghị)</small><input name="paymentDrive" type="url" disabled={!debt} placeholder="https://drive.google.com/..." /></label>
          <div className="form-actions">
            <button className="secondary" type="button" onClick={() => showModal(<ContractFormModal contractId={row.id} />)}>Sửa hợp đồng</button>
            <button className="primary" disabled={!debt}>Ghi nhận thu</button>
          </div>
        </section>
      </div>
    </Modal>
  )
}
