import { useState } from 'react'
import { useApp } from '../../app/context'
import { contentAssignees, type ContentTiming } from '../../lib/content'
import { canWriteBrief } from '../../lib/contentWorkflow'
import { getData, useData } from '../../store/store'
import type { ContentItem, Project } from '../../store/types'
import { viewOnlyReason } from '../../ui/viewOnly'
import { updateProject } from '../projects/projectLogic'

export interface ContentPlanRow { project: Project; cycleNo: number; item: ContentItem; timing: ContentTiming }
type PlanField = 'title' | 'category' | 'mainIdea' | 'contentDirection' | 'visualDirection' | 'mission' | 'format' | 'documentLink'
const rowKey = (row: ContentPlanRow) => `${row.project.id}:${row.cycleNo}:${row.item.id}`
const CORE_SECTIONS = [
  { key: 'mainIdea', title: 'Ý tưởng chung', placeholder: 'Thông điệp chính, điểm thu hút của bài…', rows: 3 },
  { key: 'contentDirection', title: 'Triển khai nội dung', placeholder: 'Kịch bản, thông tin ưu đãi, nội dung triển khai…', rows: 5 },
  { key: 'visualDirection', title: 'Hình ảnh / thoại', placeholder: 'Giữ nguyên thoại, caption và hướng hình ảnh từ Excel…', rows: 5 },
] as const

