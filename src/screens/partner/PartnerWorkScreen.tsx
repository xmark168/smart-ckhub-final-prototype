import { diffDays, shortDate, TODAY } from '../../lib/format'
import { usePartnerName, usePartnerWork } from './partnerData'

/** Tasks given to this Media person. They close when the Account records the work as done. */
export function PartnerWorkScreen() {
  const name = usePartnerName()
  const { myTasks, byId } = usePartnerWork(name)
  return (
    <section className="screen active" id="partnerWork">
      <div className="page-head"><div><h1>Việc của tôi</h1><p>{name} · việc Account giao. Việc tự đóng khi Account ghi nhận xong.</p></div></div>
      <section className="panel home-panel">
        {myTasks.length ? (
          <div className="home-lines">
            {myTasks.map((task) => {
              const days = diffDays(TODAY, task.due)
              return (
                <div className={'home-line' + (days < 0 ? ' is-late' : '')} key={task.id}>
                  <span><b>{task.title}</b><small>{byId.get(task.projectId)?.customer}{task.note ? ' · ' + task.note : ''}</small></span>
                  <em>{days < 0 ? 'quá ' + -days + ' ngày' : days === 0 ? 'hôm nay' : shortDate(task.due)}</em>
                </div>
              )
            })}
          </div>
        ) : <p className="empty-copy">Chưa có việc được giao.</p>}
      </section>
    </section>
  )
}
