import { useRef, useState } from 'react'
import { useApp } from '../../app/context'
import { packageLabel } from '../../data/catalog'
import { projectCustomers } from '../../data/projects'
import { ACCOUNTS, addBusinessDays, CURRENT_ACCOUNT, cycleEnd, displayToInput, formatDate, inputToDisplay, parseInput } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { getData, update, useData } from '../../store/store'
import type { Onboarding, Project } from '../../store/types'
import { checked, field } from '../../lib/form'
import { FormActions, Modal } from '../../ui/Modal'
import { ContractDetailModal, ContractFormModal } from '../contracts/ContractModals'
import { addProjectActivity, onboardingItems, onboardingReady, updateProject } from './projectLogic'

export function CreateProjectModal({ onCreated }: { onCreated: () => void }) {
  const { closeModal } = useApp()
  const { categories, packages, projects } = useData()
  const activePackages = packages.filter((item) => item.status === 'Đang áp dụng')
  const usableCategories = categories.filter((category) => activePackages.some((item) => item.category === category.id))
  const choices = [...projectCustomers].sort((a, b) => a[0].localeCompare(b[0], 'vi'))
  const customerRef = useRef<HTMLInputElement>(null)
  const [customerText, setCustomerText] = useState('')
  const [owner, setOwner] = useState(ACCOUNTS[0])
  const [category, setCategory] = useState(usableCategories[0]?.id ?? '')
  const categoryPackages = activePackages.filter((item) => item.category === category)
  const [packageId, setPackageId] = useState(categoryPackages[0]?.id ?? '')
  const findCustomer = (text: string) => choices.find((item) => item[0].toLocaleLowerCase('vi') === text.trim().toLocaleLowerCase('vi'))

  if (!activePackages.length) {
    return (
      <Modal title="Tạo dự án">
        <div className="customer-data-rules"><p>Chưa có gói dịch vụ đang áp dụng.</p></div>
        <div className="form-actions"><button className="primary" type="button" onClick={closeModal}>Đóng</button></div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Tạo dự án"
      onSubmit={() => {
        const customer = findCustomer(customerText)
        const service = activePackages.find((item) => item.id === packageId)
        if (!customer) {
          customerRef.current?.setCustomValidity('Chọn khách hàng từ danh sách gợi ý.')
          customerRef.current?.reportValidity()
          return
        }
        if (!service) return
        update((draft) => {
          draft.projects.unshift({
            id: 'project-' + Date.now(),
            code: 'DA-2026-' + String(projects.length + 1).padStart(3, '0'),
            customer: customer[0],
            owner,
            createdBy: CURRENT_ACCOUNT,
            area: customer[2],
            service: packageLabel(service),
            servicePackageId: service.id,
            serviceScope: service.scope,
            servicePrice: service.price,
            contractCode: '',
            state: 'draft',
            risk: false,
            cycle: 0,
            total: 0,
            progress: 0,
            cycleStart: '',
            due: '',
            posts: 0,
            shooting: 0,
            tasks: 0,
            activities: [{ icon: 'file-plus-2', title: 'Dự án nháp đã tạo', detail: 'Chờ Account bắt đầu triển khai và tạo chu kỳ 1.' }],
          })
        })
        closeModal()
        onCreated()
      }}
    >
      <div className="form">
        <label className="field">Khách hàng
          <input
            ref={customerRef}
            name="customer"
            type="search"
            list="projectCustomerOptions"
            required
            autoComplete="off"
            placeholder="Tìm và chọn khách hàng"
            value={customerText}
            onChange={(event) => {
              const text = event.target.value
              const match = findCustomer(text)
              setCustomerText(text)
              if (match && !findCustomer(customerText)) setOwner(match[1])
              event.target.setCustomValidity(match ? '' : 'Chọn khách hàng từ danh sách gợi ý.')
            }}
          />
          <datalist id="projectCustomerOptions">
            {choices.map((item) => <option key={item[0]} value={item[0]} />)}
          </datalist>
        </label>
        <label className="field">Account phụ trách
          <select name="owner" value={owner} onChange={(event) => setOwner(event.target.value)}>
            {ACCOUNTS.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="field">Nhóm dịch vụ
          <select
            name="serviceCategory"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value)
              setPackageId(activePackages.find((item) => item.category === event.target.value)?.id ?? '')
            }}
          >
            {usableCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="field">Gói dịch vụ
          <select name="servicePackage" required value={packageId} onChange={(event) => setPackageId(event.target.value)}>
            {categoryPackages.map((item) => <option key={item.id} value={item.id}>{packageLabel(item)}</option>)}
          </select>
        </label>
        <div className="customer-data-rules"><p>Dự án được tạo ở trạng thái nháp. Ngày bắt đầu và hạn chu kỳ chỉ được tạo khi Account bấm Bắt đầu triển khai. Gói dịch vụ lấy từ danh mục đang áp dụng và lưu snapshot tại thời điểm tạo.</p></div>
        <FormActions submit="Tạo dự án nháp" />
      </div>
    </Modal>
  )
}

