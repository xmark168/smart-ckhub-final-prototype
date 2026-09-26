import { useApp } from '../../app/context'
import { contractTone, paymentMetrics, paymentState } from '../../data/contracts'
import { addDaysIso, diffDays, includesText, shortDate, TODAY } from '../../lib/format'
import { usePagedList } from '../../lib/usePagedList'
import { Icon } from '../../lib/icons'
import { inScope } from '../../lib/scope'
import { useScreenState } from '../../lib/useScreenState'
import { useData } from '../../store/store'
import type { Contract, Payment } from '../../store/types'
import { InfoModal } from '../../ui/Modal'
import { shortMoney } from '../customers/customerLogic'
import { addProjectActivity, updateProject } from '../projects/projectLogic'
import { ContractDetailModal, ContractFormModal } from './ContractModals'

type Collection = '' | 'overdue' | 'soon' | 'settled'

interface Filters {
  query: string
  status: string
  collection: Collection
}

const INITIAL: Filters = { query: '', status: '', collection: '' }
const PAGE_SIZE = 10
const SOON = addDaysIso(TODAY, 30)

const RULES =
  'Một dự án có thể có hợp đồng chính và phụ lục; một hợp đồng có thể gồm nhiều gói. Công nợ là phần chưa thu của đợt đã quá hạn; đợt chưa tới hạn là phải thu. Mỗi khoản thu cần mã chứng từ. Account chỉ thấy hợp đồng của dự án mình phụ trách.'

const unpaid = (payment: Payment) => payment.paid < payment.amount
/** The installment to act on: the oldest overdue one, else the next due within 30 days. */
function actionable(rows: Contract[]): Payment | undefined {
  return rows
    .flatMap((row) => row.payments)
    .filter((payment) => unpaid(payment) && payment.due <= SOON)
    .sort((a, b) => a.due.localeCompare(b.due))[0]
}

function matches(group: Contract[], collection: Collection): boolean {
  const metrics = group.map(paymentMetrics)
  if (collection === 'overdue') return metrics.some((item) => item.overdue > 0)
  if (collection === 'soon') return group.some((row) => row.payments.some((payment) => unpaid(payment) && payment.due >= TODAY && payment.due <= SOON))
  if (collection === 'settled') return metrics.every((item) => item.remaining === 0)
  return true
}

