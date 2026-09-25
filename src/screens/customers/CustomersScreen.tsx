import { useApp } from '../../app/context'
import { includesText } from '../../lib/format'
import { inScope } from '../../lib/scope'
import { currentCycle } from '../../lib/sop'
import { usePagedList } from '../../lib/usePagedList'
import { useOutsideClose } from '../../lib/useOutsideClose'
import { useScreenState } from '../../lib/useScreenState'
import { useData } from '../../store/store'
import type { Customer, Project } from '../../store/types'
import { AccountSummaryModal, CreateCustomerModal, CustomerFlowModal, PeriodModal } from './CustomerModals'
import { attentionReasons, CUSTOMER_STATUS, customerProjects, customerStatus, isNewInPeriod, periodLabel, type CustomerStatus } from './customerLogic'

type Kpi = 'working' | 'ended' | 'attention'

interface Filters {
  kpi: Kpi
  query: string
  status: '' | CustomerStatus
  owner: string
  area: string
  attention: boolean
}

interface Row {
  item: Customer
  status: CustomerStatus
  projects: Project[]
  reasons: string[]
}

const INITIAL: Filters = { kpi: 'working', query: '', status: '', owner: '', area: '', attention: false }
const PAGE_SIZE = 20

function matches(row: Row, filters: Filters): boolean {
  const kpi = filters.kpi === 'attention' ? row.reasons.length > 0 : filters.kpi === 'ended' ? row.status === 'ended' : row.status !== 'ended'
  return (
    kpi &&
    includesText([row.item.name, row.item.owner, row.item.area, ...row.projects.map((project) => project.code)], filters.query) &&
    (!filters.status || row.status === filters.status) &&
    (!filters.owner || row.item.owner === filters.owner) &&
    (!filters.area || row.item.area === filters.area) &&
    (!filters.attention || row.reasons.length > 0)
  )
}

/** "4 / 6" for the running project, or the number of projects. */
function projectSummary(projects: Project[]): [string, string] {
  if (!projects.length) return ['—', 'Hồ sơ mới, chưa lập dự án']
  const main = projects.find((item) => item.state === 'active') ?? projects[0]
  const cycle = currentCycle(main)
  const services = Array.from(new Set(projects.map((item) => item.service))).join(' · ')
  return [(cycle ? 'Chu kỳ ' + cycle.no + ' / ' + (main.total || '–') : 'Chưa bắt đầu') + (projects.length > 1 ? ' · ' + projects.length + ' dự án' : ''), services]
}

const GEAR_PATH = 'M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06A1.7 1.7 0 0 0 15.74 19a1.7 1.7 0 0 0-1 1.55V21h-3v-.09A1.7 1.7 0 0 0 10.25 19a1.7 1.7 0 0 0-1.87.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 6.6 15.3 1.7 1.7 0 0 0 5 14.25H4.9v-3H5A1.7 1.7 0 0 0 6.6 10.2a1.7 1.7 0 0 0-.34-1.88L6.2 8.26l2.12-2.12.06.06a1.7 1.7 0 0 0 1.87.34A1.7 1.7 0 0 0 11.25 5V4.9h3V5a1.7 1.7 0 0 0 1 1.54 1.7 1.7 0 0 0 1.87-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.6 1.05h.1v3h-.1a1.7 1.7 0 0 0-1.1.75Z'

