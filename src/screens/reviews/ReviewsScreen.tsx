import { useApp } from '../../app/context'

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
