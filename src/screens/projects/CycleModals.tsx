import { useState } from 'react'
import { useApp } from '../../app/context'
import { inputToDisplay, newId, TODAY } from '../../lib/format'
import { field } from '../../lib/form'
import { allShootings, mediaClashes } from '../../data/shootings'
import { inScope } from '../../lib/scope'
import { runningCycle } from '../../lib/sop'
import { useData } from '../../store/store'
import type { Cycle, PlanStatus, Project, Shooting } from '../../store/types'
import { FormActions, Modal } from '../../ui/Modal'
import { MEDIA_PEOPLE, planLabel, updateProject, withCycle } from './projectLogic'

function saveCycle(project: Project, change: Parameters<typeof withCycle>[1]) {
  updateProject(project.id, (item) => withCycle(item, change))
}

/** Running cycle of the project as rendered (modals open only while one exists). */
function cycleOf(project: Project): Cycle {
  const cycle = runningCycle(project)
  if (!cycle) throw new Error('Project has no running cycle')
  return cycle
}

/** Date input that is required once a status implies the step happened. */
function StampField({ label, name, value, show }: { label: string; name: string; value: string; show: boolean }) {
  if (!show) return null
  return <label className="field">{label}<input name={name} type="date" required defaultValue={value || TODAY} max={TODAY} /></label>
}

