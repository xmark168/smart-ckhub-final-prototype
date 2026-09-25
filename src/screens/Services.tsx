import { useApp } from '../app/context'
import { servicePrice } from '../data/catalog'
import { includesText } from '../lib/format'
import { useScreenState } from '../lib/useScreenState'
import { update, useData } from '../store/store'
import type { PriceType, ServicePackage } from '../store/types'
import { field } from '../lib/form'
import { FormActions, Modal } from '../ui/Modal'

function CategoryModal() {
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

function PackageModal({ item }: { item?: ServicePackage }) {
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
        <div className="field"><label>Phạm vi gói dịch vụ</label><textarea name="scope" required defaultValue={item?.scope} /></div>
        <div className="field"><label>Trạng thái</label>
          <select name="status" defaultValue={item?.status}><option>Đang áp dụng</option><option>Ngừng áp dụng</option></select>
        </div>
        <FormActions submit="Lưu thay đổi" />
      </div>
    </Modal>
  )
}

export function ServicesScreen() {
  const { showModal, toast } = useApp()
  const { categories, packages } = useData()
  const [filters, setFilters] = useScreenState('services.filters', { query: '', category: '', status: '' })
  const active = packages.filter((item) => item.status === 'Đang áp dụng')
  const list = packages.filter(
    (item) => (!filters.category || item.category === filters.category) && (!filters.status || item.status === filters.status) && includesText([item.group, item.name, item.scope], filters.query),
  )
  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? '—'
  const toggle = (item: ServicePackage) => {
    const next = item.status === 'Đang áp dụng' ? 'Ngừng áp dụng' : 'Đang áp dụng'
    update((draft) => {
      const target = draft.packages.find((entry) => entry.id === item.id)
      if (target) target.status = next
    })
    toast('Đã ' + (next === 'Đang áp dụng' ? 'áp dụng lại' : 'ngừng áp dụng') + ' gói dịch vụ. Lịch sử hợp đồng giữ nguyên.')
  }

  return (
    <section className="screen active" id="services">
      <div className="page-head">
        <div><h1>Quản lý gói dịch vụ</h1><p>Danh mục chuẩn dùng khi lập hợp đồng và dự án.</p></div>
        <div className="top-right">
          <button className="secondary" onClick={() => showModal(<CategoryModal />)}>+ Nhóm dịch vụ</button>
          <button className="primary" onClick={() => showModal(<PackageModal />)}>+ Gói dịch vụ</button>
        </div>
      </div>
      <div className="metrics">
        <div className="metric hero"><label>Gói đang áp dụng</label><strong>{active.length}</strong><small>Dùng cho hợp đồng và dự án mới</small></div>
        <div className="metric"><label>Nhóm dịch vụ</label><strong>{categories.length}</strong><small>Danh mục điều hướng</small></div>
        <div className="metric"><label>Thu theo tháng</label><strong>{active.filter((item) => item.unit === 'Tháng').length}</strong><small>Gói vận hành định kỳ</small></div>
        <div className="metric"><label>Ngừng áp dụng</label><strong>{packages.length - active.length}</strong><small>Giữ lịch sử hợp đồng cũ</small></div>
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>Danh mục dịch vụ</h2>
          <div className="service-toolbar">
            <input placeholder="Tìm gói hoặc phân loại" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} />
            <select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
              <option value="">Tất cả nhóm</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">Mọi trạng thái</option><option>Đang áp dụng</option><option>Ngừng áp dụng</option>
            </select>
          </div>
        </div>
        <div>
          {list.length
            ? list.map((item) => (
                <div className="service-summary" key={item.id}>
                  <div><span className="service-category">{categoryName(item.category)}</span><b className="service-package">{item.group}</b></div>
                  <div><span className="service-tier">{item.name}</span><small>{item.scope}</small></div>
                  <div><b>{servicePrice(item)}</b><small>{item.unit}</small></div>
                  <div><span className={'pill ' + (item.status === 'Đang áp dụng' ? 'ok' : 'muted')}>{item.status}</span></div>
                  <div className="row-actions">
                    <button title="Sửa gói" onClick={() => showModal(<PackageModal item={item} />)}>✎</button>
                    <button title="Đổi trạng thái" onClick={() => toggle(item)}>{item.status === 'Đang áp dụng' ? '⊘' : '↺'}</button>
                  </div>
                </div>
              ))
            : <div className="service-empty">Không có gói dịch vụ phù hợp.</div>}
        </div>
      </section>
      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head"><h2>Quy tắc sử dụng</h2></div>
        <div className="checklist">
          <div className="check done"><i>✓</i>Khách hàng tạo nhanh; chưa cần chọn gói dịch vụ.</div>
          <div className="check done"><i>✓</i>Hợp đồng và dự án chọn Nhóm dịch vụ rồi chọn Gói dịch vụ.</div>
          <div className="check done"><i>✓</i>Giá và phạm vi được chụp theo hợp đồng; đổi danh mục không làm sai lịch sử.</div>
          <div className="check"><i />Không xóa gói đã được dùng. Chỉ chuyển sang Ngừng áp dụng.</div>
        </div>
      </section>
    </section>
  )
}
