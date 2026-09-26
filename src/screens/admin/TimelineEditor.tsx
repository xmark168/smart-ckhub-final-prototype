import { useState } from 'react'
import { useApp } from '../../app/context'
import { packageLabel } from '../../data/catalog'
import { newCycle } from '../../data/cycles'
import { defaultTimeline, STEP_KINDS, STEP_OWNERS } from '../../data/timeline'
import { diffDays, TODAY } from '../../lib/format'
import { cycleMilestones } from '../../lib/sop'
import { update, useData } from '../../store/store'
import type { ServicePackage, StepKind, StepOwner, TimelineStepTemplate } from '../../store/types'
import { Modal } from '../../ui/Modal'

const KINDS = Object.keys(STEP_KINDS) as StepKind[]

function newStep(kind: StepKind, steps: TimelineStepTemplate[], perWeek: [number, number]): TimelineStepTemplate {
  let n = steps.filter((step) => step.kind === kind).length + 1
  while (steps.some((step) => step.id === kind + '-' + n)) n++
  const last = steps[steps.length - 1]
  return {
    id: kind + '-' + n,
    kind,
    name: STEP_KINDS[kind].label + (n > 1 ? ' ' + n : ''),
    owner: STEP_KINDS[kind].owner,
    anchor: last ? { after: last.id, event: 'done', offset: 1, unit: 'd' } : { after: 'T0', event: 'done', offset: 0, unit: 'd' },
    posts: STEP_KINDS[kind].posts ? [1, 0] : undefined,
    shootNo: kind === 'shoot' ? steps.filter((step) => step.kind === 'shoot').length + 1 : undefined,
    perWeek: kind === 'publish' ? perWeek : undefined,
  }
}

/** Problems that would make the timeline wrong for this package; shown above the list. */
function problems(pkg: ServicePackage, steps: TimelineStepTemplate[]): string[] {
  const list: string[] = []
  steps.forEach((step, index) => {
    const after = step.anchor.after
    if (after !== 'T0' && !steps.slice(0, index).some((prev) => prev.id === after)) list.push('"' + step.name + '" chờ một bước không nằm phía trên nó.')
  })
  const shoots = steps.filter((step) => step.kind === 'shoot').length
  if (shoots !== pkg.quota.shoots) list.push('Gói có ' + pkg.quota.shoots + ' buổi shoot / chu kỳ nhưng timeline có ' + shoots + ' bước Shooting.')
  if (pkg.quota.plans && !steps.some((step) => step.kind === 'plan')) list.push('Gói có Content Plan nhưng timeline chưa có bước Content Plan.')
  if (pkg.quota.posts && !steps.some((step) => step.kind === 'publish')) list.push('Gói có ' + pkg.quota.posts + ' bài / chu kỳ nhưng chưa có bước Đăng bài.')
  for (const kind of ['script', 'edit'] as const) {
    const ranges = steps.filter((step) => step.kind === kind && step.posts).map((step) => step.posts!).sort((a, b) => a[0] - b[0])
    if (!pkg.quota.posts || !ranges.length) continue
    let next = 1
    for (const [from, to] of ranges) {
      if (from !== next) break
      next = to ? to + 1 : Infinity
    }
    if (next !== Infinity) list.push('Các lô ' + STEP_KINDS[kind].label + ' chưa phủ liền mạch bài 1 → hết (lô cuối để "đến" = 0).')
  }
  return list
}

/**
 * Administrator edits the default timeline of one package. Every cycle opened after saving
 * copies it; running cycles keep the copy they started with.
 */
