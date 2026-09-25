import { useApp } from '../../app/context'
import { initials } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { update, useData } from '../../store/store'
import { Modal } from '../../ui/Modal'
import { AccountSummaryModal, EditCustomerModal, StopCustomerProjectModal } from './CustomerModals'
import { addCustomerActivity, canStopCustomerProject } from './customerLogic'

/** Contract progress is not tracked per customer yet; the original showed this sample value. */
const SAMPLE_CONTRACT_PROGRESS = '4 / 6'

function ActivityInfoModal() {
  const { closeModal } = useApp()
  return (
    <Modal title="Hoạt động khách hàng">
      <div className="customer-data-rules"><b>Nhật ký hoạt động</b><p>Hệ thống lưu thay đổi Account, đầu mối, trạng thái, tiến độ chu kỳ và thao tác vận hành.</p></div>
      <div className="form-actions"><button className="secondary" type="button" onClick={closeModal}>Đóng</button></div>
    </Modal>
  )
}

export function CustomerDetailScreen() {
  const { customerId, go, role, toast, showModal } = useApp()
  const { customers, period } = useData()
  const item = customers.find((customer) => customer.id === customerId)
  if (!item) {
    return (
      <section className="screen active" id="customerDetail">
        <div className="customer-detail-head">
          <button className="customer-back" onClick={() => go('customers')}><Icon name="arrow-left" /> Khách hàng</button>
          <p>Không tìm thấy khách hàng.</p>
        </div>
      </section>
    )
  }

  const active = item.state === 'active'
  const periodText = period.mode === 'year' ? 'Năm ' + period.year : 'Tháng ' + period.month + ' / ' + period.year
  const openAccount = () => showModal(<AccountSummaryModal owner={item.owner} />)

  const toggleAttention = () =>
    update((draft) => {
      const target = draft.customers.find((customer) => customer.id === item.id)
      if (!target) return
      target.attention = !target.attention
      addCustomerActivity(
        target,
        target.attention ? 'Đã gắn cờ cần chú ý' : 'Đã bỏ cờ cần chú ý',
        target.attention ? 'Cần Account rà soát trong kỳ này' : 'Không còn điểm cần theo dõi',
        'flag',
      )
    })

  const changeState = () => {
    if (active) {
      if (!canStopCustomerProject(role, item)) {
        toast('Chỉ Account phụ trách hoặc Account tạo dự án được phép dừng.')
        return
      }
      showModal(<StopCustomerProjectModal customer={item} />)
      return
    }
    update((draft) => {
      const target = draft.customers.find((customer) => customer.id === item.id)
      if (!target) return
      target.state = 'active'
      addCustomerActivity(target, 'Đã mở lại dự án', 'Dự án tiếp tục triển khai', 'rotate-ccw')
    })
  }

  return (
    <section className="screen active" id="customerDetail">
      <div className="customer-detail-head">
        <button className="customer-back" onClick={() => go('customers')}><Icon name="arrow-left" /> Khách hàng</button>
        <div className="customer-detail-title">
          <div>
            <div className="customer-title-line">
              <h1>{item.name}</h1>
              <span className={'pill ' + (active ? 'ok' : 'muted')}>{active ? 'Đang hợp tác' : 'Đã dừng'}</span>
            </div>
            <p><span>{item.area}</span></p>
          </div>
          <div className="customer-detail-actions">
            <button className="secondary" onClick={() => showModal(<EditCustomerModal customer={item} />)}><Icon name="pencil" /> Sửa khách hàng</button>
          </div>
        </div>
      </div>

      <section className="customer-overview">
        <div className="customer-overview-main">
          <span>Tình hình khách hàng</span>
          <strong>{item.attention ? 'Cần theo dõi' : 'Ổn định'}</strong>
          <p>{item.attention ? 'Có hạng mục cần Account rà soát trong kỳ này.' : 'Không có rủi ro đang mở trong kỳ này.'}</p>
          <div>
            <Icon name="calendar-days" /> Kỳ hiện tại: {periodText} <Icon name="user-round" /> Account: <button onClick={openAccount}>{item.owner}</button>
          </div>
        </div>
        <div className="customer-overview-stat"><span>Tiến độ hợp đồng</span><strong>{SAMPLE_CONTRACT_PROGRESS}</strong><small>chu kỳ đã triển khai</small></div>
        <div className="customer-overview-stat"><span>Chu kỳ hiện tại</span><strong>{item.cycle}</strong><small>mốc theo dõi</small></div>
      </section>

      <div className="customer-detail-layout">
        <main>
          <section className="panel customer-project-panel">
            <div className="panel-head">
              <div><h2>Dự án đang triển khai</h2><p className="subline">Một dự án điều phối theo chu kỳ hợp đồng.</p></div>
              <span className={'pill ' + (active ? 'ok' : 'muted')}>{active ? 'Đang triển khai' : 'Đã dừng'}</span>
            </div>
            <div className="customer-project-row">
              <Icon name="folder-kanban" className="project-symbol" />
              <div>
                <b>{item.projectCode} · Triển khai nội dung</b>
                <p>{item.service} · Account {item.owner}</p>
                <div className="customer-progress"><i style={{ width: (item.attention ? 58 : 72) + '%' }} /></div>
                <small>{SAMPLE_CONTRACT_PROGRESS} chu kỳ · {item.attention ? 'Cần bù tiến độ kỳ này' : 'Đang theo kế hoạch'}</small>
              </div>
              <button className="text-btn" onClick={() => go('projects')}>Xem chi tiết</button>
            </div>
            <div className="customer-delivery-grid">
              <div><span>Bài đăng</span><b>12</b><small>kế hoạch trong kỳ</small></div>
              <div><span>Shooting</span><b>01</b><small>lịch trong kỳ</small></div>
              <div><span>Công việc mở</span><b>{item.attention ? '03' : '01'}</b><small>{item.attention ? 'cần xử lý' : 'đúng hạn'}</small></div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Hoạt động gần đây</h2><button className="text-btn" onClick={() => showModal(<ActivityInfoModal />)}>Xem toàn bộ</button></div>
            <div className="customer-activity">
              {item.activities.length
                ? item.activities.map((entry, index) => (
                    <div key={index}><Icon name={entry.icon} /><span><b>{entry.title}</b><small>{entry.time} · {entry.detail}</small></span></div>
                  ))
                : <div className="customer-activity-empty">Chưa có hoạt động được ghi nhận.</div>}
            </div>
          </section>
        </main>

        <aside>
          <section className="panel customer-account-panel">
            <div className="panel-head"><h2>Account phụ trách</h2></div>
            <button className="customer-account-card" onClick={openAccount}>
              <i>{initials(item.owner)}</i>
              <span><b>{item.owner}</b><small>Điều phối timeline và nguồn lực</small></span>
              <Icon name="chevron-right" />
            </button>
          </section>
          <section className="panel customer-control-panel">
            <div className="panel-head"><h2>Kiểm soát vận hành</h2></div>
            <button className={'customer-control' + (item.attention ? ' is-attention' : '')} onClick={toggleAttention}>
              <Icon name="flag" />
              <span>
                <b>{item.attention ? 'Đang gắn cờ cần chú ý' : 'Đánh dấu cần chú ý'}</b>
                <small>{item.attention ? 'Account cần theo dõi trong kỳ này' : 'Tạo điểm theo dõi cho Account'}</small>
              </span>
            </button>
            <button className="customer-control" onClick={changeState}>
              <Icon name={active ? 'circle-pause' : 'rotate-ccw'} />
              <span>
                <b>{active ? 'Dừng dự án' : 'Mở lại dự án'}</b>
                <small>{active ? 'Yêu cầu lý do và xác nhận' : 'Tiếp tục triển khai theo tiến độ đã có'}</small>
              </span>
            </button>
          </section>
        </aside>
      </div>
    </section>
  )
}
