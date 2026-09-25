import { useApp } from '../../app/context'

export function PartnersScreen() {
  const { toast } = useApp()
  const partners: Array<[string, string, string, string, number, string, boolean]> = [
    ['Minh Long Studio', 'Video production', '03 việc đang nhận', 'Cần kiểm tải', 78, 'Cao', true],
    ['Thương Mai', 'Content / script', '02 batch đang chạy', 'Có thể nhận', 62, 'Trung bình', false],
    ['N.A. Performance', 'Ads / report', '01 report chờ review', 'Có thể nhận', 48, 'Thấp', false],
  ]
  return (
    <section className="screen active" id="partners">
      <div className="page-head">
        <div><h1>Partner &amp; năng lực</h1><p>Account phân bổ theo project, skill, tải và deadline.</p></div>
        <button className="secondary" onClick={() => toast('Thêm Partner sẽ mở khi có danh mục Partner chính thức.')}>Thêm Partner</button>
      </div>
      <div className="cards">
        {partners.map(([name, skill, load, status, percent, priority, warn]) => (
          <article className="entity" key={name}>
            <div className="entity-top"><span>Partner</span><span className={'pill ' + (warn ? 'waiting' : 'ok')}>{status}</span></div>
            <h2>{name}</h2>
            <p>{skill}<br />{load}</p>
            <div className="bar"><i className={warn ? 'warn' : undefined} style={{ width: percent + '%' }} /></div>
            <div className="meta"><span>Tải {percent}%</span><span>Ưu tiên {priority}</span></div>
          </article>
        ))}
      </div>
      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head"><h2>Quy tắc phân bổ</h2></div>
        <div className="feature-grid">
          <div className="feature"><i className="feature-no">1</i><div><h2>Account chốt</h2><p>Timeline, priority và Partner do Account/Pod Lead quyết định.</p></div></div>
          <div className="feature"><i className="feature-no">2</i><div><h2>Partner xác nhận</h2><p>Chỉ nhận việc khi có scope, brief, deadline và quyền truy cập đủ.</p></div></div>
        </div>
      </section>
    </section>
  )
}
