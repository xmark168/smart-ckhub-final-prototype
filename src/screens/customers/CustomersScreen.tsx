import { useApp } from '../../app/context'
import { includesText } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { inScope } from '../../lib/scope'
import { usePagedList } from '../../lib/usePagedList'
import { useOutsideClose } from '../../lib/useOutsideClose'
import { useScreenState } from '../../lib/useScreenState'
import { useData } from '../../store/store'
import { Pager } from '../../ui/Pager'
import { ReasonPill } from './ReasonPill'
import { motionBehavior } from '../../lib/motion'
import type { Customer, Project } from '../../store/types'
import { ProjectCell } from './ProjectCell'
import { ServicesLine } from './ServicesLine'
import { AccountSummaryModal, CreateCustomerModal, CustomerFlowModal, PeriodModal } from './CustomerModals'
import { attentionKind, attentionReasons, CUSTOMER_STATUS, customerProjects, customerStatus, endedInPeriod, isNewInPeriod, periodLabel, type CustomerStatus } from './customerLogic'
import type { Period } from '../../store/types'

type Kpi = 'working' | 'ended' | 'attention' | 'new' | 'endedPeriod'

interface Filters {
  kpi: Kpi
  query: string
  status: '' | CustomerStatus
  owner: string
  area: string
  sort: Sort
}

type Sort = 'name' | 'recent' | 'attention'
const SORTS: Record<Sort, string> = { name: 'Tên A–Z', recent: 'Mới tạo gần đây', attention: 'Cần chú ý trước' }

interface Row {
  item: Customer
  status: CustomerStatus
  projects: Project[]
  reasons: string[]
}

const INITIAL: Filters = { kpi: 'working', query: '', status: '', owner: '', area: '', sort: 'name' }
const PAGE_SIZE = 20

function matchesKpi(row: Row, kpi: Kpi, period: Period): boolean {
  if (kpi === 'attention') return row.reasons.length > 0
  if (kpi === 'ended') return row.status === 'ended'
  if (kpi === 'new') return isNewInPeriod(row.item, period)
  if (kpi === 'endedPeriod') return endedInPeriod(row.item, period)
  return row.status !== 'ended'
}

function matches(row: Row, filters: Filters, period: Period): boolean {
  const kpi = matchesKpi(row, filters.kpi, period)
  return (
    kpi &&
    includesText([row.item.name, row.item.owner, row.item.area, ...row.projects.map((project) => project.code)], filters.query) &&
    (!filters.status || row.status === filters.status) &&
    (!filters.owner || row.item.owner === filters.owner) &&
    (!filters.area || row.item.area === filters.area)
  )
}

