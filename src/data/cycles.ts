import { periodEndIso } from '../lib/format'
import type { ContentItem, ContentStage, Cycle, Project, ServicePackage, SopParams, TimelineStepTemplate } from '../store/types'
import { instantiateTimeline, timelineFor } from './timeline'

/** A fresh running cycle with its own copy of the package timeline. */
export function newCycle(no: number, start: string, params: SopParams, template: TimelineStepTemplate[]): Cycle {
  return {
    no,
    start,
    plannedEnd: periodEndIso(start, params.cycleMonths),
    actualEnd: '',
    status: 'running',
    timeline: instantiateTimeline(template, no),
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

/** Next cycle of a project, with the timeline of the project's current package. */
export function projectCycle(project: Project, no: number, start: string, params: SopParams, packages: ServicePackage[]): Cycle {
  const pkg = packages.find((item) => item.id === project.servicePackageId)
  return newCycle(no, start, params, timelineFor(pkg, project.quota, params))
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
