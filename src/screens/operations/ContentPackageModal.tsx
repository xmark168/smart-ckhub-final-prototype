import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AppContext, useApp } from '../../app/context'
import { contentAssignees, contentTiming } from '../../lib/content'
import { contentPackages, duplicateContent, editBriefCell, type BriefCell } from '../../lib/contentPackages'
import { exportPlan } from '../../lib/contentExcel'
import { canWriteBrief, postNextStep, postPhase, visibleToPost } from '../../lib/contentWorkflow'
import { includesText, shortDate } from '../../lib/format'
import { canEditProject, inScope, sessionName } from '../../lib/scope'
import { getData, useData } from '../../store/store'
import type { ContentItem, Project } from '../../store/types'
import { Modal } from '../../ui/Modal'
import { viewOnlyReason } from '../../ui/viewOnly'
import { ContentItemModal } from '../projects/ContentModals'
import { statusTone, updateProject } from '../projects/projectLogic'
import { ContentImportModal } from './ContentImportModal'
import { ContentPlanWorkspace, type ContentPlanRow } from './ContentPlanWorkspace'

export function ContentPackageModal({ projectId, cycleNo }: { projectId: string; cycleNo: number }) {
  const app = useApp()
  const { role, account, toast } = app
  const { projects, tasks } = useData()
  const [child, setChild] = useState<ReactNode>(null)
  const [full, setFull] = useState(false)
  const [writingId, setWritingId] = useState('')
  const [query, setQuery] = useState('')
  const [quick, setQuick] = useState('')
  const [person, setPerson] = useState('')
  const [status, setStatus] = useState('')
  const [exporting, setExporting] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const project = projects.find((entry) => entry.id === projectId && inScope(role, account, entry))
  const cycle = project?.cycles.find((entry) => entry.no === cycleNo)
  const entry = project && contentPackages([project], role, account).find((entry) => entry.cycle.no === cycleNo)
  const manage = Boolean(project && cycle?.status === 'running' && project.state === 'active' && canEditProject(role, account, project))

  if (!project || !cycle || !entry) return <Modal title="Gói nội dung"><p className="operations-empty">Chu kỳ không còn tồn tại hoặc bạn không còn quyền xem nội dung.</p></Modal>
  // Replace the package dialog while working on a child; closing returns to the same package and filters.
  if (child) return <AppContext.Provider value={{ ...app, showModal: setChild, closeModal: () => setChild(null) }}>{child}</AppContext.Provider>

  const all: ContentPlanRow[] = [...entry.items].sort((a, b) => a.stt - b.stt).map((item) => ({ project, cycleNo, item, timing: contentTiming(item) }))
  const owners = (item: ContentItem) => contentAssignees(tasks, projectId, cycleNo, item.id, item)
  const pending = (item: ContentItem) => !['Đã đăng', 'Đã hủy'].includes(item.stage)
  const nextOwner = (item: ContentItem) => !pending(item) ? '—' : postPhase(item) === 'draft' ? owners(item).content : postPhase(item) === 'production' ? owners(item).media : project.owner
  const nextDue = (item: ContentItem) => !pending(item) ? '' : postPhase(item) === 'draft' ? item.deadlineScript : postPhase(item) === 'production' ? item.deadlineEdit : item.channels.filter((channel) => channel.status !== 'Đã đăng' && channel.postDate).map((channel) => channel.postDate!).sort()[0] || item.postDate
  const people = [...new Set(all.flatMap(({ item }) => Object.values(owners(item)).flatMap((name) => name.split(',').map((name) => name.trim()))).filter((name) => name && name !== 'Chưa phân công'))]
  const rows = all.filter(({ item, timing }) => includesText([item.title, item.topic, item.category, item.mainIdea, item.contentDirection, item.visualDirection, ...Object.values(owners(item)), ...(item.planSections?.map((section) => section.body) ?? [])], query) && (!person || Object.values(owners(item)).some((names) => names.split(',').map((name) => name.trim()).includes(person))) && (!quick || quick === 'mine' && pending(item) && nextOwner(item).split(',').map((name) => name.trim()).includes(sessionName(role, account)) || quick === 'review' && pending(item) && ['content-review', 'client-review'].includes(postPhase(item)) || quick === 'late' && pending(item) && timing === 'Trễ hạn' || quick === 'publish' && pending(item) && (postPhase(item) === 'approved' || item.stage === 'Lên lịch') || quick === 'unassigned' && pending(item) && Object.values(owners(item)).includes('Chưa phân công')))
  const writing = all.find(({ item }) => item.id === writingId)
  const open = (row: ContentPlanRow) => setChild(<CyclePostDetail projectId={projectId} cycleNo={cycleNo} initialId={row.item.id} ids={(writingId ? all : rows).map((row) => row.item.id)} />)
  const write = (id: string) => { setWritingId(id); setStatus(''); bodyRef.current?.scrollTo({ top: 0 }) }
  const save = (item: ContentItem, field: BriefCell, value: string, reset: () => void) => {
    if (value === (item[field] ?? '')) return
    if (viewOnlyReason()) { toast('Chế độ xem, không lưu thay đổi.'); reset(); return }
    try {
      if (!getData().projects.some((project) => project.id === projectId)) throw new Error('Dự án không còn tồn tại.')
      updateProject(projectId, (draft) => editBriefCell(draft, cycleNo, item.id, field, value, role, account))
      setStatus('Đã lưu bài #' + item.stt)
    } catch (error) { toast(error instanceof Error ? error.message : 'Không lưu được ô.'); reset() }
  }
  const nextCell = (event: KeyboardEvent<HTMLElement>, field: string, id: string) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    const index = rows.findIndex(({ item }) => item.id === id)
    const target = [...(bodyRef.current?.querySelectorAll<HTMLElement>('[data-cell]') ?? [])].find((cell) => cell.dataset.cell === field && cell.dataset.row === rows[index + 1]?.item.id)
    event.currentTarget.blur(); target?.focus()
  }
  const duplicate = (item: ContentItem) => {
    if (viewOnlyReason()) { toast('Chế độ xem, không thêm bài.'); return }
    try {
      let id = ''
      updateProject(projectId, (draft) => { id = duplicateContent(draft, cycleNo, item.id, role, account) })
      if (!id) throw new Error('Dự án không còn tồn tại hoặc đang ở chế độ xem.')
      setQuery(''); setQuick(''); setPerson(''); write(id); toast('Đã nhân bản. Bản mới chưa phân công và chưa có lịch đăng.')
    } catch (error) { toast(error instanceof Error ? error.message : 'Không nhân bản được bài.') }
  }

  return <Modal title={<><span>{project.customer}</span><small>Gói nội dung · Chu kỳ {cycleNo}</small></>} className={'content-package-modal' + (full ? ' is-fullscreen' : '')} backdropClassName="customer-modal package-backdrop">
    <div className="package-dialog-context"><div><span className={'pill ' + (cycle.status === 'closed' ? 'muted' : 'ok')}>{cycle.status === 'closed' ? 'Đã chốt' : 'Đang chạy'}</span><span>{shortDate(cycle.start)} – {shortDate(cycle.actualEnd || cycle.plannedEnd)}</span><span>{entry.planned} bài / gói</span>{!manage && <span>Chế độ xem{role === 'partner' ? ' / xử lý bài được giao' : ''}</span>}</div><button type="button" className="text-btn" aria-pressed={full} onClick={() => setFull(!full)}>{full ? 'Thu nhỏ' : 'Mở rộng toàn màn hình'}</button></div>
    <div className="package-dialog-toolbar">
      <div className="package-summary"><strong>{entry.summaryOnly ? 'Kết quả đã chốt' : `${all.length} bài${role === 'partner' ? ' được giao' : ''}`}</strong><span>{entry.published}/{role === 'partner' ? entry.core : entry.planned} bài chính đã đăng{entry.bonus ? ' · ' + entry.bonus + ' bài tặng' : ''}</span><span>{entry.review} chờ duyệt</span>{entry.late > 0 && cycle.status === 'running' && <span className="package-warning">{entry.late} trễ hạn</span>}{entry.cancelled > 0 && <span>{entry.cancelled} đã hủy</span>}</div>
      <div className="package-tools"><button type="button" className="secondary" disabled={!manage} onClick={() => setChild(<ContentImportModal project={project} cycleNo={cycleNo} />)}>Nhập / dán Excel</button><button type="button" className="secondary" disabled={exporting || !all.length} onClick={async () => { setExporting(true); try { await exportPlan(all.map((row) => row.item), project.code + '-chu-ky-' + cycleNo) } catch { toast('Không xuất được Excel. Thử lại.') } finally { setExporting(false) } }}>{exporting ? 'Đang xuất…' : 'Xuất Excel'}</button><button type="button" className="primary" disabled={!manage} onClick={() => setChild(<ContentItemModal project={project} cycleNo={cycleNo} />)}>＋ Thêm bài</button></div>
    </div>
    <div className="package-dialog-body" ref={bodyRef}>
      {writing ? <><div className="package-writing-return"><button type="button" className="text-btn" onClick={() => write('')}>← Bảng bài trong gói</button><span>Viết nội dung dài, giữ bảng gọn</span></div><ContentPlanWorkspace key={writing.item.id} rows={all} initialKey={`${projectId}:${cycleNo}:${writing.item.id}`} editable onOpen={open} /></> : <>
        {!entry.summaryOnly && <div className="package-inner-filters"><label className="package-search"><span className="plan-sr-only">Tìm bài trong gói</span><input type="search" placeholder="Tìm chủ đề, ý tưởng, nhân sự…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select aria-label="Người phụ trách bài" value={person} onChange={(event) => setPerson(event.target.value)}><option value="">Tất cả nhân sự</option>{people.map((name) => <option key={name}>{name}</option>)}</select><div className="posts-quick-filters">{[['', 'Tất cả'], ['mine', 'Cần tôi xử lý'], ['review', 'Chờ duyệt'], ['publish', 'Sắp đăng'], ['late', 'Trễ hạn'], ['unassigned', 'Chưa phân công']].map(([id, name]) => <button type="button" key={id} aria-pressed={quick === id} className={quick === id ? 'active' : ''} onClick={() => setQuick(id)}>{name}</button>)}</div></div>}
        {entry.summaryOnly ? <div className="package-legacy"><h3>Chu kỳ {cycleNo} đã chốt</h3><p>Đã đăng {entry.published} / {entry.planned} bài.</p><p>{cycle.result?.note}</p><small>Dữ liệu cũ chỉ lưu kết quả tổng, chưa có chi tiết từng bài.</small></div> : <>
          <div className="package-sheet-hint"><span>{rows.length} / {all.length} bài · {manage || role === 'partner' ? 'Ô nội dung tự lưu khi rời ô. Enter chuyển xuống; Shift + Enter xuống dòng trong ý tưởng.' : 'Bấm bài để xem nội dung và lịch sử.'}</span><span role="status">{status}</span></div>
          <table className="package-sheet" aria-label={'Bảng nội dung chu kỳ ' + cycleNo}><thead><tr><th>Bài / Định dạng</th><th>Ý tưởng chung</th><th>Phụ trách</th><th>Tiến độ / Hạn kế tiếp</th><th>Lịch đăng</th></tr></thead><tbody>{rows.map((row) => {
            const { item, timing } = row
            const editable = canWriteBrief(role, account, project, cycleNo, item)
            const assigned = owners(item)
            return <tr key={item.id}>
              <td data-label="Bài"><div className="package-row-heading"><button type="button" onClick={() => write(item.id)}>#{item.stt} · Mở nội dung</button>{item.bonus && <em className="tag-bonus">Tặng</em>}{manage && <button type="button" className="package-duplicate" aria-label={'Nhân bản bài #' + item.stt} onClick={() => duplicate(item)}>Nhân bản</button>}</div>
                {editable ? <input className="sheet-title" aria-label={'Tên bài #' + item.stt} data-cell="title" data-row={item.id} key={item.title} defaultValue={item.title} onKeyDown={(event) => nextCell(event, 'title', item.id)} onBlur={(event) => { const input = event.currentTarget; save(item, 'title', input.value, () => { input.value = item.title }) }} /> : <button type="button" className="sheet-title-read" onClick={() => write(item.id)}>{item.title}</button>}
                <div className="package-row-meta"><select aria-label={'Định dạng bài #' + item.stt} disabled={!editable} value={item.format} onChange={(event) => save(item, 'format', event.target.value, () => {})}>{['Video', 'Ảnh', 'Album'].map((name) => <option key={name}>{name}</option>)}</select><input aria-label={'Thể loại bài #' + item.stt} key={item.category} defaultValue={item.category} readOnly={!editable} placeholder="Thể loại" onBlur={(event) => { const input = event.currentTarget; save(item, 'category', input.value, () => { input.value = item.category }) }} /></div>
              </td>
              <td data-label="Ý tưởng">{editable ? <textarea rows={3} aria-label={'Ý tưởng bài #' + item.stt} data-cell="mainIdea" data-row={item.id} key={item.mainIdea ?? ''} defaultValue={item.mainIdea ?? ''} placeholder="Thông điệp, ý tưởng chính…" onKeyDown={(event) => nextCell(event, 'mainIdea', item.id)} onBlur={(event) => { const input = event.currentTarget; save(item, 'mainIdea', input.value, () => { input.value = item.mainIdea ?? '' }) }} /> : <button type="button" className="sheet-idea-read" onClick={() => write(item.id)}>{item.mainIdea || 'Mở brief / kịch bản'}</button>}<button type="button" className="sheet-write-link" onClick={() => write(item.id)}>Brief / kịch bản{item.planSections?.some((section) => section.body) ? ' · Có mục bổ sung' : ''}</button></td>
              <td data-label="Phụ trách"><div className="sheet-owners"><span>Content<strong>{assigned.content}</strong></span><span>Media<strong>{assigned.media}</strong></span></div><button type="button" className="sheet-write-link" onClick={() => open(row)}>{manage ? 'Phân công / bàn giao' : 'Chi tiết công việc'}</button></td>
              <td data-label="Tiến độ"><span className={'pill ' + statusTone(item.stage)}>{postNextStep(item)}</span>{pending(item) && <span className="sheet-next-due">Hạn {shortDate(nextDue(item)) || 'chưa đặt'}<small>{nextOwner(item)}</small></span>}<button type="button" className="sheet-write-link" onClick={() => open(row)}>Duyệt / cập nhật</button></td>
              <td data-label="Lịch đăng"><span className="sheet-date"><small>Dự kiến</small>{shortDate(item.postDate) || 'Chưa xếp lịch'}</span><span className="sheet-date"><small>Thực tế</small>{shortDate(item.publishedAt ?? '') || '—'}</span><span className={'pill ' + (timing === 'Trễ hạn' ? 'waiting' : timing === 'Đúng hạn' ? 'ok' : 'muted')}>{timing}</span></td>
            </tr>
          })}{!rows.length && <tr><td colSpan={5} className="operations-empty">{all.length ? 'Không có bài phù hợp. Đổi bộ lọc trong gói.' : manage ? 'Gói chưa có bài. Thêm bài hoặc nhập / dán Content Plan từ Excel.' : 'Chưa có bài trong chu kỳ này.'}</td></tr>}</tbody></table>
        </>}
      </>}
    </div>
    <div className="package-dialog-footer"><span>{cycle.status === 'closed' ? 'Chu kỳ đã chốt · chỉ xem nội dung và lịch sử' : 'Nội dung, tiến độ và lịch đăng dùng chung từng bài.'}</span><button type="button" className="secondary" onClick={app.closeModal}>Đóng gói</button></div>
  </Modal>
}

