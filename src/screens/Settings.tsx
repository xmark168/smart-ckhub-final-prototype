import { useState, type ReactNode } from 'react'
import { useApp } from '../app/context'
import { resetData } from '../store/store'
import { Modal } from '../ui/Modal'

type Tab = 'general' | 'notification' | 'security' | 'system'

function Row({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return <div className="setting-row"><div><b>{title}</b><p>{text}</p></div>{children}</div>
}

function Switch({ on = false }: { on?: boolean }) {
  return <label className="switch"><input type="checkbox" defaultChecked={on} /><span className="slider" /></label>
}

function ResetDataModal() {
  const { closeModal, toast } = useApp()
  return (
    <Modal title="Khôi phục dữ liệu mẫu" onSubmit={() => { resetData(); closeModal(); toast('Đã khôi phục dữ liệu mẫu.') }}>
      <div className="form">
        <div className="customer-data-rules"><b>Xóa thay đổi đã lưu trên trình duyệt này</b><p>Khách hàng, dự án, hợp đồng, gói dịch vụ và công việc quay về dữ liệu mẫu ban đầu. Không ảnh hưởng máy khác.</p></div>
        <div className="form-actions">
          <button className="secondary" type="button" onClick={closeModal}>Hủy</button>
          <button className="primary">Khôi phục</button>
        </div>
      </div>
    </Modal>
  )
}

export function SettingsScreen() {
  const { role, toast, go, showModal } = useApp()
  const admin = role === 'admin'
  const [selected, setTab] = useState<Tab>('general')
  const tab = !admin && selected === 'system' ? 'general' : selected
  const tabs: Array<[Tab, string]> = [['general', 'Chung'], ['notification', 'Thông báo'], ['security', 'Bảo mật'], ...(admin ? [['system', 'Hệ thống'] as [Tab, string]] : [])]

  return (
    <section className="screen active" id="settings">
      <div className="page-head">
        <div><h1>Cài đặt</h1><p>Thiết lập cá nhân và tùy chọn vận hành.</p></div>
        <button className="primary" onClick={() => toast('Đã lưu cài đặt mô phỏng.')}>Lưu thay đổi</button>
      </div>
      <div className="settings-tabs">
        {tabs.map(([id, label]) => <button key={id} className={'settings-tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      {tab === 'general' && (
        <section className="settings-pane active panel">
          <div className="panel-head"><h2>Tùy chọn hiển thị</h2></div>
          <div className="setting-list">
            <Row title="Ngôn ngữ" text="Ngôn ngữ hiển thị mặc định."><select><option>Tiếng Việt</option><option>English</option></select></Row>
            <Row title="Múi giờ" text="Dùng để hiển thị deadline và lịch hoạt động."><select><option>GMT+07:00 — Hồ Chí Minh</option></select></Row>
            <Row title="Giao diện thu gọn" text="Thu gọn thanh điều hướng khi phù hợp."><Switch /></Row>
            <Row title="Dữ liệu mô phỏng" text="Thay đổi được lưu trên trình duyệt này. Khôi phục để quay về dữ liệu mẫu.">
              <button className="secondary" onClick={() => showModal(<ResetDataModal />)}>Khôi phục</button>
            </Row>
          </div>
        </section>
      )}
      {tab === 'notification' && (
        <section className="settings-pane active panel">
          <div className="panel-head"><h2>Thông báo</h2></div>
          <div className="setting-list">
            <Row title="Công việc đến hạn" text="Nhận nhắc khi task sắp đến hạn hoặc trễ hạn."><Switch on /></Row>
            <Row title="Thay đổi dự án" text="Nhận thông báo khi timeline, đầu ra hoặc trạng thái đổi."><Switch on /></Row>
            <Row title="Tóm tắt tuần" text="Nhận tổng hợp tiến độ và điểm cần xử lý."><Switch /></Row>
          </div>
        </section>
      )}
      {tab === 'security' && (
        <section className="settings-pane active panel">
          <div className="panel-head"><h2>Bảo mật tài khoản</h2></div>
          <div className="setting-list">
            <Row title="Xác thực hai bước" text="Yêu cầu mã xác minh khi đăng nhập từ thiết bị mới."><Switch /></Row>
            <Row title="Tự động đăng xuất" text="Đăng xuất sau 30 phút không hoạt động."><Switch on /></Row>
            <Row title="Quản lý phiên" text="Xem và kết thúc các phiên đăng nhập khác."><button className="secondary" onClick={() => toast('Hiện chỉ có phiên đăng nhập này.')}>Xem phiên</button></Row>
          </div>
        </section>
      )}
      {tab === 'system' && (
        <section className="settings-pane active panel">
          <div className="panel-head"><h2>Cài đặt hệ thống</h2><span className="mode">Administrator</span></div>
          <div className="setting-list">
            <Row title="Nhật ký hoạt động" text="Lưu sự kiện thay đổi dữ liệu và phân quyền."><Switch on /></Row>
            <Row title="Khoảng lưu phiên" text="Thiết lập chính sách phiên đăng nhập toàn hệ thống."><select><option>30 phút</option><option>60 phút</option></select></Row>
            <Row title="Danh mục chuẩn" text="Gói dịch vụ, vai trò và trạng thái dùng chung."><button className="secondary" onClick={() => go('services')}>Mở quản trị</button></Row>
          </div>
        </section>
      )}
    </section>
  )
}