export function TimelineEditorModal({ pkg }: { pkg: ServicePackage }) {
  const { closeModal, toast, role } = useApp()
  const { params } = useData()
  const editable = role === 'admin'
  const [steps, setSteps] = useState<TimelineStepTemplate[]>(() => structuredClone(pkg.timeline ?? []))
  const perWeek: [number, number] = [params.postsPerWeekMin, params.postsPerWeekMax]
  const issues = problems(pkg, steps)
  const blocking = issues.some((issue) => issue.includes('không nằm phía trên'))

  // Preview: a cycle starting today where every step happens exactly on its due date.
  const preview = cycleMilestones(newCycle(1, TODAY, params, steps), pkg.quota, params, TODAY)
  const dayOf = (id: string) => {
    const item = preview.find((entry) => entry.key === id)
    return item?.due ? diffDays(TODAY, item.due) : null
  }
  const lastDay = Math.max(0, ...steps.map((step) => dayOf(step.id) ?? 0))

  const set = (index: number, change: Partial<TimelineStepTemplate>) => setSteps(steps.map((step, i) => (i === index ? { ...step, ...change } : step)))
  const setAnchor = (index: number, change: Partial<TimelineStepTemplate['anchor']>) => set(index, { anchor: { ...steps[index].anchor, ...change } })
  const move = (index: number, delta: number) => {
    const next = [...steps]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    setSteps(next)
  }
  const remove = (index: number) => {
    const id = steps[index].id
    // Steps that waited for the removed one now wait for whatever it waited for.
    setSteps(steps.filter((_, i) => i !== index).map((step) => (step.anchor.after === id ? { ...step, anchor: { ...step.anchor, after: steps[index].anchor.after } } : step)))
  }

  return (
    <Modal
      title={'Timeline mẫu · ' + packageLabel(pkg)}
      className="contract-modal timeline-editor"
      onSubmit={() => {
        if (!editable) return closeModal()
        if (blocking) return toast('Có bước chờ một bước nằm phía dưới. Sửa thứ tự hoặc mốc "Sau bước" trước khi lưu.')
        update((draft) => {
          const target = draft.packages.find((entry) => entry.id === pkg.id)
          if (target) target.timeline = steps
        })
        closeModal()
        toast('Đã lưu timeline mẫu. Áp dụng cho các chu kỳ mở từ bây giờ; chu kỳ đang chạy giữ bản cũ.')
      }}
    >
      <div className="form">
        <div className="customer-data-rules">
          <b>{pkg.quota.posts ? pkg.quota.posts + ' bài · ' + pkg.quota.shoots + ' buổi shoot · ' + pkg.quota.plans + ' Content Plan / chu kỳ' : 'Gói không có đầu ra nội dung hằng tháng'}</b>
          <p>Mỗi chu kỳ của gói được sinh từ timeline này. Hạn mỗi bước = sau T0 hoặc sau một bước phía trên (xong / khách duyệt) + số ngày. Chu kỳ chốt khi xong mọi bước. Account chỉ điều chỉnh bản của từng chu kỳ, kèm lý do.</p>
          {steps.length > 0 && <p>Nếu mọi bước đúng hạn: chu kỳ kéo dài khoảng <b>{lastDay + 1} ngày</b>.</p>}
        </div>
        {issues.length > 0 && (
          <div className="customer-data-rules warn"><b>Cần xem lại</b><ul className="rules-list">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>
        )}

        <ol className="tle-list">
          {steps.map((step, index) => {
            const earlier = steps.slice(0, index)
            const afterStep = earlier.find((prev) => prev.id === step.anchor.after)
            const canApprove = afterStep ? Boolean(STEP_KINDS[afterStep.kind].approval) : false
            const day = dayOf(step.id)
            return (
              <li key={step.id} className="tle-row">
                <div className="tle-top">
                  <span className="tle-no">{index + 1}</span>
                  <select aria-label="Loại bước" value={step.kind} disabled={!editable} onChange={(event) => {
                    const fresh = newStep(event.target.value as StepKind, steps.filter((_, i) => i !== index), perWeek)
                    set(index, { kind: fresh.kind, name: fresh.name, owner: fresh.owner, posts: fresh.posts, shootNo: fresh.shootNo, perWeek: fresh.perWeek })
                  }}>
                    {KINDS.map((kind) => <option key={kind} value={kind}>{STEP_KINDS[kind].label}</option>)}
                  </select>
                  <input aria-label="Tên bước" value={step.name} disabled={!editable} onChange={(event) => set(index, { name: event.target.value })} />
                  <select aria-label="Phụ trách" value={step.owner} disabled={!editable} onChange={(event) => set(index, { owner: event.target.value as StepOwner })}>
                    {STEP_OWNERS.map((owner) => <option key={owner}>{owner}</option>)}
                  </select>
                  <span className="tle-day" title="Ngày dự kiến nếu mọi bước trước đúng hạn">{day === null ? '—' : 'Ngày ' + (day + 1)}</span>
                  {editable && (
                    <span className="tle-actions">
                      <button type="button" className="icon-btn" aria-label="Lên" disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
                      <button type="button" className="icon-btn" aria-label="Xuống" disabled={index === steps.length - 1} onClick={() => move(index, 1)}>↓</button>
                      <button type="button" className="icon-btn danger" aria-label={'Xóa ' + step.name} onClick={() => remove(index)}>×</button>
                    </span>
                  )}
                </div>
                <div className="tle-rule">
                  <span>Hạn: sau</span>
                  <select aria-label="Sau bước" value={step.anchor.after} disabled={!editable} onChange={(event) => setAnchor(index, { after: event.target.value, event: 'done' })}>
                    <option value="T0">T0 (bắt đầu chu kỳ)</option>
                    {earlier.map((prev) => <option key={prev.id} value={prev.id}>{prev.name}</option>)}
                    {step.anchor.after !== 'T0' && !afterStep && <option value={step.anchor.after}>⚠ bước không hợp lệ</option>}
                  </select>
                  {step.anchor.after !== 'T0' && (
                    <select aria-label="Sự kiện" value={step.anchor.event} disabled={!editable} onChange={(event) => setAnchor(index, { event: event.target.value as 'done' | 'approved' })}>
                      <option value="done">xong</option>
                      {canApprove && <option value="approved">khách duyệt</option>}
                    </select>
                  )}
                  <span>+</span>
                  <input aria-label="Số ngày" type="number" min="0" className="tle-num" value={step.anchor.offset} disabled={!editable} onChange={(event) => setAnchor(index, { offset: Math.max(0, Number(event.target.value) || 0) })} />
                  <select aria-label="Đơn vị" value={step.anchor.unit} disabled={!editable} onChange={(event) => setAnchor(index, { unit: event.target.value as 'bd' | 'd' })}>
                    <option value="bd">ngày làm việc</option>
                    <option value="d">ngày</option>
                  </select>
                  {STEP_KINDS[step.kind].posts && (
                    <>
                      <span className="tle-sep">Bài</span>
                      <input aria-label="Từ bài" type="number" min="1" className="tle-num" value={step.posts?.[0] ?? 1} disabled={!editable} onChange={(event) => set(index, { posts: [Math.max(1, Number(event.target.value) || 1), step.posts?.[1] ?? 0] })} />
                      <span>→</span>
                      <input aria-label="Đến bài (0 = hết)" title="0 = đến hết, gồm bài tặng" type="number" min="0" className="tle-num" value={step.posts?.[1] ?? 0} disabled={!editable} onChange={(event) => set(index, { posts: [step.posts?.[0] ?? 1, Math.max(0, Number(event.target.value) || 0)] })} />
                      {!step.posts?.[1] && <small>hết</small>}
                    </>
                  )}
                  {step.kind === 'shoot' && (
                    <>
                      <span className="tle-sep">Buổi thứ</span>
                      <input aria-label="Buổi shoot thứ" type="number" min="1" className="tle-num" value={step.shootNo ?? 1} disabled={!editable} onChange={(event) => set(index, { shootNo: Math.max(1, Number(event.target.value) || 1) })} />
                    </>
                  )}
                  {step.kind === 'publish' && (
                    <>
                      <span className="tle-sep">Nhịp</span>
                      <input aria-label="Tối thiểu bài/tuần" type="number" min="1" className="tle-num" value={step.perWeek?.[0] ?? perWeek[0]} disabled={!editable} onChange={(event) => set(index, { perWeek: [Math.max(1, Number(event.target.value) || 1), step.perWeek?.[1] ?? perWeek[1]] })} />
                      <span>–</span>
                      <input aria-label="Tối đa bài/tuần" type="number" min="1" className="tle-num" value={step.perWeek?.[1] ?? perWeek[1]} disabled={!editable} onChange={(event) => set(index, { perWeek: [step.perWeek?.[0] ?? perWeek[0], Math.max(1, Number(event.target.value) || 1)] })} />
                      <span>bài/tuần</span>
                    </>
                  )}
                </div>
              </li>
            )
          })}
          {!steps.length && <p className="empty-copy">Chưa có bước nào. Gói không có đầu ra định kỳ thì chu kỳ chỉ có bước Chốt chu kỳ.</p>}
        </ol>

        {editable && (
          <div className="tle-add">
            <label className="sr-only" htmlFor="tle-add-kind">Thêm bước</label>
            <select id="tle-add-kind" value="" onChange={(event) => event.target.value && setSteps([...steps, newStep(event.target.value as StepKind, steps, perWeek)])}>
              <option value="">+ Thêm bước…</option>
              {KINDS.map((kind) => <option key={kind} value={kind}>{STEP_KINDS[kind].label}</option>)}
            </select>
            <button type="button" className="secondary" onClick={() => setSteps(defaultTimeline(pkg.quota, params))}>Tạo lại theo SOP</button>
          </div>
        )}

        <div className="form-actions">
          <button className="secondary" type="button" onClick={closeModal}>{editable ? 'Hủy' : 'Đóng'}</button>
          {editable && <button className="primary">Lưu timeline</button>}
        </div>
      </div>
    </Modal>
  )
}
