import { STEP_KINDS, postsLabel } from '../data/timeline'
import type { ContentItem, ContentStage, Cycle, PackageQuota, Project, SopParams, StepKind, TimelineStep } from '../store/types'
import { addBusinessDaysIso, addDaysIso, diffDays, shortDate, TODAY } from './format'

/**
 * Timeline engine: turns a cycle's timeline (copied from the package template) and the cycle's
 * records into milestones with due dates and states. Steps depend on each other: a step's due
 * date follows from when the step it waits for actually happened, so one late step pushes the
 * rest instead of turning them all red. Pure functions — no store access.
 */

export const STAGES: ContentStage[] = ['Ý tưởng', 'Script', 'Dựng', 'Chờ khách duyệt', 'Lên lịch', 'Đã đăng']

export type MilestoneState = 'waiting' | 'upcoming' | 'due' | 'late' | 'done' | 'doneLate' | 'skipped'

export interface PublishPace {
  /** Day posting started (the step it waits for happened); '' while waiting. */
  start: string
  published: number
  target: number
  /** Posts that should be out by today at the minimum weekly cadence. */
  expected: number
  perWeek: [number, number]
}

export interface Milestone {
  key: string
  kind: StepKind | 'end'
  label: string
  owner: string
  /** yyyy-mm-dd; an estimate while `projected`. */
  due: string
  /** Due date by the template rule, before a manual change. */
  baseDue: string
  /** The due date was changed by hand (reason in the step log). */
  moved: boolean
  /** Due date is an estimate: the step it waits for has not happened yet. */
  projected: boolean
  done: string
  state: MilestoneState
  detail: string
  pace?: PublishPace
}

export const MILESTONE_LABEL: Record<MilestoneState, string> = {
  waiting: 'Chờ bước trước',
  upcoming: 'Chưa đến hạn',
  due: 'Đến hạn',
  late: 'Trễ hạn',
  done: 'Đúng hạn',
  doneLate: 'Xong trễ',
  skipped: 'Bỏ qua',
}

export const MILESTONE_TONE: Record<MilestoneState, string> = {
  waiting: 'muted',
  upcoming: 'muted',
  due: 'waiting',
  late: 'danger',
  done: 'ok',
  doneLate: 'waiting',
  skipped: 'muted',
}

/** Days assumed for a customer review when projecting dates that wait for an approval. */
const REVIEW_DAYS = 1

export function isPublished(item: ContentItem): boolean {
  return item.stage === 'Đã đăng'
}

function reached(item: ContentItem, stage: ContentStage): boolean {
  return STAGES.indexOf(item.stage) >= STAGES.indexOf(stage)
}

/** A script counts as delivered once the item has reached editing. */
export function scriptDone(item: ContentItem): boolean {
  return reached(item, 'Dựng')
}

/** An edit counts as delivered once the post is with the customer for approval. */
export function editDone(item: ContentItem): boolean {
  return reached(item, 'Chờ khách duyệt')
}

export function stateOf(due: string, done: string, today: string): MilestoneState {
  if (done) return due && done > due ? 'doneLate' : 'done'
  if (!due) return 'waiting'
  if (today > due) return 'late'
  if (today === due) return 'due'
  return 'upcoming'
}

