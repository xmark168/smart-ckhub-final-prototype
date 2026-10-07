

import { useApp } from '../../app/context'
import { useData } from '../../store/store'
import { ProjectAccessModal } from '../projects/ProjectAccessModal'

export function AccessScreen() {
  const { showModal } = useApp()
  const { projects } = useData()
  const permissions: Array<[string, string, string]> = [
    ['Account / Pod Lead', 'Chỉ dự án có quyền tham gia; mức Chỉ xem hoặc Tham gia và chỉnh sửa. Account phụ trách quản lý thành viên dự án.', 'Theo quyền dự án'],
    ['Partner', 'Chỉ task/dự án được giao; brief, deadline, file, output, trạng thái.', 'Thực thi'],
    ['BODs', 'Tổng quan, rủi ro và hợp đồng/công nợ của các dự án được cấp quyền.', 'Xem theo dự án'],
    ['Kế toán', 'Hợp đồng, khoản thu và việc kế toán của các dự án được cấp quyền.', 'Theo quyền dự án'],
    ['Administrator', 'Quản trị hệ thống và cấp/thu hồi thành viên trên toàn bộ dự án.', 'Quản trị'],
  ]
  return (
    <section className="screen active" id="access">
      <div className="page-head"><div><h1>Phân quyền</h1><p>Scope theo collection/action, field whitelist và record được giao.</p></div></div>
      <section className="panel">
        {permissions.map(([role, scope, mode]) => (
          <div className="permission" key={role}><b>{role}</b><span>{scope}</span><em className="mode">{mode}</em></div>
        ))}
      </section>
      <section className="panel profile-projects">
        <div className="panel-head"><h2>Phân quyền từng dự án</h2></div>
        <div className="home-lines">{projects.map((project) => <button type="button" className="home-line" key={project.id} onClick={() => showModal(<ProjectAccessModal projectId={project.id} />)}><span><b>{project.code} · {project.customer}</b><small>{project.service} · {project.members?.length ?? 0} thành viên</small></span><em>Quản lý quyền ›</em></button>)}</div>
      </section>
      <div className="alert" style={{ marginTop: 16 }}><b>Partner không xem dữ liệu ngoài scope</b><small>Không có hợp đồng, giá bán, chi phí, task Partner khác hoặc dữ liệu khách/dự án ngoài record được giao.</small></div>
    </section>
  )
}
