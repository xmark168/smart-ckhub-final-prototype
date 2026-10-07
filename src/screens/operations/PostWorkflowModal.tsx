import { useRef, useState, type ReactNode } from 'react'
import { useApp } from '../../app/context'
import { field } from '../../lib/form'
import { shortDate, TODAY } from '../../lib/format'
import { assignmentOptions, canRecordPublication, canWorkOnPost, canWriteBrief, logContent, PHASE_LABEL, postPhase, safeLink, setPublication, transitionPost, validDate, type PostAction } from '../../lib/contentWorkflow'
import { inScope, sessionName } from '../../lib/scope'
import { update, useData } from '../../store/store'
import type { ContentChannel, ContentItem, Platform, Project } from '../../store/types'
import { Modal } from '../../ui/Modal'
import { ContentPlanWorkspace } from './ContentPlanWorkspace'
import { contentTiming } from '../../lib/content'

const PLATFORMS: Platform[] = ['Facebook', 'TikTok']
const actionKind = (action: PostAction) => action === 'submit-content' || action === 'revise' ? 'content' : action === 'submit-media' ? 'media' : 'manage'

export function PostWorkflowModal({ project, item, cycleNo, initialStage, navigation }: { project: Project; item: ContentItem; cycleNo: number; initialStage?: string; navigation?: ReactNode }) {
  const { role, account, toast, closeModal } = useApp()
  const data = useData()
  const liveProject = data.projects.find((entry) => entry.id === project.id)
  const cycle = liveProject?.cycles.find((entry) => entry.no === cycleNo)
  const post = cycle?.contents.find((entry) => entry.id === item.id)
  const [tab, setTab] = useState(initialStage === 'Đã đăng' || initialStage === 'Lên lịch' ? 'publish' : 'production')
  const [message, setMessage] = useState('')
  const dirty = useRef(false)
  const leave = (next: () => void) => {
    if (dirty.current && !window.confirm('Có thay đổi chưa lưu. Bỏ thay đổi và tiếp tục?')) return
    dirty.current = false; next()
  }
  if (!liveProject || !post || !inScope(role, account, liveProject)) return <Modal title="Chi tiết bài"><p className="empty-copy">Bài không còn tồn tại hoặc quyền dự án đã bị thu hồi.</p></Modal>
  const manage = canWorkOnPost(role, account, liveProject, cycleNo, post, 'manage')
  const media = canWorkOnPost(role, account, liveProject, cycleNo, post, 'media') && postPhase(post) === 'production' && post.stage !== 'Đã đăng'
  const content = canWriteBrief(role, account, liveProject, cycleNo, post)
  const phase = postPhase(post)
  const by = sessionName(role, account)

  const mutate = (kind: 'content' | 'media' | 'manage', change: (target: ContentItem, targetProject: Project) => void) => {
    let result = false
    try {
      update((draft) => {
        const targetProject = draft.projects.find((entry) => entry.id === project.id)
        const target = targetProject?.cycles.find((entry) => entry.no === cycleNo)?.contents.find((entry) => entry.id === item.id)
        if (!targetProject || !target || !canWorkOnPost(role, account, targetProject, cycleNo, target, kind)) throw new Error('Chu kỳ đã chốt hoặc quyền thao tác đã thay đổi.')
        change(target, targetProject); result = true
      })
      dirty.current = false; setMessage('Đã lưu'); return result
    } catch (error) { toast(error instanceof Error ? error.message : 'Không lưu được thay đổi.'); return false }
  }

  const saveProduction = (form: HTMLFormElement, action?: PostAction) => {
    const kind = action ? actionKind(action) : manage ? 'manage' : 'media'
    const note = field(form, 'feedback')
    mutate(kind, (target, targetProject) => {
      const manager = canWorkOnPost(role, account, targetProject, cycleNo, target, 'manage')
      if (manager) {
        const selectedPeople = (kind: 'content' | 'media') => Array.from(form.querySelectorAll<HTMLInputElement>(`input[name="${kind}People"]:checked`), (input) => input.value)
        const assignees = { content: selectedPeople('content'), media: selectedPeople('media') }
        const available = assignmentOptions(targetProject)
        if ([...assignees.content, ...assignees.media].some((name) => !available.includes(name) && ![...(target.assignees?.content ?? []), ...(target.assignees?.media ?? [])].includes(name))) throw new Error('Nhân sự chưa có quyền tham gia dự án.')
        if (JSON.stringify(assignees) !== JSON.stringify(target.assignees)) { target.assignees = assignees; logContent(target, by, 'Cập nhật phân công', `Content: ${assignees.content.join(', ') || 'Chưa phân công'} · Media: ${assignees.media.join(', ') || 'Chưa phân công'}`) }
        const deadlines = { deadlineScript: field(form, 'deadlineScript'), deadlineEdit: field(form, 'deadlineEdit') }
        if (Object.values(deadlines).some((date) => date && !validDate(date))) throw new Error('Hạn sản xuất không hợp lệ.')
        if (Object.entries(deadlines).some(([key, date]) => target[key as keyof typeof deadlines] !== date)) {
          logContent(target, by, 'Điều chỉnh hạn sản xuất', `Hạn cũ · Content: ${target.deadlineScript || 'Chưa chọn'} · Media: ${target.deadlineEdit || 'Chưa chọn'}`)
          Object.assign(target, deadlines)
        }
      }
      if (!action && !manager && postPhase(target) !== 'production') throw new Error('Bản sản xuất đã gửi duyệt; tạo bản sửa trước khi thay đổi.')
      if (form.querySelector('[name="mediaLink"]') && canWorkOnPost(role, account, targetProject, cycleNo, target, 'media') && postPhase(target) === 'production') {
        const mediaLink = field(form, 'mediaLink'), sourceLink = field(form, 'sourceLink')
        if ([mediaLink, sourceLink].some((link) => link && !safeLink(link))) throw new Error('Link phải bắt đầu bằng http:// hoặc https://.')
        if (target.mediaLink !== mediaLink || (target.sourceLink ?? '') !== sourceLink) logContent(target, by, 'Lưu bản sản xuất trước cập nhật', note)
        target.mediaLink = mediaLink; target.sourceLink = sourceLink
      }
      if (action) transitionPost(target, action, by, note, field(form, 'approvalDate') || TODAY)
      else if (note) logContent(target, by, 'Ghi chú sản xuất', note)
    })
  }

  const readChannels = (form: HTMLFormElement): ContentChannel[] => PLATFORMS.filter((platform) => form.querySelector<HTMLInputElement>(`[name="enabled-${platform}"]`)?.checked).map((platform) => ({ platform, status: field(form, 'status-' + platform) as ContentChannel['status'], postDate: field(form, 'date-' + platform), publishedAt: field(form, 'actual-' + platform) || undefined, time: field(form, 'time-' + platform), link: field(form, 'link-' + platform) }))
  const formOf = (button: HTMLButtonElement) => button.closest('form')!
  const options = [...new Set([...assignmentOptions(liveProject), ...(post.assignees?.content ?? []), ...(post.assignees?.media ?? [])])]

  return <Modal title={'Bài #' + post.stt + ' · ' + liveProject.customer} className="post-workflow-modal" onClose={() => leave(closeModal)} onSubmit={tab === 'production' ? (form) => saveProduction(form) : tab === 'publish' && manage ? (form) => mutate('manage', (target) => setPublication(target, readChannels(form), by)) : undefined}>
    <div className="form" onChangeCapture={(event) => { if (!(event.target as HTMLElement).closest('.content-plan-workspace')) { dirty.current = true; setMessage('Có thay đổi chưa lưu') } }}>
      {navigation && <div onClickCapture={(event) => { if (dirty.current && !window.confirm('Có thay đổi chưa lưu. Bỏ thay đổi để chuyển bài?')) { event.stopPropagation(); return } dirty.current = false }}>{navigation}</div>}
      <div className="post-workflow-summary"><strong>{post.title}</strong><span>{post.stage === 'Đã đăng' || post.stage === 'Đã hủy' ? post.stage : post.workflow && !post.workflow.legacy ? PHASE_LABEL[phase] + ' · Bản ' + post.workflow.revision : post.stage + ' · Bài cũ chưa ghi nhận quy trình duyệt'}</span></div>
      <nav className="post-detail-sections" aria-label="Thông tin bài">{[['content', 'Nội dung'], ['production', 'Sản xuất & duyệt'], ['publish', 'Lịch đăng'], ['history', 'Lịch sử']].map(([id, name]) => <button type="button" key={id} className={tab === id ? 'active' : ''} aria-pressed={tab === id} onClick={() => leave(() => { setTab(id); setMessage('') })}>{name}</button>)}</nav>
      {tab === 'content' && <ContentPlanWorkspace rows={[{ project: liveProject, cycleNo, item: post, timing: contentTiming(post) }]} editable={content} onOpen={() => setTab('production')} />}
      {tab === 'production' && <>
        <fieldset className="content-item-fields" disabled={!manage}>
          <div className="form-grid">{(['content', 'media'] as const).map((kind) => <fieldset className="post-assignee-picker" key={kind + JSON.stringify(post.assignees?.[kind])}><legend>{kind === 'content' ? 'Content phụ trách' : 'Media dựng / thiết kế'}</legend><div>{options.map((name) => <label key={name}><input type="checkbox" name={kind + 'People'} value={name} defaultChecked={post.assignees?.[kind].includes(name)} /><span>{name}{!liveProject.members?.some((member) => member.name === name && member.access === 'edit') && <small>Chỉ xem</small>}</span></label>)}</div></fieldset>)}</div>
          <p className="cd-note">Có thể chọn nhiều người. Người được giao cần quyền sửa dự án; phân công không tự cấp quyền.</p>
          <div className="form-grid"><label className="field">Hạn Content<input type="date" name="deadlineScript" defaultValue={post.deadlineScript} /></label><label className="field">Hạn dựng / thiết kế<input type="date" name="deadlineEdit" defaultValue={post.deadlineEdit} /></label></div>
        </fieldset>
        <fieldset className="content-item-fields" disabled={!media}><label className="field">Link source<input name="sourceLink" type="url" key={post.sourceLink} defaultValue={post.sourceLink ?? ''} placeholder="https://drive.google.com/…" /></label><label className="field">Link bản dựng / thiết kế<input name="mediaLink" type="url" key={post.mediaLink} defaultValue={post.mediaLink} placeholder="https://…" /></label></fieldset>
        {(manage || content || media) && <><label className="field">Phản hồi / ghi chú<textarea name="feedback" rows={3} placeholder="Ghi rõ phần cần sửa, hoặc kết quả duyệt từ khách…" /></label>{phase === 'client-review' && manage && <label className="field">Ngày khách duyệt<input type="date" name="approvalDate" max={TODAY} defaultValue={TODAY} /></label>}</>}
        <div className="post-workflow-actions">
          {content && phase === 'draft' && <button type="button" className="primary" onClick={(event) => saveProduction(formOf(event.currentTarget), 'submit-content')}>Gửi duyệt nội dung</button>}
          {manage && phase === 'content-review' && <><button type="button" className="primary" onClick={(event) => saveProduction(formOf(event.currentTarget), 'approve-content')}>Duyệt nội dung</button><button type="button" className="secondary" onClick={(event) => saveProduction(formOf(event.currentTarget), 'request-content')}>Yêu cầu sửa nội dung</button></>}
          {media && phase === 'production' && <button type="button" className="primary" onClick={(event) => saveProduction(formOf(event.currentTarget), 'submit-media')}>Gửi bản sản xuất</button>}
          {manage && phase === 'client-review' && <><button type="button" className="primary" onClick={(event) => saveProduction(formOf(event.currentTarget), 'approve-client')}>Ghi nhận khách duyệt</button><button type="button" className="secondary" onClick={(event) => saveProduction(formOf(event.currentTarget), 'request-media')}>Khách yêu cầu sửa</button></>}
          {phase !== 'draft' && canWorkOnPost(role, account, liveProject, cycleNo, post, 'content') && post.stage !== 'Đã đăng' && !post.channels.some((channel) => channel.status === 'Đã đăng') && <button type="button" className="secondary" onClick={() => mutate('content', (target) => transitionPost(target, 'revise', by))}>Tạo bản sửa · duyệt lại</button>}
        </div>
        {manage && post.stage !== 'Đã đăng' && !post.channels.some((channel) => channel.status === 'Đã đăng') && <button type="button" className="text-btn" onClick={(event) => { const reason = field(formOf(event.currentTarget), 'feedback'); if (!reason) { toast('Nhập lý do hủy trong Phản hồi / ghi chú.'); return } mutate('manage', (target) => { if (target.channels.some((channel) => channel.status === 'Đã đăng')) throw new Error('Bài đã đăng một kênh; giữ kết quả xuất bản.'); logContent(target, by, 'Hủy bài', reason); target.stage = 'Đã hủy'; target.cancellation = { date: TODAY, by, reason } }) }}>Hủy bài có lý do</button>}
      </>}
      {tab === 'publish' && <>
        <p className="cd-note">Ghi nhận thủ công từng kênh. Bài hoàn tất khi các kênh đã chọn đều đăng; tính một bài định mức.</p>
        {!canRecordPublication(post) && <p className="cd-note">Có thể lập lịch dự kiến. Ghi nhận khách duyệt bản cuối để lên lịch hoặc xác nhận đã đăng.</p>}
        <fieldset className="content-item-fields" disabled={!manage}>
          {PLATFORMS.map((platform) => { const channel = post.channels.find((entry) => entry.platform === platform); return <section className="post-channel-editor" key={platform}>
            <label className="filter-check"><input type="checkbox" name={'enabled-' + platform} defaultChecked={Boolean(channel)} /> {platform}</label>
            <div className="form-grid"><label className="field">Trạng thái<select name={'status-' + platform} disabled={!canRecordPublication(post)} defaultValue={channel?.status ?? 'Chưa lên lịch'}><option>Chưa lên lịch</option><option>Đã lên lịch</option><option>Đã đăng</option></select></label><label className="field">Ngày đăng dự kiến<input type="date" name={'date-' + platform} defaultValue={channel?.postDate ?? post.postDate} /></label><label className="field">Giờ dự kiến<input type="time" name={'time-' + platform} defaultValue={channel?.time || '17:00'} /></label><label className="field">Ngày đăng thực tế<input type="date" name={'actual-' + platform} disabled={!canRecordPublication(post)} max={TODAY} defaultValue={channel?.publishedAt ?? (channel?.status === 'Đã đăng' ? post.publishedAt : '')} /></label></div>
            <label className="field">Link bài đã đăng<input type="url" name={'link-' + platform} disabled={!canRecordPublication(post)} defaultValue={channel?.link ?? ''} placeholder="https://…" /></label>
          </section> })}
        </fieldset>
      </>}
      {tab === 'history' && <div className="post-history">{post.workflow?.history.length ? post.workflow.history.map((event) => <section key={event.id}><strong>{event.action} · Bản {event.revision}</strong><small>{event.by} · {new Date(event.at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</small>{event.note && <p>{event.note}</p>}<details><summary>Xem nội dung tại thời điểm này</summary><Snapshot text={event.snapshot} /></details></section>) : <p className="empty-copy">Chưa có lịch sử bàn giao. Dữ liệu cũ được giữ nguyên.</p>}{post.cancellation && <p>Hủy ngày {shortDate(post.cancellation.date)} · {post.cancellation.by}: {post.cancellation.reason}</p>}</div>}
      <p className="plan-save-status" role="status">{message || (!manage && !content && !media ? 'Chỉ xem · không có quyền sửa bài hoặc chu kỳ đã chốt.' : '')}</p>
      <div className="form-actions"><button className="secondary" type="button" onClick={() => leave(closeModal)}>Đóng</button>{tab === 'production' && (manage || media) && <button className="primary">Lưu phân công / sản xuất</button>}{tab === 'publish' && manage && <button className="primary">{canRecordPublication(post) ? 'Lưu kết quả từng kênh' : 'Lưu lịch dự kiến'}</button>}</div>
    </div>
  </Modal>
}

function Snapshot({ text }: { text: string }) {
  let value: Partial<ContentItem> = {}
  try { value = JSON.parse(text) } catch { return <p>Không đọc được bản lưu.</p> }
  return <div className="post-snapshot"><b>{value.title}</b>{[[value.planLabels?.mainIdea || 'Ý tưởng chung', value.mainIdea], [value.planLabels?.contentDirection || 'Nội dung', value.contentDirection], [value.planLabels?.visualDirection || 'Hình ảnh / thoại', value.visualDirection], ...(value.planSections?.map((section) => [section.title, section.body]) ?? []), ['Source', value.sourceLink], ['Bản sản xuất', value.mediaLink]].filter(([, body]) => body).map(([name, body], index) => <section key={index}><strong>{name}</strong><p>{body}</p></section>)}{value.assignees && <p>Content: {value.assignees.content.join(', ') || 'Chưa phân công'} · Media: {value.assignees.media.join(', ') || 'Chưa phân công'}</p>}{value.channels?.map((channel) => <section key={channel.platform}><strong>{channel.platform} · {channel.status}</strong><p>Dự kiến: {channel.postDate || '—'} {channel.time} · Thực tế: {channel.publishedAt || '—'}</p>{channel.link && <p>{channel.link}</p>}</section>)}</div>
}
