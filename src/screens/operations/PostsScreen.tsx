import { useState } from 'react'
import { useApp } from '../../app/context'
import { includesText, shortDate, shortText } from '../../lib/format'
import { contentAssignees, contentTiming, type ContentTiming } from '../../lib/content'
import { Icon } from '../../lib/icons'
import { canWorkOnPost, postNextStep, postPhase, visibleToPost } from '../../lib/contentWorkflow'
import { currentCycle } from '../../lib/sop'
import { ContentPlanOverview } from './ContentPlanOverview'
import { canEditProject, inScope, sessionName } from '../../lib/scope'
import { STAGES } from '../../lib/sop'
import { usePagedList } from '../../lib/usePagedList'
import { useScreenState } from '../../lib/useScreenState'
import { useData } from '../../store/store'
import type { ContentItem, Project } from '../../store/types'
import { ContentItemModal } from '../projects/ContentModals'
import { ContentImportModal } from './ContentImportModal'
import { exportPlan } from '../../lib/contentExcel'
import { ContentPlanWorkspace } from './ContentPlanWorkspace'
import { statusTone } from '../projects/projectLogic'

const PAGE_SIZE = 12

interface Row {
  project: Project
  cycleNo: number
  item: ContentItem
  timing: ContentTiming
}

/** Shared content of current and closed cycles, within the viewer's project grants. */
export function PostsScreen() {
  const { role, account, toast, showModal, openProject } = useApp()
  const { projects, tasks } = useData()
  const [filters, setFilters] = useScreenState('posts.filters.v4', { query: '', stage: '', timing: '', projectId: '', cycleNo: 'auto', view: 'progress', person: '', quick: '', history: false, format: '', platform: '' })
  const [writingKey, setWritingKey] = useState('')
  const scopedProjects = projects.filter((project) => inScope(role, account, project))
  const selected = scopedProjects.find((project) => project.id === filters.projectId)
  const selectedCycle = selected ? filters.cycleNo === 'auto' ? currentCycle(selected) : selected.cycles.find((cycle) => String(cycle.no) === filters.cycleNo) : undefined
  const editable = Boolean(selected && selectedCycle?.status === 'running' && selected.state === 'active' && canEditProject(role, account, selected))
  const all: Row[] = projects
    .filter((project) => inScope(role, account, project) && (!selected || project.id === selected.id))
    .flatMap((project) => {
      const cycles = selectedCycle ? [selectedCycle] : selected || filters.history ? project.cycles : project.cycles.filter((entry) => entry.status === 'running' && project.state === 'active')
      return cycles.flatMap((cycle) => cycle.contents.filter((item) => visibleToPost(role, account, project, item)).map((item) => ({ project, cycleNo: cycle.no, item, timing: contentTiming(item) })))
    })
    .sort((a, b) => filters.view === 'plan' ? a.project.code.localeCompare(b.project.code) || b.cycleNo - a.cycleNo || a.item.stt - b.item.stt : Number(b.timing === 'Trễ hạn') - Number(a.timing === 'Trễ hạn') || (a.item.postDate || a.item.deadlineEdit || '9999').localeCompare(b.item.postDate || b.item.deadlineEdit || '9999'))
  const owners = (row: Row) => contentAssignees(tasks, row.project.id, row.cycleNo, row.item.id, row.item)
  const pending = (row: Row) => !['Đã đăng', 'Đã hủy'].includes(row.item.stage)
  const nextOwner = (row: Row) => !pending(row) ? '—' : row.item.workflow?.phase === 'draft' || !row.item.workflow && ['Ý tưởng', 'Script'].includes(row.item.stage) ? owners(row).content : row.item.workflow?.phase === 'production' || !row.item.workflow && row.item.stage === 'Dựng' ? owners(row).media : row.project.owner
  const nextDue = (row: Row) => !pending(row) ? '' : row.item.workflow?.phase === 'draft' || !row.item.workflow && ['Ý tưởng', 'Script'].includes(row.item.stage) ? row.item.deadlineScript : row.item.workflow?.phase === 'production' || !row.item.workflow && row.item.stage === 'Dựng' ? row.item.deadlineEdit : row.item.channels.filter((channel) => channel.status !== 'Đã đăng' && channel.postDate).map((channel) => channel.postDate!).sort()[0] || row.item.postDate
  const unassigned = (row: Row) => pending(row) && Object.values(owners(row)).includes('Chưa phân công')
  const people = [...new Set(all.flatMap((row) => Object.values(owners(row)).flatMap((value) => value.split(',').map((name) => name.trim()))).filter((name) => name && name !== 'Chưa phân công'))]
  const list = all.filter(
    (row) =>
      includesText([row.item.title, row.item.topic, row.item.category, row.item.mainIdea, row.item.contentDirection, row.item.visualDirection, ...(row.item.planSections?.map((section) => section.title + ' ' + section.body) ?? []), row.project.customer, row.project.code, ...Object.values(contentAssignees(tasks, row.project.id, row.cycleNo, row.item.id, row.item))], filters.query) &&
      (!filters.stage || row.item.stage === filters.stage) &&
      (!filters.timing || row.timing === filters.timing) &&
      (!filters.format || row.item.format === filters.format) &&
      (!filters.platform || row.item.channels.some((channel) => channel.platform === filters.platform)) &&
      (!filters.person || Object.values(owners(row)).some((value) => value.split(',').map((name) => name.trim()).includes(filters.person))) &&
      (!filters.quick || filters.quick === 'mine' && pending(row) && nextOwner(row).split(',').map((name) => name.trim()).includes(sessionName(role, account)) || filters.quick === 'review' && ['content-review', 'client-review'].includes(postPhase(row.item)) || filters.quick === 'due' && row.timing === 'Đến hạn' && pending(row) || filters.quick === 'late' && row.timing === 'Trễ hạn' && pending(row) || filters.quick === 'unassigned' && unassigned(row)),
  )
  const { rows, page, pages, from, to, goTo, resetPage } = usePagedList(list, PAGE_SIZE)
  const change = (patch: Partial<typeof filters>) => {
    setFilters({ ...filters, ...patch })
    resetPage(); setWritingKey('')
  }
  const count = (test: (item: ContentItem) => boolean) => all.filter((row) => test(row.item)).length
  const published = count((item) => item.stage === 'Đã đăng')
  const onTime = all.filter((row) => row.timing === 'Đúng hạn').length
  const late = all.filter((row) => row.timing === 'Trễ hạn' && pending(row)).length
  const cancelled = count((item) => item.stage === 'Đã hủy')
  const writing = list.find((row) => `${row.project.id}:${row.cycleNo}:${row.item.id}` === writingKey)
  const closedSummary = selectedCycle?.result && !selectedCycle.contents.length ? `Chu kỳ ${selectedCycle.no} đã chốt: ${selectedCycle.result.published} / ${selectedCycle.result.planned} bài. ${selectedCycle.result.note} · Dữ liệu cũ chỉ lưu kết quả tổng, chưa có chi tiết từng bài.` : ''
  const assignedEdit = role === 'partner' && all.some((row) => canWorkOnPost(role, account, row.project, row.cycleNo, row.item, 'content') || canWorkOnPost(role, account, row.project, row.cycleNo, row.item, 'media'))

  const openRow = (row: Row) => showModal(<PostDetail rows={list} initial={row} />)
  return (
    <section className={"screen active" + (filters.view === "plan" ? " posts-plan-mode" : "")} id="posts">
      <div className="operations-page">
        <div className="project-page-head">
          <div><h1>Bài đăng</h1><p>Lập nội dung và theo dõi bài đăng trong cùng một nơi.</p></div>
          <button disabled={role !== 'account' || Boolean(selected && !editable)} className="primary" onClick={() => (role !== 'account' ? toast('Vai trò này chỉ xem.') : showModal(<ContentItemModal project={selected} />))}>
            <Icon name="plus" /> Tạo bài
          </button>
        </div>
        <div className="posts-workspace-bar">
          <label>Dự án<select aria-label="Dự án" value={selected?.id ?? ''} onChange={(event) => { change({ projectId: event.target.value, cycleNo: 'auto', stage: '', timing: '', quick: '', person: '', format: '', platform: '' }) }}><option value="">Tất cả dự án</option>{scopedProjects.map((project) => <option key={project.id} value={project.id}>{project.customer} · {project.code}</option>)}</select></label>
          {selected && <label>Chu kỳ<select aria-label="Chu kỳ" value={filters.cycleNo === 'auto' ? selectedCycle?.no ?? '' : filters.cycleNo} onChange={(event) => change({ cycleNo: event.target.value })}><option value="">Tất cả chu kỳ</option>{selected.cycles.map((cycle) => <option key={cycle.no} value={cycle.no}>Chu kỳ {cycle.no} · {cycle.status === 'running' ? 'Đang chạy' : 'Đã chốt'}</option>)}</select></label>}
          <div className="posts-view-switch" role="group" aria-label="Cách xem"><button className={filters.view === 'plan' ? 'active' : ''} onClick={() => change({ view: 'plan' })}>Content Plan</button><button className={filters.view !== 'plan' ? 'active' : ''} onClick={() => change({ view: 'progress' })}>Tiến độ</button></div>
          <button className="secondary" disabled={!editable} onClick={() => selected && selectedCycle && showModal(<ContentImportModal project={selected} cycleNo={selectedCycle.no} />)}>Nhập / dán Excel</button>
          <button className="secondary" disabled={!selectedCycle} onClick={async () => { if (!selected || !selectedCycle) return; try { await exportPlan(selectedCycle.contents.filter((item) => visibleToPost(role, account, selected, item)), selected.code + '-chu-ky-' + selectedCycle.no) } catch { toast('Không xuất được Excel. Thử lại.') } }}>Xuất Excel</button>
        </div>
        <p className="cd-note">{assignedEdit ? 'Làm nội dung / sản xuất các bài được giao. Account ghi nhận duyệt và kết quả đăng.' : selected ? !selected.cycles.length ? 'Chưa có chu kỳ triển khai. Bắt đầu dự án để lập nội dung.' : !selectedCycle ? 'Đang xem tất cả chu kỳ, gồm chu kỳ đã chốt. Chọn một chu kỳ đang chạy để sửa hoặc nhập Excel.' : editable ? 'Nhập Excel vào chu kỳ đã chọn; xuất toàn bộ chu kỳ.' : 'Chế độ xem · chu kỳ đã chốt hoặc không có quyền sửa.' : filters.history ? 'Đang xem cả lịch sử trong quyền dự án.' : 'Đang xem chu kỳ đang chạy trong quyền dự án.'}</p>
        {!selected && <label className="posts-history-toggle"><input type="checkbox" checked={filters.history} onChange={(event) => change({ history: event.target.checked })} /> Gồm chu kỳ đã chốt / dự án đã dừng</label>}
        <div className="posts-quick-filters">{[['', 'Tất cả'], ['mine', 'Cần tôi xử lý'], ['review', 'Chờ duyệt'], ['due', 'Đến hạn'], ['late', 'Trễ hạn'], ['unassigned', 'Chưa phân công']].map(([id, name]) => <button key={id} className={filters.quick === id ? 'active' : ''} aria-pressed={filters.quick === id} onClick={() => change({ quick: id })}>{name}</button>)}</div>
        {filters.view !== 'plan' && <section className="operations-kpis">
          <article><span>Đã đăng</span><b>{published} / {all.length}</b><small>Trong phạm vi đang xem</small></article>
          <article><span>Đã đăng đúng hạn</span><b>{onTime}</b><small>{all.filter((row) => row.item.stage === 'Đã đăng' && row.timing === 'Trễ hạn').length} bài đã đăng trễ</small></article>
          <article className={late ? 'attention' : ''}><span>Quá hạn chưa đăng</span><b>{late}</b><small>{all.filter((row) => row.timing === 'Trễ hạn' && pending(row)).length} bài quá hạn chưa đăng</small></article>
          <article><span>Hủy bài</span><b>{cancelled}</b><small>Giữ lịch sử, vẫn cần bài thay thế</small></article>
        </section>}
        <section className={'project-list-shell operations-shell' + (filters.view === 'plan' ? ' plan-workspace-shell' : '')}>
          <div className="project-toolbar-new">
            <label className="project-search-new">
              <Icon name="search" />
              <input type="search" value={filters.query} placeholder="Tìm nội dung, dự án, chủ đề…" onChange={(event) => change({ query: event.target.value })} />
            </label>
            <select aria-label="Người phụ trách" value={filters.person} onChange={(event) => change({ person: event.target.value })}><option value="">Tất cả nhân sự</option>{people.map((name) => <option key={name}>{name}</option>)}</select>
            <details className="posts-more-filters"><summary>Lọc thêm{[filters.stage, filters.timing, filters.format, filters.platform].filter(Boolean).length ? ' · ' + [filters.stage, filters.timing, filters.format, filters.platform].filter(Boolean).length : ''}</summary><div className="posts-advanced-filters">
            <select aria-label="Giai đoạn" value={filters.stage} onChange={(event) => change({ stage: event.target.value })}>
              <option value="">Tất cả giai đoạn</option>
              {STAGES.map((stage) => <option key={stage}>{stage}</option>)}
            </select>
            <select value={filters.timing} onChange={(event) => change({ timing: event.target.value })} aria-label="Tiến độ bài đăng">
              <option value="">Tất cả tiến độ</option>
              {(['Đúng hạn', 'Trễ hạn', 'Hủy bài', 'Chưa đến hạn', 'Đến hạn', 'Chưa có hạn', 'Chưa có ngày thực tế'] as ContentTiming[]).map((timing) => <option key={timing}>{timing}</option>)}
            </select>
            <select aria-label="Định dạng bài" value={filters.format ?? ''} onChange={(event) => change({ format: event.target.value })}><option value="">Tất cả định dạng</option>{['Video', 'Ảnh', 'Album'].map((name) => <option key={name}>{name}</option>)}</select>
            <select aria-label="Kênh xuất bản" value={filters.platform ?? ''} onChange={(event) => change({ platform: event.target.value })}><option value="">Tất cả kênh</option><option>Facebook</option><option>TikTok</option></select>
            </div></details>
          </div>
          <div className="posts-result-count"><span>{list.length} bài{filters.stage && ' · ' + filters.stage}{filters.timing && ' · ' + filters.timing}{filters.format && ' · ' + filters.format}{filters.platform && ' · ' + filters.platform}</span>{(filters.query || filters.stage || filters.timing || filters.person || filters.quick || filters.format || filters.platform) && <button className="text-btn" onClick={() => change({ query: '', stage: '', timing: '', person: '', quick: '', format: '', platform: '' })}>Xóa bộ lọc</button>}</div>
          {filters.view === 'plan' ? writing ? <><div className="posts-plan-return"><button className="text-btn" onClick={() => setWritingKey('')}>← Rà kế hoạch</button></div><ContentPlanWorkspace key={writingKey} initialKey={writingKey} rows={list} editable onOpen={openRow} /></> : closedSummary ? <p className="operations-empty">{closedSummary}</p> : <ContentPlanOverview rows={list} onWrite={(row) => setWritingKey(`${row.project.id}:${row.cycleNo}:${row.item.id}`)} onOpen={openRow} /> : <div className="project-table-wrap">
            <table className="project-table-new operations-table">
              <thead><tr><th>Bài</th><th>Hạn xử lý tiếp</th><th>Ngày đăng dự kiến / thực tế</th><th>Bước tiếp theo</th><th>Tiến độ</th><th /></tr></thead>
              <tbody>
                {rows.map(({ project, cycleNo, item, timing }) => (
                  <tr key={project.id + ':' + cycleNo + ':' + item.id} onClick={() => openRow({ project, cycleNo, item, timing })}>
                    <td>
                      <span className="content-name"><b title={item.title}>{shortText(item.title)}</b>{item.bonus && <em className="tag-bonus">Tặng</em>}</span>
                      <span className="content-sub">{project.customer} · chu kỳ {cycleNo} · #{item.stt}{project.cycles.find((cycle) => cycle.no === cycleNo)?.status === 'closed' ? ' · Đã chốt' : ''}</span>
                      <span className="post-assignee-line"><span>Content: <b>{contentAssignees(tasks, project.id, cycleNo, item.id, item).content}</b></span><span>Media: <b>{contentAssignees(tasks, project.id, cycleNo, item.id, item).media}</b></span></span>
                    </td>
                    <td>{shortDate(nextDue({ project, cycleNo, item, timing })) || '—'}<span className="content-sub">{nextOwner({ project, cycleNo, item, timing })}</span></td>
                    <td>{shortDate(item.postDate) || '—'}<span className="content-sub">Thực tế: {shortDate(item.publishedAt ?? '') || '—'}</span></td>
                    <td><span className={'pill ' + statusTone(item.stage)}>{postNextStep(item)}</span></td>
                    <td><span className={'pill ' + (timing === 'Trễ hạn' ? 'danger' : timing === 'Đúng hạn' ? 'ok' : 'muted')}>{timing}</span>{item.cancellation && <span className="content-sub" title={item.cancellation.reason}>{shortText(item.cancellation.reason)}</span>}</td>
                    <td>
                      <button disabled={role === 'partner'} className="project-open" aria-label={'Mở dự án ' + project.customer} onClick={(event) => { event.stopPropagation(); openProject(project.id, 'noi-dung') }}>›</button>
                    </td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={6} className="operations-empty">{closedSummary || 'Không có bài phù hợp.'}</td></tr>}
              </tbody>
            </table>
          </div>
          }
          {filters.view !== 'plan' && <footer className="project-footer-new">
            <span>Hiển thị <b>{list.length ? from + '–' + to : 0}</b> trong <b>{list.length}</b> nội dung</span>
            <div className="project-pager">
              <button disabled={page === 1} onClick={() => goTo(page - 1)}>‹</button>
              <button disabled>{page} / {pages}</button>
              <button disabled={page === pages} onClick={() => goTo(page + 1)}>›</button>
            </div>
          </footer>}
        </section>
      </div>
    </section>
  )
}

function PostDetail({ rows, initial }: { rows: Row[]; initial: Row }) {
  const [index, setIndex] = useState(rows.findIndex((row) => row.item.id === initial.item.id && row.project.id === initial.project.id && row.cycleNo === initial.cycleNo))
  const row = rows[index] ?? initial
  return <ContentItemModal key={row.project.id + row.cycleNo + row.item.id} project={row.project} item={row.item} cycleNo={row.cycleNo} navigation={<div className="post-detail-nav"><button type="button" disabled={index <= 0} onClick={() => setIndex(index - 1)}>← Bài trước</button><span>{index + 1} / {rows.length} · {row.project.customer} · CK {row.cycleNo}</span><button type="button" disabled={index >= rows.length - 1} onClick={() => setIndex(index + 1)}>Bài sau →</button></div>} />
}
