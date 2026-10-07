import { useState } from 'react'
import { useApp } from '../../app/context'
import { field } from '../../lib/form'
import { update, useData } from '../../store/store'
import { Modal, Req } from '../../ui/Modal'

export function PaymentAccountsModal() {
  const { role, toast, closeModal } = useApp()
  const { paymentAccounts, contracts } = useData()
  const editable = role === 'accountant' || role === 'admin'
  // null means no editor; empty string creates a new account.
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = paymentAccounts.find((item) => item.id === editingId)

  const save = (form: HTMLFormElement) => {
    if (!editable || editingId === null) return
    const bank = field(form, 'bank').trim()
    const accountNumber = field(form, 'accountNumber').trim()
    const accountHolder = field(form, 'accountHolder').trim()
    if (!bank || !accountNumber || !accountHolder) {
      toast('Nhập đủ ngân hàng, số tài khoản và chủ tài khoản.'); return
    }
    update((draft) => {
      const existing = draft.paymentAccounts.find((item) => item.id === editingId)
      if (existing) Object.assign(existing, { bank, accountNumber, accountHolder })
      else if (editingId === '') draft.paymentAccounts.push({ id: 'payment-account-' + crypto.randomUUID(), bank, accountNumber, accountHolder, active: true })
    })
    setEditingId(null)
    toast('Đã lưu tài khoản nhận thanh toán.')
  }

  const toggle = (id: string) => {
    if (!editable) return
    update((draft) => {
      const account = draft.paymentAccounts.find((item) => item.id === id)
      if (account) account.active = !account.active
    })
    toast('Đã cập nhật trạng thái tài khoản.')
  }

  return (
    <Modal title="Tài khoản nhận thanh toán" className="contract-modal" onSubmit={editable && editingId !== null ? save : undefined}>
      <div className="form">
        <p className="cd-note">Danh mục dùng chung. Sửa thông tin tài khoản cập nhật mọi hợp đồng đang liên kết. Ngừng dùng vẫn giữ thông tin trên hợp đồng cũ.</p>
        {!paymentAccounts.length && <p className="empty-copy">Chưa có tài khoản nhận thanh toán.</p>}
        <div className="payment-account-list">
          {paymentAccounts.map((item) => (
            <section className="payment-account-card" key={item.id}>
              <b>{item.bank} · {item.accountNumber}</b>
              <span>{item.accountHolder}</span>
              <small>{item.active ? 'Đang dùng' : 'Ngừng dùng'} · {contracts.filter((contract) => contract.paymentAccountId === item.id).length} hợp đồng</small>
              {editable && <div className="payment-account-actions">
                <button type="button" className="text-btn" onClick={() => setEditingId(item.id)}>Sửa</button>
                <button type="button" className="text-btn" onClick={() => toggle(item.id)}>{item.active ? 'Ngừng sử dụng' : 'Dùng lại'}</button>
              </div>}
            </section>
          ))}
        </div>
        {editable && editingId === null && <button type="button" className="secondary" onClick={() => setEditingId('')}>Thêm tài khoản</button>}
        {editable && editingId !== null && <section key={editingId} className="payment-account-editor">
          <h3>{editing ? 'Sửa tài khoản' : 'Thêm tài khoản'}</h3>
          <label className="field">Ngân hàng<Req /><input name="bank" required defaultValue={editing?.bank ?? ''} /></label>
          <label className="field">Số tài khoản<Req /><input name="accountNumber" type="text" required defaultValue={editing?.accountNumber ?? ''} /></label>
          <label className="field">Chủ tài khoản<Req /><input name="accountHolder" required defaultValue={editing?.accountHolder ?? ''} /></label>
          <div className="form-actions">
            <button type="button" className="secondary" onClick={() => setEditingId(null)}>Hủy</button>
            <button className="primary">Lưu tài khoản</button>
          </div>
        </section>}
        {!editable && <p className="cd-note">Kế toán và Administrator quản lý danh mục tài khoản.</p>}
        <div className="form-actions"><button type="button" className="secondary" onClick={closeModal}>Đóng</button></div>
      </div>
    </Modal>
  )
}
