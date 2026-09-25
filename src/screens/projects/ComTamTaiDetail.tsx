import { useState, type ReactNode } from 'react'
import { useApp } from '../../app/context'
import { DRIVE_FOLDER } from '../../data/projects'
import { Icon } from '../../lib/icons'
import type { Project } from '../../store/types'
import { ProjectActivityRows } from './ProjectActivityRows'
import { useProjectActions } from './useProjectActions'
import { projectLabel, projectTone } from './projectLogic'

type TabId = 'overview' | 'cycles' | 'contracts' | 'outputs' | 'documents'

const TABS: Array<[TabId, string, string, string]> = [
  ['overview', 'Tổng quan', 'Tổng quan triển khai', 'Quyết định và chỉ số cần xem trước.'],
  ['cycles', 'Chu kỳ', 'Chu kỳ', 'Kế hoạch, thực tế và phần cần bù tiến độ.'],
  ['contracts', 'Hợp đồng & thanh toán', 'Hợp đồng & thanh toán', 'Một HĐ hiện hành, ba đợt thanh toán theo điều khoản.'],
  ['outputs', 'Đầu ra', 'Đầu ra tháng 9', 'Nội dung là đơn vị quản lý; Facebook và TikTok là kênh xuất bản.'],
  ['documents', 'Tài liệu', 'Tài liệu', 'Hệ thống chỉ giữ liên kết và trạng thái. Nội dung làm việc nằm trên Drive.'],
]

const OUTPUTS: Array<[string, string, string]> = [
  ['01', 'Cơm tấm sườn bì chả — câu chuyện món quen', 'Thương hiệu'], ['02', 'Bếp mở mỗi sáng', 'Thương hiệu'], ['03', 'Nước mắm nhà làm', 'Thương hiệu'],
  ['04', 'Một phần cơm đầy đặn', 'Thương hiệu'], ['05', 'Góc khách quen', 'Thương hiệu'], ['06', 'Quy trình chọn thịt', 'Thương hiệu'],
  ['07', 'Nhịp bếp giờ trưa', 'Thương hiệu'], ['08', 'Câu chuyện cô Tài', 'Thương hiệu'], ['09', 'Feedback khách hàng', 'Thương hiệu'],
  ['10', 'Combo trưa văn phòng', 'Bán hàng'], ['11', 'Ưu đãi đặt nhóm', 'Bán hàng'], ['12', 'Đặt giao tận nơi', 'Bán hàng'],
]

const CYCLES: Array<[string, string, string, string, string]> = [
  ['1 / 6', '13.05–12.06', '12.06.2026', 'Đúng hạn', 'ok'], ['2 / 6', '13.06–12.07', '14.07.2026', 'Bù 2 ngày', 'waiting'],
  ['3 / 6', '13.07–12.08', '12.08.2026', 'Đúng hạn', 'ok'], ['4 / 6', '13.08–12.09', '13.09.2026', 'Bù 1 ngày', 'waiting'],
  ['5 / 6', '13.09–12.10', 'Chưa chốt', 'Bù 1 content tuần 4', 'info'], ['6 / 6', '13.10–12.11', 'Chưa bắt đầu', '—', 'muted'],
]

const DOCS: Array<[string, string]> = [
  ['Tracker', 'Theo dõi tiến độ, nội dung và mốc chu kỳ'], ['Content Plan tháng 9', 'Kế hoạch 12 content tháng 9'], ['Content Post', 'Bản viết, asset và trạng thái xuất bản'],
  ['Shooting tháng 9', 'Call sheet, recap và source quay'], ['Key Notes', 'Kiến thức khách hàng, feedback, quyết định'], ['Folder source', 'Ảnh, video, file gốc'],
]

function DriveLink({ icon, children }: { icon?: string; children: ReactNode }) {
  return (
    <a className="project-drive-link" href={DRIVE_FOLDER} target="_blank" rel="noreferrer">
      {icon && <Icon name={icon} />} {children}
    </a>
  )
}

