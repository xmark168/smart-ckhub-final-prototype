import { ROLES, useApp, type ScreenId } from '../../app/context'
import { useData } from '../../store/store'
import type { Role } from '../../store/types'

const LINKS: Array<[ScreenId, string, string]> = [
  ['services', 'Gói dịch vụ', 'Giá, định mức bài / shoot, gói trả một lần hay theo tháng.'],
  ['parameters', 'Tham số vận hành', 'Các con số của SOP và VAT mặc định.'],
  ['access', 'Phân quyền', 'Vai trò và phạm vi dữ liệu.'],
  ['docs', 'Tài liệu thiết kế', 'Quy tắc và quyết định nghiệp vụ.'],
]

/** Administrator: size of the data and the configuration pages. */
export function AdminDashboardScreen() {
  const { go } = useApp()
  const { customers, projects, contracts, packages, tasks } = useData()
  const roles = Object.keys(ROLES) as Role[]
  const metric = (label: string, value: number, note: string) => <div className="metric"><label>{label}</label><strong>{value}</strong><small>{note}</small></div>
  return (
    <section className="screen active" id="poc">
      <div className="page-head"><div><h1>Quản trị hệ thống</h1><p>Dữ liệu hiện có và các trang cấu hình.</p></div></div>
      <div className="metrics">
        {metric('Khách hàng', customers.length, customers.filter((item) => !item.ended).length + ' đang hợp tác')}
        {metric('Dự án', projects.length, projects.filter((item) => item.state === 'active').length + ' đang triển khai')}
        {metric('Hợp đồng', contracts.length, contracts.filter((item) => item.status === 'Hiệu lực').length + ' hiệu lực')}
        {metric('Việc đang mở', tasks.filter((item) => item.status === 'open').length, packages.filter((item) => item.status === 'Đang áp dụng').length + ' gói đang áp dụng')}
      </div>
      <div className="feature-grid" style={{ marginTop: 16 }}>
        {LINKS.map(([screen, title, text]) => (
          <button type="button" className="feature admin-link" key={screen} onClick={() => go(screen)}>
            <div><h2>{title}</h2><p>{text}</p></div>
          </button>
        ))}
      </div>
      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head"><h2>Vai trò ({roles.length})</h2></div>
        <div className="home-lines">
          {roles.map((role) => <div className="home-line" key={role}><span><b>{ROLES[role].label}</b><small>{ROLES[role].note}</small></span></div>)}
        </div>
      </section>
    </section>
  )
}
