import { useApp } from '../../app/context'
import { includesText, TODAY } from '../../lib/format'
import { update } from '../../store/store'
import { Icon } from '../../lib/icons'
import { inScope } from '../../lib/scope'
import { currentCycle } from '../../lib/sop'
import { usePagedList } from '../../lib/usePagedList'
import { useOutsideClose } from '../../lib/useOutsideClose'
import { useScreenState } from '../../lib/useScreenState'
import { useData } from '../../store/store'
import type { Customer, Project } from '../../store/types'
import { AccountSummaryModal, CreateCustomerModal, CustomerFlowModal, PeriodModal } from './CustomerModals'
import { activeInPeriod, attentionKind, defaultPeriod, isDefaultPeriod, attentionReasons, CUSTOMER_STATUS, customerProjects, customerStatus, endedInPeriod, isNewInPeriod, periodLabel, type CustomerStatus } from './customerLogic'
import type { Period } from '../../store/types'

type Kpi = 'working' | 'ended' | 'attention' | 'new' | 'endedPeriod'

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

function matchesKpi(row: Row, kpi: Kpi, period: Period, periodFilter: boolean): boolean {
  if (kpi === 'attention') return row.reasons.length > 0
  if (kpi === 'ended') return row.status === 'ended'
  if (kpi === 'new') return isNewInPeriod(row.item, period)
  if (kpi === 'endedPeriod') return endedInPeriod(row.item, period)
  return periodFilter || row.status !== 'ended'
}

function matches(row: Row, filters: Filters, period: Period, periodFilter: boolean): boolean {
  const kpi = matchesKpi(row, filters.kpi, period, periodFilter)
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
  const periodFilter = !isDefaultPeriod(period, TODAY)
  const resetPeriod = () => update((draft) => { draft.period = defaultPeriod(TODAY) })
  const all: Row[] = customers
    .filter((item) => inScope(role, account, item) && (!periodFilter || activeInPeriod(item, period)))
    .map((item) => ({ item, status: customerStatus(item, projects), projects: customerProjects(item, projects), reasons: attentionReasons(item, projects, contracts, params) }))
  const working = periodFilter ? all : all.filter((row) => row.status !== 'ended')
  const ended = all.filter((row) => row.status === 'ended')
  const attention = working.filter((row) => row.reasons.length)
  const fresh = all.filter((row) => isNewInPeriod(row.item, period)).length
  const endedNow = all.filter((row) => endedInPeriod(row.item, period)).length
  const reasonKinds = attention.flatMap((row) => Array.from(new Set(row.reasons.map(attentionKind))))
  const kindCount = (kind: string) => reasonKinds.filter((item) => item === kind).length
  const attentionText = [['late', 'trễ mốc'], ['debt', 'công nợ quá hạn'], ['flag', 'gắn cờ']]
    .filter(([kind]) => kindCount(kind))
    .map(([kind, label]) => kindCount(kind) + ' ' + label)
    .join(' · ') || 'Không có khách cần chú ý'
  const matched = all.filter((row) => matches(row, filters, period, periodFilter))
  const { rows, page, pages, from, to, goTo, resetPage } = usePagedList(matched, PAGE_SIZE)
  const owners = Array.from(new Set(all.map((row) => row.item.owner))).sort()
  const areas = Array.from(new Set(all.map((row) => row.item.area))).sort()
  const activeFilterCount = [filters.status, filters.owner, filters.area, filters.attention].filter(Boolean).length
  const kpiLabel = { working: periodFilter ? 'khách hợp tác ' + periodLabel(period) : 'khách hiện hữu', ended: 'khách đã kết thúc', attention: 'khách cần chú ý', new: 'khách mới ' + periodLabel(period), endedPeriod: 'khách kết thúc ' + periodLabel(period) }[filters.kpi]
  const narrowed = filters.query || activeFilterCount

  return (
    <section className="screen active" id="customers">
      <div className="page-head">
        <div>
          <h1>Khách hàng <button className="customer-help" aria-label="Xem quy trình khách hàng" title="Xem quy trình và quy tắc dữ liệu" onClick={() => showModal(<CustomerFlowModal />)}>?</button></h1>
        </div>
        <span className={'period-chip-wrap' + (periodFilter ? ' on' : '')}>
          <button className="period-chip" type="button" title="Đổi kỳ xem" onClick={() => showModal(<PeriodModal />)}>
            <Icon name="calendar-days" /> {period.mode === 'year' ? 'Năm ' + period.year : 'Tháng ' + period.month + '/' + period.year} <Icon name="chevron-down" />
          </button>
          {periodFilter && <button className="period-chip-clear" type="button" aria-label="Về năm nay" title="Về năm nay" onClick={resetPeriod}>×</button>}
        </span>
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
          <label>{periodFilter ? 'Khách hợp tác ' + periodLabel(period) : 'Khách hiện hữu · hôm nay'}</label>
          <strong>{working.length}</strong>
          <small className="kpi-deltas">
            {working.filter((row) => row.status === 'active').length} đang hợp tác ·{' '}
            <button type="button" className={'kpi-delta positive' + (filters.kpi === 'new' ? ' on' : '')} title="Lọc khách mới trong kỳ" onClick={(event) => { event.stopPropagation(); toggleKpi('new') }}>+{fresh} mới</button>{' '}
            <button type="button" className={'kpi-delta negative' + (filters.kpi === 'endedPeriod' ? ' on' : '')} title="Lọc khách kết thúc trong kỳ" onClick={(event) => { event.stopPropagation(); toggleKpi('endedPeriod') }}>−{endedNow} kết thúc</button>{' '}
            {periodLabel(period)}
          </small>
        </div>
        <button className={'customer-kpi' + (filters.kpi === 'endedPeriod' ? ' selected' : '')} onClick={() => toggleKpi('endedPeriod')}>
          <label>Kết thúc hợp tác {periodLabel(period)}</label><strong>{endedNow}</strong>
          <small>Tổng từ trước đến nay: <span className="kpi-link" role="link" onClick={(event) => { event.stopPropagation(); toggleKpi('ended') }}>{ended.length} khách</span></small>
        </button>
        <button className={'customer-kpi attention' + (filters.kpi === 'attention' ? ' selected' : '')} onClick={() => toggleKpi('attention')}>
          <label>Khách cần chú ý</label><strong>{attention.length}</strong><small>{attentionText}</small>
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

        {(filters.kpi !== 'working' || periodFilter) && (
          <div className="kpi-filter-bar">
            Đang lọc:
            {periodFilter && <span className="kpi-filter-tag">Kỳ {periodLabel(period)} <button type="button" aria-label="Về năm nay" onClick={resetPeriod}>×</button></span>}
            {filters.kpi !== 'working' && <span className="kpi-filter-tag">{kpiLabel} <button type="button" aria-label="Bỏ lọc" onClick={() => toggleKpi(filters.kpi)}>×</button></span>}
          </div>
        )}
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
