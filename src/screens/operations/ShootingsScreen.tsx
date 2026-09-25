import { operationTone } from '../../data/operations'
import { field } from '../../lib/form'
import { inputToDisplay } from '../../lib/format'
import { OperationList } from './OperationList'
import type { OperationConfig } from './types'

const CONFIG: OperationConfig = {
  type: 'shootings',
  id: 'shootings',
  title: 'Lịch shooting',
  description: 'Chỉ chốt lịch khi Partner, thời gian và đầu vào đã rõ.',
  create: 'Tạo lịch shooting',
  noun: 'lịch shooting',
  placeholder: 'Tìm lịch, dự án hoặc Partner…',
  statuses: ['Hoàn thành', 'Chờ xác nhận', 'Nháp'],
  columns: ['Lịch shooting', 'Dự án', 'Thời gian', 'Partner', 'Đầu vào', 'Trạng thái', ''],
  kpis: (
    <>
      <article><span>Đã hoàn thành</span><b>1</b><small>Cơm Tấm Tài · 4 giờ</small></article>
      <article className="attention"><span>Cần xác nhận</span><b>1</b><small>Thiếu đầu mối khách hàng</small></article>
      <article><span>Nháp</span><b>1</b><small>Chờ brief và asset</small></article>
      <article><span>Gate đủ</span><b>1 / 3</b><small>Đủ Partner, thời gian, đầu vào</small></article>
    </>
  ),
  fields: [
    { name: 'project', label: 'Dự án', type: 'text' },
    { name: 'title', label: 'Tên lịch shooting', type: 'text' },
    { name: 'time', label: 'Thời gian', type: 'datetime-local' },
    { name: 'partner', label: 'Partner', type: 'text' },
    { name: 'input', label: 'Brief/assets đầu vào', type: 'text' },
  ],
  created: ['Nháp', 'Nháp — chờ Partner, thời gian và đầu vào'],
  toRow: (form, index) => {
    const [date, time] = field(form, 'time').split('T')
    return ['SH-NEW-' + String(index).padStart(2, '0'), field(form, 'title'), field(form, 'project'), inputToDisplay(date) + ' · ' + time, field(form, 'partner'), field(form, 'input')]
  },
  cells: (row) => (
    <>
      <td><b className="project-record-name">{row[1]}</b><span className="project-record-meta">{row[0]}</span></td>
      <td>{row[2]}</td><td>{row[3]}</td><td>{row[4]}</td><td>{row[5]}</td>
      <td><span className={'pill ' + operationTone(row[6])}>{row[6]}</span></td>
    </>
  ),
  openText: (row) => 'Mở ' + row[0] + ' và các điều kiện chốt lịch.',
}

export function ShootingsScreen() {
  return <OperationList config={CONFIG} />
}
