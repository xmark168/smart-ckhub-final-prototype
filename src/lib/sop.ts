import type { ContentItem, ContentStage, Cycle, PackageQuota, Project, SopParams } from '../store/types'
import { addBusinessDaysIso, addDaysIso, diffDays, shortDate, TODAY } from './format'

/**
 * SOP timeline engine: turns a cycle, the package quota and the operating parameters into
 * milestones with due dates and states. Pure functions — no store access — so they can be
 * unit-tested and reused by list, detail and posts screens.
 */

export const STAGES: ContentStage[] = ['Ý tưởng', 'Script', 'Dựng', 'Chờ khách duyệt', 'Lên lịch', 'Đã đăng']

export type MilestoneState = 'waiting' | 'upcoming' | 'due' | 'late' | 'done' | 'doneLate'

export interface Milestone {
  key: string
  label: string
  /** yyyy-mm-dd, '' when it depends on an earlier step that has not happened. */
  due: string
  done: string
  state: MilestoneState
  detail: string
}

export const MILESTONE_LABEL: Record<MilestoneState, string> = {
  waiting: 'Chờ bước trước',
  upcoming: 'Chưa đến hạn',
  due: 'Đến hạn',
  late: 'Trễ hạn',
  done: 'Đúng hạn',
  doneLate: 'Xong trễ',
}

export const MILESTONE_TONE: Record<MilestoneState, string> = {
  waiting: 'muted',
  upcoming: 'muted',
  due: 'waiting',
  late: 'danger',
  done: 'ok',
  doneLate: 'waiting',
}

export function isPublished(item: ContentItem): boolean {
  return item.stage === 'Đã đăng'
}

/** A script counts as delivered once the item has reached editing. */
export function scriptDone(item: ContentItem): boolean {
  return STAGES.indexOf(item.stage) >= STAGES.indexOf('Dựng')
}

export function stateOf(due: string, done: string, today: string): MilestoneState {
  if (done) return due && done > due ? 'doneLate' : 'done'
  if (!due) return 'waiting'
  if (today > due) return 'late'
  if (today === due) return 'due'
  return 'upcoming'
}

export function cycleProgress(cycle: Cycle, quota: PackageQuota) {
  // A closed cycle keeps the numbers recorded when it was closed, even if the package changed later.
  if (cycle.result) {
    const bonus = cycle.contents.filter((item) => item.bonus && isPublished(item)).length
    return { published: cycle.result.published, planned: cycle.result.planned, bonus, missing: Math.max(0, cycle.result.planned - cycle.result.published) }
  }
  const core = cycle.contents.filter((item) => !item.bonus)
  const published = core.filter(isPublished).length
  return {
    published,
    planned: quota.posts,
    bonus: cycle.contents.filter((item) => item.bonus && isPublished(item)).length,
    missing: Math.max(0, quota.posts - published),
  }
}

/** Posts that should already be out given the weekly cadence, capped at the quota. */
export function expectedPublished(cadenceStart: string, quota: PackageQuota, params: SopParams, today: string): number {
  if (!cadenceStart || today < cadenceStart) return 0
  const weeks = diffDays(cadenceStart, today) / 7
  return Math.min(quota.posts, Math.floor(weeks * params.postsPerWeekMin))
}

