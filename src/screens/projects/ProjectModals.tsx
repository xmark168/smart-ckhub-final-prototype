import { useRef, useState } from 'react'
import { useApp } from '../../app/context'
import { packageLabel } from '../../data/catalog'
import { coversProject, primaryContract } from '../../data/contracts'
import { newCycle } from '../../data/cycles'
import { ACCOUNTS, addBusinessDaysIso, formatDate, newId, parseInput, TODAY } from '../../lib/format'
import { checked, field } from '../../lib/form'
import { Icon } from '../../lib/icons'
import { inScope } from '../../lib/scope'
import { getData, update, useData } from '../../store/store'
import type { Onboarding, Project } from '../../store/types'
import { FormActions, Modal, Req } from '../../ui/Modal'
import { ContractDetailModal, ContractFormModal } from '../contracts/ContractModals'
import { addProjectActivity, onboardingItems, onboardingReady, updateProject } from './projectLogic'

function QuotaNote({ quota }: { quota: Project['quota'] }) {
  if (!quota.posts && !quota.shoots && !quota.plans) {
    return null
  }
  return (
    <div className="customer-data-rules">
      <b>Định mức mỗi chu kỳ</b>
      <p>{quota.plans} Content Plan · {quota.shoots} buổi shoot · {quota.posts} bài ({quota.brandPosts} thương hiệu, {quota.salesPosts} bán hàng)</p>
    </div>
  )
}

/** `customerId` pre-selects the customer (opened from the customer page). */
export function CreateProjectModal({ onCreated, customerId }: { onCreated: (id: string) => void; customerId?: string }) {
  const { closeModal, account, role } = useApp()
  const { categories, packages, projects, customers } = useData()
  const activePackages = packages.filter((item) => item.status === 'Đang áp dụng')
  const usableCategories = categories.filter((category) => activePackages.some((item) => item.category === category.id))
  const choices = customers.filter((item) => !item.ended && inScope(role, account, item)).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  const preset = customers.find((item) => item.id === customerId)
  const customerRef = useRef<HTMLInputElement>(null)
  const [customerText, setCustomerText] = useState(preset?.name ?? '')
  const [owner, setOwner] = useState(preset?.owner ?? account)
  const [category, setCategory] = useState(usableCategories[0]?.id ?? '')
  const categoryPackages = activePackages.filter((item) => item.category === category)
  const [packageId, setPackageId] = useState(categoryPackages[0]?.id ?? '')
  const selectedPackage = activePackages.find((item) => item.id === packageId)
  const findCustomer = (text: string) => choices.find((item) => item.name.toLocaleLowerCase('vi') === text.trim().toLocaleLowerCase('vi'))

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
      onSubmit={(form) => {
        const customer = findCustomer(customerText)
        if (!customer) {
          customerRef.current?.setCustomValidity('Chọn khách hàng từ danh sách gợi ý.')
          customerRef.current?.reportValidity()
          return
        }
        if (!selectedPackage) return
        const id = newId('project')
        update((draft) => {
          draft.projects.unshift({
            id,
            code: 'DA-2026-' + String(projects.length + 1).padStart(3, '0'),
            customerId: customer.id,
            customer: customer.name,
            owner,
            createdBy: account,
            area: customer.area,
            service: packageLabel(selectedPackage),
            servicePackageId: selectedPackage.id,
            serviceScope: selectedPackage.scope,
            servicePrice: selectedPackage.price,
            quota: { ...selectedPackage.quota },
            contractCode: '',
            total: 0,
            state: 'draft',
            risk: false,
            cycles: [],
            links: { folder: field(form, 'folder'), contentPlan: '', contentPost: '', keyNotes: '' },
            notes: '',
            keyNotes: [],
            activities: [{ icon: 'file-plus-2', title: 'Dự án nháp đã tạo', detail: 'Chờ Cổng khởi động đủ điều kiện để tạo chu kỳ 1.' }],
          })
        })
        closeModal()
        onCreated(id)
      }}
    >
      <div className="form">
        <label className="field">Khách hàng<Req />
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
              if (match && !findCustomer(customerText)) setOwner(match.owner)
              event.target.setCustomValidity(match ? '' : 'Chọn khách hàng từ danh sách gợi ý.')
            }}
          />
          <datalist id="projectCustomerOptions">{choices.map((item) => <option key={item.id} value={item.name} />)}</datalist>
        </label>
        <label className="field">Account phụ trách<Req />
          <select name="owner" value={owner} onChange={(event) => setOwner(event.target.value)}>
            {ACCOUNTS.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="field">Nhóm dịch vụ<Req />
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
        <label className="field">Gói dịch vụ<Req />
          <select name="servicePackage" required value={packageId} onChange={(event) => setPackageId(event.target.value)}>
            {categoryPackages.map((item) => <option key={item.id} value={item.id}>{packageLabel(item)}</option>)}
          </select>
        </label>
        {selectedPackage && <QuotaNote quota={selectedPackage.quota} />}
        <label className="field">Folder dự án trên Drive <small>(không bắt buộc)</small><input name="folder" type="url" placeholder="https://drive.google.com/drive/folders/..." /></label>
        <FormActions submit="Tạo dự án nháp" />
      </div>
    </Modal>
  )
}

