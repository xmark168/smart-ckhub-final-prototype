import { useEffect } from 'react'
import { useApp, type ProjectTab } from '../../app/context'
import { navigate, pathFor, useLocation, withQuery } from '../../app/router'
import { Icon } from '../../lib/icons'
import { currentCycle, projectHealth, runningCycle } from '../../lib/sop'
import { useData } from '../../store/store'
import { projectOverdue } from '../../data/contracts'
import type { Project } from '../../store/types'
import { cycleCounter, cycleRange, postProgress, projectLabel, relativeDay } from './projectLogic'
import { ProjectActivityRows } from './ProjectActivityRows'
import { ContentTab } from './tabs/ContentTab'
import { ContractTab } from './tabs/ContractTab'
import { CyclesTab } from './tabs/CyclesTab'
import { DocsTab } from './tabs/DocsTab'
import { OverviewTab } from './tabs/OverviewTab'
import { useProjectActions } from './useProjectActions'
import { canStopProject } from './projectLogic'
import { setViewOnly } from '../../ui/viewOnly'
import { TODAY } from '../../lib/format'

const TABS: Array<[ProjectTab, string, string, string]> = [
  ['tong-quan', 'Tổng quan', 'Tổng quan triển khai', 'Mốc SOP của chu kỳ hiện tại, việc cần làm tiếp và định mức gói.'],
  ['chu-ky', 'Chu kỳ', 'Chu kỳ', 'Lịch sử chu kỳ và vùng làm việc của chu kỳ đang chạy.'],
  ['noi-dung', 'Nội dung', 'Nội dung chu kỳ', 'Mỗi dòng là một nội dung trong Content Plan; Facebook và TikTok là kênh xuất bản.'],
  ['hop-dong', 'Hợp đồng & thanh toán', 'Hợp đồng & thanh toán', 'Đọc trực tiếp từ Hợp đồng & công nợ.'],
  ['tai-lieu', 'Tài liệu & ghi chú', 'Tài liệu & ghi chú', 'Liên kết Drive và Key notes. Nội dung làm việc nằm trên Drive.'],
  ['nhat-ky', 'Nhật ký', 'Nhật ký dự án', 'Sự kiện vận hành quan trọng được lưu trên dự án.'],
]

function isTab(value: string | null): value is ProjectTab {
  return TABS.some(([id]) => id === value)
}

function Header({ project, readOnly }: { project: Project; readOnly: boolean }) {
  const { go, openCustomer } = useApp()
  const actions = useProjectActions(project)
  const draft = project.state === 'draft'
  return (
    <div className="project-detail-head">
      <button className="project-detail-back" onClick={() => go('projects')}><Icon name="arrow-left" /> Dự án</button>
      <div className="project-detail-title">
        <div>
          <div className="project-title-line">
            <h1>{project.customer}</h1>
            <span className={'state-badge state-' + project.state}>{projectLabel(project)}</span>
          </div>
          <p className="project-subtitle">{project.service}</p>
          <p className="project-meta-line">
            <span className="mono">{project.code}</span>
            <span>Account <b>{project.owner}</b></span>
            <button type="button" className="meta-chip" onClick={() => openCustomer(project.customerId)} aria-label={'Mở hồ sơ khách hàng ' + project.customer}>
              <Icon name="users-round" /> Hồ sơ khách hàng <Icon name="chevron-right" />
            </button>
          </p>
        </div>
        <div className="project-detail-actions" hidden={readOnly}>
          <button className="secondary" onClick={actions.edit}><Icon name="pencil" /> Sửa dự án</button>
          {draft && <button className="primary" onClick={actions.start}><Icon name="play" /> Bắt đầu triển khai</button>}
          {project.state === 'active' && runningCycle(project) && <button className="primary" onClick={actions.closeCycle}><Icon name="calendar-check-2" /> Chốt chu kỳ</button>}
          {(project.state === 'pending' || project.state === 'stopped') && <button className="primary" onClick={actions.resume}><Icon name="play" /> {project.state === 'pending' ? 'Tiếp tục' : 'Mở lại'}</button>}
        </div>
      </div>
    </div>
  )
}

