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
      'Chỉ Account được gắn cố định với dự án. Content là đội nội bộ dùng chung; partner (Media, Ads) gán theo từng buổi shoot và công việc.',
      'Bắt đầu triển khai (T0) khi Cổng khởi động đủ điều kiện: hợp đồng chính, cọc, Sales Brief' + (params.requireBriefBeforeT0 ? ' và brief khách hàng' : '') + '. Mọi mốc SOP tính từ T0.',
      'Khách không chốt thì Hủy nháp: dự án chuyển sang Đã dừng, không tạo chu kỳ, vẫn giữ lịch sử.',
    ]],
    ['Gói dịch vụ và định mức', [
      'Gói theo hợp đồng; một hợp đồng có thể gồm nhiều gói. Có hợp đồng rồi thì đổi gói bằng phụ lục hoặc hợp đồng mới (hóa đơn xuất theo hạng mục hợp đồng).',
      'Phụ lục đổi gói áp dụng từ chu kỳ đang chạy hoặc chu kỳ tiếp theo; chu kỳ đã chốt giữ nguyên số liệu.',
      'Gói không có đầu ra nội dung hằng tháng (setup, website, chatbot, ads…): không áp dụng mốc Content Plan, shoot và nhịp đăng.',
    ]],
    ['Chu kỳ và mốc SOP', [
      'Content Plan gửi khách trước T0 + ' + params.planLeadBusinessDays + ' ngày làm việc; ngày khách duyệt là mốc tính Shooting Plan (+' + params.shootingPlanAfterApprovalDays + ' ngày).',
      'Lịch shoot mở sau khi khách duyệt Content Plan. Đánh dấu buổi shoot Đã hoàn thành thì mốc Post Demo tự tính (+' + params.postDemoAfterShootBusinessDays + ' ngày làm việc); ghi Shooting recap vào Key notes.',
      'Ngày khách duyệt Post Demo là mốc bắt đầu nhịp đăng ' + params.postsPerWeekMin + '–' + params.postsPerWeekMax + ' bài/tuần. Script gối đầu theo lô ' + params.scriptBatchSize + ' bài, gửi trước deadline dựng ' + params.scriptLeadDays + ' ngày.',
      'Công việc thiếu người phụ trách hoặc deadline chỉ lưu ở trạng thái Nháp.',
      'Chốt chu kỳ: bài còn thiếu chuyển bù sang chu kỳ sau hoặc bỏ kèm lý do; chu kỳ kế tiếp tự mở nếu hợp đồng còn chu kỳ. Chốt sớm hoặc còn công nợ quá hạn thì có cảnh báo, không bị chặn.',
    ]],
    ['Tạm dừng, dừng và rủi ro', [
      'Tạm dừng giữ nguyên chu kỳ và hợp đồng, ghi lý do và ngày dự kiến quay lại; mốc SOP không tính trễ trong thời gian tạm dừng.',
      'Dừng dự án chốt chu kỳ đang chạy tại ngày hiệu lực và có thể kết thúc hợp đồng cùng lúc (trừ hợp đồng còn gói khác đang chạy).',
      '"Có rủi ro" gồm dự án có mốc SOP trễ, công nợ quá hạn hoặc được gắn cờ. Gắn cờ bắt buộc ghi lý do.',
    ]],
    ['Ghi chú và phân quyền', [
      'Ghi chú dự án là lưu ý vận hành hiện tại; kiến thức lâu dài về khách (feedback, recap) ghi vào Key notes ở tab Tài liệu.',
      'Account chỉ thấy dự án mình phụ trách hoặc tạo. Chỉ Account phụ trách hoặc Account tạo dự án được sửa, dừng, hủy nháp; người khác ở chế độ xem.',
      'Hợp đồng: ngày kết thúc tự tính từ ngày bắt đầu và số chu kỳ; chỉ một hợp đồng chính hiệu lực trên mỗi dự án. Link file và folder Drive không bắt buộc.',
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