export function EditProjectModal({ project }: { project: Project }) {
  const { closeModal, toast, showModal } = useApp()
  const packages = useData().packages.filter((item) => item.status === 'Đang áp dụng' || item.id === project.servicePackageId)
  // Package is part of the signed contract: once a contract exists it changes only via Phụ lục / HĐ mới.
  const locked = Boolean(project.contractCode)
  return (
    <Modal
      title="Sửa dự án"
      onSubmit={(form) => {
        const service = locked ? undefined : packages.find((item) => item.id === field(form, 'servicePackage'))
        updateProject(project.id, (item) => {
          const changedPackage = Boolean(service && item.servicePackageId !== service.id)
          item.owner = field(form, 'owner')
          if (service && changedPackage) {
            item.servicePackageId = service.id
            item.service = packageLabel(service)
            item.serviceScope = service.scope
            item.servicePrice = service.price
            item.quota = { ...service.quota }
          }
          item.notes = field(form, 'notes')
          addProjectActivity(item, 'pencil', 'Thông tin dự án đã cập nhật', changedPackage ? 'Đổi gói dự kiến: ' + item.service + '.' : 'Account, đội dự án hoặc ghi chú vận hành được điều chỉnh.')
        })
        closeModal()
        toast('Đã lưu thay đổi dự án.')
      }}
    >
      <div className="form">
        <label className="field">Account phụ trách<Req />
          <select name="owner" defaultValue={project.owner}>{ACCOUNTS.map((name) => <option key={name} value={name}>{name}</option>)}</select>
        </label>
        {locked ? (
          <div className="field">
            <span>Gói dịch vụ</span>
            <p className="locked-value"><b>{project.service}</b> · theo {project.contractCode}</p>
            <button type="button" className="text-btn" onClick={() => showModal(<ContractFormModal preferredProjectId={project.id} appendix />)}>Đổi gói bằng phụ lục / hợp đồng mới ›</button>
          </div>
        ) : (
          <label className="field">Gói dịch vụ dự kiến<Req />
            <select name="servicePackage" required defaultValue={project.servicePackageId}>
              {packages.map((item) => <option key={item.id} value={item.id}>{packageLabel(item)}</option>)}
            </select>
          </label>
        )}
        <label className="field">Ghi chú vận hành<textarea name="notes" defaultValue={project.notes} placeholder="Ví dụ: thuê diễn viên, còn shoot 2, khách muốn viral TikTok" /></label>
        <div className="customer-data-rules"><p>{locked ? 'Gói đã ghi trên hợp đồng; hóa đơn xuất theo hạng mục hợp đồng nên đổi gói phải làm phụ lục hoặc hợp đồng mới.' : 'Dự án chưa có hợp đồng: gói là dự kiến, sẽ ghi vào hợp đồng khi tạo từ Cổng khởi động.'}</p></div>
        <FormActions submit="Lưu thay đổi" />
      </div>
    </Modal>
  )
}

