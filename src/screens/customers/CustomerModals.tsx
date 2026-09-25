import { useApp } from '../../app/context'
import { ACCOUNTS, formatDate, parseInput, TODAY } from '../../lib/format'
import { checked, field } from '../../lib/form'
import { projectHealth } from '../../lib/sop'
import { getData, update, useData } from '../../store/store'
import type { Customer } from '../../store/types'
import { FormActions, Modal } from '../../ui/Modal'
import { addCustomerActivity, customerStatus, endBlockers, sameName } from './customerLogic'

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

function AreaSelect({ value = 'HCM' }: { value?: string }) {
  return (
    <label className="field">Khu vực
      <select name="area" defaultValue={value}><option>HCM</option><option>HN</option><option>Tỉnh</option></select>
    </label>
  )
}

function OwnerSelect({ value }: { value: string }) {
  return (
    <label className="field">Account phụ trách
      <select name="owner" defaultValue={value}>{ACCOUNTS.map((name) => <option key={name}>{name}</option>)}</select>
    </label>
  )
}

/** Blocks a second customer with the same brand name (case and spacing ignored). */
function rejectDuplicate(form: HTMLFormElement, exceptId = ''): boolean {
  const input = form.elements.namedItem('name') as HTMLInputElement
  const match = getData().customers.find((item) => item.id !== exceptId && sameName(item.name, input.value))
  input.setCustomValidity(match ? 'Đã có khách hàng "' + match.name + '" (Account ' + match.owner + ').' : '')
  if (match) input.reportValidity()
  return Boolean(match)
}

