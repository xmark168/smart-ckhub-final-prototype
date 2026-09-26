import type { Operations } from '../store/types'

export function seedOperations(): Operations {
  return {
    tasks: [
      ['TASK-CTT-091', 'Dựng Mini-game chả trứng muối (bài 5, 6)', 'Cơm Tấm Tài', 'Hải', '26.09.2026', 'Bài 5, 6 · Facebook/TikTok', 'Đang thực hiện'],
      ['TASK-CTT-092', 'Chốt script bài 10–12', 'Cơm Tấm Tài', 'Content nội bộ', '26.09.2026', 'Script bài 10–12', 'Đã lập kế hoạch'],
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
