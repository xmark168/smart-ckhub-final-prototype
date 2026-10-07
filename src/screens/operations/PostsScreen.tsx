import { useApp } from '../../app/context'
import { includesText, shortDate, shortText } from '../../lib/format'
import { contentTiming, type ContentTiming } from '../../lib/content'
import { Icon } from '../../lib/icons'
import { inScope } from '../../lib/scope'
import { runningCycle, STAGES } from '../../lib/sop'
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
  timing: ContentTiming
}

/** Content of every running cycle, read from the projects; the same rows as each project's Nội dung tab. */
export function PostsScreen() {
  const { role, account, toast, showModal, openProject } = useApp()
  const { projects } = useData()
  const [filters, setFilters] = useScreenState('posts.filters.v2', { query: '', stage: '', timing: '' })
  const all: Row[] = projects
    .filter((project) => project.state === 'active' && inScope(role, account, project))
    .flatMap((project) => {
      const cycle = runningCycle(project)
      return cycle ? cycle.contents.map((item) => ({ project, cycleNo: cycle.no, item, timing: contentTiming(item) })) : []
    })
    .sort((a, b) => Number(b.timing === 'Trễ hạn') - Number(a.timing === 'Trễ hạn') || (a.item.postDate || a.item.deadlineEdit || '9999').localeCompare(b.item.postDate || b.item.deadlineEdit || '9999'))
  const list = all.filter(
    (row) =>
      includesText([row.item.title, row.item.topic, row.item.category, row.item.mainIdea, row.item.contentDirection, row.item.visualDirection, row.project.customer, row.project.code], filters.query) &&
      (!filters.stage || row.item.stage === filters.stage) &&
      (!filters.timing || row.timing === filters.timing),
  )
  const { rows, page, pages, from, to, goTo, resetPage } = usePagedList(list, PAGE_SIZE)
  const change = (patch: Partial<typeof filters>) => {
    setFilters({ ...filters, ...patch })
    resetPage()
  }
  const count = (test: (item: ContentItem) => boolean) => all.filter((row) => test(row.item)).length
  const published = count((item) => item.stage === 'Đã đăng')
  const onTime = all.filter((row) => row.timing === 'Đúng hạn').length
  const late = all.filter((row) => row.timing === 'Trễ hạn').length
  const cancelled = count((item) => item.stage === 'Đã hủy')

  return (
    <section className="screen active" id="posts">
      <div className="operations-page">
        <div className="project-page-head">
          <div><h1>Bài đăng</h1><p>Bài của các chu kỳ đang chạy, từ Content Plan của từng dự án.</p></div>
          <button className="primary" onClick={() => (role !== 'account' ? toast('Vai trò này chỉ xem.') : showModal(<ContentItemModal />))}>
            <Icon name="plus" /> Tạo bài
          </button>
        </div>
        <section className="operations-kpis">
          <article><span>Đã đăng</span><b>{published} / {all.length}</b><small>Trong các chu kỳ đang chạy</small></article>
          <article><span>Đúng hạn</span><b>{onTime}</b><small>Đã đăng không trễ ngày dự kiến</small></article>
          <article className={late ? 'attention' : ''}><span>Trễ hạn</span><b>{late}</b><small>Quá ngày dự kiến hoặc đã đăng trễ</small></article>
          <article><span>Hủy bài</span><b>{cancelled}</b><small>Giữ lịch sử, vẫn cần bài thay thế</small></article>
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
            <select value={filters.timing} onChange={(event) => change({ timing: event.target.value })} aria-label="Tiến độ bài đăng">
              <option value="">Tất cả tiến độ</option>
              {(['Đúng hạn', 'Trễ hạn', 'Hủy bài', 'Chưa đến hạn', 'Đến hạn', 'Chưa có hạn', 'Chưa có ngày thực tế'] as ContentTiming[]).map((timing) => <option key={timing}>{timing}</option>)}
            </select>
          </div>
          <div className="project-table-wrap">
            <table className="project-table-new operations-table">
              <thead><tr><th>Bài</th><th>Hạn dựng</th><th>Ngày đăng dự kiến / thực tế</th><th>Giai đoạn</th><th>Tiến độ</th><th /></tr></thead>
              <tbody>
                {rows.map(({ project, cycleNo, item, timing }) => (
                  <tr key={project.id + item.id} onClick={() => showModal(<ContentItemModal project={project} item={item} cycleNo={cycleNo} />)}>
                    <td>
                      <span className="content-name"><b title={item.title}>{shortText(item.title)}</b>{item.bonus && <em className="tag-bonus">Tặng</em>}</span>
                      <span className="content-sub">{project.customer} · chu kỳ {cycleNo} · #{item.stt}</span>
                    </td>
                    <td>{shortDate(item.deadlineEdit) || '—'}</td>
                    <td>{shortDate(item.postDate) || '—'}<span className="content-sub">Thực tế: {shortDate(item.publishedAt ?? '') || '—'}</span></td>
                    <td><span className={'pill ' + statusTone(item.stage)}>{item.stage}</span></td>
                    <td><span className={'pill ' + (timing === 'Trễ hạn' ? 'danger' : timing === 'Đúng hạn' ? 'ok' : 'muted')}>{timing}</span>{item.cancellation && <span className="content-sub" title={item.cancellation.reason}>{shortText(item.cancellation.reason)}</span>}</td>
                    <td>
                      <button className="project-open" aria-label={'Mở dự án ' + project.customer} onClick={(event) => { event.stopPropagation(); openProject(project.id, 'noi-dung') }}>›</button>
                    </td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={6} className="operations-empty">Không có bài phù hợp.</td></tr>}
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
