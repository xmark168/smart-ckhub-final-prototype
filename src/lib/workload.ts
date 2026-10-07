import type { WorkTask } from '../store/types'
import { addDaysIso, TODAY } from './format'

export type WorkloadDepartment = 'Creative' | 'Plan'

/** Counts come from tasks; completed people remain visible with zero open work. */
export function workloadRows(tasks: WorkTask[], department: WorkloadDepartment, today = TODAY) {
  const relevant = tasks.filter((task) => task.role === department || (department === 'Plan' && task.role === 'Planner/Content'))
  const people = (task: WorkTask) => [...new Set(task.assignee.split(',').map((name) => name.trim()).filter(Boolean))]
  const byPerson = new Map<string, WorkTask[]>()
  for (const task of relevant) {
    const names = people(task)
    for (const name of names.length ? names : ['Chưa phân công']) {
      const own = byPerson.get(name) ?? []
      own.push(task)
      byPerson.set(name, own)
    }
  }
  return [...byPerson].map(([name, own]) => {
    const open = own.filter((task) => task.status === 'open')
    const dueWithin = (days: number) => open.filter((task) => task.due >= today && task.due <= addDaysIso(today, days)).length
    return {
      name,
      week: dueWithin(7),
      month: dueWithin(30),
      tasks: open.length,
      late: open.filter((task) => Boolean(task.due) && task.due < today).length,
      projects: new Set(open.map((task) => task.projectId)).size,
    }
  }).sort((a, b) => b.week - a.week || b.tasks - a.tasks || a.name.localeCompare(b.name, 'vi'))
}
