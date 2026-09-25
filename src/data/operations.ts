import type { Operations } from '../store/types'

export function seedOperations(): Operations {
  return {
    contents: [
      ['CTT-09-01', 'Bữa cơm tròn vị mỗi ngày', 'Thương hiệu', 'Facebook · TikTok', '15.09.2026', 'Đã đăng'],
      ['CTT-09-02', 'Sườn nướng than — cảnh bếp', 'Thương hiệu', 'Facebook · TikTok', '16.09.2026', 'Đã đăng'],
      ['CTT-09-03', 'Cơm tấm cho giờ trưa', 'Thương hiệu', 'Facebook · TikTok', '17.09.2026', 'Đã đăng'],
      ['CTT-09-04', 'Bí quyết nước mắm nhà làm', 'Thương hiệu', 'Facebook · TikTok', '18.09.2026', 'Đã đăng'],
      ['CTT-09-05', 'Một góc quán quen', 'Thương hiệu', 'Facebook · TikTok', '19.09.2026', 'Đã đăng'],
      ['CTT-09-06', 'Combo cơm trưa văn phòng', 'Bán hàng', 'Facebook · TikTok', '20.09.2026', 'Đã đăng'],
      ['CTT-09-07', 'Khách nói gì sau bữa trưa', 'Thương hiệu', 'Facebook · TikTok', '22.09.2026', 'Đã đăng'],
      ['CTT-09-08', 'Món gọi thêm được yêu thích', 'Thương hiệu', 'Facebook · TikTok', '23.09.2026', 'Đã lên lịch'],
      ['CTT-09-09', 'Đặt nhóm trước, ăn ngon hơn', 'Bán hàng', 'Facebook · TikTok', '26.09.2026', 'Cần bù tiến độ'],
      ['CTT-09-10', 'Bữa tối ấm bụng', 'Thương hiệu', 'Facebook · TikTok', '28.09.2026', 'Đang chuẩn bị'],
      ['CTT-09-11', 'Combo gia đình cuối tuần', 'Bán hàng', 'Facebook · TikTok', '29.09.2026', 'Đang chuẩn bị'],
      ['CTT-09-12', 'Câu chuyện từ gian bếp', 'Thương hiệu', 'Facebook · TikTok', '30.09.2026', 'Đang chuẩn bị'],
    ],
    shootings: [
      ['SH-CTT-09', 'Shooting tháng 9', 'Cơm Tấm Tài', '06.09.2026 · 08:00–12:00', 'Minh Long Studio', 'Shooting Plan · đã chốt', 'Hoàn thành'],
      ['SH-VCC-09', 'Shooting sản phẩm tuần 4', 'Vua chả cá', '25.09.2026 · 08:00–12:00', 'Minh Long Studio', 'Thiếu xác nhận đầu mối', 'Chờ xác nhận'],
      ['SH-MAYA-10', 'Shooting mở chu kỳ', 'Maya Thai', 'Chưa lên lịch', 'Chưa phân bổ', 'Chờ brief và asset', 'Nháp'],
    ],
    tasks: [
      ['TASK-CTT-091', 'Bù tiến độ Content 09', 'Cơm Tấm Tài', 'Hiền', '26.09.2026', 'Content 09 · Facebook/TikTok', 'Đang thực hiện'],
      ['TASK-CTT-092', 'Chốt lịch Content 10–12', 'Cơm Tấm Tài', 'Hiền', '25.09.2026', 'Lịch xuất bản', 'Đã lập kế hoạch'],
      ['TASK-VCC-092', 'Xác nhận đầu mối shooting', 'Vua chả cá', 'Nguyên', '24.09.2026', 'Xác nhận lịch quay', 'Bị chặn'],
      ['TASK-MAYA-101', 'Bổ sung Sales Brief', 'Maya Thai', 'Hiền', '27.09.2026', 'Sales Brief trên Drive', 'Nháp'],
      ['TASK-ET-093', 'Rà soát báo cáo tháng', 'Em Tèo Food', 'Hiền', '30.09.2026', 'Báo cáo tháng', 'Chờ phê duyệt'],
    ],
  }
}

export function operationTone(status: string): string {
  if (status === 'Hoàn thành' || status === 'Đã đăng') return 'ok'
  if (status === 'Bị chặn' || status === 'Cần bù tiến độ') return 'danger'
  if (status === 'Nháp') return 'muted'
  if (status === 'Đang chuẩn bị' || status === 'Chờ xác nhận' || status === 'Chờ phê duyệt') return 'waiting'
  return 'info'
}