export function ContractsScreen() {
  const { showModal, role, account, toast } = useApp()
  const { contracts, projects } = useData()
  const [filters, setFilters] = useScreenState<Filters>('contracts.filters', INITIAL)
  const change = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }))
    resetPage()
  }

  // Account sees the contracts of the projects they run; BODs and Admin see all.
  const visible = contracts.filter((row) => {
    const project = projects.find((item) => item.id === row.projectId)
    return !project || inScope(role, account, project)
  })
  const active = visible.filter((row) => row.status === 'Hiệu lực')
  const payments = active.flatMap((row) => row.payments)
  const month = TODAY.slice(0, 7)
  const sum = (list: Payment[], pick: (payment: Payment) => number) => list.reduce((total, payment) => total + pick(payment), 0)
  const overdue = payments.filter((payment) => unpaid(payment) && payment.due < TODAY)
  const soon = payments.filter((payment) => unpaid(payment) && payment.due >= TODAY && payment.due <= SOON)
  const summary = {
    overdue: sum(overdue, (payment) => payment.amount - payment.paid),
    soon: sum(soon, (payment) => payment.amount - payment.paid),
    collected: sum(payments.filter((payment) => payment.paidAt?.startsWith(month)), (payment) => payment.paid),
    remaining: active.reduce((total, row) => total + paymentMetrics(row).remaining, 0),
  }

  // One row per primary contract; its appendices ride along (money and due dates included).
  const groups = visible
    .filter((row) => row.isPrimary || !visible.some((main) => main.isPrimary && main.projectId === row.projectId))
    .map((main) => ({ main, appendices: visible.filter((row) => !row.isPrimary && row !== main && row.projectId === main.projectId) }))
  const list = groups
    .filter(({ main, appendices }) =>
      (!filters.status || main.status === filters.status) &&
      matches([main, ...appendices], filters.collection) &&
      includesText([main.code, main.customer, main.service, ...appendices.map((row) => row.code)], filters.query),
    )
    .sort((a, b) => (actionable([a.main, ...a.appendices])?.due ?? '9999').localeCompare(actionable([b.main, ...b.appendices])?.due ?? '9999'))
  const { rows, page, pages, from, to, goTo, resetPage } = usePagedList(list, PAGE_SIZE)

  const remind = (row: Contract, payment: Payment) => {
    updateProject(row.projectId, (item) => addProjectActivity(item, 'bell', 'Đã nhắc khách thu đợt ' + payment.installment + ' · ' + row.code, shortMoney(payment.amount - payment.paid) + ' · hạn ' + shortDate(payment.due)))
    toast('Đã ghi nhận nhắc thu vào nhật ký dự án.')
  }
  const card = (key: Collection, label: string, value: number, note: string, tone = '') => (
    <button className={('contract-kpi ' + tone + (filters.collection === key && key ? ' is-active' : '')).trim()} onClick={() => change({ collection: filters.collection === key ? '' : key })}>
      <span>{label}</span><b>{shortMoney(value) || '0'}</b><small>{note}</small>
    </button>
  )

  return (
    <section className="screen active" id="contracts">
      <div className="contracts-page contract-control-center">
        <div className="project-page-head contracts-head">
          <div>
            <div className="project-title-line">
              <h1>Hợp đồng &amp; công nợ</h1>
              <button className="project-help" aria-label="Quy tắc hợp đồng" onClick={() => showModal(<InfoModal title="Quy tắc hợp đồng & công nợ" message={RULES} contract />)}>?</button>
            </div>
          </div>
          <button className="primary" onClick={() => showModal(<ContractFormModal />)}><Icon name="file-plus-2" /> Tạo hợp đồng</button>
        </div>

        <section className="contract-kpis">
          {card('overdue', 'Quá hạn', summary.overdue, overdue.length ? overdue.length + ' đợt cần nhắc thu' : 'Không có đợt quá hạn', summary.overdue ? 'attention' : '')}
          {card('soon', 'Sắp thu · 30 ngày', summary.soon, soon.length ? soon.length + ' đợt đến hạn' : 'Không có đợt sắp đến hạn')}
          <div className="contract-kpi static"><span>Đã thu tháng {Number(month.slice(5))}</span><b>{shortMoney(summary.collected) || '0'}</b><small>Theo ngày ghi nhận</small></div>
          <div className="contract-kpi static"><span>Còn phải thu</span><b>{shortMoney(summary.remaining) || '0'}</b><small>{active.length} hợp đồng hiệu lực</small></div>
        </section>

        <section className="project-list-shell contract-list-shell">
          <div className="project-toolbar-new contract-toolbar">
            <label className="project-search-new">
              <Icon name="search" />
              <input type="search" value={filters.query} placeholder="Tìm mã HĐ, khách hàng, gói…" onChange={(event) => change({ query: event.target.value })} />
            </label>
            <select value={filters.collection} onChange={(event) => change({ collection: event.target.value as Collection })} aria-label="Tình trạng thu">
              <option value="">Mọi tình trạng thu</option><option value="overdue">Quá hạn</option><option value="soon">Sắp thu 30 ngày</option><option value="settled">Đã thu đủ</option>
            </select>
            <select value={filters.status} onChange={(event) => change({ status: event.target.value })} aria-label="Trạng thái hợp đồng">
              <option value="">Mọi trạng thái</option><option>Nháp</option><option>Hiệu lực</option><option>Kết thúc</option><option>Đã hủy</option>
            </select>
          </div>
          <div className="project-table-wrap">
            <table className="project-table-new contract-table contract-v2">
              <thead><tr><th>Hợp đồng</th><th>Gói · thời hạn</th><th>Đã thu</th><th>Cần thu</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {rows.map(({ main, appendices }) => {
                  const group = [main, ...appendices]
                  const value = group.reduce((total, row) => total + row.value, 0)
                  const paid = group.reduce((total, row) => total + row.paid, 0)
                  const next = actionable(group)
                  const owner = next ? group.find((row) => row.payments.includes(next))! : main
                  const late = next && next.due < TODAY
                  const pct = value ? Math.min(100, Math.round((paid / value) * 100)) : 0
                  return (
                    <tr key={main.id} onClick={() => showModal(<ContractDetailModal contractId={main.id} />)}>
                      <td>
                        <b className="project-record-name">{main.customer}</b>
                        <span className="project-record-meta">{main.code}{appendices.length ? ' · +' + appendices.length + ' phụ lục' : ''}</span>
                      </td>
                      <td>
                        <span className="cv-service" title={main.service}>{main.service}</span>
                        <span className="project-record-meta">{shortDate(main.start)} – {main.end} · {main.cycles} chu kỳ</span>
                      </td>
                      <td>
                        <span className="pace-bar cv-bar" aria-hidden="true"><i className={late ? 'behind' : 'ahead'} style={{ width: pct + '%' }} /></span>
                        <span className="project-record-meta">{shortMoney(paid) || '0'} / {shortMoney(value)}</span>
                      </td>
                      <td>
                        {next ? (
                          <>
                            <b className={late ? 'is-late' : ''}>{shortMoney(next.amount - next.paid)}</b>
                            <span className={'project-record-meta' + (late ? ' is-late' : '')}>
                              {owner !== main ? owner.code + ' · ' : ''}Đợt {next.installment} · {late ? 'quá ' + diffDays(next.due, TODAY) + ' ngày' : next.due === TODAY ? 'hôm nay' : 'hạn ' + shortDate(next.due)}
                              {paymentState(next) === 'Thu một phần' ? ' · đã thu một phần' : ''}
                            </span>
                            {late && <button type="button" className="text-btn cv-remind" onClick={(event) => { event.stopPropagation(); remind(owner, next) }}>Nhắc khách</button>}
                          </>
                        ) : <span className="project-record-meta">{paymentMetrics(main).remaining ? 'Chưa tới hạn' : 'Đã thu đủ'}</span>}
                      </td>
                      <td><span className={'pill ' + contractTone(main.status)}>{main.status}</span></td>
                    </tr>
                  )
                })}
                {!list.length && <tr><td colSpan={5} className="contract-empty">Không có hợp đồng phù hợp.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="project-footer-new">
            <span>Hiển thị <b>{list.length ? from + '–' + to : 0}</b> trong <b>{list.length}</b> hợp đồng</span>
            <div className="project-pager">
              <button disabled={page === 1} onClick={() => goTo(page - 1)}>‹</button>
              <button disabled>{page} / {pages}</button>
              <button disabled={page === pages} onClick={() => goTo(page + 1)}>›</button>
            </div>
          </footer>
        </section>
      </div>
    </section>
  )
}