export function cycleMilestones(cycle: Cycle, quota: PackageQuota, params: SopParams, today = TODAY): Milestone[] {
  const list: Milestone[] = []
  const add = (key: string, label: string, due: string, done: string, detail: string) =>
    list.push({ key, label, due, done, detail, state: stateOf(due, done, today) })

  add('t0', 'T0 · Khởi động chu kỳ ' + cycle.no, cycle.start, cycle.start <= today ? cycle.start : '', 'Khách đã cọc và đủ brief')

  if (quota.plans > 0) {
    const plan = cycle.plan
    add(
      'plan',
      'Gửi Content Plan',
      addBusinessDaysIso(cycle.start, params.planLeadBusinessDays),
      plan.sentAt,
      plan.approvedAt ? 'Khách duyệt ' + shortDate(plan.approvedAt) : plan.sentAt ? 'Chờ khách duyệt' : 'T0 + ' + params.planLeadBusinessDays + ' ngày làm việc',
    )
  }

  if (quota.shoots > 0) {
    const approved = cycle.plan.approvedAt
    add(
      'shootingPlan',
      'Gửi Shooting Plan',
      approved ? addDaysIso(approved, params.shootingPlanAfterApprovalDays) : '',
      cycle.shootingPlan.sentAt,
      approved ? 'Khách duyệt Plan + ' + params.shootingPlanAfterApprovalDays + ' ngày' : 'Sau khi khách duyệt Content Plan',
    )
    const shoot = [...cycle.shootings].sort((a, b) => a.date.localeCompare(b.date))[0]
    const shootDone = shoot && shoot.status === 'Đã hoàn thành' ? shoot.date : ''
    add('shoot', 'Buổi shoot', shoot ? shoot.date : '', shootDone, shoot ? shoot.location || 'Đã có lịch' : 'Chưa chốt lịch shooting')
    if (quota.posts > 0) {
      add(
        'demo',
        'Gửi Post Demo',
        shootDone ? addBusinessDaysIso(shootDone, params.postDemoAfterShootBusinessDays) : '',
        cycle.demo.sentAt,
        cycle.demo.approvedAt ? 'Khách duyệt ' + shortDate(cycle.demo.approvedAt) : shootDone ? 'Shoot + ' + params.postDemoAfterShootBusinessDays + ' ngày làm việc' : 'Sau buổi shoot',
      )
    }
  }

  if (quota.posts > 0) {
    const cadenceStart = cycle.demo.approvedAt || (quota.shoots === 0 ? cycle.plan.approvedAt : '')
    const { published } = cycleProgress(cycle, quota)
    const expected = expectedPublished(cadenceStart, quota, params, today)
    const reached = published >= quota.posts
    const behind = expected - published
    list.push({
      key: 'cadence',
      label: 'Đăng ' + quota.posts + ' bài (' + params.postsPerWeekMin + '–' + params.postsPerWeekMax + ' bài/tuần)',
      due: cycle.plannedEnd,
      done: reached ? cycle.actualEnd || today : '',
      state: reached ? 'done' : !cadenceStart ? 'waiting' : behind > 0 || today > cycle.plannedEnd ? 'late' : 'upcoming',
      detail: !cadenceStart
        ? 'Bắt đầu sau khi khách duyệt Post Demo'
        : published + ' / ' + quota.posts + ' bài' + (behind > 0 ? ' · chậm ' + behind + ' bài so với nhịp' : ' · đúng nhịp'),
    })

    const pending = cycle.contents.filter((item) => item.deadlineEdit && !isPublished(item)).sort((a, b) => a.deadlineEdit.localeCompare(b.deadlineEdit))
    for (let index = 0; index < pending.length; index += params.scriptBatchSize) {
      const batch = pending.slice(index, index + params.scriptBatchSize)
      const due = addDaysIso(batch[0].deadlineEdit, -params.scriptLeadDays)
      const allDone = batch.every(scriptDone)
      list.push({
        key: 'script-' + index,
        label: 'Script lô ' + (index / params.scriptBatchSize + 1) + ' (' + batch.length + ' bài)',
        due,
        done: allDone ? due : '',
        state: allDone ? 'done' : stateOf(due, '', today),
        detail: batch.filter(scriptDone).length + ' / ' + batch.length + ' script xong · trước deadline dựng ' + params.scriptLeadDays + ' ngày',
      })
    }
  }

  const end: Milestone = {
    key: 'end',
    label: 'Chốt chu kỳ ' + cycle.no,
    due: cycle.plannedEnd,
    done: cycle.actualEnd,
    state: stateOf(cycle.plannedEnd, cycle.actualEnd, today),
    detail: cycle.actualEnd ? 'Đã chốt ' + shortDate(cycle.actualEnd) : 'Kết thúc dự kiến ' + shortDate(cycle.plannedEnd),
  }
  if (end.state === 'upcoming' && diffDays(today, cycle.plannedEnd) <= params.cycleEndWarningDays) end.state = 'due'
  list.push(end)
  return list
}

