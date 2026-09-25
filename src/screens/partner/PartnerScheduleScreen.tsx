

export function PartnerScheduleScreen() {
  const events: Array<[string, string, string, string]> = [
    ['22.09', '14:00', 'Dựng Post Demo 01', 'Cơm Tấm Tài · TASK-244 · chờ BODs phê duyệt.'],
    ['25.09', '08:00', 'Shooting launch batch 01', 'Vua Chả Cá · chỉ thực hiện khi Account chốt gate.'],
    ['29.09', '13:30', 'Shooting monthly batch', 'Cơm Tấm Tài · brief và reference đã đủ.'],
  ]
  return (
    <section className="screen active" id="partnerSchedule">
      <div className="page-head"><div><h1>Lịch của tôi</h1><p>Chỉ hiển thị slot Minh Long Studio đã được Account phân bổ.</p></div></div>
      <section className="panel">
        <div className="timeline">
          {events.map(([date, time, title, text]) => (
            <div className="event" key={title}><time>{date}<br />{time}</time><i className="pin" /><div><b>{title}</b><p>{text}</p></div></div>
          ))}
        </div>
      </section>
    </section>
  )
}
