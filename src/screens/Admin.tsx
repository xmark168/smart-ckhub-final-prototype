import { useApp, type ScreenId } from '../app/context'

const CAPABILITIES: Array<[string, string, string, ScreenId]> = [
  ['1', 'Khách hàng', 'Hồ sơ, đầu mối, cam kết, Account scope.', 'customers'],
  ['2', 'Dự án', 'Timeline chu kỳ, rủi ro, phân bổ.', 'projects'],
  ['3', 'Bài đăng', 'Kế hoạch, script, version, ngày air.', 'posts'],
  ['4', 'Lịch shooting', 'Partner, input, slot, ảnh hưởng đổi lịch.', 'shootings'],
  ['5', 'Công việc', 'Owner, deadline, blocked, output.', 'tasks'],
]

export function AdminDashboard() {
  const { go } = useApp()
  return (
    <section className="screen active" id="poc">
      <div className="page-head"><div><h1>Dashboard quản trị</h1><p>Quản lý quyền, dữ liệu và cấu hình hệ thống.</p></div></div>
      <div className="metrics">
        <div className="metric hero"><label>Chức năng vận hành</label><strong>5</strong><small>Khách hàng · Dự án · Bài đăng · Shooting · Công việc</small></div>
        <div className="metric"><label>Điểm kiểm</label><strong>7</strong><small>G01–G07</small></div>
        <div className="metric"><label>Rule chặn start</label><strong>01</strong><small>Owner + deadline</small></div>
        <div className="metric"><label>Vai trò hệ thống</label><strong>4</strong><small>Account · Partner · Administrator · BODs</small></div>
      </div>
      <div className="feature-grid">
        {CAPABILITIES.map(([no, title, text, screen]) => (
          <div className="feature" key={no}>
            <i className="feature-no">{no}</i>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
              <a href="#" onClick={(event) => { event.preventDefault(); go(screen) }}>Mở capability</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function AccessScreen() {
  const permissions: Array<[string, string, string]> = [
    ['Account / Pod Lead', 'Khách, dự án được phân công; cam kết, timeline, post, shooting, task, Partner allocation, hợp đồng và công nợ thuộc phạm vi phụ trách.', 'Điều phối / thương mại'],
    ['Partner', 'Chỉ task/dự án được giao; brief, deadline, file, output, trạng thái.', 'Thực thi'],
    ['BODs', 'Tổng quan, record cần phê duyệt, rủi ro và chỉ số hợp đồng/công nợ; không điều phối thu tiền hằng ngày.', 'Duyệt / xem'],
    ['Administrator', 'Schema, field, action, role, log, dữ liệu kiểm thử và cấu hình prototype.', 'Quản trị'],
  ]
  return (
    <section className="screen active" id="access">
      <div className="page-head"><div><h1>Phân quyền</h1><p>Scope theo collection/action, field whitelist và record được giao.</p></div></div>
      <section className="panel">
        {permissions.map(([role, scope, mode]) => (
          <div className="permission" key={role}><b>{role}</b><span>{scope}</span><em className="mode">{mode}</em></div>
        ))}
      </section>
      <div className="alert" style={{ marginTop: 16 }}><b>Partner không xem dữ liệu ngoài scope</b><small>Không có hợp đồng, giá bán, chi phí, task Partner khác hoặc dữ liệu khách/dự án ngoài record được giao.</small></div>
    </section>
  )
}
