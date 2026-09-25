import { useApp } from '../../app/context'
import { Icon } from '../../lib/icons'
import { usePagedList } from '../../lib/usePagedList'
import { useScreenState } from '../../lib/useScreenState'
import { useData } from '../../store/store'
import { CreateOperationModal } from './CreateOperationModal'
import type { OperationConfig } from './types'

const PAGE_SIZE = 10

/** Shared list layout for Nội dung, Lịch shooting and Công việc. */
export function OperationList({ config }: { config: OperationConfig }) {
  const { role, toast, showModal } = useApp()
  const rows = useData().operations[config.type] as string[][]
  const [filters, setFilters] = useScreenState('operations.' + config.type, { query: '', status: '' })
  const list = rows.filter(
    (row) =>
      (!filters.query || row.join(' ').toLocaleLowerCase('vi').includes(filters.query.toLocaleLowerCase('vi'))) &&
      (!filters.status || row[row.length - 1] === filters.status),
  )
  const { rows: visible, page, pages, from, to, goTo, resetPage } = usePagedList(list, PAGE_SIZE)
  const change = (patch: Partial<typeof filters>) => {
    setFilters({ ...filters, ...patch })
    resetPage()
  }

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
              <input type="search" value={filters.query} placeholder={config.placeholder} onChange={(event) => change({ query: event.target.value })} />
            </label>
            <select value={filters.status} onChange={(event) => change({ status: event.target.value })}>
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
              <button disabled={page === 1} onClick={() => goTo(page - 1)}>‹</button>
              <button disabled>{page} / {pages}</button>
              <button disabled={page === pages} onClick={() => goTo(page + 1)}>›</button>
            </div>
          </footer>
        </section>
      </div>
    </section>
  )
}
