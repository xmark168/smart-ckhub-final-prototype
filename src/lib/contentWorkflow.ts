import type { AppData, ContentItem, ContentChannel, Project, Role } from '../store/types'
import { TODAY } from './format'
import { canEditProject, inScope, projectGrant, sessionName } from './scope'

export const PHASE_LABEL = { draft: 'Đang viết', 'content-review': 'Chờ Account duyệt nội dung', production: 'Đang sản xuất', 'client-review': 'Chờ khách duyệt', approved: 'Đã duyệt bản cuối' }
const names = (value: string) => value.split(',').map((name) => name.trim()).filter(Boolean)

/** Migrate before task cleanup. Missing assignments stay empty; no inferred shooting crew. */
export function normalizeContentData(data: AppData) {
  for (const project of data.projects) for (const cycle of project.cycles) for (const item of cycle.contents) {
    if (!item.assignees) {
      const source = `${project.id}:c${cycle.no}:${item.id}:`
      item.assignees = { content: names(data.tasks.find((task) => task.source === source + 'script')?.assignee ?? ''), media: names(data.tasks.find((task) => task.source === source + 'edit')?.assignee ?? '') }
    }
    item.channels.forEach((channel) => {
      channel.postDate ??= item.postDate
      if (channel.status === 'Đã đăng') channel.publishedAt ??= item.publishedAt
    })
  }
}

export function canWorkOnPost(role: Role, account: string, project: Project, cycleNo: number, item: ContentItem, kind: 'content' | 'media' | 'manage') {
  if (project.state !== 'active' || project.cycles.find((cycle) => cycle.no === cycleNo)?.status !== 'running' || item.stage === 'Đã hủy') return false
  if (canEditProject(role, account, project)) return true
  return kind !== 'manage' && role === 'partner' && projectGrant(role, account, project)?.access === 'edit' && Boolean(item.assignees?.[kind].includes(sessionName(role, account)))
}

export function canWriteBrief(role: Role, account: string, project: Project, cycleNo: number, item: ContentItem) {
  return canWorkOnPost(role, account, project, cycleNo, item, 'content') && postPhase(item) === 'draft' && item.stage !== 'Đã đăng'
}

export function postPhase(item: ContentItem): ContentWorkflowPhase {
  return item.workflow?.phase ?? (['Đã đăng', 'Lên lịch'].includes(item.stage) ? 'approved' : item.stage === 'Chờ khách duyệt' ? 'client-review' : item.stage === 'Dựng' ? 'production' : 'draft')
}
type ContentWorkflowPhase = NonNullable<ContentItem['workflow']>['phase']
export function canRecordPublication(item: ContentItem) {
  return item.workflow && !item.workflow.legacy ? item.workflow.phase === 'approved' : ['Lên lịch', 'Đã đăng'].includes(item.stage)
}

export function briefSnapshot(item: ContentItem) {
  return JSON.stringify({ title: item.title, mission: item.mission, category: item.category, format: item.format, mainIdea: item.mainIdea, contentDirection: item.contentDirection, visualDirection: item.visualDirection, planSections: item.planSections, planLabels: item.planLabels, planHidden: item.planHidden, documentLink: item.documentLink, sourceLink: item.sourceLink, mediaLink: item.mediaLink, assignees: item.assignees, channels: item.channels, postDate: item.postDate, publishedAt: item.publishedAt })
}

export function logContent(item: ContentItem, by: string, action: string, note = '', at = new Date().toISOString()) {
  item.workflow ??= { revision: 1, phase: postPhase(item), history: [], legacy: true }
  item.workflow.history.unshift({ id: crypto.randomUUID(), at, by, action, note, revision: item.workflow.revision, snapshot: briefSnapshot(item) })
}

export type PostAction = 'submit-content' | 'approve-content' | 'request-content' | 'submit-media' | 'approve-client' | 'request-media' | 'revise'
export function transitionPost(item: ContentItem, action: PostAction, by: string, note = '', date = TODAY) {
  const phase = postPhase(item)
  if (item.stage === 'Đã hủy' || item.stage === 'Đã đăng') throw new Error('Bài đã đăng hoặc đã hủy chỉ xem lịch sử.')
  if (action === 'submit-content') {
    if (phase !== 'draft' || ![item.mainIdea, item.contentDirection, item.visualDirection, ...(item.planSections?.map((section) => section.body) ?? [])].some((text) => text?.trim())) throw new Error('Nhập nội dung trước khi gửi duyệt.')
    logContent(item, by, 'Gửi duyệt nội dung', note); item.workflow!.phase = 'content-review'; item.stage = 'Script'
  } else if (action === 'approve-content') {
    if (phase !== 'content-review') throw new Error('Bài chưa gửi duyệt nội dung.')
    logContent(item, by, 'Duyệt nội dung', note); item.workflow!.phase = 'production'; item.stage = 'Dựng'
  } else if (action === 'request-content') {
    if (phase !== 'content-review' || !note.trim()) throw new Error('Nhập phản hồi yêu cầu sửa nội dung.')
    logContent(item, by, 'Yêu cầu sửa nội dung', note); item.workflow!.revision += 1; item.workflow!.phase = 'draft'; item.stage = 'Script'
  } else if (action === 'submit-media') {
    if (phase !== 'production' || !safeLink(item.mediaLink)) throw new Error('Cần link bản dựng / thiết kế trước khi gửi duyệt.')
    logContent(item, by, 'Gửi bản sản xuất', note); item.workflow!.phase = 'client-review'; item.stage = 'Chờ khách duyệt'
  } else if (action === 'approve-client') {
    if (phase !== 'client-review' || !validDate(date) || date > TODAY) throw new Error('Ngày khách duyệt không hợp lệ hoặc vượt hôm nay.')
    logContent(item, by, 'Ghi nhận khách duyệt', `Ngày duyệt: ${date}${note ? ' · ' + note : ''}`); item.workflow!.phase = 'approved'
  } else if (action === 'request-media') {
    if (phase !== 'client-review' || !note.trim()) throw new Error('Nhập phản hồi cần sửa bản sản xuất.')
    logContent(item, by, 'Khách yêu cầu sửa', note); item.workflow!.revision += 1; item.workflow!.phase = 'production'; item.stage = 'Dựng'
  } else {
    if (phase === 'draft' || item.channels.some((channel) => channel.status === 'Đã đăng')) throw new Error('Không tạo bản sửa khi đang viết hoặc đã xuất bản một kênh.')
    logContent(item, by, 'Lưu bản trước khi sửa', note); item.workflow!.revision += 1; item.workflow!.phase = 'draft'; item.stage = 'Script'
    item.channels = item.channels.map((channel) => ({ ...channel, status: 'Chưa lên lịch', publishedAt: undefined }))
  }
  delete item.workflow!.legacy
}

