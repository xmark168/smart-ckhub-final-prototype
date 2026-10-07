import { useApp } from '../../app/context'
import { shortDate, TODAY } from '../../lib/format'
import { usePartnerName, usePartnerWork } from './partnerData'

/** Projects this Media person has work or shoots on. No contract or price. */
export function PartnerProjectsScreen() {
  const { go } = useApp()
  const name = usePartnerName()
  const { myTasks, myShoots, byId } = usePartnerWork(name)
  const ids = [...byId.keys()]
  return (
    <section className="screen active" id="partnerProject">
      <div className="page-head"><div><h1>Dự án được giao</h1><p>{name} · chỉ dự án đã được cấp quyền tham gia.</p></div></div>
      <section className="panel home-panel">
        {ids.length ? (
          <div className="home-lines">
            {ids.map((id) => {
              const project = byId.get(id)!
              const tasks = myTasks.filter((task) => task.projectId === id).length
              const next = myShoots.filter((row) => row.project.id === id && row.shooting.date >= TODAY).sort((a, b) => a.shooting.date.localeCompare(b.shooting.date))[0]
              return (
                <button type="button" className="home-line" key={id} onClick={() => go(tasks ? 'partnerWork' : 'partnerSchedule')}>
                  <span><b>{project.customer}</b><small>{project.service} · Account {project.owner}</small></span>
                  <em>{[tasks ? tasks + ' việc' : '', next ? 'shoot ' + shortDate(next.shooting.date) : ''].filter(Boolean).join(' · ') || '—'}</em>
                </button>
              )
            })}
          </div>
        ) : <p className="empty-copy">Chưa có dự án nào.</p>}
      </section>
    </section>
  )
}
