import { paymentMetrics } from '../data/contracts'
import { diffDays, shortDate, TODAY } from '../lib/format'
import { inScope } from '../lib/scope'
import { projectHealth } from '../lib/sop'
import type { AppData, Role } from '../store/types'
import type { ProjectTab, ScreenId } from './context'
import { MEDIA_PEOPLE } from '../screens/projects/projectLogic'

export interface Alert {
  key: string
  title: string
  text: string
  target: { screen: ScreenId } | { projectId: string; tab?: ProjectTab }
}

const when = (due: string) => {
  const days = diffDays(TODAY, due)
  return days < 0 ? 'quá ' + -days + ' ngày' : days === 0 ? 'hôm nay' : shortDate(due)
}

/** What needs this person now: their overdue / due-today work, plus role-specific risks. */
export function alertsFor(data: AppData, role: Role, account: string): Alert[] {
  const byId = new Map(data.projects.map((project) => [project.id, project]))
  const mine = (id: string) => {
    const project = byId.get(id)
    return Boolean(project && inScope(role, account, project))
  }
  const person = role === 'accountant' ? 'Kế toán' : role === 'partner' ? (MEDIA_PEOPLE.includes(account) ? account : MEDIA_PEOPLE[0]) : account
  const list: Alert[] = []
  if (role !== 'admin' && role !== 'bods') {
    data.tasks
      .filter((task) => task.status === 'open' && task.due <= TODAY && task.assignee.split(',').map((item) => item.trim()).includes(person) && (role !== 'account' || mine(task.projectId)))
      .sort((a, b) => a.due.localeCompare(b.due))
      .forEach((task) => list.push({ key: task.id, title: task.title, text: (byId.get(task.projectId)?.customer ?? '') + ' · ' + when(task.due), target: role === 'account' ? { projectId: task.projectId, tab: task.tab } : { screen: role === 'partner' ? 'partnerWork' : 'tasks' } }))
  }
  if (role === 'account') {
    for (const row of data.contracts) {
      const overdue = row.status === 'Hiệu lực' && mine(row.projectId) ? paymentMetrics(row).overdue : 0
      if (overdue) list.push({ key: 'debt:' + row.id, title: 'Công nợ quá hạn · ' + row.customer, text: row.code + ' · nhắc khách thanh toán', target: { projectId: row.projectId, tab: 'hop-dong' } })
    }
  }
  if (role === 'bods') {
    for (const project of data.projects.filter((item) => item.state === 'active')) {
      const health = projectHealth(project, data.params)
      if (health.level === 'late') list.push({ key: 'late:' + project.id, title: project.customer + ' chậm tiến độ', text: project.owner + ' · ' + health.reason, target: { projectId: project.id } })
    }
  }
  return list
}
