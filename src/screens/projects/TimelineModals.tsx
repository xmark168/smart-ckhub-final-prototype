import { useApp } from '../../app/context'
import { STEP_KINDS, STEP_OWNERS } from '../../data/timeline'
import { diffDays, shortDate, TODAY } from '../../lib/format'
import { checked, field } from '../../lib/form'
import { cycleMilestones, runningCycle } from '../../lib/sop'
import { useData } from '../../store/store'
import type { Project, StepOwner, TimelineStep } from '../../store/types'
import { FormActions, Modal, Req } from '../../ui/Modal'
import { addProjectActivity, updateProject } from './projectLogic'

/** Apply a change to one step of the running cycle and log it with its reason. */
function changeStep(project: Project, stepId: string, by: string, text: string, change: (step: TimelineStep) => void) {
  updateProject(project.id, (item) => {
    const cycle = runningCycle(item)
    const step = cycle?.timeline.find((entry) => entry.id === stepId)
    if (!cycle || !step) return
    change(step)
    step.log.push({ at: TODAY, by, text })
    cycle.activity.unshift({ title: 'Timeline: ' + step.name, detail: text, time: 'Vừa xong' })
    addProjectActivity(item, 'calendar-clock', 'Điều chỉnh timeline: ' + step.name, text)
  })
}

/**
 * Account adjusts one step of this cycle: move the due date, change the posting cadence, skip
 * the step or tick a custom milestone. Every change needs a reason; the template is untouched.
 */
export function StepModal({ project, stepId }: { project: Project; stepId: string }) {
  const { closeModal, toast, account } = useApp()
  const { params } = useData()
  const cycle = runningCycle(project)
  const step = cycle?.timeline.find((entry) => entry.id === stepId)
  const milestone = cycle && cycleMilestones(cycle, project.quota, params).find((entry) => entry.key === stepId)
  if (!cycle || !step || !milestone) return null
  const isPublish = step.kind === 'publish'
  const isCustom = step.kind === 'custom'
  const perWeek = step.perWeek ?? [params.postsPerWeekMin, params.postsPerWeekMax]

  return (
    <Modal
      title={step.name}
      onSubmit={(form) => {
        const reason = field(form, 'reason')
        const due = field(form, 'due')
        const skipped = checked(form, 'skipped')
        const nextWeek: [number, number] = isPublish ? [Number(field(form, 'min')), Number(field(form, 'max'))] : perWeek
        const done = isCustom && checked(form, 'done')
        const parts: string[] = []
        if (due && due !== milestone.due) parts.push('hạn ' + shortDate(milestone.due) + ' → ' + shortDate(due))
        if (skipped !== Boolean(step.skipped)) parts.push(skipped ? 'bỏ qua bước' : 'khôi phục bước')
        if (isPublish && (nextWeek[0] !== perWeek[0] || nextWeek[1] !== perWeek[1])) parts.push('nhịp ' + nextWeek[0] + '–' + nextWeek[1] + ' bài/tuần')
        if (isCustom && done !== Boolean(step.doneAt)) parts.push(done ? 'đánh dấu xong' : 'bỏ đánh dấu xong')
        if (!parts.length) return toast('Chưa có thay đổi.')
        if (isPublish && (nextWeek[0] < 1 || nextWeek[1] < nextWeek[0])) return toast('Nhịp tối đa phải lớn hơn hoặc bằng nhịp tối thiểu.')
        changeStep(project, step.id, account, parts.join(', ') + ' — ' + reason, (target) => {
          if (due && due !== milestone.due) target.dueOverride = due
          target.skipped = skipped || undefined
          if (isPublish) target.perWeek = nextWeek
          if (isCustom) target.doneAt = done ? target.doneAt || TODAY : undefined
        })
        closeModal()
      }}
    >
      <div className="form">
        <div className="customer-data-rules">
          <b>{STEP_KINDS[step.kind].label} · {step.owner}</b>
          <p>{milestone.detail}</p>
          {milestone.moved && <p>Hạn theo mẫu: {shortDate(milestone.baseDue)}.</p>}
        </div>
        <label className="field">Hạn{milestone.projected ? ' (đang là dự kiến)' : ''}<input name="due" type="date" defaultValue={milestone.due} min={cycle.start} /></label>
        {isPublish && (
          <div className="form-grid">
            <label className="field">Nhịp tối thiểu (bài/tuần)<input name="min" type="number" min="1" defaultValue={perWeek[0]} /></label>
            <label className="field">Nhịp tối đa (bài/tuần)<input name="max" type="number" min="1" defaultValue={perWeek[1]} /></label>
          </div>
        )}
        {isCustom && <label className="filter-check"><input name="done" type="checkbox" defaultChecked={Boolean(step.doneAt)} /> Đã xong</label>}
        <label className="filter-check"><input name="skipped" type="checkbox" defaultChecked={Boolean(step.skipped)} /> Bỏ qua bước này trong chu kỳ {cycle.no}</label>
        <label className="field">Lý do<Req /><textarea name="reason" required placeholder="Ví dụ: khách dời lịch quay vì sự kiện khai trương" /></label>
        {step.log.length > 0 && (
          <div className="step-log">
            <b>Lịch sử điều chỉnh</b>
            {step.log.slice().reverse().map((entry, index) => <small key={index}>{shortDate(entry.at)} · {entry.by}: {entry.text}</small>)}
          </div>
        )}
        <div className="form-actions">
          {step.dueOverride && (
            <button className="secondary" type="button" onClick={() => {
              changeStep(project, step.id, account, 'về hạn theo mẫu ' + shortDate(milestone.baseDue), (target) => { target.dueOverride = undefined })
              closeModal()
            }}>Về hạn theo mẫu</button>
          )}
          {isCustom && (
            <button className="secondary" type="button" onClick={() => {
              updateProject(project.id, (item) => {
                const running = runningCycle(item)
                if (!running) return
                running.timeline = running.timeline.filter((entry) => entry.id !== step.id)
                addProjectActivity(item, 'calendar-x', 'Xóa mốc ' + step.name, 'Chu kỳ ' + running.no)
              })
              closeModal()
            }}>Xóa mốc</button>
          )}
          <button className="secondary" type="button" onClick={closeModal}>Hủy</button>
          <button className="primary">Lưu</button>
        </div>
      </div>
    </Modal>
  )
}

