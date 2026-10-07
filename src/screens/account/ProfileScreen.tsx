import { ROLES, useApp } from '../../app/context'
import { useData } from '../../store/store'
import { AccountModal } from './AccountModal'
import { canManageProjectAccess, inScope, projectGrant, sessionName } from '../../lib/scope'
import { projectLabel, projectTone } from '../projects/projectLogic'
import { ProjectAccessModal } from '../projects/ProjectAccessModal'

export function ProfileScreen() {
  const { role, account, toast, showModal, openLogin, openProject, go } = useApp()
  const { profile, projects } = useData()
  const roleInfo = ROLES[role]
  const visible = projects.filter((project) => inScope(role, account, project))
  const person = sessionName(role, account)
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
      <section className="panel profile-projects">
        <div className="panel-head"><div><h2>Dự án được phân quyền ({visible.length})</h2><p className="subline">{person} · quyền theo từng dự án. Giao việc không tự cấp quyền truy cập.</p></div></div>
        <div className="project-table-wrap">
          <table className="home-table profile-project-table">
            <thead><tr><th>Dự án</th><th>Trạng thái</th><th>Quyền của bạn</th><th /></tr></thead>
            <tbody>{visible.map((project) => {
              const grant = projectGrant(role, account, project)
              const permission = role === 'admin' ? 'Quản trị dự án và phân quyền' : role === 'partner' ? 'Xem công việc được giao' : role === 'accountant' ? 'Hợp đồng và khoản thu' : grant?.access === 'edit' ? 'Tham gia và chỉnh sửa' : 'Chỉ xem'
              return <tr key={project.id}>
                <td><b>{project.code} · {project.customer}</b><span className="content-sub">{project.service} · Account {project.owner}</span></td>
                <td><span className={'pill ' + projectTone(project)}>{projectLabel(project)}</span></td>
                <td>{permission}</td>
                <td><div className="payment-account-actions">
                  <button type="button" className="text-btn" onClick={() => role === 'partner' ? go('partnerProject') : role === 'accountant' ? go('contracts') : openProject(project.id)}>Mở</button>
                  {canManageProjectAccess(role, account, project) && <button type="button" className="text-btn" onClick={() => showModal(<ProjectAccessModal projectId={project.id} />)}>Phân quyền</button>}
                </div></td>
              </tr>
            })}{!visible.length && <tr><td colSpan={4} className="operations-empty">Bạn chưa được cấp quyền tham gia dự án nào.</td></tr>}</tbody>
          </table>
        </div>
      </section>
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
