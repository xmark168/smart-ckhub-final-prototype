import { contentTiming } from './content'
import { canWriteBrief, postPhase, visibleToPost } from './contentWorkflow'
import { canEditProject, inScope } from './scope'
import type { ContentItem, Cycle, Project, Role } from '../store/types'

export interface ContentPackage {
  project: Project; cycle: Cycle; items: ContentItem[]
  planned: number; core: number; bonus: number; cancelled: number
  published: number; review: number; late: number; missing: number; summaryOnly: boolean
}

/** A package is an existing service cycle, not a new copy of its content. */
export function contentPackages(projects: Project[], role: Role, account: string): ContentPackage[] {
  return projects.filter((project) => inScope(role, account, project)).flatMap((project) => project.cycles.flatMap((cycle) => {
    const items = cycle.contents.filter((item) => visibleToPost(role, account, project, item))
    if (role === 'partner' ? !items.length : !project.quota.posts && !items.length && !cycle.result?.planned) return []
    const summaryOnly = role !== 'partner' && Boolean(cycle.result && !cycle.contents.length)
    const active = items.filter((item) => item.stage !== 'Đã hủy')
    const core = active.filter((item) => !item.bonus).length
    const planned = cycle.result?.planned ?? project.quota.posts
    return [{ project, cycle, items, planned, core,
      bonus: active.filter((item) => item.bonus).length,
      cancelled: items.filter((item) => item.stage === 'Đã hủy').length,
      published: role !== 'partner' && cycle.result ? cycle.result.published : active.filter((item) => item.stage === 'Đã đăng' && !item.bonus).length,
      review: active.filter((item) => item.stage !== 'Đã đăng' && ['content-review', 'client-review'].includes(postPhase(item))).length,
      late: active.filter((item) => item.stage !== 'Đã đăng' && contentTiming(item) === 'Trễ hạn').length,
      missing: role === 'partner' || cycle.status === 'closed' ? 0 : Math.max(0, planned - core), summaryOnly,
    }]
  })).sort((a, b) => Number(b.cycle.status === 'running' && b.project.state === 'active') - Number(a.cycle.status === 'running' && a.project.state === 'active') || b.cycle.start.localeCompare(a.cycle.start) || a.project.code.localeCompare(b.project.code) || b.cycle.no - a.cycle.no)
}

export type BriefCell = 'title' | 'mainIdea' | 'category' | 'format'

/** Recheck live grants and workflow when a cell loses focus, not only when it renders. */
export function editBriefCell(project: Project, cycleNo: number, itemId: string, key: BriefCell, value: string, role: Role, account: string) {
  const item = project.cycles.find((cycle) => cycle.no === cycleNo)?.contents.find((entry) => entry.id === itemId)
  if (!item || !canWriteBrief(role, account, project, cycleNo, item)) throw new Error('Bài đã gửi duyệt, chu kỳ đã chốt hoặc quyền sửa đã thay đổi.')
  const next = value.trim()
  if (key === 'title' && !next) throw new Error('Tên bài không được trống.')
  if (key === 'format' && !['Video', 'Ảnh', 'Album'].includes(next)) throw new Error('Định dạng bài không hợp lệ.')
  Object.assign(item, { [key]: next })
}

export function duplicateContent(project: Project, cycleNo: number, itemId: string, role: Role, account: string): string {
  const cycle = project.cycles.find((entry) => entry.no === cycleNo)
  const source = cycle?.contents.find((item) => item.id === itemId)
  if (!source || !cycle || project.state !== 'active' || cycle.status !== 'running' || !canEditProject(role, account, project)) throw new Error('Không có quyền thêm bài vào chu kỳ này.')
  const copy: ContentItem = {
    ...structuredClone(source), id: 'content-' + crypto.randomUUID(), stt: Math.max(0, ...cycle.contents.map((item) => item.stt)) + 1,
    title: source.title + ' (bản sao)', stage: 'Ý tưởng', carried: false,
    bonus: cycle.contents.filter((item) => !item.bonus && item.stage !== 'Đã hủy').length >= project.quota.posts,
    assignees: { content: [], media: [] }, workflow: { phase: 'draft', revision: 1, history: [] },
    postDate: '', publishedAt: undefined, cancellation: undefined, deadlineScript: '', deadlineEdit: '', mediaLink: '', sourceLink: '',
    channels: source.channels.map((channel) => ({ platform: channel.platform, status: 'Chưa lên lịch', time: '', link: '', postDate: '' })),
    planSections: source.planSections?.map((section) => ({ ...section, id: crypto.randomUUID() })),
  }
  cycle.contents.push(copy)
  cycle.activity.unshift({ title: 'Nhân bản bài #' + source.stt, detail: copy.title, time: 'Vừa xong' })
  return copy.id
}
