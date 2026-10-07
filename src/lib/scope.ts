import type { AppData, Customer, Project, ProjectMember, Role } from '../store/types'
import { PARTNER_PEOPLE } from './people'

export function sessionName(role: Role, account: string): string {
  if (role === 'accountant') return 'Kế toán'
  if (role === 'bods') return 'BODs'
  if (role === 'admin') return 'Administrator'
  if (role === 'partner') return PARTNER_PEOPLE.includes(account) ? account : PARTNER_PEOPLE[0]
  return account
}

export function projectGrant(role: Role, account: string, project: Pick<Project, 'members'>): ProjectMember | undefined {
  return project.members?.find((member) => member.role === role && member.name === sessionName(role, account))
}

/** Explicit membership governs projects; customer ownership stays separate. */
export function inScope(role: Role, account: string, record: { owner: string; createdBy?: string; members?: ProjectMember[] }): boolean {
  if (record.members !== undefined) return role === 'admin' || Boolean(projectGrant(role, account, record))
  return role !== 'account' || record.owner === account || record.createdBy === account
}

export function canEditProject(role: string, account: string, project: Project): boolean {
  if (role !== 'account') return false
  if (project.members !== undefined) return projectGrant('account', account, project)?.access === 'edit'
  return project.owner === account || project.createdBy === account
}

export function customerInScope(role: Role, account: string, customer: Customer, projects: Project[]): boolean {
  if (role === 'admin') return true
  if (role === 'account' && inScope(role, account, customer)) return true
  return projects.some((project) => project.customerId === customer.id && inScope(role, account, project))
}

export function canManageProjectAccess(role: Role, account: string, project: Project): boolean {
  return role === 'admin' || (role === 'account' && project.owner === account && canEditProject(role, account, project))
}

/** One-time migration of legacy permissions. Never regenerate revoked or empty grant lists. */
export function initializeProjectMembers(data: AppData): void {
  for (const project of data.projects) {
    if (project.members !== undefined) continue
    const members: ProjectMember[] = [...new Set([project.owner, project.createdBy].filter(Boolean))].map((name) => ({ name, role: 'account', access: 'edit' }))
    // Preserve former company-wide read/finance access on existing projects only.
    members.push({ name: 'BODs', role: 'bods', access: 'view' }, { name: 'Kế toán', role: 'accountant', access: 'view' })
    const names = new Set(project.cycles.flatMap((cycle) => cycle.shootings.flatMap((shoot) => shoot.media)))
    data.tasks.filter((task) => task.projectId === project.id).forEach((task) => {
      task.assignee.split(',').map((name) => name.trim()).filter((name) => PARTNER_PEOPLE.includes(name)).forEach((name) => names.add(name))
    })
    names.forEach((name) => members.push({ name, role: 'partner', access: 'view' }))
    project.members = members
  }
}
