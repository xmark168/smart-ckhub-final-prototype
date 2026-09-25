import type { CSSProperties } from 'react'
import { useApp } from '../../app/context'
import { ACCOUNTS, includesText, shortDate } from '../../lib/format'
import { usePagedList } from '../../lib/usePagedList'
import { Icon } from '../../lib/icons'
import { useOutsideClose } from '../../lib/useOutsideClose'
import { inScope } from '../../lib/scope'
import { MILESTONE_TONE, nextActions, projectHealth } from '../../lib/sop'
import { useScreenState } from '../../lib/useScreenState'
import { useData } from '../../store/store'
import type { Project, ProjectState, SopParams } from '../../store/types'
import { InfoModal } from '../../ui/Modal'
import { CreateProjectModal } from './ProjectModals'
import { cycleCounter, cycleRange, postProgress, projectLabel, projectTone } from './projectLogic'

type Kpi = 'all' | 'active' | 'risk' | 'paused' | 'draft'

interface Filters {
  kpi: Kpi
  query: string
  status: '' | ProjectState
  owner: string
  area: string
  risk: boolean
}

const INITIAL: Filters = { kpi: 'all', query: '', status: '', owner: '', area: '', risk: false }
const PAGE_SIZE = 20

const PROJECT_RULES =
  'Mỗi dự án thuộc một khách hàng và một Account phụ trách. Dự án nháp chỉ được bắt đầu (T0) khi Cổng khởi động đủ điều kiện: hợp đồng chính, cọc, Sales Brief và brief khách hàng. Mốc Content Plan, Shooting Plan, Post Demo và nhịp đăng tự tính từ T0 theo Tham số vận hành. "Có rủi ro" gồm dự án có mốc trễ hoặc được gắn cờ tay. Account chỉ thấy dự án mình phụ trách hoặc tạo. Khách không chốt thì Hủy nháp (dự án chuyển sang Đã dừng, giữ lịch sử); sau đó mới kết thúc hợp tác với khách được.'

function atRisk(item: Project, params: SopParams): boolean {
  return item.state === 'active' && (item.risk || projectHealth(item, params).level === 'late')
}

function matchesKpi(item: Project, kpi: Kpi, params: SopParams): boolean {
  if (kpi === 'active') return item.state === 'active'
  if (kpi === 'risk') return atRisk(item, params)
  if (kpi === 'paused') return item.state === 'pending' || item.state === 'stopped'
  if (kpi === 'draft') return item.state === 'draft'
  return true
}