function CyclePostDetail({ projectId, cycleNo, initialId, ids }: { projectId: string; cycleNo: number; initialId: string; ids: string[] }) {
  const { role, account } = useApp()
  const { projects } = useData()
  const [selectedId, setSelectedId] = useState(initialId)
  const project: Project | undefined = projects.find((entry) => entry.id === projectId && inScope(role, account, entry))
  const rows = ids.flatMap((id) => { const item = project?.cycles.find((cycle) => cycle.no === cycleNo)?.contents.find((item) => item.id === id); return project && item && visibleToPost(role, account, project, item) ? [item] : [] })
  const item = rows.find((item) => item.id === selectedId)
  if (!project || !item) return <Modal title="Chi tiết bài"><p className="operations-empty">Bài không còn tồn tại hoặc quyền xem đã thay đổi.</p></Modal>
  const index = rows.indexOf(item)
  return <ContentItemModal key={item.id} project={project} cycleNo={cycleNo} item={item} navigation={<div className="post-detail-nav"><button type="button" disabled={!index} onClick={() => setSelectedId(rows[index - 1].id)}>← Bài trước</button><span>{index + 1} / {rows.length} · Chu kỳ {cycleNo}</span><button type="button" disabled={index === rows.length - 1} onClick={() => setSelectedId(rows[index + 1].id)}>Bài sau →</button></div>} />
}
