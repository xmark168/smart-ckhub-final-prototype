import { useApp } from '../../../app/context'
import { shortDate } from '../../../lib/format'
import { Icon } from '../../../lib/icons'
import { cycleMilestones, cycleProgress, MILESTONE_LABEL, MILESTONE_TONE, runningCycle, type MilestoneState } from '../../../lib/sop'
import { useData } from '../../../store/store'
import type { Cycle, Project } from '../../../store/types'
import { KeyNoteModal } from '../ContentModals'
import { CycleTaskModal, DemoModal, ExceptionModal, PlanModal, ShootingModal, ShootingPlanModal } from '../CycleModals'
import { planLabel, resolveException, statusTone } from '../projectLogic'
import { useProjectActions } from '../useProjectActions'

/** Short outcome for the history row; the full note stays in the tooltip. */
function resultLabel(cycle: Cycle, progress: { published: number; planned: number }, state: MilestoneState): string {
  if (cycle.status === 'running') return MILESTONE_LABEL[state]
  if (!progress.planned) return 'Đã chốt'
  const missing = progress.planned - progress.published
  return missing > 0 ? 'Thiếu ' + missing + (cycle.result?.note.includes('bù') ? ' · bù' : '') : 'Đủ bài'
}

function resultTone(cycle: Cycle, progress: { published: number; planned: number }, state: MilestoneState): string {
  if (cycle.status === 'running') return MILESTONE_TONE[state]
  return progress.published >= progress.planned ? 'ok' : 'waiting'
}

function History({ project }: { project: Project }) {
  const { params } = useData()
  const rows = [...project.cycles].reverse()
  const future = Math.max(0, project.total - project.cycles.length)
  return (
    <section className="panel project-cycle-table cycle-history">
      <div className="project-cycle-table-head"><span>Chu kỳ</span><span>Dự kiến</span><span>Thực tế</span><span>Bài đăng</span><span>Kết quả</span></div>
      {rows.map((cycle) => {
        const progress = cycleProgress(cycle, project.quota)
        const end = cycleMilestones(cycle, project.quota, params).find((item) => item.key === 'end')!
        return (
          <div className="project-cycle-row" key={cycle.no}>
            <b>{cycle.no} / {project.total || '–'}</b>
            <span>{shortDate(cycle.start)} – {shortDate(cycle.plannedEnd)}</span>
            <span className="cycle-actual">{cycle.actualEnd ? 'chốt ' + shortDate(cycle.actualEnd) : cycle.status === 'running' ? 'Đang chạy' : '—'}</span>
            <span>{project.quota.posts ? progress.published + ' / ' + progress.planned + (progress.bonus ? ' (+' + progress.bonus + ')' : '') : '—'}</span>
            <span className={'pill ' + resultTone(cycle, progress, end.state)} title={cycle.result?.note}>
              {resultLabel(cycle, progress, end.state)}
            </span>
          </div>
        )
      })}
      {future > 0 && <p className="project-tab-note">Còn {future} chu kỳ theo hợp đồng chưa bắt đầu. Chu kỳ kế tiếp được mở khi Account chốt chu kỳ hiện tại.</p>}
      {!project.cycles.length && <p className="project-tab-note">Chưa có chu kỳ. Chu kỳ 1 được tạo khi bắt đầu triển khai.</p>}
    </section>
  )
}

