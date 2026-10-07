import { useState } from 'react'
import { useApp } from '../../app/context'
import { cashReceived, paymentMetrics } from '../../data/contracts'
import { field } from '../../lib/form'
import { money, TODAY } from '../../lib/format'
import { inScope } from '../../lib/scope'
import { getData, update, useData } from '../../store/store'
import { Modal, Req } from '../../ui/Modal'
import { MoneyInput } from '../../ui/MoneyInput'

/** Kế toán confirms negotiated value; original schedule and invoice history stay intact. */
export function SettlementModal({ contractId }: { contractId: string }) {
  const { role, account, closeModal, toast } = useApp()
  const { contracts, projects } = useData()
  const row = contracts.find((item) => item.id === contractId)
  const [agreedValue, setAgreedValue] = useState(row?.value ?? 0)
  const project = projects.find((item) => item.id === row?.projectId)
  if (!row?.settlement || !project || !inScope(role, account, project)) return null
  const settlement = row.settlement
  const confirmed = settlement.status === 'confirmed'
  const metrics = paymentMetrics(row)
  const refund = metrics.refund > 0
  const balance = refund ? metrics.refund : metrics.remaining
  const save = (form: HTMLFormElement) => {
    const live = getData()
    const current = live.contracts.find((item) => item.id === contractId)
    const targetProject = live.projects.find((item) => item.id === current?.projectId)
    if (role !== 'accountant' || !targetProject || !inScope(role, account, targetProject) || !current?.settlement) { toast('Chỉ Kế toán được quyết toán hợp đồng có quyền truy cập.'); return }
    if (current.settlement.status !== settlement.status) { toast('Quyết toán đã thay đổi. Mở lại để kiểm tra.'); return }
    const evidence = field(form, 'evidence').trim()
    const date = field(form, 'date')
    if (!evidence || !date || date > TODAY) { toast('Cần ngày và chứng từ hợp lệ.'); return }
    if (!confirmed) {
      const due = field(form, 'due')
      if (!Number.isFinite(agreedValue) || agreedValue < 0 || !due || date < current.settlement.stoppedAt) { toast('Kiểm tra giá trị quyết toán, ngày xác nhận và hạn thu/hoàn.'); return }
      update((draft) => {
        const contract = draft.contracts.find((item) => item.id === contractId)!
        Object.assign(contract.settlement!, { status: 'confirmed', agreedValue, due, confirmedAt: date, evidence })
        contract.activity.unshift('Kế toán xác nhận quyết toán ' + money(agreedValue) + ' · ' + date + ' · ' + evidence)
      })
      toast('Đã xác nhận quyết toán. Lịch thu và hóa đơn gốc được giữ trong lịch sử.')
    } else {
      const amount = Number(field(form, 'amount'))
      const latest = paymentMetrics(current)
      const available = refund ? latest.refund : latest.remaining
      if (!Number.isFinite(amount) || amount <= 0 || amount > available || date < (current.settlement.confirmedAt ?? current.settlement.stoppedAt)) { toast('Kiểm tra số tiền và ngày thu/hoàn theo số dư quyết toán.'); return }
      update((draft) => {
        const contract = draft.contracts.find((item) => item.id === contractId)!
        contract.settlement!.transactions.push({ kind: refund ? 'refund' : 'receipt', amount, date, evidence })
        contract.activity.unshift('Quyết toán: ' + (refund ? 'hoàn ' : 'thu ') + money(amount) + ' · ' + date + ' · ' + evidence)
      })
      toast(refund ? 'Đã ghi nhận hoàn tiền.' : 'Đã ghi nhận thu quyết toán.')
    }
    closeModal()
  }
  return <Modal title={confirmed ? 'Thu / hoàn quyết toán · ' + row.code : 'Xác nhận quyết toán · ' + row.code} className="contract-modal" onSubmit={save}>
    <div className="form">
      <div className="customer-data-rules"><b>Dừng ngày {settlement.stoppedAt} · {settlement.reason}</b><p>Giá trị gốc {money(row.value)} · Thực thu sau hoàn {money(cashReceived(row))}. Kế toán xác nhận theo thỏa thuận với khách.</p></div>
      {!confirmed ? <>
        <label className="field">Tổng giá trị phải thanh toán sau quyết toán<Req /><MoneyInput value={agreedValue} onChange={setAgreedValue} required ariaLabel="Giá trị quyết toán" /></label>
        <p className="cd-note">{agreedValue >= cashReceived(row) ? 'Cần thu thêm ' + money(agreedValue - cashReceived(row)) : 'Cần hoàn khách ' + money(cashReceived(row) - agreedValue)}. Giá trị nhập đã gồm các khoản được hai bên thống nhất.</p>
        <label className="field">Hạn thu / hoàn<Req /><input name="due" type="date" required defaultValue={TODAY} /></label>
      </> : <>
        <p>{refund ? 'Cần hoàn khách ' : 'Cần thu thêm '}{money(balance)}</p>
        <label className="field">{refund ? 'Số tiền hoàn thực tế' : 'Số tiền thu thực tế'}<Req /><MoneyInput name="amount" defaultValue={balance} max={balance} required ariaLabel="Số tiền quyết toán thực tế" /></label>
      </>}
      <label className="field">{confirmed ? 'Ngày thu / hoàn' : 'Ngày xác nhận'}<Req /><input name="date" type="date" min={confirmed ? settlement.confirmedAt : settlement.stoppedAt} max={TODAY} defaultValue={TODAY} required /></label>
      <label className="field">Chứng từ / thỏa thuận<Req /><input name="evidence" required placeholder="Mã chứng từ hoặc link thỏa thuận" /></label>
      <div className="form-actions"><button type="button" className="secondary" onClick={closeModal}>Đóng</button>{role === 'accountant' && (!confirmed || balance > 0) && <button className="primary">{confirmed ? 'Ghi nhận ' + (refund ? 'hoàn tiền' : 'khoản thu') : 'Xác nhận quyết toán'}</button>}</div>
    </div>
  </Modal>
}
