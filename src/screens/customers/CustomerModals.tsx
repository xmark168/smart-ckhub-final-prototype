import { useApp } from '../../app/context'
import { CURRENT_ACCOUNT } from '../../lib/format'
import { getData, update } from '../../store/store'
import type { Customer } from '../../store/types'
import { field } from '../../lib/form'
import { FormActions, Modal } from '../../ui/Modal'
import { addCustomerActivity } from './customerLogic'

function AreaSelect({ value = 'HCM' }: { value?: string }) {
  return (
    <label className="field">Khu vực
      <select name="area" defaultValue={value}><option>HCM</option><option>HN</option><option>Tỉnh</option></select>
    </label>
  )
}

export function CreateCustomerModal({ onCreated }: { onCreated: () => void }) {
  const { closeModal } = useApp()
  return (
    <Modal
      title="Tạo khách hàng"
      onSubmit={(form) => {
        update((draft) => {
          draft.customers.unshift({
            id: 'customer-' + Date.now(),
            name: field(form, 'name'),
            owner: field(form, 'owner'),
            area: field(form, 'area'),
            projectCode: 'Chưa có dự án',
            state: 'active',
            attention: false,
            newCustomer: true,
            cycle: 'Chưa cập nhật',
            service: 'Chưa chọn dịch vụ',
            contact: 'Thiếu đầu mối chính',
            createdBy: CURRENT_ACCOUNT,
            activities: [],
          })
        })
        closeModal()
        onCreated()
      }}
    >
      <div className="form">
        <label className="field">Tên thương hiệu<input name="name" required autoFocus /></label>
        <label className="field">Account phụ trách<input name="owner" required /></label>
        <AreaSelect />
        <FormActions submit="Tạo khách hàng" />
      </div>
    </Modal>
  )
}

export function EditCustomerModal({ customer }: { customer: Customer }) {
  const { closeModal } = useApp()
  return (
    <Modal
      title="Sửa khách hàng"
      onSubmit={(form) => {
        update((draft) => {
          const target = draft.customers.find((item) => item.id === customer.id)
          if (!target) return
          target.name = field(form, 'name')
          target.owner = field(form, 'owner')
          target.area = field(form, 'area')
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Tên thương hiệu<input name="name" required defaultValue={customer.name} /></label>
        <label className="field">Account phụ trách<input name="owner" required defaultValue={customer.owner} /></label>
        <AreaSelect value={customer.area} />
        <FormActions submit="Lưu thay đổi" />
      </div>
    </Modal>
  )
}

export function StopCustomerProjectModal({ customer }: { customer: Customer }) {
  const { closeModal } = useApp()
  return (
    <Modal
      title="Dừng dự án"
      onSubmit={(form) => {
        update((draft) => {
          const target = draft.customers.find((item) => item.id === customer.id)
          if (!target) return
          target.state = 'stopped'
          addCustomerActivity(target, 'Đã dừng dự án', 'Hiệu lực ' + field(form, 'effectiveDate') + ' · ' + field(form, 'reason'), 'circle-pause')
        })
        closeModal()
      }}
    >
      <div className="form">
        <div className="customer-data-rules"><b>Phân quyền dừng dự án</b><p>Chỉ Account phụ trách hoặc Account tạo dự án được thực hiện. Thao tác này không thay đổi tiến độ hợp đồng.</p></div>
        <label className="field">Lý do dừng<textarea name="reason" required placeholder="Nêu lý do dừng triển khai" /></label>
        <label className="field">Ngày hiệu lực<input name="effectiveDate" type="date" required defaultValue="2026-09-22" /></label>
        <label className="filter-check"><input name="confirmed" type="checkbox" required /> Tôi xác nhận dừng dự án và đã kiểm tra ảnh hưởng tới hợp đồng, kế hoạch, công việc.</label>
        <FormActions submit="Xác nhận dừng" />
      </div>
    </Modal>
  )
}

export function AccountSummaryModal({ owner }: { owner: string }) {
  const { closeModal } = useApp()
  const assigned = getData().customers.filter((item) => item.owner === owner)
  const active = assigned.filter((item) => item.state === 'active')
  return (
    <Modal title="Tóm tắt Account">
      <div className="account-summary">
        <div><span>Account phụ trách</span><b>{owner}</b></div>
        <div><span>Khách đang vận hành</span><b>{active.length}</b></div>
        <div><span>Khách cần chú ý</span><b>{active.filter((item) => item.attention).length}</b></div>
      </div>
      <div className="customer-data-rules"><b>Phạm vi dữ liệu</b><p>Account xem các khách hàng và dự án mình phụ trách hoặc tạo.</p></div>
      <div className="form-actions"><button className="secondary" type="button" onClick={closeModal}>Đóng</button></div>
    </Modal>
  )
}

export function CustomerFlowModal() {
  const steps: Array<[string, string, string]> = [
    ['01', 'Tạo hồ sơ', 'Gán Account phụ trách.'],
    ['02', 'Thiết lập đầu mối', 'Chọn đầu mối chính và kênh liên hệ.'],
    ['03', 'Mở dự án', 'Lập chu kỳ và đầu ra vận hành.'],
    ['04', 'Theo dõi vòng đời', 'Đánh dấu rủi ro, tạm dừng hoặc kết thúc.'],
  ]
  const statuses: Array<[string, string, string]> = [
    ['ACTIVE', 'Đang triển khai', 'Dự án có công việc hoặc chu kỳ đang chạy.'],
    ['PENDING', 'Tạm dừng', 'Tạm ngưng vận hành, có thể mở lại.'],
    ['STOP', 'Đã dừng', 'Kết thúc vận hành; chỉ lưu lịch sử để tra cứu.'],
    ['DRAFT', 'Dự án nháp', 'Chưa khởi động; không tạo công việc vận hành.'],
  ]
  return (
    <Modal title="Quy trình và quy tắc dữ liệu">
      <div className="customer-flow">
        {steps.map(([no, title, text]) => (
          <div className="customer-flow-step" key={no}><i>{no}</i><div><b>{title}</b><p>{text}</p></div></div>
        ))}
      </div>
      <section className="customer-status-standard">
        <b>Chuẩn hóa trạng thái dự án</b>
        <p>Trạng thái mô tả vòng đời vận hành. Loại dịch vụ được quản lý riêng.</p>
        {statuses.map(([code, label, text]) => (
          <div className="status-standard-row" key={code}><span>{code}</span><i>→</i><strong>{label}</strong><small>{text}</small></div>
        ))}
      </section>
      <div className="customer-data-rules"><b>Quy tắc xem dữ liệu</b><p>Account chỉ xem khách hàng và dự án mình phụ trách hoặc tạo. BODs và Administrator xem toàn bộ dữ liệu.</p></div>
    </Modal>
  )
}

export function PeriodModal() {
  const { closeModal } = useApp()
  const { period } = getData()
  return (
    <Modal
      title="Kỳ xem dashboard"
      onSubmit={(form) => {
        update((draft) => {
          draft.period = { mode: field(form, 'mode') === 'year' ? 'year' : 'month', month: field(form, 'month'), year: field(form, 'year') }
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Hiển thị theo<select name="mode" defaultValue={period.mode}><option value="month">Tháng</option><option value="year">Năm</option></select></label>
        <label className="field">Tháng<select name="month" defaultValue={period.month}><option value="09">Tháng 09</option><option value="10">Tháng 10</option></select></label>
        <label className="field">Năm<select name="year" defaultValue={period.year}><option value="2026">2026</option></select></label>
        <FormActions submit="Áp dụng" />
      </div>
    </Modal>
  )
}
