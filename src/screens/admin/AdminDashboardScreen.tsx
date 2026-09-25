import { useApp, type ScreenId } from '../../app/context'

const CAPABILITIES: Array<[string, string, string, ScreenId]> = [
  ['1', 'Khách hàng', 'Hồ sơ, đầu mối, cam kết, Account scope.', 'customers'],
  ['2', 'Dự án', 'Timeline chu kỳ, rủi ro, phân bổ.', 'projects'],
  ['3', 'Bài đăng', 'Kế hoạch, script, version, ngày air.', 'posts'],
  ['4', 'Lịch shooting', 'Partner, input, slot, ảnh hưởng đổi lịch.', 'shootings'],
  ['5', 'Công việc', 'Owner, deadline, blocked, output.', 'tasks'],
]

export function AdminDashboardScreen() {
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
