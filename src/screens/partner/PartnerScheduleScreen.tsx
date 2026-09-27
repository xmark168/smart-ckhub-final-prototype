import { shortDate, TODAY } from '../../lib/format'
import { statusTone } from '../projects/projectLogic'
import { usePartnerName, usePartnerWork } from './partnerData'

/** Shoots this Media person is booked on: upcoming first, with the checklist and Shooting Plan. */
export function PartnerScheduleScreen() {
  const name = usePartnerName()
  const { myShoots } = usePartnerWork(name)
  const upcoming = myShoots.filter((row) => row.shooting.status !== 'Đã hoàn thành' && (!row.shooting.date || row.shooting.date >= TODAY)).sort((a, b) => (a.shooting.date || '9999').localeCompare(b.shooting.date || '9999'))
  const done = myShoots.filter((row) => row.shooting.status === 'Đã hoàn thành').sort((a, b) => b.shooting.date.localeCompare(a.shooting.date)).slice(0, 5)
  const line = (row: (typeof myShoots)[number]) => (
    <div className="cw-shoot" key={row.shooting.id}>
      <span>
        <b>{row.shooting.date ? shortDate(row.shooting.date) : 'Chưa chốt ngày'}{row.shooting.time ? ' · ' + row.shooting.time : ''} · {row.project.customer}</b>
        <small>{row.shooting.location || 'Chưa có địa điểm'}{row.shooting.plan.link ? '' : ' · chưa có Shooting Plan'}</small>
        {row.shooting.checklist && <small>Checklist: {row.shooting.checklist}</small>}
      </span>
      <span className={'pill ' + statusTone(row.shooting.status)}>{row.shooting.status}</span>
      {row.shooting.plan.link ? <a className="text-btn" href={row.shooting.plan.link} target="_blank" rel="noreferrer">Shooting Plan</a> : <span />}
    </div>
  )
  return (
    <section className="screen active" id="partnerSchedule">
      <div className="page-head"><div><h1>Lịch của tôi</h1><p>{name} · các buổi shoot Account đã xếp.</p></div></div>
      <section className="panel cw-steps">
        <div className="panel-head"><h2>Sắp tới</h2></div>
        {upcoming.length ? upcoming.map(line) : <p className="empty-copy">Không có buổi shoot sắp tới.</p>}
      </section>
      {done.length > 0 && (
        <section className="panel cw-steps" style={{ marginTop: 16 }}>
          <div className="panel-head"><h2>Đã quay gần đây</h2></div>
          {done.map(line)}
        </section>
      )}
    </section>
  )
}
