import { initials, money, shortDate, TODAY } from '../../../lib/format'
import { Icon } from '../../../lib/icons'
import { cycleMilestones, MILESTONE_TONE, nextActions, runningCycle } from '../../../lib/sop'
import { useData } from '../../../store/store'
import type { Project } from '../../../store/types'
import { onboardingItems, relativeDay, type OnboardingItem } from '../projectLogic'
import { useProjectActions } from '../useProjectActions'
import { MilestoneList } from './Milestones'

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
  const next = nextActions(project, params)
  const quota = project.quota
  // People working this cycle, gathered from shootings (Media) and cycle tasks (Owner).
  const roles = new Map<string, string[]>()
  const addRole = (name: string, role: string) => {
    if (!name || name === project.owner || name === 'Content nội bộ') return
    const list = roles.get(name) ?? []
    if (!list.includes(role)) roles.set(name, [...list, role])
  }
  cycle?.shootings.forEach((shoot) => shoot.media.forEach((name) => addRole(name, 'Shoot ' + shortDate(shoot.date))))
  cycle?.tasks.forEach((task) => addRole(task.owner, task.name))
  const participants = [...roles.entries()]
  return (
    <div className="project-detail-grid">
      <main>
        {project.state === 'draft' && <OnboardingPanel project={project} />}
        {cycle && (() => {
          const all = cycleMilestones(cycle, quota, params)
          const done = all.filter((item) => item.state === 'done' || item.state === 'doneLate')
          return (
            <section className="panel">
              <div className="panel-head">
                <div><h2>Mốc chu kỳ {cycle.no}</h2><p className="subline">Tính từ {shortDate(cycle.start)} theo Tham số vận hành · việc gấp nhất trước.</p></div>
              </div>
              {next.length ? (
                <div className="cycle-task-list">
                  {next.map((item) => (
                    <div className={'cycle-task milestone-open is-' + item.state} key={item.label}>
                      <span><b>{item.label}</b><small>{item.detail}</small></span>
                      <span className="milestone-when">
                        <span className={'pill ' + MILESTONE_TONE[item.state]}>{item.state === 'late' ? 'Trễ' : item.state === 'due' ? 'Đến hạn' : item.state === 'waiting' ? 'Chờ bước trước' : 'Sắp tới'}</span>
                        {item.due && <small>{relativeDay(item.due, TODAY)} · {shortDate(item.due)}</small>}
                      </span>
                    </div>
                  ))}
                </div>
              ) : <p className="empty-copy">Không còn mốc mở trong chu kỳ này.</p>}
              {done.length > 0 && (
                <details className="milestones-done">
                  <summary><Icon name="check" /> {done.length} mốc đã xong{done.some((item) => item.state === 'doneLate') ? ' (có mốc xong trễ)' : ''}</summary>
                  <MilestoneList items={done} />
                </details>
              )}
            </section>
          )
        })()}
        <section className="panel project-notes-panel">
          <div className="panel-head">
            <div><h2>Ghi chú dự án</h2><p className="subline">Điều cả team cần nhớ khi làm dự án này.</p></div>
            <button className="text-btn" onClick={actions.notes}>{project.notes ? 'Sửa' : '+ Thêm ghi chú'}</button>
          </div>
          {project.notes ? <p className="project-note-text">{project.notes}</p> : <p className="empty-copy">Chưa có ghi chú.</p>}
        </section>
        <section className="panel project-service-panel">
          <div className="panel-head"><div><h2>Dịch vụ và định mức</h2><p className="subline">Snapshot tại thời điểm gán gói vào dự án.</p></div></div>
          <div className="project-service-grid">
            <div>
              <span>Gói dịch vụ</span><b>{project.service}</b><small>{project.serviceScope || 'Chưa có phạm vi dịch vụ.'}</small>
              {project.pendingPackage && <small className="cpl-reason tone-waiting">Đổi gói từ chu kỳ {project.pendingPackage.fromCycle} theo {project.pendingPackage.source}</small>}
            </div>
            <div><span>Đơn giá</span><b>{project.servicePackageId ? money(project.servicePrice) : 'Chưa xác định'}</b><small>Chưa VAT · không tự đổi theo danh mục</small></div>
            <div>
              <span>Định mức / chu kỳ</span>
              <b>{quota.posts ? quota.posts + ' bài · ' + quota.shoots + ' shoot' : 'Không có đầu ra nội dung'}</b>
              <small>{quota.posts ? quota.brandPosts + ' thương hiệu / ' + quota.salesPosts + ' bán hàng · ' + quota.plans + ' Content Plan' : 'Không áp dụng mốc nội dung'}</small>
            </div>
          </div>
        </section>
      </main>
      <aside>
        <section className="panel">
          <div className="panel-head"><div><h2>Người tham gia</h2><p className="subline">Account cố định; partner gán theo từng buổi shoot và công việc.</p></div></div>
          <button className="customer-account-card" onClick={actions.account}>
            <i>{initials(project.owner)}</i>
            <span><b>{project.owner}</b><small>Account · điều phối khách và partner</small></span>
            <Icon name="chevron-right" />
          </button>
          <div className="cycle-compact-list team-list">
            {quota.plans > 0 && <div><b>Content nội bộ</b><small>Content Plan, script</small></div>}
            {participants.length > 0
              ? participants.map(([name, roles]) => <div key={name}><b>{name}</b><small>{roles.join(' · ')}</small></div>)
              : <p className="empty-copy">{cycle ? 'Chưa gán partner cho buổi shoot hay công việc nào trong chu kỳ ' + cycle.no + '.' : 'Gán partner khi tạo lịch shoot và công việc sau khi bắt đầu triển khai.'}</p>}
          </div>
        </section>
      </aside>
    </div>
  )
}
