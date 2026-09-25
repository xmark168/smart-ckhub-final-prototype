import { useApp } from '../../app/context'
import { contractTone, paymentMetrics, paymentState, paymentTone } from '../../data/contracts'
import { formatDate, includesText, money, pageSlice, parseInput } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { useScreenState } from '../../lib/useScreenState'
import { useData } from '../../store/store'
import type { Contract } from '../../store/types'
import { InfoModal } from '../../ui/Modal'
import { ContractDetailModal, ContractFormModal } from './ContractModals'

type Collection = '' | 'overdue' | 'due' | 'future' | 'settled'

interface Filters {
  query: string
  status: string
  collection: Collection
  page: number
}

const INITIAL: Filters = { query: '', status: '', collection: '', page: 1 }
const PAGE_SIZE = 10

const RULES =
  'Một dự án có thể có nhiều hợp đồng hoặc phụ lục. Hợp đồng có nhiều đợt thanh toán. Công nợ chỉ là phần chưa thu của đợt đã đến hạn; đợt tương lai là phải thu. Mỗi khoản thu cần mã chứng từ và có thể gắn link Drive.'

function matchesCollection(row: Contract, collection: Collection): boolean {
  const metrics = paymentMetrics(row)
  if (collection === 'overdue') return metrics.overdue > 0
  if (collection === 'due') return metrics.dueToday > 0
  if (collection === 'future') return metrics.future > 0 && !metrics.overdue && !metrics.dueToday
  if (collection === 'settled') return metrics.remaining === 0
  return true
}

function NextPayment({ row }: { row: Contract }) {
  const next = paymentMetrics(row).next
  if (!next) return <><b className="contract-settled">Đã thu đủ</b><span className="project-record-meta">Không còn đợt cần thu</span></>
  const status = paymentState(next)
  return (
    <>
      <b>{money(Math.max(0, next.amount - next.paid))}</b>
      <span className="project-record-meta">Đợt {next.installment} · {formatDate(parseInput(next.due))}</span>
      <span className={'pill ' + paymentTone(status)}>{status}</span>
    </>
  )
}

