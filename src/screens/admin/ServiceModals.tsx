import { useApp } from '../../app/context'
import { field } from '../../lib/form'
import { update, useData } from '../../store/store'
import type { PriceType, ServicePackage } from '../../store/types'
import { FormActions, Modal } from '../../ui/Modal'

export function CategoryModal() {
  const { closeModal, toast } = useApp()
  return (
    <Modal
      title="Tạo nhóm dịch vụ"
      backdropClassName="service-modal"
      onSubmit={(form) => {
        const code = field(form, 'code')
        update((draft) => {
          draft.categories.push({ id: code.toLocaleLowerCase('vi').replace(/[^a-z0-9]+/g, '-'), name: field(form, 'name'), code: code.toUpperCase(), status: 'Đang áp dụng' })
        })
        closeModal()
        toast('Đã tạo nhóm dịch vụ.')
      }}
    >
      <div className="form">
        <div className="field"><label>Tên nhóm dịch vụ</label><input name="name" required autoFocus /></div>
        <div className="field"><label>Mã nhóm</label><input name="code" required maxLength={6} /></div>
        <FormActions submit="Lưu thay đổi" />
      </div>
    </Modal>
  )
}

export function PackageModal({ item }: { item?: ServicePackage }) {
  const { closeModal, toast } = useApp()
  const { categories } = useData()
  return (
    <Modal
      title={(item ? 'Sửa ' : 'Tạo ') + 'gói dịch vụ'}
      backdropClassName="service-modal"
      onSubmit={(form) => {
        const values: Omit<ServicePackage, 'id'> = {
          category: field(form, 'category'),
          group: field(form, 'group'),
          name: field(form, 'name'),
          unit: field(form, 'unit'),
          priceType: field(form, 'priceType') as PriceType,
          price: Number(field(form, 'price') || 0),
          scope: field(form, 'scope'),
          status: field(form, 'status') as ServicePackage['status'],
          quota: {
            posts: Number(field(form, 'qPosts') || 0),
            shoots: Number(field(form, 'qShoots') || 0),
            plans: Number(field(form, 'qPlans') || 0),
            brandPosts: Number(field(form, 'qBrand') || 0),
            salesPosts: Number(field(form, 'qSales') || 0),
          },
        }
        if (values.quota.brandPosts + values.quota.salesPosts !== values.quota.posts) {
          toast('Tổng bài thương hiệu và bán hàng phải bằng số bài mỗi chu kỳ.')
          return
        }
        update((draft) => {
          const existing = item && draft.packages.find((entry) => entry.id === item.id)
          if (existing) Object.assign(existing, values)
          else draft.packages.push({ id: 'svc-' + Date.now(), ...values })
        })
        closeModal()
        toast((item ? 'Đã cập nhật' : 'Đã tạo') + ' gói dịch vụ.')
      }}
    >
      <div className="form">
        <div className="form-grid">
          <div className="field"><label>Nhóm dịch vụ</label>
            <select name="category" required defaultValue={item?.category} autoFocus>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          </div>
          <div className="field"><label>Gói dịch vụ</label><input name="group" required defaultValue={item?.group} placeholder="Ví dụ: Chatbot" /></div>
        </div>
        <div className="form-grid">
          <div className="field"><label>Phân loại gói</label><input name="name" required defaultValue={item?.name} placeholder="Ví dụ: Quản trị vận hành" /></div>
          <div className="field"><label>Đơn vị tính</label>
            <select name="unit" defaultValue={item?.unit}><option>Gói</option><option>Tháng</option><option>Buổi</option><option>Hạng mục</option></select>
          </div>
        </div>
        <div className="form-grid">
          <div className="field"><label>Dạng giá</label>
            <select name="priceType" defaultValue={item?.priceType}>
              <option value="fixed">Giá cố định</option><option value="range">Khoảng giá</option><option value="from">Giá từ</option><option value="quote">Báo giá riêng</option>
            </select>
          </div>
          <div className="field"><label>Đơn giá chưa VAT</label><input name="price" type="number" min="0" defaultValue={item?.price || ''} /></div>
        </div>
        <div className="form-grid">
          <div className="field"><label>Bài / chu kỳ</label><input name="qPosts" type="number" min="0" defaultValue={item?.quota.posts ?? 0} /></div>
          <div className="field"><label>Buổi shoot / chu kỳ</label><input name="qShoots" type="number" min="0" defaultValue={item?.quota.shoots ?? 0} /></div>
        </div>
        <div className="form-grid">
          <div className="field"><label>Bài thương hiệu</label><input name="qBrand" type="number" min="0" defaultValue={item?.quota.brandPosts ?? 0} /></div>
          <div className="field"><label>Bài bán hàng</label><input name="qSales" type="number" min="0" defaultValue={item?.quota.salesPosts ?? 0} /></div>
        </div>
        <div className="field"><label>Content Plan / chu kỳ</label><input name="qPlans" type="number" min="0" max="1" defaultValue={item?.quota.plans ?? 0} /></div>
        <div className="field"><label>Phạm vi gói dịch vụ</label><textarea name="scope" required defaultValue={item?.scope} /></div>
        <div className="field"><label>Trạng thái</label>
          <select name="status" defaultValue={item?.status}><option>Đang áp dụng</option><option>Ngừng áp dụng</option></select>
        </div>
        <FormActions submit="Lưu thay đổi" />
      </div>
    </Modal>
  )
}
