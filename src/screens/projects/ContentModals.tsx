import { useState, type ReactNode } from 'react'
import { useApp } from '../../app/context'
import { projectCycle } from '../../data/cycles'
import { addDaysIso, formatDate, parseInput, TODAY } from '../../lib/format'
import { canOpenContractCycle, primaryContract, projectOverdue } from '../../data/contracts'
import { checked, field } from '../../lib/form'
import { cycleMilestones, cycleProgress, isPublished, runningCycle, STAGES } from '../../lib/sop'
import { getData, useData } from '../../store/store'
import type { ContentChannel, ContentItem, ContentStage, KeyNote, Platform, Project } from '../../store/types'
import { FormActions, Modal, Req } from '../../ui/Modal'
import { addProjectActivity, canStopProject, updateProject } from './projectLogic'
import { inScope } from '../../lib/scope'
import { contentAssignees } from '../../lib/content'

import { PostWorkflowModal } from '../operations/PostWorkflowModal'

const CATEGORIES = ['Chia sẻ', 'Thông báo', 'Review', 'Mini-game', 'Tiểu phẩm', 'Challenge', 'Khuyến mãi']
const PLATFORMS: Platform[] = ['Facebook', 'TikTok']

function channelStatus(stage: ContentStage): ContentChannel['status'] {
  return stage === 'Đã đăng' ? 'Đã đăng' : stage === 'Lên lịch' ? 'Đã lên lịch' : 'Chưa lên lịch'
}

/**
 * One row of the cycle Content Plan. Opened from the project Content tab (project fixed) or
 * from the Posts page (project chosen here). Always writes to the running cycle.
 */
export function ContentItemModal(props: { project?: Project; item?: ContentItem; initialStage?: ContentStage; cycleNo?: number; navigation?: ReactNode }) {
  const { project, item, cycleNo, initialStage } = props
  if (project && item) return <PostWorkflowModal project={project} item={item} cycleNo={cycleNo ?? project.cycles.find((cycle) => cycle.contents.some((entry) => entry.id === item.id))?.no ?? 0} initialStage={initialStage} navigation={props.navigation} />
  return <LegacyContentItemModal {...props} />
}

