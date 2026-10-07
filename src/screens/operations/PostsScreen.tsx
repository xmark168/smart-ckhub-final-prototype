import { useApp } from '../../app/context'
import { contentPackages, type ContentPackage } from '../../lib/contentPackages'
import { includesText, shortDate } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { inScope } from '../../lib/scope'
import { usePagedList } from '../../lib/usePagedList'
import { useScreenState } from '../../lib/useScreenState'
import { useData } from '../../store/store'
import { ContentPackageModal } from './ContentPackageModal'

export function PostsScreen() {
  const { role, account, showModal } = useApp()
  const { projects } = useData()
  const [filters, setFilters] = useScreenState('posts.packages.v1', { projectId: '', query: '', status: '', attention: false })
  const scoped = projects.filter((project) => inScope(role, account, project))
  const projectId = scoped.some((project) => project.id === filters.projectId) ? filters.projectId : ''
  const packages = contentPackages(projects, role, account)
  const list = packages.filter((entry) => (!projectId || entry.project.id === projectId) && includesText([entry.project.customer, entry.project.code, 'Chu kỳ ' + entry.cycle.no], filters.query) && (!filters.status || entry.cycle.status === filters.status) && (!filters.attention || entry.cycle.status === 'running' && entry.project.state === 'active' && Boolean(entry.late || entry.missing || entry.review)))
  const { rows, page, pages, from, to, goTo, resetPage } = usePagedList(list, 12)
  const change = (patch: Partial<typeof filters>) => { setFilters({ ...filters, ...patch }); resetPage() }
  const open = (entry: ContentPackage) => showModal(<ContentPackageModal projectId={entry.project.id} cycleNo={entry.cycle.no} />)
  return <section className="screen active posts-packages" id="posts"><div className="operations-page">
    <div className="project-page-head"><div><h1>Bài đăng</h1><p>Quản lý gói nội dung theo chu kỳ. Mở gói để lập bài và theo dõi tiến độ.</p></div></div>
    <section className="project-list-shell operations-shell">
      <div className="project-toolbar-new package-toolbar">
        <label className="project-search-new"><Icon name="search" /><input type="search" value={filters.query} placeholder="Tìm dự án, chu kỳ…" onChange={(event) => change({ query: event.target.value })} /></label>
        <select aria-label="Dự án" value={projectId} onChange={(event) => change({ projectId: event.target.value })}><option value="">Tất cả dự án được cấp quyền</option>{scoped.map((project) => <option key={project.id} value={project.id}>{project.customer} · {project.code}</option>)}</select>
        <select aria-label="Trạng thái chu kỳ" value={filters.status} onChange={(event) => change({ status: event.target.value })}><option value="">Tất cả chu kỳ</option><option value="running">Đang chạy</option><option value="closed">Đã chốt</option></select>
        <button className={'package-attention' + (filters.attention ? ' active' : '')} aria-pressed={filters.attention} onClick={() => change({ attention: !filters.attention })}>Cần xử lý</button>
      </div>
      <div className="package-list-caption"><span><strong>{list.length}</strong> gói nội dung{role === 'partner' ? ' · Các bài được giao trong quyền dự án' : ' · Mỗi dòng là một chu kỳ triển khai'}</span><span>{list.filter((entry) => entry.cycle.status === 'running').length} đang chạy · {list.filter((entry) => entry.cycle.status === 'closed').length} đã chốt</span></div>
      <div className="project-table-wrap"><table className="project-table-new package-table">
        <thead><tr><th>Dự án / Chu kỳ</th><th>{role === 'partner' ? 'Bài được giao' : 'Nội dung / Định mức'}</th><th>Chờ duyệt</th><th>{role === 'partner' ? 'Đã đăng / Bài chính được giao' : 'Đã đăng / Gói'}</th><th>Cần xử lý</th><th /></tr></thead>
        <tbody>{rows.map((entry) => <tr key={entry.project.id + ':' + entry.cycle.no}>
          <td data-label="Dự án / Chu kỳ"><button className="package-name" onClick={() => open(entry)}><strong>{entry.project.customer}</strong><span>Chu kỳ {entry.cycle.no} <em className={'pill ' + (entry.cycle.status === 'closed' ? 'muted' : entry.project.state === 'active' ? 'ok' : 'waiting')}>{entry.cycle.status === 'closed' ? 'Đã chốt' : entry.project.state === 'active' ? 'Đang chạy' : 'Dự án tạm dừng / đã dừng'}</em></span><small>{shortDate(entry.cycle.start)} – {shortDate(entry.cycle.actualEnd || entry.cycle.plannedEnd)}</small></button></td>
          <td data-label={role === 'partner' ? 'Bài được giao' : 'Nội dung / Định mức'}><strong>{entry.summaryOnly ? '—' : role === 'partner' ? entry.items.length : `${entry.core} / ${entry.planned}`}</strong><span className="content-sub">{entry.summaryOnly ? 'Chỉ có kết quả đã chốt' : [entry.bonus ? entry.bonus + ' bài tặng' : '', entry.cancelled ? entry.cancelled + ' bài hủy' : '', !entry.bonus && !entry.cancelled ? 'bài trong chu kỳ' : ''].filter(Boolean).join(' · ')}</span></td>
          <td data-label="Chờ duyệt">{entry.summaryOnly ? '—' : entry.review}<span className="content-sub">{entry.cycle.status === 'closed' ? 'Lịch sử' : 'nội dung / bản cuối'}</span></td>
          <td data-label={role === 'partner' ? 'Đã đăng / Bài chính được giao' : 'Đã đăng / Gói'}><strong>{entry.published} / {role === 'partner' ? entry.core : entry.planned}</strong><progress aria-label={'Đã đăng chu kỳ ' + entry.cycle.no + ' của ' + entry.project.customer} value={entry.published} max={Math.max(role === 'partner' ? entry.core : entry.planned, entry.published, 1)} /></td>
          <td data-label="Cần xử lý">{entry.cycle.status === 'closed' ? <span className="package-history">Xem lịch sử</span> : <div className="package-flags">{entry.late > 0 && <span className="pill waiting">{entry.late} bài trễ</span>}{entry.missing > 0 && <span className="pill waiting">Thiếu {entry.missing} bài</span>}{entry.review > 0 && <span className="pill muted">{entry.review} chờ duyệt</span>}{!entry.late && !entry.missing && !entry.review && <span className="package-history">{entry.project.state === 'active' ? role === 'partner' ? 'Không có việc trễ / chờ duyệt' : 'Đủ nội dung' : 'Chỉ xem'}</span>}</div>}</td>
          <td><button className="secondary package-open" aria-label={'Mở gói ' + entry.project.customer + ' chu kỳ ' + entry.cycle.no} onClick={() => open(entry)}>Mở gói</button></td>
        </tr>)}{!list.length && <tr><td colSpan={6} className="operations-empty">{packages.length ? 'Không có gói phù hợp. Đổi dự án hoặc bộ lọc chu kỳ.' : 'Chưa có chu kỳ nội dung trong quyền truy cập. Bắt đầu chu kỳ tại Dự án để lập gói.'}</td></tr>}</tbody>
      </table></div>
      <footer className="project-footer-new"><span>Hiển thị <b>{list.length ? from + '–' + to : 0}</b> trong <b>{list.length}</b> gói</span><div className="project-pager"><button disabled={page === 1} onClick={() => goTo(page - 1)}>‹</button><button disabled>{page} / {pages}</button><button disabled={page === pages} onClick={() => goTo(page + 1)}>›</button></div></footer>
    </section>
  </div></section>
}
