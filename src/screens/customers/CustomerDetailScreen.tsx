import { useApp } from '../../app/context'
import { paymentMetrics } from '../../data/contracts'
import { formatDate, initials, money, parseInput } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { currentCycle, projectHealth } from '../../lib/sop'
import { update, useData } from '../../store/store'
import { inScope } from '../../lib/scope'
import { Modal } from '../../ui/Modal'
import { CreateProjectModal } from '../projects/ProjectModals'
import { cycleCounter, postProgress, projectLabel, projectTone } from '../projects/projectLogic'
import { AccountSummaryModal, EditCustomerModal, EndCooperationModal } from './CustomerModals'
import { addCustomerActivity, attentionReasons, canManageCustomer, CUSTOMER_STATUS, customerProjects, customerStatus, periodLabel } from './customerLogic'

function ActivityInfoModal() {
  const { closeModal } = useApp()
  return (
    <Modal title="Hoạt động khách hàng">
      <div className="customer-data-rules"><b>Nhật ký hoạt động</b><p>Lưu thay đổi Account, trạng thái hợp tác và cờ theo dõi. Thao tác trên dự án xem ở Nhật ký của từng dự án.</p></div>
      <div className="form-actions"><button className="secondary" type="button" onClick={closeModal}>Đóng</button></div>
    </Modal>
  )
}

