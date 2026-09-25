import { useApp } from '../../app/context'
import { includesText, shortDate, TODAY } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { inScope } from '../../lib/scope'
import { runningCycle, scriptDone, STAGES } from '../../lib/sop'
import { usePagedList } from '../../lib/usePagedList'
import { useScreenState } from '../../lib/useScreenState'
import { useData } from '../../store/store'
import type { ContentItem, Project } from '../../store/types'
import { ContentItemModal } from '../projects/ContentModals'
import { statusTone } from '../projects/projectLogic'

const PAGE_SIZE = 12

interface Row {
  project: Project
  cycleNo: number
  item: ContentItem
  late: boolean
}

function isLate(item: ContentItem): boolean {
  if (item.stage === 'Đã đăng') return false
  if (item.deadlineScript && item.deadlineScript < TODAY && !scriptDone(item)) return true
  return Boolean(item.deadlineEdit && item.deadlineEdit < TODAY && STAGES.indexOf(item.stage) < STAGES.indexOf('Chờ khách duyệt'))
}

/** Content of every running cycle, read from the projects; the same rows as each project's Nội dung tab. */
export function PostsScreen() {
  const { role, account, toast, showModal, openProject } = useApp()
  const { projects } = useData()
  const [filters, setFilters] = useScreenState('posts.filters', { query: '', stage: '', late: false })
  const all: Row[] = projects
    .filter((project) => project.state === 'active' && inScope(role, account, project))
    .flatMap((project) => {
      const cycle = runningCycle(project)
      return cycle ? cycle.contents.map((item) => ({ project, cycleNo: cycle.no, item, late: isLate(item) })) : []
    })
    .sort((a, b) => Number(b.late) - Number(a.late) || (a.item.postDate || a.item.deadlineEdit || '9999').localeCompare(b.item.postDate || b.item.deadlineEdit || '9999'))
  const list = all.filter(
    (row) =>
      includesText([row.item.title, row.item.topic, row.item.category, row.project.customer, row.project.code], filters.query) &&
      (!filters.stage || row.item.stage === filters.stage) &&
      (!filters.late || row.late),
  )
  const { rows, page, pages, from, to, goTo, resetPage } = usePagedList(list, PAGE_SIZE)
  const change = (patch: Partial<typeof filters>) => {
    setFilters({ ...filters, ...patch })
    resetPage()
  }
  const count = (test: (item: ContentItem) => boolean) => all.filter((row) => test(row.item)).length
  const published = count((item) => item.stage === 'Đã đăng')
  const scheduled = count((item) => item.stage === 'Lên lịch')
  const late = all.filter((row) => row.late).length

  return (
    <section className="screen active" id="posts">
      <div className="operations-page">
        <div className="project-page-head">
          <div><h1>Bài đăng</h1><p>Nội dung của các chu kỳ đang chạy, lấy từ Content Plan của từng dự án.</p></div>
          <button className="primary" onClick={() => (role !== 'account' ? toast('Vai trò này chỉ xem.') : showModal(<ContentItemModal />))}>
            <Icon name="plus" /> Tạo nội dung
          </button>
        </div>
        <section className="operations-kpis">
          <article><span>Đã đăng</span><b>{published} / {all.length}</b><small>Trong các chu kỳ đang chạy</small></article>
          <article><span>Đã lên lịch</span><b>{scheduled}</b><small>Chờ ngày xuất bản</small></article>
          <article><span>Đang sản xuất</span><b>{all.length - published - scheduled}</b><small>Ý tưởng, script, dựng, chờ duyệt</small></article>
          <article className={late ? 'attention' : ''}><span>Trễ hạn script / dựng</span><b>{late}</b><small>Theo hạn trong Content Plan</small></article>
        </section>
        <section className="project-list-shell operations-shell">
          <div className="project-toolbar-new">
            <label className="project-search-new">
              <Icon name="search" />
              <input type="search" value={filters.query} placeholder="Tìm nội dung, dự án, chủ đề…" onChange={(event) => change({ query: event.target.value })} />
            </label>
            <select value={filters.stage} onChange={(event) => change({ stage: event.target.value })}>
              <option value="">Tất cả giai đoạn</option>
              {STAGES.map((stage) => <option key={stage}>{stage}</option>)}
            </select>
            <label className="filter-check"><input type="checkbox" checked={filters.late} onChange={(event) => change({ late: event.target.checked })} /> Chỉ trễ hạn</label>
          </div>
          <div className="project-table-wrap">
            <table className="project-table-new operations-table">
              <thead><tr><th>Nội dung</th><th>Nhiệm vụ</th><th>Kênh</th><th>Hạn dựng</th><th>Ngày đăng</th><th>Giai đoạn</th><th /></tr></thead>
              <tbody>
                {rows.map(({ project, cycleNo, item, late: rowLate }) => (
                  <tr key={project.id + item.id} onClick={() => (role === 'account' ? showModal(<ContentItemModal project={project} item={item} />) : openProject(project.id, 'noi-dung'))}>
                    <td>
                      <b className="project-record-name">{item.title}</b>
                      <span className="project-record-meta">{project.customer} · chu kỳ {cycleNo} · #{item.stt}{item.bonus ? ' · Tặng' : ''}</span>
                    </td>
                    <td><span className={'pill ' + (item.mission === 'Bán hàng' ? 'waiting' : 'info')}>{item.mission}</span></td>
                    <td><span className="operation-channels">{item.channels.map((channel) => <i key={channel.platform} title={channel.status}>{channel.platform}</i>)}</span></td>
                    <td className={rowLate ? 'is-late' : ''}>{shortDate(item.deadlineEdit) || '—'}</td>
                    <td>{shortDate(item.postDate) || '—'}</td>
                    <td><span className={'pill ' + statusTone(item.stage)}>{item.stage}</span></td>
                    <td>
                      <button className="project-open" aria-label={'Mở dự án ' + project.customer} onClick={(event) => { event.stopPropagation(); openProject(project.id, 'noi-dung') }}>›</button>
                    </td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={7} className="operations-empty">Không có nội dung phù hợp.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="project-footer-new">
            <span>Hiển thị <b>{list.length ? from + '–' + to : 0}</b> trong <b>{list.length}</b> nội dung</span>
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