/** Posts the cycle must deliver: the package quota (or more when posts were carried over) plus gifted posts. */
export function postTarget(cycle: Cycle, quota: PackageQuota): number {
  if (!quota.posts) return 0
  const core = cycle.contents.filter((item) => !item.bonus).length
  return Math.max(quota.posts, core) + cycle.contents.filter((item) => item.bonus).length
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

/** Posts that should already be out at `perWeekMin`, capped at the target. */
export function expectedPublished(start: string, target: number, perWeekMin: number, today: string): number {
  if (!start || today < start) return 0
  return Math.min(target, Math.floor((diffDays(start, today) / 7) * perWeekMin))
}

function shiftDate(date: string, offset: number, unit: 'bd' | 'd'): string {
  return unit === 'bd' ? addBusinessDaysIso(date, offset) : addDaysIso(date, offset)
}

function itemsIn(cycle: Cycle, range?: [number, number]): ContentItem[] {
  const sorted = [...cycle.contents].sort((a, b) => a.stt - b.stt)
  if (!range) return sorted
  const [from, to] = range
  return sorted.filter((_, index) => index + 1 >= from && (!to || index + 1 <= to))
}

interface StepResult {
  name: string
  due: string
  done: string
  approvedAt: string
}

/** "T0 + 3 ngày làm việc", "Khách duyệt Gửi Content Plan + 1 ngày", "Shoot xong + 3 ngày". */
export function anchorText(step: Pick<TimelineStep, 'anchor'>, nameOf: (id: string) => string): string {
  const { after, event, offset, unit } = step.anchor
  const base = after === 'T0' ? 'T0' : event === 'approved' ? 'Khách duyệt ' + nameOf(after) : nameOf(after) + ' xong'
  return offset ? base + ' + ' + offset + (unit === 'bd' ? ' ngày làm việc' : ' ngày') : base
}

export function cycleMilestones(cycle: Cycle, quota: PackageQuota, params: SopParams, today = TODAY): Milestone[] {
  const results = new Map<string, StepResult>()
  const list: Milestone[] = []
  const shootings = [...cycle.shootings].sort((a, b) => a.date.localeCompare(b.date))
  const nameOf = (id: string) => (cycle.timeline.find((step) => step.id === id)?.name ?? id).replace(/^Gửi /, '')

  for (const step of cycle.timeline) {
    // Anchor: T0, or when the step it waits for happened (estimated from its due date if not yet).
    let anchor = cycle.start
    let projected = false
    const prev = step.anchor.after === 'T0' ? undefined : results.get(step.anchor.after)
    if (prev) {
      if (step.anchor.event === 'approved') {
        anchor = prev.approvedAt || addDaysIso(prev.done || prev.due, REVIEW_DAYS)
        projected = !prev.approvedAt
      } else {
        anchor = prev.done || prev.due
        projected = !prev.done
      }
    }
    const ruleDue = shiftDate(anchor, step.anchor.offset, step.anchor.unit)
    let planned = ''
    let done = ''
    let approvedAt = ''
    let detail = ''
    let pace: PublishPace | undefined
    const items = STEP_KINDS[step.kind].posts ? itemsIn(cycle, step.posts) : []

    switch (step.kind) {
      case 'plan':
        done = cycle.plan.sentAt
        approvedAt = cycle.plan.approvedAt
        detail = approvedAt ? 'Khách duyệt ' + shortDate(approvedAt) : done ? 'Đã gửi, chờ khách duyệt' : ''
        break
      case 'shootingPlan':
        done = cycle.shootingPlan.sentAt
        break
      case 'shoot': {
        const shoot = shootings[(step.shootNo ?? 1) - 1]
        if (shoot) {
          planned = shoot.date
          done = shoot.status === 'Đã hoàn thành' ? shoot.date : ''
          detail = (shoot.location || 'Đã có lịch') + (shoot.media.length ? ' · ' + shoot.media.join(', ') : '')
        }
        break
      }
      case 'demo':
        done = cycle.demo.sentAt
        approvedAt = cycle.demo.approvedAt
        detail = approvedAt ? 'Khách duyệt ' + shortDate(approvedAt) : done ? 'Đã gửi, chờ khách duyệt' : ''
        break
      case 'script':
      case 'edit': {
        const isDone = step.kind === 'script' ? scriptDone : editDone
        // Due from the posts still open: scripts before their first edit deadline, edits by the last one.
        const open = items.filter((item) => !isDone(item))
        const edits = (open.length ? open : items).map((item) => item.deadlineEdit).filter(Boolean).sort()
        if (edits.length) planned = step.kind === 'script' ? addDaysIso(edits[0], -params.scriptLeadDays) : edits[edits.length - 1]
        const finished = items.length - open.length
        if (items.length && finished === items.length) done = '*'
        detail = postsLabel(step.posts) + ' · ' + (items.length ? finished + ' / ' + items.length + (step.kind === 'script' ? ' script xong' : ' đã dựng') : 'chưa có bài trong Content Plan')
        break
      }
      case 'publish': {
        const perWeek = step.perWeek ?? [params.postsPerWeekMin, params.postsPerWeekMax]
        const published = items.filter(isPublished)
        const target = step.posts ? items.length : postTarget(cycle, quota)
        const start = projected ? '' : ruleDue
        pace = { start, published: published.length, target, expected: expectedPublished(start, target, perWeek[0], today), perWeek }
        if (target && published.length >= target) done = published.map((item) => item.postDate).sort().pop() || today
        detail = published.length + ' / ' + target + ' bài · ' + perWeek[0] + '–' + perWeek[1] + ' bài/tuần'
        break
      }
      case 'custom':
        done = step.doneAt ?? ''
        break
    }

    // Posting lasts as many weeks as the target needs at the upper cadence.
    const baseDue = pace ? addDaysIso(ruleDue, Math.max(1, Math.ceil(pace.target / Math.max(1, pace.perWeek[1]))) * 7 - 1) : ruleDue
    const due = step.dueOverride || planned || baseDue
    const isProjected = projected && !step.dueOverride && !planned
    // Content-based steps have no completion date of their own: count them done on time (or today).
    if (done === '*') done = due < today ? due : today
    if (step.skipped) done = ''

    let state: MilestoneState
    if (step.skipped) state = 'skipped'
    else if (done) state = stateOf(due, done, today)
    else if (isProjected) state = 'waiting'
    else if (pace) state = pace.expected > pace.published || today > due ? 'late' : today === due ? 'due' : 'upcoming'
    else state = stateOf(due, '', today)

    const rule = anchorText(step, nameOf)
    if (isProjected) detail = 'Dự kiến · ' + rule + (detail ? ' · ' + detail : '')
    else if (!detail) detail = step.kind === 'shoot' ? 'Chưa chốt lịch · ' + rule : rule
    if (pace && pace.expected > pace.published) detail += ' · chậm ' + (pace.expected - pace.published) + ' bài so với nhịp'
    const last = step.log[step.log.length - 1]
    if ((step.dueOverride || step.skipped) && last) detail += ' · ' + last.text

    results.set(step.id, { name: step.name, due, done: step.skipped ? due : done, approvedAt: step.skipped ? due : approvedAt })
    list.push({ key: step.id, kind: step.kind, label: step.name, owner: step.owner, due, baseDue, moved: Boolean(step.dueOverride), projected: isProjected, done, state, detail, pace })
  }

  // Closing: once every step is delivered; the target end date only warns.
  const open = list.filter((item) => !item.done && item.state !== 'skipped')
  const end: Milestone = {
    key: 'end',
    kind: 'end',
    label: 'Chốt chu kỳ ' + cycle.no,
    owner: 'Account',
    due: cycle.plannedEnd,
    baseDue: cycle.plannedEnd,
    moved: false,
    projected: false,
    done: cycle.actualEnd,
    state: stateOf(cycle.plannedEnd, cycle.actualEnd, today),
    detail: cycle.actualEnd ? 'Đã chốt ' + shortDate(cycle.actualEnd) : open.length ? 'Còn ' + open.length + ' bước · mục tiêu ' + shortDate(cycle.plannedEnd) : 'Đã xong mọi bước — sẵn sàng chốt',
  }
  if (!cycle.actualEnd && !open.length && list.length) end.state = today > cycle.plannedEnd ? 'late' : 'due'
  else if (end.state === 'upcoming' && diffDays(today, cycle.plannedEnd) <= params.cycleEndWarningDays) end.state = 'due'
  list.push(end)
  return list
}

/** True once every step of the cycle is delivered or skipped. */
export function readyToClose(cycle: Cycle, quota: PackageQuota, params: SopParams, today = TODAY): boolean {
  const steps = cycleMilestones(cycle, quota, params, today).filter((item) => item.kind !== 'end')
  return steps.length > 0 && steps.every((item) => item.done || item.state === 'skipped')
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

/** `overdue`: unpaid overdue amount on the project's contract; it turns an on-track project into "Cần theo dõi". */
export function projectHealth(project: Project, params: SopParams, today = TODAY, overdue = 0): Health {
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
  if (overdue > 0 && !due.length) {
    return { level: 'watch', label: 'Cần theo dõi', reason: 'Công nợ quá hạn ' + overdue.toLocaleString('vi-VN') + 'đ', tone: 'waiting' }
  }
  if (due.length || project.risk) {
    return { level: 'watch', label: 'Cần theo dõi', reason: due.length ? due[0].label + ' đến hạn ' + shortDate(due[0].due) : 'Gắn cờ: ' + (project.riskReason || 'Account cần theo dõi.'), tone: 'waiting' }
  }
  return { level: 'ok', label: 'Đúng tiến độ', reason: 'Không có mốc trễ trong chu kỳ ' + cycle.no + '.', tone: 'ok' }
}

export interface NextAction {
  key: string
  kind: StepKind | 'end'
  label: string
  due: string
  state: MilestoneState
  detail: string
}

/** Open milestones of the running cycle, most urgent first. */
export function nextActions(project: Project, params: SopParams, today = TODAY): NextAction[] {
  const cycle = runningCycle(project)
  if (!cycle || project.state !== 'active') return []
  const open = cycleMilestones(cycle, project.quota, params, today).filter((item) => !item.done && item.state !== 'skipped')
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