export function StopProjectModal({ project }: { project: Project }) {
  const { closeModal } = useApp()
  const { contracts, projects } = useData()
  const contract = primaryContract(contracts, project.id)
  const others = contract ? projects.filter((item) => item.id !== project.id && item.state !== 'stopped' && coversProject(contract, item.id)) : []
  return (
    <Modal
      title="Dừng dự án"
      onSubmit={(form) => {
        const date = field(form, 'effectiveDate')
        const reason = field(form, 'reason')
        updateProject(project.id, (item) => {
          item.state = 'stopped'
          item.risk = false
          item.pause = undefined
          item.stop = { reason, date }
          const cycle = item.cycles.find((entry) => entry.status === 'running')
          if (cycle) {
            cycle.status = 'closed'
            cycle.actualEnd = date
            const published = cycle.contents.filter((entry) => !entry.bonus && entry.stage === 'Đã đăng').length
            cycle.result = { published, planned: item.quota.posts, note: 'Dừng dự án: ' + reason }
          }
          addProjectActivity(item, 'circle-stop', 'Dự án đã dừng', formatDate(parseInput(date)) + ' · ' + reason)
        })
        if (contract && checked(form, 'endContract')) {
          update((draft) => {
            const row = draft.contracts.find((entry) => entry.id === contract.id)
            if (!row) return
            row.status = 'Kết thúc'
            row.activity.unshift('Kết thúc cùng lúc dừng ' + project.code + ' · ' + formatDate(parseInput(date)))
          })
        }
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Lý do dừng<Req /><textarea name="reason" required placeholder="Nêu lý do dừng triển khai" /></label>
        <label className="field">Ngày hiệu lực<Req /><input name="effectiveDate" type="date" required defaultValue={TODAY} /></label>
        {contract && contract.status === 'Hiệu lực' && (
          others.length ? (
            <div className="customer-data-rules"><p>{contract.code} còn gồm {others.map((item) => item.code).join(', ')} đang chạy nên giữ Hiệu lực. Đổi phạm vi hợp đồng bằng phụ lục.</p></div>
          ) : (
            <label className="filter-check"><input name="endContract" type="checkbox" defaultChecked /> Chuyển {contract.code} sang Kết thúc (công nợ còn lại vẫn được theo dõi)</label>
          )
        )}
        <label className="filter-check"><input name="confirmed" type="checkbox" required /> Tôi xác nhận đã kiểm tra ảnh hưởng tới hợp đồng, kế hoạch và công việc.</label>
        <FormActions submit="Xác nhận dừng" />
      </div>
    </Modal>
  )
}

export function PauseProjectModal({ project }: { project: Project }) {
  const { closeModal } = useApp()
  return (
    <Modal
      title="Tạm dừng dự án"
      onSubmit={(form) => {
        const reason = field(form, 'reason')
        const returnDate = field(form, 'returnDate')
        updateProject(project.id, (item) => {
          item.state = 'pending'
          item.pause = { reason, returnDate }
          addProjectActivity(item, 'circle-pause', 'Dự án tạm dừng', reason + (returnDate ? ' · dự kiến quay lại ' + formatDate(parseInput(returnDate)) : ''))
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Lý do tạm dừng<Req /><textarea name="reason" required placeholder="Ví dụ: khách sửa quán, chờ ngân sách" /></label>
        <label className="field">Ngày dự kiến quay lại<input name="returnDate" type="date" /></label>
        <FormActions submit="Tạm dừng" />
      </div>
    </Modal>
  )
}

export function StartProjectModal({ project }: { project: Project }) {
  const { closeModal, toast } = useApp()
  const { params } = useData()
  return (
    <Modal
      title="Bắt đầu triển khai"
      onSubmit={(form) => {
        const start = field(form, 'cycleStart')
        updateProject(project.id, (item) => {
          item.state = 'active'
          item.risk = false
          item.cycles = [newCycle(1, start, params)]
          addProjectActivity(item, 'play', 'Đã bắt đầu triển khai', 'Chu kỳ 1: ' + formatDate(parseInput(start)) + ' – ' + formatDate(parseInput(item.cycles[0].plannedEnd)))
          if (item.quota.plans) {
            addProjectActivity(item, 'file-text', 'Đã tạo mốc Content Plan', 'Hạn gửi khách: ' + formatDate(parseInput(addBusinessDaysIso(start, params.planLeadBusinessDays))) + ' (T0 + ' + params.planLeadBusinessDays + ' ngày làm việc).')
          }
        })
        closeModal()
        toast('Đã bắt đầu triển khai và tạo chu kỳ 1.')
      }}
    >
      <div className="form">
        <label className="field">Ngày bắt đầu chu kỳ (T0)<Req /><input name="cycleStart" type="date" required defaultValue={TODAY} /></label>
        <label className="filter-check"><input name="confirmed" type="checkbox" required /> Tôi xác nhận bắt đầu triển khai theo điều kiện đã kiểm tra.</label>
        <FormActions submit="Bắt đầu triển khai" />
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

/** Cổng khởi động: required gates before T0; the brief is required when the SOP parameter says so. */
export function OnboardingModal({ project }: { project: Project }) {
  const { closeModal, toast, go, showModal } = useApp()
  const { params } = useData()
  const data = project.onboarding
  const [financeChecked, setFinanceChecked] = useState(Boolean(data?.financeVerified))
  const [handoverChecked, setHandoverChecked] = useState(Boolean(data?.handoverReady))
  const [briefChecked, setBriefChecked] = useState(Boolean(data?.briefReady))
  const required = onboardingItems(project, params).filter((entry) => entry.required)
  const completed = required.filter((entry) => entry.ready).length
  const hasContract = Boolean(project.contractCode)
  const briefRequired = params.requireBriefBeforeT0

  const openContract = () => {
    go('contracts')
    const primary = primaryContract(getData().contracts, project.id)
    showModal(hasContract && primary ? <ContractDetailModal contractId={primary.id} /> : <ContractFormModal preferredProjectId={project.id} />)
  }

  const briefFields = (
    <>
      <label className="onboarding-check"><input name="briefReady" type="checkbox" checked={briefChecked} onChange={(event) => setBriefChecked(event.target.checked)} /><span>Đã kiểm tra đủ brief form và tài liệu nguồn</span></label>
      <label className="field onboarding-field"><span>Link brief form / Thông tin dự án</span><input name="briefLink" type="url" defaultValue={data?.briefLink} placeholder="https://docs.google.com/..." disabled={briefRequired && !briefChecked} /></label>
    </>
  )

  return (
    <Modal
      title="Cổng khởi động"
      className="onboarding-modal onboarding-lean-modal"
      onSubmit={(form) => {
        if (checked(form, 'financeVerified') && !field(form, 'financeRef')) { toast('Cần mã chứng từ trước khi xác nhận thanh toán.'); return }
        if (checked(form, 'handoverReady') && !field(form, 'handoverLink')) { toast('Cần link Sales Brief trước khi xác nhận bàn giao.'); return }
        if (briefRequired && checked(form, 'briefReady') && !field(form, 'briefLink')) { toast('Cần link brief form trước khi xác nhận brief.'); return }
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
        const ready = onboardingReady({ ...project, onboarding }, params)
        updateProject(project.id, (item) => {
          item.onboarding = onboarding
          if (onboarding.workspaceLink && !item.links.folder) item.links.folder = onboarding.workspaceLink
          addProjectActivity(item, 'list-checks', 'Đã cập nhật cổng khởi động', ready ? 'Đủ điều kiện bắt đầu triển khai.' : 'Đã lưu phần đã có; còn điều kiện bắt buộc.')
        })
        closeModal()
        toast(ready ? 'Đủ điều kiện khởi động.' : 'Đã lưu cập nhật.')
      }}
    >
      <div className="form">
        <div className="onboarding-modal-intro">
          <div>
            <b>{required.length} việc trước T0</b>
            <p>SOP: T0 là khi khách đã cọc{briefRequired ? ' và cung cấp đủ brief' : ''}. Folder và quyền truy cập bổ sung sau.</p>
          </div>
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
            <div><span className="onboarding-owner">2. Kế toán</span><b>Xác nhận cọc / đợt thanh toán đầu</b><p>Chỉ xác nhận khi đã có thanh toán hoặc chứng từ hợp lệ.</p></div>
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

        {briefRequired && (
          <section className="onboarding-form-section onboarding-gate">
            <div className="onboarding-section-head">
              <div><span className="onboarding-owner">4. Khách hàng</span><b>Brief đầy đủ</b><p>Brief form: loại hình, cách bán, quy mô, đối tượng, điểm mạnh/hạn chế, món chủ lực, khuyến mãi, menu, logo.</p></div>
              <GateStatus ready={Boolean(data?.briefReady)} />
            </div>
            {briefFields}
          </section>
        )}

        <details className="onboarding-later onboarding-later-form">
          <summary>Việc làm sau khi bắt đầu</summary>
          <p>Không chặn khởi động. Account điều phối; Content cập nhật khi có đầu vào.</p>
          <div className="onboarding-later-grid">
            {!briefRequired && <section><b>Brief và tài liệu</b>{briefFields}</section>}
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

/** Hủy dự án nháp: the customer did not sign. Keeps the record as stopped for history. */
export function CancelDraftModal({ project }: { project: Project }) {
  const { closeModal, toast } = useApp()
  return (
    <Modal
      title="Hủy dự án nháp"
      onSubmit={(form) => {
        const reason = field(form, 'reason')
        updateProject(project.id, (item) => {
          item.state = 'stopped'
          item.stop = { reason: 'Hủy nháp: ' + reason, date: TODAY }
          addProjectActivity(item, 'circle-x', 'Đã hủy dự án nháp', reason)
        })
        closeModal()
        toast('Đã hủy dự án nháp.')
      }}
    >
      <div className="form">
        <label className="field">Lý do<Req /><textarea name="reason" required placeholder="Ví dụ: khách chưa đủ ngân sách" /></label>
        <FormActions submit="Hủy dự án nháp" cancel="Giữ dự án" />
      </div>
    </Modal>
  )
}

/** Ghi chú vận hành of the project: short, current, visible on project and customer pages. */
export function NotesModal({ project }: { project: Project }) {
  const { closeModal, account } = useApp()
  return (
    <Modal
      title="Ghi chú dự án"
      onSubmit={(form) => {
        const notes = field(form, 'notes')
        updateProject(project.id, (item) => {
          item.notes = notes
          addProjectActivity(item, 'notebook-pen', 'Cập nhật ghi chú dự án', (notes || 'Đã xóa ghi chú').slice(0, 90) + ' · ' + account)
        })
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Ghi chú
          <textarea name="notes" rows={6} autoFocus defaultValue={project.notes} placeholder="Điều cả team cần nhớ khi làm dự án này: yêu cầu riêng của khách, lưu ý sản xuất, thỏa thuận ngoài hợp đồng…" />
        </label>
        <FormActions submit="Lưu ghi chú" />
      </div>
    </Modal>
  )
}
