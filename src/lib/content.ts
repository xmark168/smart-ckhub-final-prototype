import type { ContentItem } from '../store/types'
import { TODAY } from './format'
import { isPublished } from './sop'

export type ContentTiming = 'Đúng hạn' | 'Trễ hạn' | 'Hủy bài' | 'Chưa đến hạn' | 'Đến hạn' | 'Chưa có hạn' | 'Chưa có ngày thực tế'

/** Compare actual publication with planned date; pending posts become late after their planned date. */
export function contentTiming(item: ContentItem, today = TODAY): ContentTiming {
  if (item.stage === 'Đã hủy') return 'Hủy bài'
  if (isPublished(item)) {
    if (!item.postDate) return 'Chưa có hạn'
    if (!item.publishedAt) return 'Chưa có ngày thực tế'
    return item.publishedAt > item.postDate ? 'Trễ hạn' : 'Đúng hạn'
  }
  const due = item.postDate
  if (!due) return 'Chưa có hạn'
  return due < today ? 'Trễ hạn' : due === today ? 'Đến hạn' : 'Chưa đến hạn'
}
