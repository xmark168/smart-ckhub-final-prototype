import { useApp } from '../../app/context'
import { ACCOUNTS, displayToInput, inputToDisplay } from '../../lib/format'
import type { CycleTask, PlanStatus, Project } from '../../store/types'
import { field } from '../../lib/form'
import { FormActions, Modal } from '../../ui/Modal'
import { cycleDataFor, planLabel, updateProject, withCycle } from './projectLogic'

function saveCycle(project: Project, change: Parameters<typeof withCycle>[1]) {
  updateProject(project.id, (item) => withCycle(item, change))
}

export function PlanModal({ project }: { project: Project }) {
  const { closeModal } = useApp()
  const plan = cycleDataFor(project).plan
  return (
    <Modal
      title="Content Plan"
      onSubmit={(form) => {
        saveCycle(project, (cycle) => {
          cycle.plan.status = field(form, 'status') as PlanStatus
          cycle.plan.link = field(form, 'link')
          cycle.plan.feedback = field(form, 'feedback')
          if (cycle.plan.status === 'sent' && !cycle.plan.sentAt) cycle.plan.sentAt = 'Hôm nay'
          if (cycle.plan.status === 'approved') cycle.plan.approvedAt = 'Hôm nay'
          return ['Content Plan đã cập nhật', planLabel(cycle.plan.status)]
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Trạng thái
          <select name="status" defaultValue={plan.status}>
            <option value="draft">Nháp</option><option value="sent">Đã gửi khách</option><option value="changes">Cần chỉnh sửa</option><option value="approved">Đã duyệt</option>
          </select>
        </label>
        <label className="field">Link tài liệu<input name="link" type="url" defaultValue={plan.link} placeholder="https://..." /></label>
        <label className="field">Feedback khách<textarea name="feedback" defaultValue={plan.feedback} placeholder="Ghi phản hồi hoặc phạm vi cần chỉnh" /></label>
        <FormActions submit="Lưu Content Plan" />
      </div>
    </Modal>
  )
}

export function CycleTaskModal({ project, task }: { project: Project; task?: CycleTask }) {
  const { closeModal } = useApp()
  const current = task ?? { id: '', name: '', owner: '', deadline: '', status: 'Nháp', type: 'Nội dung' }
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
        <label className="field">Công việc<input name="name" required defaultValue={current.name} /></label>
        <label className="field">Owner
          <select name="owner" defaultValue={current.owner} onChange={(event) => event.target.setCustomValidity('')}>
            <option value="">Chưa giao</option>
            {[...ACCOUNTS, 'Planner/Content', 'Media'].map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="field">Deadline<input name="deadline" type="date" defaultValue={displayToInput(current.deadline)} /></label>
        <label className="field">Trạng thái
          <select name="status" defaultValue={current.status}>
            <option>Nháp</option><option>Việc cần làm</option><option>Đang thực hiện</option><option>Đang chờ</option><option>Đã hoàn thành</option>
          </select>
        </label>
        <div className="customer-data-rules"><p>Công việc thiếu Owner hoặc deadline chỉ được lưu ở trạng thái Nháp.</p></div>
        <FormActions submit="Lưu công việc" />
      </div>
    </Modal>
  )
}

export function ShootingModal({ project }: { project: Project }) {
  const { closeModal } = useApp()
  return (
    <Modal
      title="Lịch shooting"
      onSubmit={(form) => {
        const date = inputToDisplay(field(form, 'date'))
        saveCycle(project, (cycle) => {
          cycle.shootings.push({ date, media: field(form, 'media'), status: field(form, 'status'), assets: field(form, 'assets') })
          return ['Lịch shooting đã tạo', date]
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Ngày shooting<input name="date" type="date" required /></label>
        <label className="field">Media<select name="media"><option>Media</option><option>Media Hùng</option><option>Media Linh</option></select></label>
        <label className="field">Trạng thái<select name="status"><option>Chờ xác nhận</option><option>Đã xác nhận</option><option>Đã hoàn thành</option></select></label>
        <label className="field">Tài nguyên / link<input name="assets" placeholder="Link script, tư liệu hoặc ghi chú" /></label>
        <FormActions submit="Lưu lịch shooting" />
      </div>
    </Modal>
  )
}

export function DemoModal({ project }: { project: Project }) {
  const { closeModal } = useApp()
  const demo = cycleDataFor(project).demo
  return (
    <Modal
      title="Post Demo"
      onSubmit={(form) => {
        saveCycle(project, (cycle) => {
          cycle.demo.status = field(form, 'status')
          cycle.demo.link = field(form, 'link')
          if (cycle.demo.status === 'Đã gửi' && !cycle.demo.sentAt) cycle.demo.sentAt = 'Hôm nay'
          if (cycle.demo.status === 'Đã duyệt') cycle.demo.approvedAt = 'Hôm nay'
          return ['Post Demo đã cập nhật', cycle.demo.status]
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Trạng thái
          <select name="status" defaultValue={demo.status}><option>Chưa gửi</option><option>Đã gửi</option><option>Cần chỉnh sửa</option><option>Đã duyệt</option></select>
        </label>
        <label className="field">Link Demo<input name="link" type="url" defaultValue={demo.link} placeholder="https://..." /></label>
        <FormActions submit="Lưu Post Demo" />
      </div>
    </Modal>
  )
}

export function PostsModal({ project }: { project: Project }) {
  const { closeModal } = useApp()
  const posts = cycleDataFor(project).posts
  return (
    <Modal
      title="Bài đăng chu kỳ"
      onSubmit={(form) => {
        saveCycle(project, (cycle) => {
          cycle.posts = { planned: Number(field(form, 'planned')), actual: Number(field(form, 'actual')) }
          return ['Tiến độ bài đăng đã cập nhật', cycle.posts.actual + ' / ' + cycle.posts.planned + ' đã xuất bản']
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Kế hoạch trong kỳ<input name="planned" type="number" min="0" required defaultValue={posts.planned} /></label>
        <label className="field">Đã xuất bản<input name="actual" type="number" min="0" required defaultValue={posts.actual} /></label>
        <div className="customer-data-rules"><p>Mục tiêu chuẩn: phân phối đều 2–3 bài mỗi tuần cho gói 12 nội dung/tháng.</p></div>
        <FormActions submit="Lưu bài đăng" />
      </div>
    </Modal>
  )
}

export function ExceptionModal({ project }: { project: Project }) {
  const { closeModal } = useApp()
  return (
    <Modal
      title="Ghi nhận ngoại lệ"
      onSubmit={(form) => {
        const type = field(form, 'type')
        saveCycle(project, (cycle) => {
          cycle.exceptions.push({ type, reason: field(form, 'reason') })
          return ['Ngoại lệ đã ghi nhận', type]
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Loại ngoại lệ
          <select name="type"><option>Chờ khách duyệt</option><option>Có nguy cơ trễ</option><option>Trễ chu kỳ</option><option>Đang bù chu kỳ</option><option>Media quá tải</option></select>
        </label>
        <label className="field">Lý do và hành động tiếp theo<textarea name="reason" required placeholder="Nêu nguyên nhân, người xử lý và mốc theo dõi" /></label>
        <FormActions submit="Lưu ngoại lệ" />
      </div>
    </Modal>
  )
}