export function CustomersScreen() {
  const { openCustomer, showModal, role, account } = useApp()
  const { customers, projects, contracts, params, period } = useData()
  const [filters, setFilters] = useScreenState<Filters>('customers.filters', INITIAL)
  const [filterOpen, setFilterOpen] = useScreenState('customers.filterOpen', false)
  const filterRef = useOutsideClose<HTMLDivElement>(filterOpen, () => setFilterOpen(false))

  const change = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }))
    resetPage()
  }
  const all: Row[] = customers
    .filter((item) => inScope(role, account, item))
    .map((item) => ({ item, status: customerStatus(item, projects), projects: customerProjects(item, projects), reasons: attentionReasons(item, projects, contracts, params) }))
  const working = all.filter((row) => row.status !== 'ended')
  const ended = all.filter((row) => row.status === 'ended')
  const attention = working.filter((row) => row.reasons.length)
  const fresh = all.filter((row) => isNewInPeriod(row.item, period)).length
  const matched = all.filter((row) => matches(row, filters))
  const { rows, page, pages, from, to, goTo, resetPage } = usePagedList(matched, PAGE_SIZE)
  const owners = Array.from(new Set(all.map((row) => row.item.owner))).sort()
  const areas = Array.from(new Set(all.map((row) => row.item.area))).sort()
  const activeFilterCount = [filters.status, filters.owner, filters.area, filters.attention].filter(Boolean).length
  const kpiLabel = filters.kpi === 'working' ? 'khách hiện hữu' : filters.kpi === 'ended' ? 'khách đã kết thúc' : 'khách cần chú ý'
  const narrowed = filters.query || activeFilterCount

  return (
    <section className="screen active" id="customers">
      <div className="page-head">
        <div>
          <h1>Khách hàng <button className="customer-help" aria-label="Xem quy trình khách hàng" title="Xem quy trình và quy tắc dữ liệu" onClick={() => showModal(<CustomerFlowModal />)}>?</button></h1>
        </div>
        <button className="primary" onClick={() => showModal(<CreateCustomerModal onCreated={(id) => openCustomer(id)} />)}>+ Tạo khách hàng</button>
      </div>

      <section className="customer-dashboard">
        <div
          role="button"
          tabIndex={0}
          className={'customer-kpi hero' + (filters.kpi === 'working' ? ' selected' : '')}
          onClick={() => change({ kpi: 'working' })}
          onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && change({ kpi: 'working' })}
        >
          <label>Khách hiện hữu</label>
          <strong>{working.length}</strong>
          <small>{working.filter((row) => row.status === 'active').length} đang hợp tác · <span className="positive">↑ {fresh} mới</span> {periodLabel(period)}</small>
          <button
            type="button"
            className="customer-dashboard-settings"
            title="Cài đặt kỳ xem"
            aria-label="Cài đặt kỳ xem"
            onClick={(event) => { event.stopPropagation(); showModal(<PeriodModal />) }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d={GEAR_PATH} /></svg>
          </button>
        </div>
        <button className={'customer-kpi' + (filters.kpi === 'ended' ? ' selected' : '')} onClick={() => change({ kpi: 'ended' })}>
          <label>Đã kết thúc hợp tác</label><strong>{ended.length}</strong><small>Chỉ lưu lịch sử để tra cứu</small>
        </button>
        <button className={'customer-kpi attention' + (filters.kpi === 'attention' ? ' selected' : '')} onClick={() => change({ kpi: 'attention' })}>
          <label>Khách cần chú ý</label><strong>{attention.length}</strong><small>Dự án trễ mốc, công nợ quá hạn hoặc gắn cờ</small>
        </button>
      </section>

      <section className="customer-list-shell">
        <div className="customer-toolbar">
          <label className="customer-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <input type="search" value={filters.query} placeholder="Tìm khách hàng, Account, khu vực, mã dự án" onChange={(event) => change({ query: event.target.value })} />
          </label>
          <div className={'customer-filter-control' + (filterOpen ? ' open' : '')} ref={filterRef}>
            <button className="customer-filter-trigger" type="button" aria-label="Lọc khách hàng" title="Lọc khách hàng" onClick={() => setFilterOpen(!filterOpen)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M7 12h10m-7 6h4" /></svg>
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </button>
            <div className="customer-filter-popover">
              <div className="filter-popover-head">
                <b>Lọc khách hàng</b>
                <button type="button" onClick={() => change({ status: '', owner: '', area: '', attention: false })}>Xóa lọc</button>
              </div>
              <label>Trạng thái
                <select value={filters.status} onChange={(event) => change({ status: event.target.value as Filters['status'] })}>
                  <option value="">Tất cả</option>
                  {(Object.keys(CUSTOMER_STATUS) as CustomerStatus[]).map((key) => <option key={key} value={key}>{CUSTOMER_STATUS[key].label}</option>)}
                </select>
              </label>
              <label>Account
                <select value={filters.owner} onChange={(event) => change({ owner: event.target.value })}>
                  <option value="">Tất cả Account</option>
                  {owners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
                </select>
              </label>
              <label>Khu vực
                <select value={filters.area} onChange={(event) => change({ area: event.target.value })}>
                  <option value="">Tất cả khu vực</option>
                  {areas.map((area) => <option key={area} value={area}>{area}</option>)}
                </select>
              </label>
              <label className="filter-check"><input type="checkbox" checked={filters.attention} onChange={(event) => change({ attention: event.target.checked })} /> Chỉ khách cần chú ý</label>
            </div>
          </div>
        </div>

        <div className="customer-table-wrap">
          <table className="customer-table">
            <thead><tr><th>Khách hàng</th><th>Account</th><th>Khu vực</th><th>Dự án</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {rows.map(({ item, status, projects: own, reasons }) => {
                const [cycle, services] = projectSummary(own)
                return (
                  <tr
                    key={item.id}
                    tabIndex={0}
                    onClick={() => openCustomer(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openCustomer(item.id) }
                    }}
                  >
                    <td><span className="customer-name">{item.name}</span><span className="customer-meta">{services}</span></td>
                    <td>
                      <button className="customer-account" type="button" onClick={(event) => { event.stopPropagation(); showModal(<AccountSummaryModal owner={item.owner} />) }}>{item.owner}</button>
                    </td>
                    <td>{item.area}</td>
                    <td>{cycle}</td>
                    <td>
                      <span className={'pill ' + CUSTOMER_STATUS[status].tone}>{CUSTOMER_STATUS[status].label}</span>
                      {reasons.length > 0 && <span className="pill danger" title={reasons.join('\n')}>Cần chú ý</span>}
                    </td>
                    <td><button className="customer-open" aria-label={'Mở ' + item.name}>›</button></td>
                  </tr>
                )
              })}
              {!matched.length && <tr><td colSpan={6}>Không có khách hàng phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>

        <footer className="customer-foot">
          <span className="customer-result-summary">
            {matched.length
              ? <>Hiển thị <b>{from}–{to}</b> trong <b>{matched.length}</b> {narrowed ? 'kết quả phù hợp' : kpiLabel}</>
              : 'Không có khách hàng phù hợp'}
          </span>
          <div className="customer-pager" hidden={pages <= 1}>
            <button disabled={page === 1} onClick={() => goTo(page - 1)}>‹</button>
            <button className="current">{page} / {pages}</button>
            <button disabled={page === pages} onClick={() => goTo(page + 1)}>›</button>
          </div>
        </footer>
      </section>
    </section>
  )
}
