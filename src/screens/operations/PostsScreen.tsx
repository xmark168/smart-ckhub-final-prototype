import { operationTone } from '../../data/operations'
import { field } from '../../lib/form'
import { inputToDisplay } from '../../lib/format'
import { OperationList } from './OperationList'
import type { OperationConfig } from './types'

const CONFIG: OperationConfig = {
  type: 'contents',
  id: 'posts',
  title: 'Nội dung',
  description: '12 nội dung tháng 9 của Cơm Tấm Tài. Facebook và TikTok là kênh xuất bản.',
  create: 'Tạo nội dung',
  noun: 'bài đăng',
  placeholder: 'Tìm nội dung, dự án hoặc kênh…',
  statuses: ['Đã đăng', 'Đã lên lịch', 'Cần bù tiến độ', 'Đang chuẩn bị'],
  columns: ['Nội dung', 'Nhóm', 'Kênh xuất bản', 'Ngày đăng', 'Trạng thái', ''],
  kpis: (
    <>
      <article><span>Đã đăng</span><b>7 / 12</b><small>Theo lịch tháng 9</small></article>
      <article><span>Đã lên lịch</span><b>1</b><small>Chờ ngày xuất bản</small></article>
      <article className="attention"><span>Cần bù tiến độ</span><b>1</b><small>Content 09 · tuần 4</small></article>
      <article><span>Đang chuẩn bị</span><b>3</b><small>Chưa đủ điều kiện đăng</small></article>
    </>
  ),
  fields: [
    { name: 'title', label: 'Tên bài đăng', type: 'text' },
    { name: 'format', label: 'Nhóm nội dung', type: 'text' },
    { name: 'owner', label: 'Owner', type: 'text' },
    { name: 'air', label: 'Ngày air', type: 'date' },
  ],
  created: ['Đang chuẩn bị', 'Nháp — chờ xác nhận người phụ trách và ngày đăng'],
  toRow: (form, index) => ['CTT-NEW-' + String(index).padStart(2, '0'), field(form, 'title'), field(form, 'format'), 'Facebook · TikTok', inputToDisplay(field(form, 'air'))],
  cells: (row) => (
    <>
      <td><b className="project-record-name">{row[1]}</b><span className="project-record-meta">{row[0]} · Cơm Tấm Tài</span></td>
      <td><span className={'pill ' + (row[2] === 'Bán hàng' ? 'waiting' : 'info')}>{row[2]}</span></td>
      <td><span className="operation-channels"><i>Facebook</i><i>TikTok</i></span></td>
      <td>{row[4]}</td>
      <td><span className={'pill ' + operationTone(row[5])}>{row[5]}</span></td>
    </>
  ),
  openText: (row) => 'Mở ' + row[0] + ' trong Content Plan trên Drive.',
}

export function PostsScreen() {
  return <OperationList config={CONFIG} />
}
