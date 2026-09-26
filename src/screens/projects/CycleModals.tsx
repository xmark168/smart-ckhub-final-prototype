import { useState } from 'react'
import { useApp } from '../../app/context'
import { ACCOUNTS, displayToInput, inputToDisplay, newId, TODAY } from '../../lib/format'
import { field } from '../../lib/form'
import { runningCycle } from '../../lib/sop'
import type { Cycle, CycleTask, PlanStatus, Project, Shooting } from '../../store/types'
import { FormActions, Modal, Req } from '../../ui/Modal'
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

export function ShootingPlanModal({ project }: { project: Project }) {
  const { closeModal } = useApp()
  const plan = cycleOf(project).shootingPlan
  return (
    <Modal
      title="Shooting Plan"
      onSubmit={(form) => {
        saveCycle(project, (cycle) => {
          cycle.shootingPlan = { sentAt: field(form, 'sentAt'), link: field(form, 'link') }
          return ['Shooting Plan đã gửi khách', cycle.shootingPlan.link || 'Không có link']
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Ngày gửi khách<Req /><input name="sentAt" type="date" required defaultValue={plan.sentAt || TODAY} max={TODAY} /></label>
        <label className="field">Link Shooting Plan <small>(không bắt buộc)</small><input name="link" type="url" defaultValue={plan.link} placeholder="https://docs.google.com/..." /></label>
        <FormActions submit="Lưu Shooting Plan" />
      </div>
    </Modal>
  )
}

export function ShootingModal({ project, shooting }: { project: Project; shooting?: Shooting }) {
  const { closeModal } = useApp()
  const people = MEDIA_PEOPLE
  const current: Shooting = shooting ?? { id: '', date: '', time: '', location: '', media: [], status: 'Chờ xác nhận', checklist: '' }
  return (
    <Modal
      title={shooting ? 'Cập nhật lịch shooting' : 'Tạo lịch shooting'}
      onSubmit={(form) => {
        const media = people.filter((name) => (form.elements.namedItem('media-' + name) as HTMLInputElement | null)?.checked)
        const next: Shooting = {
          id: current.id || newId('shoot'),
          date: field(form, 'date'),
          time: field(form, 'time'),
          location: field(form, 'location'),
          media,
          status: field(form, 'status') as Shooting['status'],
          checklist: field(form, 'checklist'),
        }
        saveCycle(project, (cycle) => {
          const index = cycle.shootings.findIndex((entry) => entry.id === next.id)
          if (index >= 0) cycle.shootings[index] = next
          else cycle.shootings.push(next)
          return [shooting ? 'Lịch shooting đã cập nhật' : 'Lịch shooting đã tạo', inputToDisplay(next.date) + ' · ' + next.status]
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Ngày shoot<Req /><input name="date" type="date" required defaultValue={current.date} /></label>
        <label className="field">Khung giờ<input name="time" defaultValue={current.time} placeholder="Ví dụ: 11:00–15:00" /></label>
        <label className="field">Địa điểm<input name="location" defaultValue={current.location} placeholder="Địa chỉ quán hoặc studio" /></label>
        <fieldset className="field">
          <legend>Media</legend>
          {people.map((name) => (
            <label className="filter-check" key={name}><input name={'media-' + name} type="checkbox" defaultChecked={current.media.includes(name)} /> {name}</label>
          ))}
        </fieldset>
        <label className="field">Trạng thái
          <select name="status" defaultValue={current.status}><option>Chờ xác nhận</option><option>Đã xác nhận</option><option>Đã hoàn thành</option></select>
        </label>
        <label className="field">Checklist khách chuẩn bị<textarea name="checklist" defaultValue={current.checklist} placeholder="Món cần làm, props, người xuất hiện, khung giờ vắng khách…" /></label>
        <FormActions submit="Lưu lịch shooting" />
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

export function CycleTaskModal({ project, task }: { project: Project; task?: CycleTask }) {
  const { closeModal } = useApp()
  const current = task ?? { id: '', name: '', owner: '', deadline: '', status: 'Nháp', type: 'Nội dung' }
  const owners = Array.from(new Set([project.owner, 'Content nội bộ', ...MEDIA_PEOPLE, ...ACCOUNTS]))
  return (
    <Modal
      title={task ? 'Cập nhật công việc' : 'Tạo công việc'}
      onSubmit={(form) => {
        const owner = form.elements.namedItem('owner') as HTMLSelectElement
        const status = field(form, 'status')
        if (status !== 'Nháp' && (!owner.value || !field(form, 'deadline'))) {
          owner.setCustomValidity('Cần Owner và deadline trước khi bắt đầu.')
          owner.reportValidity()
          return
        }
        const next: CycleTask = { ...current, id: current.id || 'task-' + Date.now(), name: field(form, 'name'), owner: owner.value, deadline: inputToDisplay(field(form, 'deadline')), status }
        saveCycle(project, (cycle) => {
          const index = cycle.tasks.findIndex((entry) => entry.id === next.id)
          if (index >= 0) cycle.tasks[index] = next
          else cycle.tasks.push(next)
          return [task ? 'Công việc đã cập nhật' : 'Công việc đã tạo', next.name]
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Công việc<Req /><input name="name" required defaultValue={current.name} /></label>
        <label className="field">Owner
          <select name="owner" defaultValue={current.owner} onChange={(event) => event.target.setCustomValidity('')}>
            <option value="">Chưa giao</option>
            {owners.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="field">Deadline<input name="deadline" type="date" defaultValue={displayToInput(current.deadline)} /></label>
        <label className="field">Trạng thái
          <select name="status" defaultValue={current.status}>
            <option>Nháp</option><option>Việc cần làm</option><option>Đang thực hiện</option><option>Đang chờ</option><option>Đã hoàn thành</option>
          </select>
        </label>
        {task ? (
          <div className="form-actions">
            <button
              className="secondary danger-text"
              type="button"
              onClick={() => {
                saveCycle(project, (cycle) => {
                  cycle.tasks = cycle.tasks.filter((entry) => entry.id !== task.id)
                  return ['Công việc đã xóa', task.name]
                })
                closeModal()
              }}
            >
              Xóa công việc
            </button>
            <button className="primary">Lưu công việc</button>
          </div>
        ) : (
          <FormActions submit="Lưu công việc" />
        )}
      </div>
    </Modal>
  )
}