export function ContractsScreen() {
  const { showModal } = useApp()
  const { contracts } = useData()
  const [filters, setFilters] = useScreenState<Filters>('contracts.filters', INITIAL)
  const change = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, page: 1, ...patch }))

  const summary = contracts
    .filter((row) => row.status === 'Hiệu lực')
    .reduce(
      (all, row) => {
        const metrics = paymentMetrics(row)
        all.overdue += metrics.overdue
        all.dueToday += metrics.dueToday
        all.future += metrics.future
        all.collected += row.paid
        all.overdueCount += row.payments.filter((payment) => paymentState(payment) === 'Quá hạn').length
        all.dueCount += row.payments.filter((payment) => paymentState(payment) === 'Đến hạn').length
        return all
      },
      { overdue: 0, dueToday: 0, future: 0, collected: 0, overdueCount: 0, dueCount: 0 },
    )
  const list = contracts.filter(
    (row) =>
      (!filters.status || row.status === filters.status) &&
      matchesCollection(row, filters.collection) &&
      includesText([row.code, row.customer, row.project, row.service, row.type], filters.query),
  )
  const { rows, page, pages, from, to } = pageSlice(list, filters.page, PAGE_SIZE)
  const card = (key: Collection, label: string, value: number, note: string, tone = '') => (
    <button className={('contract-kpi ' + tone).trim()} onClick={() => change({ collection: key })}>
      <span>{label}</span><b>{money(value)}</b><small>{note}</small>
    </button>
  )

  return (
    <section className="screen active" id="contracts">
      <div className="contracts-page contract-control-center">
        <div className="project-page-head">
          <div>
            <div className="project-title-line">
              <h1>Hợp đồng &amp; công nợ</h1>
              <button className="project-help" aria-label="Quy tắc hợp đồng" onClick={() => showModal(<InfoModal title="Quy tắc hợp đồng & công nợ" message={RULES} contract />)}>?</button>
            </div>
            <p>Theo dõi từng đợt thanh toán. Khoản chưa đến hạn là phải thu, không phải công nợ.</p>
          </div>
          <button className="primary" onClick={() => showModal(<ContractFormModal />)}><Icon name="file-plus-2" /> Tạo hợp đồng</button>
        </div>

        <section className="contract-kpis">
          {card('overdue', 'Quá hạn', summary.overdue, summary.overdueCount ? summary.overdueCount + ' đợt cần xử lý' : 'Không có đợt quá hạn', 'attention')}
          {card('due', 'Đến hạn hôm nay', summary.dueToday, summary.dueCount ? summary.dueCount + ' đợt cần xác nhận' : 'Không có đợt đến hạn')}
          {card('future', 'Chưa đến hạn', summary.future, 'Theo lịch điều khoản hợp đồng')}
          {card('settled', 'Đã ghi nhận', summary.collected, 'Tổng tiền đã thu thực tế')}
        </section>

        <section className="project-list-shell contract-list-shell">
          <div className="contract-list-heading">
            <div><h2>Danh sách hợp đồng</h2><p>Chọn hợp đồng để xem lịch thu, chứng từ và ghi nhận khoản thu.</p></div>
            <span>{list.length} hợp đồng</span>
          </div>
          <div className="project-toolbar-new contract-toolbar">
            <label className="project-search-new">
              <Icon name="search" />
              <input type="search" value={filters.query} placeholder="Tìm mã HĐ, khách hàng, gói dịch vụ…" onChange={(event) => change({ query: event.target.value })} />
            </label>
            <select value={filters.status} onChange={(event) => change({ status: event.target.value })}>
              <option value="">Tất cả trạng thái HĐ</option><option>Nháp</option><option>Hiệu lực</option><option>Kết thúc</option><option>Đã hủy</option>
            </select>
            <select value={filters.collection} onChange={(event) => change({ collection: event.target.value as Collection })}>
              <option value="">Tất cả tình trạng thu</option><option value="overdue">Quá hạn</option><option value="due">Đến hạn hôm nay</option><option value="future">Chưa đến hạn</option><option value="settled">Đã thu đủ</option>
            </select>
          </div>
          <div className="project-table-wrap">
            <table className="project-table-new contract-table contract-control-table">
              <thead><tr><th>Hợp đồng</th><th>Khách hàng</th><th>Đợt cần xử lý</th><th>Giá trị &amp; thời hạn</th><th>Đã thu / còn lại</th><th>Trạng thái HĐ</th><th /></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} onClick={() => showModal(<ContractDetailModal contractId={row.id} />)}>
                    <td><b>{row.code}</b><span className="project-record-meta">{row.isPrimary ? 'Hợp đồng chính' : row.type} · {row.cycles} chu kỳ</span></td>
                    <td><span className="project-record-name">{row.customer}</span><span className="project-record-meta">{row.service || 'Chưa có dịch vụ áp dụng'}</span></td>
                    <td className="contract-next-payment"><NextPayment row={row} /></td>
                    <td><b>{money(row.value)}</b><span className="project-record-meta">{formatDate(parseInput(row.start))} – {row.end}</span></td>
                    <td><b>{money(row.paid)}</b><span className="project-record-meta">Còn {money(paymentMetrics(row).remaining)}</span></td>
                    <td><span className={'pill ' + contractTone(row.status)}>{row.status}</span></td>
                    <td><button className="project-open" aria-label={'Mở ' + row.code}>›</button></td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={7} className="contract-empty">Không có hợp đồng phù hợp với bộ lọc.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="project-footer-new">
            <span>Hiển thị <b>{list.length ? from + '–' + to : 0}</b> trong <b>{list.length}</b> hợp đồng</span>
            <div className="project-pager">
              <button disabled={page === 1} onClick={() => setFilters({ ...filters, page: page - 1 })}>‹</button>
              <button disabled>{page} / {pages}</button>
              <button disabled={page === pages} onClick={() => setFilters({ ...filters, page: page + 1 })}>›</button>
            </div>
          </footer>
        </section>
      </div>
    </section>
  )
}
