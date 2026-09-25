import { periodEndIso } from '../lib/format'
import type { ContentItem, ContentStage, Cycle, SopParams } from '../store/types'

/** A fresh running cycle; the SOP milestones are computed from its start date. */
export function newCycle(no: number, start: string, params: SopParams): Cycle {
  return {
    no,
    start,
    plannedEnd: periodEndIso(start, params.cycleMonths),
    actualEnd: '',
    status: 'running',
    plan: { status: 'draft', link: '', sentAt: '', approvedAt: '', feedback: '' },
    shootingPlan: { sentAt: '', link: '' },
    shootings: [],
    demo: { status: 'Chưa gửi', link: '', sentAt: '', approvedAt: '' },
    contents: [],
    tasks: [],
    exceptions: [],
    activity: [{ title: 'Chu kỳ ' + no + ' được tạo', detail: 'T0 ' + start.split('-').reverse().join('.'), time: 'Vừa xong' }],
  }
}

/** Channel statuses that follow the item's stage. */
export function channelsFor(stage: ContentStage, platforms: Array<'Facebook' | 'TikTok'> = ['Facebook', 'TikTok']): ContentItem['channels'] {
  return platforms.map((platform) => ({
    platform,
    status: stage === 'Đã đăng' ? 'Đã đăng' : stage === 'Lên lịch' ? 'Đã lên lịch' : 'Chưa lên lịch',
    time: stage === 'Đã đăng' || stage === 'Lên lịch' ? '17:00' : '',
    link: '',
  }))
}
