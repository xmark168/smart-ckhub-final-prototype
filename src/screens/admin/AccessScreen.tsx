

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
