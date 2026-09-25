import { useApp } from '../../app/context'
import { COM_TAM_TAI_ID } from '../../data/projects'
import { initials, money } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { useData } from '../../store/store'
import type { Project } from '../../store/types'
import { ComTamTaiDetail } from './ComTamTaiDetail'
import { cycleRange, onboardingItems, projectLabel, projectTone, type OnboardingItem } from './projectLogic'
import { ProjectActivityRows } from './ProjectActivityRows'
import { useProjectActions } from './useProjectActions'

function OnboardingRow({ entry }: { entry: OnboardingItem }) {
  return (
    <div className={'onboarding-row' + (entry.ready ? ' complete' : '') + (entry.required ? '' : ' optional')}>
      <Icon name={entry.icon} />
      <span><b>{entry.title}{!entry.required && <> <small>làm sau</small></>}</b><small>{entry.detail}</small></span>
      <Icon name={entry.ready ? 'check' : 'clock-3'} />
    </div>
  )
}

function OnboardingPanel({ project, onEdit }: { project: Project; onEdit: () => void }) {
  const items = onboardingItems(project)
  const required = items.filter((entry) => entry.required)
  const optional = items.filter((entry) => !entry.required)
  const completed = required.filter((entry) => entry.ready).length
  const ready = completed === required.length
  return (
    <section className="panel onboarding-panel">
      <div className="panel-head">
        <div><h2>Cổng khởi động</h2><p className="subline">Chỉ kiểm tra phần cần thiết để tạo chu kỳ 1.</p></div>
        <span className={'onboarding-count' + (ready ? ' ready' : '')}>{completed} / {required.length}</span>
      </div>
      <div className="onboarding-list">{required.map((entry) => <OnboardingRow key={entry.key} entry={entry} />)}</div>
      <details className="onboarding-later">
        <summary>{optional.filter((entry) => !entry.ready).length} việc có thể bổ sung sau</summary>
        <div>{optional.map((entry) => <OnboardingRow key={entry.key} entry={entry} />)}</div>
      </details>
      <div className="onboarding-actions">
        <small>{ready ? 'Đủ điều kiện. Account có thể khởi động dự án.' : 'Còn ' + (required.length - completed) + ' điều kiện cần xử lý.'}</small>
        <button className="secondary" onClick={onEdit}><Icon name="list-checks" /> Cập nhật</button>
      </div>
    </section>
  )
}

function stateAction(project: Project): [string, string] {
  if (project.state === 'active') return ['Dừng dự án', 'Yêu cầu lý do và xác nhận']
  if (project.state === 'draft') return ['Bắt đầu triển khai', 'Chọn ngày bắt đầu chu kỳ 1']
  return [project.state === 'pending' ? 'Tiếp tục triển khai' : 'Mở lại dự án', 'Giữ nguyên tiến độ hợp đồng']
}

