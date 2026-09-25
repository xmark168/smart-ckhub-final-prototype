import { useApp } from '../../app/context'
import { QuickTaskModal } from './QuickTaskModal'

export function OverviewScreen() {
  const { go, showModal } = useApp()
  return (
    <section className="screen active" id="overview">
      <div className="page-head">
        <div><h1>Tổng quan vận hành</h1><p>Account/Pod Lead quyết định timeline, priority và phân bổ. Smart CKHUB là nguồn trạng thái.</p></div>
        <button className="primary" onClick={() => showModal(<QuickTaskModal />)}>+ Tạo công việc</button>
      </div>
      <div className="metrics">
        <div className="metric hero"><label>Việc Account cần xử lý</label><strong>7</strong><small>2 việc cần quyết định ngay hôm nay</small></div>
        <div className="metric"><label>Đầu ra đúng hạn</label><strong>86%</strong><small>Từ dữ liệu kiểm thử</small></div>
        <div className="metric"><label>Chờ khách duyệt</label><strong>4</strong><small>Không tính vào thời gian Partner</small></div>
        <div className="metric"><label>Tải Media</label><strong>78%</strong><small>Kiểm trước lịch quay mới</small></div>
      </div>
      <div className="layout">
        <section className="panel">
          <div className="panel-head"><h2>Hàng chờ Account</h2><button className="text-btn" onClick={() => go('tasks')}>Mở công việc</button></div>
          <div className="task-mini"><i className="dot red" /><div><b>Duyệt scope quay bổ sung</b><span>Cơm Tấm Tài · Thảo Hiền · Change request</span></div><time className="late">Quá hạn 2h</time></div>
          <div className="task-mini"><i className="dot warn" /><div><b>Chốt Shooting Plan</b><span>Vua Chả Cá · Minh Long Studio</span></div><time>16:00</time></div>
          <div className="task-mini"><i className="dot" /><div><b>Viết script 01–06</b><span>Cơm Tấm Tài · Thương Mai</span></div><time>23.09</time></div>
          <div className="task-mini"><i className="dot" /><div><b>Xác nhận Ads report tuần 38</b><span>Cơm Tấm Tài · N.A. Performance</span></div><time>24.09</time></div>
        </section>
        <aside className="panel">
          <div className="panel-head"><h2>Điểm nghẽn</h2><span className="pill danger">Bị chặn</span></div>
          <div className="alert"><b>01 Shooting Plan chưa chốt</b><small>Không mở lịch quay nếu thiếu Partner, input hoặc quyết định Account.</small></div>
          <div className="panel-head" style={{ marginTop: 17 }}><h2>Tải tuần này</h2></div>
          <div className="cap"><span>Content</span><div className="bar"><i style={{ width: '62%' }} /></div><b>62%</b></div>
          <div className="cap"><span>Media</span><div className="bar"><i className="warn" style={{ width: '78%' }} /></div><b>78%</b></div>
          <div className="cap"><span>Ads</span><div className="bar"><i style={{ width: '48%' }} /></div><b>48%</b></div>
        </aside>
      </div>
      <div className="layout" style={{ marginTop: 16 }}>
        <section className="panel">
          <div className="panel-head"><h2>Cơm Tấm Tài · chu kỳ 09.2026</h2><span className="mode">12 bài</span></div>
          <div className="flow">
            <div className="stage done"><strong>Đầu vào</strong>Đủ</div>
            <div className="stage done"><strong>Kế hoạch</strong>Đã duyệt</div>
            <div className="stage now"><strong>Sản xuất</strong>08 / 12</div>
            <div className="stage"><strong>Duyệt nội bộ</strong>02 chờ</div>
            <div className="stage"><strong>Kết thúc</strong>Chưa mở</div>
          </div>
        </section>
        <aside className="panel">
          <div className="panel-head"><h2>Nhịp hôm nay</h2></div>
          <div className="timeline">
            <div className="event"><time>09:30</time><i className="pin" /><div><b>Daily Pod</b><p>Chỉ xử lý việc tắc và quyết định.</p></div></div>
            <div className="event"><time>14:00</time><i className="pin" /><div><b>Duyệt nội bộ Post Demo</b><p>Cơm Tấm Tài · Account kiểm cuối.</p></div></div>
            <div className="event"><time>16:30</time><i className="pin" /><div><b>Rà tải Partner</b><p>Chốt slot quay và dựng.</p></div></div>
          </div>
        </aside>
      </div>
    </section>
  )
}
