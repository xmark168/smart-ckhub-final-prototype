import { useApp } from '../../app/context'
import { useData } from '../../store/store'
import { Modal } from '../../ui/Modal'

/** Page-level "?" for Dự án: every rule the project dialogs follow, in one place. */
export function ProjectRulesModal() {
  const { closeModal } = useApp()
  const { params } = useData()
  const sections: Array<[string, string[]]> = [
    ['Tạo và khởi động', [
      'Dự án được tạo ở trạng thái nháp: chỉ cần khách hàng, Account và gói dự kiến. Folder Drive không bắt buộc.',
      'Chỉ Account được gắn cố định với dự án. Content là đội nội bộ dùng chung (script, edit post, lên lịch đăng); Account lên lịch shooting, gửi khách duyệt và đăng lên page. Media gán theo từng buổi shoot.',
      'Bắt đầu triển khai (T0) khi Cổng khởi động đủ: hợp đồng chính, cọc' + (params.requireBriefBeforeT0 ? ', brief khách hàng' : '') + '. Cọc được xác nhận khi Kế toán ghi nhận thu đợt 1 của hợp đồng.',
      'Khách không chốt thì Hủy nháp: dự án chuyển sang Đã dừng, không tạo chu kỳ, vẫn giữ lịch sử.',
    ]],
    ['Gói dịch vụ và hợp đồng', [
      'Gói theo hợp đồng; một hợp đồng có thể gồm nhiều gói. Có hợp đồng rồi thì đổi gói bằng phụ lục hoặc hợp đồng mới (hóa đơn xuất theo hạng mục hợp đồng).',
      'Gói trả một lần (khởi tạo, website…): một lần bàn giao, không có chu kỳ tháng, không tái ký. Gói theo tháng không có bài đăng (chatbot, ads…): không áp dụng mốc Content Plan, shoot và nhịp đăng.',
      'Hợp đồng mới ở trạng thái Nháp; thành Hiệu lực khi thu đợt 1. VAT nhập theo từng hợp đồng. Chỉ Kế toán ghi nhận tiền thu (cần mã chứng từ).',
    ]],
    ['Timeline và chu kỳ', [
      '5 mốc SOP: T0 → Gửi Content Plan (T0 + ' + params.planLeadBusinessDays + ' ngày làm việc) → Gửi Shooting Plan (khách duyệt Plan + ' + params.shootingPlanAfterApprovalDays + ' ngày; mỗi buổi shoot một Shooting Plan, các buổi sau gửi trước ngày quay ' + params.shootingPlanBeforeShootDays + ' ngày) → Gửi Post Demo (shoot xong + ' + params.postDemoAfterShootBusinessDays + ' ngày làm việc, chỉ chu kỳ đầu) → Bắt đầu đăng.',
      'Mốc phụ thuộc nhau: hạn mỗi mốc tính từ ngày mốc trước thực sự xong hoặc được khách duyệt. Mốc trước chưa xong thì hạn mốc sau là dự kiến (dấu ~), không tính trễ.',
      'Trong giai đoạn đăng: nhịp ' + params.postsPerWeekMin + '–' + params.postsPerWeekMax + ' bài/tuần (gói nhiều bài thì nhịp cao hơn); script gửi trước deadline dựng ' + params.scriptLeadDays + ' ngày — theo dõi ở tab Bài đăng.',
      'Từng bài: Content viết script và edit → Account gửi khách duyệt → Account đăng. Bài tặng cộng vào số bài phải đăng của chu kỳ.',
      'Chu kỳ chốt khi đủ mốc và đủ bài (theo gói và bài tặng), không theo ngày dương lịch. Chốt khi còn mốc dở thì có cảnh báo; bài còn thiếu chuyển bù sang chu kỳ sau hoặc bỏ kèm lý do. Chu kỳ kế tiếp bắt đầu ngay sau ngày chốt.',
    ]],
    ['Việc cần làm', [
      'Việc tự sinh từ mốc SOP, bài đăng, buổi shoot, đợt thanh toán và Cổng khởi động; tự đóng khi việc gốc xong. Người làm và ghi chú sửa được, không bị ghi đè.',
      'Việc giao tay chỉ dùng cho việc ngoài SOP: tên, dự án, người làm, hạn; tick là xong.',
    ]],
    ['Tạm dừng, dừng và rủi ro', [
      'Tạm dừng giữ nguyên chu kỳ và hợp đồng, ghi lý do và ngày dự kiến quay lại.',
      'Dừng dự án chốt chu kỳ đang chạy tại ngày hiệu lực và có thể kết thúc hợp đồng cùng lúc (trừ hợp đồng còn gói khác đang chạy).',
      '"Có rủi ro" gồm dự án có mốc SOP trễ, công nợ quá hạn hoặc được gắn cờ. Gắn cờ bắt buộc ghi lý do.',
    ]],
    ['Ghi chú và phân quyền', [
      'Ghi chú (lưu ý vận hành và Key notes) nằm ở tab Tổng quan; tab Tài liệu & nhật ký giữ folder dự án và lịch sử.',
      'Account chỉ thấy dự án và hợp đồng của dự án mình phụ trách hoặc tạo. Chỉ Account phụ trách hoặc Account tạo dự án được sửa, dừng, hủy nháp; người khác ở chế độ xem.',
    ]],
  ]
  return (
    <Modal title="Quy tắc dự án">
      {sections.map(([heading, rules]) => (
        <div className="customer-data-rules" key={heading}>
          <b>{heading}</b>
          <ul className="rules-list">{rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
        </div>
      ))}
      <div className="form-actions"><button className="primary" type="button" onClick={closeModal}>Đóng</button></div>
    </Modal>
  )
}
