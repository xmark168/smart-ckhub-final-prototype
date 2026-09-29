import type { PackageQuota, ServiceCategory, ServicePackage } from '../store/types'
import { DEFAULT_PARAMS } from './params'
import { defaultTimeline } from './timeline'

/** Setup, website, chatbot and ads packages have no monthly content deliverables. */
export const NO_QUOTA: PackageQuota = { posts: 0, shoots: 0, plans: 0, brandPosts: 0, salesPosts: 0 }

export const seedCategories: ServiceCategory[] = [
  { id: 'system', name: 'Hệ thống', code: 'HT', status: 'Đang áp dụng' },
  { id: 'brand', name: 'Thương hiệu', code: 'TH', status: 'Đang áp dụng' },
  { id: 'growth', name: 'Tăng trưởng', code: 'TT', status: 'Đang áp dụng' },
]

const packageRows: Array<Omit<ServicePackage, 'timeline'>> = [
  { id: 'social-setup', category: 'system', group: 'Mạng xã hội', name: 'Khởi tạo & Tối ưu', unit: 'Gói', priceType: 'fixed', price: 1000000, status: 'Đang áp dụng', scope: 'Thiết lập và tối ưu nền tảng mạng xã hội.', quota: NO_QUOTA },
  { id: 'chatbot-setup', category: 'system', group: 'Chatbot', name: 'Khởi tạo & Setup', unit: 'Gói', priceType: 'fixed', price: 2000000, status: 'Đang áp dụng', scope: 'Khởi tạo chatbot và cấu hình luồng cơ bản.', quota: NO_QUOTA },
  { id: 'chatbot-ops', category: 'system', group: 'Chatbot', name: 'Quản trị vận hành', unit: 'Tháng', priceType: 'fixed', price: 1000000, status: 'Đang áp dụng', scope: 'Theo dõi, tối ưu và vận hành chatbot.', quota: NO_QUOTA },
  { id: 'maps-setup', category: 'system', group: 'Google Maps', name: 'Khởi tạo & Đồng bộ', unit: 'Gói', priceType: 'fixed', price: 2000000, status: 'Đang áp dụng', scope: 'Khởi tạo và đồng bộ hồ sơ Google Maps.', quota: NO_QUOTA },
  { id: 'maps-ops', category: 'system', group: 'Google Maps', name: 'Quản trị tối ưu (MEO)', unit: 'Tháng', priceType: 'fixed', price: 2000000, status: 'Đang áp dụng', scope: 'Tối ưu và quản trị hồ sơ Google Maps.', quota: NO_QUOTA },
  { id: 'website-landing', category: 'system', group: 'Website', name: 'Landing Page', unit: 'Gói', priceType: 'fixed', price: 5000000, status: 'Đang áp dụng', scope: 'Thiết kế và triển khai landing page.', quota: NO_QUOTA },
  { id: 'website-build', category: 'system', group: 'Website', name: 'Website', unit: 'Gói', priceType: 'fixed', price: 15000000, status: 'Đang áp dụng', scope: 'Thiết kế và triển khai website.', quota: NO_QUOTA },
  { id: 'website-ops', category: 'system', group: 'Website', name: 'Quản trị', unit: 'Tháng', priceType: 'fixed', price: 2000000, status: 'Đang áp dụng', scope: 'Quản trị và cập nhật website.', quota: NO_QUOTA },
  { id: 'design-basic', category: 'brand', group: 'Graphic Design', name: 'Basic', unit: 'Tháng', priceType: 'fixed', price: 2000000, status: 'Đang áp dụng', scope: 'Gói thiết kế đồ họa cơ bản.', quota: { posts: 8, shoots: 0, plans: 1, brandPosts: 8, salesPosts: 0 } },
  { id: 'design-premium', category: 'brand', group: 'Graphic Design', name: 'Premium', unit: 'Tháng', priceType: 'fixed', price: 5000000, status: 'Đang áp dụng', scope: 'Gói thiết kế đồ họa nâng cao.', quota: { posts: 12, shoots: 0, plans: 1, brandPosts: 10, salesPosts: 2 } },
  { id: 'full-funnel', category: 'growth', group: 'Trọn gói tăng trưởng', name: 'Full phễu – Full khách', unit: 'Tháng', priceType: 'fixed', price: 19000000, status: 'Đang áp dụng', scope: 'Gói tăng trưởng theo phễu toàn diện.', quota: { posts: 20, shoots: 2, plans: 1, brandPosts: 14, salesPosts: 6 } },
  { id: 'growth-basic', category: 'growth', group: 'Xây kênh tăng trưởng doanh thu', name: 'Basic', unit: 'Tháng', priceType: 'fixed', price: 9000000, status: 'Đang áp dụng', scope: '1 Content Plan · 1 buổi shoot · 12 post/tháng (9 thương hiệu, 3 bán hàng).', quota: { posts: 12, shoots: 1, plans: 1, brandPosts: 9, salesPosts: 3 } },
  // As written in the signed contracts (Salanca 11tr, Tiệm Bánh Những Chàng Trai 13tr): 12 posts, 2 shoots; 13tr adds an actor.
  { id: 'growth-standard', category: 'growth', group: 'Xây kênh tăng trưởng doanh thu', name: 'Standard', unit: 'Tháng', priceType: 'fixed', price: 11000000, status: 'Đang áp dụng', scope: '1 Content Plan · 2 buổi shoot · 12 post/tháng.', quota: { posts: 12, shoots: 2, plans: 1, brandPosts: 9, salesPosts: 3 } },
  { id: 'growth-plus', category: 'growth', group: 'Xây kênh tăng trưởng doanh thu', name: 'Plus', unit: 'Tháng', priceType: 'fixed', price: 13000000, status: 'Đang áp dụng', scope: '1 Content Plan · 2 buổi shoot có diễn viên · 12 post/tháng.', quota: { posts: 12, shoots: 2, plans: 1, brandPosts: 9, salesPosts: 3 } },
  { id: 'ads-management', category: 'growth', group: 'Ads Management', name: 'Quản trị quảng cáo', unit: 'Tháng', priceType: 'fixed', price: 2000000, status: 'Đang áp dụng', scope: 'Quản trị quảng cáo theo chu kỳ.', quota: NO_QUOTA },
]

/** Every package starts with the SOP timeline for its quota; Administrator adjusts it per package. */
export const seedPackages: ServicePackage[] = packageRows.map((item) => {
  const quota = item.unit === 'Gói' ? { ...item.quota, once: true } : item.quota
  return { ...item, quota, timeline: defaultTimeline(quota, DEFAULT_PARAMS) }
})

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
