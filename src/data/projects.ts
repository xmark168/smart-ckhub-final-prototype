import { addBusinessDaysIso, addDaysIso, parseInput, periodEndIso, TODAY, toIso } from '../lib/format'
import type { ContentItem, ContentStage, Cycle, PackageQuota, Project, ProjectState, ServicePackage } from '../store/types'
import { comTamTaiProject } from './comTamTai'
import { channelsFor } from './cycles'
import { customerIdAt, customerRows, extraCustomer } from './customers'

export { COM_TAM_TAI_ID } from './comTamTai'

/** Media, Planner/Content names used across the 2026 progress sheet. */
const MEDIA = ['Hải', 'Hân', 'Bình', 'Phước', 'Anh Thư']
const PLANNERS = ['Thương', 'Minh', 'Linh']
const CATEGORIES = ['Chia sẻ', 'Review', 'Thông báo', 'Mini-game']

/** yyyy-mm-dd only if it is not in the future — seeds never record events after TODAY. */
function past(iso: string): string {
  return iso && iso <= TODAY ? iso : ''
}

function monthsBefore(iso: string, months: number): string {
  const date = parseInput(iso)
  return toIso(new Date(date.getFullYear(), date.getMonth() - months, date.getDate()))
}

/** Running cycle with realistic SOP progress relative to TODAY. */
function workCycle(no: number, start: string, quota: PackageQuota, index: number, risk: boolean, owner: string, media: string): Cycle {
  const plannedEnd = periodEndIso(start, 1)
  const changes = index % 7 === 0
  const sentAt = past(addBusinessDaysIso(start, 3 + (risk ? 2 : 0)))
  const approvedAt = sentAt && !changes ? past(addDaysIso(sentAt, 1)) : ''
  const shootingPlanSent = approvedAt && quota.shoots ? past(addDaysIso(approvedAt, 1 + (risk ? 2 : 0))) : ''
  const shootDate = shootingPlanSent ? addDaysIso(approvedAt, 4) : ''
  const shootDone = past(shootDate)
  const demoSent = shootDone ? past(addBusinessDaysIso(shootDone, 1)) : ''
  const demoApproved = demoSent ? past(addDaysIso(demoSent, 1)) : ''
  const cadenceStart = quota.shoots ? demoApproved : approvedAt

  const contents: ContentItem[] = []
  if (quota.plans && sentAt) {
    const firstPost = cadenceStart ? addDaysIso(cadenceStart, 1) : ''
    for (let i = 0; i < quota.posts; i++) {
      const postDate = firstPost ? addDaysIso(firstPost, Math.round(i * 2.4)) : ''
      const isPast = Boolean(postDate) && postDate <= TODAY
      // Risky projects leave the last two due posts unpublished.
      const lagging = risk && isPast && postDate > addDaysIso(TODAY, -6)
      const stage: ContentStage = isPast && !lagging ? 'Đã đăng' : lagging ? 'Chờ khách duyệt' : postDate && postDate <= addDaysIso(TODAY, 4) ? 'Dựng' : i < 6 ? 'Script' : 'Ý tưởng'
      contents.push({
        id: 'content-' + index + '-' + no + '-' + (i + 1),
        stt: i + 1,
        bonus: false,
        postDate,
        deadlineScript: postDate ? addDaysIso(postDate, -3) : '',
        deadlineEdit: postDate ? addDaysIso(postDate, -1) : '',
        mission: i < quota.brandPosts ? 'Thương hiệu' : 'Bán hàng',
        category: CATEGORIES[i % CATEGORIES.length],
        topic: i < quota.brandPosts ? 'Thương hiệu' : 'Bán hàng',
        title: 'Nội dung ' + String(i + 1).padStart(2, '0'),
        format: i % 4 === 3 ? 'Ảnh' : 'Video',
        stage,
        mediaLink: '',
        channels: channelsFor(stage),
      })
    }
  }

  return {
    no,
    start,
    plannedEnd,
    actualEnd: '',
    status: 'running',
    plan: {
      status: approvedAt ? 'approved' : changes && sentAt ? 'changes' : sentAt ? 'sent' : 'draft',
      link: '',
      sentAt,
      approvedAt,
      feedback: changes && sentAt ? 'Cần điều chỉnh ưu tiên nội dung tuần đầu.' : '',
    },
    shootingPlan: { sentAt: shootingPlanSent, link: '' },
    shootings: shootDate
      ? [{ id: 'shoot-' + index + '-' + no, date: shootDate, time: '09:00–13:00', location: 'Tại quán', media: [media], status: shootDone ? 'Đã hoàn thành' : 'Đã xác nhận', checklist: '' }]
      : [],
    demo: { status: demoApproved ? 'Đã duyệt' : demoSent ? 'Đã gửi' : 'Chưa gửi', link: '', sentAt: demoSent, approvedAt: demoApproved },
    contents,
    tasks: [
      { id: 'plan', name: 'Hoàn thiện Content Plan', owner, deadline: addBusinessDaysIso(start, 3).split('-').reverse().join('.'), status: sentAt ? 'Đã hoàn thành' : 'Việc cần làm', type: 'Plan' },
    ],
    exceptions: [],
    activity: [{ title: 'Chu kỳ ' + no + ' được tạo', detail: 'T0 ' + start.split('-').reverse().join('.'), time: start.split('-').reverse().join('.') }],
  }
}