export function CustomerDetailScreen() {
  const { customerId, go, role, account, toast, showModal, openProject } = useApp()
  const { customers, projects, contracts, params, period } = useData()
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

  const status = customerStatus(item, projects)
  const own = customerProjects(item, projects)
  const reasons = attentionReasons(item, projects, contracts, params)
  const canManage = canManageCustomer(role, account, item)
  const outOfScope = !inScope(role, account, item)
  const readOnlyHint = role === 'account' ? 'Chỉ Account ' + item.owner + (item.createdBy && item.createdBy !== item.owner ? ' hoặc ' + item.createdBy : '') + ' được thao tác' : 'BODs và Administrator chỉ xem'
  const ownContracts = contracts.filter((row) => own.some((project) => project.id === row.projectId) && row.status !== 'Đã hủy')
  const debt = ownContracts.reduce((sum, row) => sum + paymentMetrics(row).remaining, 0)
  const overdue = ownContracts.reduce((sum, row) => sum + paymentMetrics(row).overdue, 0)
  const activeCount = own.filter((project) => project.state === 'active').length
  const openAccount = () => showModal(<AccountSummaryModal owner={item.owner} />)

  const toggleAttention = () =>
    canManage ? update((draft) => {
      const target = draft.customers.find((customer) => customer.id === item.id)
      if (!target) return
      target.attention = !target.attention
      addCustomerActivity(
        target,
        target.attention ? 'Đã gắn cờ cần chú ý' : 'Đã bỏ cờ cần chú ý',
        target.attention ? 'Cần Account rà soát trong kỳ này' : 'Không còn điểm cần theo dõi',
        'flag',
      )
    }) : toast(readOnlyHint + '.')

  const changeCooperation = () => {
    if (!canManage) return toast(readOnlyHint + '.')
    if (status !== 'ended') return showModal(<EndCooperationModal customer={item} />)
    update((draft) => {
      const target = draft.customers.find((customer) => customer.id === item.id)
      if (!target) return
      target.ended = undefined
      addCustomerActivity(target, 'Đã mở lại hợp tác', 'Tạo dự án mới để tiếp tục triển khai', 'rotate-ccw')
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
              <span className={'pill ' + CUSTOMER_STATUS[status].tone}>{CUSTOMER_STATUS[status].label}</span>
            </div>
            <p><span>{item.area} · khách từ {formatDate(parseInput(item.createdAt))}</span></p>
          </div>
          <div className="customer-detail-actions">
            <button className="secondary" disabled={!canManage} title={canManage ? undefined : readOnlyHint} onClick={() => showModal(<EditCustomerModal customer={item} />)}><Icon name="pencil" /> Sửa khách hàng</button>
          </div>
        </div>
      </div>

      {outOfScope && <div className="scope-banner"><Icon name="shield-check" /> Khách này thuộc Account {item.owner}, ngoài phạm vi của bạn. Chế độ xem.</div>}
      {!outOfScope && !canManage && <div className="scope-banner"><Icon name="shield-check" /> {readOnlyHint}. Chế độ xem.</div>}

      <section className="customer-overview">
        <div className="customer-overview-main">
          <span>Tình hình khách hàng</span>
          <strong>{item.ended ? 'Đã kết thúc hợp tác' : reasons.length ? 'Cần theo dõi' : 'Ổn định'}</strong>
          <p>{item.ended ? formatDate(parseInput(item.ended.date)) + ' · ' + item.ended.reason : reasons.length ? reasons.slice(0, 2).join(' · ') + (reasons.length > 2 ? ' · +' + (reasons.length - 2) : '') : 'Không có mốc trễ, công nợ quá hạn hay cờ đang mở.'}</p>
          <div>
            <Icon name="calendar-days" /> Kỳ xem: {periodLabel(period)} <Icon name="user-round" /> Account: <button onClick={openAccount}>{item.owner}</button>
          </div>
        </div>
        <div className="customer-overview-stat"><span>Dự án</span><strong>{activeCount} / {own.length}</strong><small>đang triển khai / tổng</small></div>
        <div className="customer-overview-stat"><span>Công nợ còn lại</span><strong>{money(debt)}</strong><small>{overdue ? 'quá hạn ' + money(overdue) : 'không có khoản quá hạn'}</small></div>
      </section>

      <div className="customer-detail-layout">
        <main>
          <section className="panel customer-project-panel">
            <div className="panel-head">
              <div><h2>Dự án</h2><p className="subline">Tiến độ tính từ chu kỳ và bài đã đăng của từng dự án.</p></div>
              {status !== 'ended' && (
                <button className="text-btn" disabled={!canManage} title={canManage ? undefined : readOnlyHint} onClick={() => showModal(<CreateProjectModal customerId={item.id} onCreated={(id) => openProject(id)} />)}>+ Tạo dự án</button>
              )}
            </div>
            {own.map((project) => {
              const posts = postProgress(project)
              const health = projectHealth(project, params)
              const cycle = currentCycle(project)
              return (
                <div className="customer-project-row" key={project.id}>
                  <Icon name="folder-kanban" className="project-symbol" />
                  <div>
                    <b>{project.code} · {project.service} <span className={'pill ' + projectTone(project)}>{projectLabel(project)}</span></b>
                    <p>Account {project.owner} · Chu kỳ {cycleCounter(project)}{cycle ? ' · ' + formatDate(parseInput(cycle.start)) + ' – ' + formatDate(parseInput(cycle.plannedEnd)) : ''}</p>
                    {posts && <div className="customer-progress"><i style={{ width: Math.min(100, posts.percent) + '%' }} /></div>}
                    <small>{posts ? posts.published + ' / ' + posts.planned + ' bài · ' : ''}<span className={'pill ' + health.tone}>{health.label}</span> {health.reason}</small>
                  </div>
                  <button className="text-btn" onClick={() => openProject(project.id)}>Xem chi tiết</button>
                </div>
              )
            })}
            {!own.length && <p className="empty-copy">Chưa có dự án. Bấm + Tạo dự án để lập dự án nháp; chu kỳ 1 bắt đầu khi qua Cổng khởi động.</p>}
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Hoạt động gần đây</h2><button className="text-btn" onClick={() => showModal(<ActivityInfoModal />)}>Quy tắc</button></div>
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
              <span><b>{item.owner}</b><small>{item.createdBy && item.createdBy !== item.owner ? 'Tạo bởi ' + item.createdBy : 'Điều phối timeline và nguồn lực'}</small></span>
              <Icon name="chevron-right" />
            </button>
          </section>
          <section className="panel customer-control-panel">
            <div className="panel-head"><h2>Kiểm soát hợp tác</h2></div>
            {status !== 'ended' && (
              <button className={'customer-control' + (item.attention ? ' is-attention' : '')} onClick={toggleAttention} disabled={!canManage} title={canManage ? undefined : readOnlyHint}>
                <Icon name="flag" />
                <span>
                  <b>{item.attention ? 'Đang gắn cờ cần chú ý' : 'Đánh dấu cần chú ý'}</b>
                  <small>{item.attention ? 'Gỡ khi đã xử lý xong' : 'Cờ tay; dự án trễ và công nợ quá hạn tự tính'}</small>
                </span>
              </button>
            )}
            <button className="customer-control" onClick={changeCooperation} disabled={!canManage} title={canManage ? undefined : readOnlyHint}>
              <Icon name={status === 'ended' ? 'rotate-ccw' : 'circle-stop'} />
              <span>
                <b>{status === 'ended' ? 'Mở lại hợp tác' : 'Kết thúc hợp tác'}</b>
                <small>{status === 'ended' ? 'Sau đó tạo dự án mới' : 'Khi mọi dự án đã dừng và hợp đồng đã đóng. Dừng dự án thực hiện tại trang dự án.'}</small>
              </span>
            </button>
          </section>
        </aside>
      </div>
    </section>
  )
}
