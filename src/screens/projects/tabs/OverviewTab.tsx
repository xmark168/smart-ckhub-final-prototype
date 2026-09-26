import { initials, shortDate } from '../../../lib/format'
import { Icon } from '../../../lib/icons'
import { cycleMilestones, runningCycle } from '../../../lib/sop'
import { useData } from '../../../store/store'
import type { Project } from '../../../store/types'
import { onboardingItems, type OnboardingItem } from '../projectLogic'
import { useProjectActions } from '../useProjectActions'
import { CycleTimeline } from './CycleTimeline'

function OnboardingRow({ entry }: { entry: OnboardingItem }) {
  return (
    <div className={'onboarding-row' + (entry.ready ? ' complete' : '') + (entry.required ? '' : ' optional')}>
      <Icon name={entry.icon} />
      <span><b>{entry.title}{!entry.required && <> <small>làm sau</small></>}</b><small>{entry.detail}</small></span>
      <Icon name={entry.ready ? 'check' : 'clock-3'} />
    </div>
  )
}

function OnboardingPanel({ project }: { project: Project }) {
  const { params } = useData()
  const actions = useProjectActions(project)
  const items = onboardingItems(project, params)
  const required = items.filter((entry) => entry.required)
  const optional = items.filter((entry) => !entry.required)
  const completed = required.filter((entry) => entry.ready).length
  const ready = completed === required.length
  return (
    <section className="panel onboarding-panel">
      <div className="panel-head">
        <div><h2>Cổng khởi động</h2><p className="subline">SOP: T0 là khi khách đã cọc{params.requireBriefBeforeT0 ? ' và đủ brief' : ''}.</p></div>
        <span className={'onboarding-count' + (ready ? ' ready' : '')}>{completed} / {required.length}</span>
      </div>
      <div className="onboarding-list">{required.map((entry) => <OnboardingRow key={entry.key} entry={entry} />)}</div>
      {optional.length > 0 && (
        <details className="onboarding-later">
          <summary>{optional.filter((entry) => !entry.ready).length} việc có thể bổ sung sau</summary>
          <div>{optional.map((entry) => <OnboardingRow key={entry.key} entry={entry} />)}</div>
        </details>
      )}
      <div className="onboarding-actions">
        <small>{ready ? 'Đủ điều kiện. Account có thể bắt đầu triển khai.' : 'Còn ' + (required.length - completed) + ' điều kiện cần xử lý.'}</small>
        <button className="secondary" onClick={actions.cancelDraft} disabled={!actions.canStop} title={actions.canStop ? 'Khách không chốt' : 'Chỉ Account phụ trách hoặc Account tạo dự án'}><Icon name="circle-x" /> Hủy nháp</button>
        <button className="secondary" onClick={actions.onboarding}><Icon name="list-checks" /> Cập nhật</button>
      </div>
    </section>
  )
}

export function OverviewTab({ project }: { project: Project }) {
  const { params } = useData()
  const actions = useProjectActions(project)
  const cycle = runningCycle(project)
  const quota = project.quota
  return (
    <div className="project-detail-grid">
      <main>
        {project.state === 'draft' && <OnboardingPanel project={project} />}
        {cycle && (
          <section className="panel">
            <div className="panel-head"><div><h2>Tiến trình chu kỳ {cycle.no}</h2><p className="subline">{shortDate(cycle.start)} – {shortDate(cycle.plannedEnd)}</p></div></div>
            <CycleTimeline items={cycleMilestones(cycle, quota, params)} />
          </section>
        )}
        <section className="panel project-notes-panel">
          <div className="panel-head">
            <h2>Ghi chú dự án</h2>
            <button className="text-btn" onClick={actions.notes}>{project.notes ? 'Sửa' : '+ Thêm ghi chú'}</button>
          </div>
          {project.notes ? <p className="project-note-text">{project.notes}</p> : <p className="empty-copy">Chưa có ghi chú.</p>}
        </section>
      </main>
      <aside>
        <section className="panel">
          <div className="panel-head"><h2>Account</h2></div>
          <button className="customer-account-card" onClick={actions.account}>
            <i>{initials(project.owner)}</i>
            <span><b>{project.owner}</b></span>
            <Icon name="chevron-right" />
          </button>
        </section>
      </aside>
    </div>
  )
}
