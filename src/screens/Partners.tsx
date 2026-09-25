import { useApp } from '../app/context'

export function PartnersScreen() {
  const { toast } = useApp()
  const partners: Array<[string, string, string, string, number, string, boolean]> = [
    ['Minh Long Studio', 'Video production', '03 việc đang nhận', 'Cần kiểm tải', 78, 'Cao', true],
    ['Thương Mai', 'Content / script', '02 batch đang chạy', 'Có thể nhận', 62, 'Trung bình', false],
    ['N.A. Performance', 'Ads / report', '01 report chờ review', 'Có thể nhận', 48, 'Thấp', false],
  ]
  return (
    <section className="screen active" id="partners">
      <div className="page-head">
        <div><h1>Partner &amp; năng lực</h1><p>Account phân bổ theo project, skill, tải và deadline.</p></div>
        <button className="secondary" onClick={() => toast('Thêm Partner sẽ mở khi có danh mục Partner chính thức.')}>Thêm Partner</button>
      </div>
      <div className="cards">
        {partners.map(([name, skill, load, status, percent, priority, warn]) => (
          <article className="entity" key={name}>
            <div className="entity-top"><span>Partner</span><span className={'pill ' + (warn ? 'waiting' : 'ok')}>{status}</span></div>
            <h2>{name}</h2>
            <p>{skill}<br />{load}</p>
            <div className="bar"><i className={warn ? 'warn' : undefined} style={{ width: percent + '%' }} /></div>
            <div className="meta"><span>Tải {percent}%</span><span>Ưu tiên {priority}</span></div>
          </article>
        ))}
      </div>
      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head"><h2>Quy tắc phân bổ</h2></div>
        <div className="feature-grid">
          <div className="feature"><i className="feature-no">1</i><div><h2>Account chốt</h2><p>Timeline, priority và Partner do Account/Pod Lead quyết định.</p></div></div>
          <div className="feature"><i className="feature-no">2</i><div><h2>Partner xác nhận</h2><p>Chỉ nhận việc khi có scope, brief, deadline và quyền truy cập đủ.</p></div></div>
        </div>
      </section>
    </section>
  )
}

export function PartnerWork() {
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

export function PartnerProjects() {
  const { go } = useApp()
  return (
    <section className="screen active" id="partnerProject">
      <div className="page-head"><div><h1>Dự án được giao</h1><p>Chỉ hiển thị dự án có task Minh Long Studio được cấp quyền.</p></div></div>
      <div className="cards">
        <article className="entity">
          <div className="entity-top"><span>Cơm Tấm Tài</span><span className="pill ok">Đang triển khai</span></div>
          <h2>Content Retainer Q3</h2>
          <p>Phạm vi Partner: task được giao, brief, file, deadline, output.</p>
          <div className="meta"><span>01 task được giao</span><button className="text-btn" onClick={() => go('partnerWork')}>Việc của tôi</button></div>
        </article>
        <article className="entity">
          <div className="entity-top"><span>Vua Chả Cá</span><span className="pill waiting">Chờ xác nhận</span></div>
          <h2>Launch campaign</h2>
          <p>Phạm vi Partner: Shooting Plan, lịch shooting, output liên quan.</p>
          <div className="meta"><span>01 task được giao</span><button className="text-btn" onClick={() => go('partnerSchedule')}>Lịch của tôi</button></div>
        </article>
      </div>
    </section>
  )
}

export function PartnerSchedule() {
  const events: Array<[string, string, string, string]> = [
    ['22.09', '14:00', 'Dựng Post Demo 01', 'Cơm Tấm Tài · TASK-244 · chờ BODs phê duyệt.'],
    ['25.09', '08:00', 'Shooting launch batch 01', 'Vua Chả Cá · chỉ thực hiện khi Account chốt gate.'],
    ['29.09', '13:30', 'Shooting monthly batch', 'Cơm Tấm Tài · brief và reference đã đủ.'],
  ]
  return (
    <section className="screen active" id="partnerSchedule">
      <div className="page-head"><div><h1>Lịch của tôi</h1><p>Chỉ hiển thị slot Minh Long Studio đã được Account phân bổ.</p></div></div>
      <section className="panel">
        <div className="timeline">
          {events.map(([date, time, title, text]) => (
            <div className="event" key={title}><time>{date}<br />{time}</time><i className="pin" /><div><b>{title}</b><p>{text}</p></div></div>
          ))}
        </div>
      </section>
    </section>
  )
}

export function ReviewsScreen() {
  const { toast } = useApp()
  return (
    <section className="screen active" id="reviews">
      <div className="page-head"><div><h1>Hàng chờ phê duyệt</h1><p>BODs (Võ Hồng Quang) duyệt hướng đi hoặc trả yêu cầu làm rõ theo record/version.</p></div></div>
      <section className="panel">
        <div className="review">
          <div><b>Dựng Post Demo 01</b><p>Cơm Tấm Tài · TASK-244 · Version 01 đã nộp.</p></div>
          <div>
            <button className="secondary" onClick={() => toast('Đã trả fix. Task quay về người thực hiện, Account nhận được impact deadline.')}>Trả fix</button>{' '}
            <button className="primary" onClick={() => toast('BODs đã duyệt nội bộ. Account quyết định bước gửi khách.')}>Duyệt</button>
          </div>
        </div>
        <div className="review">
          <div><b>Duyệt scope quay bổ sung</b><p>Cơm Tấm Tài · TASK-241 · khách thêm cảnh ngoài brief.</p></div>
          <div><button className="secondary" onClick={() => toast('Đã yêu cầu Account làm rõ impact timeline và ngân sách.')}>Yêu cầu rõ</button></div>
        </div>
      </section>
      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head"><h2>BODs nhìn thấy</h2></div>
        <div className="checklist">
          <div className="check done"><i>✓</i>Đầu vào, version, output, phản hồi, lịch sử trả fix và rủi ro.</div>
          <div className="check done"><i>✓</i>Tác động deadline khi trả fix hoặc đổi scope.</div>
          <div className="check"><i />Không điều phối Partner hay giao task hằng ngày.</div>
        </div>
      </section>
    </section>
  )
}
