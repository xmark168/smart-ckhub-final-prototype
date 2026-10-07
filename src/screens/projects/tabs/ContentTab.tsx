import { useState } from 'react'
import { useApp } from '../../../app/context'
import { shortDate, shortText, TODAY } from '../../../lib/format'
import { Icon } from '../../../lib/icons'
import { contentTiming } from '../../../lib/content'
import { canEditProject } from '../../../lib/scope'
import { currentCycle, isPublished, runningCycle, scriptDone, STAGES } from '../../../lib/sop'
import type { ContentStage, Project } from '../../../store/types'
import { ContentItemModal } from '../ContentModals'
import { addProjectActivity, statusTone, updateProject } from '../projectLogic'

export function ContentTab({ project }: { project: Project }) {
  const { showModal, role, account } = useApp()
  const current = currentCycle(project)
  const [cycleNo, setCycleNo] = useState(current?.no ?? 0)
  const [stage, setStage] = useState<'' | ContentStage>('')
  const cycle = project.cycles.find((item) => item.no === cycleNo) ?? current
  const editable = Boolean(cycle && cycle.status === 'running' && project.state !== 'stopped' && canEditProject(role, account, project))

  if (!project.quota.posts) {
    return <section className="panel"><p className="empty-copy">Gói {project.service} không có đầu ra bài đăng hằng tháng.</p></section>
  }
  if (!cycle) {
    return <section className="panel"><p className="empty-copy">Chưa có chu kỳ. Nội dung được lập sau khi bắt đầu triển khai.</p></section>
  }

  const changeStage = (id: string, stage: ContentStage) => {
    if (stage === 'Đã hủy') {
      const item = cycle.contents.find((entry) => entry.id === id)
      if (item) showModal(<ContentItemModal project={project} item={item} initialStage="Đã hủy" />)
      return
    }
    updateProject(project.id, (draft) => {
      const running = runningCycle(draft)
      const target = running?.contents.find((entry) => entry.id === id)
      if (!running || !target) return
      target.stage = stage
      target.cancellation = undefined
      if (stage === 'Đã đăng' && !target.publishedAt) target.publishedAt = TODAY
      if ((stage === 'Lên lịch' || stage === 'Đã đăng') && !target.postDate) target.postDate = TODAY
      target.channels = target.channels.map((channel) => ({ ...channel, status: stage === 'Đã đăng' ? 'Đã đăng' : stage === 'Lên lịch' ? 'Đã lên lịch' : 'Chưa lên lịch', time: stage === 'Lên lịch' || stage === 'Đã đăng' ? channel.time || '17:00' : '' }))
      running.activity.unshift({ title: 'Nội dung #' + target.stt + ': ' + stage, detail: target.title, time: 'Vừa xong' })
      if (stage === 'Đã đăng') addProjectActivity(draft, 'send', 'Đã đăng nội dung #' + target.stt, target.title)
    })
  }
  const quota = project.quota
  const active = cycle.contents.filter((item) => item.stage !== 'Đã hủy')
  const core = active.filter((item) => !item.bonus)
  const bonus = active.length - core.length
  const target = Math.max(quota.posts, core.length) + bonus
  const published = cycle.result ? cycle.result.published : cycle.contents.filter(isPublished).length
  const rows = cycle.contents.filter((item) => !stage || item.stage === stage)

  return (
    <>
      <div className="project-output-summary content-summary">
        <b>{published} / {cycle.result ? cycle.result.planned : target} bài đã đăng{bonus ? ' (gồm ' + bonus + ' tặng)' : ''}</b>
        {!cycle.result && core.length < quota.posts && <span className="pill waiting">Content Plan thiếu {quota.posts - core.length} bài</span>}
      </div>
      <div className="content-toolbar">
        <select value={cycle.no} onChange={(event) => setCycleNo(Number(event.target.value))} aria-label="Chu kỳ">
          {project.cycles.map((item) => <option key={item.no} value={item.no}>Chu kỳ {item.no}{item.status === 'running' ? ' (đang chạy)' : ''}</option>)}
        </select>
        <select value={stage} onChange={(event) => setStage(event.target.value as '' | ContentStage)} aria-label="Giai đoạn">
          <option value="">Mọi giai đoạn</option>
          {STAGES.map((name) => <option key={name}>{name}</option>)}
        </select>
        {editable && <button className="primary" onClick={() => showModal(<ContentItemModal project={project} />)}><Icon name="plus" /> Bài đăng</button>}
      </div>
      <section className="panel project-table-wrap content-table-panel">
        <table className="project-table-new content-table">
          <thead><tr><th className="c-stt">#</th><th className="c-title">Bài</th><th className="c-post">Ngày đăng dự kiến / thực tế</th><th className="c-due">Script / dựng</th><th className="c-stage">Giai đoạn</th><th className="c-timing">Tiến độ</th></tr></thead>
          <tbody>
            {rows.map((item) => {
              const scriptLate = item.stage !== 'Đã hủy' && item.deadlineScript && item.deadlineScript < TODAY && !scriptDone(item)
              const editLate = item.stage !== 'Đã hủy' && item.deadlineEdit && item.deadlineEdit < TODAY && STAGES.indexOf(item.stage) < STAGES.indexOf('Chờ khách duyệt')
              const timing = contentTiming(item)
              return (
                <tr key={item.id} onClick={() => showModal(<ContentItemModal project={project} item={item} cycleNo={cycle.no} />)}>
                  <td className="c-stt">{item.stt}</td>
                  <td className="c-title">
                    <span className="content-name">
                      <b title={item.title}>{shortText(item.title)}</b>
                      {item.bonus && <em className="tag-bonus">Tặng</em>}{item.carried && <em className="tag-carry">Bù</em>}
                    </span>
                    <span className="content-sub">{[item.topic, item.format].filter(Boolean).join(' · ')}</span>
                  </td>
                  <td className="c-post">{shortDate(item.postDate) || '—'}<span className="content-sub">Thực tế: {shortDate(item.publishedAt ?? '') || '—'}</span></td>
                  <td className="c-due">
                    <span className={scriptLate ? 'is-late' : ''}>S {shortDate(item.deadlineScript) || '—'}</span>
                    <span className={editLate ? 'is-late' : ''}>D {shortDate(item.deadlineEdit) || '—'}</span>
                  </td>
                  <td className="c-stage">
                    {editable ? (
                      <select
                        className={'stage-select tone-' + statusTone(item.stage)}
                        value={item.stage}
                        aria-label={'Giai đoạn nội dung #' + item.stt}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => changeStage(item.id, event.target.value as ContentStage)}
                      >
                        {STAGES.map((name) => <option key={name}>{name}</option>)}
                      </select>
                    ) : <span className={'pill ' + statusTone(item.stage)}>{item.stage}</span>}
                  </td>
                  <td className="c-timing"><span className={'pill ' + (timing === 'Trễ hạn' ? 'danger' : timing === 'Đúng hạn' ? 'ok' : 'muted')}>{timing}</span>{item.cancellation && <span className="content-sub" title={item.cancellation.reason}>{shortText(item.cancellation.reason)}</span>}</td>
                </tr>
              )
            })}
            {!rows.length && <tr><td colSpan={6}>{cycle.contents.length ? 'Không có nội dung phù hợp bộ lọc.' : cycle.result ? 'Chu kỳ đã chốt: ' + cycle.result.published + ' / ' + cycle.result.planned + ' bài (' + cycle.result.note + ').' : 'Chưa có nội dung trong chu kỳ này.'}</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  )
}
