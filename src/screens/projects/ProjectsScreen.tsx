import type { CSSProperties } from 'react'
import { useApp } from '../../app/context'
import { ACCOUNTS, includesText, pageSlice } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { useOutsideClose } from '../../lib/useOutsideClose'
import { useScreenState } from '../../lib/useScreenState'
import { useData } from '../../store/store'
import type { Project, ProjectState } from '../../store/types'
import { InfoModal } from '../../ui/Modal'
import { CreateProjectModal } from './ProjectModals'
import { cycleRange, projectLabel, projectTone } from './projectLogic'

type Kpi = 'all' | 'active' | 'risk' | 'paused' | 'draft'

interface Filters {
  kpi: Kpi
  query: string
  status: '' | ProjectState
  owner: string
  area: string
  risk: boolean
  page: number
}

const INITIAL: Filters = { kpi: 'all', query: '', status: '', owner: '', area: '', risk: false, page: 1 }
const PAGE_SIZE = 20

const PROJECT_RULES =
  'Mỗi dự án thuộc một khách hàng và một Account phụ trách. Dự án nháp chỉ được bắt đầu sau khi Cổng khởi động đủ điều kiện: hợp đồng chính, tài chính, Sales Brief, brief và thiết lập. Chu kỳ luôn tính theo tháng. Dự án tạm dừng hoặc dừng không tự thay đổi số chu kỳ đã triển khai. Task thiếu Owner hoặc deadline không được bắt đầu.'

function matchesKpi(item: Project, kpi: Kpi): boolean {
  if (kpi === 'active') return item.state === 'active'
  if (kpi === 'risk') return item.risk
  if (kpi === 'paused') return item.state === 'pending' || item.state === 'stopped'
  if (kpi === 'draft') return item.state === 'draft'
  return true
}

export function ProjectsScreen() {
  const { openProject, showModal } = useApp()
  const { projects } = useData()
  const [filters, setFilters] = useScreenState<Filters>('projects.filters', INITIAL)
  const [filterOpen, setFilterOpen] = useScreenState('projects.filterOpen', false)
  const filterRef = useOutsideClose<HTMLDivElement>(filterOpen, () => setFilterOpen(false))

  const change = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, page: 1, ...patch }))
  const active = projects.filter((item) => item.state === 'active')
  const risk = active.filter((item) => item.risk)
  const paused = projects.filter((item) => item.state === 'pending' || item.state === 'stopped')
  const drafts = projects.filter((item) => item.state === 'draft')
  const list = projects.filter(
    (item) =>
      includesText([item.code, item.customer, item.owner, item.area, item.service], filters.query) &&
      (!filters.status || item.state === filters.status) &&
      (!filters.owner || item.owner === filters.owner) &&
      (!filters.area || item.area === filters.area) &&
      (!filters.risk || item.risk) &&
      matchesKpi(item, filters.kpi),
  )
  const { rows, page, pages, from, to } = pageSlice(list, filters.page, PAGE_SIZE)
  const areas = Array.from(new Set(projects.map((item) => item.area)))
  const activeFilterCount = [filters.status, filters.owner, filters.area, filters.risk].filter(Boolean).length
  const kpiClass = (kpi: Kpi, extra = '') => ('project-kpi ' + extra + (filters.kpi === kpi ? ' selected' : '')).replace(/\s+/g, ' ').trim()

  return (
    <section className="screen active" id="projects">
      <div className="projects-page">
        <div className="project-page-head">
          <h1>Dự án <button className="customer-help" aria-label="Quy tắc dự án" onClick={() => showModal(<InfoModal title="Quy tắc dự án" message={PROJECT_RULES} />)}>?</button></h1>
          <button className="primary" onClick={() => showModal(<CreateProjectModal onCreated={() => change({ kpi: 'all' })} />)}><Icon name="plus" /> Tạo dự án</button>
        </div>

        <section className="project-dashboard">
          <button className={kpiClass('active', 'hero')} onClick={() => change({ kpi: 'active' })}><label>Đang triển khai</label><strong>{active.length}</strong><small>{risk.length} dự án cần theo dõi</small></button>
          <button className={kpiClass('risk', 'risk')} onClick={() => change({ kpi: 'risk' })}><label>Có rủi ro</label><strong>{risk.length}</strong><small>Trễ hoặc có nguy cơ trễ chu kỳ</small></button>
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
              <thead><tr><th>Dự án</th><th>Account</th><th>Chu kỳ</th><th>Chu kỳ hiện tại</th><th>Tiến độ</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} onClick={() => openProject(item.id)}>
                    <td><span className="project-record-name">{item.customer}</span><span className="project-record-meta">{item.code} · {item.service}</span></td>
                    <td>{item.owner}</td>
                    <td>{item.cycle} / {item.total}</td>
                    <td>{cycleRange(item)}</td>
                    <td>
                      <div className="project-progress">
                        <i style={{ '--progress': item.progress + '%' } as CSSProperties} />
                        <span>{item.progress}%</span>
                      </div>
                    </td>
                    <td><span className={'pill ' + projectTone(item)}>{projectLabel(item)}</span></td>
                    <td><button className="project-open" aria-label={'Mở ' + item.customer}>›</button></td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={7}>Không tìm thấy dự án phù hợp.</td></tr>}
              </tbody>
            </table>
          </div>

          <footer className="project-footer-new">
            <span>Hiển thị <b>{list.length ? from + '–' + to : 0}</b> trong <b>{list.length}</b> dự án</span>
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
