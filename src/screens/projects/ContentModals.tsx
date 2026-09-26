import { useState } from 'react'
import { useApp } from '../../app/context'
import { newCycle } from '../../data/cycles'
import { addDaysIso, formatDate, parseInput, TODAY } from '../../lib/format'
import { checked, field } from '../../lib/form'
import { cycleProgress, isPublished, runningCycle, STAGES } from '../../lib/sop'
import { getData, useData } from '../../store/store'
import type { ContentChannel, ContentItem, ContentStage, KeyNote, Platform, Project } from '../../store/types'
import { FormActions, Modal } from '../../ui/Modal'
import { addProjectActivity, updateProject } from './projectLogic'

const CATEGORIES = ['Chia sẻ', 'Thông báo', 'Review', 'Mini-game', 'Tiểu phẩm', 'Challenge', 'Khuyến mãi']
const PLATFORMS: Platform[] = ['Facebook', 'TikTok']

function channelStatus(stage: ContentStage): ContentChannel['status'] {
  return stage === 'Đã đăng' ? 'Đã đăng' : stage === 'Lên lịch' ? 'Đã lên lịch' : 'Chưa lên lịch'
}

/**
 * One row of the cycle Content Plan. Opened from the project Content tab (project fixed) or
 * from the Posts page (project chosen here). Always writes to the running cycle.
 */
