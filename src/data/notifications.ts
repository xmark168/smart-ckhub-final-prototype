interface NotificationSet {
  title: string
  rule: string
  /** [loại thông báo, điều kiện] */
  types: Array<[string, string]>
  /** [tiêu đề, nội dung] */
  items: Array<[string, string]>
}

/** Thông báo theo trang đang xem; trang không có cấu hình dùng bộ của Dự án. */
export const notificationsByScreen: Record<string, NotificationSet> = {
  customers: {
    title: 'Khách hàng',
    rule: 'Account chỉ nhận khách mình phụ trách hoặc tạo. BODs và Administrator nhận toàn bộ.',
    types: [['Chu kỳ sắp hết', 'Nhắc 14, 7 và 3 ngày trước mốc chu kỳ'], ['Thiếu đầu mối chính', 'Khách active chưa có liên hệ hợp lệ'], ['Khách cần chú ý', 'Có rủi ro cần Account xử lý']],
    items: [['Chu kỳ sắp hết: Ẩm Thực Phước Quắn', 'Còn 7 ngày. Rà soát kế hoạch kỳ tiếp theo.'], ['Thiếu đầu mối chính: Vua Chả Cá', 'Khách đang triển khai nhưng chưa có liên hệ hợp lệ.'], ['Khách mới cần thiết lập', 'Bổ sung dịch vụ trước khi mở dự án.']],
  },
  projects: {
    title: 'Dự án',
    rule: 'Account nhận dự án mình phụ trách hoặc tạo. BODs và Administrator nhận toàn bộ.',
    types: [['Chu kỳ có rủi ro', 'Trễ hoặc có nguy cơ trễ mốc'], ['Cổng khởi động', 'Dự án nháp thiếu điều kiện bắt đầu'], ['Thay đổi chu kỳ', 'Có bù tiến độ hoặc đổi mốc']],
    items: [['Cơm Tấm Tài cần bù Content 09', 'Bù trong tuần 4 để giữ mốc 12.10.'], ['Ốc lắc cô mai chưa thể bắt đầu', 'Dự án nháp chưa có hợp đồng hiệu lực.'], ['Vua chả cá chờ chốt lịch shooting', 'Thiếu xác nhận đầu mối khách hàng.']],
  },
  contracts: {
    title: 'Hợp đồng & thanh toán',
    rule: 'Account theo dõi hợp đồng mình phụ trách. Kế toán xác nhận chứng từ; BODs và Administrator xem toàn bộ.',
    types: [['Đợt thanh toán đến hạn', 'Theo điều khoản HĐ'], ['Chứng từ cần xác nhận', 'Có mã chứng từ hoặc link Drive'], ['Hợp đồng sắp hết hạn', 'Cần chuẩn bị tái ký']],
    items: [['Đợt 2 HĐ-2026-056 chờ xác nhận', '30% · 2.400.000đ · cần mã chứng từ.'], ['HĐ-2026-056 đang hiệu lực', 'Cơm Tấm Tài · kết thúc 20.11.2026.'], ['Phụ lục cần đối chiếu', 'Kiểm tra phạm vi trước khi áp dụng.']],
  },
  posts: {
    title: 'Nội dung',
    rule: 'Account nhận thay đổi nội dung thuộc dự án mình phụ trách. Partner chỉ nhận việc được giao.',
    types: [['Nội dung cần bù', 'Không đạt tiến độ theo chu kỳ'], ['Chờ duyệt', 'Cần Account hoặc khách xác nhận'], ['Đã lên lịch', 'Sắp đến ngày xuất bản']],
    items: [['Content 09 cần bù tiến độ', 'CTA đặt nhóm cần chốt trước 26.09.'], ['Content 08 đã lên lịch', 'Facebook và TikTok · 23.09.'], ['Ba nội dung đang chuẩn bị', 'Chưa đủ điều kiện xuất bản.']],
  },
  shootings: {
    title: 'Lịch shooting',
    rule: 'Account nhận cảnh báo input, Partner và lịch. Partner chỉ xem shooting mình được giao.',
    types: [['Thiếu đầu vào', 'Thiếu brief, asset hoặc Shooting Plan'], ['Chưa xác nhận lịch', 'Thiếu Partner hoặc đầu mối'], ['Thay đổi lịch', 'Có tác động output và task']],
    items: [['Vua chả cá chờ xác nhận shooting', 'Thiếu đầu mối khách hàng.'], ['Maya Thai chưa đủ gate', 'Chờ brief, asset và Partner.'], ['Cơm Tấm Tài đã hoàn thành shoot', '1 buổi · 4 giờ · 06.09.']],
  },
  tasks: {
    title: 'Công việc',
    rule: 'Account nhận task của dự án mình phụ trách. Partner chỉ nhận task được giao trực tiếp.',
    types: [['Task bị chặn', 'Có phụ thuộc cần xử lý'], ['Sắp đến hạn', 'Nhắc theo deadline'], ['Chờ phê duyệt', 'Cần Account chốt bước tiếp theo']],
    items: [['Xác nhận đầu mối shooting bị chặn', 'Vua chả cá · hạn 24.09.'], ['Bù tiến độ Content 09', 'Cơm Tấm Tài · hạn 26.09.'], ['Báo cáo tháng chờ phê duyệt', 'Em Tèo Food · hạn 30.09.']],
  },
}

export const NOTIFICATION_TIMES = ['Hôm nay', '45 phút trước', '2 giờ trước']
