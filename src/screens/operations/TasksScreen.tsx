import { useApp } from '../../app/context'
import { addDaysIso, diffDays, includesText, shortDate, TODAY } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { inScope } from '../../lib/scope'
import { usePagedList } from '../../lib/usePagedList'
import { useScreenState } from '../../lib/useScreenState'
import { update, useData } from '../../store/store'
import type { WorkTask } from '../../store/types'
import { addProjectActivity, updateProject } from '../projects/projectLogic'
import { PEOPLE, TaskModal } from './TaskModal'

/** "Gửi duyệt và đăng bài N": generated from a post, closed when the post is published. */
const isPostTask = (task: WorkTask) => Boolean(task.source?.endsWith(':post'))

const PAGE_SIZE = 20
const WEEK = addDaysIso(TODAY, 7)

function groupOf(task: WorkTask): string {
  if (task.status !== 'open') return task.status === 'done' ? 'Đã xong' : 'Đã hủy'
  if (task.due < TODAY) return 'Quá hạn'
  if (task.due === TODAY) return 'Hôm nay'
  return task.due <= WEEK ? '7 ngày tới' : 'Sau đó'
}

function dueText(task: WorkTask): string {
  if (task.status !== 'open') return task.doneAt ? 'xong ' + shortDate(task.doneAt) : '—'
  const days = diffDays(TODAY, task.due)
  return days < 0 ? 'quá ' + -days + ' ngày' : days === 0 ? 'hôm nay' : shortDate(task.due)
}

/**
 * Every to-do across the projects: generated from the SOP, posts, shoots, money and launch
 * gates (kept in sync with their source) plus tasks given by hand. Account sees the tasks of
 * their projects, whoever does them; Kế toán starts on their own.
 */
