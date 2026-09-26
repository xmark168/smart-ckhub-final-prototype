import type { ContentItem, ContentStage, Cycle, Payment, Project } from '../store/types'
import { addDaysIso } from '../lib/format'
import { seedPackages } from './catalog'

/**
 * Cơm Tấm Tài — real operating data from the project Drive folder "31. Cơm Tấm Tài":
 * CONTENT PLAN T9/26, Content Post 9/2026, Kế hoạch quay chụp T9, KEY NOTES,
 * plus the contract lines in "BẢNG QUẢN LÝ DỰ ÁN 2026 › CÔNG NỢ" and "Tiến độ".
 */

export const COM_TAM_TAI_ID = 'project-onboarding-01'
export const COM_TAM_TAI_CUSTOMER_ID = 'customer-15'

const DRIVE = 'https://drive.google.com/drive/folders/'
const SHEET = 'https://docs.google.com/spreadsheets/d/'

export const COM_TAM_TAI_LINKS = {
  folder: DRIVE + '16m7mj8I--IPm_xTkpcMdRcmTsI_xrWkd',
  contentPlan: SHEET + '1MD38zK4GaNxtxRS2gpzMmvgqhzuUhmS35Rt1XL2uUIQ/edit',
  contentPost: SHEET + '1h-zzgw8hVd-EiqTP8V-fNt910VPxU7FyOwUv-OhzH5E/edit',
  keyNotes: SHEET + '1WcEc34Mbf5DsIKAfyAY5q0y1MRFvO3SKdmHiACeHdzM/edit',
}

export const COM_TAM_TAI_CONTRACT_FOLDER = DRIVE + '1B-od1HK2bfvm3VfuX1KkGNTKiApZwCS8'

/** HĐ 6 tháng 58.320.000đ (9tr × 6 + VAT 8%), 3 đợt theo sheet Công nợ. */
export const COM_TAM_TAI_CONTRACT = {
  code: 'HĐ-2026-056',
  start: '2026-05-23',
  cycles: 6,
  value: 58320000,
  payments: [
    { installment: 1, percent: 40, amount: 23328000, due: '2026-05-15', paid: 23328000, paidAt: '2026-05-15', evidence: 'HĐĐT 15/05 · đã xuất hóa đơn' },
    { installment: 2, percent: 30, amount: 17496000, due: '2026-07-14', paid: 17496000, paidAt: '2026-07-14', evidence: 'HĐĐT 14/07 · đã xuất hóa đơn' },
    { installment: 3, percent: 30, amount: 17496000, due: '2026-09-13', paid: 0, evidence: '' },
  ] satisfies Payment[],
}

type Row = [stt: number, bonus: boolean, category: string, topic: string, title: string, format: ContentItem['format'], postDate: string, stage: ContentStage]

/** CONTENT PLAN T9/26 rows; post dates from Content Post 9/2026 (17:00, Facebook + TikTok). */
const T9_ROWS: Row[] = [
  [1, false, 'Chia sẻ', 'Gia đình cơm tấm', 'GIA ĐÌNH CƠM TẤM LÊN SÓNG: CÓ THẬT TÀI ĐÃ BÁN 28 NĂM', 'Video', '2026-09-03', 'Đã đăng'],
  [2, false, 'Chia sẻ', 'Gia đình cơm tấm', 'TỪ VỈA HÈ LÊN PHÒNG LẠNH, SOI CẬN CẢNH DÀN MÁY MÓC HIỆN ĐẠI CỦA QUÁN', 'Video', '2026-09-05', 'Đã đăng'],
  [3, false, 'Chia sẻ', 'Nước', 'HÀNH TRÌNH BIẾN CƠM TẤM TÀI THÀNH QUÁN CƠM CÓ MENU NƯỚC "CHÁY" NHẤT SÀI GÒN', 'Video', '2026-09-07', 'Đã đăng'],
  [4, false, 'Chia sẻ', 'Gia đình cơm tấm', 'CÙNG 1 DĨA CƠM TẤM – MẸ LÀM GÌ, CON LÀM GÌ', 'Video', '2026-09-09', 'Đã đăng'],
  [5, false, 'Chia sẻ', 'Mini-game', 'MINI GAME: ĂN THỬ CHẢ TRỨNG MUỐI ĐOÁN ĐÚNG NGUYÊN LIỆU NHẬN NGAY CƠM MIỄN PHÍ! (phần 1)', 'Video', '', 'Dựng'],
  [6, false, 'Chia sẻ', 'Mini-game', 'MINI GAME: ĂN THỬ CHẢ TRỨNG MUỐI ĐOÁN ĐÚNG NGUYÊN LIỆU NHẬN NGAY CƠM MIỄN PHÍ! (phần 2)', 'Video', '', 'Dựng'],
  [7, false, 'Chia sẻ', 'Tiểu phẩm', 'TIỆM CƠM TẤM BẤT ỔN', 'Video', '2026-09-16', 'Đã đăng'],
  [8, false, 'Chia sẻ', 'Vận hành', 'CÓ SAI SÓT XIN KHÁCH YÊU INBOX NHẸ NHÀNG, ĐỪNG VỘI ĐÁNH GIÁ 1 SAO NHÉ!', 'Video', '2026-09-21', 'Đã đăng'],
  [9, false, 'Chia sẻ', 'Gia đình cơm tấm', 'QUÁN ĐÔNG VẬN HÀNH SAO? BẬT MÍ CÁCH HAI VỢ CHỒNG CHIA VIỆC CỰC MƯỢT!', 'Video', '2026-09-23', 'Đã đăng'],
  [10, false, 'Chia sẻ', 'Gia đình cơm tấm', 'GIA ĐÌNH CƠM TẤM LÊN SÓNG – tập 10', 'Video', '', 'Script'],
  [11, false, 'Chia sẻ', 'Gia đình cơm tấm', 'GIA ĐÌNH CƠM TẤM LÊN SÓNG – tập 11', 'Video', '', 'Script'],
  [12, false, 'Chia sẻ', 'Challenge', 'KHÁCH HỆ ĐỘC LẠ TRÁNH NƯỚC MẮM, BÀ CHỦ MUKBANG THỬ LIỀN CƠM TẤM NƯỚC TƯƠNG!', 'Video', '', 'Ý tưởng'],
  [13, true, 'Thông báo', 'Mừng 2/9', 'LỄ 2/9 ĐÃ CÓ KÈO CHƯA? TỰ THƯỞNG NGAY DĨA CƠM SƯỜN SIZE L KHỔNG LỒ!', 'Ảnh', '2026-09-01', 'Đã đăng'],
  [14, true, 'Thông báo', 'Review', 'CẬN CẢNH CHẢ HẤP TRỨNG MUỐI NHÀ TÀI – CĂNG TRÒN BÉO NGẬY SIÊU MÊ', 'Album', '2026-09-14', 'Đã đăng'],
]