export function ContentItemModal({ project, item }: { project?: Project; item?: ContentItem }) {
  const { closeModal, toast } = useApp()
  const { projects, params } = useData()
  const choices = projects.filter((entry) => entry.state === 'active' && runningCycle(entry) && entry.quota.posts > 0)
  const [projectId, setProjectId] = useState(project?.id ?? choices[0]?.id ?? '')
  const target = projects.find((entry) => entry.id === projectId)
  const cycle = target ? runningCycle(target) : undefined
  const [stage, setStage] = useState<ContentStage>(item?.stage ?? 'Ý tưởng')
  const [edit, setEdit] = useState(item?.deadlineEdit ?? '')

  if (!target || !cycle) {
    return (
      <Modal title="Tạo nội dung">
        <div className="customer-data-rules"><p>Không có dự án đang triển khai có chu kỳ và định mức bài đăng.</p></div>
        <div className="form-actions"><button className="primary" type="button" onClick={closeModal}>Đóng</button></div>
      </Modal>
    )
  }

  const core = cycle.contents.filter((entry) => !entry.bonus)
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
      onSubmit={(form) => {
        const postDate = field(form, 'postDate')
        if ((stage === 'Lên lịch' || stage === 'Đã đăng') && !postDate) {
          toast('Cần ngày đăng khi nội dung ở giai đoạn Lên lịch hoặc Đã đăng.')
          return
        }
        const time = field(form, 'time')
        const next: ContentItem = {
          ...current,
          id: current.id || 'content-' + Date.now(),
          bonus: checked(form, 'bonus'),
          mission: field(form, 'mission') as ContentItem['mission'],
          category: field(form, 'category'),
          topic: field(form, 'topic'),
          title: field(form, 'title'),
          format: field(form, 'format') as ContentItem['format'],
          stage,
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
          const running = runningCycle(draft)
          if (!running) return
          const index = running.contents.findIndex((entry) => entry.id === next.id)
          if (index >= 0) running.contents[index] = next
          else running.contents.push(next)
          running.contents.sort((a, b) => a.stt - b.stt)
          const title = (item ? 'Nội dung #' : 'Thêm nội dung #') + next.stt + ': ' + next.stage
          running.activity.unshift({ title, detail: next.title, time: 'Vừa xong' })
          if (!item || item.stage !== next.stage) addProjectActivity(draft, isPublished(next) ? 'send' : 'file-pen-line', title, next.title)
        })
        closeModal()
      }}
    >
      <div className="form">
        {!project && (
          <label className="field">Dự án
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              {choices.map((entry) => <option key={entry.id} value={entry.id}>{entry.customer} · chu kỳ {runningCycle(entry)?.no}</option>)}
            </select>
          </label>
        )}
        <label className="field">Tiêu đề<input name="title" required defaultValue={current.title} placeholder="Tiêu đề bài như trong Content Plan" /></label>
        <label className="field">Nhiệm vụ
          <select name="mission" defaultValue={current.mission}><option>Thương hiệu</option><option>Bán hàng</option></select>
        </label>
        <label className="field">Thể loại
          <select name="category" defaultValue={current.category}>{CATEGORIES.map((name) => <option key={name}>{name}</option>)}</select>
        </label>
        <label className="field">Chủ đề<input name="topic" defaultValue={current.topic} placeholder="Ví dụ: Gia đình cơm tấm" /></label>
        <label className="field">Định dạng
          <select name="format" defaultValue={current.format}><option>Video</option><option>Ảnh</option><option>Album</option></select>
        </label>
        <label className="field">Giai đoạn
          <select name="stage" value={stage} onChange={(event) => setStage(event.target.value as ContentStage)}>{STAGES.map((name) => <option key={name}>{name}</option>)}</select>
        </label>
        <label className="field">Deadline dựng<input name="deadlineEdit" type="date" value={edit} onChange={(event) => setEdit(event.target.value)} /></label>
        <label className="field">Deadline script<input name="deadlineScript" type="date" defaultValue={current.deadlineScript} placeholder={scriptDue} /></label>
        <label className="field">Ngày đăng<input name="postDate" type="date" defaultValue={current.postDate} /></label>
        <label className="field">Giờ đăng<input name="time" type="time" defaultValue={current.channels[0]?.time || '17:00'} /></label>
        <fieldset className="field">
          <legend>Kênh xuất bản</legend>
          {PLATFORMS.map((platform) => (
            <label className="filter-check" key={platform}><input name={'ch-' + platform} type="checkbox" defaultChecked={current.channels.some((entry) => entry.platform === platform)} /> {platform}</label>
          ))}
        </fieldset>
        <label className="field">Link media / bài đăng<input name="mediaLink" type="url" defaultValue={current.mediaLink} placeholder="https://..." /></label>
        <label className="filter-check"><input name="bonus" type="checkbox" defaultChecked={current.bonus} /> Bài tặng (không tính vào định mức)</label>
        <div className="customer-data-rules">
          <p>
            Định mức {target.quota.posts} bài: {target.quota.brandPosts} thương hiệu / {target.quota.salesPosts} bán hàng. Hiện có {mix.brand} thương hiệu, {mix.sales} bán hàng (chưa tính bài này).
            {scriptDue && <> Hạn script mặc định: {formatDate(parseInput(scriptDue))} (dựng − {params.scriptLeadDays} ngày).</>}
          </p>
        </div>
        {item ? (
          <div className="form-actions">
            <button
              className="secondary"
              type="button"
              onClick={() => {
                updateProject(target.id, (draft) => {
                  const running = runningCycle(draft)
                  if (!running) return
                  running.contents = running.contents.filter((entry) => entry.id !== item.id)
                  running.activity.unshift({ title: 'Xóa nội dung #' + item.stt, detail: item.title, time: 'Vừa xong' })
                })
                closeModal()
              }}
            >
              Xóa nội dung
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
  const unpublished = cycle.contents.filter((entry) => !entry.bonus && !isPublished(entry))
  const hasNext = cycle.no < project.total
  const nextStart = addDaysIso(cycle.plannedEnd, 1)

  return (
    <Modal
      title={'Chốt chu kỳ ' + cycle.no}
      onSubmit={(form) => {
        const actualEnd = field(form, 'actualEnd')
        const reason = field(form, 'reason')
        const start = field(form, 'nextStart')
        const carry = handling === 'carry' && hasNext
        updateProject(project.id, (item) => {
          const running = runningCycle(item)
          if (!running) return
          const done = cycleProgress(running, item.quota)
          const missing = running.contents.filter((entry) => !entry.bonus && !isPublished(entry))
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
            const next = newCycle(running.no + 1, start, params)
            if (carry) {
              next.contents = missing.map((entry, index) => ({ ...entry, id: entry.id + '-c' + next.no, stt: index + 1, carried: true, postDate: '', deadlineEdit: '', deadlineScript: '' }))
              running.contents = running.contents.filter((entry) => !missing.includes(entry))
            }
            item.cycles.push(next)
            const pending = item.pendingPackage
            const pkg = pending && next.no >= pending.fromCycle ? getData().packages.find((entry) => entry.id === pending.packageId) : undefined
            if (pending && pkg) {
              item.servicePackageId = pkg.id
              item.service = pkg.group + ' · ' + pkg.name
              item.serviceScope = pkg.scope
              item.servicePrice = pkg.price
              item.quota = { ...pkg.quota }
              item.pendingPackage = undefined
              addProjectActivity(item, 'package-check', 'Áp dụng gói mới từ chu kỳ ' + next.no, item.service + ' · theo ' + pending.source)
            }
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
          <p>Kết thúc dự kiến {formatDate(parseInput(cycle.plannedEnd))}. {progress.missing ? 'Còn thiếu ' + progress.missing + ' bài so với định mức.' : 'Đã đủ định mức.'}</p>
        </div>
        <label className="field">Ngày kết thúc thực tế<input name="actualEnd" type="date" required defaultValue={TODAY} min={cycle.start} /></label>
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
        <label className="field">Nội dung<textarea name="content" required defaultValue={preset} placeholder="Điều cần nhớ khi làm nội dung cho khách này" /></label>
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
      title="Liên kết Drive"
      onSubmit={(form) => {
        updateProject(project.id, (item) => {
          item.links = { folder: field(form, 'folder'), contentPlan: field(form, 'contentPlan'), contentPost: field(form, 'contentPost'), keyNotes: field(form, 'keyNotes') }
          addProjectActivity(item, 'link', 'Đã cập nhật liên kết Drive', 'Folder, Content Plan, Content Post, Key Notes')
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Folder dự án<input name="folder" type="url" defaultValue={links.folder} placeholder="https://drive.google.com/drive/folders/..." /></label>
        <label className="field">Content Plan<input name="contentPlan" type="url" defaultValue={links.contentPlan} placeholder="https://docs.google.com/spreadsheets/..." /></label>
        <label className="field">Content Post<input name="contentPost" type="url" defaultValue={links.contentPost} placeholder="https://docs.google.com/spreadsheets/..." /></label>
        <label className="field">Key Notes<input name="keyNotes" type="url" defaultValue={links.keyNotes} placeholder="https://docs.google.com/..." /></label>
        <FormActions submit="Lưu liên kết" />
      </div>
    </Modal>
  )
}