export function PlanModal({ project }: { project: Project }) {
  const { closeModal } = useApp()
  const plan = cycleOf(project).plan
  const [status, setStatus] = useState<PlanStatus>(plan.status)
  const sent = status !== 'draft'
  return (
    <Modal
      title="Content Plan"
      onSubmit={(form) => {
        saveCycle(project, (cycle) => {
          cycle.plan.status = status
          cycle.plan.link = field(form, 'link')
          cycle.plan.feedback = field(form, 'feedback')
          cycle.plan.sentAt = sent ? field(form, 'sentAt') : ''
          cycle.plan.approvedAt = status === 'approved' ? field(form, 'approvedAt') : ''
          return ['Content Plan: ' + planLabel(status), cycle.plan.feedback || cycle.plan.link || 'Cập nhật trạng thái']
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Trạng thái
          <select name="status" value={status} onChange={(event) => setStatus(event.target.value as PlanStatus)}>
            <option value="draft">Nháp</option><option value="sent">Đã gửi khách</option><option value="changes">Cần chỉnh sửa</option><option value="approved">Đã duyệt</option>
          </select>
        </label>
        <StampField label="Ngày gửi khách" name="sentAt" value={plan.sentAt} show={sent} />
        <StampField label="Ngày khách duyệt" name="approvedAt" value={plan.approvedAt} show={status === 'approved'} />
        <label className="field">Link Content Plan <small>(không bắt buộc)</small><input name="link" type="url" defaultValue={plan.link || project.links.contentPlan} placeholder="https://docs.google.com/spreadsheets/..." /></label>
        <label className="field">Feedback khách<textarea name="feedback" defaultValue={plan.feedback} placeholder="Phản hồi hoặc phạm vi cần chỉnh" /></label>
        <FormActions submit="Lưu Content Plan" />
      </div>
    </Modal>
  )
}

/**
 * One shoot and its Shooting Plan. Account schedules it; opened from the project's Chu kỳ tab
 * (project fixed) or from Lịch shooting (project chosen here). Warns when a Media is already
 * booked on another shoot that day.
 */
export function ShootingModal({ project, shooting }: { project?: Project; shooting?: Shooting }) {
  const { closeModal, toast, role, account } = useApp()
  const { projects } = useData()
  const choices = projects.filter((entry) => entry.state === 'active' && entry.quota.shoots > 0 && runningCycle(entry) && inScope(role, account, entry))
  const [projectId, setProjectId] = useState(project?.id ?? choices[0]?.id ?? '')
  const target = projects.find((entry) => entry.id === projectId)
  const current: Shooting = shooting ?? { id: '', date: '', time: '', location: '', media: [], status: 'Chờ xác nhận', checklist: '', plan: { sentAt: '', link: '' } }
  const [date, setDate] = useState(current.date)
  const [media, setMedia] = useState<string[]>(current.media)
  const clashes = mediaClashes(allShootings(projects), date, media, current.id)

  if (!target || !runningCycle(target)) {
    return (
      <Modal title="Tạo lịch shooting">
        <div className="customer-data-rules"><p>Không có dự án đang triển khai có buổi shoot trong gói.</p></div>
        <div className="form-actions"><button className="primary" type="button" onClick={closeModal}>Đóng</button></div>
      </Modal>
    )
  }

  return (
    <Modal
      title={shooting ? 'Buổi shoot' : 'Tạo lịch shooting'}
      onSubmit={(form) => {
        const status = field(form, 'status') as Shooting['status']
        if (status !== 'Chờ xác nhận' && !date) return toast('Cần ngày shoot khi đã xác nhận hoặc đã quay.')
        const next: Shooting = {
          id: current.id || newId('shoot'),
          date,
          time: field(form, 'time'),
          location: field(form, 'location'),
          media,
          status,
          checklist: field(form, 'checklist'),
          plan: { sentAt: field(form, 'planSentAt'), link: field(form, 'planLink') },
        }
        saveCycle(target, (cycle) => {
          const index = cycle.shootings.findIndex((entry) => entry.id === next.id)
          if (index >= 0) cycle.shootings[index] = next
          else cycle.shootings.push(next)
          return [shooting ? 'Cập nhật buổi shoot' : 'Tạo lịch shooting', (next.date ? inputToDisplay(next.date) : 'chưa chốt ngày') + ' · ' + next.status]
        })
        closeModal()
      }}
    >
      <div className="form">
        {!project && (
          <label className="field">Dự án
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={Boolean(shooting)}>
              {choices.map((entry) => <option key={entry.id} value={entry.id}>{entry.customer} · chu kỳ {runningCycle(entry)?.no}</option>)}
            </select>
          </label>
        )}
        <div className="form-grid">
          <label className="field">Ngày shoot<input name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label className="field">Khung giờ<input name="time" defaultValue={current.time} placeholder="11:00–15:00" /></label>
        </div>
        <label className="field">Địa điểm<input name="location" defaultValue={current.location} placeholder="Địa chỉ quán hoặc studio" /></label>
        <fieldset className="field">
          <legend>Media</legend>
          {MEDIA_PEOPLE.map((name) => (
            <label className="filter-check" key={name}>
              <input type="checkbox" checked={media.includes(name)} onChange={(event) => setMedia(event.target.checked ? [...media, name] : media.filter((entry) => entry !== name))} /> {name}
            </label>
          ))}
        </fieldset>
        {clashes.length > 0 && (
          <div className="customer-data-rules warn">
            <b>Trùng lịch Media</b>
            <p>{clashes.map(({ name, row }) => name + ' đã có buổi shoot ' + row.project.customer + (row.shooting.time ? ' (' + row.shooting.time + ')' : '')).join('; ')}.</p>
          </div>
        )}
        <label className="field">Trạng thái
          <select name="status" defaultValue={current.status}><option>Chờ xác nhận</option><option>Đã xác nhận</option><option>Đã hoàn thành</option></select>
        </label>
        <div className="form-grid">
          <label className="field">Shooting Plan gửi khách<input name="planSentAt" type="date" defaultValue={current.plan.sentAt} max={TODAY} /></label>
          <label className="field">Link Shooting Plan<input name="planLink" type="url" defaultValue={current.plan.link} placeholder="https://docs.google.com/..." /></label>
        </div>
        <label className="field">Checklist khách chuẩn bị<textarea name="checklist" defaultValue={current.checklist} placeholder="Món, props, người xuất hiện, khung giờ vắng khách…" /></label>
        <FormActions submit="Lưu" />
      </div>
    </Modal>
  )
}

export function DemoModal({ project }: { project: Project }) {
  const { closeModal } = useApp()
  const demo = cycleOf(project).demo
  const [status, setStatus] = useState(demo.status)
  const sent = status !== 'Chưa gửi'
  return (
    <Modal
      title="Post Demo"
      onSubmit={(form) => {
        saveCycle(project, (cycle) => {
          cycle.demo = {
            status,
            link: field(form, 'link'),
            sentAt: sent ? field(form, 'sentAt') : '',
            approvedAt: status === 'Đã duyệt' ? field(form, 'approvedAt') : '',
          }
          return ['Post Demo: ' + status, cycle.demo.link || 'Cập nhật trạng thái']
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Trạng thái
          <select name="status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option>Chưa gửi</option><option>Đã gửi</option><option>Cần chỉnh sửa</option><option>Đã duyệt</option>
          </select>
        </label>
        <StampField label="Ngày gửi khách" name="sentAt" value={demo.sentAt} show={sent} />
        <StampField label="Ngày khách duyệt" name="approvedAt" value={demo.approvedAt} show={status === 'Đã duyệt'} />
        <label className="field">Link Demo <small>(không bắt buộc)</small><input name="link" type="url" defaultValue={demo.link} placeholder="https://..." /></label>
        <FormActions submit="Lưu Post Demo" />
      </div>
    </Modal>
  )
}