/** Planned post dates of the rows not yet published (Content Post 9/2026). */
const T9_PLANNED: Record<number, string> = { 5: '2026-09-12', 6: '2026-09-19', 10: '2026-09-25', 11: '2026-09-28', 12: '2026-09-30' }

function t9Contents(): ContentItem[] {
  return T9_ROWS.map(([stt, bonus, category, topic, title, format, posted, stage]) => {
    const published = stage === 'Đã đăng'
    // Unpublished rows keep the planned date from Content Post 9/2026; edit = post − 1 day, script = edit − 2 days (SOP).
    const postDate = posted || T9_PLANNED[stt] || ''
    const deadlineEdit = postDate ? addDaysIso(postDate, -1) : ''
    const deadlineScript = deadlineEdit ? addDaysIso(deadlineEdit, -2) : ''
    return {
      id: 'ctt-t9-' + stt,
      stt,
      bonus,
      postDate,
      deadlineScript,
      deadlineEdit,
      // Plan T9 phân bổ 9 thương hiệu / 3 bán hàng nhưng toàn bộ bài đang ở nhiệm vụ thương hiệu.
      mission: 'Thương hiệu',
      category,
      topic,
      title,
      format,
      stage,
      mediaLink: '',
      channels: (bonus && format === 'Ảnh' ? (['Facebook'] as const) : (['Facebook', 'TikTok'] as const)).map((platform) => ({
        platform,
        status: published ? 'Đã đăng' : 'Chưa lên lịch',
        time: published ? '17:00' : '',
        link: '',
      })),
    }
  })
}

function closedCycle(no: number, start: string, plannedEnd: string, actualEnd: string, published: number, note: string): Cycle {
  return {
    no,
    start,
    plannedEnd,
    actualEnd,
    status: 'closed',
    result: { published, planned: 12, note },
    plan: { status: 'approved', link: COM_TAM_TAI_LINKS.contentPlan, sentAt: '', approvedAt: '', feedback: '' },
    shootingPlan: { sentAt: '', link: '' },
    shootings: [],
    demo: { status: 'Đã duyệt', link: '', sentAt: '', approvedAt: '' },
    contents: [],
    tasks: [],
    exceptions: [],
    activity: [],
  }
}

