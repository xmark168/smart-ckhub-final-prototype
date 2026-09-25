import { ROLES, useApp, type ScreenId } from '../../app/context'
import { PAGES } from '../../app/routes'

export function ForbiddenScreen({ screen }: { screen: ScreenId }) {
  const { role, go } = useApp()
  const allowed = PAGES[screen].access.map((key) => ROLES[key].label).join(', ')
  return (
    <section className="screen active" id="forbidden">
      <div className="page-head"><div><h1>Không có quyền truy cập</h1><p>Vai trò {ROLES[role].label} không xem được trang {PAGES[screen].title}.</p></div></div>
      <div className="alert"><b>Phạm vi dữ liệu</b><small>Trang này dành cho: {allowed}. Chuyển vai trò trong menu tài khoản nếu cần xem.</small></div>
      <button className="primary" style={{ marginTop: 16 }} onClick={() => go(ROLES[role].home)}>Về trang chính</button>
    </section>
  )
}
