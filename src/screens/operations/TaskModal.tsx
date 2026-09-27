import { useApp } from '../../app/context'
import { ACCOUNTS, shortDate, TODAY } from '../../lib/format'
import { checked, field } from '../../lib/form'
import { inScope } from '../../lib/scope'
import { update, useData } from '../../store/store'
import type { WorkTask } from '../../store/types'
import { FormActions, Modal, Req } from '../../ui/Modal'
import { MEDIA_PEOPLE } from '../projects/projectLogic'

/** People a task can be given to. */
export const PEOPLE = [...new Set([...ACCOUNTS, 'Content nội bộ', 'Kế toán', ...MEDIA_PEOPLE])]

/**
 * Create a manual task, or edit one. Generated tasks only take a new assignee and a note:
 * their title, due date and completion follow the source.
 */
export function TaskModal({ task }: { task?: WorkTask }) {
  const { closeModal, toast, role, account, openProject } = useApp()
  const { projects } = useData()
  const auto = Boolean(task?.source)
  const choices = projects.filter((item) => item.state !== 'stopped' && inScope(role, account, item))
  const project = projects.find((item) => item.id === task?.projectId)

  const remove = () => {
    update((draft) => { draft.tasks = draft.tasks.filter((item) => item.id !== task!.id) })
    closeModal()
    toast('Đã xóa việc.')
  }

  return (
    <Modal
      title={task ? task.title : 'Giao việc'}
      onSubmit={(form) => {
        const values = { assignee: field(form, 'assignee'), note: field(form, 'note') || undefined }
        update((draft) => {
          if (!task) {
            draft.tasks.push({ id: 'task-' + Date.now(), projectId: field(form, 'project'), title: field(form, 'title'), role: 'Account', due: field(form, 'due'), status: 'open', ...values })
            return
          }
          const target = draft.tasks.find((item) => item.id === task.id)
          if (!target) return
          Object.assign(target, values)
          if (!auto) {
            const done = checked(form, 'done')
            Object.assign(target, { title: field(form, 'title'), due: field(form, 'due'), status: done ? 'done' : 'open', doneAt: done ? target.doneAt || TODAY : undefined })
          }
        })
        closeModal()
        toast(task ? 'Đã cập nhật việc.' : 'Đã giao việc.')
      }}
    >
      <div className="form">
        {auto && project && (
          <div className="customer-data-rules">
            <b>{project.customer} · hạn {shortDate(task!.due)}</b>
            <p>Việc tự sinh từ dự án: tự đóng khi việc gốc được ghi nhận xong.{' '}
              <button type="button" className="text-btn" onClick={() => { closeModal(); openProject(project.id, task!.tab) }}>Mở chỗ làm ›</button>
            </p>
          </div>
        )}
        {!auto && (
          <>
            <label className="field">Việc<Req /><input name="title" required defaultValue={task?.title} placeholder="Ví dụ: Xin logo vector từ khách" /></label>
            {!task && (
              <label className="field">Dự án<Req />
                <select name="project" required>{choices.map((item) => <option key={item.id} value={item.id}>{item.customer} · {item.service}</option>)}</select>
              </label>
            )}
          </>
        )}
        <div className="form-grid">
          <label className="field">Người làm<Req />
            <input name="assignee" required list="task-people" defaultValue={task?.assignee ?? account} />
            <datalist id="task-people">{PEOPLE.map((name) => <option key={name} value={name} />)}</datalist>
          </label>
          {!auto && <label className="field">Hạn<Req /><input name="due" type="date" required defaultValue={task?.due ?? TODAY} /></label>}
        </div>
        <label className="field">Ghi chú<textarea name="note" defaultValue={task?.note} placeholder="Không bắt buộc" /></label>
        {task && !auto && <label className="filter-check"><input name="done" type="checkbox" defaultChecked={task.status === 'done'} /> Đã xong</label>}
        {task && !auto ? (
          <div className="form-actions">
            <button className="secondary" type="button" onClick={remove}>Xóa</button>
            <button className="secondary" type="button" onClick={closeModal}>Hủy</button>
            <button className="primary">Lưu</button>
          </div>
        ) : <FormActions submit={task ? 'Lưu' : 'Giao việc'} />}
      </div>
    </Modal>
  )
}
