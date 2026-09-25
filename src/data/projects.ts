import { ACCOUNTS } from '../lib/format'
import type { Project, ProjectState, ServicePackage } from '../store/types'
import { customerRows, extraCustomer } from './customers'

export const DRIVE_FOLDER = 'https://drive.google.com/drive/folders/1OJRi7FLAZu3tRdaozjGYeiZGcz0xw41q'
export const COM_TAM_TAI_ID = 'project-onboarding-01'

/** Customers that can own a project: [name, default Account, area]. */
export const projectCustomers: Array<[string, string, string]> = [...customerRows, extraCustomer]

export function seedProjects(packages: ServicePackage[]): Project[] {
  const active = packages.filter((item) => item.status === 'Đang áp dụng')
  const records: Project[] = projectCustomers.map(([customer, , area], index) => {
    const state: ProjectState = index === 20 ? 'stopped' : index % 13 === 0 ? 'draft' : index % 11 === 0 ? 'pending' : 'active'
    const draft = state === 'draft'
    const risk = state === 'active' && index % 6 === 0
    const cycle = (index % 6) + 1
    const total = Math.max(cycle, index % 4 === 0 ? 3 : 6)
    const service = active[index % active.length]
    return {
      id: 'project-' + (index + 1),
      code: 'DA-2026-' + String(index + 1).padStart(3, '0'),
      customer,
      owner: ACCOUNTS[index % ACCOUNTS.length],
      createdBy: ACCOUNTS[(index + 2) % ACCOUNTS.length],
      area,
      service: service ? service.group + ' · ' + service.name : 'Chưa có dịch vụ áp dụng',
      servicePackageId: service ? service.id : '',
      serviceScope: service ? service.scope : '',
      servicePrice: service ? service.price : 0,
      contractCode: draft ? '' : 'HĐ-2026-' + String(index + 1).padStart(3, '0'),
      activities: draft
        ? [{ icon: 'file-plus-2', title: 'Dự án nháp đã tạo', detail: 'Chờ Account bắt đầu triển khai và tạo chu kỳ 1.' }]
        : [
            { icon: 'calendar-check-2', title: 'Account đã rà soát tiến độ chu kỳ', detail: 'Hôm nay · Chu kỳ ' + cycle + ' / ' + total },
            { icon: 'package-check', title: 'Gói dịch vụ đã áp dụng', detail: service ? service.group + ' · ' + service.name : 'Chưa có dịch vụ áp dụng' },
            { icon: 'list-checks', title: 'Đầu ra chu kỳ đang được theo dõi', detail: 'Bài đăng, shooting và công việc theo kế hoạch.' },
          ],
      state,
      risk,
      cycle: draft ? 0 : cycle,
      total: draft ? 0 : total,
      progress: draft ? 0 : Math.min(92, 24 + ((index * 9) % 69)),
      due: draft ? '' : ['23.09.2026', '29.09.2026', '30.09.2026', '01.10.2026'][index % 4],
      posts: draft ? 0 : index % 3 === 0 ? 8 : 12,
      shooting: draft ? 0 : index % 4 === 0 ? 2 : 1,
      tasks: draft ? 0 : risk ? 3 : (index % 4) + 1,
    }
  })

  // Dự án mẫu làm kỹ nhất: chu kỳ 5/6, HĐ 3 đợt thanh toán.
  records.unshift({
    id: COM_TAM_TAI_ID,
    code: 'DA-2026-056',
    customer: 'Cơm Tấm Tài',
    owner: 'Hiền',
    createdBy: 'Hiền',
    area: 'HCM',
    service: 'Social Content · Duy trì tháng',
    servicePackageId: active[0]?.id ?? '',
    serviceScope: '12 content/tháng · 1 buổi shooting 4 giờ · Kế hoạch nội dung · Báo cáo tháng · Ads là hạng mục tùy chọn.',
    servicePrice: 8000000,
    contractCode: 'HĐ-2026-056',
    state: 'active',
    risk: false,
    cycle: 5,
    total: 6,
    progress: 68,
    cycleStart: '2026-09-13',
    due: '12.10.2026',
    posts: 12,
    shooting: 1,
    tasks: 3,
    activities: [
      { icon: 'file-plus-2', title: 'Đã tạo hợp đồng HĐ-2026-056', detail: '13.05.2026 · 6 chu kỳ · 3 đợt thanh toán.' },
      { icon: 'badge-check', title: 'Kế toán đã xác nhận đợt thanh toán 1', detail: 'UNC-0526-013 · 3.200.000đ · 13.05.2026.' },
      { icon: 'list-checks', title: 'Đã chốt Content Plan tháng 9', detail: '12 nội dung · 9 thương hiệu · 3 bán hàng.' },
      { icon: 'camera', title: 'Đã quay shooting tháng 9', detail: '1 buổi · 4 giờ · 06.09.2026.' },
      { icon: 'calendar-check-2', title: 'Đã lên lịch xuất bản', detail: 'Facebook và TikTok theo Content Plan.' },
      { icon: 'send', title: 'Đã đăng 8 nội dung', detail: 'Còn 4 nội dung theo lịch xuất bản.' },
      { icon: 'calendar-clock', title: 'Đã điều chỉnh chu kỳ 5', detail: 'Bù 1 nội dung sang tuần 4 để giữ mốc 12.10.2026.' },
    ],
  })
  return records
}