function closedCycle(no: number, start: string, quota: PackageQuota): Cycle {
  const plannedEnd = periodEndIso(start, 1)
  const late = no % 3 === 0
  return {
    no,
    start,
    plannedEnd,
    actualEnd: late ? addDaysIso(plannedEnd, 2) : plannedEnd,
    status: 'closed',
    result: { published: Math.max(0, quota.posts - (late ? 1 : 0)), planned: quota.posts, note: late ? 'Chốt trễ 2 ngày, bù 1 bài.' : 'Đủ đầu ra.' },
    plan: { status: 'approved', link: '', sentAt: '', approvedAt: '', feedback: '' },
    shootingPlan: { sentAt: '', link: '' },
    shootings: [],
    demo: { status: 'Đã duyệt', link: '', sentAt: '', approvedAt: '' },
    contents: [],
    tasks: [],
    exceptions: [],
    activity: [],
  }
}

/** Thèm Nướng (Hiền): demo of a customer waiting for the Cổng khởi động. */
const DEMO_DRAFT_INDEX = 51

export function seedProjects(packages: ServicePackage[]): Project[] {
  const active = packages.filter((item) => item.status === 'Đang áp dụng')
  const records: Project[] = [...customerRows, extraCustomer].map(([customer, owner, area], index) => {
    const state: ProjectState = index === 20 ? 'stopped' : index % 13 === 0 || index === DEMO_DRAFT_INDEX ? 'draft' : index % 11 === 0 ? 'pending' : 'active'
    const draft = state === 'draft'
    const risk = state === 'active' && index % 6 === 0
    const current = (index % 6) + 1
    const total = Math.max(current, index % 4 === 0 ? 3 : 6)
    const service = active[index % active.length]
    const quota = { ...service.quota }
    const media = MEDIA[index % MEDIA.length]
    const plannedEnd = ['2026-09-23', '2026-09-29', '2026-09-30', '2026-10-01'][index % 4]
    const endDate = parseInput(plannedEnd)
    const currentStart = toIso(new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate() + 1))
    const cycles: Cycle[] = []
    if (!draft) {
      for (let no = 1; no < current; no++) cycles.push(closedCycle(no, monthsBefore(currentStart, current - no), quota))
      if (state === 'stopped') cycles.push(closedCycle(current, currentStart, quota))
      else cycles.push(workCycle(current, currentStart, quota, index, risk, owner, media))
    }
    return {
      id: 'project-' + (index + 1),
      code: 'DA-2026-' + String(index + 1).padStart(3, '0'),
      customerId: customerIdAt(index),
      customer,
      owner,
      createdBy: owner,
      area,
      service: service.group + ' · ' + service.name,
      servicePackageId: service.id,
      serviceScope: service.scope,
      servicePrice: service.price,
      quota,
      contractCode: draft ? '' : 'HĐ-2026-' + String(index + 1).padStart(3, '0'),
      total: draft ? 0 : total,
      state,
      risk,
      pause: state === 'pending' ? { reason: 'Khách tạm ngưng vận hành để sửa quán.', returnDate: '2026-10-15' } : undefined,
      stop: state === 'stopped' ? { reason: 'Khách dừng hợp tác sau chu kỳ tháng 8.', date: '2026-08-31' } : undefined,
      cycles,
      team: { account: owner, planner: quota.plans ? PLANNERS[index % PLANNERS.length] : '', media: quota.shoots ? [media] : [], ads: quota.posts ? 'Team Ads' : '' },
      links: { folder: '', contentPlan: '', contentPost: '', keyNotes: '' },
      notes: '',
      keyNotes: [],
      activities: draft
        ? [{ icon: 'file-plus-2', title: 'Dự án nháp đã tạo', detail: 'Chờ Account bắt đầu triển khai và tạo chu kỳ 1.' }]
        : [
            { icon: 'calendar-check-2', title: 'Account đã rà soát tiến độ chu kỳ', detail: 'Chu kỳ ' + current + ' / ' + total },
            { icon: 'package-check', title: 'Gói dịch vụ đã áp dụng', detail: service.group + ' · ' + service.name },
          ],
    }
  })
  records.unshift(comTamTaiProject())
  return records
}
