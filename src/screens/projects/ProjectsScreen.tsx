import type { CSSProperties } from 'react'
import { useApp } from '../../app/context'
import { ACCOUNTS, addDaysIso, diffDays, includesText, shortDate, TODAY } from '../../lib/format'
import { usePagedList } from '../../lib/usePagedList'
import { Icon } from '../../lib/icons'
import { useOutsideClose } from '../../lib/useOutsideClose'
import { inScope } from '../../lib/scope'
import { currentCycle, nextActions, projectHealth, runningCycle, type Health, type NextAction } from '../../lib/sop'
import { useScreenState } from '../../lib/useScreenState'
import { useData } from '../../store/store'
import type { Contract, Project, ProjectState, SopParams } from '../../store/types'
import { primaryContract, projectOverdue } from '../../data/contracts'
import { Pager } from '../../ui/Pager'
import { FilterChips } from '../../ui/FilterChips'
import { renewalDue, shortMoney } from '../customers/customerLogic'
import { CreateProjectModal } from './ProjectModals'
import { ProjectRulesModal } from './ProjectRulesModal'
import { onboardingItems, onboardingReady, postProgress, projectLabel, projectTone } from './projectLogic'

/** 'open' = default view (everything except stopped projects). */
type Kpi = 'open' | 'active' | 'week' | 'money' | 'draft' | 'paused' | 'debt' | 'renew'

interface Filters {
  kpi: Kpi
  query: string
  status: '' | ProjectState
  owner: string
  area: string
  sort: 'urgent' | 'name'
}

const INITIAL: Filters = { kpi: 'open', query: '', status: '', owner: '', area: '', sort: 'urgent' }
const PAGE_SIZE = 20
const STATUS_LABEL: Record<ProjectState, string> = { active: 'Đang triển khai', pending: 'Tạm dừng', stopped: 'Đã dừng', draft: 'Dự án nháp' }
const KPI_LABEL: Record<Kpi, string> = {
  open: '', active: 'Đang triển khai', week: 'Cần xử lý trong 7 ngày', money: 'Công nợ & tái ký',
  draft: 'Chờ khởi động', paused: 'Tạm dừng', debt: 'Công nợ quá hạn', renew: 'Sắp hết hợp đồng',
}

/** Everything the dashboard and the list need about one project, computed once. */
interface Row {
  item: Project
  health: Health
  week: NextAction[]
  overdue: number
  renew: boolean
}

function buildRow(item: Project, params: SopParams, contracts: Contract[]): Row {
  const overdue = projectOverdue(contracts, item.id)
  const limit = addDaysIso(TODAY, 7)
  const week = item.state === 'active' ? nextActions(item, params).filter((action) => action.state === 'late' || (action.due && action.due <= limit)) : []
  const contract = primaryContract(contracts, item.id)
  return {
    item,
    health: projectHealth(item, params, TODAY, overdue),
    week,
    overdue,
    renew: item.state === 'active' && Boolean(contract && contract.status === 'Hiệu lực' && renewalDue(item, contract, contracts)),
  }
}

function matchesKpi(row: Row, kpi: Kpi): boolean {
  const state = row.item.state
  if (kpi === 'active') return state === 'active'
  if (kpi === 'week') return row.week.length > 0
  if (kpi === 'money') return row.overdue > 0 || row.renew
  if (kpi === 'debt') return row.overdue > 0
  if (kpi === 'renew') return row.renew
  if (kpi === 'draft') return state === 'draft'
  if (kpi === 'paused') return state === 'pending'
  return state !== 'stopped'
}

const URGENCY: Record<string, number> = { late: 0, watch: 1, ok: 2, paused: 3, draft: 4, finished: 5, stopped: 6 }



/** Media on the running cycle's shootings. */
function partnersOf(item: Project): string {
  const cycle = runningCycle(item)
  const names = new Set<string>()
  cycle?.shootings.forEach((shoot) => shoot.media.forEach((name) => names.add(name)))
  return [...names].join(', ') || '—'
}

/** "trễ 16 ngày" / "hôm nay" / "còn 3 ngày" for a yyyy-mm-dd due date. */
function dueText(due: string): string {
  const days = diffDays(TODAY, due)
  return days < 0 ? 'trễ ' + -days + ' ngày' : days === 0 ? 'hôm nay' : 'còn ' + days + ' ngày'
}

