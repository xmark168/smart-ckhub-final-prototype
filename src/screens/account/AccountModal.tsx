import { useApp } from '../../app/context'
import { field } from '../../lib/form'
import { update, useData } from '../../store/store'
import { Modal } from '../../ui/Modal'

type AccountAction = 'profile' | 'password' | 'twofactor'

const TITLES: Record<AccountAction, string> = { profile: 'Sửa hồ sơ', password: 'Đổi mật khẩu', twofactor: 'Thiết lập xác thực hai bước' }

export function AccountModal({ action }: { action: AccountAction }) {
  const { closeModal, toast } = useApp()
  const { profile } = useData()
  return (
    <Modal
      title={TITLES[action]}
      backdropClassName=""
      onSubmit={(form) => {
        if (action === 'profile') {
          update((draft) => {
            draft.profile = { name: field(form, 'displayName') || 'Tài khoản mô phỏng', email: field(form, 'email'), phone: field(form, 'phone') }
          })
          toast('Đã cập nhật hồ sơ mô phỏng.')
        } else if (action === 'password') {
          if (field(form, 'newPassword') !== field(form, 'confirmPassword')) { toast('Xác nhận mật khẩu mới chưa khớp.'); return }
          toast('Đã đổi mật khẩu mô phỏng.')
        } else {
          toast('Đã bật xác thực hai bước mô phỏng.')
        }
        closeModal()
      }}
    >
      <div className="form">
        {action === 'profile' && (
          <div className="form-grid">
            <label className="field">Tên hiển thị<input name="displayName" defaultValue={profile.name} required /></label>
            <label className="field">Email đăng nhập<input name="email" type="email" defaultValue={profile.email} required /></label>
            <label className="field">Số điện thoại<input name="phone" defaultValue={profile.phone} placeholder="Nhập số điện thoại" /></label>
          </div>
        )}
        {action === 'password' && (
          <>
            <label className="field">Mật khẩu hiện tại<input name="currentPassword" type="password" required /></label>
            <div className="form-grid">
              <label className="field">Mật khẩu mới<input name="newPassword" type="password" minLength={8} required /></label>
              <label className="field">Xác nhận mật khẩu mới<input name="confirmPassword" type="password" minLength={8} required /></label>
            </div>
            <small>Mật khẩu mới có tối thiểu 8 ký tự.</small>
          </>
        )}
        {action === 'twofactor' && (
          <>
            <label className="field">Phương thức<select name="method"><option>Ứng dụng xác thực</option><option>Email</option></select></label>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }}>Sau khi lưu, hệ thống sẽ hiển thị mã xác minh cho lần đăng nhập tiếp theo.</p>
          </>
        )}
      </div>
      <div className="form-actions">
        <button type="button" className="secondary" onClick={closeModal}>Hủy</button>
        <button className="primary" type="submit">Lưu thay đổi</button>
      </div>
    </Modal>
  )
}
