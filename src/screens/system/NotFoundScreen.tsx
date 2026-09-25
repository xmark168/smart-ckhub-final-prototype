import { ROLES, useApp } from '../../app/context'

export function NotFoundScreen() {
  const { role, go } = useApp()
  return (
    <section className="screen active" id="notFound">
      <div className="page-head"><div><h1>Không tìm thấy trang</h1><p>Đường dẫn không tồn tại hoặc đã thay đổi.</p></div></div>
      <div className="alert">
        <b>Kiểm tra lại đường dẫn</b>
        <small>Các trang của prototype có dạng <code>#/projects</code>, <code>#/customers/customer-0</code>.</small>
      </div>
      <button className="primary" style={{ marginTop: 16 }} onClick={() => go(ROLES[role].home)}>Về trang chính</button>
    </section>
  )
}
