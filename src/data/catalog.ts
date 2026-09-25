import type { ServiceCategory, ServicePackage } from '../store/types'

export const seedCategories: ServiceCategory[] = [
  { id: 'system', name: 'Hệ thống', code: 'HT', status: 'Đang áp dụng' },
  { id: 'brand', name: 'Thương hiệu', code: 'TH', status: 'Đang áp dụng' },
  { id: 'growth', name: 'Tăng trưởng', code: 'TT', status: 'Đang áp dụng' },
]

export const seedPackages: ServicePackage[] = [
  { id: 'social-setup', category: 'system', group: 'Mạng xã hội', name: 'Khởi tạo & Tối ưu', unit: 'Gói', priceType: 'fixed', price: 1000000, status: 'Đang áp dụng', scope: 'Thiết lập và tối ưu nền tảng mạng xã hội.' },
  { id: 'chatbot-setup', category: 'system', group: 'Chatbot', name: 'Khởi tạo & Setup', unit: 'Gói', priceType: 'fixed', price: 2000000, status: 'Đang áp dụng', scope: 'Khởi tạo chatbot và cấu hình luồng cơ bản.' },
  { id: 'chatbot-ops', category: 'system', group: 'Chatbot', name: 'Quản trị vận hành', unit: 'Tháng', priceType: 'fixed', price: 1000000, status: 'Đang áp dụng', scope: 'Theo dõi, tối ưu và vận hành chatbot.' },
  { id: 'maps-setup', category: 'system', group: 'Google Maps', name: 'Khởi tạo & Đồng bộ', unit: 'Gói', priceType: 'fixed', price: 2000000, status: 'Đang áp dụng', scope: 'Khởi tạo và đồng bộ hồ sơ Google Maps.' },
  { id: 'maps-ops', category: 'system', group: 'Google Maps', name: 'Quản trị tối ưu (MEO)', unit: 'Tháng', priceType: 'fixed', price: 2000000, status: 'Đang áp dụng', scope: 'Tối ưu và quản trị hồ sơ Google Maps.' },
  { id: 'website-landing', category: 'system', group: 'Website', name: 'Landing Page', unit: 'Gói', priceType: 'fixed', price: 5000000, status: 'Đang áp dụng', scope: 'Thiết kế và triển khai landing page.' },
  { id: 'website-build', category: 'system', group: 'Website', name: 'Website', unit: 'Gói', priceType: 'fixed', price: 15000000, status: 'Đang áp dụng', scope: 'Thiết kế và triển khai website.' },
  { id: 'website-ops', category: 'system', group: 'Website', name: 'Quản trị', unit: 'Tháng', priceType: 'fixed', price: 2000000, status: 'Đang áp dụng', scope: 'Quản trị và cập nhật website.' },
  { id: 'design-basic', category: 'brand', group: 'Graphic Design', name: 'Basic', unit: 'Tháng', priceType: 'fixed', price: 2000000, status: 'Đang áp dụng', scope: 'Gói thiết kế đồ họa cơ bản.' },
  { id: 'design-premium', category: 'brand', group: 'Graphic Design', name: 'Premium', unit: 'Tháng', priceType: 'fixed', price: 5000000, status: 'Đang áp dụng', scope: 'Gói thiết kế đồ họa nâng cao.' },
  { id: 'full-funnel', category: 'growth', group: 'Trọn gói tăng trưởng', name: 'Full phễu – Full khách', unit: 'Tháng', priceType: 'fixed', price: 19000000, status: 'Đang áp dụng', scope: 'Gói tăng trưởng theo phễu toàn diện.' },
  { id: 'growth-basic', category: 'growth', group: 'Xây kênh tăng trưởng doanh thu', name: 'Basic', unit: 'Tháng', priceType: 'fixed', price: 9000000, status: 'Đang áp dụng', scope: 'Xây kênh tăng trưởng cấp cơ bản.' },
  { id: 'ads-management', category: 'growth', group: 'Ads Management', name: 'Quản trị quảng cáo', unit: 'Tháng', priceType: 'fixed', price: 2000000, status: 'Đang áp dụng', scope: 'Quản trị quảng cáo theo chu kỳ.' },
]

export function packageLabel(item: ServicePackage): string {
  return item.group + ' · ' + item.name
}

export function servicePrice(item: ServicePackage): string {
  const format = (value?: number) => Number(value || 0).toLocaleString('vi-VN')
  if (item.priceType === 'quote') return 'Báo giá riêng'
  if (item.priceType === 'from') return 'Từ ' + format(item.price) + 'đ'
  if (item.priceType === 'range') return format(item.price) + '–' + format(item.maxPrice) + 'đ'
  return format(item.price) + 'đ'
}