function ProjectRow({ row, params, showOwner, onOpen }: { row: Row; params: SopParams; showOwner: boolean; onOpen: () => void }) {
  const { item, health } = row
  const posts = postProgress(item)
  const next = nextActions(item, params)[0]
  const cycle = currentCycle(item)
  const partners = partnersOf(item)
  const gate = item.state === 'draft' ? onboardingItems(item, params).filter((entry) => entry.required) : []
  // When health is driven by a flag or debt (not by a milestone), say so instead of the next milestone.
  const reasonFirst = item.state === 'active' && health.level === 'watch' && (!next || next.state === 'upcoming' || next.state === 'waiting')
  const pill = item.state === 'active' ? { label: health.label, tone: health.tone } : { label: projectLabel(item), tone: projectTone(item) }
  return (
    <tr onClick={onOpen} className={'health-' + health.level}>
      <td className="c-name">
        <button type="button" className="row-link project-row-title" onClick={(event) => { event.stopPropagation(); onOpen() }}>
          {item.customer} <span className="project-row-service">· {item.service}</span>
        </button>
        <span className="project-record-meta">{item.code}</span>
      </td>
      {showOwner && <td className="c-owner">{item.owner}</td>}
      <td className="c-cycle">
        {cycle && item.total ? (
          <span className="project-cycle-cell">
            <b>{cycle.no}/{item.total}</b>
            <i className="project-cell-bar" aria-hidden="true"><em style={{ width: Math.min(100, (cycle.no / item.total) * 100) + '%' }} /></i>
            <span className="project-record-meta">{cycle.status === 'running' ? 'chốt ' + shortDate(cycle.plannedEnd) : 'đã chốt'}</span>
          </span>
        ) : <span className="project-record-meta">Chưa bắt đầu</span>}
      </td>
      <td className="c-progress">
        {posts ? (
          <div className="project-progress">
            <i style={{ '--progress': Math.min(100, posts.percent) + '%' } as CSSProperties} />
            <span>{posts.published}/{posts.planned} bài</span>
          </div>
        ) : partners !== '—' ? <span className="project-record-meta">Partner: {partners}</span> : <span className="project-record-meta">—</span>}
      </td>
      <td className="c-next">
        {item.state === 'draft' ? (
          <span className="project-next is-due"><b>Cổng khởi động {gate.filter((entry) => entry.ready).length}/{gate.length}</b><span className="project-record-meta">{gate.find((entry) => !entry.ready)?.title ?? 'Đủ điều kiện · bấm Bắt đầu'}</span></span>
        ) : item.state !== 'active' ? (
          <span className="project-record-meta">{health.reason}</span>
        ) : reasonFirst ? (
          <span className="project-next is-due"><b>{health.reason}</b>{next && <span className="project-record-meta">Tiếp theo: {next.label}{next.due ? ' · ' + dueText(next.due) : ''}</span>}</span>
        ) : next ? (
          <span className={'project-next is-' + next.state}>
            <b>{next.label}</b>
            <span className="project-record-meta">{next.due ? dueText(next.due) + ' · ' + shortDate(next.due) : 'chờ bước trước'}</span>
          </span>
        ) : <span className="project-record-meta">{health.reason}</span>}
      </td>
      <td className="c-health"><span className={'pill ' + pill.tone} title={health.reason}>{pill.label}</span></td>
      <td className="c-open" aria-hidden="true"><span className="project-open">›</span></td>
    </tr>
  )
}

