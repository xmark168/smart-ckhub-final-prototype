import { useApp } from '../../app/context'
import { allShootings, mediaClashes, type ShootRow } from '../../data/shootings'
import { addDaysIso, includesText, shortDate, TODAY } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { inScope } from '../../lib/scope'
import { cycleMilestones, MILESTONE_TONE, runningCycle, type Milestone } from '../../lib/sop'
import { usePagedList } from '../../lib/usePagedList'
import { useScreenState } from '../../lib/useScreenState'
import { useData } from '../../store/store'
import { ShootingModal } from '../projects/CycleModals'
import { MEDIA_PEOPLE, statusTone } from '../projects/projectLogic'

const PAGE_SIZE = 12

/** Shooting Plan milestone of shoot N in its running cycle. */
function planStep(row: ShootRow, steps: Milestone[]): Milestone | undefined {
  return steps.filter((item) => item.kind === 'shootingPlan')[row.no - 1]
}

/**
 * Every shoot of every project, read from the project cycles (one source). Account schedules
 * here or in the project; a Media booked twice on the same day is flagged.
 */
export function ShootingsScreen() {
  const { role, account, showModal, openProject, toast } = useApp()
  const { projects, params } = useData()
  const [filters, setFilters] = useScreenState('shootings.filters', { query: '', media: '', view: 'upcoming' })
  const visible = projects.filter((project) => inScope(role, account, project))
  const all = allShootings(visible)
  const everyone = allShootings(projects)
  const stepsOf = new Map(visible.map((project) => {
    const cycle = runningCycle(project)
    return [project.id, cycle ? cycleMilestones(cycle, project.quota, params) : []] as const
  }))
  const done = (row: ShootRow) => row.shooting.status === 'Đã hoàn thành'
  const clashOf = (row: ShootRow) => mediaClashes(everyone, row.shooting.date, row.shooting.media, row.shooting.id).map((entry) => entry.name)

  const list = all
    .filter((row) => (filters.view === 'upcoming' ? !done(row) : filters.view === 'done' ? done(row) : true))
    .filter((row) => (!filters.media || row.shooting.media.includes(filters.media)) && includesText([row.project.customer, row.project.code, row.shooting.location, ...row.shooting.media], filters.query))
    .sort((a, b) => {
      const order = (a.shooting.date || '9999').localeCompare(b.shooting.date || '9999')
      return filters.view === 'done' ? -order : order
    })
  const { rows, page, pages, from, to, goTo, resetPage } = usePagedList(list, PAGE_SIZE)
  const change = (patch: Partial<typeof filters>) => {
    setFilters({ ...filters, ...patch })
    resetPage()
  }

  const upcoming = all.filter((row) => !done(row))
  const week = upcoming.filter((row) => row.shooting.date && row.shooting.date <= addDaysIso(TODAY, 7)).length
  const unscheduled = upcoming.filter((row) => !row.shooting.date).length
  const clashes = upcoming.filter((row) => clashOf(row).length).length
  const planLate = visible.reduce((sum, project) => sum + (stepsOf.get(project.id) ?? []).filter((item) => item.kind === 'shootingPlan' && item.state === 'late').length, 0)

  return (
    <section className="screen active" id="shootings">
      <div className="operations-page">
        <div className="project-page-head">
          <div><h1>Lịch shooting</h1><p>Mọi buổi shoot của các dự án. Mỗi buổi có một Shooting Plan.</p></div>
          <button className="primary" onClick={() => (role !== 'account' ? toast('Account lên lịch shooting.') : showModal(<ShootingModal />))}>
            <Icon name="plus" /> Tạo lịch shooting
          </button>
        </div>
        <section className="operations-kpis">
          <article><span>Trong 7 ngày tới</span><b>{week}</b><small>Buổi shoot sắp diễn ra</small></article>
          <article className={unscheduled ? 'attention' : ''}><span>Chưa chốt ngày</span><b>{unscheduled}</b><small>Cần Account chốt lịch</small></article>
          <article className={clashes ? 'attention' : ''}><span>Trùng lịch Media</span><b>{clashes}</b><small>Cùng Media, cùng ngày</small></article>
          <article className={planLate ? 'attention' : ''}><span>Shooting Plan trễ</span><b>{planLate}</b><small>Quá hạn gửi khách</small></article>
        </section>
        <section className="project-list-shell operations-shell">
          <div className="project-toolbar-new">
            <label className="project-search-new">
              <Icon name="search" />
              <input type="search" value={filters.query} placeholder="Tìm dự án, địa điểm, Media…" onChange={(event) => change({ query: event.target.value })} />
            </label>
            <select value={filters.media} onChange={(event) => change({ media: event.target.value })} aria-label="Media">
              <option value="">Mọi Media</option>
              {MEDIA_PEOPLE.map((name) => <option key={name}>{name}</option>)}
            </select>
            <select value={filters.view} onChange={(event) => change({ view: event.target.value })} aria-label="Hiển thị">
              <option value="upcoming">Sắp tới</option><option value="done">Đã quay</option><option value="all">Tất cả</option>
            </select>
          </div>
          <div className="project-table-wrap">
            <table className="project-table-new operations-table shoot-table">
              <thead><tr><th>Ngày</th><th>Dự án</th><th>Media</th><th>Shooting Plan</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>
                {rows.map((row) => {
                  const { project, shooting, cycleNo, no } = row
                  const plan = row.running ? planStep(row, stepsOf.get(project.id) ?? []) : undefined
                  const clash = clashOf(row)
                  const editable = role === 'account' && row.running
                  return (
                    <tr key={shooting.id} onClick={() => (editable ? showModal(<ShootingModal project={project} shooting={shooting} />) : openProject(project.id))}>
                      <td>
                        <b className="project-record-name">{shooting.date ? shortDate(shooting.date) : 'Chưa chốt'}</b>
                        <span className="project-record-meta">{shooting.time || '—'}</span>
                      </td>
                      <td>
                        <b className="project-record-name">{project.customer}</b>
                        <span className="project-record-meta">Chu kỳ {cycleNo} · buổi {no}{shooting.location ? ' · ' + shooting.location : ''}</span>
                      </td>
                      <td>
                        {shooting.media.join(', ') || <span className="muted-text">Chưa phân</span>}
                        {clash.length > 0 && <span className="pill danger shoot-clash">Trùng: {clash.join(', ')}</span>}
                      </td>
                      <td>
                        {shooting.plan.sentAt
                          ? 'Gửi ' + shortDate(shooting.plan.sentAt)
                          : plan ? <span className={'pill ' + MILESTONE_TONE[plan.state]}>{plan.state === 'late' ? 'Trễ · hạn ' : 'Hạn '}{(plan.projected ? '~' : '') + shortDate(plan.due)}</span> : '—'}
                      </td>
                      <td><span className={'pill ' + statusTone(shooting.status)}>{shooting.status}</span></td>
                      <td>
                        <button className="project-open" aria-label={'Mở dự án ' + project.customer} onClick={(event) => { event.stopPropagation(); openProject(project.id) }}>›</button>
                      </td>
                    </tr>
                  )
                })}
                {!list.length && <tr><td colSpan={6} className="operations-empty">Không có buổi shoot phù hợp.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="project-footer-new">
            <span>Hiển thị <b>{list.length ? from + '–' + to : 0}</b> trong <b>{list.length}</b> buổi shoot</span>
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
