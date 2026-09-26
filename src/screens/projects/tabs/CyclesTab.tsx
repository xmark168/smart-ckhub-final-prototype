import type { ReactNode } from 'react'
import { useApp } from '../../../app/context'
import { shortDate } from '../../../lib/format'
import { cycleMilestones, cycleProgress, MILESTONE_LABEL, MILESTONE_TONE, runningCycle, type Milestone } from '../../../lib/sop'
import { useData } from '../../../store/store'
import type { Cycle, Project } from '../../../store/types'
import { KeyNoteModal } from '../ContentModals'
import { CycleTaskModal, DemoModal, PlanModal, ShootingModal, ShootingPlanModal } from '../CycleModals'
import { statusTone } from '../projectLogic'

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

function Steps({ project, cycle }: { project: Project; cycle: Cycle }) {
  const { showModal, toast } = useApp()
  const { params } = useData()
  const quota = project.quota
  const steps = cycleMilestones(cycle, quota, params)
  const stepOf = (kind: string) => steps.find((item) => item.kind === kind)
  const shootingLocked = quota.plans > 0 && cycle.plan.status !== 'approved'
  const demo = stepOf('demo')

  return (
    <section className="panel cw-steps">
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
          title="Shooting Plan"
          step={stepOf('shootingPlan')}
          meta={cycle.shootingPlan.sentAt ? 'Gửi ' + shortDate(cycle.shootingPlan.sentAt) : shootingLocked ? 'Mở sau khi khách duyệt Content Plan' : when(stepOf('shootingPlan'), '')}
          action={!shootingLocked && <button className="text-btn" onClick={() => showModal(<ShootingPlanModal project={project} />)}>{cycle.shootingPlan.sentAt ? 'Sửa' : 'Ghi nhận đã gửi'}</button>}
        />
      )}

      {quota.shoots > 0 && (
        <StepRow
          title={'Shooting · ' + cycle.shootings.length + ' / ' + quota.shoots + ' buổi'}
          meta=""
          action={
            <button
              className="text-btn"
              aria-disabled={shootingLocked}
              onClick={() => (shootingLocked ? toast('Cần khách duyệt Content Plan trước khi tạo lịch shooting.') : showModal(<ShootingModal project={project} />))}
            >
              + Lịch
            </button>
          }
        >
          {cycle.shootings.map((shooting) => (
            <div className="cw-shoot" key={shooting.id}>
              <span>
                <b>{shortDate(shooting.date)} · {shooting.time || 'chưa chốt giờ'}</b>
                <small>{[shooting.location, shooting.media.join(', ')].filter(Boolean).join(' · ')}</small>
              </span>
              <span className={'pill ' + statusTone(shooting.status)}>{shooting.status}</span>
              <span className="row-actions">
                <button className="text-btn" onClick={() => showModal(<ShootingModal project={project} shooting={shooting} />)}>Sửa</button>
                {shooting.status === 'Đã hoàn thành' && (
                  <button className="text-btn" onClick={() => showModal(<KeyNoteModal project={project} type="Shooting recap" preset={'Recap shoot ' + shortDate(shooting.date) + ': '} />)}>Recap</button>
                )}
              </span>
            </div>
          ))}
        </StepRow>
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

function SidePanels({ project, cycle }: { project: Project; cycle: Cycle }) {
  const { showModal } = useApp()
  const completed = cycle.tasks.filter((task) => task.status === 'Đã hoàn thành').length
  return (
    <aside>
      <section className="panel cycle-panel">
        <div className="panel-head">
          <h2>Công việc {cycle.tasks.length > 0 && <small className="cw-count">{completed}/{cycle.tasks.length}</small>}</h2>
          <button className="text-btn" onClick={() => showModal(<CycleTaskModal project={project} />)}>+ Công việc</button>
        </div>
        <div className="cycle-task-list">
          {cycle.tasks.map((task) => (
            <button className="cycle-task" key={task.id} onClick={() => showModal(<CycleTaskModal project={project} task={task} />)}>
              <span><b>{task.name}</b><small>{task.owner || 'Chưa giao'} · {task.deadline || 'Chưa có hạn'}</small></span>
              <em className={'cycle-status ' + statusTone(task.status)}>{task.status}</em>
            </button>
          ))}
          {!cycle.tasks.length && <p className="empty-copy">Chưa có công việc.</p>}
        </div>
      </section>

    </aside>
  )
}

/** Past and running cycles. Posts read "published / target" the same way as the header. */
function History({ project }: { project: Project }) {
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

export function CyclesTab({ project }: { project: Project }) {
  const cycle = runningCycle(project)
  const active = cycle && project.state !== 'stopped'
  return (
    <>
      {active && (
        <>
          <div className="project-tab-heading cycle-work-heading">
            <h2>Chu kỳ {cycle.no} đang chạy{project.state === 'pending' ? ' · tạm dừng' : ''}</h2>
          </div>
          <div className="cycle-layout">
            <main><Steps project={project} cycle={cycle} /></main>
            <SidePanels project={project} cycle={cycle} />
          </div>
        </>
      )}
      {!project.cycles.length && <p className="empty-copy">Chưa có chu kỳ. Chu kỳ 1 được tạo khi bắt đầu triển khai.</p>}
      <History project={project} />
    </>
  )
}