function Summary({ project }: { project: Project }) {
  const { params } = useData()
  const { contracts } = useData()
  const health = projectHealth(project, params, TODAY, projectOverdue(contracts, project.id))
  const cycle = currentCycle(project)
  const posts = postProgress(project)
  const endNote = cycle && cycle.status === 'running' ? 'chốt ' + relativeDay(cycle.plannedEnd, TODAY) : cycle ? 'đã chốt' : 'tạo khi bắt đầu triển khai'
  return (
    <section className="project-overview project-overview-rich">
      <div className="project-overview-main">
        <span>Sức khỏe triển khai (tự tính theo mốc SOP)</span>
        <strong>{health.label}{project.risk && health.level !== 'watch' ? ' · có cờ' : ''}</strong>
        <p>{health.reason}</p>
      </div>
      <div className="project-overview-stat"><span>Chu kỳ</span><strong>{cycleCounter(project)}</strong><small>{cycleRange(project)}</small></div>
      <div className="project-overview-stat">
        <span>Bài đã đăng</span>
        <strong>{posts ? posts.published + ' / ' + posts.planned : '—'}</strong>
        <small>{posts ? (posts.bonus ? '+' + posts.bonus + ' bài tặng · ' : '') + 'chu kỳ ' + cycle?.no : 'gói không có bài đăng'}</small>
      </div>
      <div className="project-overview-stat"><span>Hạn chu kỳ</span><strong>{cycle ? cycle.plannedEnd.split('-').reverse().join('.') : '—'}</strong><small>{endNote}</small></div>
    </section>
  )
}

export function ProjectDetailScreen() {
  const { projectId, go, screen, role, account } = useApp()
  const { route } = useLocation()
  const project = useData().projects.find((item) => item.id === projectId)
  const raw = route?.query.get('tab') ?? null
  const tab: ProjectTab = isTab(raw) ? raw : 'tong-quan'
  const legacyCycleLink = screen === 'cycleWorkspace'

  // Old `/projects/:id/cycle` links open the Cycle tab; unknown tabs fall back to the overview.
  useEffect(() => {
    if (legacyCycleLink) navigate(pathFor('projectDetail', projectId, { tab: 'chu-ky' }), { replace: true })
    else if (route && raw !== null && !isTab(raw)) navigate(withQuery(route, { tab: undefined }), { replace: true })
  }, [legacyCycleLink, projectId, raw, route])

  const hint = !project || canStopProject(role, account, project) ? null : role === 'account' ? 'Chỉ Account ' + project.owner + (project.createdBy !== project.owner ? ' hoặc ' + project.createdBy : '') + ' được thao tác' : 'BODs và Administrator chỉ xem'
  useEffect(() => {
    setViewOnly(hint)
    return () => setViewOnly(null)
  }, [hint])

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

  const [, , title, subtitle] = TABS.find(([id]) => id === tab)!
  return (
    <section className="screen active" id="projectWorkspaceDetail">
      <Header project={project} readOnly={Boolean(hint)} />
      {hint && <div className="scope-banner"><Icon name="shield-check" /> {hint}. Chế độ xem: mở được các form để xem nhưng không lưu thay đổi.</div>}
      <Summary project={project} />
      <nav className="project-detail-tabs" aria-label="Chi tiết dự án">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => route && navigate(withQuery(route, { tab: id === 'tong-quan' ? undefined : id }))}>
            {label}
          </button>
        ))}
      </nav>
      <div className="project-tab-content">
        <section className="project-tab-panel is-active">
          <div className="project-tab-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div>
          {tab === 'tong-quan' && <OverviewTab project={project} />}
          {tab === 'chu-ky' && <CyclesTab project={project} />}
          {tab === 'noi-dung' && <ContentTab project={project} />}
          {tab === 'hop-dong' && <ContractTab project={project} />}
          {tab === 'tai-lieu' && <DocsTab project={project} />}
          {tab === 'nhat-ky' && <section className="panel"><ProjectActivityRows project={project} /></section>}
        </section>
      </div>
    </section>
  )
}
