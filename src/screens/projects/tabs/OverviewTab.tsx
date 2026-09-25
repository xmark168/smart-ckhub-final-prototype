import { initials, money, shortDate } from '../../../lib/format'
import { Icon } from '../../../lib/icons'
import { cycleMilestones, MILESTONE_TONE, nextActions, runningCycle } from '../../../lib/sop'
import { useData } from '../../../store/store'
import type { Project } from '../../../store/types'
import { onboardingItems, type OnboardingItem } from '../projectLogic'
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

function Controls({ project }: { project: Project }) {
  const actions = useProjectActions(project)
  const draft = project.state === 'draft'
  if (draft) return null
  return (
    <section className="panel">
      <div className="panel-head"><h2>Kiểm soát dự án</h2></div>
      <button className={'customer-control' + (project.risk ? ' is-attention' : '')} onClick={actions.toggleRisk}>
        <Icon name="flag" />
        <span><b>{project.risk ? 'Đang gắn cờ cần chú ý' : 'Đánh dấu cần chú ý'}</b><small>{project.risk ? 'Gỡ khi đã xử lý xong' : 'Cờ tay, hiển thị cùng sức khỏe tự tính'}</small></span>
      </button>
      {project.state === 'active' && (
        <button className="customer-control" onClick={actions.pause}>
          <Icon name="circle-pause" />
          <span><b>Tạm dừng</b><small>Giữ chu kỳ và hợp đồng, ghi lý do và ngày quay lại</small></span>
        </button>
      )}
      {project.state === 'pending' && (
        <button className="customer-control" onClick={actions.resume}>
          <Icon name="play" />
          <span><b>Tiếp tục triển khai</b><small>{project.pause?.reason}{project.pause?.returnDate ? ' · dự kiến ' + shortDate(project.pause.returnDate) : ''}</small></span>
        </button>
      )}
      {project.state !== 'stopped' && (
        <button className="customer-control" onClick={actions.stop} disabled={!actions.canStop} title={actions.canStop ? undefined : 'Chỉ Account phụ trách hoặc Account tạo dự án'}>
          <Icon name="circle-stop" />
          <span><b>Dừng dự án</b><small>{actions.canStop ? 'Chốt chu kỳ đang chạy tại ngày hiệu lực' : 'Chỉ Account phụ trách hoặc Account tạo dự án'}</small></span>
        </button>
      )}
      {project.state === 'stopped' && (
        <button className="customer-control" onClick={actions.resume}>
          <Icon name="rotate-ccw" />
          <span><b>Mở lại dự án</b><small>{project.stop?.reason} · dừng từ {shortDate(project.stop?.date ?? '')}</small></span>
        </button>
      )}
    </section>
  )
}

export function OverviewTab({ project }: { project: Project }) {
  const { params } = useData()
  const actions = useProjectActions(project)
  const cycle = runningCycle(project)
  const next = nextActions(project, params).slice(0, 5)
  const quota = project.quota
  const team = project.team
  return (
    <div className="project-detail-grid">
      <main>
        {project.state === 'draft' && <OnboardingPanel project={project} />}
        {cycle && (
          <section className="panel">
            <div className="panel-head">
              <div><h2>Việc cần làm tiếp</h2><p className="subline">Mốc chưa xong của chu kỳ {cycle.no}, trễ nhất trước.</p></div>
            </div>
            {next.length ? (
              <div className="cycle-task-list">
                {next.map((item) => (
                  <div className="cycle-task" key={item.label}>
                    <span><b>{item.label}</b><small>{item.detail}{item.due ? ' · hạn ' + shortDate(item.due) : ''}</small></span>
                    <em className={'pill ' + MILESTONE_TONE[item.state]}>{item.state === 'late' ? 'Trễ' : item.state === 'due' ? 'Đến hạn' : item.state === 'waiting' ? 'Chờ' : 'Sắp tới'}</em>
                  </div>
                ))}
              </div>
            ) : <p className="empty-copy">Không còn mốc mở trong chu kỳ này.</p>}
          </section>
        )}
        {cycle && (
          <section className="panel">
            <div className="panel-head"><div><h2>Mốc SOP chu kỳ {cycle.no}</h2><p className="subline">Tính từ T0 {shortDate(cycle.start)} theo Tham số vận hành.</p></div></div>
            <MilestoneList items={cycleMilestones(cycle, quota, params)} />
          </section>
        )}
        <section className="panel project-service-panel">
          <div className="panel-head"><div><h2>Dịch vụ và định mức</h2><p className="subline">Snapshot tại thời điểm gán gói vào dự án.</p></div></div>
          <div className="project-service-grid">
            <div><span>Gói dịch vụ</span><b>{project.service}</b><small>{project.serviceScope || 'Chưa có phạm vi dịch vụ.'}</small></div>
            <div><span>Đơn giá</span><b>{project.servicePackageId ? money(project.servicePrice) : 'Chưa xác định'}</b><small>Chưa VAT · không tự đổi theo danh mục</small></div>
            <div>
              <span>Định mức / chu kỳ</span>
              <b>{quota.posts ? quota.posts + ' bài · ' + quota.shoots + ' shoot' : 'Không có đầu ra nội dung'}</b>
              <small>{quota.posts ? quota.brandPosts + ' thương hiệu / ' + quota.salesPosts + ' bán hàng · ' + quota.plans + ' Content Plan' : 'Không áp dụng mốc nội dung'}</small>
            </div>
          </div>
          {project.notes && <p className="project-tab-note">{project.notes}</p>}
        </section>
      </main>
      <aside>
        <section className="panel">
          <div className="panel-head"><h2>Đội dự án</h2></div>
          <button className="customer-account-card" onClick={actions.account}>
            <i>{initials(project.owner)}</i>
            <span><b>{project.owner}</b><small>Account · điều phối timeline và nguồn lực</small></span>
            <Icon name="chevron-right" />
          </button>
          <div className="cycle-compact-list team-list">
            <div><b>{team.planner || 'Chưa phân công'}</b><small>Planner / Content · Content Plan, script</small></div>
            <div><b>{team.media.length ? team.media.join(', ') : 'Chưa phân công'}</b><small>Media · quay, dựng, đăng</small></div>
            <div><b>{team.ads || 'Không có'}</b><small>Ads</small></div>
          </div>
        </section>
        <Controls project={project} />
      </aside>
    </div>
  )
}