export function EditProjectModal({ project }: { project: Project }) {
  const { closeModal, toast } = useApp()
  const packages = useData().packages.filter((item) => item.status === 'Đang áp dụng' || item.id === project.servicePackageId)
  return (
    <Modal
      title="Sửa dự án"
      onSubmit={(form) => {
        const service = packages.find((item) => item.id === field(form, 'servicePackage'))
        if (!service) return
        updateProject(project.id, (item) => {
          item.owner = field(form, 'owner')
          item.servicePackageId = service.id
          item.service = packageLabel(service)
          item.serviceScope = service.scope
          item.servicePrice = service.price
          addProjectActivity(item, 'pencil', 'Thông tin dự án đã cập nhật', 'Account, gói dịch vụ hoặc hợp đồng được điều chỉnh.')
        })
        closeModal()
        toast('Đã lưu thay đổi dự án.')
      }}
    >
      <div className="form">
        <label className="field">Account phụ trách
          <select name="owner" defaultValue={project.owner}>{ACCOUNTS.map((name) => <option key={name} value={name}>{name}</option>)}</select>
        </label>
        <label className="field">Gói dịch vụ
          <select name="servicePackage" required defaultValue={project.servicePackageId}>
            {packages.map((item) => <option key={item.id} value={item.id}>{packageLabel(item)}</option>)}
          </select>
        </label>
        <div className="customer-data-rules"><p>Đổi gói chỉ áp dụng từ thời điểm lưu và tạo snapshot mới cho dự án. Hợp đồng chính và số chu kỳ chỉ quản lý tại Hợp đồng &amp; công nợ. Ngày bắt đầu chu kỳ không sửa ở đây.</p></div>
        <FormActions submit="Lưu thay đổi" />
      </div>
    </Modal>
  )
}

export function StopProjectModal({ project }: { project: Project }) {
  const { closeModal } = useApp()
  return (
    <Modal
      title="Dừng dự án"
      onSubmit={(form) => {
        updateProject(project.id, (item) => {
          item.state = 'stopped'
          item.risk = false
          addProjectActivity(item, 'circle-stop', 'Dự án đã dừng', 'Lý do: ' + field(form, 'reason'))
        })
        closeModal()
      }}
    >
      <div className="form">
        <div className="customer-data-rules"><b>Phân quyền dừng dự án</b><p>Chỉ Account phụ trách hoặc Account tạo dự án được thực hiện. Tiến độ hợp đồng {project.cycle} / {project.total} được giữ nguyên.</p></div>
        <label className="field">Lý do dừng<textarea name="reason" required placeholder="Nêu lý do dừng triển khai" /></label>
        <label className="field">Ngày hiệu lực<input name="effectiveDate" type="date" required defaultValue="2026-09-22" /></label>
        <label className="filter-check"><input name="confirmed" type="checkbox" required /> Tôi xác nhận đã kiểm tra ảnh hưởng tới hợp đồng, kế hoạch và công việc.</label>
        <FormActions submit="Xác nhận dừng" />
      </div>
    </Modal>
  )
}

export function StartProjectModal({ project }: { project: Project }) {
  const { closeModal, toast } = useApp()
  return (
    <Modal
      title="Bắt đầu triển khai"
      onSubmit={(form) => {
        const start = field(form, 'cycleStart')
        updateProject(project.id, (item) => {
          item.cycleStart = start
          item.due = cycleEnd(start)
          item.cycle = 1
          item.state = 'active'
          item.risk = false
          item.actualEnd = ''
          item.cycleData = null
          addProjectActivity(item, 'play', 'Đã bắt đầu triển khai', 'Chu kỳ 1: ' + formatDate(parseInput(start)) + ' – ' + item.due)
          addProjectActivity(item, 'file-text', 'Đã tạo mốc Content Plan', 'Hạn gửi bản đầu: ' + addBusinessDays(start, 3) + ' (T0 + 3 ngày làm việc).')
        })
        closeModal()
        toast('Đã bắt đầu triển khai và tạo chu kỳ 1.')
      }}
    >
      <div className="form">
        <div className="customer-data-rules"><b>Tạo chu kỳ 1</b><p>Cổng khởi động đã hoàn tất. Chọn ngày dự án chính thức bắt đầu; hệ thống tự tạo hạn dự kiến sau một tháng.</p></div>
        <label className="field">Ngày bắt đầu chu kỳ<input name="cycleStart" type="date" required defaultValue="2026-10-01" /></label>
        <label className="filter-check"><input name="confirmed" type="checkbox" required /> Tôi xác nhận bắt đầu triển khai theo điều kiện đã kiểm tra.</label>
        <FormActions submit="Bắt đầu triển khai" />
      </div>
    </Modal>
  )
}