const TAB_CONTENT: Record<TabId, ReactNode> = {
  overview: (
    <div className="project-summary-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Cam kết gói dịch vụ</h2><p className="subline">Snapshot tại thời điểm ký HĐ.</p></div><span className="pill ok">Đang áp dụng</span></div>
        <ul className="project-scope-list">
          <li>12 content / tháng</li><li>1 buổi shooting · 4 giờ / tháng</li><li>Kế hoạch nội dung và báo cáo tháng</li><li>Ads: hạng mục tùy chọn, không nằm trong gói này</li>
        </ul>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Tiến độ tháng 9</h2><p className="subline">Chu kỳ 5 / 6 · 13.09–12.10.2026</p></div></div>
        <div className="project-progress-line">
          <span><b>8 / 12</b> đã lên lịch hoặc xuất bản</span>
          <i><em style={{ width: '67%' }} /></i>
          <small>1 shooting đã hoàn thành · 1 content đang bù tiến độ</small>
        </div>
      </section>
    </div>
  ),
  cycles: (
    <section className="panel project-cycle-table">
      <div className="project-cycle-table-head"><span>Chu kỳ</span><span>Ngày dự kiến</span><span>Ngày thực tế</span><span>Bù tiến độ</span></div>
      {CYCLES.map(([cycle, planned, actual, note, tone]) => (
        <div className="project-cycle-row" key={cycle}><b>{cycle}</b><span>{planned}</span><span>{actual}</span><span className={'pill ' + tone}>{note}</span></div>
      ))}
      <p className="project-tab-note">Chu kỳ luôn tính một tháng từ ngày bắt đầu chu kỳ. Ngày kết thúc thực tế chỉ ghi khi Account chốt chu kỳ.</p>
    </section>
  ),
  contracts: (
    <>
      <div className="project-contract-summary">
        <section><span>Hợp đồng hiện hành</span><b>HĐ-2026-056</b><small>13.05.2026 – 20.11.2026 · 6 chu kỳ</small></section>
        <section><span>Giá trị hợp đồng</span><b>8.000.000đ</b><small>Snapshot gói Social Content</small></section>
        <DriveLink icon="folder-open">Mở folder HĐ trên Drive</DriveLink>
      </div>
      <div className="project-payment-list">
        <article><div><span>Đợt 1 / 3</span><b>40% · 3.200.000đ</b><small>Hạn 13.05.2026 · UNC-0526-013</small></div><span className="pill ok">Đã xác nhận</span></article>
        <article><div><span>Đợt 2 / 3</span><b>30% · 2.400.000đ</b><small>Hạn 15.09.2026 · chờ mã chứng từ</small></div><span className="pill waiting">Chờ xác nhận</span></article>
        <article><div><span>Đợt 3 / 3</span><b>30% · 2.400.000đ</b><small>Hạn 20.11.2026 · chưa đến hạn</small></div><span className="pill muted">Chưa đến hạn</span></article>
      </div>
      <p className="project-tab-note">Lịch thanh toán theo điều khoản HĐ; không suy ra từ chu kỳ. Chứng từ thanh toán sẽ quản lý riêng theo mã chứng từ.</p>
    </>
  ),
  outputs: (
    <>
      <div className="project-output-summary">
        <b>12 content kế hoạch</b>
        <span><i className="project-channel">Facebook</i><i className="project-channel">TikTok</i> là kênh xuất bản</span>
      </div>
      <div className="project-output-list">
        {OUTPUTS.map(([code, title, group]) => (
          <article key={code}>
            <span className="project-output-code">{code}</span>
            <div>
              <b>{title}</b>
              <small><span className={'pill ' + (group === 'Bán hàng' ? 'waiting' : 'info')}>{group}</span><i className="project-channel">Facebook</i><i className="project-channel">TikTok</i></small>
            </div>
            <span className="project-output-status">{Number(code) <= 8 ? 'Đã lên lịch' : 'Đang chuẩn bị'}</span>
          </article>
        ))}
      </div>
      <div className="project-output-foot">
        <span><b>Shooting:</b> 1 buổi · 4 giờ · hoàn thành 06.09.2026</span>
        <DriveLink icon="external-link">Mở Content Plan trên Drive</DriveLink>
      </div>
    </>
  ),
  documents: (
    <>
      <div className="project-doc-list">
        {DOCS.map(([title, text]) => (
          <a key={title} href={DRIVE_FOLDER} target="_blank" rel="noreferrer">
            <Icon name="folder-open" />
            <span><b>{title}</b><small>{text}</small></span>
            <em>Mở Drive <Icon name="external-link" /></em>
          </a>
        ))}
      </div>
      <section className="panel project-notes">
        <div className="panel-head"><div><h2>Key Notes</h2><p className="subline">Ngắn, có ngữ cảnh, liên kết đầu ra.</p></div><DriveLink>Mở Drive</DriveLink></div>
        <div className="project-note-row"><span className="pill info">Kiến thức khách hàng</span><div><b>Khách ưu tiên hình ảnh bữa cơm gia đình, tránh thông điệp giảm giá dồn dập.</b><small>Hiền · 03.09.2026 · liên kết Content 01–04</small></div></div>
        <div className="project-note-row"><span className="pill ok">Recap shooting</span><div><b>Đã đủ cảnh bếp, sườn nướng, khách dùng bữa; thiếu 1 cảnh giao hàng.</b><small>Minh · 06.09.2026 · liên kết Shooting tháng 9</small></div></div>
        <div className="project-note-row"><span className="pill waiting">Feedback nội bộ</span><div><b>Content 09 cần đổi CTA sang đặt nhóm trước khi lên lịch.</b><small>Hiền · 18.09.2026 · liên kết Content 09</small></div></div>
      </section>
    </>
  ),
}