function LegacyContentItemModal({ project, item, initialStage, cycleNo, navigation }: { project?: Project; item?: ContentItem; initialStage?: ContentStage; cycleNo?: number; navigation?: ReactNode }) {
  const { closeModal, toast, account, role } = useApp()
  const { projects, params, tasks } = useData()
  const choices = projects.filter((entry) => entry.state === 'active' && runningCycle(entry) && entry.quota.posts > 0 && canStopProject(role, account, entry))
  const [projectId, setProjectId] = useState(project?.id ?? choices[0]?.id ?? '')
  const target = projects.find((entry) => entry.id === projectId && inScope(role, account, entry))
  const cycle = target ? cycleNo !== undefined ? target.cycles.find((entry) => entry.no === cycleNo) : item ? target.cycles.find((entry) => entry.contents.some((content) => content.id === item.id)) : runningCycle(target) : undefined
  const editable = Boolean(target && cycle?.status === 'running' && target.state === 'active' && canStopProject(role, account, target))
  const [stage, setStage] = useState<ContentStage>(initialStage ?? item?.stage ?? 'Ý tưởng')
  const [edit, setEdit] = useState(item?.deadlineEdit ?? '')

  if (!target || !cycle) {
    return (
      <Modal title="Tạo nội dung">
        <div className="customer-data-rules"><p>Không có dự án đang triển khai có chu kỳ và định mức bài đăng.</p></div>
        <div className="form-actions"><button className="primary" type="button" onClick={closeModal}>Đóng</button></div>
      </Modal>
    )
  }

  const core = cycle.contents.filter((entry) => !entry.bonus && entry.stage !== 'Đã hủy')
  const nextStt = cycle.contents.reduce((max, entry) => Math.max(max, entry.stt), 0) + 1
  const current: ContentItem = item ?? {
    id: '', stt: nextStt, bonus: core.length >= target.quota.posts, postDate: '', deadlineScript: '', deadlineEdit: '',
    mission: 'Thương hiệu', category: 'Chia sẻ', topic: '', title: '', format: 'Video', stage: 'Ý tưởng', mediaLink: '',
    channels: PLATFORMS.map((platform) => ({ platform, status: 'Chưa lên lịch', time: '', link: '' })),
  }
  const scriptDue = edit ? addDaysIso(edit, -params.scriptLeadDays) : ''
  const mix = {
    brand: core.filter((entry) => entry.mission === 'Thương hiệu' && entry.id !== current.id).length,
    sales: core.filter((entry) => entry.mission === 'Bán hàng' && entry.id !== current.id).length,
  }

  return (
    <Modal
      title={item ? 'Nội dung #' + item.stt : 'Tạo nội dung'}
      className="content-item-modal"
      projectId={editable ? target.id : undefined}
      onSubmit={!editable ? undefined : (form) => {
        if (!canStopProject(role, account, target)) { toast('Chỉ Account phụ trách hoặc tạo dự án được sửa bài.'); return }
        const postDate = field(form, 'postDate')
        const publishedAt = field(form, 'publishedAt')
        const cancelReason = field(form, 'cancelReason')
        if (stage === 'Đã đăng' && (!publishedAt || publishedAt > TODAY)) {
          toast('Nhập ngày đăng thực tế không vượt quá hôm nay.'); return
        }
        if (stage === 'Đã hủy' && !cancelReason) {
          toast('Nhập lý do hủy bài.'); return
        }
        if ((stage === 'Lên lịch' || stage === 'Đã đăng') && !postDate) {
          toast('Cần ngày đăng khi nội dung ở giai đoạn Lên lịch hoặc Đã đăng.')
          return
        }
        const time = field(form, 'time')
        const next: ContentItem = {
          ...current,
          id: current.id || 'content-' + crypto.randomUUID(),
          assignees: current.assignees ?? { content: [], media: [] },
          workflow: current.workflow ?? { revision: 1, phase: 'draft', history: [] },
          bonus: checked(form, 'bonus'),
          mission: field(form, 'mission') as ContentItem['mission'],
          category: field(form, 'category'),
          topic: field(form, 'topic'),
          title: field(form, 'title'),
          mainIdea: field(form, 'mainIdea'),
          contentDirection: field(form, 'contentDirection'),
          visualDirection: field(form, 'visualDirection'),
          documentLink: field(form, 'documentLink'),
          planSections: current.planSections?.map((section) => ({ ...section, body: section.hidden ? section.body : field(form, 'plan-section-' + section.id) })),
          format: field(form, 'format') as ContentItem['format'],
          stage,
          publishedAt: stage === 'Đã đăng' ? publishedAt : current.publishedAt,
          cancellation: stage === 'Đã hủy' ? { date: current.cancellation?.date ?? TODAY, by: current.cancellation?.by ?? account, reason: cancelReason } : undefined,
          postDate,
          deadlineEdit: edit,
          deadlineScript: field(form, 'deadlineScript') || scriptDue,
          mediaLink: field(form, 'mediaLink'),
          channels: PLATFORMS.filter((platform) => checked(form, 'ch-' + platform)).map((platform) => ({
            platform,
            status: channelStatus(stage),
            time: stage === 'Lên lịch' || stage === 'Đã đăng' ? time || '17:00' : '',
            link: current.channels.find((entry) => entry.platform === platform)?.link ?? '',
          })),
        }
        updateProject(target.id, (draft) => {
          const running = draft.cycles.find((entry) => entry.no === cycle.no)
          if (!running || running.status !== 'running' || draft.state !== 'active' || !canStopProject(role, account, draft)) return
          const index = running.contents.findIndex((entry) => entry.id === next.id)
          if (index >= 0) running.contents[index] = next
          else running.contents.push(next)
          running.contents.sort((a, b) => a.stt - b.stt)
          const title = (item ? 'Nội dung #' : 'Thêm nội dung #') + next.stt + ': ' + next.stage
          const detail = next.title + (next.cancellation ? ' · Lý do hủy: ' + next.cancellation.reason : '')
          running.activity.unshift({ title, detail, time: 'Vừa xong' })
          if (!item || item.stage !== next.stage) addProjectActivity(draft, isPublished(next) ? 'send' : 'file-pen-line', title, detail)
        })
        closeModal()
      }}
    >
      <div className="form">
        {navigation && <div onClickCapture={(event) => {
          if (!(event.target instanceof Element) || !event.target.closest('button')) return
          const form = event.currentTarget.closest('form')
          const changed = stage !== current.stage || edit !== current.deadlineEdit || [...(form?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea') ?? [])].some((input) => input.type === 'checkbox' ? (input as HTMLInputElement).checked !== (input as HTMLInputElement).defaultChecked : input.value !== input.defaultValue) || [...(form?.querySelectorAll<HTMLSelectElement>('select') ?? [])].some((select) => [...select.options].some((option) => option.selected !== option.defaultSelected))
          if (changed && !window.confirm('Bài có thay đổi chưa lưu. Bỏ thay đổi để chuyển bài?')) { event.preventDefault(); event.stopPropagation() }
        }}>{navigation}</div>}
        {!editable && <p className="cd-note">Chế độ xem · {target.customer} · Chu kỳ {cycle.no}</p>}
        <fieldset className="content-item-fields" disabled={!editable}>
        {!project && (
          <label className="field">Dự án
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              {choices.map((entry) => <option key={entry.id} value={entry.id}>{entry.customer} · chu kỳ {runningCycle(entry)?.no}</option>)}
            </select>
          </label>
        )}
        <label className="field">Tiêu đề<Req /><input name="title" required defaultValue={current.title} placeholder="Tiêu đề bài như trong Content Plan" /></label>
        <label className="field">Nhiệm vụ
          <select name="mission" defaultValue={current.mission}><option>Thương hiệu</option><option>Bán hàng</option></select>
        </label>
        <label className="field">Thể loại
          <input name="category" defaultValue={current.category} list="content-category-options" placeholder="Chọn hoặc nhập thể loại" />
          <datalist id="content-category-options">{CATEGORIES.map((name) => <option key={name} value={name} />)}</datalist>
        </label>
        <label className="field">Chủ đề<input name="topic" defaultValue={current.topic} placeholder="Ví dụ: Gia đình cơm tấm" /></label>
        <label className="field">Định dạng
          <select name="format" defaultValue={current.format}><option>Video</option><option>Ảnh</option><option>Album</option></select>
        </label>
        <fieldset className="content-plan-copy">
          <legend>Nội dung triển khai · Content Plan</legend>
          <label className="field">{current.planLabels?.mainIdea ?? 'Ý tưởng / thông điệp chính'}<textarea name="mainIdea" rows={3} defaultValue={current.mainIdea ?? ''} placeholder="Bài muốn truyền tải điều gì? Điểm thu hút chính là gì?" /></label>
          <label className="field">{current.planLabels?.contentDirection ?? 'Nội dung triển khai'}<textarea name="contentDirection" rows={6} defaultValue={current.contentDirection ?? ''} placeholder="Kịch bản, thoại, caption, nội dung ưu đãi…" /></label>
          <label className="field">{current.planLabels?.visualDirection ?? 'Hướng hình ảnh'}<textarea name="visualDirection" rows={6} defaultValue={current.visualDirection ?? ''} placeholder="Cảnh quay, góc chụp, hình minh họa, hướng thiết kế…" /></label>
          {current.planSections?.filter((section) => !section.hidden).map((section) => <label className="field" key={section.id}>{section.title}<textarea name={'plan-section-' + section.id} rows={6} defaultValue={section.body} /></label>)}
          <label className="field">Link tài liệu <small>(không bắt buộc)</small><input name="documentLink" type="url" defaultValue={current.documentLink ?? ''} placeholder="https://docs.google.com/..." /></label>
        </fieldset>
        <section className="content-publishing-fields"><h3>Sản xuất & xuất bản</h3>
        <div className="plan-assignees" aria-label="Nhân sự phụ trách"><span>Content <strong>{contentAssignees(tasks, target.id, cycle.no, current.id).content}</strong></span><span>Media <strong>{contentAssignees(tasks, target.id, cycle.no, current.id).media}</strong></span></div>
        <label className="field">Giai đoạn
          <select name="stage" value={stage} onChange={(event) => setStage(event.target.value as ContentStage)}>{(item ? STAGES : ['Ý tưởng', 'Script']).map((name) => <option key={name}>{name}</option>)}</select>
        </label>
        {stage === 'Đã hủy' && <>
          <label className="field">Lý do hủy bài<Req /><textarea name="cancelReason" required defaultValue={current.cancellation?.reason ?? ''} /></label>
          <p className="cd-note">Bài hủy giữ lịch sử, ngừng nhắc việc và không tính là bài đã bàn giao. Cần bài thay thế để đủ định mức.</p>
          {current.cancellation && <p className="cd-note">Hủy ngày {formatDate(parseInput(current.cancellation.date))} · {current.cancellation.by}</p>}
        </>}
        <label className="field">Deadline dựng<input name="deadlineEdit" type="date" value={edit} onChange={(event) => setEdit(event.target.value)} /></label>
        <label className="field">Deadline script<input name="deadlineScript" type="date" defaultValue={current.deadlineScript} placeholder={scriptDue} /></label>
        <label className="field">Ngày đăng dự kiến<input name="postDate" type="date" defaultValue={current.postDate} /></label>
        {stage === 'Đã đăng' && <label className="field">Ngày đăng thực tế<Req /><input name="publishedAt" type="date" required max={TODAY} defaultValue={current.publishedAt ?? (current.stage === 'Đã đăng' ? '' : TODAY)} /></label>}
        <label className="field">Giờ đăng<input name="time" type="time" defaultValue={current.channels[0]?.time || '17:00'} /></label>
        <fieldset className="field">
          <legend>Kênh xuất bản</legend>
          {PLATFORMS.map((platform) => (
            <label className="filter-check" key={platform}><input name={'ch-' + platform} type="checkbox" defaultChecked={current.channels.some((entry) => entry.platform === platform)} /> {platform}</label>
          ))}
        </fieldset>
        <label className="field">Link media / bài đăng <small>(không bắt buộc)</small><input name="mediaLink" type="url" defaultValue={current.mediaLink} placeholder="https://..." /></label>
        <label className="filter-check"><input name="bonus" type="checkbox" defaultChecked={current.bonus} /> Bài tặng (không tính vào định mức)</label>
        <div className="customer-data-rules">
          <p>
            Định mức {target.quota.posts} bài: {target.quota.brandPosts} thương hiệu / {target.quota.salesPosts} bán hàng. Hiện có {mix.brand} thương hiệu, {mix.sales} bán hàng (chưa tính bài này).
            {scriptDue && <> Hạn script mặc định: {formatDate(parseInput(scriptDue))} (dựng − {params.scriptLeadDays} ngày).</>}
          </p>
        </div>
        </section>
        </fieldset>
        {!editable && (current.documentLink || current.mediaLink) && <p className="cd-note">
          {current.documentLink && <a href={current.documentLink} target="_blank" rel="noreferrer">Mở tài liệu</a>}
          {current.documentLink && current.mediaLink && ' · '}
          {current.mediaLink && <a href={current.mediaLink} target="_blank" rel="noreferrer">Mở media / bài đăng</a>}
        </p>}
        {!editable ? <div className="form-actions"><button className="secondary" type="button" onClick={closeModal}>Đóng</button></div> : item ? (
          <div className="form-actions">
            <button
              className="secondary"
              type="button"
              disabled={stage === 'Đã hủy'}
              onClick={() => setStage('Đã hủy')}
            >
              Hủy bài
            </button>
            <button className="primary">Lưu nội dung</button>
          </div>
        ) : (
          <FormActions submit="Tạo nội dung" />
        )}
      </div>
    </Modal>
  )
}

/**
 * Chốt chu kỳ: records the actual end, decides what happens to the missing posts and opens
 * the next cycle while the contract still has cycles left.
 */
export function CloseCycleModal({ project }: { project: Project }) {
  const { closeModal, toast } = useApp()
  const { params } = useData()
  const cycle = runningCycle(project)
  const [handling, setHandling] = useState<'carry' | 'drop'>('carry')
  if (!cycle) return null
  const progress = cycleProgress(cycle, project.quota)
  const unpublished = cycle.contents.filter((entry) => !entry.bonus && entry.stage !== 'Đã hủy' && !isPublished(entry))
  const contract = primaryContract(getData().contracts, project.id)
  // Cycles follow the timeline, not the calendar: the next one starts the day after this one closes.
  const nextStart = addDaysIso(TODAY, 1)
  const hasNext = canOpenContractCycle(contract, project, nextStart, getData().contracts)
  const overdue = projectOverdue(getData().contracts, project.id)
  const openSteps = cycleMilestones(cycle, project.quota, params).filter((entry) => entry.kind !== 'end' && !entry.done && entry.state !== 'skipped')

  return (
    <Modal
      title={project.quota.once ? 'Bàn giao dự án' : 'Chốt chu kỳ ' + cycle.no}
      projectId={project.id}
      onSubmit={(form) => {
        const actualEnd = field(form, 'actualEnd')
        const reason = field(form, 'reason')
        const start = field(form, 'nextStart')
        if (hasNext && (!start || start <= actualEnd || !canOpenContractCycle(primaryContract(getData().contracts, project.id), project, start, getData().contracts))) { toast('Chu kỳ tiếp phải sau ngày chốt và trong hạn hợp đồng. Ký mới hoặc gia hạn trước khi mở.'); return }
        const carry = handling === 'carry' && hasNext
        updateProject(project.id, (item) => {
          const running = runningCycle(item)
          if (!running) return
          const done = cycleProgress(running, item.quota)
          const missing = running.contents.filter((entry) => !entry.bonus && entry.stage !== 'Đã hủy' && !isPublished(entry))
          running.status = 'closed'
          running.actualEnd = actualEnd
          running.result = {
            published: done.published,
            planned: done.planned,
            note: done.missing ? (carry ? 'Chuyển bù ' + missing.length + ' bài sang chu kỳ ' + (running.no + 1) : 'Bỏ ' + done.missing + ' bài: ' + reason) : 'Đủ định mức',
          }
          running.activity.unshift({ title: 'Đã chốt chu kỳ', detail: running.result.note, time: 'Vừa xong' })
          addProjectActivity(item, 'calendar-check-2', 'Đã chốt chu kỳ ' + running.no, formatDate(parseInput(actualEnd)) + ' · ' + done.published + ' / ' + done.planned + ' bài · ' + running.result.note)
          if (hasNext) {
            const nextNo = running.no + 1
            const pending = item.pendingPackage
            const pkg = pending && nextNo >= pending.fromCycle ? getData().packages.find((entry) => entry.id === pending.packageId) : undefined
            if (pending && pkg) {
              item.servicePackageId = pkg.id
              item.service = pkg.group + ' · ' + pkg.name
              item.serviceScope = pkg.scope
              item.servicePrice = pkg.price
              item.quota = { ...pkg.quota }
              item.pendingPackage = undefined
              addProjectActivity(item, 'package-check', 'Áp dụng gói mới từ chu kỳ ' + nextNo, item.service + ' · theo ' + pending.source)
            }
            const next = projectCycle(item, nextNo, start, params, getData().packages)
            if (carry) {
              next.contents = missing.map((entry, index) => ({ ...entry, id: entry.id + '-c' + next.no, stt: index + 1, carried: true, postDate: '', deadlineEdit: '', deadlineScript: '' }))
              running.contents = running.contents.filter((entry) => !missing.includes(entry))
            }
            item.cycles.push(next)
            addProjectActivity(item, 'calendar-plus', 'Mở chu kỳ ' + next.no, 'T0 ' + formatDate(parseInput(start)) + (carry && missing.length ? ' · nhận ' + missing.length + ' bài bù' : ''))
          } else {
            addProjectActivity(item, 'flag', 'Hết chu kỳ hợp đồng', 'Đã chạy ' + running.no + ' / ' + item.total + ' chu kỳ. Cần tái ký để tiếp tục.')
          }
        })
        closeModal()
        toast(hasNext ? 'Đã chốt chu kỳ ' + cycle.no + ' và mở chu kỳ ' + (cycle.no + 1) + '.' : 'Đã chốt chu kỳ cuối của hợp đồng.')
      }}
    >
      <div className="form">
        <div className="customer-data-rules">
          <b>{progress.published} / {progress.planned} bài đã đăng{progress.bonus ? ' · +' + progress.bonus + ' bài tặng' : ''}</b>
          <p>Mục tiêu {formatDate(parseInput(cycle.plannedEnd))}. {progress.missing ? 'Còn thiếu ' + progress.missing + ' bài so với định mức.' : 'Đã đủ định mức.'}</p>
        </div>
        {overdue > 0 && <div className="customer-data-rules warn"><b>Công nợ quá hạn {overdue.toLocaleString('vi-VN')}đ</b><p>Nhắc khách thanh toán trước khi mở chu kỳ tiếp theo. Việc chốt chu kỳ không bị chặn.</p></div>}
        {openSteps.length > 0 && (
          <div className="customer-data-rules warn">
            <b>Còn {openSteps.length} bước chưa xong</b>
            <p>{openSteps.map((entry) => entry.label).join(', ')}. Chu kỳ chốt khi xong mọi bước; chỉ chốt trước khi đã thống nhất với khách.</p>
          </div>
        )}
        <label className="field">Ngày kết thúc thực tế<Req /><input name="actualEnd" type="date" required defaultValue={TODAY} min={cycle.start} /></label>
        {progress.missing > 0 && (
          <>
            <label className="field">Xử lý bài còn thiếu
              <select value={handling} onChange={(event) => setHandling(event.target.value as 'carry' | 'drop')}>
                {hasNext && <option value="carry">Chuyển bù {unpublished.length} bài sang chu kỳ {cycle.no + 1}</option>}
                <option value="drop">Không bù (ghi lý do)</option>
              </select>
            </label>
            {(handling === 'drop' || !hasNext) && <label className="field">Lý do<textarea name="reason" required placeholder="Ví dụ: khách đồng ý giảm 2 bài do tạm đóng quán" /></label>}
          </>
        )}
        {hasNext ? (
          <label className="field">T0 chu kỳ {cycle.no + 1}<input name="nextStart" type="date" required defaultValue={nextStart} /></label>
        ) : (
          <div className="customer-data-rules"><p>Đây là chu kỳ cuối ({cycle.no} / {project.total}). Sau khi chốt, dự án cần phụ lục hoặc hợp đồng mới để mở chu kỳ tiếp.</p></div>
        )}
        <FormActions submit="Chốt chu kỳ" />
      </div>
    </Modal>
  )
}

export function KeyNoteModal({ project, type = 'Từ Account', preset = '' }: { project: Project; type?: KeyNote['type']; preset?: string }) {
  const { closeModal, account } = useApp()
  return (
    <Modal
      title={type === 'Shooting recap' ? 'Shooting recap' : 'Thêm Key note'}
      projectId={project.id}
      onSubmit={(form) => {
        const note: KeyNote = { id: 'note-' + Date.now(), date: field(form, 'date'), author: account, type: field(form, 'type') as KeyNote['type'], content: field(form, 'content') }
        updateProject(project.id, (item) => {
          item.keyNotes.unshift(note)
          addProjectActivity(item, 'notebook-pen', 'Key note: ' + note.type, note.content.slice(0, 90))
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Loại
          <select name="type" defaultValue={type}><option>Từ khách</option><option>Từ Account</option><option>Shooting recap</option></select>
        </label>
        <label className="field">Ngày<input name="date" type="date" required defaultValue={TODAY} /></label>
        <label className="field">Nội dung<Req /><textarea name="content" required defaultValue={preset} placeholder="Điều cần nhớ khi làm nội dung cho khách này" /></label>
        <FormActions submit="Lưu Key note" />
      </div>
    </Modal>
  )
}

export function LinksModal({ project }: { project: Project }) {
  const { closeModal } = useApp()
  const links = project.links
  return (
    <Modal
      title="Folder dự án"
      projectId={project.id}
      onSubmit={(form) => {
        updateProject(project.id, (item) => {
          item.links = { ...item.links, folder: field(form, 'folder') }
          addProjectActivity(item, 'link', 'Đã cập nhật folder dự án', field(form, 'folder') || 'Đã xóa link')
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Link folder Drive<input name="folder" type="url" defaultValue={links.folder} placeholder="https://drive.google.com/drive/folders/..." /></label>
        <FormActions submit="Lưu" />
      </div>
    </Modal>
  )
}
