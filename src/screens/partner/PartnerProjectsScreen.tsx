import { useApp } from '../../app/context'

export function PartnerProjectsScreen() {
  const { go } = useApp()
  return (
    <section className="screen active" id="partnerProject">
      <div className="page-head"><div><h1>Dự án được giao</h1><p>Chỉ hiển thị dự án có task Minh Long Studio được cấp quyền.</p></div></div>
      <div className="cards">
        <article className="entity">
          <div className="entity-top"><span>Cơm Tấm Tài</span><span className="pill ok">Đang triển khai</span></div>
          <h2>Content Retainer Q3</h2>
          <p>Phạm vi Partner: task được giao, brief, file, deadline, output.</p>
          <div className="meta"><span>01 task được giao</span><button className="text-btn" onClick={() => go('partnerWork')}>Việc của tôi</button></div>
        </article>
        <article className="entity">
          <div className="entity-top"><span>Vua Chả Cá</span><span className="pill waiting">Chờ xác nhận</span></div>
          <h2>Launch campaign</h2>
          <p>Phạm vi Partner: Shooting Plan, lịch shooting, output liên quan.</p>
          <div className="meta"><span>01 task được giao</span><button className="text-btn" onClick={() => go('partnerSchedule')}>Lịch của tôi</button></div>
        </article>
      </div>
    </section>
  )
}
