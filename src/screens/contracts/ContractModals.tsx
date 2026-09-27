import { useState } from 'react'
import { useApp } from '../../app/context'
import { packageLabel } from '../../data/catalog'
import { contractTone, coversProject, paymentMetrics, paymentState, syncProjectContract, totalPaid } from '../../data/contracts'
import { runningCycle } from '../../lib/sop'
import { contractEnd, diffDays, money, shortDate, TODAY } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { update, useData } from '../../store/store'
import type { Contract, ContractStatus, Payment } from '../../store/types'
import { field } from '../../lib/form'
import { Modal, Req } from '../../ui/Modal'
import { MoneyInput } from '../../ui/MoneyInput'

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
  const { projects, contracts, packages, params } = useData()
  const row = contracts.find((item) => item.id === contractId)
  const [vat, setVat] = useState<number>(row?.vatRate ?? params.vatRate)
  const [projectId, setProjectId] = useState(preferredProjectId ?? row?.projectId ?? projects[0]?.id ?? '')
  const project = projects.find((item) => item.id === projectId)
  const [type, setType] = useState<Contract['type']>(row ? row.type : appendix ? 'Phụ lục' : 'Hợp đồng chính')
  const [extraIds, setExtraIds] = useState<string[]>(row?.extraProjectIds ?? [])
  const siblings = projects.filter((item) => project && item.customerId === project.customerId && item.id !== project.id && item.state !== 'stopped')
  const running = project ? runningCycle(project) : undefined
  const [newPackage, setNewPackage] = useState(row?.packageChange?.packageId ?? '')
  const [fromCycle, setFromCycle] = useState(row?.packageChange?.fromCycle ?? (running ? running.no + 1 : 1))
  const activePackages = packages.filter((item) => item.status === 'Đang áp dụng')
  const once = Boolean(project?.quota.once)
  const [cycles, setCycles] = useState<number>(row ? row.cycles : 1)
  // Suggested value: monthly price of every package in the contract × cycles + VAT.
  const monthly = [project, ...projects.filter((item) => extraIds.includes(item.id))].reduce((sum, item) => sum + (item?.servicePrice ?? 0), 0)
  const suggested = Math.round(monthly * (once ? 1 : cycles) * (1 + vat / 100))
  const [value, setValue] = useState<number>(row ? row.value : suggested)
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
        cycles: once ? 1 : cycles,
        start: field(form, 'start'),
        end: contractEnd(field(form, 'start'), once ? 1 : cycles),
        value,
        vatRate: vat,
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
    <Modal title={row ? 'Sửa hợp đồng' : 'Tạo hợp đồng'} className="contract-modal" onSubmit={save}>
      <div className="form">
        {row && row.status === 'Hiệu lực' && (
          <div className="customer-data-rules warn"><p>Hợp đồng đã hiệu lực. Đổi gói, số chu kỳ hoặc giá trị theo thỏa thuận mới thì làm <b>Phụ lục</b>; chỉ sửa ở đây khi nhập sai.</p></div>
        )}
        <label className="field">Dự án<Req />
          <select
            value={projectId}
            disabled={Boolean(row)}
            onChange={(event) => {
              setProjectId(event.target.value)
              const next = projects.find((item) => item.id === event.target.value)
              setExtraIds([])
              setValue(Math.round((next?.servicePrice ?? 0) * cycles * (1 + vat / 100)))
            }}
          >
            {projects.map((item) => <option key={item.id} value={item.id}>{item.customer} · {item.service}</option>)}
          </select>
          <input type="hidden" name="project" value={projectId} />
        </label>
        <label className="field">Loại<Req />
          <select value={type} disabled={Boolean(row)} onChange={(event) => setType(event.target.value as Contract['type'])}><option>Hợp đồng chính</option><option>Phụ lục</option></select>
          <input type="hidden" name="type" value={type} />
        </label>
        {type === 'Hợp đồng chính' && siblings.length > 0 && (
          <fieldset className="field">
            <legend>Gói khác ký chung hợp đồng này</legend>
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
            <small className="field-hint">Các dự án khác của cùng khách. Tick nếu hợp đồng này bao gồm cả gói đó: dùng chung giá trị và lịch thanh toán, mỗi gói vẫn theo dõi triển khai ở dự án riêng.</small>
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
        <label className="field">Số chu kỳ theo hợp đồng<Req /><input name="cycles" type="number" min="1" required value={once ? 1 : cycles} disabled={once} onChange={(event) => setCycles(Math.max(1, Number(event.target.value) || 1))} />{once && <small className="field-hint">Gói trả một lần: 1 lần bàn giao.</small>}</label>
        <label className="field">Ngày bắt đầu hợp đồng<Req /><input name="start" type="date" required defaultValue={row ? row.start : '2026-10-01'} /></label>
        <label className="field">VAT<Req />
          <span className="percent-input"><input type="number" min="0" max="20" step="1" required value={vat} onChange={(event) => setVat(Math.max(0, Number(event.target.value) || 0))} /><em>%</em></span>
        </label>
        <label className="field">Giá trị hợp đồng (gồm VAT)<Req />
          <MoneyInput value={value} onChange={setValue} required ariaLabel="Giá trị hợp đồng" />
          {monthly > 0 && suggested !== value && (
            <small className="field-hint">
              Theo gói: {money(monthly)} × {cycles} chu kỳ + VAT {vat}% = {money(suggested)}{' '}
              <button type="button" className="text-btn" onClick={() => setValue(suggested)}>Dùng số này</button>
            </small>
          )}
        </label>
        <label className="field">Trạng thái<Req />
          <select name="status" defaultValue={row ? row.status : 'Nháp'}><option>Nháp</option><option>Hiệu lực</option><option>Kết thúc</option><option>Đã hủy</option></select>
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

/**
 * Contract at a glance: status and term, money collected, one line per installment (evidence
 * under it), and the form to record money actually received.
 */
export function ContractDetailModal({ contractId }: { contractId: string }) {
  const { toast, showModal, role } = useApp()
  const canRecord = role === 'accountant'
  const { contracts, projects } = useData()
  const row = contracts.find((item) => item.id === contractId)
  const unpaid = row ? row.payments.filter((payment) => payment.paid < payment.amount) : []
  const [installment, setInstallment] = useState(String(unpaid[0]?.installment ?? ''))
  if (!row) return null
  const metrics = paymentMetrics(row)
  const paidPct = row.value ? Math.min(100, Math.round((row.paid / row.value) * 100)) : 0
  const selected = row.payments.find((payment) => String(payment.installment) === installment)
  const left = selected ? Math.max(0, selected.amount - selected.paid) : 0
  const project = projects.find((item) => item.id === row.projectId)
  const cycle = project ? project.cycles.length : 0
  const appendices = row.isPrimary ? contracts.filter((item) => !item.isPrimary && item.projectId === row.projectId && item.status !== 'Đã hủy') : []

  const record = (form: HTMLFormElement) => {
    const amount = Number(field(form, 'payment') || 0)
    if (!selected || !amount || amount > left) { toast('Kiểm tra số tiền thực thu của đợt đã chọn.'); return }
    const evidence = field(form, 'paymentEvidence')
    if (!evidence) { toast('Cần mã chứng từ trước khi ghi nhận.'); return }
    update((draft) => {
      const contract = draft.contracts.find((item) => item.id === row.id)
      const target = contract?.payments.find((entry) => entry.installment === selected.installment)
      if (!contract || !target) return
      target.paid += amount
      target.paidAt = field(form, 'paidAt')
      target.evidence = evidence
      target.driveLink = field(form, 'paymentDrive')
      contract.paid = totalPaid(contract.payments)
      contract.activity.unshift('Đã ghi nhận thu ' + money(amount) + ' · Đợt ' + target.installment + ' · ' + evidence)
      // A signed contract becomes effective with its first payment.
      if (contract.status === 'Nháp' && target.installment === 1) {
        contract.status = 'Hiệu lực'
        contract.activity.unshift('Hiệu lực từ khi thu đợt 1')
      }
      // Money on the first installment is the deposit: it clears the "Xác nhận cọc" launch gate.
      const project = draft.projects.find((item) => item.id === contract.projectId)
      if (project && target.installment === 1 && contract.isPrimary) {
        project.onboarding = { ...(project.onboarding ?? { financeVerified: false, financeRef: '', handoverReady: false, handoverLink: '', briefReady: false, briefLink: '', setupReady: false, workspaceLink: '', setupNote: '' }), financeVerified: true, financeRef: evidence }
      }
    })
    form.reset()
    toast('Đã ghi nhận khoản thu.')
  }

  return (
    <Modal title={row.code} className="contract-modal contract-detail" onSubmit={record}>
      <div className="form">
        <div className="cd-head">
          <span className={'pill ' + contractTone(row.status)}>{row.status}</span>
          <span>{row.isPrimary ? 'Hợp đồng chính' : row.type} · {row.customer}</span>
        </div>
        <dl className="cd-facts">
          <div><dt>Thời hạn</dt><dd>{shortDate(row.start)} – {row.end}</dd></div>
          <div><dt>Chu kỳ</dt><dd>{row.isPrimary ? cycle + ' / ' + row.cycles : row.cycles}</dd></div>
          <div><dt>Gói</dt><dd>{row.service || '—'}{row.vatRate !== undefined ? ' · VAT ' + row.vatRate + '%' : ''}</dd></div>
        </dl>

        <div className="contract-money">
          <span className="pace-bar" aria-hidden="true"><i className={metrics.overdue ? 'behind' : 'ahead'} style={{ width: paidPct + '%' }} /></span>
          <small>Đã thu <b>{money(row.paid)}</b> / {money(row.value)}{metrics.overdue ? <> · <b className="is-late">quá hạn {money(metrics.overdue)}</b></> : metrics.remaining ? ' · còn ' + money(metrics.remaining) : ''}</small>
        </div>

        <ol className="pay-list">
          {row.payments.map((payment) => {
            const paid = payment.paid >= payment.amount
            const late = !paid && payment.due < TODAY
            return (
              <li key={payment.installment} className={'pay-row' + (paid ? ' is-paid' : late ? ' is-late' : '')}>
                <i aria-hidden="true">{paid ? <Icon name="check" /> : late ? '!' : ''}</i>
                <b>Đợt {payment.installment} · {payment.percent}% · {money(payment.amount)}</b>
                <span className="pay-when">
                  {paid && payment.paidAt ? 'Thu ' + shortDate(payment.paidAt) : 'Hạn ' + shortDate(payment.due) + (late ? ' · quá ' + diffDays(payment.due, TODAY) + ' ngày' : '')}
                  {!paid && payment.paid > 0 && ' · đã thu ' + money(payment.paid)}
                  {payment.evidence && <small className="pay-evidence">{payment.evidence}{payment.driveLink && <> · <a href={payment.driveLink} target="_blank" rel="noreferrer">chứng từ</a></>}</small>}
                </span>
                <span className="sr-only">{paymentState(payment)}</span>
              </li>
            )
          })}
        </ol>

        {appendices.length > 0 && (
          <div className="contract-others">
            {appendices.map((item) => (
              <button key={item.id} type="button" className="contract-other" onClick={() => showModal(<ContractDetailModal contractId={item.id} />)}>
                <span>Phụ lục · <b>{item.code}</b></span><small>{money(item.value)} · {item.paid >= item.value ? 'đã thu đủ' : 'còn ' + money(item.value - item.paid)}</small><Icon name="chevron-right" />
              </button>
            ))}
          </div>
        )}

        {unpaid.length > 0 && !canRecord && <p className="cd-note">Kế toán ghi nhận khoản thu khi có chứng từ.</p>}

        {unpaid.length > 0 && canRecord && (
          <section className="cd-record">
            <h3>Ghi nhận khoản thu</h3>
            <div className="form-grid">
              <label className="field">Đợt
                <select name="installment" value={installment} onChange={(event) => setInstallment(event.target.value)}>
                  {unpaid.map((payment) => <option key={payment.installment} value={payment.installment}>Đợt {payment.installment} · còn {money(payment.amount - payment.paid)}</option>)}
                </select>
              </label>
              <label className="field">Số tiền thực thu<Req /><MoneyInput key={installment} name="payment" defaultValue={left} max={left} required ariaLabel="Số tiền thực thu" /></label>
            </div>
            <div className="form-grid">
              <label className="field">Ngày thu<input name="paidAt" type="date" defaultValue={TODAY} max={TODAY} /></label>
              <label className="field">Mã chứng từ<Req /><input name="paymentEvidence" required placeholder="UNC-0926-018" autoComplete="off" /></label>
            </div>
            <label className="field">Link chứng từ <small>(không bắt buộc)</small><input name="paymentDrive" type="url" placeholder="https://drive.google.com/..." /></label>
          </section>
        )}

        <div className="form-actions">
          <button className="secondary" type="button" onClick={() => showModal(<ContractFormModal contractId={row.id} />)}>Sửa hợp đồng</button>
          {unpaid.length > 0 && canRecord && <button className="primary">Ghi nhận thu</button>}
        </div>
      </div>
    </Modal>
  )
}
