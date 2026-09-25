import type { ReactNode } from 'react'
import { useApp } from '../app/context'
import { operationTone } from '../data/operations'
import { inputToDisplay, pageSlice } from '../lib/format'
import { Icon } from '../lib/icons'
import { useScreenState } from '../lib/useScreenState'
import { update, useData } from '../store/store'
import type { Operations } from '../store/types'
import { field } from '../lib/form'
import { FormActions, Modal } from '../ui/Modal'

type OperationType = keyof Operations

interface CreateField {
  name: string
  label: string
  type: string
}

interface OperationConfig {
  type: OperationType
  id: 'posts' | 'shootings' | 'tasks'
  title: string
  description: string
  create: string
  noun: string
  placeholder: string
  statuses: string[]
  columns: string[]
  kpis: ReactNode
  fields: CreateField[]
  /** Status a newly created record starts in, and the explanation shown after saving. */
  created: [string, string]
  toRow: (form: HTMLFormElement, index: number) => string[]
  cells: (row: string[]) => ReactNode
  openText: (row: string[]) => string
}

const CONFIGS: Record<OperationType, OperationConfig> = {
  contents: {
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
  },
  shootings: {
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
  },
  tasks: {
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
  },
}

function CreateOperationModal({ config }: { config: OperationConfig }) {
  const { closeModal, toast } = useApp()
  return (
    <Modal
      title={'Tạo ' + config.noun}
      backdropClassName=""
      onSubmit={(form) => {
        const [status, effect] = config.created
        update((draft) => {
          const list = draft.operations[config.type] as string[][]
          list.unshift([...config.toRow(form, list.length + 1), status])
        })
        closeModal()
        toast('Đã tạo ' + config.noun + '. ' + effect)
      }}
    >
      <div className="form">
        <p className="subline">Nhập đủ field bắt buộc để tạo record.</p>
        <div className="form-grid">
          {config.fields.map((item, index) => (
            <div className="field" key={item.name}>
              <label>{item.label} *</label>
              <input type={item.type} name={item.name} required autoFocus={index === 0} />
            </div>
          ))}
        </div>
        <div className="alert"><b>Lưu ý</b><small>Các trường có dấu * là bắt buộc.</small></div>
        <FormActions submit="Lưu thay đổi" />
      </div>
    </Modal>
  )
}

interface ListState {
  query: string
  status: string
  page: number
}

function OperationList({ config }: { config: OperationConfig }) {
  const { role, toast, showModal } = useApp()
  const rows = useData().operations[config.type] as string[][]
  const [state, setState] = useScreenState<ListState>('operations.' + config.type, { query: '', status: '', page: 1 })
  const list = rows.filter(
    (row) => (!state.query || row.join(' ').toLocaleLowerCase('vi').includes(state.query.toLocaleLowerCase('vi'))) && (!state.status || row[row.length - 1] === state.status),
  )
  const { rows: visible, page, pages, from, to } = pageSlice(list, state.page, 10)

  return (
    <section className="screen active" id={config.id}>
      <div className="operations-page">
        <div className="project-page-head">
          <div><h1>{config.title}</h1><p>{config.description}</p></div>
          <button className="primary" onClick={() => (role !== 'account' ? toast('Vai trò này chỉ xem.') : showModal(<CreateOperationModal config={config} />))}>
            <Icon name="plus" /> {config.create}
          </button>
        </div>
        <section className="operations-kpis">{config.kpis}</section>
        <section className="project-list-shell operations-shell">
          <div className="project-toolbar-new">
            <label className="project-search-new">
              <Icon name="search" />
              <input type="search" value={state.query} placeholder={config.placeholder} onChange={(event) => setState({ ...state, query: event.target.value, page: 1 })} />
            </label>
            <select value={state.status} onChange={(event) => setState({ ...state, status: event.target.value, page: 1 })}>
              <option value="">Tất cả trạng thái</option>
              {config.statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
          <div className="project-table-wrap">
            <table className="project-table-new operations-table">
              <thead><tr>{config.columns.map((column, index) => <th key={index}>{column}</th>)}</tr></thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row[0]}>
                    {config.cells(row)}
                    <td><button className="project-open" aria-label={'Mở ' + row[1]} onClick={() => toast(config.openText(row))}>›</button></td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={config.columns.length} className="operations-empty">Không có record phù hợp.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="project-footer-new">
            <span>Hiển thị <b>{list.length ? from + '–' + to : 0}</b> trong <b>{list.length}</b> record</span>
            <div className="project-pager">
              <button disabled={page === 1} onClick={() => setState({ ...state, page: page - 1 })}>‹</button>
              <button disabled>{page} / {pages}</button>
              <button disabled={page === pages} onClick={() => setState({ ...state, page: page + 1 })}>›</button>
            </div>
          </footer>
        </section>
      </div>
    </section>
  )
}

export const PostsScreen = () => <OperationList config={CONFIGS.contents} />
export const ShootingsScreen = () => <OperationList config={CONFIGS.shootings} />
export const TasksScreen = () => <OperationList config={CONFIGS.tasks} />
