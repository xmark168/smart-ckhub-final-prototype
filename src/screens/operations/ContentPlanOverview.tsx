import { useData } from '../../store/store'
import { contentAssignees } from '../../lib/content'
import { postNextStep } from '../../lib/contentWorkflow'
import { shortDate } from '../../lib/format'
import type { ContentPlanRow } from './ContentPlanWorkspace'

export function ContentPlanOverview({ rows, onWrite, onOpen }: { rows: ContentPlanRow[]; onWrite: (row: ContentPlanRow) => void; onOpen: (row: ContentPlanRow) => void }) {
  const { tasks } = useData()
  return <div className="plan-overview" aria-label="Rà Content Plan">
    <div className="plan-overview-head"><strong>Rà kế hoạch · {rows.length} bài</strong><span>Mở bài để viết; bàn giao và lịch đăng trong chi tiết.</span></div>
    {rows.map((row) => { const owners = contentAssignees(tasks, row.project.id, row.cycleNo, row.item.id, row.item); return <article className="plan-overview-row" key={`${row.project.id}:${row.cycleNo}:${row.item.id}`}>
      <button type="button" className="plan-overview-title" onClick={() => onWrite(row)}><small>#{row.item.stt} · {row.item.format} · {row.project.customer} · Chu kỳ {row.cycleNo}{row.project.cycles.find((cycle) => cycle.no === row.cycleNo)?.status === 'closed' ? ' · Đã chốt' : ''}</small><strong>{row.item.title}</strong><span>{row.item.mission} · {row.item.category}</span>{row.item.mainIdea && <p>{row.item.mainIdea.slice(0, 160)}</p>}</button>
      <div className="plan-overview-meta"><span>Content <b>{owners.content}</b></span><span>Media <b>{owners.media}</b></span><span>Đăng dự kiến <b>{shortDate(row.item.postDate) || 'Chưa xếp lịch'}</b></span><span>{postNextStep(row.item)}</span></div>
      <div className="plan-overview-actions"><button className="secondary" onClick={() => onWrite(row)}>Mở nội dung</button><button className="text-btn" onClick={() => onOpen(row)}>Bàn giao & lịch đăng ›</button></div>
    </article> })}
    {!rows.length && <p className="operations-empty">Chưa có bài phù hợp. Kiểm tra chu kỳ hoặc xóa bộ lọc.</p>}
  </div>
}
