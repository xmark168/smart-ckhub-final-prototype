import type { ReactNode } from 'react'
import { useApp } from '../../../app/context'
import { sortShoots } from '../../../data/shootings'
import { shortDate } from '../../../lib/format'
import { cycleMilestones, cycleProgress, MILESTONE_LABEL, MILESTONE_TONE, type Milestone } from '../../../lib/sop'
import { useData } from '../../../store/store'
import type { Cycle, Project } from '../../../store/types'
import { DemoModal, PlanModal } from '../CycleModals'
import { CycleTimeline } from './CycleTimeline'

/** "Gửi 14.08 · Duyệt 16.08", or the due date while the step is open. */
function when(step: Milestone | undefined, sent: string, approved = ''): string {
  if (sent) return 'Gửi ' + shortDate(sent) + (approved ? ' · Duyệt ' + shortDate(approved) : ' · chờ khách duyệt')
  if (!step) return ''
  return 'Hạn ' + (step.projected ? '~' : '') + shortDate(step.due)
}

/** One SOP step of the running cycle: name, state, dates on one line, one action. */
function StepRow({ title, step, meta, action, children }: { title: string; step?: Milestone; meta: string; action: ReactNode; children?: ReactNode }) {
  return (
    <div className="cw-step">
      <div className="cw-step-head">
        <b>{title}</b>
        {step && <span className={'pill ' + MILESTONE_TONE[step.state]}>{MILESTONE_LABEL[step.state]}</span>}
        <span className="cw-step-action">{action}</span>
      </div>
      {meta && <small className="cw-step-meta">{meta}</small>}
      {children}
    </div>
  )
}

export function CycleSteps({ project, cycle }: { project: Project; cycle: Cycle }) {
  const { showModal, openProject } = useApp()
  const { params } = useData()
  const quota = project.quota
  const steps = cycleMilestones(cycle, quota, params)
  const stepOf = (kind: string) => steps.find((item) => item.kind === kind)
  const demo = stepOf('demo')
  const shoots = sortShoots(cycle.shootings)
  const planSteps = steps.filter((item) => item.kind === 'shootingPlan')
  const nextShoot = shoots.find((item) => item.date && item.status !== 'Đã hoàn thành')

  return (
    <section className="panel cw-steps">
      <div className="panel-head cw-head">
        <h2>Chu kỳ {cycle.no}{project.state === 'pending' ? ' · tạm dừng' : ''}</h2>
        <span className="cw-range">{shortDate(cycle.start)} – {shortDate(cycle.plannedEnd)}</span>
      </div>
      <CycleTimeline items={steps} />
      {quota.plans > 0 && (
        <StepRow
          title="Content Plan"
          step={stepOf('plan')}
          meta={when(stepOf('plan'), cycle.plan.sentAt, cycle.plan.approvedAt)}
          action={<>
            {cycle.plan.link && <a className="text-btn" href={cycle.plan.link} target="_blank" rel="noreferrer">Mở</a>}
            <button className="text-btn" onClick={() => showModal(<PlanModal project={project} />)}>Cập nhật</button>
          </>}
        >
          {cycle.plan.feedback && <p className="cycle-note">{cycle.plan.feedback}</p>}
        </StepRow>
      )}

      {quota.shoots > 0 && (
        <StepRow
          title={'Quay chụp · ' + cycle.shootings.length + ' / ' + quota.shoots + ' buổi'}
          step={planSteps.find((item) => item.state === 'late') ?? planSteps.find((item) => !item.done) ?? planSteps[planSteps.length - 1]}
          meta={nextShoot ? 'Buổi tới ' + shortDate(nextShoot.date) + (nextShoot.media.length ? ' · ' + nextShoot.media.join(', ') : '') : cycle.shootings.length ? 'Đã quay ' + shoots.filter((item) => item.status === 'Đã hoàn thành').length + ' buổi' : 'Chưa lên lịch'}
          action={<button className="text-btn" onClick={() => openProject(project.id, 'quay-chup')}>Xem</button>}
        />
      )}

      {demo && (
        <StepRow
          title="Post Demo"
          step={demo}
          meta={when(demo, cycle.demo.sentAt, cycle.demo.approvedAt)}
          action={<button className="text-btn" onClick={() => showModal(<DemoModal project={project} />)}>Cập nhật</button>}
        />
      )}

      {!quota.plans && !quota.shoots && <p className="empty-copy">Gói không có Content Plan hay shoot.</p>}
    </section>
  )
}

/** Past and running cycles. Posts read "published / target" the same way as the header. */
export function CycleHistory({ project }: { project: Project }) {
  const { params } = useData()
  const rows = [...project.cycles].reverse()
  if (!rows.length) return null
  return (
    <section className="panel project-cycle-table cycle-history">
      <div className="panel-head"><h2>Lịch sử chu kỳ</h2></div>
      <div className="project-cycle-table-head"><span>Chu kỳ</span><span>Thời gian</span><span>Chốt</span><span>Bài đăng</span><span>Kết quả</span></div>
      {rows.map((cycle) => {
        const running = cycle.status === 'running'
        const end = running ? cycleMilestones(cycle, project.quota, params).find((item) => item.kind === 'end') : undefined
        const pace = running ? cycleMilestones(cycle, project.quota, params).find((item) => item.pace)?.pace : undefined
        const progress = cycleProgress(cycle, project.quota)
        const posts = pace ? pace.published + ' / ' + pace.target : progress.planned ? progress.published + ' / ' + progress.planned : '—'
        const missing = progress.planned - progress.published
        const label = end ? 'Đang chạy' : !progress.planned ? 'Đã chốt' : missing > 0 ? 'Thiếu ' + missing + (cycle.result?.note.includes('bù') ? ' · bù' : '') : 'Đủ bài'
        const tone = end ? MILESTONE_TONE[end.state] : missing > 0 ? 'waiting' : 'ok'
        return (
          <div className="project-cycle-row" key={cycle.no}>
            <b>{cycle.no} / {project.total || '–'}</b>
            <span>{shortDate(cycle.start)} – {shortDate(cycle.plannedEnd)}</span>
            <span className="cycle-actual">{cycle.actualEnd ? shortDate(cycle.actualEnd) : '—'}</span>
            <span>{project.quota.posts ? posts : '—'}</span>
            <span className={'pill ' + tone} title={cycle.result?.note}>{label}</span>
          </div>
        )
      })}
    </section>
  )
}