function sortRows(rows: Row[], sort: Sort = 'name'): Row[] {
  const byName = (a: Row, b: Row) => a.item.name.localeCompare(b.item.name, 'vi')
  if (sort === 'recent') return [...rows].sort((a, b) => b.item.createdAt.localeCompare(a.item.createdAt) || byName(a, b))
  if (sort === 'attention') return [...rows].sort((a, b) => b.reasons.length - a.reasons.length || byName(a, b))
  return [...rows].sort(byName)
}




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
  /** KPI cards and chips are toggles: clicking the active one returns to all current customers. */
  const toggleKpi = (kpi: Kpi) => change({ kpi: filters.kpi === kpi ? 'working' : kpi })
  const all: Row[] = customers
    .filter((item) => inScope(role, account, item))
    .map((item) => ({ item, status: customerStatus(item, projects), projects: customerProjects(item, projects), reasons: attentionReasons(item, projects, contracts, params) }))
  const working = all.filter((row) => row.status !== 'ended')
  const ended = all.filter((row) => row.status === 'ended')
  const attention = working.filter((row) => row.reasons.length)
  const fresh = all.filter((row) => isNewInPeriod(row.item, period)).length
  const endedNow = all.filter((row) => endedInPeriod(row.item, period)).length
  const reasonKinds = attention.flatMap((row) => Array.from(new Set(row.reasons.map(attentionKind))))
  const kindCount = (kind: string) => reasonKinds.filter((item) => item === kind).length
  const attentionText = [['late', 'trễ mốc'], ['debt', 'công nợ quá hạn'], ['renew', 'sắp hết HĐ'], ['flag', 'gắn cờ']]
    .filter(([kind]) => kindCount(kind))
    .map(([kind, label]) => kindCount(kind) + ' ' + label)
    .join(' · ') || 'Không có khách cần chú ý'
  const matched = sortRows(all.filter((row) => matches(row, filters, period)), filters.sort)
  const { rows, page, pages, from, to, goTo, resetPage } = usePagedList(matched, PAGE_SIZE)
  const owners = Array.from(new Set(all.map((row) => row.item.owner))).sort()
  const areas = Array.from(new Set(all.map((row) => row.item.area))).sort()
  const activeFilterCount = [filters.status, filters.owner, filters.area].filter(Boolean).length
  const kpiLabelOf = (kpi: Kpi) => ({ working: 'khách hiện hữu', ended: 'khách đã kết thúc', attention: 'khách cần chú ý', new: 'khách mới ' + periodLabel(period), endedPeriod: 'khách kết thúc ' + periodLabel(period) })[kpi]
  const kpiLabel = kpiLabelOf(filters.kpi)
  const chips: Array<[string, () => void]> = [
    ...(filters.kpi !== 'working' ? [[kpiLabelOf(filters.kpi), () => toggleKpi(filters.kpi)] as [string, () => void]] : []),
    ...(filters.query.trim() ? [['“' + filters.query.trim() + '”', () => change({ query: '' })] as [string, () => void]] : []),
    ...(filters.status ? [[CUSTOMER_STATUS[filters.status].label, () => change({ status: '' })] as [string, () => void]] : []),
    ...(filters.owner ? [['Account ' + filters.owner, () => change({ owner: '' })] as [string, () => void]] : []),
    ...(filters.area ? [['Khu vực ' + filters.area, () => change({ area: '' })] as [string, () => void]] : []),
  ]
  const clearAll = () => change({ kpi: 'working', query: '', status: '', owner: '', area: '' })
  const narrowed = filters.query || activeFilterCount

  return (
    <section className="screen active" id="customers">
      <div className="page-head">
        <div>
          <h1>Khách hàng <button className="customer-help" aria-label="Xem quy trình khách hàng" title="Xem quy trình và quy tắc dữ liệu" onClick={() => showModal(<CustomerFlowModal />)}>?</button></h1>
        </div>
        <button className="period-chip" type="button" title="Đổi kỳ xem" onClick={() => showModal(<PeriodModal />)}>
          <Icon name="calendar-days" /> {period.mode === 'year' ? 'Năm ' + period.year : 'Tháng ' + period.month + '/' + period.year} <Icon name="chevron-down" />
        </button>
        <button className="primary" onClick={() => showModal(<CreateCustomerModal onCreated={(id) => openCustomer(id)} />)}>+ Tạo khách hàng</button>
      </div>

      <section className="customer-dashboard">
        <div className={'customer-kpi hero' + (filters.kpi === 'working' ? ' selected' : '')}>
          <button type="button" className="kpi-main" aria-pressed={filters.kpi === 'working'} onClick={() => change({ kpi: 'working' })}>
            <span className="kpi-label">Khách hiện hữu · hôm nay</span>
            <strong>{working.length}</strong>
          </button>
          <small className="kpi-deltas">
            {working.filter((row) => row.status === 'active').length} đang hợp tác ·{' '}
            <button type="button" className={'kpi-delta positive' + (filters.kpi === 'new' ? ' on' : '')} aria-pressed={filters.kpi === 'new'} aria-label={fresh + ' khách mới ' + periodLabel(period) + ', lọc danh sách'} onClick={() => toggleKpi('new')}>+{fresh} mới</button>{' '}
            <button type="button" className={'kpi-delta negative' + (filters.kpi === 'endedPeriod' ? ' on' : '')} aria-pressed={filters.kpi === 'endedPeriod'} aria-label={endedNow + ' khách kết thúc ' + periodLabel(period) + ', lọc danh sách'} onClick={() => toggleKpi('endedPeriod')}>−{endedNow} kết thúc</button>{' '}
            {periodLabel(period)}
          </small>
        </div>
        <div className={'customer-kpi' + (filters.kpi === 'endedPeriod' ? ' selected' : '')}>
          <button type="button" className="kpi-main" aria-pressed={filters.kpi === 'endedPeriod'} onClick={() => toggleKpi('endedPeriod')}>
            <span className="kpi-label">Kết thúc hợp tác {periodLabel(period)}</span><strong>{endedNow}</strong>
          </button>
          <small>Tổng từ trước đến nay: <button type="button" className="kpi-link" aria-pressed={filters.kpi === 'ended'} onClick={() => toggleKpi('ended')}>{ended.length} khách</button></small>
        </div>
        <button className={'customer-kpi attention' + (filters.kpi === 'attention' ? ' selected' : '')} aria-pressed={filters.kpi === 'attention'} onClick={() => toggleKpi('attention')}>
          <span className="kpi-label">Khách cần chú ý</span><strong>{attention.length}</strong><small>{attentionText}</small>
        </button>
      </section>

      <section className="customer-list-shell" aria-labelledby="customerListTitle">
        <h2 id="customerListTitle" className="sr-only">Danh sách khách hàng</h2>
        <div className="customer-toolbar">
          <label className="customer-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <input
              type="text"
              value={filters.query}
              placeholder="Tìm tên khách, Account, khu vực, mã dự án (không cần dấu)"
              aria-label="Tìm khách hàng"
              onChange={(event) => change({ query: event.target.value })}
              onKeyDown={(event) => event.key === 'Escape' && change({ query: '' })}
            />
            {filters.query && <button type="button" className="search-clear" aria-label="Xóa tìm kiếm" onClick={() => change({ query: '' })}>×</button>}
          </label>
          <label className="list-sort">
            <span>Sắp xếp</span>
            <select value={filters.sort ?? 'name'} onChange={(event) => change({ sort: event.target.value as Sort })}>
              {(Object.keys(SORTS) as Sort[]).map((key) => <option key={key} value={key}>{SORTS[key]}</option>)}
            </select>
          </label>
          <div className={'customer-filter-control' + (filterOpen ? ' open' : '')} ref={filterRef}>
            <button className="customer-filter-trigger" type="button" aria-label={'Lọc khách hàng' + (activeFilterCount ? ', đang áp dụng ' + activeFilterCount : '')} aria-expanded={filterOpen} aria-controls="customerFilterPanel" title="Lọc khách hàng" onClick={() => setFilterOpen(!filterOpen)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M7 12h10m-7 6h4" /></svg>
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </button>
            <div className="customer-filter-popover" id="customerFilterPanel" role="group" aria-label="Bộ lọc khách hàng">
              <div className="filter-popover-head">
                <b>Lọc khách hàng</b>
                <button type="button" disabled={!activeFilterCount} onClick={() => change({ status: '', owner: '', area: '' })}>Xóa lọc</button>
              </div>
              <label>Trạng thái
                <select value={filters.status} onChange={(event) => change({ status: event.target.value as Filters['status'] })}>
                  <option value="">Tất cả</option>
                  {(Object.keys(CUSTOMER_STATUS) as CustomerStatus[]).map((key) => <option key={key} value={key}>{CUSTOMER_STATUS[key].label}</option>)}
                </select>
              </label>
              {owners.length > 1 && (
                <label>Account
                  <select value={filters.owner} onChange={(event) => change({ owner: event.target.value })}>
                    <option value="">Tất cả Account</option>
                    {owners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
                  </select>
                </label>
              )}
              <label>Khu vực
                <select value={filters.area} onChange={(event) => change({ area: event.target.value })}>
                  <option value="">Tất cả khu vực</option>
                  {areas.map((area) => <option key={area} value={area}>{area}</option>)}
                </select>
              </label>
              <p className="filter-note">Khách cần chú ý, khách mới, khách kết thúc: bấm các thẻ số ở trên.</p>
            </div>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="kpi-filter-bar" role="group" aria-label="Điều kiện đang lọc">
            Đang lọc:
            {chips.map(([label, clear]) => (
              <span className="kpi-filter-tag" key={label}>{label} <button type="button" aria-label={'Bỏ ' + label} onClick={clear}>×</button></span>
            ))}
            {chips.length > 1 && <button type="button" className="text-btn" onClick={clearAll}>Xóa tất cả</button>}
          </div>
        )}
        <div className="customer-table-wrap">
          <table className="customer-table">
            <thead><tr><th>Khách hàng</th><th>Account</th><th>Khu vực</th><th title="Chu kỳ hiện tại / tổng chu kỳ hợp đồng của dự án chính; +N là số dự án khác">Chu kỳ</th><th>Trạng thái</th><th><span className="sr-only">Mở</span></th></tr></thead>
            <tbody>
              {rows.map(({ item, status, projects: own, reasons }) => {
                return (
                  <tr key={item.id} onClick={() => openCustomer(item.id)}>
                    <td>
                      <button type="button" className="customer-name row-link" onClick={(event) => { event.stopPropagation(); openCustomer(item.id) }}>{item.name}</button>
                      <ServicesLine projects={own} />
                    </td>
                    <td data-label="Account">
                      <button className="customer-account" type="button" aria-label={'Tóm tắt Account ' + item.owner} onClick={(event) => { event.stopPropagation(); showModal(<AccountSummaryModal owner={item.owner} />) }}>{item.owner}</button>
                    </td>
                    <td data-label="Khu vực">{item.area}</td>
                    <td data-label="Chu kỳ"><ProjectCell projects={own} /></td>
                    <td data-label="Trạng thái">
                      <span className={'pill ' + CUSTOMER_STATUS[status].tone}>{CUSTOMER_STATUS[status].label}</span>
                      {reasons.length > 0 && <ReasonPill reasons={reasons} />}
                    </td>
                    <td><span className="customer-open" aria-hidden="true">›</span></td>
                  </tr>
                )
              })}
              {!matched.length && (
                <tr>
                  <td colSpan={6} className="list-empty">
                    <b>Không có khách hàng phù hợp</b>
                    <span>{chips.length ? 'Thử bỏ bớt điều kiện lọc hoặc đổi từ khóa.' : 'Chưa có khách hàng trong phạm vi của bạn.'}</span>
                    {chips.length > 0 && <button type="button" className="secondary" onClick={clearAll}>Xóa bộ lọc</button>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="customer-foot">
          <span className="customer-result-summary" role="status" aria-live="polite">
            {matched.length
              ? <>Hiển thị <b>{from}–{to}</b> trong <b>{matched.length}</b> {narrowed ? 'kết quả phù hợp' : kpiLabel}</>
              : 'Không có khách hàng phù hợp'}
          </span>
          <Pager page={page} pages={pages} goTo={(next) => { goTo(next); document.querySelector('#customers .customer-list-shell')?.scrollIntoView({ block: 'start', behavior: motionBehavior() }) }} />
        </footer>
      </section>
    </section>
  )
}