/** Extra milestone for this cycle only (event, campaign, customer request). */
export function AddStepModal({ project }: { project: Project }) {
  const { closeModal, account } = useApp()
  const { params } = useData()
  const cycle = runningCycle(project)
  if (!cycle) return null
  return (
    <Modal
      title={'Thêm mốc chu kỳ ' + cycle.no}
      onSubmit={(form) => {
        const date = field(form, 'due')
        const name = field(form, 'name')
        const reason = field(form, 'reason')
        const step: TimelineStep = {
          id: 'custom-' + Date.now(),
          kind: 'custom',
          name,
          owner: field(form, 'owner') as StepOwner,
          anchor: { after: 'T0', event: 'done', offset: diffDays(cycle.start, date), unit: 'd' },
          log: [{ at: TODAY, by: account, text: 'thêm mốc — ' + reason }],
        }
        updateProject(project.id, (item) => {
          const running = runningCycle(item)
          if (!running) return
          // Keep the row in date order among the steps already there.
          const dates = cycleMilestones(running, item.quota, params)
          const index = dates.findIndex((entry) => entry.kind !== 'end' && entry.due > date)
          running.timeline.splice(index < 0 ? running.timeline.length : index, 0, step)
          running.activity.unshift({ title: 'Thêm mốc ' + name, detail: shortDate(date) + ' · ' + reason, time: 'Vừa xong' })
          addProjectActivity(item, 'calendar-plus', 'Thêm mốc ' + name, shortDate(date) + ' · ' + reason)
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Tên mốc<Req /><input name="name" required placeholder="Ví dụ: Livestream khai trương chi nhánh 2" /></label>
        <div className="form-grid">
          <label className="field">Phụ trách
            <select name="owner" defaultValue="Account">{STEP_OWNERS.map((owner) => <option key={owner}>{owner}</option>)}</select>
          </label>
          <label className="field">Hạn<Req /><input name="due" type="date" required min={cycle.start} defaultValue={TODAY} /></label>
        </div>
        <label className="field">Lý do / sự kiện<Req /><textarea name="reason" required placeholder="Vì sao chu kỳ này cần thêm mốc" /></label>
        <FormActions submit="Thêm mốc" />
      </div>
    </Modal>
  )
}
