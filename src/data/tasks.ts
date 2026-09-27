import { addDaysIso, TODAY } from '../lib/format'
import { cycleMilestones, editDone, isPublished, runningCycle, scriptDone } from '../lib/sop'
import type { AppData, Project, StepOwner, WorkTask } from '../store/types'
import { primaryContract } from './contracts'

/**
 * Work generated from the data: SOP milestones, posts, shoots, money, launch gates. Each has a
 * stable `source` key; `syncTasks` stores them as tasks so they can be given to someone other
 * than the Account, and keeps them in step with the source (new → open, source done → done,
 * source gone → cancelled). Assignee and note set by people are never overwritten.
 */
interface Expected {
  source: string
  projectId: string
  title: string
  role: WorkTask['role']
  assignee: string
  due: string
  done: boolean
  tab: WorkTask['tab']
}

const DEFAULT_ASSIGNEE: Record<StepOwner, (project: Project) => string> = {
  Account: (project) => project.owner,
  'Planner/Content': () => 'Content nội bộ',
  Media: () => '',
  Khách: (project) => project.owner,
}

function projectWork(project: Project, data: AppData): Expected[] {
  const list: Expected[] = []
  const add = (item: Omit<Expected, 'projectId'>) => list.push({ projectId: project.id, ...item })
  const key = (rest: string) => project.id + ':' + rest

  // Launch gates of a draft project.
  if (project.state === 'draft') {
    const contract = primaryContract(data.contracts, project.id)
    add({ source: key('gate:contract'), title: 'Tạo hợp đồng chính', role: 'Account', assignee: project.owner, due: TODAY, done: Boolean(contract), tab: 'hop-dong' })
    if (contract) {
      const first = contract.payments[0]
      add({ source: key('gate:deposit'), title: 'Ghi nhận tiền cọc (đợt 1)', role: 'Kế toán', assignee: 'Kế toán', due: first?.due || TODAY, done: Boolean(project.onboarding?.financeVerified), tab: 'hop-dong' })
    }
    if (data.params.requireBriefBeforeT0) add({ source: key('gate:brief'), title: 'Thu đủ brief khách hàng', role: 'Account', assignee: project.owner, due: TODAY, done: Boolean(project.onboarding?.briefReady), tab: 'tong-quan' })
    return list
  }

  // Money: every unpaid installment of a running contract is Kế toán's to collect.
  for (const contract of data.contracts.filter((row) => row.projectId === project.id && row.status === 'Hiệu lực')) {
    for (const payment of contract.payments) {
      add({ source: 'pay:' + contract.id + ':' + payment.installment, title: 'Thu đợt ' + payment.installment + ' · ' + contract.code, role: 'Kế toán', assignee: 'Kế toán', due: payment.due, done: payment.paid >= payment.amount, tab: 'hop-dong' })
    }
  }

  const cycle = runningCycle(project)
  if (!cycle || project.state !== 'active') return list
  const c = 'c' + cycle.no + ':'

  // SOP milestones of the running cycle (the posting start is covered by the post tasks).
  for (const step of cycleMilestones(cycle, project.quota, data.params)) {
    if (step.kind === 'kickoff' || step.kind === 'publish') continue
    if (step.state === 'skipped') continue
    const template = cycle.timeline.find((item) => item.id === step.key)
    const owner = (template?.owner ?? 'Account') as StepOwner
    add({
      source: key(c + step.key),
      title: step.label,
      role: step.kind === 'end' ? 'Account' : owner,
      assignee: step.kind === 'end' ? project.owner : DEFAULT_ASSIGNEE[owner](project),
      due: step.due,
      done: Boolean(step.done),
      tab: step.kind === 'shootingPlan' || step.kind === 'shoot' ? 'quay-chup' : 'tong-quan',
    })
  }

  // Per post: Content writes the script, Media edits, Account publishes.
  const shootMedia = cycle.shootings.flatMap((shoot) => shoot.media)
  for (const item of cycle.contents) {
    const name = 'bài ' + item.stt
    if (item.deadlineScript) add({ source: key(c + item.id + ':script'), title: 'Script ' + name, role: 'Planner/Content', assignee: 'Content nội bộ', due: item.deadlineScript, done: scriptDone(item), tab: 'noi-dung' })
    if (item.deadlineEdit) add({ source: key(c + item.id + ':edit'), title: 'Dựng ' + name, role: 'Media', assignee: [...new Set(shootMedia)].join(', '), due: item.deadlineEdit, done: editDone(item), tab: 'noi-dung' })
    if (item.postDate) add({ source: key(c + item.id + ':post'), title: 'Gửi duyệt và đăng ' + name, role: 'Account', assignee: project.owner, due: item.postDate, done: isPublished(item), tab: 'noi-dung' })
  }
  return list
}

/** Bring the stored tasks in line with the data. Mutates `data.tasks`. */
export function syncTasks(data: AppData): void {
  const expected = data.projects.filter((project) => project.state !== 'stopped').flatMap((project) => projectWork(project, data))
  const bySource = new Map(expected.map((item) => [item.source, item]))
  const stored = new Map(data.tasks.filter((task) => task.source).map((task) => [task.source!, task]))

  for (const task of data.tasks) {
    if (!task.source) continue
    const item = bySource.get(task.source)
    if (!item) {
      if (task.status === 'open') Object.assign(task, { status: 'cancelled', doneAt: TODAY })
      continue
    }
    task.title = item.title
    task.due = item.due
    task.tab = item.tab
    if (item.done && task.status !== 'done') Object.assign(task, { status: 'done', doneAt: TODAY })
    else if (!item.done && task.status !== 'open') Object.assign(task, { status: 'open', doneAt: undefined })
  }
  for (const item of expected) {
    if (stored.has(item.source) || item.done) continue
    data.tasks.push({ id: 'task-' + item.source, source: item.source, projectId: item.projectId, title: item.title, role: item.role, assignee: item.assignee, due: item.due, status: 'open', tab: item.tab })
  }
  // Keep the store small: drop generated tasks closed more than 30 days ago.
  const cutoff = addDaysIso(TODAY, -30)
  data.tasks = data.tasks.filter((task) => !(task.source && task.status !== 'open' && task.doneAt && task.doneAt < cutoff))
}
