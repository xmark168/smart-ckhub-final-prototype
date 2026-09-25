import type { ReactNode } from 'react'

function Rule({ mark, title, children }: { mark: string; title: string; children: ReactNode }) {
  return <div className="doc-rule"><i>{mark}</i><div><b>{title}</b><br /><small>{children}</small></div></div>
}

function DocTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table className="doc-table">
      <thead><tr>{head.map((cell) => <th key={cell}>{cell}</th>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody>
    </table>
  )
}

const INDEX: Array<[string, string]> = [
  ['doc-overview', 'Tổng quan'], ['doc-data', 'Dữ liệu cốt lõi'], ['doc-start', 'Cổng khởi động'],
  ['doc-access', 'Phân quyền'], ['doc-service', 'Gói dịch vụ'], ['doc-rules', 'Quy tắc hệ thống'],
]

export function DocsScreen() {
  return (
    <section className="screen active" id="docs">
      <div className="page-head">
        <div><h1>Tài liệu thiết kế</h1><p>Đặc tả nguồn cho Smart CKHUB. Cập nhật khi thay đổi quyết định nghiệp vụ hoặc kỹ thuật.</p></div>
        <span className="mode">Phiên bản 22.09.2026</span>
      </div>
      <div className="doc-layout">
        <aside className="panel doc-index">
          {INDEX.map(([id, label]) => (
            <a key={id} href={'#' + id} onClick={(event) => { event.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }}>{label}</a>
          ))}
        </aside>
        <div>
          <section className="panel doc-section" id="doc-overview">
            <h2>Tổng quan vận hành</h2>
            <p>Smart CKHUB là nền tảng quản lý vận hành thống nhất cho CK HUB. Seven Marketing là nghiệp vụ đầu tiên. Account là người điều phối dự án: quản lý timeline tổng, nguồn lực, chất lượng, giao tiếp khách và rủi ro. Content bàn giao script, tư liệu và deadline trực tiếp cho Media để giảm trung gian.</p>
            <span className="doc-code">Khách hàng → Hợp đồng → Cổng T0 → Dự án → Task / Bài đăng / Shooting → Nghiệm thu</span>
          </section>
          <section className="panel doc-section" id="doc-data">
            <h2>Dữ liệu cốt lõi</h2>
            <DocTable
              head={['Thực thể', 'Vai trò', 'Liên kết chính']}
              rows={[
                ['Khách hàng', 'Hồ sơ thương hiệu và Account phụ trách.', 'Có nhiều đầu mối, hợp đồng, dự án.'],
                ['Đầu mối khách hàng', 'Người trao đổi, duyệt, nhận tài liệu.', 'Một đầu mối chính đang hiệu lực mỗi khách.'],
                ['Hợp đồng', 'Cam kết thương mại, gói và chu kỳ.', 'Chụp phạm vi, giá tại thời điểm ký.'],
                ['Dự án', 'Đơn vị điều phối vận hành của Account.', 'Có timeline, thành viên, task, post, shooting.'],
                ['Gói dịch vụ', 'Danh mục chuẩn bán và vận hành.', 'Nhóm → Gói → Phân loại → phạm vi → giá.'],
              ]}
            />
          </section>
          <section className="panel doc-section" id="doc-start">
            <h2>Cổng khởi động dự án T0</h2>
            <p>Dự án chỉ chuyển sang Đang triển khai khi hợp đồng hiệu lực, đã nhận cọc và brief đủ. Khi đủ, hệ thống ghi T0 và tính mốc gửi Content Plan T0 + 3 ngày làm việc.</p>
            <Rule mark="1" title="Chưa đủ điều kiện">Giữ Nháp; không giao Planner, Content, Media; không tính trễ timeline.</Rule>
            <Rule mark="2" title="Đủ điều kiện">Account mở dự án, tạo Master Timeline, phân công đầu ra và nguồn lực.</Rule>
          </section>
          <section className="panel doc-section" id="doc-access">
            <h2>Phân quyền RBAC và phạm vi record</h2>
            <p>Group gán Permission. Permission quyết định thao tác. Record scope quyết định dữ liệu được thao tác. Field policy quyết định trường được trả về. Kiểm tra quyền ở server, không chỉ ẩn giao diện.</p>
            <DocTable
              head={['Nhóm', 'Phạm vi', 'Không được làm']}
              rows={[
                ['Administrator', 'Toàn hệ thống, cấu hình, người dùng, catalog.', '—'],
                ['BODs', 'Xem toàn bộ, duyệt, theo dõi rủi ro và thương mại.', 'Không điều phối task hằng ngày.'],
                ['Account', 'Khách, hợp đồng, dự án có accountOwnerId là mình.', 'Không quản trị quyền và catalog chuẩn.'],
                ['Partner', 'Dự án/task được phân công.', 'Không xem giá, hợp đồng, công nợ, khách ngoài scope.'],
              ]}
            />
            <span className="doc-code">Group → Permission → Record scope → Field policy</span>
          </section>
          <section className="panel doc-section" id="doc-service">
            <h2>Danh mục gói dịch vụ</h2>
            <p>Khách hàng tạo nhanh không cần chọn gói. Khi lập hợp đồng hoặc dự án, Account chọn Nhóm dịch vụ rồi chọn Gói dịch vụ. Giá, phạm vi và quota được lấy từ gói; hợp đồng giữ snapshot để danh mục đổi sau này không làm sai lịch sử.</p>
            <Rule mark="✓" title="Không xóa gói đã sử dụng">Chỉ chuyển Ngừng áp dụng; record lịch sử vẫn hiển thị đúng.</Rule>
            <Rule mark="✓" title="Dạng giá">Giá cố định, khoảng giá, giá từ hoặc báo giá riêng.</Rule>
          </section>
          <section className="panel doc-section" id="doc-rules">
            <h2>Quy tắc hệ thống</h2>
            <Rule mark="✓" title="Task">Thiếu người phụ trách hoặc hạn hoàn thành: chỉ ở Nháp/Chờ thực hiện, không bắt đầu.</Rule>
            <Rule mark="✓" title="Khách hàng">Không kết thúc hợp tác khi còn hợp đồng hoặc dự án đang chạy. Không xóa khách đã phát sinh dữ liệu.</Rule>
            <Rule mark="✓" title="Đầu mối">Chỉ một đầu mối chính đang hiệu lực. Đầu mối chính mới tự chuyển người cũ thành đầu mối phụ.</Rule>
            <Rule mark="✓" title="Dữ liệu nguồn">Nhập có kiểm soát từ internal.ckhub.vn; không migrate hàng loạt trước khi kiểm chứng luồng vận hành.</Rule>
          </section>
        </div>
      </div>
    </section>
  )
}
