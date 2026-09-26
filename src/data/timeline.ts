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
  plan: { label: 'Content Plan', owner: 'Planner/Content', approval: true },
  shootingPlan: { label: 'Shooting Plan', owner: 'Planner/Content' },
  shoot: { label: 'Shooting', owner: 'Media' },
  demo: { label: 'Post Demo', owner: 'Media', approval: true },
  script: { label: 'Script', owner: 'Planner/Content', posts: true },
  edit: { label: 'Edit post', owner: 'Media', posts: true },
  publish: { label: 'Đăng bài', owner: 'Account', posts: true },
  custom: { label: 'Mốc khác', owner: 'Account' },
}

export const STEP_OWNERS: StepOwner[] = ['Account', 'Planner/Content', 'Media', 'Khách']

/** SOP cadence is 2–3 posts/week for 12 posts a month; bigger packages post more often to fit ~4 weeks. */
export function cadenceFor(posts: number, params: SopParams): [number, number] {
  const max = Math.max(params.postsPerWeekMax, Math.ceil(posts / 4))
  return [Math.max(params.postsPerWeekMin, max - 1), max]
}

/**
 * The SOP timeline for a package quota: Content Plan → Shooting Plan → Shoot → Post Demo →
 * script / edit in batches of `scriptBatchSize` → posting at the weekly cadence. Packages with
 * two shoots get the second shoot before the second edit batch.
 */
export function defaultTimeline(quota: PackageQuota, params: SopParams): TimelineStepTemplate[] {
  const steps: TimelineStepTemplate[] = []
  if (!quota.posts && !quota.plans && !quota.shoots) return steps
  const approved = quota.plans ? { after: 'plan', event: 'approved' as const } : { after: 'T0', event: 'done' as const }

  if (quota.plans) steps.push({ id: 'plan', kind: 'plan', name: 'Gửi Content Plan', owner: 'Planner/Content', anchor: { after: 'T0', event: 'done', offset: params.planLeadBusinessDays, unit: 'bd' } })
  if (quota.shoots) {
    steps.push({ id: 'shootingPlan', kind: 'shootingPlan', name: 'Gửi Shooting Plan', owner: 'Planner/Content', anchor: { ...approved, offset: params.shootingPlanAfterApprovalDays, unit: 'd' } })
    steps.push({ id: 'shoot-1', kind: 'shoot', name: quota.shoots > 1 ? 'Shoot lần 1' : 'Shoot', owner: 'Media', shootNo: 1, anchor: { after: 'shootingPlan', event: 'done', offset: 3, unit: 'd' } })
    if (quota.posts) steps.push({ id: 'demo', kind: 'demo', name: 'Gửi Post Demo', owner: 'Media', anchor: { after: 'shoot-1', event: 'done', offset: params.postDemoAfterShootBusinessDays, unit: 'bd' } })
  }

  const addShoot = (no: number) =>
    steps.push({ id: 'shoot-' + no, kind: 'shoot', name: 'Shoot lần ' + no, owner: 'Media', shootNo: no, anchor: { after: 'shoot-' + (no - 1), event: 'done', offset: 14, unit: 'd' } })

  if (quota.posts) {
    const size = Math.max(1, params.scriptBatchSize)
    const batches = Math.ceil(quota.posts / size)
    for (let batch = 1; batch <= batches; batch++) {
      const from = (batch - 1) * size + 1
      const to = batch === batches ? 0 : batch * size
      steps.push({
        id: 'script-' + batch,
        kind: 'script',
        name: 'Script lô ' + batch,
        owner: 'Planner/Content',
        posts: [from, to],
        anchor: batch === 1 ? { ...approved, offset: 2, unit: 'd' } : { after: 'script-' + (batch - 1), event: 'done', offset: 7, unit: 'd' },
      })
      // A batch shot in its own session is edited after that shoot, otherwise after its scripts.
      const ownShoot = batch >= 2 && batch <= quota.shoots
      if (ownShoot) addShoot(batch)
      steps.push({
        id: 'edit-' + batch,
        kind: 'edit',
        name: 'Edit lô ' + batch,
        owner: 'Media',
        posts: [from, to],
        anchor: ownShoot ? { after: 'shoot-' + batch, event: 'done', offset: params.scriptLeadDays, unit: 'd' } : { after: 'script-' + batch, event: 'done', offset: params.scriptLeadDays, unit: 'd' },
      })
    }
    for (let no = batches + 1; no <= quota.shoots; no++) addShoot(no)
    steps.push({
      id: 'publish',
      kind: 'publish',
      name: 'Đăng bài',
      owner: 'Account',
      perWeek: cadenceFor(quota.posts, params),
      anchor: quota.shoots ? { after: 'demo', event: 'approved', offset: 1, unit: 'd' } : { ...approved, offset: 3, unit: 'd' },
    })
  } else {
    for (let no = 2; no <= quota.shoots; no++) addShoot(no)
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