export function safeLink(value: string) {
  try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false }
}
export function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value }

/** One row per committed channel. Never manufacture actual dates or change the planned date. */
export function setPublication(item: ContentItem, channels: ContentChannel[], by: string) {
  if (!canRecordPublication(item) && channels.some((channel) => channel.status !== 'Chưa lên lịch')) throw new Error('Cần ghi nhận khách duyệt bản cuối trước khi lên lịch / đăng.')
  if (!channels.length) throw new Error('Chọn ít nhất một kênh xuất bản.')
  for (const channel of channels) {
    if (channel.postDate && !validDate(channel.postDate)) throw new Error('Ngày dự kiến không hợp lệ.')
    if (channel.status !== 'Chưa lên lịch' && (!validDate(channel.postDate ?? '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(channel.time))) throw new Error('Nhập ngày và giờ dự kiến cho ' + channel.platform + '.')
    if (channel.status === 'Đã đăng' && (!validDate(channel.publishedAt ?? '') || channel.publishedAt! > TODAY || !safeLink(channel.link))) throw new Error('Nhập ngày thực tế không vượt hôm nay và link bài ' + channel.platform + '.')
    if (channel.link && !safeLink(channel.link)) throw new Error('Link bài phải bắt đầu bằng http:// hoặc https://.')
  }
  if (new Set(channels.map((channel) => channel.platform)).size !== channels.length) throw new Error('Không chọn lặp kênh xuất bản.')
  if (item.channels.some((old) => old.status === 'Đã đăng' && channels.find((entry) => entry.platform === old.platform)?.status !== 'Đã đăng')) throw new Error('Giữ các kênh đã đăng; không xóa hoặc chuyển về chưa đăng.')
  // Legacy published rows without evidence must be confirmed, never silently downgraded.
  const allPublished = channels.every((channel) => channel.status === 'Đã đăng')
  if (item.stage === 'Đã đăng' && !allPublished) throw new Error('Không chuyển bài đã đăng về trạng thái chưa đăng.')
  const changed = JSON.stringify(channels) !== JSON.stringify(item.channels)
  if (!changed) return
  const datesChanged = item.channels.some((old) => old.postDate && channels.find((entry) => entry.platform === old.platform)?.postDate !== old.postDate)
  if (datesChanged) logContent(item, by, 'Điều chỉnh lịch đăng', 'Lịch cũ: ' + item.channels.map((channel) => `${channel.platform}: ${channel.postDate || item.postDate || '—'}`).join(' · '))
  item.channels = channels.map((channel) => ({ ...channel, publishedAt: channel.status === 'Đã đăng' ? channel.publishedAt : undefined }))
  const planned = channels.map((channel) => channel.postDate).filter((date): date is string => Boolean(date)).sort()
  item.postDate = planned[0] ?? item.postDate
  item.publishedAt = allPublished ? channels.map((channel) => channel.publishedAt!).sort().at(-1) : undefined
  item.stage = allPublished ? 'Đã đăng' : channels.some((channel) => channel.status !== 'Chưa lên lịch') ? 'Lên lịch' : canRecordPublication(item) ? 'Chờ khách duyệt' : item.stage
  logContent(item, by, 'Cập nhật xuất bản', channels.map((channel) => `${channel.platform}: ${channel.status}${channel.publishedAt ? ' · ' + channel.publishedAt : ''}`).join(' · '))
}

export function postNextStep(item: ContentItem) {
  if (item.stage === 'Đã hủy') return 'Đã hủy'
  if (item.stage === 'Đã đăng') return 'Đã xuất bản'
  if (item.stage === 'Lên lịch') return `Chờ xuất bản · ${item.channels.filter((channel) => channel.status === 'Đã đăng').length}/${item.channels.length} kênh đã đăng`
  if (item.workflow && !item.workflow.legacy) return PHASE_LABEL[item.workflow.phase]
  return item.stage
}

export function assignmentOptions(project: Project) {
  return [...new Set((project.members ?? []).filter((member) => member.role === 'partner' || member.role === 'account').map((member) => member.name))]
}

export function visibleToPost(role: Role, account: string, project: Project, item: ContentItem) {
  return inScope(role, account, project) && (role !== 'partner' || Boolean(item.assignees?.content.includes(sessionName(role, account)) || item.assignees?.media.includes(sessionName(role, account))))
}