export function ProjectsScreen() {
  const { openProject, showModal, role, account } = useApp()
  const data = useData()
  const { params } = data
  const projects = data.projects.filter((item) => inScope(role, account, item))
  const [filters, setFilters] = useScreenState<Filters>('projects.filters', INITIAL)
  const [filterOpen, setFilterOpen] = useScreenState('projects.filterOpen', false)
  const filterRef = useOutsideClose<HTMLDivElement>(filterOpen, () => setFilterOpen(false))

  const change = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }))
    resetPage()
  }
  const toggleKpi = (kpi: Kpi) => change({ kpi: filters.kpi === kpi ? 'open' : kpi })
  const all = projects.map((item) => buildRow(item, params, data.contracts))
  // KPI cards follow the Account / Khu vực filters (useful for BODs looking at one Account).
  const base = all.filter((row) => (!filters.owner || row.item.owner === filters.owner) && (!filters.area || row.item.area === filters.area))
  const active = base.filter((row) => row.item.state === 'active')
  const count = (test: (row: Row) => boolean) => base.filter(test).length
  const levels = { ok: active.filter((row) => row.health.level === 'ok').length, watch: active.filter((row) => row.health.level === 'watch').length, late: active.filter((row) => row.health.level === 'late').length }
  const week = base.filter((row) => row.week.length)
  const weekLate = week.reduce((sum, row) => sum + row.week.filter((action) => action.state === 'late').length, 0)
  const weekDue = week.reduce((sum, row) => sum + row.week.length, 0) - weekLate
  const debtRows = base.filter((row) => row.overdue > 0)
  const debtSum = debtRows.reduce((sum, row) => sum + row.overdue, 0)
  const renewCount = count((row) => row.renew)
  const moneyCount = count((row) => row.overdue > 0 || row.renew)
  const drafts = count((row) => row.item.state === 'draft')
  const ready = count((row) => row.item.state === 'draft' && onboardingReady(row.item, params))
  const paused = count((row) => row.item.state === 'pending')
  const list = all
    .filter(
      ({ item, ...row }) =>
        includesText([item.code, item.customer, item.owner, item.area, item.service], filters.query) &&
        (!filters.status || item.state === filters.status) &&
        (!filters.owner || item.owner === filters.owner) &&
        (!filters.area || item.area === filters.area) &&
        (filters.status === 'stopped' ? true : matchesKpi({ item, ...row }, filters.kpi)),
    )
    .sort((a, b) =>
      filters.sort === 'name'
        ? a.item.customer.localeCompare(b.item.customer, 'vi')
        : (URGENCY[a.health.level] ?? 9) - (URGENCY[b.health.level] ?? 9) || (a.week[0]?.due || '9999').localeCompare(b.week[0]?.due || '9999'),
    )
  const { rows, page, pages, from, to, goTo, resetPage } = usePagedList(list, PAGE_SIZE)
  const areas = Array.from(new Set(projects.map((item) => item.area)))
  const activeFilterCount = [filters.status, filters.owner, filters.area].filter(Boolean).length
  const chips: Array<[string, () => void]> = [
    ...(filters.kpi !== 'open' ? [[KPI_LABEL[filters.kpi], () => toggleKpi(filters.kpi)] as [string, () => void]] : []),
    ...(filters.query.trim() ? [['“' + filters.query.trim() + '”', () => change({ query: '' })] as [string, () => void]] : []),
    ...(filters.status ? [[STATUS_LABEL[filters.status], () => change({ status: '' })] as [string, () => void]] : []),
    ...(filters.owner ? [['Account ' + filters.owner, () => change({ owner: '' })] as [string, () => void]] : []),
    ...(filters.area ? [['Khu vực ' + filters.area, () => change({ area: '' })] as [string, () => void]] : []),
  ]
  const clearAll = () => change({ kpi: 'open', query: '', status: '', owner: '', area: '' })
  const on = (kpi: Kpi) => filters.kpi === kpi
  const showOwner = role !== 'account'

  return (
    <section className="screen active" id="projects">
      <div className="projects-page">
        <div className="project-page-head">
          <h1>Dự án <button className="customer-help" aria-label="Quy tắc dự án" onClick={() => showModal(<ProjectRulesModal />)}>?</button></h1>
          <button className="primary" onClick={() => showModal(<CreateProjectModal onCreated={(id) => openProject(id)} />)}><Icon name="plus" /> Tạo dự án</button>
        </div>

        <section className="project-dashboard project-dashboard-3" aria-label="Tổng quan dự án">
          <div className={'project-kpi hero' + (on('active') ? ' selected' : '')}>
            <button type="button" className="kpi-main" aria-pressed={on('active')} onClick={() => toggleKpi('active')}>
              <span className="kpi-label">Đang triển khai</span>
              <strong>{active.length}</strong>
            </button>
            <span className="health-bar" aria-hidden="true">
              <i className="ok" style={{ flexGrow: levels.ok }} /><i className="watch" style={{ flexGrow: levels.watch }} /><i className="late" style={{ flexGrow: levels.late }} />
            </span>
            <small className="kpi-line health-legend">
              <span className="dot ok" />{levels.ok} đúng tiến độ <span className="dot watch" />{levels.watch} cần theo dõi <span className="dot late" />{levels.late} chậm
            </small>
            <span className="kpi-chips">
              <button type="button" className={'kpi-delta' + (on('draft') ? ' on' : '')} aria-pressed={on('draft')} onClick={() => toggleKpi('draft')}>{drafts} chờ khởi động{drafts ? ' · ' + ready + ' sẵn sàng' : ''}</button>
              <button type="button" className={'kpi-delta' + (on('paused') ? ' on' : '')} aria-pressed={on('paused')} onClick={() => toggleKpi('paused')}>{paused} tạm dừng</button>
            </span>
          </div>
          <button type="button" className={'project-kpi risk' + (on('week') ? ' selected' : '')} aria-pressed={on('week')} onClick={() => toggleKpi('week')}>
            <span className="kpi-label">Cần xử lý trong 7 ngày</span>
            <strong>{week.length}</strong>
            <small className="health-legend">{week.length ? <><span className="dot late" />{weekLate} mốc trễ <span className="dot watch" />{weekDue} sắp đến hạn</> : <><span className="dot ok" />Không có mốc trễ hay đến hạn</>}</small>
          </button>
          <div className={'project-kpi money' + (on('money') || on('debt') || on('renew') ? ' selected' : '')}>
            <button type="button" className="kpi-main" aria-pressed={on('money')} onClick={() => toggleKpi('money')}>
              <span className="kpi-label">Công nợ &amp; tái ký</span>
              <strong>{moneyCount}</strong>
            </button>
            <span className="kpi-chips">
              <button type="button" className={'kpi-chip debt' + (on('debt') ? ' on' : '')} aria-pressed={on('debt')} onClick={() => toggleKpi('debt')}>{debtRows.length} quá hạn{debtSum ? ' · ' + shortMoney(debtSum) : ''}</button>
              <button type="button" className={'kpi-chip renew' + (on('renew') ? ' on' : '')} aria-pressed={on('renew')} onClick={() => toggleKpi('renew')}>{renewCount} sắp hết HĐ</button>
            </span>
          </div>
        </section>

        <section className="project-list-shell">
          <div className="project-toolbar-new">
            <label className="project-search-new">
              <Icon name="search" />
              <input type="search" value={filters.query} aria-label="Tìm dự án" placeholder="Tìm dự án, khách, Account" onChange={(event) => change({ query: event.target.value })} />
            </label>
            <label className="list-sort">
              <span>Sắp xếp</span>
              <select value={filters.sort ?? 'urgent'} onChange={(event) => change({ sort: event.target.value as Filters['sort'] })}>
                <option value="urgent">Gấp nhất trước</option>
                <option value="name">Tên khách A–Z</option>
              </select>
            </label>
            <div className={'project-filter-control' + (filterOpen ? ' open' : '')} ref={filterRef}>
              <button className="project-filter-trigger" type="button" title="Lọc dự án" aria-label={'Lọc dự án' + (activeFilterCount ? ', đang áp dụng ' + activeFilterCount : '')} aria-expanded={filterOpen} aria-controls="projectFilterPanel" onClick={() => setFilterOpen(!filterOpen)}>
                <Icon name="list-filter" />
                {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
              </button>
              <div className="project-filter-popover" id="projectFilterPanel" role="group" aria-label="Bộ lọc dự án">
                <div className="project-filter-popover-head">
                  <b>Lọc dự án</b>
                  <button onClick={() => change({ status: '', owner: '', area: '' })} disabled={!activeFilterCount}>Xóa lọc</button>
                </div>
                <label>Trạng thái
                  <select value={filters.status} onChange={(event) => change({ status: event.target.value as Filters['status'] })}>
                    <option value="">Tất cả</option><option value="active">Đang triển khai</option><option value="pending">Tạm dừng</option><option value="stopped">Đã dừng</option><option value="draft">Dự án nháp</option>
                  </select>
                </label>
                <label>Account
                  <select value={filters.owner} onChange={(event) => change({ owner: event.target.value })}>
                    <option value="">Tất cả Account</option>
                    {ACCOUNTS.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
                  </select>
                </label>
                <label>Khu vực
                  <select value={filters.area} onChange={(event) => change({ area: event.target.value })}>
                    <option value="">Tất cả khu vực</option>
                    {areas.map((area) => <option key={area} value={area}>{area}</option>)}
                  </select>
                </label>
                <p className="filter-note">Dự án đã dừng chỉ hiện khi chọn Trạng thái = Đã dừng.</p>
              </div>
            </div>
          </div>

          <FilterChips chips={chips} onClearAll={clearAll} />
          <div className="project-table-wrap">
            <table className={'project-table-new' + (showOwner ? ' with-owner' : '')}>
              <thead><tr><th>Dự án</th>{showOwner && <th>Account</th>}<th>Chu kỳ</th><th>Tiến độ</th><th>Việc tiếp theo</th><th>Sức khỏe</th><th><span className="sr-only">Mở</span></th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <ProjectRow key={row.item.id} row={row} params={params} showOwner={showOwner} onOpen={() => openProject(row.item.id)} />
                ))}
                {!list.length && (
                  <tr>
                    <td colSpan={showOwner ? 7 : 6} className="list-empty">
                      <b>Không có dự án phù hợp</b>
                      <span>{chips.length ? 'Thử bỏ bớt điều kiện lọc hoặc đổi từ khóa.' : 'Chưa có dự án trong phạm vi của bạn.'}</span>
                      {chips.length > 0 && <button type="button" className="secondary" onClick={clearAll}>Xóa bộ lọc</button>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="project-footer-new">
            <span role="status" aria-live="polite">Hiển thị <b>{list.length ? from + '–' + to : 0}</b> trong <b>{list.length}</b> dự án</span>
            <Pager page={page} pages={pages} goTo={goTo} className="project-pager" />
          </footer>
        </section>
      </div>
    </section>
  )
}
