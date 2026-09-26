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
      'Chỉ Account được gắn cố định với dự án. Content là đội nội bộ dùng chung, lo edit post và lên lịch đăng; Account lên lịch shooting, gửi khách duyệt và đăng lên page. Media gán theo từng buổi shoot.',
      'Bắt đầu triển khai (T0) khi Cổng khởi động đủ điều kiện: hợp đồng chính, cọc, Sales Brief' + (params.requireBriefBeforeT0 ? ' và brief khách hàng' : '') + '. Mọi mốc SOP tính từ T0.',
      'Khách không chốt thì Hủy nháp: dự án chuyển sang Đã dừng, không tạo chu kỳ, vẫn giữ lịch sử.',
    ]],
    ['Gói dịch vụ và định mức', [
      'Gói theo hợp đồng; một hợp đồng có thể gồm nhiều gói. Có hợp đồng rồi thì đổi gói bằng phụ lục hoặc hợp đồng mới (hóa đơn xuất theo hạng mục hợp đồng).',
      'Phụ lục đổi gói áp dụng từ chu kỳ đang chạy hoặc chu kỳ tiếp theo; chu kỳ đã chốt giữ nguyên số liệu.',
      'Gói không có đầu ra nội dung hằng tháng (setup, website, chatbot, ads…): không áp dụng mốc Content Plan, shoot và nhịp đăng.',
    ]],
    ['Timeline và chu kỳ', [
      'Mỗi gói có Timeline mẫu (Administrator sửa ở Gói dịch vụ). Khi mở chu kỳ, dự án sao chép timeline của gói; sửa mẫu sau đó không đổi chu kỳ đang chạy.',
      'Mốc phụ thuộc nhau: hạn mỗi bước tính từ ngày bước trước thực sự xong hoặc được khách duyệt. Bước trước chưa xong thì hạn bước sau là dự kiến (dấu ~), không tính trễ.',
      '5 mốc SOP: T0 (cọc + đủ brief) → Gửi Content Plan T0 + ' + params.planLeadBusinessDays + ' ngày làm việc → Gửi Shooting Plan khi khách duyệt Plan + ' + params.shootingPlanAfterApprovalDays + ' ngày (gói nhiều buổi: mỗi buổi một Shooting Plan, các buổi sau gửi trước ngày quay ' + params.shootingPlanBeforeShootDays + ' ngày) → Gửi Post Demo khi shoot xong + ' + params.postDemoAfterShootBusinessDays + ' ngày làm việc → Bắt đầu đăng khi khách duyệt Demo.',
      'Trong giai đoạn đăng: nhịp ' + params.postsPerWeekMin + '–' + params.postsPerWeekMax + ' bài/tuần (gói nhiều bài thì nhịp cao hơn); script gối đầu lô ' + params.scriptBatchSize + ' bài, gửi trước deadline dựng ' + params.scriptLeadDays + ' ngày — theo dõi ở tab Nội dung.',
      'Từng bài: Edit xong → Account gửi khách duyệt → Account đăng. Bài tặng cộng vào số bài phải đăng của chu kỳ.',
      'Account điều chỉnh timeline của chu kỳ đang chạy: dời hạn, đổi nhịp đăng, bỏ qua bước, thêm mốc sự kiện. Mọi thay đổi bắt buộc lý do và được lưu lại; không xóa được bước của mẫu.',
      'Công việc thiếu người phụ trách hoặc deadline chỉ lưu ở trạng thái Nháp.',
      'Chu kỳ chốt khi xong mọi bước (đủ bài theo gói và bài tặng), không theo ngày dương lịch; ngày kết thúc chỉ là mục tiêu. Chốt khi còn bước dở thì có cảnh báo; bài còn thiếu chuyển bù sang chu kỳ sau hoặc bỏ kèm lý do. Chu kỳ kế tiếp bắt đầu ngay sau ngày chốt.',
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
