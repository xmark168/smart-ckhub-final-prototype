import { useState } from 'react'
import { useApp } from '../../../app/context'
import { shortDate, TODAY } from '../../../lib/format'
import { Icon } from '../../../lib/icons'
import { currentCycle, isPublished, runningCycle, scriptDone, STAGES } from '../../../lib/sop'
import type { ContentStage, Project } from '../../../store/types'
import { ContentItemModal } from '../ContentModals'
import { addProjectActivity, statusTone, updateProject } from '../projectLogic'

export function ContentTab({ project }: { project: Project }) {
  const { showModal } = useApp()
  const current = currentCycle(project)
  const [cycleNo, setCycleNo] = useState(current?.no ?? 0)
  const [mission, setMission] = useState('')
  const [stage, setStage] = useState<'' | ContentStage>('')
  const cycle = project.cycles.find((item) => item.no === cycleNo) ?? current
  const editable = Boolean(cycle && cycle.status === 'running' && project.state !== 'stopped')

  if (!project.quota.posts) {
    return <section className="panel"><p className="empty-copy">Gói {project.service} không có đầu ra bài đăng hằng tháng.</p></section>
  }
  if (!cycle) {
    return <section className="panel"><p className="empty-copy">Chưa có chu kỳ. Nội dung được lập sau khi bắt đầu triển khai.</p></section>
  }

  const changeStage = (id: string, stage: ContentStage) =>
    updateProject(project.id, (draft) => {
      const running = runningCycle(draft)
      const target = running?.contents.find((entry) => entry.id === id)
      if (!running || !target) return
      target.stage = stage
      if ((stage === 'Lên lịch' || stage === 'Đã đăng') && !target.postDate) target.postDate = TODAY
      target.channels = target.channels.map((channel) => ({ ...channel, status: stage === 'Đã đăng' ? 'Đã đăng' : stage === 'Lên lịch' ? 'Đã lên lịch' : 'Chưa lên lịch', time: stage === 'Lên lịch' || stage === 'Đã đăng' ? channel.time || '17:00' : '' }))
      running.activity.unshift({ title: 'Nội dung #' + target.stt + ': ' + stage, detail: target.title, time: 'Vừa xong' })
      if (stage === 'Đã đăng') addProjectActivity(draft, 'send', 'Đã đăng nội dung #' + target.stt, target.title)
    })
  const core = cycle.contents.filter((item) => !item.bonus)
  const brand = core.filter((item) => item.mission === 'Thương hiệu').length
  const sales = core.length - brand
  const rows = cycle.contents.filter((item) => (!mission || item.mission === mission) && (!stage || item.stage === stage))
  const quota = project.quota
  const mixOk = brand === quota.brandPosts && sales === quota.salesPosts

  return (
    <>
      <div className="project-output-summary content-summary">
        <b>{core.filter(isPublished).length} / {quota.posts} bài đã đăng{cycle.contents.length > core.length ? ' · ' + (cycle.contents.length - core.length) + ' bài tặng' : ''}</b>
        <span className={'pill ' + (mixOk ? 'ok' : 'waiting')}>Thương hiệu {brand}/{quota.brandPosts} · Bán hàng {sales}/{quota.salesPosts}</span>
        {core.length < quota.posts && <span className="pill waiting">Content Plan còn thiếu {quota.posts - core.length} bài</span>}
      </div>
      <div className="content-toolbar">
        <select value={cycle.no} onChange={(event) => setCycleNo(Number(event.target.value))} aria-label="Chu kỳ">
          {project.cycles.map((item) => <option key={item.no} value={item.no}>Chu kỳ {item.no}{item.status === 'running' ? ' (đang chạy)' : ''}</option>)}
        </select>
        <select value={mission} onChange={(event) => setMission(event.target.value)} aria-label="Nhiệm vụ">
          <option value="">Mọi nhiệm vụ</option><option>Thương hiệu</option><option>Bán hàng</option>
        </select>
        <select value={stage} onChange={(event) => setStage(event.target.value as '' | ContentStage)} aria-label="Giai đoạn">
          <option value="">Mọi giai đoạn</option>
          {STAGES.map((name) => <option key={name}>{name}</option>)}
        </select>
        {editable && <button className="primary" onClick={() => showModal(<ContentItemModal project={project} />)}><Icon name="plus" /> Nội dung</button>}
        {project.links.contentPlan && <a className="project-drive-link" href={project.links.contentPlan} target="_blank" rel="noreferrer"><Icon name="external-link" /> Content Plan trên Drive</a>}
      </div>
      <section className="panel project-table-wrap content-table-panel">
        <table className="project-table-new content-table">
          <thead><tr><th className="c-stt">#</th><th className="c-title">Tiêu đề</th><th className="c-mission">Nhiệm vụ</th><th className="c-due">Hạn script / dựng</th><th className="c-post">Ngày đăng</th><th className="c-channel">Kênh</th><th className="c-stage">Giai đoạn</th></tr></thead>
          <tbody>
            {rows.map((item) => {
              const scriptLate = item.deadlineScript && item.deadlineScript < TODAY && !scriptDone(item)
              const editLate = item.deadlineEdit && item.deadlineEdit < TODAY && STAGES.indexOf(item.stage) < STAGES.indexOf('Chờ khách duyệt')
              return (
                <tr key={item.id} onClick={() => editable && showModal(<ContentItemModal project={project} item={item} />)} className={editable ? '' : 'readonly'}>
                  <td className="c-stt">{item.stt}</td>
                  <td className="c-title">
                    <span className="project-record-name content-title" title={item.title}>{item.title}</span>
                    <span className="project-record-meta">
                      {item.category}{item.topic ? ' · ' + item.topic : ''} · {item.format}
                      {item.bonus && <> · <b>Tặng</b></>}{item.carried && <> · <b>Bù chu kỳ trước</b></>}
                    </span>
                  </td>
                  <td className="c-mission"><span className={'pill ' + (item.mission === 'Bán hàng' ? 'waiting' : 'info')}>{item.mission}</span></td>
                  <td className="c-due">
                    <span className={scriptLate ? 'is-late' : ''}>S {shortDate(item.deadlineScript) || '—'}</span>
                    <span className={editLate ? 'is-late' : ''}>D {shortDate(item.deadlineEdit) || '—'}</span>
                  </td>
                  <td className="c-post">{shortDate(item.postDate) || '—'}</td>
                  <td className="c-channel">{item.channels.map((channel) => <i key={channel.platform} className="project-channel" title={channel.status}>{channel.platform}</i>)}</td>
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
                </tr>
              )
            })}
            {!rows.length && <tr><td colSpan={7}>{cycle.contents.length ? 'Không có nội dung phù hợp bộ lọc.' : cycle.result ? 'Chu kỳ đã chốt: ' + cycle.result.published + ' / ' + cycle.result.planned + ' bài (' + cycle.result.note + ').' : 'Chưa có nội dung trong chu kỳ này.'}</td></tr>}
          </tbody>
        </table>
      </section>
      <p className="project-tab-note">S = hạn script, D = hạn dựng; đỏ khi đã quá hạn mà nội dung chưa qua bước đó. Bài tặng không tính vào định mức. {editable ? 'Đổi giai đoạn ngay trong bảng; bấm dòng để sửa chi tiết.' : 'Chu kỳ đã chốt chỉ xem.'}</p>
    </>
  )
}