/** Dự án mẫu Cơm Tấm Tài: bố cục theo tab với dữ liệu hợp đồng, đầu ra và tài liệu thực tế. */
export function ComTamTaiDetail({ project }: { project: Project }) {
  const { go } = useApp()
  const actions = useProjectActions(project)
  const [tab, setTab] = useState<TabId>('overview')
  return (
    <section className="screen active" id="projectWorkspaceDetail">
      <div className="project-detail-head">
        <button className="project-detail-back" onClick={() => go('projects')}><Icon name="arrow-left" /> Dự án</button>
        <div className="project-detail-title">
          <div>
            <h1>{project.customer} <span className={'pill ' + projectTone(project)}>{projectLabel(project)}</span></h1>
            <p>{project.area} · Social Content · Account {project.owner}</p>
          </div>
          <div className="project-detail-actions">
            <button className="secondary" onClick={actions.edit}><Icon name="pencil" /> Sửa dự án</button>
            <button className="primary" onClick={actions.openCycle}><Icon name="calendar-range" /> Mở chu kỳ</button>
          </div>
        </div>
      </div>
      <section className="project-overview project-overview-rich">
        <div className="project-overview-main"><span>Sức khỏe triển khai</span><strong>Đúng tiến độ</strong><p>1 content đang bù trong tuần 4; mốc chu kỳ 12.10.2026 vẫn giữ.</p></div>
        <div className="project-overview-stat"><span>Chu kỳ hiện tại</span><strong>{project.cycle} / {project.total}</strong><small>13.09–12.10.2026</small></div>
        <div className="project-overview-stat"><span>HĐ đang hiệu lực</span><strong>{project.contractCode}</strong><small>đến 20.11.2026</small></div>
        <div className="project-overview-stat"><span>Đợt gần nhất</span><strong>2 / 3</strong><small>30% · chờ xác nhận</small></div>
      </section>
      <nav className="project-detail-tabs" aria-label="Chi tiết dự án">
        {TABS.map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </nav>
      <div className="project-tab-content">
        {TABS.filter(([id]) => id === tab).map(([id, , title, subtitle]) => (
          <section className="project-tab-panel is-active" key={id}>
            <div className="project-tab-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div>
            {TAB_CONTENT[id]}
          </section>
        ))}
      </div>
      <section className="panel project-log-panel">
        <div className="panel-head"><div><h2>Nhật ký dự án</h2><p className="subline">Sự kiện vận hành quan trọng.</p></div></div>
        <ProjectActivityRows project={project} />
      </section>
    </section>
  )
}
