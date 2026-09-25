import { ROLES, useApp } from '../../app/context'
import { useData } from '../../store/store'
import { AccountModal } from './AccountModal'

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
