import { useApp } from '../../app/context'
import { contractTone, paymentMetrics } from '../../data/contracts'
import { formatDate, initials, money, parseInput, shortDate } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { inScope } from '../../lib/scope'
import { currentCycle, projectHealth } from '../../lib/sop'
import { update, useData } from '../../store/store'
import { ContractDetailModal } from '../contracts/ContractModals'
import { CreateProjectModal } from '../projects/ProjectModals'
import { postProgress, projectLabel, projectTone } from '../projects/projectLogic'
import { AccountSummaryModal, EditCustomerModal, EndCooperationModal } from './CustomerModals'
import { addCustomerActivity, attentionItems, canManageCustomer, CUSTOMER_STATUS, customerProjects, customerStatus, daysToEnd, endBlockers, shortMoney } from './customerLogic'
import { EventLog, type SourcedActivity } from './EventLog'
import { ProjectCell } from './ProjectCell'
import { FlagModal } from '../../ui/FlagModal'

const ATTENTION_ICON = { flag: 'flag', late: 'clock-3', risk: 'flag', debt: 'file-text', renew: 'rotate-ccw' }

export function CustomerDetailScreen() {
  const { customerId, go, role, account, toast, showModal, openProject } = useApp()
  const { customers, projects, contracts, params } = useData()
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
  const attention = attentionItems(item, projects, contracts, params)
  const canManage = canManageCustomer(role, account, item)
  const outOfScope = !inScope(role, account, item)
  const readOnlyHint = role === 'account' ? 'Chỉ Account ' + item.owner + (item.createdBy && item.createdBy !== item.owner ? ' hoặc ' + item.createdBy : '') + ' được thao tác' : 'BODs và Administrator chỉ xem'
  const ownContracts = contracts.filter((row) => own.some((project) => project.id === row.projectId) && row.status !== 'Đã hủy')
  const debt = ownContracts.reduce((sum, row) => sum + paymentMetrics(row).remaining, 0)
  const overdue = ownContracts.reduce((sum, row) => sum + paymentMetrics(row).overdue, 0)
  const totalValue = ownContracts.reduce((sum, row) => sum + row.value, 0)
  const totalPaid = ownContracts.reduce((sum, row) => sum + row.paid, 0)
  const blockers = status === 'ended' ? [] : endBlockers(item, projects, contracts)
  const activeCount = own.filter((project) => project.state === 'active').length
  const openAccount = () => showModal(<AccountSummaryModal owner={item.owner} />)
  const openContract = (id: string) => showModal(<ContractDetailModal contractId={id} />)
  const scrollToContracts = () => document.getElementById('customerContracts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const log: SourcedActivity[] = [
    ...item.activities.map((entry) => ({ ...entry, source: 'Khách hàng' })),
    ...own.flatMap((project) => project.activities.slice(0, 3).map((entry) => ({ ...entry, source: project.code }))),
  ]

  const setAttention = (reason: string | null) =>
    update((draft) => {
      const target = draft.customers.find((customer) => customer.id === item.id)
      if (!target) return
      if (reason === null) addCustomerActivity(target, 'Đã gỡ cờ cần chú ý', 'Đã xử lý: ' + (target.attentionReason || ''), 'flag')
      else addCustomerActivity(target, 'Đã gắn cờ cần chú ý', reason, 'flag')
      target.attention = reason !== null
      target.attentionReason = reason ?? undefined
    })
  const toggleAttention = () => {
    if (!canManage) return toast(readOnlyHint + '.')
    if (item.attention) return setAttention(null)
    showModal(<FlagModal subject={'Gắn cờ khách ' + item.name} onConfirm={(reason) => setAttention(reason)} />)
  }

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
            <p><span>{item.area} · khách từ {formatDate(parseInput(item.createdAt))} · Account <button className="inline-link" onClick={openAccount}>{item.owner}</button></span></p>
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
          <strong>{item.ended ? 'Đã kết thúc hợp tác' : attention.length ? 'Cần theo dõi' : 'Ổn định'}</strong>
          {item.ended ? (
            <p>{formatDate(parseInput(item.ended.date))} · {item.ended.reason}</p>
          ) : attention.length ? (
            <ul className="attention-list">
              {attention.map((entry) => (
                <li key={entry.label}>
                  <button
                    type="button"
                    title={entry.detail}
                    disabled={!entry.targetId}
                    onClick={() => (entry.kind === 'debt' ? openContract(entry.targetId) : entry.targetId && openProject(entry.targetId))}
                  >
                    <Icon name={ATTENTION_ICON[entry.kind]} /> {entry.label} {entry.targetId && <Icon name="chevron-right" />}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>Không có mốc trễ, công nợ quá hạn hay cờ đang mở.</p>
          )}
        </div>
        <div className="customer-overview-stat"><span>Dự án</span><strong>{activeCount} / {own.length}</strong><small>đang triển khai / tổng</small></div>
        <button type="button" className="customer-overview-stat as-button" onClick={scrollToContracts} disabled={!ownContracts.length}>
          <span>Công nợ còn lại</span><strong>{money(debt)}</strong><small>{overdue ? 'quá hạn ' + shortMoney(overdue) + ' · ' : ''}đã thu {shortMoney(totalPaid)} / {shortMoney(totalValue)}{ownContracts.length ? ' ↓' : ''}</small>
        </button>
      </section>

      <div className="customer-detail-layout">
        <main>
          <section className="panel customer-project-panel">
            <div className="panel-head">
              <div><h2>Dự án</h2><p className="subline">Chu kỳ hiện tại, bài đã đăng và sức khỏe tự tính.</p></div>
              {status !== 'ended' && (
                <button className="text-btn" disabled={!canManage} title={canManage ? undefined : readOnlyHint} onClick={() => showModal(<CreateProjectModal customerId={item.id} onCreated={(id) => openProject(id)} />)}>+ Tạo dự án</button>
              )}
            </div>
            {own.map((project) => {
              const posts = postProgress(project)
              const health = projectHealth(project, params)
              const cycle = currentCycle(project)
              return (
                <button type="button" className="customer-project-line" key={project.id} onClick={() => openProject(project.id)}>
                  <span className="cpl-main">
                    <b>{project.code}</b>
                    <small>
                      {project.service} · {cycle ? shortDate(cycle.start) + ' – ' + shortDate(cycle.plannedEnd) : 'chưa bắt đầu'}
                      {project.owner !== item.owner ? ' · Account ' + project.owner : ''}
                    </small>
                    {project.state === 'active' && health.level !== 'ok' && <small className={'cpl-reason tone-' + health.tone}>{health.reason}</small>}
                    {project.state === 'pending' && project.pause && <small className="cpl-reason">{project.pause.reason}</small>}
                    {project.risk && <small className="cpl-reason tone-danger">Gắn cờ: {project.riskReason || '—'}</small>}
                    {project.notes && <small className="cpl-note" title={project.notes}>📝 {project.notes}</small>}
                  </span>
                  <ProjectCell projects={[project]} />
                  <span className="cpl-posts">{posts ? posts.published + '/' + posts.planned + ' bài' : '—'}</span>
                  <span className="cpl-status">
                    {project.state === 'active'
                      ? <span className={'pill ' + health.tone} title={health.reason}>{health.label}</span>
                      : <span className={'pill ' + projectTone(project)}>{projectLabel(project)}</span>}
                  </span>
                  <Icon name="chevron-right" />
                </button>
              )
            })}
            {!own.length && <p className="empty-copy">Chưa có dự án. Bấm + Tạo dự án để lập dự án nháp; chu kỳ 1 bắt đầu khi qua Cổng khởi động.</p>}
          </section>

          <section className="panel" id="customerContracts">
            <div className="panel-head"><div><h2>Hợp đồng</h2><p className="subline">Hợp đồng chính và phụ lục của các dự án.</p></div></div>
            {ownContracts.map((row) => {
              const metrics = paymentMetrics(row)
              return (
                <button type="button" className="customer-contract-line" key={row.id} onClick={() => openContract(row.id)}>
                  <span className="cpl-main">
                    <b>{row.code} · {row.type}</b>
                    <small>{row.service} · {row.cycles} chu kỳ · hết {row.end}</small>
                    {row.status === 'Hiệu lực' && daysToEnd(row) <= 30 && <small className="cpl-reason tone-waiting">{daysToEnd(row) < 0 ? 'Đã quá ngày hết hạn ' + -daysToEnd(row) + ' ngày' : 'Còn ' + daysToEnd(row) + ' ngày · cần trao đổi tái ký'}</small>}
                  </span>
                  <span className="cpl-money">
                    <b>{shortMoney(row.paid)} / {shortMoney(row.value)}</b>
                    <small>{metrics.overdue ? 'quá hạn ' + shortMoney(metrics.overdue) : metrics.remaining ? 'còn ' + shortMoney(metrics.remaining) : 'đã thu đủ'}</small>
                  </span>
                  <span className="cpl-status">
                    <span className={'pill ' + contractTone(row.status)}>{row.status}</span>
                    {metrics.overdue > 0 && <span className="pill danger">Quá hạn</span>}
                  </span>
                  <Icon name="chevron-right" />
                </button>
              )
            })}
            {!ownContracts.length && <p className="empty-copy">Chưa có hợp đồng. Hợp đồng được tạo từ Cổng khởi động của dự án.</p>}
          </section>

          <section className="panel">
            <div className="panel-head"><div><h2>Sự kiện theo khách &amp; dự án</h2><p className="subline">Thay đổi trên khách và 3 sự kiện mới nhất của mỗi dự án; lọc theo nguồn.</p></div></div>
            <EventLog entries={log} />
          </section>
        </main>

        <aside>
          <section className="panel customer-account-panel">
            <div className="panel-head"><h2>Account &amp; kiểm soát</h2></div>
            <button className="customer-account-card" onClick={openAccount}>
              <i>{initials(item.owner)}</i>
              <span><b>{item.owner}</b><small>{item.createdBy && item.createdBy !== item.owner ? 'Tạo bởi ' + item.createdBy : 'Account phụ trách'}</small></span>
              <Icon name="chevron-right" />
            </button>
            {status !== 'ended' && (
              <button className={'customer-control' + (item.attention ? ' is-attention' : '')} onClick={toggleAttention} disabled={!canManage} title={canManage ? undefined : readOnlyHint}>
                <Icon name="flag" />
                <span>
                  <b>{item.attention ? 'Gỡ cờ cần chú ý' : 'Đánh dấu cần chú ý'}</b>
                  <small>{item.attention ? 'Lý do: ' + (item.attentionReason || '—') : 'Cần ghi lý do; trễ mốc và công nợ tự tính'}</small>
                </span>
              </button>
            )}
            <button className="customer-control" onClick={changeCooperation} disabled={!canManage} title={canManage ? undefined : readOnlyHint}>
              <Icon name={status === 'ended' ? 'rotate-ccw' : 'circle-stop'} />
              <span>
                <b>{status === 'ended' ? 'Mở lại hợp tác' : 'Kết thúc hợp tác'}</b>
                <small>{status === 'ended' ? 'Sau đó tạo dự án mới' : blockers.length ? 'Chưa thể: ' + blockers.slice(0, 2).join(', ') + (blockers.length > 2 ? '…' : '') : 'Sẵn sàng: mọi dự án đã dừng, hợp đồng đã đóng'}</small>
              </span>
            </button>
          </section>
        </aside>
      </div>
    </section>
  )
}
