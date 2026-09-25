import { ROLES, useApp } from '../app/context'
import { update, useData } from '../store/store'
import { field } from '../lib/form'
import { Modal } from '../ui/Modal'

type AccountAction = 'profile' | 'password' | 'twofactor'

const TITLES: Record<AccountAction, string> = { profile: 'Sửa hồ sơ', password: 'Đổi mật khẩu', twofactor: 'Thiết lập xác thực hai bước' }

function AccountModal({ action }: { action: AccountAction }) {
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

export function ProfileScreen() {
  const { role, toast, showModal, openLogin } = useApp()
  const { profile } = useData()
  const roleInfo = ROLES[role]
  return (
    <section className="screen active" id="profile">
      <div className="page-head">
        <div><h1>Hồ sơ người dùng</h1><p>Thông tin tài khoản và bảo mật truy cập.</p></div>
        <button className="secondary" onClick={() => showModal(<AccountModal action="profile" />)}>Sửa hồ sơ</button>
      </div>
      <div className="profile-grid">
        <section className="panel profile-card">
          <i className="avatar">{roleInfo.initial}</i>
          <h2>{profile.name}</h2>
          <p>{roleInfo.label}</p>
          <button className="secondary" style={{ marginTop: 16 }} onClick={() => toast('Ảnh đại diện sẽ được cập nhật sau khi chọn tệp.')}>Đổi ảnh đại diện</button>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Thông tin cơ bản</h2><span className="mode">Đang hoạt động</span></div>
          <div className="profile-meta">
            <div className="review"><div><b>Email đăng nhập</b><p>{profile.email}</p></div></div>
            <div className="review"><div><b>Số điện thoại</b><p>{profile.phone || 'Chưa cập nhật'}</p></div></div>
            <div className="review"><div><b>Vai trò hiện tại</b><p>{roleInfo.label}</p></div></div>
          </div>
        </section>
      </div>
      <div className="layout" style={{ marginTop: 16 }}>
        <section className="panel">
          <div className="panel-head"><h2>Bảo mật</h2></div>
          <div className="setting-list">
            <div className="setting-row"><div><b>Mật khẩu</b><p>Đổi định kỳ để bảo vệ tài khoản.</p></div><button className="secondary" onClick={() => showModal(<AccountModal action="password" />)}>Đổi mật khẩu</button></div>
            <div className="setting-row"><div><b>Xác thực hai bước</b><p>Tăng lớp bảo vệ khi đăng nhập.</p></div><button className="secondary" onClick={() => showModal(<AccountModal action="twofactor" />)}>Thiết lập</button></div>
          </div>
        </section>
        <aside className="panel">
          <div className="panel-head"><h2>Phiên đăng nhập</h2></div>
          <div className="checklist"><div className="check done"><i>✓</i>Thiết bị hiện tại<br /><small>Đang hoạt động</small></div></div>
          <button className="secondary" style={{ marginTop: 15, width: '100%' }} onClick={() => openLogin(true)}>Đăng xuất</button>
        </aside>
      </div>
    </section>
  )
}