function ProjectRow({ item, params, onOpen }: { item: Project; params: SopParams; onOpen: () => void }) {
  const posts = postProgress(item)
  const next = nextActions(item, params)[0]
  const health = projectHealth(item, params)
  return (
    <tr onClick={onOpen}>
      <td><span className="project-record-name">{item.customer}</span><span className="project-record-meta">{item.code} · {item.service}</span></td>
      <td>{item.owner}</td>
      <td><b>{cycleCounter(item)}</b><span className="project-record-meta">{cycleRange(item)}</span></td>
      <td>
        {posts ? (
          <div className="project-progress">
            <i style={{ '--progress': Math.min(100, posts.percent) + '%' } as CSSProperties} />
            <span>{posts.published}/{posts.planned}</span>
          </div>
        ) : '—'}
      </td>
      <td>
        {next ? (
          <span className={'project-next is-' + next.state}>
            <b>{next.label}</b>
            <span className="project-record-meta">{next.due ? 'hạn ' + shortDate(next.due) : 'chờ bước trước'}</span>
          </span>
        ) : <span className="project-record-meta">{health.reason}</span>}
      </td>
      <td>{item.team.media.join(', ') || '—'}</td>
      <td>
        <span className={'pill ' + projectTone(item)}>{projectLabel(item)}</span>
        {item.state === 'active' && health.level !== 'ok' && <span className={'pill ' + (next ? MILESTONE_TONE[next.state] : health.tone)} title={health.reason}>{health.label}</span>}
      </td>
      <td><button className="project-open" aria-label={'Mở ' + item.customer}>›</button></td>
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
  const active = projects.filter((item) => item.state === 'active')
  const risk = active.filter((item) => atRisk(item, params))
  const paused = projects.filter((item) => item.state === 'pending' || item.state === 'stopped')
  const drafts = projects.filter((item) => item.state === 'draft')
  const list = projects.filter(
    (item) =>
      includesText([item.code, item.customer, item.owner, item.area, item.service], filters.query) &&
      (!filters.status || item.state === filters.status) &&
      (!filters.owner || item.owner === filters.owner) &&
      (!filters.area || item.area === filters.area) &&
      (!filters.risk || atRisk(item, params)) &&
      matchesKpi(item, filters.kpi, params),
  )
  const { rows, page, pages, from, to, goTo, resetPage } = usePagedList(list, PAGE_SIZE)
  const areas = Array.from(new Set(projects.map((item) => item.area)))
  const activeFilterCount = [filters.status, filters.owner, filters.area, filters.risk].filter(Boolean).length
  const kpiClass = (kpi: Kpi, extra = '') => ('project-kpi ' + extra + (filters.kpi === kpi ? ' selected' : '')).replace(/\s+/g, ' ').trim()

  return (
    <section className="screen active" id="projects">
      <div className="projects-page">
        <div className="project-page-head">
          <h1>Dự án <button className="customer-help" aria-label="Quy tắc dự án" onClick={() => showModal(<InfoModal title="Quy tắc dự án" message={PROJECT_RULES} />)}>?</button></h1>
          <button className="primary" onClick={() => showModal(<CreateProjectModal onCreated={(id) => openProject(id)} />)}><Icon name="plus" /> Tạo dự án</button>
        </div>

        <section className="project-dashboard">
          <button className={kpiClass('active', 'hero')} onClick={() => change({ kpi: 'active' })}><label>Đang triển khai</label><strong>{active.length}</strong><small>{risk.length} dự án cần theo dõi</small></button>
          <button className={kpiClass('risk', 'risk')} onClick={() => change({ kpi: 'risk' })}><label>Có rủi ro</label><strong>{risk.length}</strong><small>Có mốc SOP trễ hoặc gắn cờ</small></button>
          <button className={kpiClass('paused')} onClick={() => change({ kpi: 'paused' })}><label>Tạm dừng / đã dừng</label><strong>{paused.length}</strong><small>Không tự đổi tiến độ hợp đồng</small></button>
          <button className={kpiClass('draft')} onClick={() => change({ kpi: 'draft' })}><label>Dự án nháp</label><strong>{drafts.length}</strong><small>Cần hoàn tất Cổng khởi động</small></button>
        </section>

        <section className="project-list-shell">
          <div className="project-toolbar-new">
            <label className="project-search-new">
              <Icon name="search" />
              <input type="search" value={filters.query} placeholder="Tìm mã dự án, khách hàng, Account…" onChange={(event) => change({ query: event.target.value })} />
            </label>
            <div className={'project-filter-control' + (filterOpen ? ' open' : '')} ref={filterRef}>
              <button className="project-filter-trigger" title="Lọc dự án" onClick={() => setFilterOpen(!filterOpen)}>
                <Icon name="list-filter" />
                {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
              </button>
              <div className="project-filter-popover">
                <div className="project-filter-popover-head">
                  <b>Lọc dự án</b>
                  <button onClick={() => change({ status: '', owner: '', area: '', risk: false })}>Xóa lọc</button>
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
                <label className="filter-check"><input type="checkbox" checked={filters.risk} onChange={(event) => change({ risk: event.target.checked })} /> Chỉ dự án có rủi ro</label>
              </div>
            </div>
          </div>

          <div className="project-table-wrap">
            <table className="project-table-new">
              <thead><tr><th>Dự án</th><th>Account</th><th>Chu kỳ</th><th>Bài đăng</th><th>Mốc tiếp theo</th><th>Media</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>
                {rows.map((item) => (
                  <ProjectRow key={item.id} item={item} params={params} onOpen={() => openProject(item.id)} />
                ))}
                {!list.length && <tr><td colSpan={8}>Không tìm thấy dự án phù hợp.</td></tr>}
              </tbody>
            </table>
          </div>

          <footer className="project-footer-new">
            <span>Hiển thị <b>{list.length ? from + '–' + to : 0}</b> trong <b>{list.length}</b> dự án</span>
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