export function comTamTaiProject(): Project {
  const growth = seedPackages.find((item) => item.id === 'growth-basic')!
  const cycle4: Cycle = {
    no: 4,
    start: '2026-08-23',
    plannedEnd: '2026-09-22',
    actualEnd: '',
    status: 'running',
    plan: { status: 'approved', link: COM_TAM_TAI_LINKS.contentPlan, sentAt: '2026-08-14', approvedAt: '2026-08-16', feedback: 'Khách muốn đẩy mạnh nội dung viral TikTok.' },
    shootingPlan: { sentAt: '2026-08-17', link: COM_TAM_TAI_LINKS.contentPlan },
    shootings: [
      {
        id: 'ctt-shoot-t9',
        date: '2026-08-19',
        time: '11:00–15:00',
        location: '100 Nguyễn Văn Nghi',
        media: ['Hải', 'Như'],
        status: 'Đã hoàn thành',
        checklist: 'Cơm tấm sườn nướng mỡ hành, cơm tấm sườn size L, size L thêm chả trứng muối, chả hấp trứng muối, cafe muối, cafe kem dẻo, trà tắc, dừa tắc, trà trái cây, trà bí đao thạch dừa.',
      },
    ],
    demo: { status: 'Đã duyệt', link: '', sentAt: '2026-08-20', approvedAt: '2026-08-22' },
    contents: t9Contents(),
    tasks: [
      { id: 'ctt-edit-56', name: 'Dựng Mini-game chả trứng muối (bài 5, 6)', owner: 'Hải', deadline: '26.09.2026', status: 'Đang thực hiện', type: 'Sản xuất' },
      { id: 'ctt-script-1012', name: 'Chốt script bài 10–12', owner: 'Content nội bộ', deadline: '26.09.2026', status: 'Việc cần làm', type: 'Nội dung' },
    ],
    exceptions: [{ id: 'ctt-ex-1', type: 'Đang bù chu kỳ', reason: 'Còn 5 bài của Content Plan T9 chưa đăng; bù sang đầu chu kỳ 5.', resolved: false }],
    activity: [
      { title: 'Đã đăng bài 9', detail: 'Quán đông vận hành sao? · 23.09', time: '23.09.2026' },
      { title: 'Shooting T9 hoàn thành', detail: '100 Nguyễn Văn Nghi · Hải, Như', time: '19.08.2026' },
      { title: 'Chu kỳ được tạo', detail: '23.08 – 22.09.2026', time: '23.08.2026' },
    ],
  }
  return {
    id: COM_TAM_TAI_ID,
    code: 'DA-2026-056',
    customerId: COM_TAM_TAI_CUSTOMER_ID,
    customer: 'Cơm Tấm Tài',
    owner: 'Hiền',
    createdBy: 'Hiền',
    area: 'HCM',
    service: growth.group + ' · ' + growth.name,
    servicePackageId: growth.id,
    serviceScope: growth.scope,
    servicePrice: growth.price,
    quota: { ...growth.quota },
    contractCode: COM_TAM_TAI_CONTRACT.code,
    total: COM_TAM_TAI_CONTRACT.cycles,
    state: 'active',
    risk: false,
    cycles: [
      closedCycle(1, '2026-05-23', '2026-06-22', '2026-06-22', 12, 'Đủ 12 bài.'),
      closedCycle(2, '2026-06-23', '2026-07-22', '2026-07-24', 12, 'Đủ 12 bài, chốt trễ 2 ngày.'),
      closedCycle(3, '2026-07-23', '2026-08-22', '2026-08-22', 10, 'Nghiệm thu 10 bài (AGI tháng 8), bù 2 bài sang chu kỳ 4.'),
      cycle4,
    ],
    team: { account: 'Hiền', planner: 'Thương', media: ['Hải', 'Như'], ads: 'Team Ads' },
    links: { ...COM_TAM_TAI_LINKS },
    notes: 'Khách muốn viral TikTok; đang chạy Ads TikTok đều. Đăng TikTok cho khách luôn.',
    keyNotes: [
      { id: 'kn-1', date: '2026-08-19', author: 'Hiền', type: 'Shooting recap', content: 'Shooting T9 tại 100 Nguyễn Văn Nghi, 11:00–15:00. Media 1 Hải quay diễn 11:00–13:30, Media 2 Như quay cảnh trám; món ăn 13:30–14:50; 14:50 check source, thu dọn.' },
      { id: 'kn-2', date: '2026-06-28', author: 'Hiền', type: 'Từ Account', content: 'Máy đóng gói nước mắm ra 35–45 bịch/phút; lò nướng dài 2 m, 2 NV/lượt. Đơn lớn cần 11–12 người cho một công đoạn. NV ra món cần trên 3 tháng, nướng sườn trên 2 tháng học việc.' },
      { id: 'kn-3', date: '2026-06-25', author: 'Hiền', type: 'Từ khách', content: 'Không lộ thông tin khách đặt đơn lớn vì đối thủ có thể khai thác. Khách đoàn quan tâm hóa đơn, chất lượng và giờ giao; quán từng mất khách vì giao trễ.' },
      { id: 'kn-4', date: '2026-03-03', author: 'Hiền', type: 'Từ khách', content: 'Không nói những topic có vấn đề tiêu cực, không phản hồi comment complain trên nội dung.' },
    ],
    activities: [
      { icon: 'send', title: 'Đã đăng 7 / 12 bài chu kỳ 4', detail: 'Kèm 2 bài tặng · bài 5, 6, 10, 11, 12 chưa đăng.' },
      { icon: 'camera', title: 'Đã quay shooting T9', detail: '19.08.2026 · 100 Nguyễn Văn Nghi · Hải, Như.' },
      { icon: 'list-checks', title: 'Khách duyệt Content Plan T9', detail: '16.08.2026 · định hướng viral TikTok.' },
      { icon: 'badge-check', title: 'Kế toán xác nhận đợt 2', detail: '17.496.000đ · 14.07.2026.' },
      { icon: 'file-plus-2', title: 'Đã ký HĐ 6 tháng HĐ-2026-056', detail: '23.05.2026 · 58.320.000đ · 3 đợt 40/30/30.' },
    ],
  }
}
