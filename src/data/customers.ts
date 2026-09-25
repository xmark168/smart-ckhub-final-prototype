import type { Activity, Customer } from '../store/types'

/** [brand, Account phụ trách, khu vực] — danh sách khách hàng 2026. */
export const customerRows: Array<[string, string, string]> = [
  ['Ốc lắc cô mai', 'Tuyền', 'HCM'], ['Vua chả cá', 'Nguyên', 'HN'], ['Em Tèo Food', 'Nguyên', 'HCM'], ['Mê Thái', 'Tuyền', 'HCM'],
  ['Góc Đà Lạt', 'Nguyên', 'HN'], ['A Mẹt Quán', 'Hiền', 'HCM'], ['Lẩu Cá 69 Tư Sơn', 'Nguyên', 'HCM'], ['Fenghuang', 'Minh Anh', 'HN'],
  ['YẾN SÀO KHÁNH VIỆT', 'Nguyên', 'HCM'], ['Chunn BBQ', 'Tuyền', 'HCM'], ['Korean Grill', 'Nguyên', 'HCM'], ['Jang Kitchen', 'Minh Anh', 'HN'],
  ['Tửu Lầu 13', 'Hiền', 'HCM'], ["Papa Lee's Noodle Kitchen", 'Minh Anh', 'HCM'], ['Chada Thai', 'Hiền', 'HCM'], ['Cơm Tấm Tài', 'Hiền', 'HCM'],
  ['Kohaku Sushi', 'Tuyền', 'HCM'], ['Kohaku Ramen & Udon', 'Tuyền', 'HCM'], ['ROCK Kitchen Bar', 'Hiền', 'HCM'], ['Vua Cá Sạch', 'Minh Anh', 'HN'],
  ['Dìn Ký', 'Hiền', 'HCM'], ['R95', 'Minh Anh', 'HCM'], ['Tacos WIBU', 'Nguyên', 'HCM'], ['CULI CAFE', 'Minh Anh', 'HN'],
  ['Bún Cá Vạn Lộc', 'Nguyên', 'HN'], ['THI garden', 'Nguyên', 'HCM'], ['Bò Bảy Món Phương Trinh', 'Nguyên', 'Tỉnh'], ['Nhà Hàng Năm Châu', 'Minh Anh', 'HN'],
  ['CUPCUP BAKERY', 'Nguyên', 'HCM'], ['Date & Kohaku Sashimi & Yakiniku', 'Tuyền', 'HCM'], ['Akataiyo Sushi', 'Minh Anh', 'HCM'], ['NHÀ HÀNG CHAY AN', 'Nguyên', 'HCM'],
  ['Tiamo Phú Thịnh', 'Nguyên', 'HCM'], ['Quán Nhậu Dân Chủ', 'Minh Anh', 'HN'], ['Fujiyama', 'Tuyền', 'HCM'], ['YANCHA', 'Minh Anh', 'HN'],
  ['Anassa', 'Nguyên', 'HN'], ['Nhà hàng HANKOOK BBQ', 'Minh Anh', 'HN'], ['Bò Nướng Khói', 'Nguyên', 'HCM'], ['Hidden Charm Restaurant', 'Minh Anh', 'HCM'],
  ['Shan Thái', 'Tuyền', 'HCM'], ['DEERLANDS', 'Minh Anh', 'HCM'], ['Bánh Mì Trạng', 'Tuyền', 'HCM'], ['Ốc Trứng Muối', 'Hiền', 'HCM'],
  ['Lắc Chill Zone', 'Hiền', 'HCM'], ['Thuyền Buồm', 'Hiền', 'HCM'], ["Sương's Food", 'Nguyên', 'HCM'], ['Ẩm Thực Chim Rừng', 'Nguyên', 'HCM'],
  ['HI PANDA', 'Minh Anh', 'HCM'], ['Huyền Anh', 'Nguyên', 'HN'], ['Howdy’s Tacos', 'Minh Anh', 'HCM'], ['Thèm Nướng', 'Hiền', 'HCM'],
  ['Quán Ba Hào', 'Minh Anh', 'HCM'], ['Flan trà King Kong', 'Hiền', 'HCM'], ['Gà Ta Thảo Vân', 'Hải', 'HCM'],
]

/** Khách mới ghi nhận riêng, dùng chung cho danh sách dự án. */
export const extraCustomer: [string, string, string] = ['Ẩm Thực Phước Quắn', 'Hải', 'HCM']

function seedActivities(owner: string): Activity[] {
  return [{ title: 'Đã tạo hồ sơ khách hàng', time: '01.01.2026', detail: 'Account phụ trách: ' + owner, icon: 'users-round' }]
}

export function customerIdAt(index: number): string {
  return index < customerRows.length ? 'customer-' + index : 'customer-phuoc-quan'
}

export function seedCustomers(): Customer[] {
  return [...customerRows, extraCustomer].map(([name, owner, area], index) => ({
    id: customerIdAt(index),
    name,
    owner,
    area,
    // Mê Thái, Gà Ta Thảo Vân and Phước Quắn joined this month; the rest are 2026 carry-overs.
    createdAt: index === 3 || index === 54 || index === 55 ? '2026-09-10' : '2026-01-01',
    attention: false,
    ended: name === 'Dìn Ký' ? { date: '2026-08-31', reason: 'Khách dừng hợp tác sau chu kỳ tháng 8.' } : undefined,
    activities: seedActivities(owner),
  }))
}