function GenericProjectDetail({ project }: { project: Project }) {
  const { go } = useApp()
  const actions = useProjectActions(project)
  const draft = project.state === 'draft'
  const tone = projectTone(project)
  const label = projectLabel(project)
  const [stateTitle, stateHint] = stateAction(project)
  return (
    <section className="screen active" id="projectWorkspaceDetail">
      <div className="project-detail-head">
        <button className="project-detail-back" onClick={() => go('projects')}><Icon name="arrow-left" /> Dự án</button>
        <div className="project-detail-title">
          <div>
            <h1>{project.customer} <span className={'pill ' + tone}>{label}</span></h1>
            <p>{project.code} · {project.service} · Account {project.owner}</p>
          </div>
          <div className="project-detail-actions">
            <button className="secondary" onClick={actions.edit}><Icon name="pencil" /> Sửa dự án</button>
            <button className="primary" onClick={actions.openCycle}><Icon name={draft ? 'play' : 'calendar-range'} /> {draft ? 'Bắt đầu triển khai' : 'Mở chu kỳ'}</button>
          </div>
        </div>
      </div>

      <section className="project-overview">
        <div className="project-overview-main">
          <span>Sức khỏe triển khai</span>
          <strong>{draft ? 'Chưa bắt đầu' : project.risk ? 'Cần theo dõi' : 'Đúng tiến độ'}</strong>
          <p>{draft ? 'Bắt đầu triển khai để tạo chu kỳ đầu tiên.' : project.risk ? 'Có ' + project.tasks + ' công việc cần Account rà soát trước khi kết thúc chu kỳ.' : 'Không có rủi ro đang mở trong chu kỳ này.'}</p>
        </div>
        <div className="project-overview-stat"><span>Tiến độ hợp đồng</span><strong>{project.cycle || '–'} / {project.total || '–'}</strong><small>chu kỳ đã triển khai</small></div>
        <div className="project-overview-stat"><span>Chu kỳ hiện tại</span><strong>{cycleRange(project)}</strong><small>{draft ? 'sẽ tạo khi bắt đầu triển khai' : 'mốc dự kiến, tính từ ngày bắt đầu'}</small></div>
        <div className="project-overview-stat">
          <span>Kết thúc thực tế</span>
          <strong>{project.actualEnd || (draft ? 'Chưa bắt đầu' : 'Chưa ghi nhận')}</strong>
          <small>{project.actualEnd ? 'mốc hoàn thành thực tế' : draft ? 'ghi nhận sau khi triển khai' : 'ghi nhận khi chốt chu kỳ'}</small>
        </div>
      </section>

      <div className="project-detail-grid">
        <main>
          {draft && <OnboardingPanel project={project} onEdit={actions.onboarding} />}
          <section className="panel">
            <div className="panel-head">
              <div><h2>Đầu ra chu kỳ</h2><p className="subline">Theo dõi phạm vi đã cam kết trong tháng.</p></div>
              <span className={'pill ' + tone}>{label}</span>
            </div>
            <div className="project-delivery-grid">
              <div><span>Bài đăng</span><b>{project.posts}</b><small>kế hoạch trong kỳ</small></div>
              <div><span>Shooting</span><b>{String(project.shooting).padStart(2, '0')}</b><small>lịch trong kỳ</small></div>
              <div><span>Công việc mở</span><b>{String(project.tasks).padStart(2, '0')}</b><small>{project.risk ? 'cần xử lý' : 'đang theo dõi'}</small></div>
            </div>
          </section>
          <section className="panel project-service-panel">
            <div className="panel-head"><div><h2>Dịch vụ áp dụng</h2><p className="subline">Snapshot tại thời điểm gán vào dự án.</p></div></div>
            <div className="project-service-grid">
              <div><span>Gói dịch vụ</span><b>{project.service}</b><small>{project.serviceScope || 'Chưa có phạm vi dịch vụ.'}</small></div>
              <div><span>Đơn giá</span><b>{project.servicePackageId ? money(project.servicePrice) : 'Chưa xác định'}</b><small>Chưa VAT · không tự đổi theo danh mục</small></div>
              <div>
                <span>Hợp đồng</span><b>{project.contractCode || 'Chưa liên kết'}</b>
                <small>{project.contractCode ? project.total + ' chu kỳ theo hợp đồng' : 'Cần liên kết trước khi triển khai'}</small>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-head"><div><h2>Nhật ký dự án</h2><p className="subline">Các thay đổi quan trọng được lưu trên dự án.</p></div></div>
            <ProjectActivityRows project={project} />
          </section>
        </main>
        <aside>
          <section className="panel">
            <div className="panel-head"><h2>Account phụ trách</h2></div>
            <button className="customer-account-card"><i>{initials(project.owner)}</i><span><b>{project.owner}</b><small>Điều phối timeline và nguồn lực</small></span><Icon name="chevron-right" /></button>
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Kiểm soát dự án</h2></div>
            {!draft && (
              <>
                <button className={'customer-control' + (project.risk ? ' is-attention' : '')} onClick={actions.toggleRisk}>
                  <Icon name="flag" />
                  <span><b>{project.risk ? 'Đang gắn cờ cần chú ý' : 'Đánh dấu cần chú ý'}</b><small>{project.risk ? 'Account cần xử lý trong chu kỳ này' : 'Tạo điểm theo dõi cho Account'}</small></span>
                </button>
                <button className="customer-control" onClick={actions.actualEnd}>
                  <Icon name="calendar-check-2" />
                  <span><b>{project.actualEnd ? 'Sửa kết thúc thực tế' : 'Ghi nhận kết thúc thực tế'}</b><small>Không thay đổi ngày kết thúc dự kiến</small></span>
                </button>
              </>
            )}
            <button className="customer-control" onClick={actions.toggleState}>
              <Icon name="circle-pause" />
              <span><b>{stateTitle}</b><small>{stateHint}</small></span>
            </button>
          </section>
        </aside>
      </div>
    </section>
  )
}

export function ProjectDetailScreen() {
  const { projectId, go } = useApp()
  const project = useData().projects.find((item) => item.id === projectId)
  if (!project) {
    return (
      <section className="screen active" id="projectWorkspaceDetail">
        <div className="project-detail-head">
          <button className="project-detail-back" onClick={() => go('projects')}><Icon name="arrow-left" /> Dự án</button>
          <p>Không tìm thấy dự án.</p>
        </div>
      </section>
    )
  }
  return project.id === COM_TAM_TAI_ID ? <ComTamTaiDetail project={project} /> : <GenericProjectDetail project={project} />
}