export function runningCycle(project: Project): Cycle | undefined {
  return project.cycles.find((cycle) => cycle.status === 'running')
}

/** Running cycle, or the last one when every cycle is closed. */
export function currentCycle(project: Project): Cycle | undefined {
  return runningCycle(project) ?? project.cycles[project.cycles.length - 1]
}

export type HealthLevel = 'draft' | 'paused' | 'stopped' | 'finished' | 'ok' | 'watch' | 'late'

export interface Health {
  level: HealthLevel
  label: string
  reason: string
  tone: string
}

export function projectHealth(project: Project, params: SopParams, today = TODAY): Health {
  if (project.state === 'draft') return { level: 'draft', label: 'Chưa bắt đầu', reason: 'Hoàn tất Cổng khởi động để tạo chu kỳ 1.', tone: 'muted' }
  if (project.state === 'pending') return { level: 'paused', label: 'Tạm dừng', reason: project.pause?.reason || 'Dự án đang tạm dừng.', tone: 'waiting' }
  if (project.state === 'stopped') return { level: 'stopped', label: 'Đã dừng', reason: project.stop?.reason || 'Dự án đã dừng.', tone: 'muted' }
  const cycle = runningCycle(project)
  if (!cycle) return { level: 'finished', label: 'Hết chu kỳ HĐ', reason: 'Đã chạy đủ số chu kỳ theo hợp đồng — cần tái ký.', tone: 'waiting' }
  const milestones = cycleMilestones(cycle, project.quota, params, today)
  const late = milestones.filter((item) => item.state === 'late')
  if (late.length) {
    const first = late[0]
    const days = first.due ? diffDays(first.due, today) : 0
    return { level: 'late', label: 'Chậm tiến độ', reason: first.label + (days > 0 ? ' trễ ' + days + ' ngày' : '') + (late.length > 1 ? ' · +' + (late.length - 1) + ' mốc khác' : ''), tone: 'danger' }
  }
  const due = milestones.filter((item) => item.state === 'due')
  if (due.length || project.risk) {
    return { level: 'watch', label: 'Cần theo dõi', reason: due.length ? due[0].label + ' đến hạn ' + shortDate(due[0].due) : 'Gắn cờ: ' + (project.riskReason || 'Account cần theo dõi.'), tone: 'waiting' }
  }
  return { level: 'ok', label: 'Đúng tiến độ', reason: 'Không có mốc trễ trong chu kỳ ' + cycle.no + '.', tone: 'ok' }
}

export interface NextAction {
  label: string
  due: string
  state: MilestoneState
  detail: string
}

/** Open milestones of the running cycle, most urgent first. */
export function nextActions(project: Project, params: SopParams, today = TODAY): NextAction[] {
  const cycle = runningCycle(project)
  if (!cycle || project.state !== 'active') return []
  const open = cycleMilestones(cycle, project.quota, params, today).filter((item) => item.state !== 'done' && item.state !== 'doneLate')
  const rank = (item: Milestone) => (item.state === 'late' ? 0 : item.state === 'due' ? 1 : item.state === 'upcoming' ? 2 : 3)
  return open
    .sort((a, b) => rank(a) - rank(b) || (a.due || '9999').localeCompare(b.due || '9999'))
    .map((item) => {
      if (item.key === 'end' && item.state === 'late') {
        const { missing } = cycleProgress(cycle, project.quota)
        return { ...item, label: 'Chốt chu kỳ ' + cycle.no + (missing ? ' — còn ' + missing + ' bài' : '') }
      }
      return item
    })
}