function Workspace({ project, cycle }: { project: Project; cycle: Cycle }) {
  const { showModal, toast } = useApp()
  const { params } = useData()
  const actions = useProjectActions(project)
  const quota = project.quota
  const planText = planLabel(cycle.plan.status)
  const shootingLocked = cycle.plan.status !== 'approved'
  const openExceptions = cycle.exceptions.filter((item) => !item.resolved)
  const completedTasks = cycle.tasks.filter((task) => task.status === 'Đã hoàn thành').length
  const steps = cycleMilestones(cycle, quota, params)
  const stepOf = (kind: string) => steps.find((item) => item.kind === kind)
  const due = (kind: string, fallback: string) => {
    const item = stepOf(kind)
    if (!item) return fallback
    // Done: only the approval note is worth repeating; open: due date and the rule behind it.
    if (item.done) return 'Xong ' + shortDate(item.done) + (item.kind === 'plan' || item.kind === 'demo' ? ' · ' + item.detail : '')
    return 'Hạn ' + (item.projected ? 'dự kiến ' : '') + shortDate(item.due) + ' · ' + item.detail.replace(/^Dự kiến · /, '')
  }

  return (
    <div className="cycle-layout">
      <main>
        {quota.plans > 0 && (
          <section className="panel cycle-panel">
            <div className="panel-head">
              <div><h2>Content Plan</h2><p className="subline">{due('plan', 'Không có bước Content Plan trong timeline.')}</p></div>
              <span className={'cycle-status ' + statusTone(planText)}>{planText}</span>
            </div>
            <dl className="cycle-definition">
              <div><dt>Đã gửi</dt><dd>{cycle.plan.sentAt ? shortDate(cycle.plan.sentAt) : 'Chưa gửi'}</dd></div>
              <div><dt>Đã duyệt</dt><dd>{cycle.plan.approvedAt ? shortDate(cycle.plan.approvedAt) : 'Chưa duyệt'}</dd></div>
              <div><dt>Link</dt><dd>{cycle.plan.link ? <a href={cycle.plan.link} target="_blank" rel="noreferrer">Mở</a> : '—'}</dd></div>
            </dl>
            {cycle.plan.feedback && <p className="cycle-note">{cycle.plan.feedback}</p>}
            <button className="text-btn" onClick={() => showModal(<PlanModal project={project} />)}>Cập nhật Content Plan</button>
          </section>
        )}

        <section className="panel cycle-panel">
          <div className="panel-head">
            <div><h2>Công việc chu kỳ</h2><p className="subline">Owner và deadline là điều kiện để bắt đầu.</p></div>
            <button className="text-btn" onClick={() => showModal(<CycleTaskModal project={project} />)}>+ Công việc</button>
          </div>
          <div className="cycle-task-list">
            {cycle.tasks.map((task) => (
              <button className="cycle-task" key={task.id} onClick={() => showModal(<CycleTaskModal project={project} task={task} />)}>
                <span><b>{task.name}</b><small>{task.owner || 'Chưa giao'} · {task.deadline || 'Chưa có hạn'}</small></span>
                <em className={'cycle-status ' + statusTone(task.status)}>{task.status}</em>
              </button>
            ))}
            {!cycle.tasks.length && <p className="empty-copy">Chưa có công việc. Script và dựng theo dõi ở tab Nội dung.</p>}
          </div>
          <div className="cycle-foot">Hoàn thành <b>{completedTasks} / {cycle.tasks.length}</b> công việc</div>
        </section>

        <section className="panel cycle-panel">
          <div className="panel-head"><div><h2>Nhật ký chu kỳ</h2><p className="subline">Dấu vết thay đổi mốc và đầu ra.</p></div></div>
          <div className="cycle-log">
            {cycle.activity.slice(0, 6).map((log, index) => (
              <div key={index}><Icon name="clock-3" /><span><b>{log.title}</b><small>{log.detail} · {log.time}</small></span></div>
            ))}
          </div>
        </section>
      </main>

      <aside>
        {quota.shoots > 0 && (
          <section className="panel cycle-panel">
            <div className="panel-head">
              <div>
                <h2>Shooting</h2>
                <p className="subline">Shooting Plan: {due('shootingPlan', 'không có trong timeline')}</p>
              </div>
              <span className={'cycle-status ' + (shootingLocked ? 'muted' : 'info')}>{shootingLocked ? 'Đang khóa' : cycle.shootings.length + ' / ' + quota.shoots + ' buổi'}</span>
            </div>
            <p className="cycle-meta">
              Shooting Plan: {cycle.shootingPlan.sentAt ? 'đã gửi ' + shortDate(cycle.shootingPlan.sentAt) : 'chưa gửi'}{' '}
              {!shootingLocked && <button className="text-btn" onClick={() => showModal(<ShootingPlanModal project={project} />)}>{cycle.shootingPlan.sentAt ? 'Sửa' : 'Ghi nhận đã gửi'}</button>}
            </p>
            <div className="cycle-compact-list">
              {cycle.shootings.map((shooting) => (
                <div key={shooting.id}>
                  <b>{shortDate(shooting.date)} · {shooting.time || 'chưa chốt giờ'} <span className={'pill ' + statusTone(shooting.status)}>{shooting.status}</span></b>
                  <small>{shooting.location || 'Chưa có địa điểm'} · {shooting.media.join(', ') || 'Chưa có Media'}</small>
                  <span className="row-actions">
                    <button className="text-btn" onClick={() => showModal(<ShootingModal project={project} shooting={shooting} />)}>Sửa</button>
                    {shooting.status === 'Đã hoàn thành' && (
                      <button className="text-btn" onClick={() => showModal(<KeyNoteModal project={project} type="Shooting recap" preset={'Recap shoot ' + shortDate(shooting.date) + ': '} />)}>Ghi recap</button>
                    )}
                  </span>
                </div>
              ))}
              {!cycle.shootings.length && <p className="empty-copy">{shootingLocked ? 'Cần khách duyệt Content Plan trước khi lên lịch shoot.' : 'Chưa có lịch shooting trong chu kỳ.'}</p>}
            </div>
            <button
              className="text-btn"
              aria-disabled={shootingLocked}
              onClick={() => (shootingLocked ? toast('Cần khách duyệt Content Plan trước khi tạo lịch shooting.') : showModal(<ShootingModal project={project} />))}
            >
              + Lịch shooting
            </button>
          </section>
        )}

        {quota.shoots > 0 && quota.posts > 0 && (
          <section className="panel cycle-panel">
            <div className="panel-head">
              <div><h2>Post Demo</h2><p className="subline">{due('demo', 'Không có bước Post Demo trong timeline.')}</p></div>
              <span className={'cycle-status ' + statusTone(cycle.demo.status)}>{cycle.demo.status}</span>
            </div>
            <p className="cycle-meta">Đã gửi: {cycle.demo.sentAt ? shortDate(cycle.demo.sentAt) : 'Chưa gửi'} · Đã duyệt: {cycle.demo.approvedAt ? shortDate(cycle.demo.approvedAt) : 'Chưa duyệt'}</p>
            <button className="text-btn" onClick={() => showModal(<DemoModal project={project} />)}>Cập nhật Post Demo</button>
          </section>
        )}

        <section className="panel cycle-panel">
          <div className="panel-head">
            <h2>Ngoại lệ</h2>
            <button className="text-btn" onClick={() => showModal(<ExceptionModal project={project} />)}>+ Ghi nhận</button>
          </div>
          <div className="cycle-compact-list">
            {openExceptions.map((exception) => (
              <div key={exception.id}>
                <b>{exception.type}</b><small>{exception.reason}</small>
                <button className="text-btn" onClick={() => resolveException(project.id, exception.id)}>Đã xử lý</button>
              </div>
            ))}
            {!openExceptions.length && <p className="empty-copy">Không có ngoại lệ đang mở.</p>}
          </div>
        </section>

        <section className="panel cycle-panel">
          <div className="panel-head"><div><h2>Chốt chu kỳ {cycle.no}</h2><p className="subline">{stepOf('end')?.detail}</p></div></div>
          <button className="primary" onClick={actions.closeCycle}><Icon name="calendar-check-2" /> Chốt chu kỳ</button>
        </section>
      </aside>
    </div>
  )
}

export function CyclesTab({ project }: { project: Project }) {
  const cycle = runningCycle(project)
  return (
    <>
      <History project={project} />
      {cycle && project.state !== 'stopped' ? (
        <>
          <div className="project-tab-heading cycle-work-heading"><div><h2>Chu kỳ {cycle.no} đang chạy</h2><p>{shortDate(cycle.start)} – {shortDate(cycle.plannedEnd)}{project.state === 'pending' ? ' · dự án đang tạm dừng' : ''}</p></div></div>
          <Workspace project={project} cycle={cycle} />
        </>
      ) : null}
    </>
  )
}