export function ActualEndModal({ project }: { project: Project }) {
  const { closeModal, toast } = useApp()
  return (
    <Modal
      title="Kết thúc thực tế"
      onSubmit={(form) => {
        updateProject(project.id, (item) => {
          item.actualEnd = inputToDisplay(field(form, 'actualEnd'))
          item.actualEndNote = field(form, 'actualEndNote')
          addProjectActivity(item, 'calendar-check-2', 'Đã ghi nhận kết thúc thực tế', item.actualEnd + ' · ' + item.actualEndNote)
        })
        closeModal()
        toast('Đã ghi nhận ngày kết thúc thực tế.')
      }}
    >
      <div className="form">
        <div className="customer-data-rules"><b>Ngày dự kiến: {project.due}</b><p>Ngày thực tế được ghi nhận khi chu kỳ hoàn tất. Không làm thay đổi mốc dự kiến hoặc tiến độ hợp đồng.</p></div>
        <label className="field">Ngày kết thúc thực tế<input name="actualEnd" type="date" required defaultValue={displayToInput(project.actualEnd || project.due)} /></label>
        <label className="field">Ghi chú<textarea name="actualEndNote" required placeholder="Nêu lý do nếu khác ngày dự kiến" /></label>
        <FormActions submit="Lưu ngày thực tế" />
      </div>
    </Modal>
  )
}

function GateStatus({ ready }: { ready: boolean }) {
  return (
    <span className={'onboarding-form-status' + (ready ? ' complete' : '')}>
      <i className="onboarding-status-dot" aria-hidden="true" />
      <span>{ready ? 'Đã xong' : 'Cần xử lý'}</span>
    </span>
  )
}

