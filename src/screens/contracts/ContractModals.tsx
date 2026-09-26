import { useState } from 'react'
import { useApp } from '../../app/context'
import { packageLabel } from '../../data/catalog'
import { coversProject, paymentMetrics, paymentState, paymentTone, syncProjectContract, totalPaid } from '../../data/contracts'
import { runningCycle } from '../../lib/sop'
import { contractEnd, formatDate, money, parseInput, TODAY } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { update, useData } from '../../store/store'
import type { Contract, ContractStatus, Payment } from '../../store/types'
import { field } from '../../lib/form'
import { Modal, Req } from '../../ui/Modal'

interface PlanRow {
  key: number
  percent: number
  due: string
}

let rowKey = 0

/** Create or edit a contract. `preferredProjectId` comes from the project's Cổng khởi động. */
/** `appendix` opens a new Phụ lục (e.g. to change the package) for `preferredProjectId`. */
export function ContractFormModal({ contractId, preferredProjectId, appendix = false }: { contractId?: string; preferredProjectId?: string; appendix?: boolean }) {
  const { closeModal, toast } = useApp()
  const { projects, contracts, packages } = useData()
  const row = contracts.find((item) => item.id === contractId)
  const [projectId, setProjectId] = useState(preferredProjectId ?? row?.projectId ?? projects[0]?.id ?? '')
  const project = projects.find((item) => item.id === projectId)
  const [type, setType] = useState<Contract['type']>(row ? row.type : appendix ? 'Phụ lục' : 'Hợp đồng chính')
  const [extraIds, setExtraIds] = useState<string[]>(row?.extraProjectIds ?? [])
  const siblings = projects.filter((item) => project && item.customerId === project.customerId && item.id !== project.id && item.state !== 'stopped')
  const running = project ? runningCycle(project) : undefined
  const [newPackage, setNewPackage] = useState(row?.packageChange?.packageId ?? '')
  const [fromCycle, setFromCycle] = useState(row?.packageChange?.fromCycle ?? (running ? running.no + 1 : 1))
  const activePackages = packages.filter((item) => item.status === 'Đang áp dụng')
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
        service: [target, ...projects.filter((item) => extraIds.includes(item.id))].map((item) => item.service).join(' + '),
        scope: target.serviceScope,
        extraProjectIds: type === 'Hợp đồng chính' && extraIds.length ? extraIds : undefined,
        packageChange: type === 'Phụ lục' && newPackage ? { projectId: target.id, packageId: newPackage, fromCycle } : undefined,
      })
      // Phụ lục đổi gói: apply now if it starts with the running cycle, otherwise when that cycle opens.
      const pkg = type === 'Phụ lục' && newPackage ? draft.packages.find((item) => item.id === newPackage) : undefined
      const project = draft.projects.find((item) => item.id === target.id)
      if (pkg && project) {
        const current = runningCycle(project)
        const label = packageLabel(pkg)
        if (!current || fromCycle <= current.no) {
          Object.assign(project, { servicePackageId: pkg.id, service: label, serviceScope: pkg.scope, servicePrice: pkg.price, quota: { ...pkg.quota }, pendingPackage: undefined })
          project.activities = [{ icon: 'package-check', title: 'Đổi gói theo ' + (field(form, 'code').toUpperCase() || 'phụ lục'), detail: label + ' · áp dụng ngay' }, ...project.activities].slice(0, 12)
        } else {
          project.pendingPackage = { packageId: pkg.id, fromCycle, source: field(form, 'code').toUpperCase() || 'phụ lục' }
          project.activities = [{ icon: 'package-check', title: 'Đã ký phụ lục đổi gói', detail: label + ' · áp dụng từ chu kỳ ' + fromCycle }, ...project.activities].slice(0, 12)
        }
      }
      if (current.isPrimary && current.status === 'Hiệu lực') {
        draft.contracts.forEach((item) => { if (coversProject(item, target.id) && item.id !== current.id && item.isPrimary) item.isPrimary = false })
      }
      current.activity.unshift('Đã cập nhật thông tin hợp đồng')
      if (!existing) draft.contracts.unshift(current)
      draft.projects.forEach((item) => { if (item.id === target.id || item.id === previousProjectId || extraIds.includes(item.id) || row?.extraProjectIds?.includes(item.id)) syncProjectContract(item, draft.contracts) })
    })
    closeModal()
    toast('Đã lưu hợp đồng.')
  }

  return (
    <Modal title={row ? 'Sửa hợp đồng' : 'Tạo hợp đồng'} className="contract-modal" onSubmit={save} help={<><p>Ngày kết thúc dự kiến tự tính từ ngày bắt đầu và số chu kỳ. Chỉ một hợp đồng chính hiệu lực trên mỗi dự án.</p><p>Link file và folder Drive không bắt buộc; bổ sung khi có.</p></>}>
      <div className="form">
        {project && (
          <div className="customer-data-rules">
            <b>{project.customer} · Account {project.owner}</b>
            <p>Gói dịch vụ: {project.service || 'Chưa có dịch vụ áp dụng'}. Giá trị được điền theo snapshot dự án; kiểm tra lại theo HĐ đã ký.</p>
          </div>
        )}
        <label className="field">Dự án<Req />
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
        <label className="field">Loại liên kết<Req />
          <select name="type" value={type} onChange={(event) => setType(event.target.value as Contract['type'])}><option>Hợp đồng chính</option><option>Phụ lục</option></select>
        </label>
        {type === 'Hợp đồng chính' && siblings.length > 0 && (
          <fieldset className="field">
            <legend>Gói khác trong cùng hợp đồng</legend>
            {siblings.map((item) => (
              <label className="filter-check" key={item.id}>
                <input
                  type="checkbox"
                  checked={extraIds.includes(item.id)}
                  onChange={(event) => setExtraIds((ids) => (event.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id)))}
                />{' '}
                {item.code} · {item.service}
              </label>
            ))}
            <small className="field-hint">Một hợp đồng có thể gồm nhiều gói; mỗi gói theo dõi triển khai ở dự án riêng.</small>
          </fieldset>
        )}
        {type === 'Phụ lục' && (
          <fieldset className="field">
            <legend>Đổi gói dịch vụ (tuỳ chọn)</legend>
            <label className="field">Gói mới
              <select value={newPackage} onChange={(event) => setNewPackage(event.target.value)}>
                <option value="">Không đổi gói</option>
                {activePackages.map((item) => <option key={item.id} value={item.id}>{packageLabel(item)}{item.id === project?.servicePackageId ? ' (đang dùng)' : ''}</option>)}
              </select>
            </label>
            {newPackage && (
              <label className="field">Áp dụng từ
                <select value={fromCycle} onChange={(event) => setFromCycle(Number(event.target.value))}>
                  {running && <option value={running.no}>Chu kỳ {running.no} (đang chạy)</option>}
                  <option value={running ? running.no + 1 : 1}>Chu kỳ {running ? running.no + 1 : 1} (chu kỳ tiếp theo)</option>
                </select>
              </label>
            )}
            <small className="field-hint">Chu kỳ đã chạy giữ nguyên định mức cũ. Định mức mới lấy theo gói trong danh mục.</small>
          </fieldset>
        )}
        <label className="field">Mã hợp đồng<Req /><input name="code" required defaultValue={row ? row.code : fromOnboarding ? 'HĐ-2026-' + (project?.code ?? '').slice(-3) : 'HĐ-2026-'} /></label>
        <label className="field">Số chu kỳ theo hợp đồng<Req /><input name="cycles" type="number" min="1" required defaultValue={row ? row.cycles : 1} /></label>
        <label className="field">Ngày bắt đầu hợp đồng<Req /><input name="start" type="date" required defaultValue={row ? row.start : '2026-10-01'} /></label>
        <label className="field">Giá trị hợp đồng<Req /><input name="value" type="number" min="0" required value={value} onChange={(event) => setValue(Number(event.target.value))} /></label>
        <label className="field">Trạng thái<Req />
          <select name="status" defaultValue={row ? row.status : fromOnboarding ? 'Hiệu lực' : 'Nháp'}><option>Nháp</option><option>Hiệu lực</option><option>Kết thúc</option><option>Đã hủy</option></select>
        </label>
        <label className="field">Link file HĐ đã ký trên Drive <small>(không bắt buộc)</small><input name="evidence" type="url" placeholder="https://drive.google.com/..." defaultValue={row?.evidence} /></label>
        <label className="field">Folder hợp đồng trên Drive <small>(không bắt buộc)</small><input name="folderUrl" type="url" placeholder="https://drive.google.com/drive/folders/..." defaultValue={row?.folderUrl} /></label>

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
