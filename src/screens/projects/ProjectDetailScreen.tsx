import { useEffect } from 'react'
import { useApp, type ProjectTab } from '../../app/context'
import { navigate, pathFor, useLocation, withQuery } from '../../app/router'
import { Icon } from '../../lib/icons'
import { useData } from '../../store/store'
import { ContentTab } from './tabs/ContentTab'
import { ShootsTab } from './tabs/ShootsTab'
import { ContractTab } from './tabs/ContractTab'
import { DocsTab } from './tabs/DocsTab'
import { OverviewTab } from './tabs/OverviewTab'
import { ProjectHeader } from './ProjectHeader'
import { canStopProject } from './projectLogic'
import { setViewOnly } from '../../ui/viewOnly'

const TABS: Array<[ProjectTab, string, string, string]> = [
  ['tong-quan', 'Tổng quan', 'Tổng quan triển khai', 'Mốc SOP của chu kỳ hiện tại, việc cần làm tiếp và định mức gói.'],
  ['quay-chup', 'Quay chụp', 'Quay chụp', ''],
  ['noi-dung', 'Bài đăng', 'Bài đăng', 'Mỗi dòng là một nội dung trong Content Plan; Facebook và TikTok là kênh xuất bản.'],
  ['hop-dong', 'Hợp đồng', 'Hợp đồng & thanh toán', 'Đọc trực tiếp từ Hợp đồng & công nợ.'],
  ['tai-lieu', 'Tài liệu & nhật ký', 'Tài liệu & nhật ký', 'Liên kết Drive và Key notes. Nội dung làm việc nằm trên Drive.'],
]

function isTab(value: string | null): value is ProjectTab {
  return TABS.some(([id]) => id === value)
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
    if (legacyCycleLink) navigate(pathFor('projectDetail', projectId), { replace: true })
    else if (route && raw === 'nhat-ky') navigate(withQuery(route, { tab: 'tai-lieu' }), { replace: true })
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

  const [, , title] = TABS.find(([id]) => id === tab)!
  return (
    <section className="screen active" id="projectWorkspaceDetail">
      <ProjectHeader project={project} readOnly={Boolean(hint)} onTab={(id) => route && navigate(withQuery(route, { tab: id === 'tong-quan' ? undefined : id }))} />
      {hint && <div className="scope-banner"><Icon name="shield-check" /> {hint}. Chế độ xem: mở được các form để xem nhưng không lưu thay đổi.</div>}
      <nav className="project-detail-tabs" aria-label="Chi tiết dự án">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => route && navigate(withQuery(route, { tab: id === 'tong-quan' ? undefined : id }))}>
            {label}
          </button>
        ))}
      </nav>
      <div className="project-tab-content">
        <section className="project-tab-panel is-active">
          <h2 className="sr-only">{title}</h2>
          {tab === 'tong-quan' && <OverviewTab project={project} />}
          {tab === 'quay-chup' && <ShootsTab project={project} />}
          {tab === 'noi-dung' && <ContentTab project={project} />}
          {tab === 'hop-dong' && <ContractTab project={project} />}
          {tab === 'tai-lieu' && <DocsTab project={project} />}
        </section>
      </div>
    </section>
  )
}