export function ContentPlanWorkspace({ rows, editable: allowed, onOpen, initialKey }: { rows: ContentPlanRow[]; editable: boolean; onOpen: (row: ContentPlanRow) => void; initialKey?: string }) {
  const { role, account, toast } = useApp()
  const { tasks } = useData()
  const [selectedKey, setSelectedKey] = useState(initialKey ?? '')
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState('')
  const row = rows.find((entry) => rowKey(entry) === selectedKey) ?? rows[0]
  const editable = Boolean(allowed && row && canWriteBrief(role, account, row.project, row.cycleNo, row.item))
  const index = row ? rows.indexOf(row) : -1

  const mutatePlan = (change: (item: ContentItem) => void, reset: () => void = () => {}) => {
    if (!row || !editable) return
    const project = getData().projects.find((entry) => entry.id === row.project.id)
    const cycle = project?.cycles.find((entry) => entry.no === row.cycleNo)
    if (!project || !canWriteBrief(role, account, project, row.cycleNo, cycle?.contents.find((entry) => entry.id === row.item.id) ?? row.item) || project.state !== 'active' || cycle?.status !== 'running' || viewOnlyReason()) {
      toast('Không thể lưu: chu kỳ đã chốt hoặc quyền sửa đã thay đổi.'); reset(); return
    }
    let saved = false
    updateProject(project.id, (draft) => {
      const targetCycle = draft.cycles.find((entry) => entry.no === row.cycleNo)
      if (!canWriteBrief(role, account, draft, row.cycleNo, targetCycle?.contents.find((entry) => entry.id === row.item.id) ?? row.item) || draft.state !== 'active' || targetCycle?.status !== 'running') return
      const item = targetCycle.contents.find((entry) => entry.id === row.item.id)
      if (item) { change(item); saved = true }
    })
    if (saved) setStatus('Đã lưu thay đổi')
    else { toast('Bài không còn trong chu kỳ này.'); reset() }
  }

  const save = (key: PlanField, value: string, reset: () => void) => {
    if (!row || !editable || value === (row.item[key] ?? '')) return
    if (key === 'title' && !value.trim()) { toast('Tên bài không được trống.'); reset(); return }
    if (key === 'documentLink' && value.trim()) {
      try { if (!['http:', 'https:'].includes(new URL(value).protocol)) throw new Error() }
      catch { toast('Link tài liệu phải bắt đầu bằng https:// hoặc http://.'); reset(); return }
    }
    mutatePlan((item) => Object.assign(item, { [key]: value.trim() }), reset)
  }

  const addSection = (title: string) => mutatePlan((item) => {
    const sections = item.planSections ??= []
    const hidden = sections.find((section) => section.title === title && section.hidden)
    if (hidden) { hidden.hidden = false; return }
    let name = title, n = 2
    while (sections.some((section) => section.title.toLowerCase() === name.toLowerCase())) name = title + ' (' + n++ + ')'
    sections.push({ id: crypto.randomUUID(), title: name, body: '' })
  })

  const select = (entry: ContentPlanRow) => { setSelectedKey(rowKey(entry)); setStatus('') }
  const textField = (key: PlanField, label: string, placeholder: string, size: number) => <label className={"field" + (key === "title" ? " plan-title-field" : " plan-body-field")} key={key}><span>{label}</span>
    <textarea key={rowKey(row) + key + (row.item[key] ?? '')} rows={size} defaultValue={row.item[key] ?? ''} readOnly={!editable} placeholder={placeholder}
      onBlur={(event) => { const input = event.currentTarget; save(key, input.value, () => { input.value = String(row.item[key] ?? '') }) }} />
  </label>

  if (!row) return <p className="operations-empty">Chưa có bài trong phạm vi này. Chọn dự án để thêm bài hoặc nhập Excel.</p>

  return <div className="content-plan-workspace">
    <aside className="plan-article-list" aria-label="Danh sách bài Content Plan">
      <div className="plan-list-heading"><strong>Danh sách bài <span>{rows.length}</span></strong><button type="button" aria-pressed={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Thu gọn ý tưởng' : 'Mở rộng ý tưởng'}</button></div>
      <div className="plan-article-scroll">
        {rows.map((entry) => <button type="button" key={rowKey(entry)} className={'plan-article-card' + (rowKey(entry) === rowKey(row) ? ' selected' : '')} aria-pressed={rowKey(entry) === rowKey(row)} onClick={() => select(entry)}>
          <span className="plan-card-meta"><span>#{entry.item.stt} · {entry.item.format}</span><span className="plan-stage">{entry.item.stage}</span></span>
          <strong>{entry.item.title}</strong>
          <span className="plan-card-project">{entry.project.customer} · Chu kỳ {entry.cycleNo}{entry.project.cycles.find((cycle) => cycle.no === entry.cycleNo)?.status === 'closed' ? ' · Đã chốt' : ''}</span>
          {(entry.item.mainIdea || expanded) && <span className={expanded ? 'plan-card-idea expanded' : 'plan-card-idea'}>{entry.item.mainIdea || 'Chưa có ý tưởng chung'}</span>}
        </button>)}
      </div>
    </aside>
    <article className="plan-writing-pane" aria-label={'Soạn nội dung bài #' + row.item.stt}>
      <div className="plan-writing-heading"><div><span className="plan-card-meta">{row.project.customer} · Chu kỳ {row.cycleNo} · Bài #{row.item.stt}</span><h2>Content Plan</h2></div><button type="button" className="secondary" onClick={() => onOpen(row)}>Bàn giao & xuất bản ↗</button></div>
      <div className="plan-writing-nav"><button type="button" disabled={index <= 0} onClick={() => select(rows[index - 1])}>← Bài trước</button><span>{index + 1} / {rows.length}</span><button type="button" disabled={index >= rows.length - 1} onClick={() => select(rows[index + 1])}>Bài sau →</button></div>
      <p className="plan-save-status" role="status">{editable ? status || 'Tự lưu khi rời ô' : 'Nội dung chỉ xem · bài đã gửi duyệt, đã chốt hoặc chưa có quyền sửa.'}</p>
      {textField('title', 'Chủ đề / tên bài', 'Tên bài trong Content Plan', 2)}
      <div className="plan-writing-meta">
        <label className="field">Nhiệm vụ<select disabled={!editable} value={row.item.mission} onChange={(event) => save('mission', event.target.value, () => {})}><option>Thương hiệu</option><option>Bán hàng</option></select></label>
        <label className="field">Thể loại<input key={rowKey(row) + row.item.category} defaultValue={row.item.category} readOnly={!editable} placeholder="Review, Chia sẻ…" onBlur={(event) => { const input = event.currentTarget; save('category', input.value, () => { input.value = row.item.category }) }} /></label>
        <label className="field">Định dạng<select disabled={!editable} value={row.item.format} onChange={(event) => save('format', event.target.value, () => {})}><option>Video</option><option>Ảnh</option><option>Album</option></select></label>
      </div>
      <div className="plan-assignees" aria-label="Nhân sự phụ trách"><span>Content <strong>{contentAssignees(tasks, row.project.id, row.cycleNo, row.item.id, row.item).content}</strong></span><span>Media <strong>{contentAssignees(tasks, row.project.id, row.cycleNo, row.item.id, row.item).media}</strong></span></div>
      <div className="plan-flex-tools"><div><strong>Nội dung triển khai</strong><p>Thêm mục phù hợp với cách làm của team.</p></div><label><span className="plan-sr-only">Thêm mục</span><select defaultValue="" disabled={!editable} onChange={(event) => { if (event.target.value) addSection(event.target.value); event.target.value = '' }}><option value="">＋ Thêm mục…</option>{(row.item.format === 'Video' ? ['Thoại Talent', 'Cảnh trám / góc quay', 'Caption', 'Lưu ý cho Content', 'Đạo cụ / nguồn tham khảo', 'Mục riêng'] : ['Caption', 'Hướng thiết kế / poster', 'Hình ảnh cần chụp', 'Lưu ý cho Content', 'Nguồn tham khảo', 'Mục riêng']).map((name) => <option key={name}>{name}</option>)}</select></label></div>
      {CORE_SECTIONS.filter((section) => !row.item.planHidden?.includes(section.key)).map((section) => <section className="plan-flex-section" key={section.key}>
        <div className="plan-section-heading"><h3>{row.item.planLabels?.[section.key] ?? section.title}</h3><details className="plan-section-config" key={rowKey(row) + section.key}><summary aria-label={'Tùy chỉnh ' + (row.item.planLabels?.[section.key] ?? section.title)}>Tùy chỉnh</summary><div className="plan-config-body"><label className="field">Tên mục<input aria-label={'Tên mục ' + section.title} key={rowKey(row) + section.key + (row.item.planLabels?.[section.key] ?? '')} defaultValue={row.item.planLabels?.[section.key] ?? section.title} readOnly={!editable} onBlur={(event) => {
          const input = event.currentTarget, value = input.value.trim(), original = row.item.planLabels?.[section.key] ?? section.title
          if (!value) { input.value = original; toast('Tên mục không được trống.'); return }
          if (value !== original) mutatePlan((item) => { item.planLabels = { ...item.planLabels, [section.key]: value } }, () => { input.value = original })
        }} /></label>{editable && <button type="button" onClick={() => mutatePlan((item) => { item.planHidden = [...new Set([...(item.planHidden ?? []), section.key])] })}>Ẩn mục</button>}</div></details></div>
        {textField(section.key, 'Nội dung · ' + (row.item.planLabels?.[section.key] ?? section.title), section.placeholder, section.rows)}
      </section>)}
      {(row.item.planSections ?? []).filter((section) => !section.hidden).map((section, index, visible) => <section className="plan-flex-section" key={section.id}>
        <div className="plan-section-heading"><h3>{section.title}</h3><details className="plan-section-config" key={rowKey(row) + section.id}><summary aria-label={'Tùy chỉnh ' + section.title}>Tùy chỉnh</summary><div className="plan-config-body"><label className="field">Tên mục<input aria-label={'Tên mục bổ sung ' + section.title} key={rowKey(row) + section.id + section.title} defaultValue={section.title} readOnly={!editable} onBlur={(event) => {
          const input = event.currentTarget, value = input.value.trim()
          if (!value || row.item.planSections?.some((entry) => entry.id !== section.id && entry.title.toLowerCase() === value.toLowerCase())) { input.value = section.title; toast('Tên mục phải có nội dung và không trùng mục bổ sung khác.'); return }
          if (value !== section.title) mutatePlan((item) => { const target = item.planSections?.find((entry) => entry.id === section.id); if (target) target.title = value }, () => { input.value = section.title })
        }} /></label>{editable && <div className="plan-section-actions"><button type="button" disabled={!index} aria-label={'Đưa lên ' + section.title} onClick={() => mutatePlan((item) => {
          const sections = item.planSections ?? [], from = sections.findIndex((entry) => entry.id === section.id), to = sections.findIndex((entry) => entry.id === visible[index - 1].id)
          if (from >= 0 && to >= 0) [sections[from], sections[to]] = [sections[to], sections[from]]
        })}>↑</button><button type="button" disabled={index === visible.length - 1} aria-label={'Đưa xuống ' + section.title} onClick={() => mutatePlan((item) => {
          const sections = item.planSections ?? [], from = sections.findIndex((entry) => entry.id === section.id), to = sections.findIndex((entry) => entry.id === visible[index + 1].id)
          if (from >= 0 && to >= 0) [sections[from], sections[to]] = [sections[to], sections[from]]
        })}>↓</button><button type="button" onClick={() => mutatePlan((item) => { const target = item.planSections?.find((entry) => entry.id === section.id); if (target) target.hidden = true })}>Ẩn mục</button></div>}</div></details></div>
        <label className="field plan-body-field"><span>Nội dung · {section.title}</span><textarea key={rowKey(row) + section.id + section.body} rows={5} defaultValue={section.body} readOnly={!editable} placeholder={'Nhập ' + section.title.toLowerCase() + '…'} onBlur={(event) => { const input = event.currentTarget; if (input.value !== section.body) mutatePlan((item) => { const target = item.planSections?.find((entry) => entry.id === section.id); if (target) target.body = input.value.trim() }, () => { input.value = section.body }) }} /></label>
      </section>)}
      {((row.item.planHidden?.length ?? 0) > 0 || row.item.planSections?.some((section) => section.hidden)) && <details className="plan-hidden-sections"><summary>Mục đang ẩn · nội dung vẫn được giữ</summary>{CORE_SECTIONS.filter((section) => row.item.planHidden?.includes(section.key)).map((section) => <button disabled={!editable} key={section.key} type="button" onClick={() => mutatePlan((item) => { item.planHidden = item.planHidden?.filter((key) => key !== section.key) })}>Hiện {row.item.planLabels?.[section.key] ?? section.title}</button>)}{row.item.planSections?.filter((section) => section.hidden).map((section) => <button disabled={!editable} type="button" key={section.id} onClick={() => mutatePlan((item) => { const target = item.planSections?.find((entry) => entry.id === section.id); if (target) target.hidden = false })}>Hiện {section.title}</button>)}</details>}
      <label className="field">Link tài liệu<input type="url" key={rowKey(row) + (row.item.documentLink ?? '')} defaultValue={row.item.documentLink ?? ''} readOnly={!editable} placeholder="https://docs.google.com/…" onBlur={(event) => { const input = event.currentTarget; save('documentLink', input.value, () => { input.value = row.item.documentLink ?? '' }) }} /></label>
      {row.item.documentLink && <a href={row.item.documentLink} target="_blank" rel="noreferrer">Mở tài liệu ↗</a>}
    </article>
  </div>
}
