import type { SopParams } from '../store/types'

/** Values from "SOP Timeline Triển Khai & Phân Công Nhiệm Vụ". */
export const DEFAULT_PARAMS: SopParams = {
  cycleMonths: 1,
  planLeadBusinessDays: 3,
  shootingPlanAfterApprovalDays: 1,
  shootingPlanBeforeShootDays: 2,
  postDemoAfterShootBusinessDays: 1,
  postsPerWeekMin: 2,
  postsPerWeekMax: 3,
  scriptBatchSize: 6,
  scriptLeadDays: 2,
  editLeadDays: 1,
  cycleEndWarningDays: 7,
  vatRate: 8,
  requireBriefBeforeT0: true,
}

interface ParamMeta {
  key: keyof SopParams
  label: string
  help: string
  unit?: string
  min?: number
}

/** Labels and SOP wording for the Tham số vận hành page. */
export const PARAM_META: ParamMeta[] = [
  { key: 'cycleMonths', label: 'Độ dài chu kỳ', unit: 'tháng', min: 1, help: 'Chu kỳ dịch vụ tính từ ngày bắt đầu, kết thúc trước ngày tương ứng của tháng sau.' },
  { key: 'planLeadBusinessDays', label: 'Gửi Content Plan sau T0', unit: 'ngày làm việc', min: 0, help: 'T0 là ngày khởi động: khách đã cọc và đủ brief. SOP: T0 + 3 ngày làm việc.' },
  { key: 'shootingPlanAfterApprovalDays', label: 'Gửi Shooting Plan sau khi khách duyệt Plan', unit: 'ngày', min: 0, help: 'SOP: khách duyệt Plan + 1 ngày. Thực tế hay bị dời sát ngày quay do Media quá tải.' },
  { key: 'shootingPlanBeforeShootDays', label: 'Shooting Plan các buổi sau gửi trước ngày quay', unit: 'ngày', min: 0, help: 'Gói nhiều buổi shoot: mỗi buổi một Shooting Plan. Buổi đầu theo ngày khách duyệt Plan; các buổi sau tính ngược từ ngày quay.' },
  { key: 'postDemoAfterShootBusinessDays', label: 'Gửi Post Demo sau buổi shoot', unit: 'ngày làm việc', min: 0, help: 'Bài đầu tiên để thống nhất mood & tone, hình ảnh và format dựng.' },
  { key: 'postsPerWeekMin', label: 'Nhịp đăng tối thiểu', unit: 'bài/tuần', min: 0, help: 'Sau khi duyệt Post Demo, phân phối đều 2–3 bài/tuần cho gói 12 nội dung/tháng.' },
  { key: 'postsPerWeekMax', label: 'Nhịp đăng tối đa', unit: 'bài/tuần', min: 0, help: 'Dùng để cảnh báo dồn bài vào cuối chu kỳ.' },
  { key: 'scriptLeadDays', label: 'Gửi script trước deadline dựng', unit: 'ngày', min: 0, help: 'Để Media chủ động sản xuất. SOP: tối thiểu 2 ngày.' },
  { key: 'vatRate', label: 'VAT mặc định cho hợp đồng mới', unit: '%', min: 0, help: 'Áp dụng cho mọi gói. Mỗi hợp đồng vẫn sửa tay được vì thuế suất thay đổi theo năm (có năm 10%).' },
  { key: 'cycleEndWarningDays', label: 'Nhắc chốt chu kỳ trước', unit: 'ngày', min: 0, help: 'Hiện cảnh báo khi còn ít ngày đến hạn kết thúc chu kỳ.' },
]
