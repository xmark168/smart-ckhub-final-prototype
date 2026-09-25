import { useApp } from '../../app/context'

export function PartnerWorkScreen() {
  const { toast } = useApp()
  return (
    <section className="screen active" id="partnerWork">
      <div className="page-head"><div><h1>Việc của tôi</h1><p>Minh Long Studio chỉ thấy assignment đã phân quyền.</p></div></div>
      <div className="panel table-wrap">
        <table className="table">
          <thead><tr><th>Công việc</th><th>Dự án</th><th>Deadline</th><th>Đầu vào</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>
            <tr>
              <td><b>Chốt Shooting Plan</b><span className="subline">TASK-242</span></td><td>Vua Chả Cá</td><td>22.09 · 16:00</td><td>Shooting Plan / reference</td>
              <td><span className="pill waiting">Đã lập kế hoạch</span></td>
              <td><button className="primary" onClick={() => toast('Partner đã nhận việc. Account nhận được cập nhật.')}>Nhận việc</button></td>
            </tr>
            <tr>
              <td><b>Dựng Post Demo 01</b><span className="subline">TASK-244</span></td><td>Cơm Tấm Tài</td><td>22.09 · 14:00</td><td>Script / raw file</td>
              <td><span className="pill info">Chờ phê duyệt</span></td>
              <td><button className="secondary" onClick={() => toast('Đã mở version và feedback trong record.')}>Mở output</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="alert" style={{ marginTop: 16 }}><b>Phạm vi Partner</b><small>Không thấy hợp đồng, giá bán, chi phí, dữ liệu khách/dự án khác hoặc task Partner khác.</small></div>
    </section>
  )
}
