import { useApp } from '../../app/context'
import { allShootings } from '../../data/shootings'
import { useData } from '../../store/store'
import { MEDIA_PEOPLE } from '../projects/projectLogic'

/** The Media person the Partner session acts as (picked in the user menu). */
export function usePartnerName(): string {
  const { account } = useApp()
  return MEDIA_PEOPLE.includes(account) ? account : MEDIA_PEOPLE[0]
}

const assignedTo = (assignee: string, name: string) => assignee.split(',').map((item) => item.trim()).includes(name)

/** What a Media person works on: open tasks given to them and their shoots. Nothing about money. */
export function usePartnerWork(name: string) {
  const { tasks, projects } = useData()
  const byId = new Map(projects.map((project) => [project.id, project]))
  const myTasks = tasks.filter((task) => task.status === 'open' && assignedTo(task.assignee, name) && byId.has(task.projectId)).sort((a, b) => a.due.localeCompare(b.due))
  const myShoots = allShootings(projects).filter((row) => row.shooting.media.includes(name))
  return { myTasks, myShoots, byId }
}