export function CreateCustomerModal({ onCreated }: { onCreated: (id: string) => void }) {
  const { closeModal, account } = useApp()
  return (
    <Modal
      title="Tạo khách hàng"
      onSubmit={(form) => {
        if (rejectDuplicate(form)) return
        const owner = field(form, 'owner')
        const id = 'customer-' + Date.now()
        update((draft) => {
          draft.customers.unshift({
            id,
            name: field(form, 'name'),
            owner,
            area: field(form, 'area'),
            createdAt: TODAY,
            createdBy: account,
            attention: false,
            activities: [{ title: 'Đã tạo hồ sơ khách hàng', detail: 'Account phụ trách: ' + owner, icon: 'users-round', time: 'Vừa xong' }],
          })
        })
        closeModal()
        onCreated(id)
      }}
    >
      <div className="form">
        <label className="field">Tên thương hiệu<input name="name" required autoFocus onInput={(event) => event.currentTarget.setCustomValidity('')} /></label>
        <OwnerSelect value={account} />
        <AreaSelect />
        <div className="customer-data-rules"><p>Trạng thái khách hàng tính từ dự án. Sau khi tạo, trang chi tiết khách mở ra để lập dự án nháp.</p></div>
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
        if (rejectDuplicate(form, customer.id)) return
        const owner = field(form, 'owner')
        const moveProjects = checked(form, 'moveProjects')
        update((draft) => {
          const target = draft.customers.find((item) => item.id === customer.id)
          if (!target) return
          const previous = target.owner
          target.name = field(form, 'name')
          target.owner = owner
          target.area = field(form, 'area')
          draft.projects.forEach((project) => {
            if (project.customerId !== target.id) return
            project.customer = target.name
            if (moveProjects && project.owner === previous && project.state !== 'stopped') {
              project.owner = owner
              project.team.account = owner
            }
          })
          if (previous !== owner) addCustomerActivity(target, 'Đổi Account phụ trách', previous + ' → ' + owner + (moveProjects ? ' · chuyển cả dự án đang mở' : ''), 'user-round')
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Tên thương hiệu<input name="name" required defaultValue={customer.name} onInput={(event) => event.currentTarget.setCustomValidity('')} /></label>
        <OwnerSelect value={customer.owner} />
        <label className="filter-check"><input name="moveProjects" type="checkbox" defaultChecked /> Chuyển cả dự án đang mở của Account cũ sang Account mới</label>
        <AreaSelect value={customer.area} />
        <FormActions submit="Lưu thay đổi" />
      </div>
    </Modal>
  )
}

/** Kết thúc hợp tác: only once every project is stopped and no contract is still open. */
export function EndCooperationModal({ customer }: { customer: Customer }) {
  const { closeModal } = useApp()
  const { projects, contracts } = useData()
  const blockers = endBlockers(customer, projects, contracts)
  if (blockers.length) {
    return (
      <Modal title="Chưa thể kết thúc hợp tác">
        <div className="customer-data-rules">
          <b>Cần xử lý trước</b>
          <p>{blockers.join(' · ')}</p>
          <p>Dừng từng dự án tại trang dự án; kết thúc hoặc hủy hợp đồng tại Hợp đồng &amp; công nợ.</p>
        </div>
        <div className="form-actions"><button className="primary" type="button" onClick={closeModal}>Đóng</button></div>
      </Modal>
    )
  }
  return (
    <Modal
      title="Kết thúc hợp tác"
      onSubmit={(form) => {
        const date = field(form, 'date')
        const reason = field(form, 'reason')
        update((draft) => {
          const target = draft.customers.find((item) => item.id === customer.id)
          if (!target) return
          target.ended = { date, reason }
          target.attention = false
          addCustomerActivity(target, 'Đã kết thúc hợp tác', formatDate(parseInput(date)) + ' · ' + reason, 'circle-stop')
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Lý do<textarea name="reason" required placeholder="Ví dụ: khách chuyển sang tự vận hành kênh" /></label>
        <label className="field">Ngày kết thúc<input name="date" type="date" required defaultValue={TODAY} /></label>
        <label className="filter-check"><input type="checkbox" required /> Tôi xác nhận mọi dự án đã dừng và hợp đồng đã đóng.</label>
        <FormActions submit="Kết thúc hợp tác" />
      </div>
    </Modal>
  )
}

export function AccountSummaryModal({ owner }: { owner: string }) {
  const { closeModal } = useApp()
  const { customers, projects, params } = useData()
  const assigned = customers.filter((item) => item.owner === owner)
  const working = assigned.filter((item) => customerStatus(item, projects) === 'active')
  const active = projects.filter((item) => item.owner === owner && item.state === 'active')
  const late = active.filter((item) => projectHealth(item, params).level === 'late')
  return (
    <Modal title={'Account ' + owner}>
      <div className="account-summary">
        <div><span>Khách đang hợp tác</span><b>{working.length} / {assigned.length}</b></div>
        <div><span>Dự án đang triển khai</span><b>{active.length}</b></div>
        <div><span>Dự án trễ mốc SOP</span><b>{late.length}</b></div>
      </div>
      {late.length > 0 && <div className="customer-data-rules"><b>Dự án trễ</b><p>{late.map((item) => item.customer + ' — ' + projectHealth(item, params).reason).join(' · ')}</p></div>}
      <div className="customer-data-rules"><b>Phạm vi dữ liệu</b><p>Account xem các khách hàng và dự án mình phụ trách hoặc tạo.</p></div>
      <div className="form-actions"><button className="secondary" type="button" onClick={closeModal}>Đóng</button></div>
    </Modal>
  )
}

export function CustomerFlowModal() {
  const steps: Array<[string, string, string]> = [
    ['01', 'Tạo hồ sơ', 'Gán Account phụ trách.'],
    ['02', 'Thiết lập đầu mối', 'Chọn đầu mối chính và kênh liên hệ.'],
    ['03', 'Mở dự án', 'Tạo dự án nháp, hoàn tất Cổng khởi động rồi bắt đầu chu kỳ 1.'],
    ['04', 'Theo dõi vòng đời', 'Tạm dừng / dừng trên từng dự án. Kết thúc hợp tác khi mọi dự án đã dừng và hợp đồng đã đóng.'],
  ]
  const statuses: Array<[string, string, string]> = [
    ['ACTIVE', 'Đang hợp tác', 'Có ít nhất một dự án đang triển khai.'],
    ['DRAFT', 'Chờ khởi động', 'Chỉ có dự án nháp, chưa qua Cổng khởi động.'],
    ['PENDING', 'Tạm ngưng', 'Không có dự án đang chạy; còn dự án tạm dừng hoặc đã dừng.'],
    ['NONE', 'Chưa có dự án', 'Hồ sơ mới, chưa tạo dự án.'],
    ['END', 'Đã kết thúc hợp tác', 'Account xác nhận kết thúc, có lý do; chỉ lưu lịch sử.'],
  ]
  return (
    <Modal title="Quy trình và quy tắc dữ liệu">
      <div className="customer-flow">
        {steps.map(([no, title, text]) => (
          <div className="customer-flow-step" key={no}><i>{no}</i><div><b>{title}</b><p>{text}</p></div></div>
        ))}
      </div>
      <section className="customer-status-standard">
        <b>Trạng thái khách hàng</b>
        <p>Tính tự động từ các dự án của khách. Chỉ Đã kết thúc hợp tác do Account ghi nhận.</p>
        {statuses.map(([code, label, text]) => (
          <div className="status-standard-row" key={code}><span>{code}</span><i>→</i><strong>{label}</strong><small>{text}</small></div>
        ))}
      </section>
<div className="customer-data-rules">
        <b>Quy tắc xem và thao tác</b>
        <p>Account chỉ xem khách hàng và dự án mình phụ trách hoặc tạo; mở khách ngoài phạm vi bằng link chỉ ở chế độ xem. Chỉ Account phụ trách hoặc Account tạo khách được sửa, gắn cờ, kết thúc hợp tác. BODs và Administrator xem toàn bộ, không thao tác.</p>
      </div>
      <div className="customer-data-rules">
        <b>Chỉ số và kỳ xem</b>
        <p>Khách hiện hữu: mọi khách chưa kết thúc hợp tác (gồm đang hợp tác, chờ khởi động, tạm ngưng, chưa có dự án). Khách cần chú ý: có dự án trễ mốc SOP, dự án gắn cờ, công nợ quá hạn hoặc cờ tay. Khách mới trong kỳ: ngày tạo hồ sơ nằm trong kỳ xem, kể cả khách đã kết thúc hợp tác sau đó. Kỳ xem hiện chỉ áp dụng cho số khách mới.</p>
      </div>
      <div className="customer-data-rules">
        <b>Kết thúc hợp tác</b>
        <p>Chỉ thực hiện khi mọi dự án đã dừng và không còn hợp đồng Hiệu lực hoặc Nháp. Dự án nháp khách không chốt thì Hủy nháp tại trang dự án. Kết thúc cần lý do và ngày; có thể mở lại hợp tác rồi tạo dự án mới.</p>
      </div>
      <div className="customer-data-rules">
        <b>Đổi Account phụ trách</b>
        <p>Có thể chuyển kèm các dự án đang mở của Account cũ. Account đã tạo dự án vẫn thấy dự án đó. Đổi tên khách cập nhật tên trên dự án; hợp đồng đã lập giữ tên tại thời điểm ký (bản prototype chưa đồng bộ).</p>
      </div>
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
        <label className="field">Tháng<select name="month" defaultValue={period.month}>{MONTHS.map((month) => <option key={month} value={month}>Tháng {month}</option>)}</select></label>
        <label className="field">Năm<select name="year" defaultValue={period.year}>{['2025', '2026'].map((year) => <option key={year}>{year}</option>)}</select></label>
        <FormActions submit="Áp dụng" />
      </div>
    </Modal>
  )
}
