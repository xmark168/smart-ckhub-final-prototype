import { operationTone } from '../../data/operations'
import { field } from '../../lib/form'
import { inputToDisplay } from '../../lib/format'
import { OperationList } from './OperationList'
import type { OperationConfig } from './types'

const CONFIG: OperationConfig = {
  type: 'tasks',
  id: 'tasks',
  title: 'Công việc',
  description: 'Không thể bắt đầu khi thiếu người phụ trách, hạn hoàn thành hoặc đầu ra.',
  create: 'Tạo công việc',
  noun: 'công việc',
  placeholder: 'Tìm công việc, dự án hoặc người phụ trách…',
  statuses: ['Nháp', 'Đã lập kế hoạch', 'Đang thực hiện', 'Bị chặn', 'Chờ phê duyệt'],
  columns: ['Công việc', 'Dự án', 'Người phụ trách', 'Deadline', 'Đầu ra', 'Trạng thái', ''],
  kpis: (
    <>
      <article><span>Cần xử lý hôm nay</span><b>2</b><small>1 bị chặn · 1 cần bù</small></article>
      <article><span>Đang thực hiện</span><b>1</b><small>Đủ điều kiện bắt đầu</small></article>
      <article className="attention"><span>Bị chặn</span><b>1</b><small>Chờ đầu mối khách hàng</small></article>
      <article><span>Chờ phê duyệt</span><b>1</b><small>Chờ Account chốt</small></article>
    </>
  ),
  fields: [
    { name: 'title', label: 'Tên công việc', type: 'text' },
    { name: 'project', label: 'Dự án', type: 'text' },
    { name: 'owner', label: 'Owner', type: 'text' },
    { name: 'deadline', label: 'Deadline', type: 'date' },
    { name: 'output', label: 'Đầu ra cần nộp', type: 'text' },
  ],
  created: ['Đã lập kế hoạch', 'Đã lập kế hoạch — đủ người phụ trách và hạn hoàn thành'],
  toRow: (form, index) => ['TASK-NEW-' + String(index).padStart(2, '0'), field(form, 'title'), field(form, 'project'), field(form, 'owner'), inputToDisplay(field(form, 'deadline')), field(form, 'output')],
  cells: (row) => (
    <>
      <td><b className="project-record-name">{row[1]}</b><span className="project-record-meta">{row[0]}</span></td>
      <td>{row[2]}</td><td>{row[3]}</td><td>{row[4]}</td><td>{row[5]}</td>
      <td><span className={'pill ' + operationTone(row[6])}>{row[6]}</span></td>
    </>
  ),
  openText: (row) => 'Mở ' + row[0] + ' và lịch sử xử lý.',
}

export function TasksScreen() {
  return <OperationList config={CONFIG} />
}