export function TasksScreen() {
  const { role, account, showModal, openProject } = useApp()
  const { tasks, projects } = useData()
  const me = role === 'accountant' ? 'Kế toán' : account
  const [filters, setFilters] = useScreenState('tasks.filters', { query: '', who: role === 'accountant' ? 'me' : '', view: 'open' })
  const projectOf = new Map(projects.map((project) => [project.id, project]))
  const visible = tasks.filter((task) => {
    const project = projectOf.get(task.projectId)
    return project && (role === 'accountant' ? task.role === 'Kế toán' : inScope(role, account, project))
  })
  const open = visible.filter((task) => task.status === 'open')
  const list = visible
    .filter((task) => (filters.view === 'open' ? task.status === 'open' : task.status !== 'open'))
    .filter((task) => !filters.who || (filters.who === 'me' ? task.assignee === me : filters.who === 'others' ? task.assignee !== me : task.assignee.includes(filters.who)))
    .filter((task) => includesText([task.title, task.assignee, projectOf.get(task.projectId)?.customer ?? ''], filters.query))
    .sort((a, b) => (filters.view === 'open' ? a.due.localeCompare(b.due) : (b.doneAt ?? '').localeCompare(a.doneAt ?? '')))
  const { rows, page, pages, from, to, goTo, resetPage } = usePagedList(list, PAGE_SIZE)
  const change = (patch: Partial<typeof filters>) => {
    setFilters({ ...filters, ...patch })
    resetPage()
  }
  // For now the Account marks a post as published (later it will come from the Facebook / TikTok API).
  const markPublished = (task: WorkTask) => {
    const [, cycleKey, itemId] = task.source!.split(':')
    updateProject(task.projectId, (project) => {
      const cycle = project.cycles.find((entry) => 'c' + entry.no === cycleKey)
      const item = cycle?.contents.find((entry) => entry.id === itemId)
      if (!cycle || !item) return
      const published = item.stage !== 'Đã đăng'
      item.stage = published ? 'Đã đăng' : 'Lên lịch'
      if (published && !item.postDate) item.postDate = TODAY
      item.channels = item.channels.map((channel) => ({ ...channel, status: published ? 'Đã đăng' : 'Đã lên lịch', time: channel.time || '17:00' }))
      if (published) addProjectActivity(project, 'send', 'Đã đăng bài ' + item.stt, item.title)
    })
  }
  const toggle = (task: WorkTask) =>
    update((draft) => {
      const target = draft.tasks.find((item) => item.id === task.id)
      if (target) Object.assign(target, target.status === 'open' ? { status: 'done', doneAt: TODAY } : { status: 'open', doneAt: undefined })
    })
  const count = (test: (task: WorkTask) => boolean) => open.filter(test).length
  const kpi = (label: string, value: number, note: string, patch: Partial<typeof filters>, tone = '') => (
    <button className={('ops-kpi ' + tone).trim()} onClick={() => change({ view: 'open', ...patch })}><span>{label}</span><b>{value}</b><small>{note}</small></button>
  )

  let lastGroup = ''
  return (
    <section className="screen active" id="tasks">
      <div className="operations-page">
        <div className="project-page-head">
          <div><h1>Việc cần làm</h1><p>Tự sinh từ dự án (tự đóng khi làm xong ở chỗ gốc) và việc giao tay.</p></div>
          {role === 'account' && <button className="primary" onClick={() => showModal(<TaskModal />)}><Icon name="plus" /> Giao việc</button>}
        </div>
        <section className="operations-kpis">
          {kpi('Quá hạn', count((task) => task.due < TODAY), 'Mọi người làm', { who: '' }, count((task) => task.due < TODAY) ? 'attention' : '')}
          {kpi('Hôm nay', count((task) => task.due === TODAY), 'Đến hạn hôm nay', { who: '' })}
          {kpi('Của tôi', count((task) => task.assignee === me), 'Việc giao cho ' + me, { who: 'me' })}
          {kpi('Người khác làm', count((task) => task.assignee !== me), 'Content, Media, Kế toán…', { who: 'others' })}
        </section>
        <section className="project-list-shell operations-shell">
          <div className="project-toolbar-new">
            <label className="project-search-new">
              <Icon name="search" />
              <input type="search" value={filters.query} placeholder="Tìm việc, dự án, người làm…" onChange={(event) => change({ query: event.target.value })} />
            </label>
            <select value={filters.who} onChange={(event) => change({ who: event.target.value })} aria-label="Người làm">
              <option value="">Mọi người làm</option><option value="me">Của tôi</option><option value="others">Người khác làm</option>
              {PEOPLE.filter((name) => name !== me).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select value={filters.view} onChange={(event) => change({ view: event.target.value })} aria-label="Hiển thị">
              <option value="open">Đang mở</option><option value="closed">Đã xong / hủy</option>
            </select>
          </div>
          <ul className="task-list">
            {rows.map((task) => {
              const project = projectOf.get(task.projectId)!
              const group = groupOf(task)
              const header = group !== lastGroup ? group : ''
              lastGroup = group
              return (
                <li key={task.id}>
                  {header && <h3 className="task-group">{header}</h3>}
                  <div className={'task-row' + (task.status !== 'open' ? ' is-closed' : task.due < TODAY ? ' is-late' : '')}>
                    {isPostTask(task) && role === 'account'
                      ? <input type="checkbox" title="Đánh dấu đã đăng" aria-label={'Đã đăng: ' + task.title} checked={task.status === 'done'} onChange={() => markPublished(task)} />
                      : task.source
                        ? <span className="task-auto" title="Tự đóng khi việc gốc xong"><Icon name="rotate-ccw" /></span>
                        : <input type="checkbox" aria-label={'Xong: ' + task.title} checked={task.status === 'done'} onChange={() => toggle(task)} />}
                    <button type="button" className="task-main" onClick={() => showModal(<TaskModal task={task} />)}>
                      <b>{task.title}</b>
                      <small>{project.customer}{task.note ? ' · ' + task.note : ''}</small>
                    </button>
                    <span className={'task-who' + (task.assignee === me ? ' is-me' : '')}>{task.assignee || 'Chưa giao'}</span>
                    <span className="task-due">{dueText(task)}</span>
                    <button type="button" className="project-open" aria-label={'Mở ' + project.customer} onClick={() => openProject(project.id, task.tab)}>›</button>
                  </div>
                </li>
              )
            })}
            {!list.length && <li className="operations-empty">Không có việc phù hợp.</li>}
          </ul>
          <footer className="project-footer-new">
            <span>Hiển thị <b>{list.length ? from + '–' + to : 0}</b> trong <b>{list.length}</b> việc</span>
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
