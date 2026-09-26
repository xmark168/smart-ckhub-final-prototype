import { useApp } from '../../../app/context'
import { sortShoots } from '../../../data/shootings'
import { shortDate } from '../../../lib/format'
import { cycleMilestones, runningCycle } from '../../../lib/sop'
import { useData } from '../../../store/store'
import type { Project } from '../../../store/types'
import { KeyNoteModal } from '../ContentModals'
import { ShootingModal } from '../CycleModals'
import { statusTone } from '../projectLogic'

/** Shoots of the project: this cycle's slots (one per shoot in the package) and the ones already done. */
export function ShootsTab({ project }: { project: Project }) {
  const quota = project.quota
  const cycle = runningCycle(project)
  if (!quota.shoots) return <section className="panel"><p className="empty-copy">Gói {project.service} không có buổi shoot.</p></section>

  const past = project.cycles
    .filter((item) => item !== cycle)
    .flatMap((item) => sortShoots(item.shootings).map((shooting) => ({ cycleNo: item.no, shooting })))
    .reverse()

  return (
    <>
      {cycle && project.state !== 'stopped' ? (
        <CurrentShoots project={project} />
      ) : (
        <section className="panel"><p className="empty-copy">{project.state === 'draft' ? 'Lên lịch shoot sau khi bắt đầu triển khai.' : 'Không có chu kỳ đang chạy.'}</p></section>
      )}
      {past.length > 0 && (
        <section className="panel cw-past">
          <div className="panel-head"><h2>Các buổi đã qua</h2></div>
          {past.map(({ cycleNo, shooting }) => (
            <div className="cw-shoot" key={shooting.id}>
              <span>
                <b>{shooting.date ? shortDate(shooting.date) : 'Chưa chốt'} · chu kỳ {cycleNo}</b>
                <small>{[shooting.location, shooting.media.join(', ')].filter(Boolean).join(' · ')}</small>
              </span>
              <span className={'pill ' + statusTone(shooting.status)}>{shooting.status}</span>
              <span />
            </div>
          ))}
        </section>
      )}
    </>
  )

}

/** This cycle: one row per shoot of the package, with its Shooting Plan. */
function CurrentShoots({ project }: { project: Project }) {
  const { showModal, toast } = useApp()
  const { params } = useData()
  const quota = project.quota
  const running = runningCycle(project)!
  const steps = cycleMilestones(running, quota, params)
  const planSteps = steps.filter((item) => item.kind === 'shootingPlan')
  const shoots = sortShoots(running.shootings)
  const locked = quota.plans > 0 && running.plan.status !== 'approved'
  const create = () => (locked ? toast('Cần khách duyệt Content Plan trước khi tạo lịch shooting.') : showModal(<ShootingModal project={project} />))
  return (
    <section className="panel cw-steps">
      <div className="panel-head cw-head">
        <h2>Chu kỳ {running.no} · {running.shootings.length} / {quota.shoots} buổi{running.shootings.length > quota.shoots ? ' · vượt gói' : ''}</h2>
        <button className="text-btn" aria-disabled={locked} onClick={create}>+ Lịch shooting</button>
      </div>
      {locked && <p className="cw-step-meta">Lên lịch sau khi khách duyệt Content Plan.</p>}
      {Array.from({ length: Math.max(quota.shoots, shoots.length) }, (_, index) => {
        const shooting = shoots[index]
        const plan = planSteps[index]
        const planText = shooting?.plan.sentAt
          ? 'Shooting Plan gửi ' + shortDate(shooting.plan.sentAt) + (plan?.detail.startsWith('Gửi trước') ? ' · ' + plan.detail.toLowerCase() : '')
          : plan ? 'Shooting Plan hạn ' + (plan.projected ? '~' : '') + shortDate(plan.due) : ''
        return (
          <div className={'cw-shoot' + (shooting ? '' : ' is-empty')} key={shooting?.id ?? 'slot-' + index}>
            <span>
              <b>Buổi {index + 1} · {shooting?.date ? shortDate(shooting.date) + (shooting.time ? ' · ' + shooting.time : '') : 'chưa chốt ngày'}</b>
              {shooting && <small>{[shooting.location, shooting.media.join(', ')].filter(Boolean).join(' · ') || 'Chưa có địa điểm, Media'}</small>}
              {planText && <small className={plan && plan.state === 'late' ? 'is-late' : ''}>{planText}</small>}
              {shooting?.checklist && <small>Checklist: {shooting.checklist}</small>}
            </span>
            {shooting ? <span className={'pill ' + statusTone(shooting.status)}>{shooting.status}</span> : <span />}
            <span className="row-actions">
              {shooting ? (
                <>
                  <button className="text-btn" onClick={() => showModal(<ShootingModal project={project} shooting={shooting} />)}>Sửa</button>
                  {shooting.status === 'Đã hoàn thành' && (
                    <button className="text-btn" onClick={() => showModal(<KeyNoteModal project={project} type="Shooting recap" preset={'Recap shoot ' + shortDate(shooting.date) + ': '} />)}>Recap</button>
                  )}
                </>
              ) : !locked && <button className="text-btn" onClick={create}>Lên lịch</button>}
            </span>
          </div>
        )
      })}
    </section>
  )
}
