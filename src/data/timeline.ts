import type { PackageQuota, ServicePackage, SopParams, StepKind, StepOwner, TimelineStep, TimelineStepTemplate } from '../store/types'

interface KindMeta {
  label: string
  owner: StepOwner
  /** The customer approves this step; later steps may wait for the approval. */
  approval?: boolean
  /** Covers a range of posts of the Content Plan. */
  posts?: boolean
}

/** Step types offered in the template editor. */
export const STEP_KINDS: Record<StepKind, KindMeta> = {
  kickoff: { label: 'T0 khởi động', owner: 'Account' },
  plan: { label: 'Content Plan', owner: 'Planner/Content', approval: true },
  shootingPlan: { label: 'Shooting Plan', owner: 'Planner/Content' },
  shoot: { label: 'Shooting', owner: 'Media' },
  demo: { label: 'Post Demo', owner: 'Media', approval: true },
  script: { label: 'Script', owner: 'Planner/Content', posts: true },
  edit: { label: 'Edit post', owner: 'Media', posts: true },
  publish: { label: 'Bắt đầu đăng', owner: 'Account', posts: true },
  custom: { label: 'Mốc khác', owner: 'Account' },
}

export const STEP_OWNERS: StepOwner[] = ['Account', 'Planner/Content', 'Media', 'Khách']

/** SOP cadence is 2–3 posts/week for 12 posts a month; bigger packages post more often to fit ~4 weeks. */
export function cadenceFor(posts: number, params: SopParams): [number, number] {
  const max = Math.max(params.postsPerWeekMax, Math.ceil(posts / 4))
  return [Math.max(params.postsPerWeekMin, max - 1), max]
}

/** Anchors that are not steps: cycle start and the cycle's first shooting. */
export const VIRTUAL_ANCHORS: Record<string, string> = { T0: 'T0 (bắt đầu chu kỳ)', shoot: 'Buổi shoot đầu tiên' }

/**
 * The 5 milestones of the SOP: T0 → Content Plan (T0 + 3 ngày LV) → Shooting Plan (khách duyệt
 * Plan + 1 ngày) → Post Demo (shoot + 1 ngày LV) → bắt đầu đăng đều (khách duyệt Demo). Script
 * batches and the weekly cadence are rules checked inside the posting period, not milestones.
 */
export function defaultTimeline(quota: PackageQuota, params: SopParams): TimelineStepTemplate[] {
  if (!quota.posts && !quota.plans && !quota.shoots) return []
  const steps: TimelineStepTemplate[] = [
    { id: 't0', kind: 'kickoff', name: 'T0 khởi động', owner: 'Account', anchor: { after: 'T0', event: 'done', offset: 0, unit: 'd' } },
  ]
  const approved = quota.plans ? { after: 'plan', event: 'approved' as const } : { after: 't0', event: 'done' as const }
  if (quota.plans) steps.push({ id: 'plan', kind: 'plan', name: 'Gửi Content Plan', owner: 'Planner/Content', anchor: { after: 't0', event: 'done', offset: params.planLeadBusinessDays, unit: 'bd' } })
  if (quota.shoots) {
    steps.push({ id: 'shootingPlan', kind: 'shootingPlan', name: 'Gửi Shooting Plan', owner: 'Planner/Content', anchor: { ...approved, offset: params.shootingPlanAfterApprovalDays, unit: 'd' } })
    if (quota.posts) steps.push({ id: 'demo', kind: 'demo', name: 'Gửi Post Demo', owner: 'Media', anchor: { after: 'shoot', event: 'done', offset: params.postDemoAfterShootBusinessDays, unit: 'bd' } })
  }
  if (quota.posts) {
    steps.push({
      id: 'publish',
      kind: 'publish',
      name: 'Bắt đầu đăng',
      owner: 'Account',
      perWeek: cadenceFor(quota.posts, params),
      anchor: quota.shoots ? { after: 'demo', event: 'approved', offset: 0, unit: 'd' } : { ...approved, offset: 0, unit: 'd' },
    })
  }
  return steps
}

/** The package's template, or the SOP default when the package has none yet. */
export function timelineFor(pkg: ServicePackage | undefined, quota: PackageQuota, params: SopParams): TimelineStepTemplate[] {
  return pkg?.timeline?.length ? pkg.timeline : defaultTimeline(quota, params)
}

/** Copy a template into a cycle. */
export function instantiateTimeline(template: TimelineStepTemplate[]): TimelineStep[] {
  return template.map((step) => ({ ...structuredClone(step), log: [] }))
}

/** "bài 1–6", "bài 7 → hết". */
export function postsLabel(range?: [number, number]): string {
  if (!range) return 'tất cả bài'
  return range[1] ? 'bài ' + range[0] + '–' + range[1] : 'bài ' + range[0] + ' → hết (gồm bài tặng)'
}
