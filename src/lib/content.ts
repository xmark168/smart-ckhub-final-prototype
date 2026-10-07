import type { ContentItem } from '../store/types'
import { TODAY } from './format'
import { isPublished } from './sop'

export type ContentTiming = 'Đúng hạn' | 'Trễ hạn' | 'Hủy bài' | 'Chưa đến hạn' | 'Đến hạn' | 'Chưa có hạn' | 'Chưa có ngày thực tế'

/** Compare actual publication with planned date; pending posts become late after their planned date. */
export function contentTiming(item: ContentItem, today = TODAY): ContentTiming {
  if (item.stage === 'Đã hủy') return 'Hủy bài'
  const channels = item.channels ?? []
  if (channels.length && item.workflow) {
    if (channels.some((channel) => channel.postDate && (channel.status === 'Đã đăng' ? channel.publishedAt && channel.publishedAt > channel.postDate : channel.postDate < today))) return 'Trễ hạn'
    if (channels.some((channel) => !channel.postDate)) return 'Chưa có hạn'
    if (isPublished(item)) return channels.every((channel) => channel.publishedAt) ? 'Đúng hạn' : 'Chưa có ngày thực tế'
    if (channels.some((channel) => channel.status !== 'Đã đăng' && channel.postDate === today)) return 'Đến hạn'
    return 'Chưa đến hạn'
  }
  if (isPublished(item)) {
    if (!item.postDate) return 'Chưa có hạn'
    if (!item.publishedAt) return 'Chưa có ngày thực tế'
    return item.publishedAt > item.postDate ? 'Trễ hạn' : 'Đúng hạn'
  }
  const due = item.postDate
  if (!due) return 'Chưa có hạn'
  return due < today ? 'Trễ hạn' : due === today ? 'Đến hạn' : 'Chưa đến hạn'
}

/** Use post-specific work assignments; never infer an editor from the shooting crew. */
export function contentAssignees(tasks: import('../store/types').WorkTask[], projectId: string, cycleNo: number, itemId: string, item?: ContentItem) {
  const source = `${projectId}:c${cycleNo}:${itemId}:`
  const assigned = (kind: string) => tasks.find((task) => task.projectId === projectId && task.source === source + kind)?.assignee.trim() || 'Chưa phân công'
  return { content: item?.assignees ? item.assignees.content.join(', ') || 'Chưa phân công' : assigned('script'), media: item?.assignees ? item.assignees.media.join(', ') || 'Chưa phân công' : assigned('edit') }
}
