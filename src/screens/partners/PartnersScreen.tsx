import { allShootings, mediaClashes } from '../../data/shootings'
import { addDaysIso, TODAY } from '../../lib/format'
import { useData } from '../../store/store'
import { MEDIA_PEOPLE } from '../projects/projectLogic'
import { useApp } from '../../app/context'
import { inScope } from '../../lib/scope'

/** Media workload from the shoots and tasks already in the system, to balance bookings. */
export function PartnersScreen() {
  const { role, account } = useApp()
  const { projects: allProjects, tasks: allTasks } = useData()
  const projects = allProjects.filter((project) => inScope(role, account, project))
  const ids = new Set(projects.map((project) => project.id))
  const tasks = allTasks.filter((task) => ids.has(task.projectId))
  const shoots = allShootings(projects).filter((row) => row.shooting.status !== 'Đã hoàn thành')
  const rows = MEDIA_PEOPLE.map((name) => {
    const own = shoots.filter((row) => row.shooting.media.includes(name))
    const open = tasks.filter((task) => task.status === 'open' && task.assignee.split(',').map((item) => item.trim()).includes(name))
    return {
      name,
      week: own.filter((row) => row.shooting.date >= TODAY && row.shooting.date <= addDaysIso(TODAY, 7)).length,
      month: own.filter((row) => row.shooting.date >= TODAY && row.shooting.date <= addDaysIso(TODAY, 30)).length,
      tasks: open.length,
      late: open.filter((task) => task.due < TODAY).length,
      clash: own.filter((row) => mediaClashes(shoots, row.shooting.date, [name], row.shooting.id).length).length,
    }
  }).sort((a, b) => b.week - a.week || b.tasks - a.tasks)

  return (
    <section className="screen active" id="partners">
      <div className="page-head"><div><h1>Media &amp; tải việc</h1><p>Số buổi shoot và việc đang mở của từng Media, để xếp lịch không dồn một người.</p></div></div>
      <section className="panel home-panel">
        <table className="home-table">
          <thead><tr><th>Media</th><th>Shoot 7 ngày</th><th>Shoot 30 ngày</th><th>Việc đang mở</th><th>Việc quá hạn</th><th>Trùng lịch</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td><b>{row.name}</b></td><td>{row.week}</td><td>{row.month}</td><td>{row.tasks}</td>
                <td className={row.late ? 'is-late' : ''}>{row.late}</td><td className={row.clash ? 'is-late' : ''}>{row.clash || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  )
}
