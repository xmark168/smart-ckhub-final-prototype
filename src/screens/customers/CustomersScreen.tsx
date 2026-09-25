import { useApp } from '../../app/context'
import { includesText } from '../../lib/format'
import { usePagedList } from '../../lib/usePagedList'
import { useOutsideClose } from '../../lib/useOutsideClose'
import { useScreenState } from '../../lib/useScreenState'
import { useData } from '../../store/store'
import type { Customer } from '../../store/types'
import { AccountSummaryModal, CreateCustomerModal, CustomerFlowModal, PeriodModal } from './CustomerModals'

type Kpi = 'active' | 'stopped' | 'attention'

interface Filters {
  kpi: Kpi
  query: string
  status: '' | 'active' | 'stopped'
  owner: string
  area: string
  attention: boolean
}

const INITIAL: Filters = { kpi: 'active', query: '', status: '', owner: '', area: '', attention: false }
const PAGE_SIZE = 20

function matches(item: Customer, filters: Filters): boolean {
  const kpi = filters.kpi === 'attention' ? item.attention : item.state === filters.kpi
  return (
    kpi &&
    includesText([item.name, item.owner, item.area], filters.query) &&
    (!filters.status || item.state === filters.status) &&
    (!filters.owner || item.owner === filters.owner) &&
    (!filters.area || item.area === filters.area) &&
    (!filters.attention || item.attention)
  )
}

const GEAR_PATH = 'M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06A1.7 1.7 0 0 0 15.74 19a1.7 1.7 0 0 0-1 1.55V21h-3v-.09A1.7 1.7 0 0 0 10.25 19a1.7 1.7 0 0 0-1.87.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 6.6 15.3 1.7 1.7 0 0 0 5 14.25H4.9v-3H5A1.7 1.7 0 0 0 6.6 10.2a1.7 1.7 0 0 0-.34-1.88L6.2 8.26l2.12-2.12.06.06a1.7 1.7 0 0 0 1.87.34A1.7 1.7 0 0 0 11.25 5V4.9h3V5a1.7 1.7 0 0 0 1 1.54 1.7 1.7 0 0 0 1.87-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.6 1.05h.1v3h-.1a1.7 1.7 0 0 0-1.1.75Z'

export function CustomersScreen() {
  const { openCustomer, showModal } = useApp()
  const { customers } = useData()
  const [filters, setFilters] = useScreenState<Filters>('customers.filters', INITIAL)
  const [filterOpen, setFilterOpen] = useScreenState('customers.filterOpen', false)
  const filterRef = useOutsideClose<HTMLDivElement>(filterOpen, () => setFilterOpen(false))

  const change = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }))
    resetPage()
  }
  const operating = customers.filter((item) => item.state === 'active')
  const stopped = customers.filter((item) => item.state === 'stopped')
  const attention = operating.filter((item) => item.attention)
  const matched = customers.filter((item) => matches(item, filters))
  const { rows, page, pages, from, to, goTo, resetPage } = usePagedList(matched, PAGE_SIZE)
  const owners = Array.from(new Set(customers.map((item) => item.owner))).sort()
  const areas = Array.from(new Set(customers.map((item) => item.area))).sort()
  const activeFilterCount = [filters.status, filters.owner, filters.area, filters.attention].filter(Boolean).length
  const kpiLabel = filters.kpi === 'active' ? 'khách đang vận hành' : filters.kpi === 'stopped' ? 'khách đã dừng' : 'khách cần chú ý'
  const narrowed = filters.query || activeFilterCount

  return (
    <section className="screen active" id="customers">
      <div className="page-head">
        <div>
          <h1>Khách hàng <button className="customer-help" aria-label="Xem quy trình khách hàng" title="Xem quy trình và quy tắc dữ liệu" onClick={() => showModal(<CustomerFlowModal />)}>?</button></h1>
        </div>
        <button className="primary" onClick={() => showModal(<CreateCustomerModal onCreated={() => change({ kpi: 'active' })} />)}>+ Tạo khách hàng</button>
      </div>

      <section className="customer-dashboard">
        <button className={'customer-kpi hero' + (filters.kpi === 'active' ? ' selected' : '')} onClick={() => change({ kpi: 'active' })}>
          <label>Khách đang vận hành</label>
          <strong>{operating.length}</strong>
          <small><span className="positive">↑ {customers.filter((item) => item.newCustomer).length} khách mới</span> kỳ này</small>
          <span
            className="customer-dashboard-settings"
            title="Cài đặt kỳ xem"
            onClick={(event) => { event.stopPropagation(); showModal(<PeriodModal />) }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d={GEAR_PATH} /></svg>
          </span>
        </button>
        <button className={'customer-kpi' + (filters.kpi === 'stopped' ? ' selected' : '')} onClick={() => change({ kpi: 'stopped' })}>
          <label>Khách dừng</label><strong>{stopped.length}</strong><small>Không còn phát sinh vận hành</small>
        </button>
        <button className={'customer-kpi attention' + (filters.kpi === 'attention' ? ' selected' : '')} onClick={() => change({ kpi: 'attention' })}>
          <label>Khách cần chú ý</label><strong>{attention.length}</strong><small>Chu kỳ sắp hết hoặc có rủi ro</small>
        </button>
      </section>

      <section className="customer-list-shell">
        <div className="customer-toolbar">
          <label className="customer-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <input type="search" value={filters.query} placeholder="Tìm khách hàng, Account, khu vực" onChange={(event) => change({ query: event.target.value })} />
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
                  <option value="">Tất cả</option><option value="active">Đang triển khai</option><option value="stopped">Đã dừng</option>
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
            <thead><tr><th>Khách hàng</th><th>Account</th><th>Khu vực</th><th>Chu kỳ</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {rows.map((item) => (
                <tr
                  key={item.id}
                  tabIndex={0}
                  onClick={() => openCustomer(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openCustomer(item.id) }
                  }}
                >
                  <td><span className="customer-name">{item.name}</span><span className="customer-meta">{item.service}</span></td>
                  <td>
                    <button className="customer-account" type="button" onClick={(event) => { event.stopPropagation(); showModal(<AccountSummaryModal owner={item.owner} />) }}>{item.owner}</button>
                  </td>
                  <td>{item.area}</td>
                  <td>{item.cycle}</td>
                  <td>{item.state === 'active' ? <span className="pill ok">Đang triển khai</span> : <span className="pill muted">Đã dừng</span>}</td>
                  <td><button className="customer-open" aria-label={'Mở ' + item.name}>›</button></td>
                </tr>
              ))}
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
