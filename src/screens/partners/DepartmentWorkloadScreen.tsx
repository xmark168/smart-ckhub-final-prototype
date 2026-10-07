import { workloadRows } from '../../lib/workload'
import { useData } from '../../store/store'
import { useApp } from '../../app/context'
import { inScope } from '../../lib/scope'

export function CreativeWorkloadScreen() {
  const department = 'Creative'
  const { role, account } = useApp()
  const { tasks: allTasks, projects } = useData()
  const ids = new Set(projects.filter((project) => inScope(role, account, project)).map((project) => project.id))
  const tasks = allTasks.filter((task) => ids.has(task.projectId))
  const rows = workloadRows(tasks, department)
  return (
    <section className="screen active" id="creativeWorkload">
      <div className="page-head"><div>
        <h1>{department} &amp; tải việc</h1>
        <p>Việc script và nội dung của từng Creative, để cân tải sản xuất.</p>
      </div></div>
      <section className="panel home-panel project-table-wrap">
        <table className="home-table department-workload-table">
          <thead><tr><th>{department}</th><th>Việc đến hạn 7 ngày</th><th>Việc đến hạn 30 ngày</th><th>Việc đang mở</th><th>Việc quá hạn</th><th>Dự án đang có việc</th></tr></thead>
          <tbody>
            {rows.map((row) => <tr key={row.name}>
              <td><b>{row.name}</b></td><td>{row.week}</td><td>{row.month}</td><td>{row.tasks}</td>
              <td className={row.late ? 'is-late' : ''}>{row.late}</td><td>{row.projects}</td>
            </tr>)}
            {!rows.length && <tr><td colSpan={6} className="operations-empty">Chưa có việc thuộc {department}.</td></tr>}
          </tbody>
        </table>
      </section>
      <p className="project-tab-note">Tải việc lấy từ Việc cần làm. Giao việc thủ công theo vai trò {department}; người phụ trách lấy theo phân công thực tế. Việc đã xong hoặc hủy không tính vào tải đang mở.</p>
    </section>
  )
}