/** Cổng khởi động: three required gates, the rest can be filled in after the project starts. */
export function OnboardingModal({ project }: { project: Project }) {
  const { closeModal, toast, go, showModal } = useApp()
  const data = project.onboarding
  const [financeChecked, setFinanceChecked] = useState(Boolean(data?.financeVerified))
  const [handoverChecked, setHandoverChecked] = useState(Boolean(data?.handoverReady))
  const required = onboardingItems(project).filter((entry) => entry.required)
  const completed = required.filter((entry) => entry.ready).length
  const hasContract = Boolean(project.contractCode)

  const openContract = () => {
    go('contracts')
    const primary = getData().contracts.find((row) => row.projectId === project.id && row.isPrimary && row.status !== 'Đã hủy')
    showModal(hasContract && primary ? <ContractDetailModal contractId={primary.id} /> : <ContractFormModal preferredProjectId={project.id} />)
  }

  return (
    <Modal
      title="Cổng khởi động"
      className="onboarding-modal onboarding-lean-modal"
      onSubmit={(form) => {
        if (checked(form, 'financeVerified') && !field(form, 'financeRef')) { toast('Cần mã chứng từ trước khi xác nhận thanh toán.'); return }
        if (checked(form, 'handoverReady') && !field(form, 'handoverLink')) { toast('Cần link Sales Brief trước khi xác nhận bàn giao.'); return }
        const onboarding: Onboarding = {
          financeVerified: checked(form, 'financeVerified'),
          financeRef: field(form, 'financeRef'),
          handoverReady: checked(form, 'handoverReady'),
          handoverLink: field(form, 'handoverLink'),
          briefReady: checked(form, 'briefReady'),
          briefLink: field(form, 'briefLink'),
          setupReady: checked(form, 'setupReady'),
          workspaceLink: field(form, 'workspaceLink'),
          setupNote: field(form, 'setupNote'),
        }
        const ready = onboardingReady({ ...project, onboarding })
        updateProject(project.id, (item) => {
          item.onboarding = onboarding
          addProjectActivity(item, 'list-checks', 'Đã cập nhật cổng khởi động', ready ? 'Đủ điều kiện bắt đầu triển khai.' : 'Đã lưu phần đã có; còn điều kiện bắt buộc.')
        })
        closeModal()
        toast(ready ? 'Đủ điều kiện khởi động.' : 'Đã lưu cập nhật.')
      }}
    >
      <div className="form">
        <div className="onboarding-modal-intro">
          <div><b>Ba việc trước khi triển khai</b><p>Hợp đồng, đợt thanh toán đầu và Sales Brief. Brief, folder, quyền truy cập bổ sung sau.</p></div>
          <strong>{completed} / {required.length}</strong>
        </div>

        <section className="onboarding-form-section onboarding-gate">
          <div className="onboarding-section-head">
            <div>
              <span className="onboarding-owner">1. Hợp đồng</span>
              <b>{hasContract ? 'Hợp đồng đã liên kết' : 'Tạo hợp đồng'}</b>
              <p>{hasContract ? project.contractCode + ' là hợp đồng chính của dự án.' : 'Tạo tại Hợp đồng & công nợ. Khách hàng, gói và Account đã điền sẵn.'}</p>
            </div>
            <GateStatus ready={hasContract} />
          </div>
          <div className="onboarding-section-action">
            <button className={hasContract ? 'secondary' : 'primary'} type="button" onClick={openContract}>
              <Icon name={hasContract ? 'file-search' : 'file-plus-2'} /> {hasContract ? 'Mở hợp đồng' : 'Tạo hợp đồng'}
            </button>
          </div>
        </section>

        <section className="onboarding-form-section onboarding-gate">
          <div className="onboarding-section-head">
            <div><span className="onboarding-owner">2. Kế toán</span><b>Xác nhận đợt thanh toán đầu</b><p>Chỉ xác nhận khi đã có thanh toán hoặc chứng từ hợp lệ.</p></div>
            <GateStatus ready={Boolean(data?.financeVerified)} />
          </div>
          <label className="onboarding-check"><input name="financeVerified" type="checkbox" checked={financeChecked} onChange={(event) => setFinanceChecked(event.target.checked)} /><span>Kế toán đã xác nhận đợt đầu</span></label>
          <label className="field onboarding-field"><span>Mã chứng từ</span><input name="financeRef" defaultValue={data?.financeRef} placeholder="Ví dụ: UNC-0926-018" autoComplete="off" disabled={!financeChecked} /></label>
        </section>

        <section className="onboarding-form-section onboarding-gate">
          <div className="onboarding-section-head">
            <div><span className="onboarding-owner">3. Sale</span><b>Bàn giao Sales Brief</b><p>Phạm vi đã chốt, cam kết khách hàng và lưu ý thương mại.</p></div>
            <GateStatus ready={Boolean(data?.handoverReady)} />
          </div>
          <label className="onboarding-check"><input name="handoverReady" type="checkbox" checked={handoverChecked} onChange={(event) => setHandoverChecked(event.target.checked)} /><span>Sale đã bàn giao</span></label>
          <label className="field onboarding-field"><span>Link Sales Brief</span><input name="handoverLink" type="url" defaultValue={data?.handoverLink} placeholder="https://drive.google.com/..." disabled={!handoverChecked} /></label>
        </section>

        <details className="onboarding-later onboarding-later-form">
          <summary>Việc làm sau khi bắt đầu</summary>
          <p>Không chặn khởi động. Account điều phối; Content nghiên cứu cập nhật khi có đầu vào. HR chỉ tham gia khi cần quyền hoặc nhân sự.</p>
          <div className="onboarding-later-grid">
            <section>
              <b>Brief và tài liệu</b>
              <label className="onboarding-check"><input name="briefReady" type="checkbox" defaultChecked={data?.briefReady} /><span>Đã kiểm tra brief</span></label>
              <label className="field onboarding-field"><span>Link brief / Key Notes</span><input name="briefLink" type="url" defaultValue={data?.briefLink} placeholder="https://drive.google.com/..." /></label>
            </section>
            <section>
              <b>Workspace và quyền</b>
              <label className="onboarding-check"><input name="setupReady" type="checkbox" defaultChecked={data?.setupReady} /><span>Đã thiết lập workspace</span></label>
              <label className="field onboarding-field"><span>Folder vận hành</span><input name="workspaceLink" type="url" defaultValue={data?.workspaceLink} placeholder="https://drive.google.com/drive/folders/..." /></label>
              <label className="field onboarding-field"><span>Ghi chú</span><input name="setupNote" defaultValue={data?.setupNote} placeholder="Ví dụ: Chờ cấp Meta Business Suite" /></label>
            </section>
          </div>
        </details>

        <p className="onboarding-remain">{completed === required.length ? 'Đủ điều kiện khởi động dự án.' : 'Còn ' + (required.length - completed) + ' điều kiện bắt buộc.'}</p>
        <FormActions submit="Lưu cập nhật" />
      </div>
    </Modal>
  )
}
